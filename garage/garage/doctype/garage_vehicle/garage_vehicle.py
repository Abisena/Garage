"""Garage DocType controller for Garage Vehicle."""

from __future__ import annotations

from datetime import date
from typing import Optional

import frappe
from frappe import _
from frappe.model.document import Document


class GarageVehicle(Document):
    """Validate vehicle master data before persisting."""

    MIN_YEAR = 1950

    def validate(self) -> None:  # noqa: D401 - Frappe hook
        """Ensure the vehicle is linked to a valid customer and sane metadata."""

        self._normalize_identifiers()
        self._validate_customer_link()
        self._validate_vehicle_year()
        self._validate_mileage()
        self._enforce_unique("license_plate", self.license_plate)
        self._enforce_unique("vin", self.vin)

    def _normalize_identifiers(self) -> None:
        if self.license_plate:
            self.license_plate = self.license_plate.strip().upper()
        if self.vin:
            self.vin = self.vin.strip().upper()

    def _validate_customer_link(self) -> None:
        if not self.customer:
            frappe.throw(_("Kendaraan wajib dikaitkan ke customer."))
        if not frappe.db.exists("Garage Customer", self.customer):
            frappe.throw(_("Customer {0} tidak ditemukan.").format(self.customer))

    def _validate_vehicle_year(self) -> None:
        if not self.vehicle_year:
            return
        current_year = date.today().year
        if self.vehicle_year < self.MIN_YEAR or self.vehicle_year > current_year + 1:
            frappe.throw(
                _("Tahun kendaraan harus antara {min_year} dan {max_year}.").format(
                    min_year=self.MIN_YEAR,
                    max_year=current_year + 1,
                )
            )

    def _validate_mileage(self) -> None:
        if self.mileage is None:
            return
        if self.mileage < 0:
            frappe.throw(_("Mileage tidak boleh bernilai negatif."))

    def _enforce_unique(self, field: str, value: Optional[str]) -> None:
        if not value:
            return
        filters = {field: value}
        if getattr(self, "name", None):
            filters["name"] = ["!=", self.name]
        existing = frappe.db.exists("Garage Vehicle", filters)
        if existing:
            frappe.throw(
                _("{field} sudah digunakan oleh kendaraan lain ({vehicle}).").format(
                    field=_(field.replace("_", " ").title()),
                    vehicle=existing,
                )
            )

