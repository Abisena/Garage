"""DocType hooks for Item."""
from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt, get_link_to_form

from garage.utils.pricing import get_item_rate

REJECTED_STATUS = "Rejected"

# Zero-pad width matching this app's existing item codes (SP-001 ...
# SP-999, then plain SP-1000+ once past 3 digits - a real Frappe naming
# series would behave the same way, padding only up to this width and
# never truncating beyond it).
ITEM_SERIES_PAD = 3


def generate_item_code_from_prefix(doc, method=None) -> None:  # pragma: no cover - frappe lifecycle hook
    """Item Code is picked manually today (Stock Settings.item_naming_by
    stays "Item Code", not core's own "Naming Series" mode) - staff asked
    for a new item under a known prefix (SP/JS/CSM/TE) to auto-continue
    from the highest number already used for that prefix instead, so a
    dropdown (Custom Field item_series_prefix, shown only on a new/unsaved
    Item - see its own depends_on) was added for that choice.
    Deliberately NOT implemented via core's own Naming Series machinery
    (tabSeries counters) - that table isn't reachable through this app's
    own deploy/data tools, and worse, seeding it wrong would silently
    diverge from the real max in this data (many gaps from past deletes -
    confirmed live: SP's own count doesn't match its highest number by a
    wide margin) and start colliding with existing codes immediately.
    Reading MAX(...) straight from the real Item rows on every use instead
    is self-healing regardless of how many gaps exist or ever appear.
    Only fires when item_code is still blank - an item_series_prefix
    selected alongside a manually-typed item_code leaves that manual value
    alone.
    """

    prefix = (doc.get("item_series_prefix") or "").strip()
    if not prefix or doc.item_code:
        return

    doc.item_code = _next_prefixed_item_code(prefix)


def _next_prefixed_item_code(prefix: str) -> str:
    offset = len(prefix) + 1  # SQL SUBSTRING() is 1-indexed
    row = frappe.db.sql(
        """
        select max(cast(substring(item_code, %s) as unsigned)) as max_num
        from `tabItem`
        where item_code like %s
        """,
        (offset, f"{prefix}%"),
    )
    max_num = row[0][0] if row and row[0] and row[0][0] is not None else 0
    return f"{prefix}{int(max_num) + 1:0{ITEM_SERIES_PAD}d}"


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


def validate_unique_item_identifiers(doc, method=None) -> None:  # pragma: no cover - frappe lifecycle hook
    """Item Code changing on an existing Item is invisible to the form body
    (core hides the autoname="field:item_code" field once !doc.__islocal -
    frappe/public/js/frappe/form/form.js), so the only normal path to
    change it is the explicit Rename dialog, which already has its own
    core duplicate check/message. This instead guards the paths that
    dialog doesn't cover - a brand new Item saved with a code that
    collides with an existing one, or item_code/item_name written directly
    (API, Data Import, bulk edit) bypassing that dialog entirely - where
    staff previously saw no message at all, just the value silently not
    taking effect.
    Item Name has no such native protection at all (ERPNext allows
    duplicate item_name by design), so this is the first validation it
    gets here.
    has_value_changed() gates both checks so this only fires on an actual
    attempt to change INTO a collision, never on an unrelated save of an
    Item that happens to already share a name with another one from
    before this validation existed - has_value_changed() returns True with
    no prior guard reason on a brand new document (no "before" doc to
    compare against yet), which is exactly the coverage wanted there too.
    """

    if doc.item_code and doc.has_value_changed("item_code"):
        clash = frappe.db.get_value(
            "Item", {"item_code": doc.item_code, "name": ["!=", doc.name]}, "name"
        )
        if clash:
            frappe.throw(
                _("Item Code {0} sudah dipakai oleh item lain ({1}). Item Code harus unik, pilih kode yang berbeda.").format(
                    frappe.bold(doc.item_code), frappe.bold(clash)
                ),
                title=_("Item Code Duplikat"),
            )

    if doc.item_name and doc.has_value_changed("item_name"):
        clash = frappe.db.get_value(
            "Item", {"item_name": doc.item_name, "name": ["!=", doc.name]}, "name"
        )
        if clash:
            frappe.throw(
                _('Item Name "{0}" sudah dipakai oleh item lain ({1}). Pilih nama yang berbeda.').format(
                    frappe.bold(doc.item_name), frappe.bold(clash)
                ),
                title=_("Item Name Duplikat"),
            )


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
