"""Document event hooks for ERPNext Customer."""

from __future__ import annotations

import random

import frappe


CUSTOMER_NUMBER_PREFIX = "26"


def uppercase_customer_name(doc, method=None) -> None:
    """Customer Name is always uppercase by convention (every existing
    record - "CHANDRA SUDRAJAT", "BOS AING", "ABISENA", ... - already is),
    but nothing enforced it, so a lowercase-typed name (portal
    registration, or typed by hand) saved as-is. Runs in `validate` so
    Customer's own autoname (name = customer_name) picks up the
    uppercased value too, not just the displayed field.
    """

    if doc.customer_name:
        doc.customer_name = doc.customer_name.upper()


def set_customer_number(doc, method=None) -> None:
    """Auto-generate `customer_number` before insert - the field is
    read-only in the UI (see the Customer-customer_number Custom Field),
    so this is the only place it ever gets set. Mirrors the old Garage
    Customer doctype's own autoname() behaviour (a system-generated ID,
    never hand-typed) now that Garage Customer itself is gone - see
    [[project_garage_customer_consolidated]].

    Every customer_number carried over from the old Garage Customer data
    starts with "26" (e.g. 2611135651, 2673230471, ...) - not a
    coincidence, an agreed format. The first version of this function
    generated a fully random 10-digit number with no fixed prefix, which
    broke that convention (produced numbers like 3105066374) - fixed here
    to always generate "26" + 8 random digits instead.
    """

    if doc.customer_number:
        return

    for _ in range(20):
        candidate = CUSTOMER_NUMBER_PREFIX + str(random.randint(0, 99_999_999)).zfill(8)
        if not frappe.db.exists("Customer", {"customer_number": candidate}):
            doc.customer_number = candidate
            return

    frappe.throw("Could not generate a unique Customer Number, please try saving again.")


def sync_primary_address(doc, method=None) -> None:
    """Mirror the Details tab's own flat address fields (address_line1/2,
    city, state, postal_code, country - filled in by the portal
    registration flow, or by hand in the Details tab) into a real Address
    document, linked as this Customer's customer_primary_address.

    Explicit user request: the Details tab's plain-text fields and the
    Address & Contact tab's "Customer Primary Address" (an actual linked
    Address record - what Sales Order/Sales Invoice/etc. actually use for
    billing/shipping) used to be two disconnected address stores for the
    same customer. Rather than rip out the Details tab fields (and the
    Select-based City/Province UX already built around them) or rewrite
    the portal API to create Address documents directly, this keeps the
    flat fields as the one editing surface and syncs them into the real
    Address record automatically - so Address & Contact always reflects
    whatever's in Details, instead of the two silently drifting apart.
    """

    if not (doc.address_line1 and doc.city):
        return

    existing_name = frappe.db.get_value(
        "Dynamic Link",
        {"link_doctype": "Customer", "link_name": doc.name, "parenttype": "Address"},
        "parent",
    )

    address = frappe.get_doc("Address", existing_name) if existing_name else frappe.new_doc("Address")
    is_new = address.is_new()

    address.address_title = doc.customer_name
    address.address_type = "Billing"
    address.address_line1 = doc.address_line1
    address.address_line2 = doc.address_line2
    address.city = doc.city
    address.state = doc.state
    address.pincode = doc.postal_code
    address.country = doc.country or "Indonesia"
    address.is_primary_address = 1

    if is_new:
        address.append("links", {"link_doctype": "Customer", "link_name": doc.name})
        address.insert(ignore_permissions=True)
    else:
        address.save(ignore_permissions=True)

    if doc.customer_primary_address != address.name:
        frappe.db.set_value("Customer", doc.name, "customer_primary_address", address.name)
