"""Garage DocType controller for Garage Stock Movement Item."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class GarageStockMovementItem(Document):
    """Validate individual stock movement rows."""

    STATUS_OPTIONS = {"Draft", "Submitted", "Cancelled"}

    def validate(self) -> None:  # noqa: D401
        if self.status and self.status not in self.STATUS_OPTIONS:
            frappe.throw(_("Status detail movement tidak valid."))
        if self.qty is None or self.qty <= 0:
            frappe.throw(_("Qty movement harus lebih besar dari 0."))
        if self.source_warehouse == self.target_warehouse and self.source_warehouse:
            frappe.throw(_("Sumber dan tujuan warehouse tidak boleh sama."))


__all__ = ["GarageStockMovementItem"]
