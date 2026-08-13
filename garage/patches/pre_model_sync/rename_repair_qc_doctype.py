"""Rename Repair & QC DocType to Repair QC."""

from __future__ import annotations

import frappe
from frappe.model.rename_doc import rename_doc


def execute() -> None:
    """Rename the Repair & QC DocType to avoid invalid module names."""

    old_doctype = "Repair & QC"
    new_doctype = "Repair QC"

    if not frappe.db.exists("DocType", old_doctype):
        return

    if frappe.db.exists("DocType", new_doctype):
        return

    rename_doc("DocType", old_doctype, new_doctype, force=True, ignore_permissions=True)
