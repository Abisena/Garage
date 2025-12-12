# Copyright (c) 2024, Garage and contributors
# For license information, please see license.txt

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

import frappe
from frappe.model.document import Document

if TYPE_CHECKING:
    from garage.garage.doctype.customer_registration.customer_registration import (
        CustomerRegistration,
    )


class CustomerEntry(Document):
    """Read-only record representing a customer's queue entry."""


def create_from_registration(registration: "CustomerRegistration") -> Optional[Document]:
    """Create or reuse a queue entry derived from a customer registration."""

    if not registration or not getattr(registration, "name", None):
        return None

    existing = frappe.db.exists("Customer Entry", {"customer_registration": registration.name})
    if existing:
        return frappe.get_doc("Customer Entry", existing)

    queue_number = registration.service_order or registration.name

    entry = frappe.new_doc("Customer Entry")
    entry.customer_registration = registration.name
    entry.queue_number = queue_number
    entry.branch = registration.branch
    entry.customer = registration.customer
    entry.customer_name = registration.customer_name
    entry.phone = registration.phone
    entry.license_plate = registration.license_plate
    entry.vehicle = registration.vehicle
    entry.service_order = registration.service_order

    entry.flags.ignore_permissions = True
    entry.insert(ignore_permissions=True)

    return entry
