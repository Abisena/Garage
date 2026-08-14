"""Payment Entry cleanup, explicit user request:
- Payment References grid: show Due Date / Supplier Invoice No (bill_no)
  as their own columns - both already get populated on every row mapped
  from a Purchase Invoice (see payment_entry.js's own get_outstanding_
  reference_documents handling), just never surfaced as a visible column.
- Hide the "Taxes and Charges" and "Reversal Information" (imogi_finance's
  own reversal_section) sections - not part of this app's payment flow.
"""

from __future__ import annotations

import frappe

REFERENCE_LIST_VIEW_FIELDS = ["due_date", "bill_no"]

HIDDEN_SECTIONS = ["taxes_and_charges_section", "reversal_section"]


def _make_property_setter(doctype: str, fieldname: str, prop: str, value: str) -> None:
    name = f"{doctype}-{fieldname}-{prop}"
    if frappe.db.exists("Property Setter", name):
        return
    frappe.make_property_setter(
        {"doctype": doctype, "fieldname": fieldname, "property": prop, "value": value},
        is_system_generated=False,
    )


def execute() -> None:
    if not frappe.db.table_exists("Payment Entry"):
        return

    for fieldname in REFERENCE_LIST_VIEW_FIELDS:
        _make_property_setter("Payment Entry Reference", fieldname, "in_list_view", "1")

    meta = frappe.get_meta("Payment Entry")
    for fieldname in HIDDEN_SECTIONS:
        if meta.has_field(fieldname):
            _make_property_setter("Payment Entry", fieldname, "hidden", "1")
