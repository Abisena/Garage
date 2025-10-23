"""Service order related API handlers."""
from __future__ import annotations

from typing import Any, Dict, Optional

import frappe
from frappe import _

from .common import (
    ALLOWED_DOCS,
    _ensure_dict,
    _new_document,
    _require_login,
    _sanitize_child_rows,
    _update_document,
)


@frappe.whitelist()
def create_service_order(order: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(order or {})
    doc = _new_document("Garage Service Order", data)
    doc.insert()
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def update_service_order(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Service Order", name, data)
    return {
        "name": doc.name,
        "status": doc.status,
        "job_card_status": doc.job_card_status,
        "qc_status": doc.qc_status,
    }


@frappe.whitelist()
def append_service_progress(name: str, log_entry: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(log_entry or {})
    progress_config = ALLOWED_DOCS["Garage Service Order"]["children"]["progress_logs"]
    row = _sanitize_child_rows("progress_logs", [data], progress_config)
    if not row:
        frappe.throw(_("Data progres tidak boleh kosong."))
    doc = frappe.get_doc("Garage Service Order", name)
    doc.flags.ignore_permissions = True
    doc.append("progress_logs", row[0])
    doc.save()
    return {"name": doc.name, "progress_count": len(doc.progress_logs)}


__all__ = [
    "create_service_order",
    "update_service_order",
    "append_service_progress",
]
