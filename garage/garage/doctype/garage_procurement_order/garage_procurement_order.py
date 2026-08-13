"""Garage DocType controller for Garage Procurement Order."""

from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import flt, nowdate


class GarageProcurementOrder(Document):
    """Calculate totals and generate receiving documents for procurement."""

    def validate(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self._recompute_amounts()

    def on_submit(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self.status = "Ordered"
        self._create_receipt_movement()

    def on_cancel(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self.status = "Cancelled"

    # helpers
    def _recompute_amounts(self) -> None:
        total_qty = 0.0
        total_amount = 0.0

        for row in self.items:
            row.amount = flt(row.qty) * flt(row.rate)
            total_qty += flt(row.qty)
            total_amount += row.amount

        self.total_qty = total_qty
        self.total_amount = total_amount

    def _create_receipt_movement(self) -> None:
        if not self.items:
            return

        movement = frappe.new_doc("Garage Stock Movement")
        movement.movement_type = "Receipt"
        movement.reference_type = self.doctype
        movement.reference_name = self.name
        movement.posting_date = self.expected_date or self.order_date or nowdate()
        movement.warehouse = self.warehouse
        movement.remarks = self.remarks

        for row in self.items:
            movement.append(
                "items",
                {
                    "item_code": row.item_code,
                    "item_name": row.item_name,
                    "description": row.description,
                    "qty": row.qty,
                    "uom": row.uom,
                    "target_warehouse": self.warehouse,
                    "remarks": row.description,
                },
            )
            row.received_qty = row.qty

        movement.insert(ignore_permissions=True)
        movement.submit()
