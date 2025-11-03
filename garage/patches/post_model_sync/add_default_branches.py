"""Seed default branches for multi-branch document numbering."""

from __future__ import annotations

import frappe

BRANCHES = [
    {
        "branch_name": "Jakarta",
        "branch_code": "JKT-001",
    },
    {
        "branch_name": "Bandung",
        "branch_code": "BDG-001",
    },
    {
        "branch_name": "Surabaya",
        "branch_code": "SBY-001",
    },
]


def execute() -> None:
    """Insert canonical branches if they do not exist yet."""

    if not frappe.db.table_exists("Garage Branch"):
        # DocType has not been installed yet; nothing to seed.
        return

    for branch in BRANCHES:
        code = branch["branch_code"].strip().upper()
        name = branch["branch_name"].strip()

        # Avoid duplicates by checking both code (DocType name) and branch name.
        if frappe.db.exists("Garage Branch", code):
            continue
        if frappe.db.exists("Garage Branch", {"branch_name": name}):
            continue

        doc = frappe.new_doc("Garage Branch")
        doc.branch_name = name
        doc.branch_code = code
        doc.insert(ignore_permissions=True)
