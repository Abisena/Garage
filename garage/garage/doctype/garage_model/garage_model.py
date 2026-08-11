# Copyright (c) 2024, Garage and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class GarageModel(Document):
    def validate(self) -> None:
        self.model_name = (self.model_name or "").strip().upper()

    def autoname(self) -> None:
        self.name = (self.model_name or "").strip().upper()
