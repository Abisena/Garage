"""DocType controller for Spare Part Request."""
from __future__ import annotations

from typing import Iterable, Sequence

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import nowdate


ITEM_PENDING = "Pending"
ITEM_APPROVED = "Approved"
ITEM_REJECTED = "Rejected"


class SparePartRequest(Document):
    """Represent a collection of requested spare parts awaiting approval."""

    def before_insert(self) -> None:  # pragma: no cover - frappe lifecycle hook
        if not self.request_date:
            self.request_date = nowdate()
        if not self.status:
            self.status = ITEM_PENDING

    def validate(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self._sync_status_from_items()

    def update_items_status(self, item_names: Sequence[str], status: str) -> None:
        """Update the approval status for specific items.

        Creating a stock issue is handled automatically when items move to
        "Approved" status. Existing issue documents are left untouched to avoid
        double counting.
        """

        normalized_status = status.strip().title()
        if normalized_status not in {ITEM_APPROVED, ITEM_REJECTED}:
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
        statuses = [row.approval_status or ITEM_PENDING for row in self.items or []]
        self.status = derive_request_status(statuses, getattr(self, "status", None))

    def _apply_item_status(self, row: Document, status: str) -> bool:
        """Set the approval status and create stock issue when needed."""

        if row.approval_status == status:
            return False

        row.approval_status = status
        if status == ITEM_APPROVED and not row.stock_movement:
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


def derive_request_status(statuses: Iterable[str], base_status: str | None = None) -> str:
    collected = [status.strip() for status in statuses if status]
    if not collected:
        return base_status or ITEM_PENDING

    normalized = [status.lower() for status in collected]

    has_rejected = any(status == ITEM_REJECTED.lower() for status in normalized)
    has_approved = any(status == ITEM_APPROVED.lower() for status in normalized)
    has_pending = any(status not in {ITEM_REJECTED.lower(), ITEM_APPROVED.lower()} for status in normalized)

    if has_rejected and (has_approved or has_pending):
        return "Partial Reject"
    if has_rejected and not (has_approved or has_pending):
        return "Rejected"
    if has_approved and has_pending:
        return "Partial Approve"
    if has_pending:
        return ITEM_PENDING
    if has_approved:
        return ITEM_APPROVED

    return base_status or ITEM_PENDING


@frappe.whitelist()
def update_items_status(name: str, item_names: Sequence[str] | str, status: str) -> str:
    """Whitelist wrapper to update items using RPC calls."""

    if isinstance(item_names, str):
        item_names = frappe.parse_json(item_names)

    doc = frappe.get_doc("Spare Part Request", name)
    doc.update_items_status(item_names, status)
    return doc.status
