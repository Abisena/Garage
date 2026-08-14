"""Recreate the Sales Invoice Custom Field + Property Setters that hooks.py's
fixture filter already references by name (ppn_percent column, compact
"Details" tab hiding unused core sections) but were never actually exported
into custom_field.json/property_setter.json - so a fresh site never got
them created in the first place. Best-effort reconstruction from the field
names alone (no access to the original site these were authored on); column
*order* in the Items grid is intentionally left alone (see module docstring
in sales_invoice.js) since that risks scrambling the form for a cosmetic
gain we can't verify without the original site.
"""

from __future__ import annotations

import frappe

# Sections/fields hidden on Sales Invoice to keep the "Details" tab compact -
# mirrors the same "hidden" treatment already applied (and confirmed working)
# on Sales Order/Purchase Order/Purchase Receipt/Purchase Invoice in this app.
HIDDEN_FIELDS = [
    "company",
    "accounting_dimensions_section",
    "currency_and_price_list",
    "customer_name",
    "company_tax_id",
    "total_qty",
    "total_net_weight",
    "section_break_30",
    "base_total",
    "base_net_total",
    "total",
    "net_total",
    "shipping_rule",
    "incoterm",
    "named_place",
    "section_break_40",
    "section_break_43",
    "section_break_49",
    "apply_discount_on",
    "base_discount_amount",
    "is_cash_or_non_trade_discount",
    "additional_discount_percentage",
    "discount_amount",
    "other_charges_calculation",
    "update_stock",
    "is_pos",
    "pos_profile",
    "is_consolidated",
    "is_return",
    "return_against",
    "update_outstanding_for_self",
    "update_billed_amount_in_sales_order",
    "update_billed_amount_in_delivery_note",
    "is_debit_note",
]

READ_ONLY_FIELDS = ["customer_name", "tax_id", "company_tax_id"]

# Sales Invoice Item grid: show Diskon (%) and PPN (%) as their own columns.
ITEM_GRID_PROPERTIES = [
    ("discount_percentage", "label", "Diskon (%)"),
    ("discount_percentage", "in_list_view", "1"),
    ("discount_percentage", "columns", "1"),
    ("description", "in_list_view", "1"),
    ("description", "columns", "2"),
    ("uom", "in_list_view", "1"),
    ("uom", "columns", "1"),
    ("item_code", "columns", "2"),
    ("qty", "columns", "1"),
    ("rate", "columns", "2"),
    ("amount", "columns", "2"),
]


def _make_property_setter(doctype: str, fieldname: str, prop: str, value: str) -> None:
    name = f"{doctype}-{fieldname}-{prop}"
    if frappe.db.exists("Property Setter", name):
        return
    frappe.make_property_setter(
        {"doctype": doctype, "fieldname": fieldname, "property": prop, "value": value},
        is_system_generated=False,
    )


def execute() -> None:
    if not frappe.db.table_exists("Sales Invoice"):
        return

    if not frappe.db.exists("Custom Field", "Sales Invoice Item-ppn_percent"):
        field = frappe.new_doc("Custom Field")
        field.dt = "Sales Invoice Item"
        field.fieldname = "ppn_percent"
        field.label = "PPN (%)"
        field.fieldtype = "Percent"
        field.insert_after = "discount_percentage"
        field.in_list_view = 1
        field.columns = 1
        field.insert(ignore_permissions=True)

    for fieldname in HIDDEN_FIELDS:
        _make_property_setter("Sales Invoice", fieldname, "hidden", "1")

    for fieldname in READ_ONLY_FIELDS:
        _make_property_setter("Sales Invoice", fieldname, "read_only", "1")

    for fieldname, prop, value in ITEM_GRID_PROPERTIES:
        _make_property_setter("Sales Invoice Item", fieldname, prop, value)
