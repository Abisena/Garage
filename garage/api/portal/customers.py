"""Customer and vehicle related API handlers."""
from __future__ import annotations

from typing import Any, Dict, Optional

import frappe
from frappe import _

from .common import ALLOWED_DOCS, _ensure_dict, _filter_fields, _new_document, _require_login


@frappe.whitelist()
def register_customer_vehicle(payload: Optional[Any] = None) -> Dict[str, Any]:
    """Create or update Garage Customer data and optionally register a vehicle."""

    _require_login()
    data = _ensure_dict(payload or {})

    created: Dict[str, Any] = {}
    existing_customer = data.get("existing_customer")
    customer_name = existing_customer

    if not existing_customer:
        customer_payload = _filter_fields(data, ALLOWED_DOCS["Garage Customer"]["fields"])
        if not customer_payload.get("customer_name"):
            frappe.throw(_("Nama customer wajib diisi."))
        customer_doc = _new_document("Garage Customer", customer_payload)
        customer_doc.insert()
        customer_name = customer_doc.name
        created["customer"] = customer_doc.name
    else:
        if not frappe.db.exists("Garage Customer", existing_customer):
            frappe.throw(_("Customer tidak ditemukan."))

    vehicle_fields = ALLOWED_DOCS["Garage Vehicle"]["fields"] - {"customer"}
    vehicle_payload = _filter_fields(data, vehicle_fields)
    if vehicle_payload:
        vehicle_doc = frappe.new_doc("Garage Vehicle")
        vehicle_doc.flags.ignore_permissions = True
        vehicle_doc.update(vehicle_payload)
        vehicle_doc.customer = data.get("vehicle_customer") or customer_name
        if not vehicle_doc.customer:
            frappe.throw(_("Pilih customer untuk kendaraan."))
        if not vehicle_doc.license_plate:
            frappe.throw(_("Nomor polisi kendaraan wajib diisi."))
        vehicle_doc.insert()
        created["vehicle"] = vehicle_doc.name
    elif data.get("vehicle_customer"):
        created["vehicle"] = None

    created["customer_name"] = customer_name
    return created


__all__ = ["register_customer_vehicle"]
