"""Garage DocType controller for Garage Payment Entry."""
from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate


class GaragePaymentEntry(Document):
    """Validate payment entries and allocation rows."""

    PAYMENT_MODES = {"Cash", "Bank Transfer", "Credit"}
    STATUS_OPTIONS = {"Draft", "Submitted", "Cleared", "Failed"}

    def validate(self) -> None:  # noqa: D401
        self._validate_customer()
        self._validate_status_fields()
        self._validate_amounts()
        self._validate_allocations()

    def _validate_customer(self) -> None:
        if not self.customer:
            frappe.throw(_("Customer wajib diisi."))
        if not frappe.db.exists("Garage Customer", self.customer):
            frappe.throw(_("Customer {0} tidak ditemukan.").format(self.customer))

    def _validate_status_fields(self) -> None:
        if self.mode_of_payment and self.mode_of_payment not in self.PAYMENT_MODES:
            frappe.throw(_("Metode pembayaran tidak valid."))
        if self.status and self.status not in self.STATUS_OPTIONS:
            frappe.throw(_("Status payment entry tidak valid."))
        if self.reference_date and self.payment_date:
            if getdate(self.reference_date) < getdate(self.payment_date):
                frappe.throw(_("Reference date tidak boleh sebelum payment date."))

    def _validate_amounts(self) -> None:
        if self.paid_amount is None or flt(self.paid_amount) <= 0:
            frappe.throw(_("Nominal pembayaran wajib lebih besar dari 0."))
        if self.received_amount is not None and flt(self.received_amount) < 0:
            frappe.throw(_("Nominal diterima tidak boleh negatif."))
        if self.received_amount and self.received_amount > self.paid_amount:
            frappe.throw(_("Nominal diterima tidak boleh melebihi nominal bayar."))

    def _validate_allocations(self) -> None:
        total_allocated = 0.0
        for row in self.allocations or []:
            if row.invoice and not frappe.db.exists("Garage Sales Invoice", row.invoice):
                frappe.throw(_("Invoice {0} tidak ditemukan.").format(row.invoice))
            if row.allocated_amount is None or row.allocated_amount <= 0:
                frappe.throw(_("Nominal alokasi harus lebih besar dari 0."))
            if row.outstanding_before is not None and row.allocated_amount > row.outstanding_before:
                frappe.throw(_("Alokasi tidak boleh melebihi outstanding sebelum pembayaran."))
            total_allocated += flt(row.allocated_amount)
        if total_allocated and total_allocated > flt(self.paid_amount):
            frappe.throw(_("Total alokasi tidak boleh melebihi nominal pembayaran."))


__all__ = ["GaragePaymentEntry"]
