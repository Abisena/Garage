"""Procurement and inventory API handlers."""
from __future__ import annotations

from typing import Any, Dict, Optional

import frappe

from .common import _ensure_dict, _new_document, _require_login, _update_document


@frappe.whitelist()
def create_spare_part_order(order: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(order or {})
    doc = _new_document("Garage Spare Part Order", data)
    doc.insert()
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def update_spare_part_order(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Spare Part Order", name, data)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def create_procurement_order(order: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(order or {})
    doc = _new_document("Garage Procurement Order", data)
    doc.insert()
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def update_procurement_order(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Procurement Order", name, data)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def create_stock_movement(movement: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(movement or {})
    doc = _new_document("Garage Stock Movement", data)
    doc.insert()
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def update_stock_movement(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Stock Movement", name, data)
    return {"name": doc.name, "status": doc.status}


__all__ = [
    "create_spare_part_order",
    "update_spare_part_order",
    "create_procurement_order",
    "update_procurement_order",
    "create_stock_movement",
    "update_stock_movement",
]
