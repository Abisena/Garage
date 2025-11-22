"""Garage DocType controller for Garage Stock Movement."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import nowdate, nowtime


class GarageStockMovement(Document):
    """Maintain stock quantities and ledger entries for spare parts."""

    def validate(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self._ensure_posting_timestamp()
        self._validate_items()

    def on_submit(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self.status = "Submitted"
        self._apply_stock_change(direction=1)

    def on_cancel(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self.status = "Cancelled"
        self._apply_stock_change(direction=-1)

    # internal helpers
    def _ensure_posting_timestamp(self) -> None:
        if not self.posting_date:
            self.posting_date = nowdate()
        if not self.posting_time:
            self.posting_time = nowtime()

    def _validate_items(self) -> None:
        if not self.items:
            frappe.throw(_("Tambahkan minimal satu item pergerakan stok."))

        for item in self.items:
            if not item.item_code:
                frappe.throw(_("Kode sparepart wajib diisi untuk semua baris."))
            if not item.qty or item.qty <= 0:
                frappe.throw(
                    _("Qty untuk {0} harus lebih besar dari nol.").format(item.item_code)
                )

    def _apply_stock_change(self, direction: int) -> None:
        """Apply stock delta and write ledger for each item.

        Args:
            direction: +1 when submitting, -1 when cancelling.
        """

        qty_sign = direction if self.movement_type == "Receipt" else -direction
        for row in self.items:
            self._update_stock_and_ledger(row, qty_sign)

    def _update_stock_and_ledger(self, row: Document, qty_sign: int) -> None:
        spare_part = frappe.get_doc("Garage Spare Part", row.item_code)
        delta_qty = qty_sign * (row.qty or 0)
        spare_part.stock_qty = (spare_part.stock_qty or 0) + delta_qty

        if qty_sign > 0 and self.movement_type == "Receipt":
            spare_part.last_restocked_on = self.posting_date

        spare_part.save(ignore_permissions=True)

        warehouse = row.target_warehouse or row.source_warehouse or self.warehouse
        if warehouse:
            bin_name = frappe.db.get_value(
                "Bin", {"item_code": row.item_code, "warehouse": warehouse}, "name"
            )

            if bin_name:
                bin_doc = frappe.get_doc("Bin", bin_name)
            else:
                bin_doc = frappe.get_doc(
                    {"doctype": "Bin", "item_code": row.item_code, "warehouse": warehouse}
                )

            bin_doc.actual_qty = (bin_doc.actual_qty or 0) + delta_qty
            bin_doc.save(ignore_permissions=True)

        ledger_doc = frappe.get_doc(
            {
                "doctype": "Garage Stock Ledger Entry",
                "posting_date": self.posting_date,
                "posting_time": self.posting_time,
                "warehouse": row.target_warehouse
                or row.source_warehouse
                or self.warehouse,
                "movement_type": self.movement_type,
                "spare_part": row.item_code,
                "qty": delta_qty,
                "balance_after": spare_part.stock_qty,
                "reference_doctype": self.doctype,
                "reference_name": self.name,
                "remarks": row.remarks or self.remarks,
                "is_cancelled": 1 if self.docstatus == 2 else 0,
            }
        )

        ledger_doc.insert(ignore_permissions=True)
