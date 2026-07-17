"""Document event hooks for ERPNext Purchase Order."""

from __future__ import annotations

from typing import Optional

import frappe


def set_default_warehouse(doc, method=None) -> None:
    """Auto-fill the target warehouse from the creating user's branch, so
    staff don't have to pick a warehouse by hand on every Purchase Order.
    Only fills gaps - an already-set header or row warehouse is left alone.
    """

    warehouse = _get_branch_default_warehouse(frappe.session.user)
    if not warehouse:
        return

    if not doc.set_warehouse:
        doc.set_warehouse = warehouse

    for item in doc.items or []:
        if not item.warehouse:
            item.warehouse = warehouse


def _get_branch_default_warehouse(user: str) -> Optional[str]:
    branch = _get_default_branch(user)
    if not branch:
        return None
    return frappe.db.get_value("Garage Branch", branch, "default_warehouse")


def _get_default_branch(user: str) -> Optional[str]:
    branch = frappe.db.get_value(
        "Garage Branch Access", {"user": user, "is_default": 1}, "branch"
    )
    if branch:
        return branch

    return frappe.db.get_value(
        "Garage Branch Access", {"user": user}, "branch", order_by="creation asc"
    )
