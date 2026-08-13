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

        part = frappe.db.get_value(
            "Garage Spare Part",
            item_code,
            ["part_name", "part_code", "unit_price", "uom", "stock_qty"],
            as_dict=True,
        )
        if not part:
            return

        row.item_name = part.get("part_name")
        row.part_code = part.get("part_code")
        row.uom = part.get("uom")
        unit_price = flt(part.get("unit_price"))
        row.unit_price = unit_price
        row.stock_qty = part.get("stock_qty")
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
