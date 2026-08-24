"""Single source of truth for "what does this Item currently cost", used
everywhere in this app that used to read Item.standard_rate directly
(Garage Service Bundle, Garage Service Order, Garage Stock Movement,
Repair QC, Garage Service Type, the customer portal's invoice builder).

Item.standard_rate is not a live, actively-maintained price - ERPNext core
only ever shows that field on a brand new, not-yet-saved Item (see
`depends_on: eval:doc.__islocal` on the "standard_rate" field in
erpnext/stock/doctype/item/item.json) and nothing in ERPNext core or this
app writes to it afterward. Every item bulk-imported or purchased through
the normal flow ends up with Item.standard_rate stuck at 0 forever, even
though its real price lives in Item Price - confirmed directly against
production, where every single active Item has standard_rate = 0 while
still carrying correct Item Price rows (reported by the user: Garage
Service Bundle always showed Rp 0 for items that clearly had stock and a
price). get_item_rate() below reads Item Price first (mirroring the
customer portal's own already-correct _item_price_map()/
_default_selling_price_list() logic in api/portal.py), falling back to
standard_rate only for the rare Item that still only has that field set
(seed/test data).
"""

from __future__ import annotations

import frappe
from frappe.utils import flt


def _default_selling_price_list() -> str | None:
    try:
        price_list = (
            frappe.db.get_single_value("Selling Settings", "selling_price_list")
            or frappe.db.get_default("selling_price_list")
        )
    except Exception:
        return None
    return frappe.utils.cstr(price_list or "").strip() or None


def get_item_rate(item_code: str, price_list: str | None = None) -> float:
    """Resolve the current selling rate for `item_code`.

    Order: Item Price on `price_list` (or the site's default selling price
    list) -> any other selling Item Price for the item -> Item.standard_rate
    -> 0.
    """
    if not item_code:
        return 0.0

    active_price_list = frappe.utils.cstr(price_list or "").strip() or _default_selling_price_list()

    if active_price_list:
        rate = frappe.db.get_value(
            "Item Price",
            {"item_code": item_code, "price_list": active_price_list, "selling": 1},
            "price_list_rate",
        )
        if rate:
            return flt(rate)

    fallback = frappe.get_all(
        "Item Price",
        filters={"item_code": item_code, "selling": 1},
        fields=["price_list_rate"],
        order_by="modified desc",
        limit=1,
    )
    if fallback:
        return flt(fallback[0].price_list_rate)

    return flt(frappe.db.get_value("Item", item_code, "standard_rate") or 0)


@frappe.whitelist()
def get_item_rate_api(item_code: str, price_list: str | None = None) -> float:
    return get_item_rate(item_code, price_list)