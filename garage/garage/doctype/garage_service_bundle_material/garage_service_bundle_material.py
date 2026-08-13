# Copyright (c) 2024, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe.model.document import Document


class GarageServiceBundleMaterial(Document):
    """Child table row for materials included in a service bundle."""

    def validate(self) -> None:
        """Ensure fetched pricing fields stay aligned with the linked spare part."""
        if not self.material:
            return

        spare_part = frappe.get_cached_doc("Garage Spare Part", self.material)
        self.item_name = spare_part.part_name
        self.part_code = spare_part.part_code
        self.uom = spare_part.uom
        self.unit_price = spare_part.rate
        self.amount = (self.quantity or 0) * (self.unit_price or 0)
        self.stock_qty = spare_part.stock_qty

    def on_change(self) -> None:
        """Recalculate amount when the quantity changes inside the child table grid."""
        self.amount = (self.quantity or 0) * (self.unit_price or 0)
