"""Garage DocType controller for Garage Customer."""

import random
import string

from frappe.model.document import Document
from frappe.utils import nowdate, nowtime

import frappe
from frappe import _


UPPERCASE_FIELDS = (
    "customer_name",
    "address_line1",
    "address_line2",
    "city",
    "state",
    "country",
)


class GarageCustomer(Document):

    def autoname(self):
        num = _generate_customer_number()
        self.customer_number = num
        self.name = num

    def validate(self):
        self._uppercase_fields()
        self._lock_customer_number()

    def before_insert(self):
        if not self.registration_date:
            self.registration_date = nowdate()
        if not self.registration_time:
            self.registration_time = nowtime()

    def _uppercase_fields(self):
        for field in UPPERCASE_FIELDS:
            value = getattr(self, field, None)
            if value and isinstance(value, str):
                setattr(self, field, value.upper())

    def _lock_customer_number(self):
        # customer_number is system-generated (autoname, above) and doubles
        # as this doctype's `name` - the desk form already locks the input
        # client-side (garage_customer.js ALWAYS_READ_ONLY), but that's only
        # a UI restriction, not enforced for API calls, bulk edit, or Data
        # Import. Block it here too so it genuinely can't change once set,
        # regardless of how the request comes in.
        if self.is_new():
            return
        previous = frappe.db.get_value("Garage Customer", self.name, "customer_number")
        if previous and self.customer_number != previous:
            frappe.throw(_("Customer Number cannot be changed after it has been created."))


def _generate_customer_number():
    prefix = "26"
    while True:
        number = prefix + "".join(random.choices(string.digits, k=8))
        if not frappe.db.exists("Garage Customer", number):
            return number
