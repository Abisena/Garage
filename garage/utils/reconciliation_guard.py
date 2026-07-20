"""Blocks cancelling a Payment Entry / Journal Entry while it's still
reconciled against a submitted Bank Transaction - erpnext's own bank
reconciliation flow (Bank Transaction Payments, the child table linking a
Bank Transaction to the voucher(s) it was matched against) doesn't stop
this on its own, so cancelling the voucher directly would silently leave
the Bank Transaction pointing at a cancelled document instead of forcing
the user through "Unreconcile Transaction" first (bank_transaction.js -
frm.call("remove_payment_entries")), which is what actually clears that
link and restores the transaction's own unallocated_amount.
"""

import frappe
from frappe import _


def block_cancel_if_reconciled(doc, method=None):
    linked_rows = frappe.get_all(
        "Bank Transaction Payments",
        filters={"payment_document": doc.doctype, "payment_entry": doc.name},
        fields=["parent"],
    )
    if not linked_rows:
        return

    for row in linked_rows:
        if frappe.db.get_value("Bank Transaction", row.parent, "docstatus") == 1:
            frappe.throw(
                _(
                    "{0} {1} is reconciled against Bank Transaction {2}. "
                    "Unreconcile that transaction first (open it and click "
                    "\"Unreconcile Transaction\") before cancelling this document."
                ).format(doc.doctype, doc.name, row.parent)
            )
