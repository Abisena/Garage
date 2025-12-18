"""Ensure core payment modes (Cash and Bank Transfer) exist for reconciliations."""

from __future__ import annotations

import frappe

PAYMENT_MODES = (
    {
        "mode_of_payment": "Cash",
        "type": "Cash",
    },
    {
        "mode_of_payment": "Bank Transfer",
        "type": "Bank",
    },
)


def execute() -> None:
    """Create baseline payment modes so Payment Entry can use them."""

    if not frappe.db.table_exists("Mode of Payment"):
        return

    for mode in PAYMENT_MODES:
        name = mode["mode_of_payment"]
        if frappe.db.exists("Mode of Payment", name):
            continue

        doc = frappe.new_doc("Mode of Payment")
        doc.mode_of_payment = name
        doc.type = mode["type"]
        doc.enabled = 1
        doc.insert(ignore_permissions=True)
