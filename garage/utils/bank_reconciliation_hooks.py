"""Overrides erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.
create_journal_entry_bts - explicit user request.

Core's own version always uses the Bank Transaction's FULL original
deposit/withdrawal for the new Journal Entry, no matter how much of that
transaction is already allocated to other vouchers or what the selected
Receivable/Payable party actually owes. The "Allocated Amount"/
"Unallocated Amount" fields shown in the "Reconcile the Bank Transaction"
dialog are purely informational reads of the transaction's own stored
state (bank_transaction.py's update_allocated_amount()) - they were never
actually used to size the voucher being created, so "Create Voucher" on a
transaction that lumps together several settlements (e.g. one bank
transfer covering reimbursements for multiple people/suppliers at once)
would credit/debit the selected party for the WHOLE transaction amount -
badly overstating that one party's balance - even after part of the
transaction had already been correctly reconciled elsewhere.

Reported case: a Rp 8,478,736 withdrawal already had Rp 7,300,000
reconciled against two earlier Payment Entries (so only Rp 1,178,736
remained unallocated). Picking Supplier "Harapan Berkat Motor (Tokopedia)"
- whose real outstanding balance in that Payable account was only
Rp 508,736 - would still have created a Journal Entry for the full
Rp 8,478,736 on Submit (or pre-filled "Edit in Full Page" with that same
wrong figure), overstating that supplier's payable by roughly Rp 7.97M.

This supersedes imogi_finance's own, near-identical override of the same
method (imogi_finance/overrides/bank_reconciliation_tool.py, now removed)
- that version carried useful defensive guards (a friendlier error when
a Bank Account has no linked GL account, None-safe exchange rate
fallbacks) but never capped the voucher amount either. Both sets of
fixes are combined here rather than leaving two competing overrides of
the same core method registered at once (garage loads after imogi_
finance in apps.txt, so garage's silently wins either way - exactly the
"one override hides the other" trap already hit on this project's
Client Scripts and Custom DocPerm rows).
"""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import flt

from erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool import (
    get_default_cost_center,
    reconcile_vouchers,
)
from erpnext.accounts.utils import get_balance_on
from erpnext.setup.utils import get_exchange_rate


def _resolve_voucher_amount(bank_transaction, second_account, account_type, party_type, party) -> float:
    """Smaller of (a) how much of this transaction is still unallocated and
    (b) the selected party's own real outstanding balance in second_account
    - falls back to the full unallocated amount when there's no
    Receivable/Payable party to check against, or that party's computed
    outstanding comes back as 0 (nothing to cap against, e.g. a brand new
    balance not yet posted anywhere)."""
    unallocated = flt(bank_transaction.unallocated_amount)
    amount = unallocated if unallocated else (flt(bank_transaction.deposit) or flt(bank_transaction.withdrawal))

    if party_type and party and account_type in ("Receivable", "Payable"):
        party_outstanding = abs(flt(get_balance_on(second_account, party_type=party_type, party=party)))
        if party_outstanding > 0:
            amount = min(amount, party_outstanding)

    return amount


@frappe.whitelist()
def create_journal_entry_bts_with_party_outstanding(
    bank_transaction_name,
    reference_number=None,
    reference_date=None,
    posting_date=None,
    entry_type=None,
    second_account=None,
    mode_of_payment=None,
    party_type=None,
    party=None,
    allow_edit=None,
):
    bank_transaction = frappe.db.get_values(
        "Bank Transaction",
        bank_transaction_name,
        fieldname=["name", "deposit", "withdrawal", "unallocated_amount", "bank_account", "currency"],
        as_dict=True,
    )[0]

    company_account = frappe.get_value("Bank Account", bank_transaction.bank_account, "account")
    if not company_account:
        frappe.throw(
            _(
                "Bank Account '{0}' belum memiliki akun GL. Silakan setup di master Bank Account."
            ).format(bank_transaction.bank_account)
        )

    account_type = frappe.db.get_value("Account", second_account, "account_type") if second_account else None
    if account_type in ("Receivable", "Payable") and not (party_type and party):
        frappe.throw(
            _("Party Type and Party is required for Receivable / Payable account {0}").format(second_account)
        )

    amount = _resolve_voucher_amount(bank_transaction, second_account, account_type, party_type, party)

    # Same direction as the original transaction (a withdrawal stays a
    # withdrawal), just possibly a smaller amount than the transaction's
    # own full deposit/withdrawal.
    if flt(bank_transaction.deposit) > 0:
        deposit, withdrawal = amount, 0.0
    else:
        deposit, withdrawal = 0.0, amount

    company = frappe.get_value("Account", company_account, "company")
    company_default_currency = frappe.get_cached_value("Company", company, "default_currency")
    company_account_currency = frappe.get_cached_value("Account", company_account, "account_currency")
    second_account_currency = frappe.get_cached_value("Account", second_account, "account_currency")

    is_multi_currency = (
        company_default_currency != company_account_currency
        or company_default_currency != second_account_currency
        or company_default_currency != bank_transaction.currency
    )

    second_account_dict = {
        "account": second_account,
        "account_currency": second_account_currency,
        "credit_in_account_currency": deposit,
        "debit_in_account_currency": withdrawal,
        "party_type": party_type,
        "party": party,
        "cost_center": get_default_cost_center(company),
    }

    company_account_dict = {
        "account": company_account,
        "account_currency": company_account_currency,
        "bank_account": bank_transaction.bank_account,
        "credit_in_account_currency": withdrawal,
        "debit_in_account_currency": deposit,
        "cost_center": get_default_cost_center(company),
    }

    # None-safe exchange rate fallbacks (ERPNext's own get_exchange_rate can
    # return None for some currency pairs/dates) - matches the guard
    # imogi_finance's own prior override already carried.
    if is_multi_currency:
        exc_rate = get_exchange_rate(bank_transaction.currency, company_default_currency, posting_date) or 1.0
        withdrawal_in_company_currency = flt(exc_rate * abs(withdrawal))
        deposit_in_company_currency = flt(exc_rate * abs(deposit))
    else:
        withdrawal_in_company_currency = withdrawal
        deposit_in_company_currency = deposit

    if second_account_currency != company_default_currency:
        exc_rate = get_exchange_rate(second_account_currency, company_default_currency, posting_date) or 1.0
        second_account_dict.update(
            {
                "exchange_rate": exc_rate,
                "credit": deposit_in_company_currency,
                "debit": withdrawal_in_company_currency,
                "credit_in_account_currency": flt(deposit_in_company_currency / exc_rate) or 0,
                "debit_in_account_currency": flt(withdrawal_in_company_currency / exc_rate) or 0,
            }
        )
    else:
        second_account_dict.update(
            {
                "exchange_rate": 1,
                "credit": deposit_in_company_currency,
                "debit": withdrawal_in_company_currency,
                "credit_in_account_currency": deposit_in_company_currency,
                "debit_in_account_currency": withdrawal_in_company_currency,
            }
        )

    if company_account_currency != company_default_currency:
        exc_rate = get_exchange_rate(company_account_currency, company_default_currency, posting_date) or 1.0
        company_account_dict.update(
            {
                "exchange_rate": exc_rate,
                "credit": withdrawal_in_company_currency,
                "debit": deposit_in_company_currency,
            }
        )
    else:
        company_account_dict.update(
            {
                "exchange_rate": 1,
                "credit": withdrawal_in_company_currency,
                "debit": deposit_in_company_currency,
                "credit_in_account_currency": withdrawal_in_company_currency,
                "debit_in_account_currency": deposit_in_company_currency,
            }
        )

    accounts = [second_account_dict, company_account_dict]

    journal_entry_dict = {
        "voucher_type": entry_type,
        "company": company,
        "posting_date": posting_date,
        "cheque_date": reference_date,
        "cheque_no": reference_number,
        "mode_of_payment": mode_of_payment,
    }
    if is_multi_currency:
        journal_entry_dict["multi_currency"] = True

    journal_entry = frappe.new_doc("Journal Entry")
    journal_entry.update(journal_entry_dict)
    journal_entry.set("accounts", accounts)

    if allow_edit:
        return journal_entry

    journal_entry.insert()
    journal_entry.submit()

    paid_amount = deposit if deposit > 0.0 else withdrawal

    vouchers = json.dumps(
        [{"payment_doctype": "Journal Entry", "payment_name": journal_entry.name, "amount": paid_amount}]
    )

    return reconcile_vouchers(bank_transaction_name, vouchers)
