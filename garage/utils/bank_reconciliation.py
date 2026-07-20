import frappe
from pypika import Order


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
