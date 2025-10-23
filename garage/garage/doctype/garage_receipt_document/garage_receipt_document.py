"""Garage DocType controller for Garage Receipt Document."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class GarageReceiptDocument(Document):
    """Ensure receipts reference valid payment entries and contain key metadata."""

    DELIVERY_METHODS = {"Email", "Printed Copy", "WhatsApp", "SMS"}

    def validate(self) -> None:  # noqa: D401
        self._validate_payment_reference()
        self._validate_delivery_method()
        self._enforce_unique_number()

    def _validate_payment_reference(self) -> None:
        if not self.payment_entry:
            frappe.throw(_("Payment entry wajib diisi."))
        if not frappe.db.exists("Garage Payment Entry", self.payment_entry):
            frappe.throw(_("Payment entry {0} tidak ditemukan.").format(self.payment_entry))
        if not self.receipt_number:
            frappe.throw(_("Nomor receipt wajib diisi."))

    def _validate_delivery_method(self) -> None:
        if self.delivery_method and self.delivery_method not in self.DELIVERY_METHODS:
            frappe.throw(_("Metode pengiriman receipt tidak valid."))

    def _enforce_unique_number(self) -> None:
        filters = {"receipt_number": self.receipt_number}
        if getattr(self, "name", None):
            filters["name"] = ["!=", self.name]
        existing = frappe.db.exists("Garage Receipt Document", filters)
        if existing:
            frappe.throw(_("Nomor receipt sudah digunakan oleh dokumen {0}.").format(existing))


__all__ = ["GarageReceiptDocument"]
