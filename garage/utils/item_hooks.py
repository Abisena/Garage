"""DocType hooks for Item."""
from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt, get_link_to_form

from garage.utils.pricing import get_item_rate

REJECTED_STATUS = "Rejected"


def _sync_spare_part_price(item_code: str) -> None:
    # This now also runs off the Item Price doc_event (see hooks.py), which
    # fires inside the SAME transaction as things like a Purchase Order/
    # Purchase Receipt's "Update Rate as per Last Purchase Rate" - any
    # unhandled error here would otherwise fail that unrelated save too, so
    # this stays best-effort: log and move on instead of propagating.
    try:
        if not item_code or not frappe.db.exists("Garage Spare Part", item_code):
            return

        new_price = flt(get_item_rate(item_code))
        if flt(frappe.db.get_value("Garage Spare Part", item_code, "unit_price")) == new_price:
            return

        frappe.db.set_value("Garage Spare Part", item_code, "unit_price", new_price)
    except Exception:
        frappe.log_error(
            title="sync_garage_spare_part_price failed",
            message=frappe.get_traceback(),
        )


def sync_garage_spare_part_price(doc, method=None) -> None:  # pragma: no cover - frappe lifecycle hook
    """garage.utils.pricing.get_item_rate (Item Price, not Item.standard_
    rate - see that module's docstring for why) is this app's own canonical
    price (garage_service_order.js's fetchItemDetails, _build_invoice_
    items_for_service_order, etc. all read pricing from there) - Garage
    Spare Part only keeps its own separate unit_price field because the
    spare-part-request/approval/stock-movement flow and the customer portal
    (api/portal.py, public/js/garage_portal.js) all read pricing off THAT
    doctype instead, not because it's meant to be independently priced.
    Left unsynced, a Garage Spare Part auto-created by a stock movement
    (see garage_stock_movement.py's own _get_or_create_spare_part(), which
    sets this same field at creation time) or created before this hook
    existed silently shows Rp 0 anywhere it's used - reported directly by
    the user via Garage Service Bundle's own Spare Part picker. Runs on
    every Item save, not just when the resolved rate changes - cheap
    (single db.set_value on a plain Data-keyed doctype) and avoids missing
    a change hidden behind an unrelated field update. See
    sync_garage_spare_part_price_from_item_price below for the other half:
    the price commonly changes on Item Price directly, without the Item
    itself ever being saved.
    """
    _sync_spare_part_price(doc.name)


def sync_garage_spare_part_price_from_item_price(doc, method=None) -> None:  # pragma: no cover - frappe lifecycle hook
    """Item Price counterpart of sync_garage_spare_part_price above - a
    price change normally happens here (Purchase/Sales Order "update rate",
    the Item Price list itself, Data Import), not on the Item document,
    which get_item_rate() now treats as the real source of truth. Without
    this, Garage Spare Part.unit_price would only ever catch up the next
    time someone happens to also re-save the Item itself.
    """
    _sync_spare_part_price(doc.item_code)


def block_delete_if_spare_part_requested(doc, method=None) -> None:  # pragma: no cover - frappe lifecycle hook
    """Prevent deleting an Item that is still referenced by an active Spare Part Request."""
    requests = frappe.db.sql(
        """
        select spri.parent
        from `tabSpare Part Request Item` spri
        inner join `tabSpare Part Request` spr on spr.name = spri.parent
        where spri.item_code = %s and spr.status != %s
        """,
        (doc.name, REJECTED_STATUS),
        as_dict=True,
    )
    if not requests:
        return

    request_links = ", ".join(
        get_link_to_form("Spare Part Request", row.parent) for row in requests
    )
    frappe.throw(
        _("Cannot delete Item {0} because it is linked with Spare Part Request {1}").format(
            frappe.bold(doc.name), request_links
        ),
        title=_("Not Allowed"),
    )
