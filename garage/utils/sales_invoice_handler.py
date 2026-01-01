"""Handle Sales Invoice payment and auto-create Vehicle Handover."""

from __future__ import annotations

import frappe
from frappe.utils import nowdate


def handle_sales_invoice_paid(doc, method=None) -> None:
    """
    Ketika Sales Invoice sudah PAID:
    1. Update Service Order status menjadi Completed
    2. Auto-create Vehicle Handover
    """
    # Cek apakah ini Sales Invoice untuk Service Order
    service_order_name = _get_service_order_from_sales_invoice(doc)
    if not service_order_name:
        return
    
    # Cek apakah Sales Invoice sudah PAID
    if not _is_sales_invoice_paid(doc):
        return
    
    # Get Service Order
    try:
        service_order = frappe.get_doc("Garage Service Order", service_order_name)
    except Exception:
        return
    
    current_status = getattr(service_order, "status", None)
    
    # Hanya proses jika status saat ini "Waiting Payment"
    if current_status != "Waiting Payment":
        return
    
    # 1. Update Service Order ke Completed
    _complete_service_order(service_order, doc)
    
    # 2. Auto-create Vehicle Handover
    _create_vehicle_handover(service_order, doc)


def _get_service_order_from_sales_invoice(sales_invoice) -> str | None:
    """Extract Service Order name from Sales Invoice."""
    # Method 1: Cek custom field 'service_order' di Sales Invoice
    service_order = getattr(sales_invoice, "service_order", None)
    if service_order:
        return service_order
    
    # Method 2: Cek dari items (jika ada reference ke Service Order)
    for item in getattr(sales_invoice, "items", []) or []:
        service_order_ref = getattr(item, "service_order", None)
        if service_order_ref:
            return service_order_ref
    
    # Method 3: Cek dari custom field lain atau naming pattern
    # Sesuaikan dengan struktur data Anda
    
    return None


def _is_sales_invoice_paid(sales_invoice) -> bool:
    """Check if Sales Invoice is fully paid."""
    # Method 1: Cek status
    status = getattr(sales_invoice, "status", None)
    if status == "Paid":
        return True
    
    # Method 2: Cek outstanding amount
    outstanding = getattr(sales_invoice, "outstanding_amount", 0)
    if outstanding <= 0:
        return True
    
    # Method 3: Cek docstatus dan paid amount
    docstatus = getattr(sales_invoice, "docstatus", 0)
    grand_total = getattr(sales_invoice, "grand_total", 0)
    paid_amount = getattr(sales_invoice, "paid_amount", 0)
    
    if docstatus == 1 and paid_amount >= grand_total:
        return True
    
    return False


def _complete_service_order(service_order, sales_invoice) -> None:
    """Update Service Order status to Completed."""
    service_order.status = "Completed"
    
    # Update related fields
    if hasattr(service_order, "job_card_status"):
        service_order.job_card_status = "Completed"
    
    if hasattr(service_order, "qc_status"):
        service_order.qc_status = "Passed"
    
    if hasattr(service_order, "actual_delivery_date"):
        service_order.actual_delivery_date = (
            service_order.actual_delivery_date or nowdate()
        )
    
    # Link to Sales Invoice
    if hasattr(service_order, "sales_invoice"):
        service_order.sales_invoice = sales_invoice.name
    
    service_order.save(ignore_permissions=True)
    
    # Publish realtime update
    try:
        frappe.publish_realtime(
            "garage_service_order_updated",
            {"name": service_order.name, "fields": {"status": "Completed"}},
        )
    except Exception:
        pass


def _create_vehicle_handover(service_order, sales_invoice) -> None:
    """Auto-create Vehicle Handover document."""
    # Cek apakah sudah ada Vehicle Handover untuk Service Order ini
    existing = frappe.get_all(
        "Vehicle Handover",
        filters={"service_order": service_order.name},
        fields=["name"],
        limit=1
    )
    
    if existing:
        # Sudah ada, skip
        return
    
    # Create new Vehicle Handover
    try:
        vehicle_handover = frappe.new_doc("Vehicle Handover")
        vehicle_handover.service_order = service_order.name
        
        # Populate fields dari Service Order
        if hasattr(service_order, "customer"):
            vehicle_handover.customer = service_order.customer
        
        if hasattr(service_order, "vehicle"):
            vehicle_handover.vehicle = service_order.vehicle
        
        if hasattr(service_order, "branch"):
            vehicle_handover.branch = service_order.branch
        
        # Tambahkan field lain sesuai kebutuhan
        vehicle_handover.handover_date = nowdate()
        vehicle_handover.sales_invoice = sales_invoice.name
        
        # Insert document
        vehicle_handover.insert(ignore_permissions=True)
        
        # Log creation
        frappe.msgprint(
            f"Vehicle Handover {vehicle_handover.name} created automatically",
            alert=True
        )
        
    except Exception as e:
        frappe.log_error(
            frappe.get_traceback(),
            f"Failed to auto-create Vehicle Handover for {service_order.name}"
        )
