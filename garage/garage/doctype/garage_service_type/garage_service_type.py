# Copyright (c) 2024, Garage and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class GarageServiceType(Document):
    """Service type master linked to available product bundles."""

    def validate(self):
        """Enforce that exactly one of service type or product bundle is provided."""
        has_service_type = bool(self.service_type)
        has_product_bundle = bool(self.product_bundle)

        if has_service_type and has_product_bundle:
            frappe.throw(_("Please fill either Service Type or Product Bundle, not both."))

        if not has_service_type and not has_product_bundle:
            frappe.throw(_("Service Type or Product Bundle is required."))

        if not has_service_type and has_product_bundle:
            # Use the bundle name as the document name when no service type is set.
            self.service_type = self.product_bundle

    def autoname(self):
        self.name = self.service_type or self.product_bundle
