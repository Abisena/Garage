"""Garage DocType controller for Garage Sales Invoice."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate


class GarageSalesInvoice(Document):
    """Validate invoice data and align totals with item rows."""

    SOURCE_TYPES = {"Garage Service Order", "Garage Spare Part Order"}
    STATUS_OPTIONS = {"Draft", "Submitted", "Paid", "Partially Paid", "Overdue", "Cancelled"}
    PAYMENT_STATUSES = {"Pending", "Paid", "Overdue"}

    def validate(self) -> None:  # noqa: D401
        self._validate_customer()
        self._validate_reference()
        self._validate_status()
        self._validate_dates()
        self._validate_items()
        self._validate_payment_schedule()
        self._update_totals()

    def _validate_customer(self) -> None:
        if not self.customer:
            frappe.throw(_("Customer wajib diisi."))
        if not frappe.db.exists("Garage Customer", self.customer):
            frappe.throw(_("Customer {0} tidak ditemukan.").format(self.customer))

    def _validate_reference(self) -> None:
        if self.source_type and self.source_type not in self.SOURCE_TYPES:
            frappe.throw(_("Source type invoice tidak valid."))
        if self.source_type and self.source_name:
            if not frappe.db.exists(self.source_type, self.source_name):
                frappe.throw(_("Dokumen sumber {0} tidak ditemukan.").format(self.source_name))

    def _validate_status(self) -> None:
        if self.status and self.status not in self.STATUS_OPTIONS:
            frappe.throw(_("Status invoice tidak valid."))

    def _validate_dates(self) -> None:
        if self.due_date and self.invoice_date:
            if getdate(self.due_date) < getdate(self.invoice_date):
                frappe.throw(_("Due date tidak boleh sebelum invoice date."))

    def _validate_items(self) -> None:
        if not self.items:
            frappe.throw(_("Detail invoice wajib diisi."))
        for row in self.items:
            if row.qty is None or row.qty <= 0:
                frappe.throw(_("Qty item invoice harus lebih besar dari 0."))
            if row.rate is not None and row.rate < 0:
                frappe.throw(_("Rate item invoice tidak boleh negatif."))
            if row.amount is not None and row.amount < 0:
                frappe.throw(_("Amount item invoice tidak boleh negatif."))

    def _validate_payment_schedule(self) -> None:
        total_percentage = 0.0
        for row in self.payment_schedule or []:
            if row.status and row.status not in self.PAYMENT_STATUSES:
                frappe.throw(_("Status termin invoice tidak valid."))
            if row.percentage is not None and row.percentage < 0:
                frappe.throw(_("Persentase termin tidak boleh negatif."))
            if row.amount is not None and row.amount < 0:
                frappe.throw(_("Nominal termin tidak boleh negatif."))
            total_percentage += row.percentage or 0
        if total_percentage > 100.0 + 1e-6:
            frappe.throw(_("Total persentase termin melebihi 100%."))

    def _update_totals(self) -> None:
        total_amount = 0.0
        for row in self.items:
            if row.rate is not None and row.qty is not None:
                row.amount = flt(row.rate) * flt(row.qty)
            total_amount += flt(row.amount)
        self.total_amount = total_amount
        if not self.outstanding_amount or self.outstanding_amount > total_amount:
            self.outstanding_amount = total_amount


__all__ = ["GarageSalesInvoice"]
