"""Garage DocType controller for Garage Stock Movement."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, now_datetime, nowdate, nowtime


class GarageStockMovement(Document):
    """Maintain stock quantities and ledger entries for spare parts."""

    def validate(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self._ensure_posting_timestamp()
        self._validate_items()

    def on_submit(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self.status = "Submitted"
        self._create_stock_entry()
        self._apply_stock_change(direction=1)

    def on_cancel(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self.status = "Cancelled"
        self._cancel_stock_entry()
        self._apply_stock_change(direction=-1)

    def _create_stock_entry(self) -> None:
        """Mirror this movement into a real, submitted Stock Entry.

        Previously this doctype only wrote Bin.actual_qty directly (and even
        that never actually fired in practice - every historical row here has
        a blank warehouse). That moves a number around but leaves no Stock
        Ledger Entry behind, so standard stock/valuation reports never see
        the movement. Rows whose item_code isn't a real stock Item are
        skipped - there's nothing for ERPNext's stock engine to post against.
        """

        stockable_rows = [
            row for row in self.items or []
            if row.item_code and frappe.db.get_value("Item", row.item_code, "is_stock_item")
        ]
        if not stockable_rows:
            return

        company = frappe.defaults.get_user_default("company") or frappe.defaults.get_global_default("company")
        if not company:
            frappe.throw(_("Default Company belum diatur, tidak bisa membuat Stock Entry."))

        default_warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")
        purpose = "Material Receipt" if self.movement_type == "Receipt" else "Material Issue"

        stock_entry = frappe.new_doc("Stock Entry")
        stock_entry.company = company
        stock_entry.stock_entry_type = purpose
        stock_entry.purpose = purpose
        stock_entry.set_posting_time = 1
        stock_entry.posting_date = self.posting_date or nowdate()
        stock_entry.posting_time = self.posting_time or now_datetime().time()
        stock_entry.remarks = self.remarks or _("{0} via Garage Stock Movement {1}").format(
            purpose, self.name
        )

        for row in stockable_rows:
            warehouse = row.target_warehouse or row.source_warehouse or self.warehouse or default_warehouse
            if not warehouse:
                frappe.throw(
                    _("Warehouse belum diatur untuk {0}, dan tidak ada default warehouse di Stock Settings.").format(
                        row.item_code
                    )
                )

            item_row = {
                "item_code": row.item_code,
                "item_name": row.item_name,
                "description": row.description,
                "qty": row.qty,
                "uom": row.uom or frappe.db.get_value("Item", row.item_code, "stock_uom"),
                "conversion_factor": 1,
            }
            if self.movement_type == "Receipt":
                item_row["t_warehouse"] = warehouse
            else:
                item_row["s_warehouse"] = warehouse

            stock_entry.append("items", item_row)

        if not stock_entry.items:
            return

        stock_entry.insert(ignore_permissions=True)
        stock_entry.submit()
        self.db_set("stock_entry", stock_entry.name, update_modified=False)
        self.stock_entry = stock_entry.name

    def _cancel_stock_entry(self) -> None:
        if not self.stock_entry:
            return
        stock_entry = frappe.get_doc("Stock Entry", self.stock_entry)
        if stock_entry.docstatus == 1:
            stock_entry.cancel()

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
        spare_part = self._get_or_create_spare_part(row)
        delta_qty = qty_sign * (row.qty or 0)
        spare_part.stock_qty = (spare_part.stock_qty or 0) + delta_qty

        if qty_sign > 0 and self.movement_type == "Receipt":
            spare_part.last_restocked_on = self.posting_date

        spare_part.save(ignore_permissions=True)

        # Bin.actual_qty is no longer written here directly - the real Stock
        # Entry created in _create_stock_entry() (for stock-tracked items)
        # already updates Bin through ERPNext's own Stock Ledger, so writing
        # it again here would double-count the change.

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

    def _get_or_create_spare_part(self, row: Document) -> Document:
        if frappe.db.exists("Garage Spare Part", row.item_code):
            return frappe.get_doc("Garage Spare Part", row.item_code)

        spare_part = frappe.new_doc("Garage Spare Part")
        spare_part.part_code = row.item_code
        spare_part.part_name = row.item_name or row.item_code
        spare_part.description = row.description
        spare_part.uom = row.uom or spare_part.uom
        # Item.standard_rate is this app's own canonical price (see
        # item_hooks.sync_garage_spare_part_price, which keeps this same
        # field in sync afterward whenever the Item's own price changes) -
        # left unset here, every spare part first seen through a stock
        # movement silently started at Rp 0 wherever its price gets read
        # later (Garage Service Bundle, the customer portal, etc.).
        spare_part.unit_price = flt(
            frappe.db.get_value("Item", row.item_code, "standard_rate") or 0
        )
        spare_part.insert(ignore_permissions=True)
        return spare_part
