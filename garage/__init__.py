from __future__ import annotations

try:
    import frappe
except ModuleNotFoundError:
    frappe = None  # type: ignore[assignment]

__version__ = "0.1.0"


def _patch_errprint() -> None:
    """Wrap ``frappe.errprint`` to ignore BrokenPipeError when available.

    When the HTTP client disconnects while Frappe is logging an error,
    the underlying ``print`` call inside ``frappe.errprint`` may raise
    ``BrokenPipeError``. This wrapper preserves the original behaviour
    while suppressing that specific exception so the application can
    finish handling the request gracefully.
    """

    if frappe is None:
        return

    if getattr(frappe, "_garage_errprint_patched", False):
        return

    original_errprint = getattr(frappe, "errprint", None)

    def safe_errprint(*args, **kwargs):  # type: ignore[override]
        if original_errprint is None:
            return None

        try:
            return original_errprint(*args, **kwargs)
        except BrokenPipeError:
            frappe.logger().warning(
                "Ignored BrokenPipeError while writing error output; client disconnected.",
            )
            return None

    frappe.errprint = safe_errprint
    frappe._garage_errprint_patched = True


def _patch_purchase_order_status_map() -> None:
    """Add a "Partially Received" status to Purchase Order.

    Core's own status_map (erpnext/controllers/status_updater.py) only
    checks ``per_received < 100`` for "To Receive and Bill"/"To Receive" -
    0% and 50% received both show the same status, so staff can't tell
    a PO was never touched apart from one that's half-received just by
    its status. Delivery Note has an equivalent granular status already
    ("Partially Billed", per_billed between 0 and 100) - Purchase Order
    has no such distinction, so this adds one the same way.

    status_map is a plain module-level dict re-evaluated by every
    set_status() call (both Purchase Order's own validate() AND, when a
    Purchase Receipt is submitted/cancelled, status_updater.py's own
    _update_percent_field() re-fetching the PO and calling
    target.set_status(update=True) directly) - there's no fixture/
    Property Setter/config path for adding a status_map condition, so
    this has to be a one-time in-memory patch, applied as soon as this
    app's package is imported (same idempotent-guard pattern as
    _patch_errprint above).

    Insert position matters: status_map is scanned in *reverse*, first
    match wins. Placed right after "Completed" (before "Delivered"),
    this new entry is checked before "To Receive and Bill"/"To Bill"/
    "To Receive"/"Completed" (so it wins whenever 0 < per_received < 100)
    but still loses to the override statuses that come after it in the
    list (Delivered/Cancelled/On Hold/Closed), same as those already do
    for every other status in this map.
    """

    if frappe is None:
        return

    if getattr(frappe, "_garage_po_status_patched", False):
        return

    try:
        from erpnext.controllers.status_updater import status_map
    except ImportError:
        return

    po_map = status_map.get("Purchase Order")
    if not po_map or any(entry[0] == "Partially Received" for entry in po_map):
        frappe._garage_po_status_patched = True
        return

    entry = [
        "Partially Received",
        "eval:self.per_received > 0 and self.per_received < 100 and self.docstatus == 1",
    ]
    idx = next((i for i, s in enumerate(po_map) if s[0] == "Completed"), len(po_map) - 1)
    po_map.insert(idx + 1, entry)

    frappe._garage_po_status_patched = True


_patch_errprint()
_patch_purchase_order_status_map()
