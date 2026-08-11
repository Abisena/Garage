"""Document event hooks for ERPNext Sales Order."""

from __future__ import annotations

import frappe


def set_petugas_part(doc, method=None) -> None:
    """Stamp the submitting user's name onto the document at submit time,
    for Sales Order Print's own "Petugas Part" line - captured once, at
    submit, rather than read live off the session whenever the document is
    later printed, so the printed name always reflects who actually
    processed the order instead of whoever happens to view/print it later.
    """

    if doc.petugas_part:
        return
    doc.petugas_part = frappe.utils.get_fullname(frappe.session.user)
