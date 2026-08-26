"""Completes the PPN tax-category setup that add_ppn_tax_rules.py started.

1. Adds a third "PPN Non" option alongside "PPN Include"/"PPN Exclude" -
   explicit request: staff need a way to mark a transaction as having NO
   PPN at all, distinct from leaving both existing checkboxes unticked
   (which leaves tax_category at whatever it already was - see purchase_
   order.js's own apply_ppn_category(): "there's no 'neither' state worth
   landing on mid-edit"). "PPN Non" resolves through the same Tax Rule
   engine to a template with ZERO tax rows - not even a 0% one - so Grand
   Total = Net Total and nothing is "inclusive" or "exclusive" about it.

2. Backfills the Sales-side mirror of the Purchase-side Tax Rule/Template
   pair add_ppn_tax_rules.py already created for Purchase Order/Purchase
   Receipt/Purchase Invoice. Sales Order's own Include/Exclude PPN
   checkboxes (sales_order.js) were built to reuse "the same Tax Category +
   Tax Rule records already used on the buying side" - but no patch ever
   created the *Sales*-type Tax Rule / Sales Taxes and Charges Template
   pair that promise depends on. On a site where nobody happened to create
   those by hand, ticking Include/Exclude PPN on a Sales Order silently
   resolves to nothing: tax_category gets set, erpnext.utils.set_taxes
   finds no matching Sales Tax Rule, the taxes table stays empty either
   way - "Exclude" looking identical to a plain, unfiltered order.

Idempotent and safe to extend later: every template/rule is looked up by
(company, title) or (tax_type, company, tax_category) before creating
anything, so re-running this - or running it on a site that already has
some of this set up by hand - only fills in what's actually missing.
"""

from __future__ import annotations

import frappe

CATEGORIES = ("PPN Include", "PPN Exclude", "PPN Non")

# Matches the exact titles already in use for Include/Exclude (inconsistent
# capitalisation/spacing and all) so the (company, title) lookup below finds
# the existing hand-created templates instead of creating near-duplicates.
CATEGORY_TITLES = {
    "PPN Include": "( inc ) Pajak pertambahan nilai ",
    "PPN Exclude": "( exc ) pajak pertambahan nilai",
    "PPN Non": "( non ) Pajak pertambahan nilai",
}
INCLUDED_IN_PRINT_RATE = {"PPN Include": 1, "PPN Exclude": 0, "PPN Non": 0}
# PPN Non's template gets no tax row at all - that's the whole point: a
# transaction that doesn't fall into Include or Exclude.
HAS_VAT_ROW = {"PPN Include": True, "PPN Exclude": True, "PPN Non": False}

TEMPLATE_DOCTYPE = {
    "Purchase": "Purchase Taxes and Charges Template",
    "Sales": "Sales Taxes and Charges Template",
}
TEMPLATE_FIELD_ON_RULE = {"Purchase": "purchase_tax_template", "Sales": "sales_tax_template"}


def _ensure_tax_category(category: str) -> None:
    if frappe.db.exists("Tax Category", category):
        return
    frappe.get_doc({"doctype": "Tax Category", "title": category}).insert(ignore_permissions=True)


def _vat_account(company: str) -> str | None:
    return frappe.db.get_value("Account", {"company": company, "account_name": "VAT"}, "name")


def _ensure_template(tax_type: str, category: str, company: str) -> str | None:
    doctype = TEMPLATE_DOCTYPE[tax_type]
    title = CATEGORY_TITLES[category]
    existing = frappe.db.get_value(doctype, {"company": company, "title": title})
    if existing:
        return existing

    if HAS_VAT_ROW[category] and not _vat_account(company):
        # Same "quietly skip rather than guess a VAT account" caution as
        # the original patch's template-must-already-exist guard - a
        # company with no VAT account configured isn't using PPN at all.
        return None

    doc = frappe.new_doc(doctype)
    doc.title = title
    doc.company = company
    if HAS_VAT_ROW[category]:
        doc.append("taxes", {
            "charge_type": "On Net Total",
            "account_head": _vat_account(company),
            "rate": 11,
            "included_in_print_rate": INCLUDED_IN_PRINT_RATE[category],
        })
    doc.insert(ignore_permissions=True)
    return doc.name


def _ensure_tax_rule(tax_type: str, category: str, template: str, company: str) -> None:
    if frappe.db.exists(
        "Tax Rule", {"tax_type": tax_type, "company": company, "tax_category": category}
    ):
        return
    doc = frappe.new_doc("Tax Rule")
    doc.tax_type = tax_type
    doc.company = company
    doc.tax_category = category
    setattr(doc, TEMPLATE_FIELD_ON_RULE[tax_type], template)
    doc.priority = 1
    doc.insert(ignore_permissions=True)


def execute() -> None:
    if not frappe.db.table_exists("Tax Rule") or not frappe.db.table_exists("Tax Category"):
        return

    _ensure_tax_category("PPN Non")

    for company in frappe.get_all("Company", pluck="name"):
        for tax_type in ("Purchase", "Sales"):
            for category in CATEGORIES:
                template = _ensure_template(tax_type, category, company)
                if template:
                    _ensure_tax_rule(tax_type, category, template, company)
