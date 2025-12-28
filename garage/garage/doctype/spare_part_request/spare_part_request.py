"""DocType controller for Spare Part Request."""
from __future__ import annotations

from typing import Iterable, Sequence

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cstr, flt, nowdate

from garage.garage.doctype.garage_service_order.garage_service_order import (
    derive_part_charge_status,
)

ITEM_PENDING = "Pending"
ITEM_PREPARED = "Prepared"
ITEM_REJECTED = "Rejected"
ITEM_APPROVED_LEGACY = "Approved"
ITEM_APPROVED = ITEM_PREPARED


class SparePartRequest(Document):
    """Represent a collection of requested spare parts awaiting approval."""

    status_map = {
        ITEM_PENDING: "Request Spare Part",
        ITEM_PREPARED: "Prepared",
        ITEM_REJECTED: "Rejected",
        ITEM_APPROVED_LEGACY: "Prepared",
    }

    def before_insert(self) -> None:  # pragma: no cover - frappe lifecycle hook
        if not self.request_date:
            self.request_date = nowdate()
        if not self.status:
            self.status = ITEM_PENDING

    def validate(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self._sync_status_from_items()
        self._sync_service_order_parts()

    def update_items_status(self, item_names: Sequence[str], status: str) -> None:
        """Update the approval status for specific items.

        Creating a stock issue is handled automatically when items move to
        "Prepared" status. Existing issue documents are left untouched to avoid
        double counting.
        """

        normalized_status = normalize_approval_status(status)
        if normalized_status not in {ITEM_PREPARED, ITEM_REJECTED}:
            frappe.throw(_("Status {0} tidak diizinkan.").format(status))

        changed = False
        for row in self.items or []:
            if row.name not in item_names:
                continue
            changed = self._apply_item_status(row, normalized_status) or changed

        if not changed:
            return

        self._sync_status_from_items()
        self.save(ignore_permissions=True)

    # internal helpers
    def _sync_status_from_items(self) -> None:
        statuses = [
            normalize_approval_status(row.approval_status or ITEM_PENDING)
            for row in self.items or []
        ]
        self.status = derive_request_status(statuses, getattr(self, "status", None))

    def _sync_service_order_parts(self) -> None:
        if not self.service_order:
            return

        if getattr(frappe.flags, "skip_spare_part_request_service_order_sync", False):
            return

        try:
            service_doc = frappe.get_doc("Repair Orders", self.service_order)
        except Exception:
            return

        existing_parts = {
            cstr(row.item_code): row
            for row in getattr(service_doc, "required_parts", []) or []
            if getattr(row, "item_code", None)
        }

        updated = False

        for item in self.items or []:
            item_code = cstr(item.item_code or "").strip()
            if not item_code:
                continue

            if not frappe.db.exists("Item", item_code):
                continue

            qty = flt(item.qty or 0)
            normalized_status = normalize_approval_status(item.approval_status or ITEM_PENDING)
            if normalized_status == ITEM_PENDING and self.status == ITEM_PREPARED:
                normalized_status = ITEM_PREPARED
            status = self.status_map.get(normalized_status, "Request Spare Part")
            warehouse = cstr(item.source_warehouse or "").strip() or None

            row = existing_parts.get(item_code)
            if not row:
                row = service_doc.append(
                    "required_parts",
                    {
                        "item_code": item_code,
                        "qty": qty or 1,
                        "stock_status": status,
                        "warehouse": warehouse,
                    },
                )
                existing_parts[item_code] = row
                updated = True
                continue

            if qty and flt(row.qty) != qty:
                row.qty = qty
                updated = True

            if warehouse and cstr(row.warehouse or "") != warehouse:
                row.warehouse = warehouse
                updated = True

            if status and cstr(row.stock_status or "") != status:
                row.stock_status = status
                updated = True

        if not updated:
            return

        service_doc.part_charge_status = derive_part_charge_status(
            [cstr(getattr(row, "stock_status", "")) for row in service_doc.required_parts or []],
            getattr(service_doc, "part_charge_status", None),
        )

        frappe.flags.skip_service_order_spare_part_request_sync = True
        try:
            service_doc.save(ignore_permissions=True)
        finally:
            frappe.flags.skip_service_order_spare_part_request_sync = False

    def _apply_item_status(self, row: Document, status: str) -> bool:
        """Set the approval status and create stock issue when needed."""

        if row.approval_status == status:
            return False

        row.approval_status = status
        if status == ITEM_PREPARED and not row.stock_movement:
            row.stock_movement = self._issue_stock(row)
        return True

    def _issue_stock(self, row: Document) -> str:
        """Create and submit a stock movement for an approved item."""

        movement = frappe.new_doc("Garage Stock Movement")
        movement.movement_type = "Issue"
        movement.reference_type = self.doctype
        movement.reference_name = self.name
        movement.posting_date = self.request_date or nowdate()
        movement.warehouse = row.source_warehouse
        movement.remarks = self.remarks or _("Issue for {0}").format(self.service_order or self.name)

        movement.append(
            "items",
            {
                "item_code": row.item_code,
                "item_name": row.item_name,
                "description": row.description,
                "qty": row.qty,
                "uom": row.uom,
                "source_warehouse": row.source_warehouse,
            },
        )

        movement.insert(ignore_permissions=True)
        movement.submit()
        return movement.name


def normalize_approval_status(status: str) -> str:
    normalized = status.strip().title()
    if normalized == ITEM_APPROVED_LEGACY:
        return ITEM_PREPARED
    return normalized


def derive_request_status(statuses: Iterable[str], base_status: str | None = None) -> str:
    collected = [normalize_approval_status(status) for status in statuses if status]
    if not collected:
        return base_status or ITEM_PENDING

    normalized = [status.lower() for status in collected]

    has_rejected = any(status == ITEM_REJECTED.lower() for status in normalized)
    has_prepared = any(status == ITEM_PREPARED.lower() for status in normalized)
    has_pending = any(status not in {ITEM_REJECTED.lower(), ITEM_PREPARED.lower()} for status in normalized)

    if has_rejected and (has_prepared or has_pending):
        return "Partial Reject"
    if has_rejected and not (has_prepared or has_pending):
        return "Rejected"
    if has_prepared and has_pending:
        return "Partial Approve"
    if has_pending:
        return ITEM_PENDING
    if has_prepared:
        return ITEM_PREPARED

    return base_status or ITEM_PENDING


@frappe.whitelist()
def update_items_status(name: str, item_names: Sequence[str] | str, status: str) -> str:
    """Whitelist wrapper to update items using RPC calls."""

    if isinstance(item_names, str):
        item_names = frappe.parse_json(item_names)

    doc = frappe.get_doc("Spare Part Request", name)
    doc.update_items_status(item_names, status)
    return doc.status
