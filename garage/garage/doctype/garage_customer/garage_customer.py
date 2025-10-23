"""Garage DocType controller for Garage Customer."""

from __future__ import annotations

import re
from typing import Optional

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import validate_email_address


class GarageCustomer(Document):
    """Validate customer master data before saving."""

    CUSTOMER_TYPES = {"Individual", "Corporate"}
    CONTACT_METHODS = {"Phone", "Email", "WhatsApp"}
    MARKETING_SOURCES = {"Walk In", "Referral", "Online", "Social Media", "Other"}
    PHONE_PATTERN = re.compile(r"^[0-9+()\-\s]{6,}$")

    def validate(self) -> None:  # noqa: D401 - Frappe hook
        """Run field level validations and duplicate checks."""

        self._normalize_text_fields()
        self._validate_selects()
        self._validate_contact_details()
        self._enforce_uniqueness("phone", self.phone)
        self._enforce_uniqueness("email", self.email.lower() if self.email else None)
        self._enforce_uniqueness("id_number", self.id_number)

    # ------------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------------
    def _normalize_text_fields(self) -> None:
        self.customer_name = (self.customer_name or "").strip()
        if not self.customer_name:
            frappe.throw(_("Nama customer wajib diisi."))

        if self.email:
            self.email = self.email.strip()
        if self.phone:
            self.phone = self.phone.strip()
        if self.id_number:
            self.id_number = self.id_number.strip()

    def _validate_selects(self) -> None:
        if self.customer_type and self.customer_type not in self.CUSTOMER_TYPES:
            frappe.throw(_("Tipe customer tidak valid."))
        if (
            self.preferred_contact_method
            and self.preferred_contact_method not in self.CONTACT_METHODS
        ):
            frappe.throw(_("Metode kontak tidak dikenal."))
        if self.marketing_source and self.marketing_source not in self.MARKETING_SOURCES:
            frappe.throw(_("Sumber marketing tidak valid."))

    def _validate_contact_details(self) -> None:
        if not self.phone and not self.email:
            frappe.throw(_("Minimal salah satu dari nomor telepon atau email wajib diisi."))

        if self.email:
            validate_email_address(self.email, throw=True)

        if self.phone and not self.PHONE_PATTERN.match(self.phone):
            frappe.throw(
                _("Format nomor telepon tidak valid. Gunakan angka dan karakter +()- saja."),
            )

    def _enforce_uniqueness(self, field: str, value: Optional[str]) -> None:
        if not value:
            return

        filters = {field: value}
        if getattr(self, "name", None):
            filters["name"] = ["!=", self.name]

        existing = frappe.db.exists("Garage Customer", filters)
        if existing:
            frappe.throw(
                _("{field} sudah digunakan oleh customer {customer}.").format(
                    field=_(field.replace("_", " ").title()),
                    customer=existing,
                )
            )

