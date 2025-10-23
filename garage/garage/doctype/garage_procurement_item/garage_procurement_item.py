"""Garage DocType controller for Garage Procurement Item."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class GarageProcurementItem(Document):
    """Validate procurement item values used to build purchase orders."""

    def validate(self) -> None:  # noqa: D401
        if self.qty is None or self.qty <= 0:
            frappe.throw(_("Qty procurement harus lebih besar dari 0."))
        if self.rate is not None and self.rate < 0:
            frappe.throw(_("Rate procurement tidak boleh negatif."))
        if self.received_qty is not None and self.received_qty < 0:
            frappe.throw(_("Qty diterima tidak boleh negatif."))
        if self.received_qty is not None and self.qty is not None:
            if self.received_qty > self.qty:
                frappe.throw(_("Qty diterima tidak boleh melebihi qty order."))
        if self.rate is not None:
            self.amount = flt(self.qty) * flt(self.rate)


__all__ = ["GarageProcurementItem"]
