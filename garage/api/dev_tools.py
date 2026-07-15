"""Internal testing utility.

Wipes transactional test data (orders, invoices, payments, vehicle
handovers/SIKK, stock moves and their GL/stock ledger side effects) while
leaving master data (customers, vehicles, service types, bundles, spare
parts) untouched, so the workshop setup doesn't have to be rebuilt between
test rounds. Also resets every Garage Spare Part's stock_qty to
DEMO_STOCK_QTY so parts are immediately orderable again for the next round
of demo transactions.

Exposed to the desk via a System Manager-only navbar button (see
garage_theme.js); can also be run directly via bench:

    bench --site <site> execute garage.api.dev_tools.reset_test_transactions --kwargs '{"confirm": true}'
"""

from __future__ import annotations

import frappe
from frappe.utils import cint

# Deletion order matters: children/dependents before the documents they
# reference, so link-integrity checks (and the "Cannot delete or cancel
# because X is linked with Y" guard) don't block later steps.
TRANSACTIONAL_DOCTYPES = [
    "Repair QC",
    "Spare Part Request",
    # Vehicle Handover (SIKK) must be cancelled before Payment Entry:
    # Frappe blocks cancelling a document while any *submitted* document
    # still links to it, and Vehicle Handover.payment_entry does exactly
    # that. Cancelling Vehicle Handover first (see the two-phase cancel/
    # delete split below) clears the block before Payment Entry's turn.
    "Vehicle Handover",
    "Payment Entry",
    "Sales Invoice",
    "Garage Stock Movement",
    "Stock Entry",
    "Garage Service Order",
]

# Belt-and-suspenders cleanup for ledger rows that should already be gone
# once their source voucher is cancelled + deleted, in case anything was
# left orphaned by a prior manual/partial cleanup.
LEDGER_DOCTYPES = [
    "GL Entry",
    "Stock Ledger Entry",
    "Garage Stock Ledger Entry",
]

# Garage Spare Part.stock_qty is decremented directly by transactional flows
# (Garage Stock Movement, Spare Part Request) and was never seeded with a
# real starting quantity in this test data - it's only ever drifted between
# 0 and small negative numbers. Rather than "preserve" that, reset it to a
# usable demo baseline every time so parts are immediately orderable again.
DEMO_STOCK_QTY = 50

# The "Item Code" search on Garage Service Order (item_query_with_stock)
# reads Bin.actual_qty, not Garage Spare Part.stock_qty - two separate stock
# trackers that don't sync each other. Deleting all Stock Entry docs above
# zeroes this one out too, so it needs its own opening balance restored via
# a real Stock Entry (not a direct Bin write - that would desync Bin from
# its own Stock Ledger Entries).
DEMO_WAREHOUSE = "Stores - I"


@frappe.whitelist()
def reset_test_transactions(confirm: bool = False) -> dict[str, object]:
    if not cint(confirm):
        frappe.throw(
            "Pass confirm=True to actually run this - it deletes transactional "
            "data. Master data (customers, vehicles, service types, bundles, "
            "spare parts) is left alone."
        )

    if frappe.session.user != "Administrator" and "System Manager" not in frappe.get_roles():
        frappe.throw("Only Administrator / System Manager can run this.")

    names_by_doctype: dict[str, list[str]] = {
        doctype: frappe.get_all(doctype, pluck="name") for doctype in TRANSACTIONAL_DOCTYPES
    }

    # Two phases, not cancel-then-delete-per-doctype: several of these
    # doctypes reference each other (Vehicle Handover <-> Payment Entry),
    # and Frappe blocks cancelling a document while any *submitted*
    # document still links to it. Cancelling everything first means that by
    # the time any single doctype's cancel runs, every doc that might
    # reference it is already cancelled (docstatus 2), not submitted (1) -
    # so those cross-doctype back-link checks never trigger. Same logic
    # applies to our own Vehicle Handover.on_trash() guard, which blocks
    # deletion while its Payment Entry is still docstatus 1.
    for doctype, names in names_by_doctype.items():
        for name in names:
            doc = frappe.get_doc(doctype, name)
            if doc.meta.is_submittable and doc.docstatus == 1:
                doc.cancel()

    summary: dict[str, object] = {}
    for doctype, names in names_by_doctype.items():
        for name in names:
            frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)
        summary[doctype] = len(names)

    for doctype in LEDGER_DOCTYPES:
        remaining = frappe.get_all(doctype, pluck="name")
        if remaining:
            frappe.db.delete(doctype, {"name": ["in", remaining]})
        summary[doctype] = len(remaining)

    part_codes = frappe.get_all("Garage Spare Part", pluck="name")
    for part_code in part_codes:
        frappe.db.set_value(
            "Garage Spare Part", part_code, "stock_qty", DEMO_STOCK_QTY, update_modified=False
        )
    summary["Garage Spare Part (stock reset to %s)" % DEMO_STOCK_QTY] = len(part_codes)

    item_codes = [
        code for code in part_codes
        if frappe.db.get_value("Item", code, "is_stock_item")
    ] if frappe.db.exists("Warehouse", DEMO_WAREHOUSE) else []
    if item_codes:
        company = frappe.db.get_single_value("Global Defaults", "default_company") or (
            frappe.get_all("Company", limit=1, pluck="name") or [None]
        )[0]
        se = frappe.new_doc("Stock Entry")
        se.stock_entry_type = "Material Receipt"
        se.company = company
        se.to_warehouse = DEMO_WAREHOUSE
        for item_code in item_codes:
            se.append("items", {
                "item_code": item_code,
                "qty": DEMO_STOCK_QTY,
                "t_warehouse": DEMO_WAREHOUSE,
                "basic_rate": frappe.db.get_value("Garage Spare Part", item_code, "unit_price") or 0,
            })
        se.insert(ignore_permissions=True)
        se.submit()
        summary["Bin (opening stock via %s)" % se.name] = len(item_codes)

    frappe.db.commit()
    return summary
