# Copyright (c) 2024, Garage and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class GarageBrand(Document):
    def validate(self) -> None:
        self.brand_name = (self.brand_name or "").strip().upper()

    def autoname(self) -> None:
        self.name = (self.brand_name or "").strip().upper()
