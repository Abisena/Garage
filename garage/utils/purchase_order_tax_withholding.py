import frappe
from frappe.utils import flt


def _get_tax_details(tax_withholding_category, company, posting_date):
    """Shared lookup used by both the live client-side preview and the
    save-time correction below, so the two can never disagree with each
    other over which rate/account/description applies. Mirrors ERPNext's
    own get_tax_withholding_details() (tax_withholding_category.py) but
    only the parts needed here - that function bails out entirely if no
    account is configured for inv.company, which this replicates too."""
    from erpnext.accounts.doctype.tax_withholding_category.tax_withholding_category import (
        get_tax_withholding_rates,
    )

    tax_withholding = frappe.get_cached_doc("Tax Withholding Category", tax_withholding_category)
    rate_detail = get_tax_withholding_rates(tax_withholding, posting_date)
    if not rate_detail:
        return None

    account_head = None
    for row in tax_withholding.accounts:
        if row.company == company:
            account_head = row.account
            break

    if not account_head:
        return None

    return frappe._dict({
        "rate": flt(rate_detail.tax_withholding_rate),
        "account_head": account_head,
        "description": tax_withholding.category_name or tax_withholding_category,
    })


def _build_tax_row(tax_details, tax_amount, company):
    """Same shape as get_tax_row_for_tds() (tax_withholding_category.py),
    including the cost_center/is_tax_withholding_account fields
    get_party_tax_withholding_details() adds afterward - kept as one
    place so the client-side preview and the save-time correction always
    append/represent an identical row shape."""
    cost_center = frappe.get_cached_value("Company", company, "cost_center")
    return {
        "category": "Total",
        "charge_type": "Actual",
        "tax_amount": tax_amount,
        "add_deduct_tax": "Deduct",
        "description": tax_details.description,
        "account_head": tax_details.account_head,
        "cost_center": cost_center,
        "is_tax_withholding_account": 1,
        # charge_type "Actual" means ERPNext's own calculation ignores this
        # field entirely (it's only meaningful for percentage-based charge
        # types) - carried along anyway purely so purchase_order.js's own
        # footer can label the row "PPh 23 (2%)" straight from this same
        # row instead of needing a second round trip/cached value that
        # could drift out of sync with what's actually stored here.
        "rate": tax_details.rate,
    }


@frappe.whitelist()
def preview_service_tax_withholding(company, tax_withholding_category, posting_date, service_base_amount):
    """Live, pre-save preview for Purchase Order's own Tax Withholding
    Amount checkbox - PPh 23 (and similar withholding taxes) only apply to
    the JASA/service portion of a purchase, not goods, but ERPNext's own
    get_party_tax_withholding_details() only ever knows how to compute
    against the WHOLE document's net_total. purchase_order.js sums the
    amount of whichever rows are flagged subject_to_pph23 (auto-set from
    each row's Item Group = "Services", see garage/public/js/
    purchase_order.js apply_pph23_flag()) and sends just that figure here,
    rather than reimplementing ERPNext's own rate/date lookup client-side
    where it could quietly drift out of sync with what actually gets saved
    (see fix_service_only_withholding() below, the doc_events "validate"
    hook that applies this exact same math server-side as the final,
    authoritative figure). Returns a ready-to-append tax row (or None if
    there's nothing to withhold), not just a bare number, so the client
    never has to reconstruct the row's other fields itself.
    """
    service_base_amount = flt(service_base_amount)
    if service_base_amount <= 0:
        return None

    tax_details = _get_tax_details(tax_withholding_category, company, posting_date)
    if not tax_details:
        return None

    tax_amount = flt(service_base_amount * tax_details.rate / 100, 2)
    if tax_amount <= 0:
        return None

    return _build_tax_row(tax_details, tax_amount, company)


_SERVICE_ITEM_GROUP = "Services"


def fix_service_only_withholding(doc, method=None):
    """doc_event: Purchase Order.validate / Purchase Invoice.validate

    Runs AFTER the doctype's own core validate() (Document.hook()'s own
    compose() always calls the doctype's class method before any doc_events
    hooks - confirmed the same way for the Item Tax Template autoname fix
    earlier in this app), which by then has already called self.
    set_tax_withholding() (buying/doctype/purchase_order/purchase_order.py -
    Purchase Invoice's own controller inherits the exact same method) and
    appended/updated a tax row sized off the WHOLE document's net_total.
    That's wrong whenever a document mixes goods and services under one
    vendor invoice - PPh 23 should only ever apply to the service lines -
    so this replaces that row's amount with one scoped to just the rows
    whose Item Group is "Services", using the exact same rate/account
    lookup the live client-side preview already showed the user before
    they hit Save (Purchase Order's own case - Purchase Invoice never gets
    a live preview since its own totals footer just reads back whatever
    this correction already computed after a normal save).

    Reads item_group directly rather than Purchase Order Item's own
    subject_to_pph23 flag (a client-side-only mirror of the same
    condition, see purchase_order.js sync_pph23_flags()) specifically so
    this same function works unmodified on Purchase Invoice Item too,
    which has no such flag field of its own - one shared, authoritative
    definition of "which rows count as services" instead of two that
    could drift apart.

    Without this hook also registered for Purchase Invoice, a Purchase
    Invoice mapped from a goods-only Purchase Order (no service lines,
    apply_tds/tax_withholding_category still carried over from the PO)
    got a PPh 23 withholding row computed by ERPNext's own core logic
    against the WHOLE invoice total anyway - a real, reported bug (the
    PO correctly showed no PPh 23 since it had no service lines, but the
    Purchase Invoice mapped from it did) - fixed by registering this same
    function for Purchase Invoice's own validate event too (see hooks.py).
    """
    if not doc.get("apply_tds") or not doc.get("tax_withholding_category"):
        return

    service_base = sum(
        flt(d.amount) for d in doc.items if d.get("item_group") == _SERVICE_ITEM_GROUP
    )

    posting_date = doc.get("transaction_date") or doc.get("posting_date")
    tax_details = _get_tax_details(doc.tax_withholding_category, doc.company, posting_date)
    if not tax_details:
        return

    correct_amount = flt(
        service_base * tax_details.rate / 100, doc.precision("total_taxes_and_charges")
    )

    existing = next(
        (
            d
            for d in doc.taxes
            if d.account_head == tax_details.account_head and d.get("is_tax_withholding_account")
        ),
        None,
    )

    if correct_amount <= 0:
        if existing:
            doc.remove(existing)
    elif existing:
        existing.tax_amount = correct_amount
    else:
        doc.append("taxes", _build_tax_row(tax_details, correct_amount, doc.company))

    doc.calculate_taxes_and_totals()
