"""Document event hooks for ERPNext Payment Entry."""

from __future__ import annotations

from typing import Iterable, Optional, Set

import frappe
from frappe.utils import nowdate


@frappe.whitelist()
def get_draft_payment_entry_for_reference(
    reference_doctype: str, reference_name: str
) -> Optional[str]:
    """Return an existing unsubmitted Payment Entry that already references
    the given document, if any.

    "Create > Payment" on a Sales Invoice always builds a brand new mapped
    Payment Entry with no check for one already in progress - clicking it
    twice (e.g. the first draft never got saved/submitted) silently leaves
    an orphaned draft behind and, if the second one gets submitted instead,
    makes it look like the invoice was paid twice. Child table rows mirror
    their parent's docstatus, so filtering "Payment Entry Reference" by
    docstatus=0 is enough to find only still-draft parents.
    """

    return frappe.db.get_value(
        "Payment Entry Reference",
        {
            "reference_doctype": reference_doctype,
            "reference_name": reference_name,
            "docstatus": 0,
        },
        "parent",
    )


def handle_payment_entry_submit(doc, _method=None) -> None:
    """Complete service orders when Payment Entry fully pays linked invoices."""

    if not doc:
        return

    service_orders = _collect_paid_service_orders(doc)
    for service_order_name in service_orders:
        _complete_service_order(service_order_name)


def _collect_paid_service_orders(doc) -> Set[str]:
    references = list(getattr(doc, "references", None) or [])
    if not references:
        return set()

    link_field = _get_service_order_link_field()
    if not link_field:
        return set()

    service_orders: Set[str] = set()
    for reference in references:
        if getattr(reference, "reference_doctype", None) != "Sales Invoice":
            continue

        invoice_name = getattr(reference, "reference_name", None)
        if not invoice_name:
            continue

        invoice = _get_sales_invoice(invoice_name, link_field)
        if not invoice:
            continue

        outstanding_amount = _get_outstanding_amount(reference, invoice)
        if outstanding_amount is None or outstanding_amount > 0:
            continue

        service_order_name = invoice.get(link_field)
        if service_order_name:
            service_orders.add(service_order_name)

    return service_orders


def _get_service_order_link_field() -> Optional[str]:
    if not frappe.db.table_exists("tabSales Invoice"):
        return None

    meta = frappe.get_meta("Sales Invoice")
    for fieldname in (
        "service_order",
        "service_order_ref",
        "garage_service_order",
        "garage_service_order_ref",
    ):
        if meta.has_field(fieldname):
            return fieldname
    return None


def _get_sales_invoice(invoice_name: str, link_field: str) -> Optional[dict]:
    invoice = frappe.db.get_value(
        "Sales Invoice",
        invoice_name,
        [link_field, "outstanding_amount", "docstatus"],
        as_dict=True,
    )
    if not invoice or invoice.get("docstatus") == 2:
        return None
    if not invoice.get(link_field):
        return None
    return invoice


def _get_outstanding_amount(reference, invoice: dict) -> Optional[float]:
    invoice_outstanding = invoice.get("outstanding_amount")
    if invoice_outstanding is not None:
        return invoice_outstanding
    return getattr(reference, "outstanding_amount", None)


def _complete_service_order(service_order_name: str) -> None:
    try:
        service_order = frappe.get_doc("Garage Service Order", service_order_name)
    except Exception:
        return

    if getattr(service_order, "status", None) in {"Completed", "Cancelled"}:
        return

    service_order.status = "Completed"
    if hasattr(service_order, "job_card_status"):
        service_order.job_card_status = "Completed"
    if hasattr(service_order, "qc_status"):
        service_order.qc_status = "Passed"
    if hasattr(service_order, "actual_delivery_date"):
        service_order.actual_delivery_date = (
            service_order.actual_delivery_date or nowdate()
        )

    service_order.save(ignore_permissions=True)
