"""Garage DocType controller for Garage Stock Alert.

Raised event-driven, not on a schedule (explicit request: don't wait up to
an hour for a stock breach to be noticed) - GarageSparePart.on_update() (see
garage_spare_part.py) calls _evaluate_part_stock() below right after any
save where stock_qty or reorder_level actually changed, whenever a part's
stock_qty drops to or below its own reorder_level.
Deliberately does NOT create a Garage Procurement Order by itself - explicit
request: the alert is a review queue, not an auto-buy trigger. A human
reviews it here and either approve()s it (which creates a Draft Garage
Procurement Order for them to finish and submit normally) or dismiss()es it.

When several parts breach their reorder level in the same run, that's
naturally one purchase run, not N of them (explicit request) - see
bulk_approve() and the "Approve Selected" list view action
(garage_stock_alert_list.js), and _notify_stock_alerts() below, which sends
ONE notification listing every part instead of stacking N separate popups.
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
        return bulk_approve([self.name])

    @frappe.whitelist()
    def dismiss(self, remarks: str | None = None) -> None:
        """Close the alert without buying anything - e.g. a part being
        discontinued, or stock counted differently than the system shows."""
        self.check_permission("write")
        if self.status != "Open":
            frappe.throw(f"Alert ini sudah berstatus {self.status}, tidak bisa di-dismiss lagi.")

        self.status = "Dismissed"
        self.resolved_on = now_datetime()
        if remarks:
            self.remarks = remarks
        self.save(ignore_permissions=True)


@frappe.whitelist()
def bulk_approve(names) -> str:
    """Approve any number of Open alerts into a SINGLE Draft Garage
    Procurement Order - one order with one line per item, not N separate
    orders. Explicit request: when several parts hit their reorder level
    together, reviewing and buying them is naturally one purchase run.
    Returns the new order's name. Works for a single alert too (the
    per-doc "Approve" button just calls this with a one-item list).
    """
    if isinstance(names, str):
        names = frappe.parse_json(names)
    if not names:
        frappe.throw("Pilih minimal 1 Stock Alert.")

    alerts = [frappe.get_doc("Garage Stock Alert", name) for name in names]
    for alert in alerts:
        alert.check_permission("write")
        if alert.status != "Open":
            frappe.throw(f"{alert.name} sudah berstatus {alert.status}, tidak bisa di-approve lagi.")

    order = frappe.new_doc("Garage Procurement Order")
    order.reference_type = "Garage Stock Alert"
    order.reference_name = alerts[0].name
    order.order_date = nowdate()
    order.remarks = "Auto-generated dari {0} Garage Stock Alert: {1}".format(
        len(alerts), ", ".join(a.name for a in alerts)
    )

    warehouses = set()
    for alert in alerts:
        # Order enough to bring stock back up to the reorder level - a
        # sane default the buyer can still edit before submitting, not a
        # blind guess pretending to be precise procurement planning.
        needed = flt(alert.reorder_level) - flt(alert.stock_qty)
        qty = needed if needed > 0 else (flt(alert.reorder_level) or 1)
        order.append("items", {"item_code": alert.spare_part, "qty": qty})

        warehouse = frappe.db.get_value("Garage Spare Part", alert.spare_part, "warehouse_location")
        if warehouse:
            warehouses.add(warehouse)

    if len(warehouses) == 1:
        order.warehouse = warehouses.pop()
    order.insert(ignore_permissions=True)

    for alert in alerts:
        alert.garage_procurement_order = order.name
        alert.status = "Approved"
        alert.resolved_on = now_datetime()
        alert.save(ignore_permissions=True)

    return order.name


def _evaluate_part_stock(part_name: str, stock_qty, reorder_level) -> tuple[str, "Document"] | None:
    """Create or resolve a single part's Garage Stock Alert as needed.

    Shared by the event-driven on_update() hook (one part at a time, right
    after its stock actually changes) and check_all_low_stock_alerts()
    below (every part, for a manual "recheck everything" sweep). Returns
    ("created", alert), ("resolved", alert), or None if nothing changed.
    """
    reorder_level = flt(reorder_level)
    if reorder_level <= 0:
        # No threshold configured for this part - nothing to compare
        # against, same as ERPNext's own core reorder feature treating
        # an unset Reorder Level as "not tracked", not "always breach".
        return None

    stock_qty = flt(stock_qty)
    existing = frappe.db.get_value(
        "Garage Stock Alert", {"spare_part": part_name, "status": "Open"}, "name"
    )

    if stock_qty <= reorder_level:
        if existing:
            # Dedup - Dismissed/Approved/Resolved ones don't block a fresh
            # one, but an already-Open alert for this part does.
            return None
        alert = frappe.new_doc("Garage Stock Alert")
        alert.spare_part = part_name
        alert.stock_qty = stock_qty
        alert.reorder_level = reorder_level
        alert.insert(ignore_permissions=True)
        return "created", alert

    if existing:
        # Recovered above reorder_level since the alert was raised -
        # typically restocked some other way before anyone acted on it.
        alert = frappe.get_doc("Garage Stock Alert", existing)
        alert.status = "Resolved"
        alert.resolved_on = now_datetime()
        alert.save(ignore_permissions=True)
        return "resolved", alert

    return None


def check_all_low_stock_alerts() -> dict:
    """Manual sweep across every Active Garage Spare Part - not on any
    schedule (the normal path is the event-driven on_update() hook, see
    garage_spare_part.py), this is only for catching drift from stock_qty
    changes that bypass a proper save (e.g. a raw SQL/db.set_value fix).
    """
    parts = frappe.get_all(
        "Garage Spare Part",
        filters={"status": "Active"},
        fields=["name", "stock_qty", "reorder_level"],
    )

    created_docs = []
    created, resolved = [], []

    for part in parts:
        result = _evaluate_part_stock(part.name, part.stock_qty, part.reorder_level)
        if not result:
            continue
        kind, alert = result
        if kind == "created":
            created.append(alert.name)
            created_docs.append(alert)
        else:
            resolved.append(alert.name)

    if created_docs:
        # One notification for the whole batch, not one per item - N
        # separate emails when several parts breach together was exactly
        # the "kalau banyak product" concern raised directly by the user.
        _notify_stock_alerts(created_docs)

    return {"created": created, "resolved": resolved}


def _notify_stock_alerts(alerts: list) -> None:
    """Two layers, not one - a document silently sitting in a list
    somewhere isn't an alert, it's just data nobody's looking at:

    1. Bell-icon Notification Log entry (Notification Type "Alert",
       already a stock fixture in Frappe core) - persists regardless of
       whether anyone's online right now, so it's still there whenever a
       Purchase Manager next opens Desk.
    2. Email, sent regardless of whether anyone's online - the primary
       channel (explicit request: no realtime popup modal - it doesn't
       reach anyone who isn't already staring at Desk at that exact
       moment, and stacks into multiple modals when several checks fire
       close together).

    Always one notification for the whole `alerts` batch (even when it's a
    batch of one) rather than one call per alert - keeps the table format
    below the single, consistent code path regardless of how many parts
    breached together.
    """
    if not alerts:
        return

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

    def _fmt(n):
        # 2 -> "2", 2.5 -> "2.5" - qty is rarely fractional here, but
        # trimming ".0" off whole numbers is what makes it read as a
        # quantity instead of a raw float dump.
        n = flt(n)
        return str(int(n)) if n == int(n) else f"{n:g}"

    if len(alerts) == 1:
        alert = alerts[0]
        subject = _("Stok {0} sudah di bawah batas minimum ({1} <= {2})").format(
            alert.part_name or alert.spare_part, _fmt(alert.stock_qty), _fmt(alert.reorder_level)
        )
    else:
        subject = _("{0} item stoknya sudah di bawah batas minimum").format(len(alerts))

    from frappe.desk.doctype.notification_log.notification_log import enqueue_create_notification

    enqueue_create_notification(
        users,
        {
            "type": "Alert",
            "document_type": "Garage Stock Alert",
            "document_name": alerts[0].name,
            "subject": subject,
        },
        dedupe_on=["document_type", "document_name"] if len(alerts) == 1 else None,
    )

    rows_html = "".join(
        f"""
        <tr>
            <td style="padding: 6px 12px 6px 0; border-bottom: 1px solid #d1d8dd;">{frappe.utils.escape_html(a.part_name or a.spare_part)}</td>
            <td style="padding: 6px 12px; text-align: right; color: #dc2626; font-weight: 700; border-bottom: 1px solid #d1d8dd;">{_fmt(a.stock_qty)}</td>
            <td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #d1d8dd;">{_fmt(a.reorder_level)}</td>
        </tr>
        """
        for a in alerts
    )

    list_url = frappe.utils.get_url("/app/garage-stock-alert?status=Open")
    single_url = frappe.utils.get_url_to_form("Garage Stock Alert", alerts[0].name)
    cta_url = single_url if len(alerts) == 1 else list_url
    cta_label = _("Lihat & Approve") if len(alerts) == 1 else _("Lihat Semua & Approve")

    body = f"""
        <div style="font-size: 14px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
                <thead>
                    <tr style="text-align: left; color: #8d99a6; font-size: 11px; text-transform: uppercase; letter-spacing: .03em;">
                        <th style="padding: 0 12px 6px 0; font-weight: 600;">Item</th>
                        <th style="padding: 0 12px 6px; text-align: right; font-weight: 600;">Stok</th>
                        <th style="padding: 0 0 6px; text-align: right; font-weight: 600;">Min</th>
                    </tr>
                </thead>
                <tbody>{rows_html}</tbody>
            </table>
            <a href="{cta_url}" style="display: inline-block; padding: 6px 16px; background: #dc2626; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px;">
                {cta_label} &rarr;
            </a>
        </div>
    """

    # Email is the primary channel here - reuses the exact same table/CTA
    # already built above instead of composing separate email copy.
    #
    # `users` holds User.name, not necessarily an email address - e.g.
    # Administrator's name is literally "Administrator" while its real
    # address is admin@example.com - so resolve each one's actual email
    # field instead of assuming name == email.
    recipient_emails = [
        email for email in (frappe.db.get_value("User", user, "email") for user in users) if email
    ]
    if recipient_emails:
        frappe.sendmail(
            recipients=recipient_emails,
            subject=subject,
            message=body,
            now=False,
        )
