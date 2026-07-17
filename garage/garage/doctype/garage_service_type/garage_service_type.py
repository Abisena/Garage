# Copyright (c) 2024, Garage and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class GarageServiceType(Document):
    """Service type master with optional product bundle link."""

    def validate(self):
        # link_filters on the field only narrows the dropdown in the UI -
        # it doesn't stop the value being set some other way (API, import,
        # bulk edit), so re-check it here to keep the fee tied to a real
        # priced service Item instead of drifting into a manual number.
        if not self.item:
            frappe.throw(_("Service Item wajib diisi."))

        item_group = frappe.db.get_value("Item", self.item, "item_group")
        if item_group != "Services":
            frappe.throw(
                _("Service Item {0} harus dari Item Group 'Services', bukan '{1}'.").format(
                    frappe.bold(self.item), item_group
                )
            )

    def autoname(self):
        self.name = self.service_type
