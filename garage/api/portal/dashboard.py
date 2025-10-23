"""Dashboard aggregation for the Garage portal."""
from __future__ import annotations

from typing import Any, Dict

import frappe
from frappe.utils import now_datetime

from .common import (
    DOC_TYPES,
    _desk_route,
    _group_status,
    _list_dicts,
    _require_login,
    _sum_field,
)


@frappe.whitelist()
def portal_bootstrap() -> Dict[str, Any]:
    """Return aggregated data for the Garage website portal dashboard."""

    _require_login()

    customers = _list_dicts(
        "Garage Customer",
        ["name", "customer_name", "customer_type", "phone", "email", "is_vip"],
        limit=100,
    )
    vehicles = _list_dicts(
        "Garage Vehicle",
        ["name", "customer", "license_plate", "brand", "model", "color", "last_service_date"],
        limit=100,
    )
    service_orders = _list_dicts(
        "Garage Service Order",
        [
            "name",
            "status",
            "customer",
            "vehicle",
            "priority",
            "service_booking_date",
            "estimated_delivery_date",
            "actual_delivery_date",
            "total_estimated_amount",
            "total_approved_amount",
            "job_card_status",
            "work_order_status",
            "qc_status",
            "modified",
        ],
    )
    open_service_orders = _list_dicts(
        "Garage Service Order",
        [
            "name",
            "status",
            "customer",
            "vehicle",
            "priority",
            "estimated_delivery_date",
            "service_booking_date",
            "modified",
        ],
        filters=[["status", "not in", ["Completed", "Cancelled"]]],
    )
    spare_orders = _list_dicts(
        "Garage Spare Part Order",
        ["name", "status", "customer", "order_date", "delivery_date", "total_amount"],
    )
    open_spare_orders = _list_dicts(
        "Garage Spare Part Order",
        ["name", "status", "customer", "order_date", "delivery_date"],
        filters=[["status", "not in", ["Delivered", "Cancelled"]]],
    )
    procurement_orders = _list_dicts(
        "Garage Procurement Order",
        ["name", "status", "supplier", "order_date", "expected_date", "total_qty", "total_amount"],
    )
    pending_procurement = _list_dicts(
        "Garage Procurement Order",
        ["name", "status", "supplier", "expected_date", "total_qty"],
        filters=[["status", "in", ["Draft", "Ordered", "Partially Received"]]],
    )
    stock_movements = _list_dicts(
        "Garage Stock Movement",
        [
            "name",
            "movement_type",
            "reference_type",
            "reference_name",
            "posting_date",
            "warehouse",
            "status",
        ],
    )
    invoices = _list_dicts(
        "Garage Sales Invoice",
        [
            "name",
            "status",
            "customer",
            "invoice_date",
            "due_date",
            "total_amount",
            "outstanding_amount",
        ],
    )
    open_invoices = _list_dicts(
        "Garage Sales Invoice",
        ["name", "customer", "invoice_date", "due_date", "total_amount", "outstanding_amount", "status"],
        filters=[["status", "not in", ["Paid", "Cancelled"]]],
    )
    payments = _list_dicts(
        "Garage Payment Entry",
        ["name", "status", "customer", "payment_date", "mode_of_payment", "paid_amount"],
    )
    receipts = _list_dicts(
        "Garage Receipt Document",
        ["name", "payment_entry", "receipt_date", "receipt_number", "delivery_method"],
    )

    status_summary = {
        "service_orders": _group_status("Garage Service Order"),
        "spare_orders": _group_status("Garage Spare Part Order"),
        "procurement_orders": _group_status("Garage Procurement Order"),
        "stock_movements": _group_status("Garage Stock Movement"),
        "sales_invoices": _group_status("Garage Sales Invoice"),
        "payment_entries": _group_status("Garage Payment Entry"),
    }

    totals = {
        "invoice_total": _sum_field("Garage Sales Invoice", "total_amount"),
        "outstanding_total": _sum_field("Garage Sales Invoice", "outstanding_amount"),
        "payments_total": _sum_field("Garage Payment Entry", "paid_amount"),
    }

    desk_routes = {doctype: _desk_route(doctype) for doctype in DOC_TYPES}

    return {
        "customers": customers,
        "vehicles": vehicles,
        "service_orders": service_orders,
        "open_service_orders": open_service_orders,
        "spare_orders": spare_orders,
        "open_spare_orders": open_spare_orders,
        "procurement_orders": procurement_orders,
        "pending_procurement": pending_procurement,
        "stock_movements": stock_movements,
        "sales_invoices": invoices,
        "open_invoices": open_invoices,
        "payment_entries": payments,
        "receipt_documents": receipts,
        "status_summary": status_summary,
        "totals": totals,
        "desk_routes": desk_routes,
        "refreshed_at": now_datetime(),
    }


__all__ = ["portal_bootstrap"]
