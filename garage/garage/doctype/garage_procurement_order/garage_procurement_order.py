"""Garage DocType controller for Garage Procurement Order."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate


class GarageProcurementOrder(Document):
    """Validate procurement orders and ensure quantities and totals are consistent."""

    REFERENCE_TYPES = {"Garage Service Order", "Garage Spare Part Order"}
    STATUS_OPTIONS = {"Draft", "Ordered", "Partially Received", "Completed", "Cancelled"}

    def validate(self) -> None:  # noqa: D401
        self._validate_reference()
        self._validate_status()
        self._validate_dates()
        self._validate_items()
        self._update_totals()

    def _validate_reference(self) -> None:
        if self.reference_type and self.reference_type not in self.REFERENCE_TYPES:
            frappe.throw(_("Reference type tidak valid."))
        if self.reference_type and self.reference_name:
            if not frappe.db.exists(self.reference_type, self.reference_name):
                frappe.throw(_("Referensi {0} tidak ditemukan.").format(self.reference_name))

    def _validate_status(self) -> None:
        if self.status and self.status not in self.STATUS_OPTIONS:
            frappe.throw(_("Status procurement tidak valid."))

    def _validate_dates(self) -> None:
        if self.expected_date and self.order_date:
            if getdate(self.expected_date) < getdate(self.order_date):
                frappe.throw(_("Expected date tidak boleh sebelum order date."))

    def _validate_items(self) -> None:
        if not self.items:
            frappe.throw(_("Daftar item procurement wajib diisi."))
        for row in self.items:
            if row.qty is None or row.qty <= 0:
                frappe.throw(_("Qty item procurement harus lebih besar dari 0."))
            if row.rate is not None and row.rate < 0:
                frappe.throw(_("Rate item procurement tidak boleh negatif."))
            if row.amount is not None and row.amount < 0:
                frappe.throw(_("Amount item procurement tidak boleh negatif."))
            if row.received_qty is not None and row.received_qty < 0:
                frappe.throw(_("Received qty tidak boleh negatif."))
            if row.received_qty is not None and row.qty is not None:
                if row.received_qty > row.qty:
                    frappe.throw(_("Received qty tidak boleh melebihi qty."))

    def _update_totals(self) -> None:
        total_qty = 0.0
        total_amount = 0.0
        for row in self.items:
            if row.qty is not None and row.rate is not None:
                row.amount = flt(row.qty) * flt(row.rate)
            total_qty += flt(row.qty)
            total_amount += flt(row.amount)
        self.total_qty = total_qty
        self.total_amount = total_amount


__all__ = ["GarageProcurementOrder"]
