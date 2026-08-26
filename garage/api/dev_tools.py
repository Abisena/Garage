"""Internal testing utility.

Wipes transactional test data (orders, invoices, payments, vehicle
handovers/SIKK, stock moves and their GL/stock ledger side effects,
employee attendance/checkins) while leaving master data (customers,
vehicles, service types, bundles, spare parts) untouched, so the workshop
setup doesn't have to be rebuilt between test rounds. Also resets every
Garage Spare Part's stock_qty to 0 - no opening-stock Stock Entry is
created afterwards (a previous version did this "for convenience", but
that Stock Entry is itself a transaction: it left a non-zero Trial
Balance/Stock Ledger right after a "wipe everything" reset, which defeats
the point). Testers create their own opening stock via a real Purchase
Receipt/Stock Entry, same as any other test data.

Resilient by design: every cancel/delete is attempted per-document, and a
document that can't be cancelled or deleted the normal way (a validation
hook, a stock/GL edge case, whatever) is force-removed at the row level
instead of aborting the whole run - see _hard_delete() and the try/except
loops in reset_test_transactions(). One awkward leftover document should
never again mean "reset button did nothing."

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
    # Payment Entry can reference either a Sales Invoice or a Purchase
    # Invoice (references child table, either party type) - it has to
    # come before BOTH, not just Sales Invoice.
    "Payment Entry",
    # Missing from this list entirely used to be an actual bug, same class
    # as the Delivery Note one below: Bank Reconciliation Tool creates
    # Journal Entry (voucher_type "Bank Entry") directly, and every single
    # one stayed submitted, un-cancelled, through past resets while
    # LEDGER_DOCTYPES below force-deleted its GL Entry rows out from under
    # it via raw SQL - leaving a "submitted" Journal Entry with zero actual
    # ledger effect, which then broke bank reconciliation with "Journal
    # Entry X is not affecting bank account Y" (get_clearance_details,
    # erpnext/accounts/doctype/bank_transaction/bank_transaction.py -
    # gl_bank_account not found in that JE's own now-empty GL Entry set),
    # reported directly by the user. _cancel_reconciled_bank_transactions()
    # above already unlinks any Bank Transaction from its Journal Entry
    # (remove_payment_entries() is generic across payment_document types,
    # not Payment-Entry-specific) before this doctype's own turn, so
    # nothing more is needed to cancel/delete it safely here.
    "Journal Entry",
    # Purchase-side chain: Purchase Invoice can reference both Purchase
    # Order and Purchase Receipt directly (items.purchase_order/
    # purchase_receipt), and Purchase Receipt references Purchase Order
    # (items.purchase_order) - so the deletion order has to be Invoice,
    # then Receipt, then Order, same "dependents before what they
    # reference" rule as the rest of this list.
    "Purchase Invoice",
    "Purchase Receipt",
    "Purchase Order",
    # Sales Invoice Item can reference Delivery Note directly (dn_detail),
    # so Sales Invoice (the dependent) has to be cancelled/deleted before
    # Delivery Note itself - same rule as the Purchase-side chain above.
    # Missing from this list entirely used to be the actual bug: Delivery
    # Note stayed submitted, un-cancelled, while LEDGER_DOCTYPES below
    # force-deleted its Stock Ledger Entries out from under it via raw
    # SQL (bypassing the proper cancel flow that would have reversed
    # their effect on Bin.actual_qty first) - leaving stock in an
    # inconsistent state that then broke the closing "Material Receipt"
    # Stock Entry's own negative-stock validation on the next reset,
    # exactly the "units of Item X needed ... for Delivery Note Y"
    # error reported directly by the user.
    "Sales Invoice",
    "Delivery Note",
    # Both Sales Invoice Item (sales_order) and Delivery Note Item
    # (against_sales_order) can reference Sales Order directly - same
    # "dependents before what they reference" rule, so Sales Order comes
    # last in this chain. Explicit user request: the reset previously
    # left every Sales Order (and any Payment Entry created against a
    # Sales-Order-originated Sales Invoice - already covered above, since
    # Payment Entry doesn't care what kind of Sales Invoice it's linked
    # to) behind after a reset, instead of clearing that whole flow the
    # same way the Garage Service Order flow already was.
    "Sales Order",
    "Garage Stock Movement",
    "Stock Entry",
    "Garage Service Order",
    # Employee Checkin (payroll_indonesia's /checkin page) before Attendance:
    # Employee Checkin.attendance links TO Attendance, so it has to go first
    # to avoid "Cannot delete because Attendance is linked" - same
    # dependents-before-what-they-reference rule as the rest of this list.
    # Matters now more than before a reset used to: payroll_indonesia's
    # boot_session checkin gate blocks Desk access for any Employee with
    # "Wajib Absen Sebelum Masuk" checked until they check in *that day* -
    # leaving today's checkins behind after a reset would keep those
    # testers un-gated (looks "passed" already) for the next test round.
    "Employee Checkin",
    "Attendance",
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
# 0 and small negative numbers. Reset it to 0 (not a "demo baseline") so it
# actually matches Bin.actual_qty, which is genuinely 0 once every Stock
# Entry/Delivery Note/etc. above is gone - see the module docstring for why
# this no longer auto-creates an opening-stock Stock Entry to paper over
# that.
RESET_STOCK_QTY = 0


def _hard_delete(doctype: str, name: str) -> None:
    """Last-resort removal for a document that survived both cancel() and
    delete_doc(): bypass every controller hook (on_trash guards, link
    checks, docstatus checks - whatever it was that kept throwing) and rip
    the row out directly, taking its child-table rows with it. Only reached
    once the normal cancel/delete path has already been tried and failed -
    see the fallback sweep in reset_test_transactions(). This is what makes
    "hapus semua data transaksi" an actual guarantee instead of a best
    effort: a single stubborn document (an edge case like the historical
    Delivery Note bug documented above) no longer gets to leave test data
    behind."""
    meta = frappe.get_meta(doctype)
    for df in meta.get_table_fields():
        frappe.db.delete(df.options, {"parenttype": doctype, "parent": name})
    frappe.db.delete(doctype, {"name": name})


def _cancel_reconciled_bank_transactions() -> int:
    """Unreconcile (clear payment_entries, same as the "Unreconcile
    Transaction" button - bank_transaction.js) then cancel every submitted
    Bank Transaction, before TRANSACTIONAL_DOCTYPES gets cancelled below.
    garage.utils.reconciliation_guard.block_cancel_if_reconciled blocks
    cancelling a Payment Entry/Journal Entry still linked to a submitted
    Bank Transaction - without this step first, that guard would block
    this reset itself on any Payment Entry created through the bank
    reconciliation demo flow."""
    names = frappe.get_all("Bank Transaction", filters={"docstatus": 1}, pluck="name")
    for name in names:
        doc = frappe.get_doc("Bank Transaction", name)
        if doc.payment_entries:
            doc.remove_payment_entries()
            doc.reload()
        doc.cancel()
    return len(names)


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

    bank_transactions_cancelled = _cancel_reconciled_bank_transactions()
    frappe.db.commit()

    names_by_doctype: dict[str, list[str]] = {
        doctype: frappe.get_all(doctype, pluck="name") for doctype in TRANSACTIONAL_DOCTYPES
    }

    # Every cancel/delete below runs in its own try/except and keeps going
    # on failure, instead of letting one bad document raise and unwind the
    # whole request. That used to mean one edge case (a validation hook, a
    # stock/GL quirk on one specific document) discarded the *entire* reset
    # on rollback - "hapus semua data transaksi" silently becoming "hapus
    # nothing" the moment any single document misbehaved. Docs that fail
    # both cancel() and delete_doc() are swept up by _hard_delete() below,
    # so the button's promise holds even for cases like the historical
    # Delivery Note bug documented in TRANSACTIONAL_DOCTYPES above.
    errors: dict[str, list[str]] = {}

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
            try:
                doc = frappe.get_doc(doctype, name)
                if doc.meta.is_submittable and doc.docstatus == 1:
                    doc.flags.ignore_permissions = True
                    doc.cancel()
            except Exception as e:
                errors.setdefault(doctype, []).append(f"{name} (cancel): {e}")
    frappe.db.commit()

    summary: dict[str, object] = {
        "Bank Transaction (unreconciled + cancelled)": bank_transactions_cancelled,
    }
    for doctype, names in names_by_doctype.items():
        deleted = 0
        for name in names:
            try:
                frappe.delete_doc(
                    doctype,
                    name,
                    ignore_permissions=True,
                    force=True,
                    ignore_on_trash=True,
                    ignore_missing=True,
                )
                deleted += 1
            except Exception as e:
                errors.setdefault(doctype, []).append(f"{name} (delete): {e}")
        summary[doctype] = deleted
    frappe.db.commit()

    # Fallback sweep: anything still sitting in the table after both phases
    # above (cancel failed, or delete_doc still refused it) gets removed
    # directly, no exceptions to catch because there's no controller logic
    # left to throw one.
    force_removed = 0
    for doctype in TRANSACTIONAL_DOCTYPES:
        remaining = frappe.get_all(doctype, pluck="name")
        for name in remaining:
            _hard_delete(doctype, name)
        if remaining:
            summary[doctype] = summary.get(doctype, 0) + len(remaining)
            force_removed += len(remaining)
    if force_removed:
        summary["Force-removed (cancel/delete failed, see _errors)"] = force_removed
    frappe.db.commit()

    for doctype in LEDGER_DOCTYPES:
        remaining = frappe.get_all(doctype, pluck="name")
        if remaining:
            frappe.db.delete(doctype, {"name": ["in", remaining]})
        summary[doctype] = len(remaining)

    # Bin is a derived cache (per item+warehouse actual/reserved/ordered
    # qty), not a ledger record itself - raw-deleting Stock Ledger Entry
    # above doesn't update it, so it can be left holding stale quantities
    # from before the wipe. ERPNext recreates a Bin row lazily whenever one
    # is next needed (get_bin), so wiping the table outright is safe and is
    # what makes Stock Balance / the Garage Service Order item picker
    # (which reads Bin.actual_qty, not Stock Ledger Entry) match the
    # now-empty ledger instead of showing leftover numbers.
    bin_count = frappe.db.count("Bin")
    if bin_count:
        frappe.db.delete("Bin")
    summary["Bin (cache cleared)"] = bin_count
    frappe.db.commit()

    part_codes = frappe.get_all("Garage Spare Part", pluck="name")
    for part_code in part_codes:
        frappe.db.set_value(
            "Garage Spare Part", part_code, "stock_qty", RESET_STOCK_QTY, update_modified=False
        )
    summary["Garage Spare Part (stock reset to %s)" % RESET_STOCK_QTY] = len(part_codes)
    frappe.db.commit()

    if errors:
        summary["_errors (auto-recovered, kept going - see Force-removed above)"] = errors

    return summary
