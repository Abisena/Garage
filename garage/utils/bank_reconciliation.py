import frappe
from pypika import Order


def mark_partial_reconcile(doc, method=None):
    """doc_event: Bank Transaction.on_change - core's own set_status()
    (erpnext/accounts/doctype/bank_transaction/bank_transaction.py) only
    ever writes "Unreconciled" (unallocated_amount > 0) or "Reconciled"
    (unallocated_amount <= 0) - there's no middle state for a transaction
    that's had SOME voucher(s) matched against it but not enough to cover
    the full deposit/withdrawal (e.g. matching a 43,560 voucher against a
    55,601 transaction leaves 12,041 unallocated - core still calls that
    plain "Unreconciled", indistinguishable from a transaction nothing has
    been matched against at all).

    Runs after core's own status write: set_status() calls self.db_set(
    "status", ...), and Document.db_set() always fires on_change (see
    frappe/model/document.py) - same mechanism relied on elsewhere in this
    app (garage.utils.bca_bank_statement_import.delete_if_not_success) to
    react to a db_set-only change with no separate doc_event of its own.

    The override below MUST also go through doc.db_set() (not a plain
    frappe.db.set_value()) - core's own before_update_after_submit() runs
    inside the same save() call, well before Document._save()'s later
    validate_update_after_submit() step (see document.py: run_before_save_
    methods() at line 414 precedes validate_update_after_submit() at line
    420). A plain frappe.db.set_value() writes the DB row but leaves this
    doc's own in-memory `status` attribute at whatever core's set_status()
    last wrote ("Unreconciled"/"Reconciled") - validate_update_after_submit
    () then reads a FRESH copy from the database (now "Partial Reconcile",
    from this function) and compares it against that stale in-memory value,
    sees a mismatch, and throws UpdateAfterSubmitError, even though nothing
    outside this function ever tried to make that change. doc.db_set()
    updates the in-memory attribute too, so the two stay in sync - it also
    re-fires on_change, which is exactly why the guard below matters here:
    without it this would recurse forever."""
    if doc.docstatus != 1:
        return
    if doc.status == "Partial Reconcile":
        return

    allocated = doc.get("allocated_amount") or 0
    unallocated = doc.get("unallocated_amount") or 0
    if allocated > 0 and unallocated > 0:
        doc.db_set("status", "Partial Reconcile", update_modified=False)


@frappe.whitelist()
def get_allocated_amounts(names) -> dict[str, float]:
    """allocated_amount for each Bank Transaction name in `names`, keyed by
    name - core's own get_bank_transactions() (bank_reconciliation_tool.py)
    only ever returns unallocated_amount, not allocated_amount, so a
    partially-matched row's own line in the reconciliation table gives no
    hint of how much is already accounted for without opening the record
    directly. Fetched here and annotated onto the row client-side
    (bank_reconciliation_tool.js, annotate_partial_reconciliation()) so
    that's visible without leaving the page. Names with nothing allocated
    yet are left out entirely, rather than returned as 0 - the caller only
    needs to know which rows are worth annotating."""
    if isinstance(names, str):
        names = frappe.parse_json(names)
    if not names:
        return {}

    rows = frappe.get_all(
        "Bank Transaction",
        filters={"name": ["in", names]},
        fields=["name", "allocated_amount"],
    )
    return {r.name: r.allocated_amount for r in rows if r.allocated_amount}


@frappe.whitelist()
def get_latest_opening_entry_date(account: str):
    """Latest "Opening Entry" Journal Entry posting_date affecting `account`
    - used by bank_reconciliation_tool.js to default "From Date" to the day
    right after it. Account Opening Balance (get_account_balance, till_date
    = from_date - 1) only picks up an opening entry dated *before* From
    Date, so a "From Date == opening entry date" default silently leaves
    Opening Balance at 0 even though the opening entry exists."""
    je = frappe.qb.DocType("Journal Entry")
    jea = frappe.qb.DocType("Journal Entry Account")

    row = (
        frappe.qb.from_(jea)
        .join(je)
        .on(jea.parent == je.name)
        .select(je.posting_date)
        .where(
            (jea.account == account)
            & (je.voucher_type == "Opening Entry")
            & (je.is_opening == "Yes")
            & (je.docstatus == 1)
        )
        .orderby(je.posting_date, order=Order.desc)
        .limit(1)
    ).run(as_dict=True)

    return row[0].posting_date if row else None
