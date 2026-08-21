from __future__ import annotations

from typing import Iterable, Optional

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class GarageServiceBundle(Document):
    """Aggregate spare part and material costs for a service bundle."""

    def validate(self) -> None:
        self._validate_service_fee()
        self._sync_child_rows()
        self._compute_totals()

    def _validate_service_fee(self) -> None:
        # `reqd` on the field only blocks a genuinely empty value - 0 already
        # "has content" as far as Frappe's mandatory check is concerned, so a
        # bundle can otherwise be saved with no labor fee at all. That's how
        # Service Orders ended up snapshotting a Rp 0 "Jasa Paket" line, which
        # later forced the invoice builder to fall back to a meaningless
        # hardcoded default. Reject it outright instead.
        if flt(self.service_fee) <= 0:
            frappe.throw(_("Biaya Jasa harus lebih dari 0."))

    def _sync_child_rows(self) -> None:
        for row in self.spare_parts or []:
            self._hydrate_row(row, "spare_part")
        for row in self.materials or []:
            self._hydrate_row(row, "material")

    def _hydrate_row(self, row: Document, link_field: str) -> None:
        item_code = row.get(link_field)
        if not item_code:
            row.quantity = flt(row.quantity)
            row.unit_price = flt(row.unit_price)
            row.amount = flt(row.amount)
            return

        # spare_part/material link to Item now (see garage_service_bundle.js's
        # own gsb_on_item_selected() and the child doctypes' own "options" -
        # both switched from Garage Spare Part to Item so this bundle always
        # reads the one canonical price, see item_hooks.sync_garage_spare_
        # part_price for the full reasoning). This hydration has to mirror
        # that exact same source or a save would silently re-fetch stale/
        # empty data from the wrong doctype for any Item without a same-
        # coded Garage Spare Part record.
        item = frappe.db.get_value(
            "Item",
            item_code,
            ["item_name", "stock_uom", "standard_rate"],
            as_dict=True,
        )
        if not item:
            return

        row.item_name = item.get("item_name")
        row.part_code = item_code
        row.uom = item.get("stock_uom")
        unit_price = flt(item.get("standard_rate"))
        row.unit_price = unit_price
        row.stock_qty = flt(frappe.db.get_value("Bin", {"item_code": item_code}, "actual_qty") or 0)
        quantity = flt(row.quantity or 0)
        row.quantity = quantity
        row.amount = unit_price * quantity

    def _compute_totals(self) -> None:
        service_fee = flt(self.service_fee)
        spare_total = self._sum_amounts(self.spare_parts)
        material_total = self._sum_amounts(self.materials)

        self.total_spare_amount = spare_total
        self.total_material_amount = material_total
        self.grand_total = service_fee + spare_total + material_total

    @staticmethod
    def _sum_amounts(rows: Optional[Iterable[Document]]) -> float:
        total = 0.0
        if not rows:
            return total
        for row in rows:
            total += flt(row.amount)
        return total
