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
    all_names = frappe.get_all(doctype, pluck="name")
    # A case-sensitive Python set, not frappe.db.exists() - MySQL's default
    # collation is case-insensitive, so exists(doctype, "ICAR") returns
    # True for a row literally stored as "Icar" (the very record being
    # renamed, not a genuinely different duplicate). That falsely routed
    # every pure case-fix through merge=True, which then fails inside
    # rename_doc.validate_rename(): its own exists check there (a real
    # `name == new` query) explicitly discards a same-string-different-
    # case match ("for fixing case, accents") before checking merge,
    # so merge=True with no OTHER row sharing that exact uppercase name
    # throws "does not exist, select a new target to merge" - reproduced
    # live (bench migrate) on "Garage Brand ICAR". Checking a case-
    # sensitive Python set instead correctly tells "old_name's own
    # upper-cased form" apart from "a different record already has this
    # exact uppercase name" - only the latter should ever merge.
    existing = set(all_names)

    for old_name in all_names:
        new_name = (old_name or "").strip().upper()
        if not new_name or new_name == old_name:
            continue

        if new_name in existing:
            # A genuinely different record already has this exact
            # (case-sensitive) uppercase name - merge into it rather than
            # leaving the old one dangling.
            rename_doc(doctype, old_name, new_name, merge=True, force=True, ignore_permissions=True)
            existing.discard(old_name)
            continue

        rename_doc(doctype, old_name, new_name, force=True, ignore_permissions=True)
        frappe.db.set_value(doctype, new_name, fieldname, new_name)
        existing.discard(old_name)
        existing.add(new_name)


def execute() -> None:
    _uppercase_all("Garage Brand", "brand_name")
    _uppercase_all("Garage Model", "model_name")
