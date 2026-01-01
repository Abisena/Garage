"""Helpers for generating vehicle handover documents."""

from __future__ import annotations

import frappe
from frappe.utils import nowdate

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


def _create_handover(
    *,
    service_order_name: str,
    branch: str,
    receipt_number: str | None = None,
    payment_entry: str | None = None,
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

    _create_handover(
        service_order_name=service_order_name,
        branch=branch,
        receipt_number=doc.name,
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

        _create_handover(
            service_order_name=service_order_name,
            branch=branch,
            receipt_number=doc.name,
            payment_entry=doc.name,
        )
        created_for.add(service_order_name)
