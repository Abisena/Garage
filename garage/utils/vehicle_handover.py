"""Helpers for generating vehicle handover documents."""

from __future__ import annotations

import frappe

PAID_INVOICE_STATUSES = {"Paid", "Submitted"}
PAID_PAYMENT_ENTRY_STATUSES = {"Submitted", "Cleared"}


def _get_service_order(service_order_name: str):
    try:
        return frappe.get_doc("Garage Service Order", service_order_name)
    except Exception:
        return None


def _resolve_service_order_from_invoice(invoice) -> str | None:
    source_type = getattr(invoice, "source_type", None)
    source_name = getattr(invoice, "source_name", None)
    if source_type != "Garage Service Order" or not source_name:
        return None
    return source_name


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


def handle_paid_sales_invoice(doc, method=None) -> None:  # pragma: no cover - frappe hook
    """Auto-create Vehicle Handover when a sales invoice is paid."""

    if getattr(doc, "status", None) not in PAID_INVOICE_STATUSES:
        return

    service_order_name = _resolve_service_order_from_invoice(doc)
    if not service_order_name:
        return

    service_order = _get_service_order(service_order_name)
    if not service_order:
        return

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

    if getattr(doc, "status", None) not in PAID_PAYMENT_ENTRY_STATUSES:
        return

    allocations = getattr(doc, "allocations", None) or []
    if not allocations:
        return

    created_for = set()
    for allocation in allocations:
        invoice_name = getattr(allocation, "invoice", None)
        if not invoice_name:
            continue

        try:
            invoice = frappe.get_doc("Garage Sales Invoice", invoice_name)
        except Exception:
            continue

        service_order_name = _resolve_service_order_from_invoice(invoice)
        if not service_order_name or service_order_name in created_for:
            continue

        service_order = _get_service_order(service_order_name)
        if not service_order:
            continue

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
