"""Complete the Include/Exclude PPN checkbox feature on Purchase Order/
Purchase Receipt/Purchase Invoice (see purchase_order.js's apply_ppn_
category()): those checkboxes set doc.tax_category and rely on core
ERPNext's own Tax Rule engine (erpnext.utils.set_taxes ->
erpnext.accounts.party.set_taxes) to resolve the matching Purchase Taxes
and Charges Template from it - but neither the two Tax Category records
nor the Tax Rule records that engine needs were ever created, so ticking
either checkbox set tax_category with no visible effect. Also fixes the
"( exc )" template, which was wrongly flagged tax-inclusive (identical to
the "( inc )" template), defeating the whole point of having two templates.
"""

from __future__ import annotations

import frappe

TAX_CATEGORIES = ["PPN Include", "PPN Exclude"]

INC_TEMPLATE = "( inc ) Pajak pertambahan nilai  - PPO"
EXC_TEMPLATE = "( exc ) pajak pertambahan nilai - PPO"


def _fix_exclusive_template() -> None:
    if not frappe.db.exists("Purchase Taxes and Charges Template", EXC_TEMPLATE):
        return
    frappe.db.set_value(
        "Purchase Taxes and Charges",
        {"parent": EXC_TEMPLATE},
        "included_in_print_rate",
        0,
    )


def _ensure_tax_categories() -> None:
    for category in TAX_CATEGORIES:
        if frappe.db.exists("Tax Category", category):
            continue
        doc = frappe.new_doc("Tax Category")
        doc.title = category
        doc.insert(ignore_permissions=True)


def _ensure_tax_rule(category: str, template: str, company: str) -> None:
    name = f"{company}-{category}-Purchase"
    if frappe.db.exists(
        "Tax Rule",
        {"tax_type": "Purchase", "company": company, "tax_category": category},
    ):
        return
    if not frappe.db.exists("Purchase Taxes and Charges Template", template):
        return

    doc = frappe.new_doc("Tax Rule")
    doc.tax_type = "Purchase"
    doc.company = company
    doc.tax_category = category
    doc.purchase_tax_template = template
    doc.priority = 1
    doc.insert(ignore_permissions=True)


def execute() -> None:
    if not frappe.db.table_exists("Tax Rule") or not frappe.db.table_exists("Tax Category"):
        return

    _fix_exclusive_template()
    _ensure_tax_categories()

    company = frappe.db.get_single_value("Global Defaults", "default_company") or (
        frappe.get_all("Company", limit=1, pluck="name") or [None]
    )[0]
    if not company:
        return

    _ensure_tax_rule("PPN Include", INC_TEMPLATE, company)
    _ensure_tax_rule("PPN Exclude", EXC_TEMPLATE, company)
