"""Garage DocType controller for Garage Spare Part Order Item."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class GarageSparePartOrderItem(Document):
    """Validate spare part order items to prevent inconsistent data."""

    STOCK_STATUSES = {"Pending Check", "Available", "To Order", "Ordered", "Received", "Issued"}

    def validate(self) -> None:  # noqa: D401
        if self.stock_status and self.stock_status not in self.STOCK_STATUSES:
            frappe.throw(_("Status stok item tidak valid."))
        if self.qty is None or self.qty <= 0:
            frappe.throw(_("Qty item harus lebih besar dari 0."))
        if self.rate is not None and self.rate < 0:
            frappe.throw(_("Rate item tidak boleh negatif."))
        if self.rate is not None:
            self.amount = flt(self.qty) * flt(self.rate)


__all__ = ["GarageSparePartOrderItem"]
