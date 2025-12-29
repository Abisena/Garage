"""Helpers for generating vehicle handover documents."""

from __future__ import annotations

import frappe


def handle_paid_sales_invoice(doc, method=None) -> None:  # pragma: no cover - frappe hook
    """Auto-create Vehicle Handover when a sales invoice is paid."""

    if getattr(doc, "status", None) != "Paid":
        return

    source_type = getattr(doc, "source_type", None)
    source_name = getattr(doc, "source_name", None)
    if source_type != "Garage Service Order" or not source_name:
        return

    existing = frappe.db.exists(
        "Vehicle Handover",
        {"service_order": source_name, "receipt_number": doc.name},
    )
    if existing:
        return

    try:
        service_order = frappe.get_doc("Garage Service Order", source_name)
    except Exception:
        return

    branch = getattr(doc, "branch", None) or getattr(service_order, "branch", None)
    if not branch:
        return

    handover = frappe.new_doc("Vehicle Handover")
    handover.service_order = source_name
    handover.branch = branch
    handover.vehicle = getattr(service_order, "vehicle", None)
    handover.receipt_number = doc.name
    handover.save(ignore_permissions=True)
