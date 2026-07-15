"""Garage DocType controller for Garage Vehicle."""

import frappe
from frappe import _
from frappe.model.document import Document


class GarageVehicle(Document):
    """Basic controller for the `GarageVehicle` DocType."""

    def before_naming(self) -> None:
        # license_plate drives autoname (field:license_plate) and is unique
        # under a case-insensitive DB collation, so "B 2121" and "b 2121"
        # collide silently at the DB layer. Normalize to uppercase before
        # naming happens, not just in validate(), since set_new_name() reads
        # this field before validate() ever runs.
        self._normalize_license_plate()

    def validate(self) -> None:
        self._normalize_license_plate()
        self._lock_customer()

    def _normalize_license_plate(self) -> None:
        if self.license_plate:
            self.license_plate = self.license_plate.strip().upper()

    def _lock_customer(self) -> None:
        # Vehicle ownership shouldn't be reassignable by editing the record -
        # the desk form (garage_vehicle.js) and Quick Entry dialog
        # (GarageVehicleQuickEntryForm in garage_theme.js) already lock the
        # "No. Customer" field client-side the moment it's first set, even
        # before the record is saved. This is the server-side backstop so
        # the same rule holds for API calls, bulk edit, and Data Import too -
        # once a vehicle has a customer on record, it can't change.
        if self.is_new():
            return
        previous = frappe.db.get_value("Garage Vehicle", self.name, "customer")
        if previous and self.customer != previous:
            frappe.throw(_("Customer cannot be changed after the vehicle has been created."))
