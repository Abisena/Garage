"""One-time cleanup: uppercase existing Garage Brand / Garage Model names.

New records already come out uppercase (GarageBrand.autoname /
GarageModel.autoname), but records seeded before that enforcement existed -
most of Garage Brand's data - are still mixed/title case. Brand is renamed
before Model so every Link to Garage Brand (Garage Model.brand, Garage
Vehicle.brand, etc.) gets cascaded by rename_doc instead of left dangling.
"""

from __future__ import annotations

import frappe
from frappe.model.rename_doc import rename_doc


def _uppercase_all(doctype: str, fieldname: str) -> None:
    for old_name in frappe.get_all(doctype, pluck="name"):
        new_name = (old_name or "").strip().upper()
        if not new_name or new_name == old_name:
            continue

        if frappe.db.exists(doctype, new_name):
            # Only differed by case from another existing record - merge
            # into it rather than leaving the old one dangling.
            rename_doc(doctype, old_name, new_name, merge=True, force=True, ignore_permissions=True)
            continue

        rename_doc(doctype, old_name, new_name, force=True, ignore_permissions=True)
        frappe.db.set_value(doctype, new_name, fieldname, new_name)


def execute() -> None:
    _uppercase_all("Garage Brand", "brand_name")
    _uppercase_all("Garage Model", "model_name")
