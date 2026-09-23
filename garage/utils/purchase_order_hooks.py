"""Document event hooks for ERPNext Purchase Order."""

from __future__ import annotations

from typing import Optional

import frappe


# Item Groups whose purchases are physically received into stock (see the
# flat, single-level Item Group tree under "All Item Groups") - every other
# group (Services, Consumable, Sub Assemblies, Raw Material, Asset, ...)
# never goes through a Purchase Receipt here, straight to Purchase Invoice
# instead.
RECEIVABLE_ITEM_GROUPS = frozenset({"Products", "Material", "Tools"})


def flag_non_receivable_items_as_drop_ship(doc, method=None) -> None:
    """Marks each row whose Item Group falls outside RECEIVABLE_ITEM_GROUPS
    as delivered_by_supplier - a native Purchase Order Item field ERPNext's
    own core already uses everywhere this needs to affect: the "Purchase
    Receipt" Create-button only shows when at least one row still has it
    unset (buying/doctype/purchase_order/purchase_order.js refresh()'s own
    allow_receipt scan), the make_purchase_receipt() mapper skips flagged
    rows entirely so a mixed PO's generated Purchase Receipt only ever
    carries the real Products/Material/Tools rows (purchase_order.py's own
    make_purchase_receipt() condition), and set_received_qty_for_drop_ship_
    items() (called from core's own validate()) backfills received_qty for
    flagged rows so per_received/status never sits stuck waiting on a GRN
    that will never happen for a service/consumable line.
    Only ever sets the flag ON here - a row already inside
    RECEIVABLE_ITEM_GROUPS is left exactly as-is, in case a real drop-ship-
    to-customer row (this field's original, unrelated native purpose) was
    set there some other way.
    """

    for item in doc.items or []:
        if item.item_group not in RECEIVABLE_ITEM_GROUPS:
            item.delivered_by_supplier = 1


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
