"""Garage DocType controller for Garage Service Order Part."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class GarageServiceOrderPart(Document):
    """Validate individual part rows within a service order."""

    SOURCES = {"On Hand", "Purchase", "Transfer"}
    STOCK_STATUSES = {"Pending Check", "Available", "To Order", "Ordered", "Received", "Issued"}

    def validate(self) -> None:  # noqa: D401
        if self.source and self.source not in self.SOURCES:
            frappe.throw(_("Sumber part tidak valid."))
        if self.stock_status and self.stock_status not in self.STOCK_STATUSES:
            frappe.throw(_("Status stok part tidak valid."))
        if self.qty is None or self.qty <= 0:
            frappe.throw(_("Qty part harus lebih besar dari 0."))
        if self.rate is not None and self.rate < 0:
            frappe.throw(_("Rate part tidak boleh negatif."))
        if self.amount is not None and self.amount < 0:
            frappe.throw(_("Amount part tidak boleh negatif."))
        if self.rate is not None:
            self.amount = flt(self.qty) * flt(self.rate)


__all__ = ["GarageServiceOrderPart"]
