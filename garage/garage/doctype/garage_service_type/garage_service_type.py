# Copyright (c) 2024, Garage and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from garage.utils.pricing import get_item_rate


class GarageServiceType(Document):
    """Service type master with optional product bundle link."""

    def validate(self):
        self.bundle_description = (self.bundle_description or "").strip().upper()

        if not self.item:
            self.service_fee = 0
            return

        # link_filters on the field only narrows the dropdown in the UI -
        # it doesn't stop the value being set some other way (API, import,
        # bulk edit), so re-check it here to keep the fee tied to a real
        # priced service Item instead of drifting into a manual number.
        item_group = frappe.db.get_value("Item", self.item, "item_group")
        if item_group != "Services":
            frappe.throw(
                _("Service Item {0} harus dari Item Group 'Services', bukan '{1}'.").format(
                    frappe.bold(self.item), item_group
                )
            )

        # service_fee used to be a plain `fetch_from: item.standard_rate` -
        # that field is only ever shown on a brand new, unsaved Item and
        # nothing keeps it updated afterward, so fetch_from silently copied
        # 0 for every real Service Item. Resolving it here from Item Price
        # on every save keeps it live instead.
        self.service_fee = get_item_rate(self.item)

    def autoname(self):
        self.name = self.service_type
