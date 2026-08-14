"""Replace the Purchase Order/Purchase Invoice Item "Tax" column's reuse of
item_tax_template (a Link to Item Tax Template - a different, per-item
concept from the document-level Include/Exclude PPN feature) with a plain
read-only Data field whose value JS actually writes on every sync tick.

Repurposing item_tax_template via a display formatter looked fine at rest,
but a Link field with no real value still shows its own (empty) control
the moment the grid cell is clicked into - even read-only - so the text
flickered blank until the next full grid rebuild. A genuinely populated
plain Data field has no such control-vs-formatter mismatch."""

from __future__ import annotations

import frappe

TARGETS = ["Purchase Order Item", "Purchase Invoice Item"]


def execute() -> None:
    if not frappe.db.table_exists("Purchase Order Item"):
        return

    for dt in TARGETS:
        field_name = f"{dt}-ppn_display"
        if not frappe.db.exists("Custom Field", field_name):
            field = frappe.new_doc("Custom Field")
            field.dt = dt
            field.fieldname = "ppn_display"
            field.label = "Tax"
            field.fieldtype = "Data"
            field.read_only = 1
            field.in_list_view = 1
            field.columns = 1
            field.insert_after = "item_tax_template"
            field.insert(ignore_permissions=True)

        # A Property Setter with this exact (deterministic) name can
        # already exist - e.g. a pre-existing one from Customize Form left
        # item_tax_template's in_list_view at 1 - in which case
        # make_property_setter() below would hit a duplicate-name insert.
        # Correct its value directly instead of trying to (re)create it.
        list_view_name = f"{dt}-item_tax_template-in_list_view"
        current_value = frappe.db.get_value("Property Setter", list_view_name, "value")
        if current_value is not None:
            if current_value != "0":
                frappe.db.set_value("Property Setter", list_view_name, "value", "0")
        else:
            frappe.make_property_setter(
                {"doctype": dt, "fieldname": "item_tax_template", "property": "in_list_view", "value": "0"},
                is_system_generated=False,
            )
