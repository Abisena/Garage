"""Helpers for generating vehicle handover documents."""

from __future__ import annotations

import frappe
from frappe.utils import get_datetime, nowdate

PAID_INVOICE_STATUSES = {"Paid", "Submitted"}
PAID_PAYMENT_ENTRY_STATUSES = {"Submitted", "Cleared", "Paid"}
PAYMENT_ENTRY_REFERENCE_DOCTYPES = {"Garage Sales Invoice", "Sales Invoice"}


def _get_service_order(service_order_name: str):
    try:
        return frappe.get_doc("Garage Service Order", service_order_name)
    except Exception:
        return None


def _resolve_service_order_from_invoice(invoice) -> str | None:
    source_type = getattr(invoice, "source_type", None)
    source_name = getattr(invoice, "source_name", None)
    if source_type == "Garage Service Order" and source_name:
        return source_name

    service_order = (
        getattr(invoice, "service_order", None)
        or getattr(invoice, "service_order_ref", None)
        or getattr(invoice, "garage_service_order", None)
        or getattr(invoice, "garage_service_order_ref", None)
    )
    if service_order:
        return service_order

    po_no = getattr(invoice, "po_no", None)
    if po_no and frappe.db.exists("Garage Service Order", po_no):
        return po_no

    return None


def _is_paid_sales_invoice(invoice) -> bool:
    return getattr(invoice, "status", None) in PAID_INVOICE_STATUSES or getattr(
        invoice, "docstatus", None
    ) == 1


def _extract_invoice_names_from_payment_entry(doc) -> list[str]:
    allocations = getattr(doc, "allocations", None) or []
    invoice_names = [
        getattr(allocation, "invoice", None)
        for allocation in allocations
        if getattr(allocation, "invoice", None)
    ]
    if invoice_names:
        return invoice_names

    references = getattr(doc, "references", None) or []
    for reference in references:
        if (
            getattr(reference, "reference_doctype", None)
            in PAYMENT_ENTRY_REFERENCE_DOCTYPES
        ):
            invoice_name = getattr(reference, "reference_name", None)
            if invoice_name:
                invoice_names.append(invoice_name)

    return invoice_names


def _is_paid_payment_entry(doc) -> bool:
    status = getattr(doc, "status", None)
    if status in PAID_PAYMENT_ENTRY_STATUSES:
        return True
    return getattr(doc, "docstatus", None) == 1


def _handover_exists(service_order_name: str) -> bool:
    return bool(frappe.db.exists("Vehicle Handover", {"service_order": service_order_name}))


def _extract_permit_details(doc) -> tuple[str | None, str | None]:
    permit_number = getattr(doc, "permit_number", None) or getattr(
        doc, "exit_permit_number", None
    )
    sikk_number = getattr(doc, "sikk_number", None) or getattr(
        doc, "exit_permit_reference", None
    )
    return permit_number, sikk_number


def _get_payment_entry(payment_entry_name: str):
    try:
        return frappe.get_doc("Payment Entry", payment_entry_name)
    except Exception:
        return None


def _resolve_payment_entry_for_invoice(invoice_name: str | None):
    if not invoice_name:
        return None

    payment_entry_name = frappe.db.get_value(
        "Payment Entry Reference",
        {
            "reference_name": invoice_name,
            "reference_doctype": ("in", tuple(PAYMENT_ENTRY_REFERENCE_DOCTYPES)),
        },
        "parent",
        order_by="modified desc",
    )
    if not payment_entry_name:
        return None

    payment_entry = _get_payment_entry(payment_entry_name)
    if not payment_entry or not _is_paid_payment_entry(payment_entry):
        return None

    return payment_entry


def _resolve_sales_invoice_from_service_order(service_order) -> str | None:
    for field in (
        "sales_invoice",
        "sales_invoice_ref",
        "invoice",
        "invoice_ref",
    ):
        invoice_name = getattr(service_order, field, None)
        if invoice_name:
            return invoice_name
    return None


def _apply_payment_entry_details(handover, payment_entry) -> None:
    if not payment_entry:
        return

    if not getattr(handover, "payment_entry", None):
        handover.payment_entry = payment_entry.name

    if not getattr(handover, "receipt_number", None):
        handover.receipt_number = payment_entry.name

    posting_date = getattr(payment_entry, "posting_date", None) or nowdate()
    if not getattr(handover, "valid_from", None):
        handover.valid_from = posting_date

    if not getattr(handover, "submission_date", None):
        handover.submission_date = posting_date

    if not getattr(handover, "valid_until", None):
        posting_time = getattr(payment_entry, "posting_time", None)
        if posting_time:
            handover.valid_until = get_datetime(f"{posting_date} {posting_time}")
        else:
            handover.valid_until = get_datetime(posting_date)


def _create_handover(
    *,
    service_order_name: str,
    branch: str,
    receipt_number: str | None = None,
    payment_entry: str | None = None,
    permit_number: str | None = None,
    sikk_number: str | None = None,
    sales_invoice_name: str | None = None,
) -> None:
    if _handover_exists(service_order_name):
        return

    service_order = _get_service_order(service_order_name)
    if not service_order:
        return

    handover = frappe.new_doc("Vehicle Handover")
    handover.service_order = service_order_name
    handover.branch = branch
    handover.vehicle = getattr(service_order, "vehicle", None)
    if receipt_number:
        handover.receipt_number = receipt_number
    if payment_entry:
        handover.payment_entry = payment_entry
    if permit_number:
        handover.permit_number = permit_number
    if sikk_number:
        handover.sikk_number = sikk_number

    payment_entry_doc = None
    if payment_entry:
        payment_entry_doc = _get_payment_entry(payment_entry)
    if not payment_entry_doc:
        payment_entry_doc = _resolve_payment_entry_for_invoice(sales_invoice_name)
    if not payment_entry_doc:
        payment_entry_doc = _resolve_payment_entry_for_invoice(
            _resolve_sales_invoice_from_service_order(service_order)
        )
    _apply_payment_entry_details(handover, payment_entry_doc)
    handover.save(ignore_permissions=True)


def _mark_service_order_completed(service_order) -> None:
    updates = {}

    if getattr(service_order, "status", None) not in {"Completed", "Cancelled"}:
        updates["status"] = "Completed"

    if hasattr(service_order, "job_card_status"):
        updates["job_card_status"] = "Completed"

    if hasattr(service_order, "work_order_status"):
        updates["work_order_status"] = "Completed"

    if hasattr(service_order, "qc_status"):
        updates["qc_status"] = "Passed"

    if hasattr(service_order, "actual_delivery_date") and not getattr(
        service_order, "actual_delivery_date", None
    ):
        updates["actual_delivery_date"] = nowdate()

    if updates:
        frappe.db.set_value(service_order.doctype, service_order.name, updates)


def handle_paid_sales_invoice(doc, method=None) -> None:  # pragma: no cover - frappe hook
    """Auto-create Vehicle Handover when a sales invoice is paid."""

    if not _is_paid_sales_invoice(doc):
        return

    service_order_name = _resolve_service_order_from_invoice(doc)
    if not service_order_name:
        return

    service_order = _get_service_order(service_order_name)
    if not service_order:
        return

    _mark_service_order_completed(service_order)

    branch = getattr(doc, "branch", None) or getattr(service_order, "branch", None)
    if not branch:
        return

    permit_number, sikk_number = _extract_permit_details(service_order)

    _create_handover(
        service_order_name=service_order_name,
        branch=branch,
        receipt_number=doc.name,
        permit_number=permit_number,
        sikk_number=sikk_number,
        sales_invoice_name=doc.name,
    )


def handle_paid_payment_entry(doc, method=None) -> None:  # pragma: no cover - frappe hook
    """Auto-create Vehicle Handover when a payment entry is submitted/cleared."""

    if not _is_paid_payment_entry(doc):
        return

    invoice_names = _extract_invoice_names_from_payment_entry(doc)
    if not invoice_names:
        return

    created_for = set()
    for invoice_name in invoice_names:
        try:
            invoice = frappe.get_doc("Garage Sales Invoice", invoice_name)
        except Exception:
            try:
                invoice = frappe.get_doc("Sales Invoice", invoice_name)
            except Exception:
                continue

        service_order_name = _resolve_service_order_from_invoice(invoice)
        if not service_order_name or service_order_name in created_for:
            continue

        service_order = _get_service_order(service_order_name)
        if not service_order:
            continue

        _mark_service_order_completed(service_order)

        branch = (
            getattr(doc, "branch", None)
            or getattr(invoice, "branch", None)
            or getattr(service_order, "branch", None)
        )
        if not branch:
            continue

        permit_number, sikk_number = _extract_permit_details(service_order)

        _create_handover(
            service_order_name=service_order_name,
            branch=branch,
            receipt_number=doc.name,
            payment_entry=doc.name,
            permit_number=permit_number,
            sikk_number=sikk_number,
            sales_invoice_name=getattr(invoice, "name", None),
        )
        created_for.add(service_order_name)


def handle_completed_service_order(doc, method=None) -> None:  # pragma: no cover - frappe hook
    """Auto-create Vehicle Handover when service order is completed."""

    if getattr(doc, "status", None) != "Completed":
        return

    if _handover_exists(doc.name):
        return

    branch = getattr(doc, "branch", None)
    if not branch:
        return

    permit_number, sikk_number = _extract_permit_details(doc)

    _create_handover(
        service_order_name=doc.name,
        branch=branch,
        permit_number=permit_number,
        sikk_number=sikk_number,
        sales_invoice_name=_resolve_sales_invoice_from_service_order(doc),
    )
