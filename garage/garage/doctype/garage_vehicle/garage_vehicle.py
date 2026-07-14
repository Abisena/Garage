"""Garage DocType controller for Garage Vehicle."""

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

    def _normalize_license_plate(self) -> None:
        if self.license_plate:
            self.license_plate = self.license_plate.strip().upper()
