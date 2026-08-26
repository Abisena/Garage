"""Garage DocType controller for Garage Stock Alert.

Raised by check_low_stock_alerts() below (hourly, see hooks.py) whenever a
Garage Spare Part's stock_qty drops to or below its own reorder_level.
Deliberately does NOT create a Garage Procurement Order by itself - explicit
request: the alert is a review queue, not an auto-buy trigger. A human
reviews it here and either approve()s it (which creates a Draft Garage
Procurement Order for them to finish and submit normally) or dismiss()es it.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, nowdate, now_datetime


class GarageStockAlert(Document):
    @frappe.whitelist()
    def approve(self) -> str:
        """Create a Draft Garage Procurement Order for this alert's spare
        part and link it back here. Returns the new order's name.

        Draft, not submitted: approving an alert means "yes, go buy this" -
        it does not mean stock has already arrived. Garage Procurement
        Order's own on_submit() (see that controller) is what actually
        posts a receiving Garage Stock Movement, and that should only
        happen once the goods are genuinely in hand.
        """
        self._check_write_permission()
        if self.status != "Open":
            frappe.throw(f"Alert ini sudah berstatus {self.status}, tidak bisa di-approve lagi.")

        # Order enough to bring stock back up to the reorder level - a
        # sane default the buyer can still edit before submitting, not a
        # blind guess pretending to be precise procurement planning.
        needed = flt(self.reorder_level) - flt(self.stock_qty)
        qty = needed if needed > 0 else (flt(self.reorder_level) or 1)

        warehouse = frappe.db.get_value("Garage Spare Part", self.spare_part, "warehouse_location")

        order = frappe.new_doc("Garage Procurement Order")
        order.reference_type = "Garage Stock Alert"
        order.reference_name = self.name
        order.order_date = nowdate()
        order.warehouse = warehouse
        order.remarks = f"Auto-generated dari Garage Stock Alert {self.name} ({self.part_name})"
        order.append("items", {
            "item_code": self.spare_part,
            "qty": qty,
        })
        order.insert(ignore_permissions=True)

        self.garage_procurement_order = order.name
        self.status = "Approved"
        self.resolved_on = now_datetime()
        self.save(ignore_permissions=True)
        return order.name

    @frappe.whitelist()
    def dismiss(self, remarks: str | None = None) -> None:
        """Close the alert without buying anything - e.g. a part being
        discontinued, or stock counted differently than the system shows."""
        self._check_write_permission()
        if self.status != "Open":
            frappe.throw(f"Alert ini sudah berstatus {self.status}, tidak bisa di-dismiss lagi.")

        self.status = "Dismissed"
        self.resolved_on = now_datetime()
        if remarks:
            self.remarks = remarks
        self.save(ignore_permissions=True)

    def _check_write_permission(self) -> None:
        if not self.has_permission("write"):
            frappe.throw("Anda tidak punya izin untuk memproses Stock Alert ini.", frappe.PermissionError)


def check_low_stock_alerts() -> dict:
    """Scheduled hourly (see hooks.py). Raises a Garage Stock Alert for
    every Active Garage Spare Part whose stock_qty has dropped to or below
    its own reorder_level, skipping parts that already have an Open alert
    (dedup - Dismissed/Approved/Resolved ones don't block a fresh one).
    Also auto-resolves any Open alert whose part has since recovered above
    its reorder_level, typically because it got restocked some other way
    before anyone acted on the alert.
    """
    parts = frappe.get_all(
        "Garage Spare Part",
        filters={"status": "Active"},
        fields=["name", "stock_qty", "reorder_level"],
    )

    open_alerts = {
        row.spare_part: row.name
        for row in frappe.get_all(
            "Garage Stock Alert", filters={"status": "Open"}, fields=["name", "spare_part"]
        )
    }

    created, resolved = [], []

    for part in parts:
        reorder_level = flt(part.reorder_level)
        if reorder_level <= 0:
            # No threshold configured for this part - nothing to compare
            # against, same as ERPNext's own core reorder feature treating
            # an unset Reorder Level as "not tracked", not "always breach".
            continue

        stock_qty = flt(part.stock_qty)
        existing = open_alerts.get(part.name)

        if stock_qty <= reorder_level:
            if existing:
                continue
            alert = frappe.new_doc("Garage Stock Alert")
            alert.spare_part = part.name
            alert.stock_qty = stock_qty
            alert.reorder_level = reorder_level
            alert.insert(ignore_permissions=True)
            created.append(alert.name)
            _notify_stock_alert(alert)
        elif existing:
            alert = frappe.get_doc("Garage Stock Alert", existing)
            alert.status = "Resolved"
            alert.resolved_on = now_datetime()
            alert.save(ignore_permissions=True)
            resolved.append(alert.name)

    if created or resolved:
        frappe.db.commit()

    return {"created": created, "resolved": resolved}


def _notify_stock_alert(alert: "GarageStockAlert") -> None:
    """Bell-icon Notification Log entry (Notification Type "Alert",
    already a stock fixture in Frappe core) for every Purchase Manager -
    a document silently sitting in a list somewhere isn't an alert, it's
    just data nobody's looking at (explicit distinction the user asked
    about directly)."""
    users = [
        user
        for user in set(
            frappe.get_all(
                "Has Role", filters={"role": "Purchase Manager", "parenttype": "User"}, pluck="parent"
            )
        )
        if frappe.db.get_value("User", user, "enabled")
    ]
    if not users:
        return

    from frappe.desk.doctype.notification_log.notification_log import enqueue_create_notification

    enqueue_create_notification(
        users,
        {
            "type": "Alert",
            "document_type": "Garage Stock Alert",
            "document_name": alert.name,
            "subject": _("Stok {0} sudah di bawah batas minimum ({1} <= {2})").format(
                alert.part_name or alert.spare_part, alert.stock_qty, alert.reorder_level
            ),
        },
        dedupe_on=["document_type", "document_name"],
    )
