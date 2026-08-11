import frappe
from frappe.utils import flt


# Fields that belong to the SOURCE child row's own identity/audit trail,
# not to the row's actual content - left in place, frappe.append() would
# either reuse them verbatim (name, wrongly reusing another document's
# child row id) or get silently overwritten anyway (parent/parentfield/
# parenttype/idx, creation/modified/owner/modified_by), so stripping them
# up front is what lets append() build a genuinely new, independent row
# instead of a confusing half-copy of the donor row's own bookkeeping.
_ROW_IDENTITY_FIELDS = (
    "name",
    "parent",
    "parentfield",
    "parenttype",
    "idx",
    "creation",
    "modified",
    "modified_by",
    "owner",
    "docstatus",
)


@frappe.whitelist()
def make_purchase_invoice_with_services(source_name, target_doc=None, args=None):
    """Whitelisted method override for Purchase Receipt's own "Create >
    Purchase Invoice" button (erpnext.stock.doctype.purchase_receipt.
    purchase_receipt.make_purchase_invoice - see override_whitelisted_
    methods in hooks.py).

    Purchase Receipt's own core mapper only ever pulls the goods rows
    actually on the receipt - Service items never reach it at all
    (purchase_receipt_hooks.strip_service_items strips them out at
    Purchase Receipt save time, since there's no physical goods receipt
    process for a service - see that function's own docstring). Left
    alone, staff would need to separately remember to invoice service
    lines straight from the Purchase Order instead of just clicking
    "Create > Purchase Invoice" on the Receipt the way they do for every
    other document - this keeps that one familiar button working for a
    mixed goods+services PO by also appending any not-yet-billed Service
    rows from the receipt's own source Purchase Order(s) onto the same
    invoice, automatically, with no extra step for the user.

    Reuses Purchase Order's own make_purchase_invoice() mapper (buying/
    doctype/purchase_order/purchase_order.py) to build each service row,
    rather than constructing one by hand here, so both paths always agree
    on what a mapped row looks like (tax template, cost center, expense
    account, apply_tds/subject_to_pph23 handling, etc. - already verified
    correct end-to-end when invoicing straight from a PO, see purchase_
    order_tax_withholding.py's own fix_service_only_withholding()).
    """
    from erpnext.buying.doctype.purchase_order.purchase_order import (
        make_purchase_invoice as make_purchase_invoice_from_po,
    )
    from erpnext.stock.doctype.purchase_receipt.purchase_receipt import (
        make_purchase_invoice as make_purchase_invoice_from_receipt,
    )

    invoice = make_purchase_invoice_from_receipt(source_name, target_doc, args)

    receipt = frappe.get_doc("Purchase Receipt", source_name)
    po_names = sorted({row.purchase_order for row in receipt.items if row.purchase_order})

    for po_name in po_names:
        po = frappe.get_doc("Purchase Order", po_name)
        unbilled_service_codes = {
            row.item_code
            for row in po.items
            if row.item_group == "Services" and flt(row.billed_amt) < flt(row.amount)
        }
        if not unbilled_service_codes:
            continue

        po_invoice = make_purchase_invoice_from_po(po_name)
        for row in po_invoice.items:
            if row.item_code not in unbilled_service_codes:
                continue
            row_dict = row.as_dict()
            for field in _ROW_IDENTITY_FIELDS:
                row_dict.pop(field, None)
            invoice.append("items", row_dict)

    return invoice
