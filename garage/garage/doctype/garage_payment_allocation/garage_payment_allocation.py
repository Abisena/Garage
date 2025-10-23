"""Garage DocType controller for Garage Payment Allocation."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class GaragePaymentAllocation(Document):
    """Validate allocation rows to ensure consistency with invoices."""

    def validate(self) -> None:  # noqa: D401
        if self.invoice and not frappe.db.exists("Garage Sales Invoice", self.invoice):
            frappe.throw(_("Invoice {0} tidak ditemukan.").format(self.invoice))
        if self.allocated_amount is None or self.allocated_amount <= 0:
            frappe.throw(_("Nominal alokasi harus lebih besar dari 0."))
        if self.outstanding_before is not None and self.allocated_amount > self.outstanding_before:
            frappe.throw(_("Nominal alokasi tidak boleh melebihi outstanding sebelum bayar."))
        if self.outstanding_after is not None and self.outstanding_after < 0:
            frappe.throw(_("Outstanding setelah bayar tidak boleh negatif."))


__all__ = ["GaragePaymentAllocation"]
