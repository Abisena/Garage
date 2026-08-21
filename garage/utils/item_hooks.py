"""DocType hooks for Item."""
from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt, get_link_to_form

REJECTED_STATUS = "Rejected"


def sync_garage_spare_part_price(doc, method=None) -> None:  # pragma: no cover - frappe lifecycle hook
    """Item.standard_rate is this app's own canonical price (garage_service_
    order.js's fetchItemDetails, _build_invoice_items_for_service_order, etc.
    all read pricing from here) - Garage Spare Part only keeps its own
    separate unit_price field because the spare-part-request/approval/stock-
    movement flow and the customer portal (api/portal.py, public/js/
    garage_portal.js) all read pricing off THAT doctype instead, not because
    it's meant to be independently priced. Left unsynced, a Garage Spare Part
    auto-created by a stock movement (see garage_stock_movement.py's own
    _get_or_create_spare_part(), which sets this same field at creation time)
    or created before this hook existed silently shows Rp 0 anywhere it's
    used - reported directly by the user via Garage Service Bundle's own
    Spare Part picker. Runs on every Item save, not just when standard_rate
    changes - cheap (single db.set_value on a plain Data-keyed doctype) and
    avoids missing a change hidden behind an unrelated field update.
    """
    if not frappe.db.exists("Garage Spare Part", doc.name):
        return

    new_price = flt(doc.standard_rate)
    if flt(frappe.db.get_value("Garage Spare Part", doc.name, "unit_price")) == new_price:
        return

    frappe.db.set_value("Garage Spare Part", doc.name, "unit_price", new_price)


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
