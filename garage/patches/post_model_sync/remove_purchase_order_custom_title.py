"""Explicit user request: remove the "Title (Custom)" field added to
Purchase Order's Additional Info section, now superseded by the new
"Notes" field there - and restore "Is Internal Supplier" (hidden only to
make room for Title) back to its native visibility, since nothing takes
its place anymore.

Fixture sync is add/update-only - deleting these two entries from
custom_field.json / property_setter.json does NOT delete the matching
Custom Field / Property Setter rows an earlier migrate already created,
on this site or any other that already pulled that change. Deleted here
explicitly instead, same pattern as every other post_model_sync patch in
this app.
"""

from __future__ import annotations

import frappe


def execute() -> None:
    if frappe.db.exists("Custom Field", "Purchase Order-custom_title"):
        frappe.delete_doc("Custom Field", "Purchase Order-custom_title", ignore_permissions=True)

    if frappe.db.exists("Property Setter", "Purchase Order-is_internal_supplier-hidden"):
        frappe.delete_doc(
            "Property Setter", "Purchase Order-is_internal_supplier-hidden", ignore_permissions=True
        )
