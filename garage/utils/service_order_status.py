"""Helpers for syncing Garage Service Order status based on workflow events."""

from __future__ import annotations

from typing import Iterable

import frappe
from frappe.utils import cstr, flt

from garage.garage.doctype.garage_service_order.garage_service_order import (
    PART_CANCELLED_STATUSES,
    PART_REJECTED_STATUSES,
)

TERMINAL_STATUSES = {"Completed", "Cancelled"}
STATUS_FLOW = [
    "Draft",
    "Inspection",
    "Estimate",
    "Awaiting Approval",
    "Approved",
    "Request Part",
    "Work In Progress",
    "Waiting Payment",
    "Completed",
]


def _get_service_order(service_order_name: str):
    try:
        return frappe.get_doc("Garage Service Order", service_order_name)
    except Exception:
        return None


def _flow_index(status: str) -> int:
    try:
        return STATUS_FLOW.index(status)
    except ValueError:
        return -1


def _should_advance(current_status: str | None, target_status: str) -> bool:
    if not target_status:
        return False
    if current_status in TERMINAL_STATUSES:
        return False
    if current_status == target_status:
        return False
    current_idx = _flow_index(current_status or "")
    target_idx = _flow_index(target_status)
    if current_idx == -1 or target_idx == -1:
        return True
    return target_idx >= current_idx


def _set_service_order_status(service_order, target_status: str) -> None:
    if not hasattr(service_order, "status"):
        return
    if not _should_advance(getattr(service_order, "status", None), target_status):
        return
    frappe.db.set_value(service_order.doctype, service_order.name, {"status": target_status})
    _publish_service_order_update(service_order.name, {"status": target_status})


def _publish_service_order_update(service_order_name: str, updated_fields: dict | None = None) -> None:
    try:
        frappe.publish_realtime(
            "garage_service_order_updated",
            {"name": service_order_name, "fields": updated_fields or {}},
        )
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Failed to publish Garage Service Order update",
        )


def _has_required_parts(service_order) -> bool:
    for row in getattr(service_order, "required_parts", []) or []:
        if getattr(row, "item_code", None):
            return True
    return False


def sync_from_inspection(doc, method=None) -> None:  # pragma: no cover - frappe hook
    if not getattr(doc, "service_order", None):
        return
    service_order = _get_service_order(doc.service_order)
    if not service_order:
        return
    target_status = "Request Part" if _has_required_parts(service_order) else "Work In Progress"
    _set_service_order_status(service_order, target_status)


def sync_from_spare_part_request(doc, method=None) -> None:  # pragma: no cover - frappe hook
    if not getattr(doc, "service_order", None):
        return
    service_order = _get_service_order(doc.service_order)
    if not service_order:
        return

    status = (getattr(doc, "status", None) or "").strip()
    if status.lower() == "prepared":
        target_status = "Work In Progress"
        _ensure_repair_qc(service_order)
    else:
        target_status = "Request Part"
    _set_service_order_status(service_order, target_status)


def sync_from_repair_qc(doc, method=None) -> None:  # pragma: no cover - frappe hook
    if not getattr(doc, "service_order", None):
        return
    if getattr(doc, "status", None) != "Finished":
        return
    service_order = _get_service_order(doc.service_order)
    if not service_order:
        return
    _set_service_order_status(service_order, "Waiting Payment")


def sync_from_status_fields(
    service_order_name: str, statuses: Iterable[str], default_status: str
) -> None:
    service_order = _get_service_order(service_order_name)
    if not service_order:
        return
    normalized = [(status or "").strip().lower() for status in statuses if status is not None]
    if any(status == "prepared" for status in normalized):
        target_status = "Work In Progress"
    elif normalized:
        target_status = default_status
    else:
        target_status = default_status
    _set_service_order_status(service_order, target_status)


def _ensure_repair_qc(service_order) -> None:
    if not service_order:
        return
    if getattr(service_order, "status", None) in TERMINAL_STATUSES:
        return

    required_parts = list(getattr(service_order, "required_parts", []) or [])
    if not required_parts:
        return

    existing = frappe.get_all(
        "Repair QC",
        filters={"service_order": service_order.name, "status": ("!=", "Finished")},
        fields=["name"],
        order_by="modified desc",
        limit=1,
    )
    repair_qc = (
        frappe.get_doc("Repair QC", existing[0].name)
        if existing
        else frappe.new_doc("Repair QC")
    )
    repair_qc.service_order = service_order.name
    repair_qc.flags.ignore_completion_validation = True
    repair_qc.flags.ignore_auto_status = True

    _sync_repair_qc_spare_parts(repair_qc, required_parts)
    _sync_repair_qc_parts_used(repair_qc, required_parts)

    if repair_qc.is_new():
        repair_qc.insert(ignore_permissions=True)
    else:
        repair_qc.save(ignore_permissions=True)


def _sync_repair_qc_spare_parts(repair_qc, required_parts: Iterable[object]) -> None:
    existing_rows = {}
    for row in getattr(repair_qc, "spare_parts_verification", []) or []:
        item_code = cstr(getattr(row, "item_code", "")).strip().lower()
        if item_code:
            existing_rows[item_code] = row

    repair_qc.set("spare_parts_verification", [])

    for part in required_parts:
        item_code = cstr(getattr(part, "item_code", "")).strip()
        if not item_code:
            continue

        status = cstr(getattr(part, "stock_status", "")).strip().lower()
        if status in PART_REJECTED_STATUSES or status in PART_CANCELLED_STATUSES:
            continue

        existing = existing_rows.get(item_code.lower())
        verified = int(getattr(existing, "verified", 0)) if existing else 0
        repair_qc.append(
            "spare_parts_verification",
            {
                "item_code": item_code,
                "item_name": getattr(part, "item_name", None),
                "qty": flt(getattr(part, "qty", None) or 0) or 1,
                "uom": getattr(part, "uom", None),
                "verified": verified,
            },
        )


def _sync_repair_qc_parts_used(repair_qc, required_parts: Iterable[object]) -> None:
    repair_qc.set("parts_used", [])

    for part in required_parts:
        item_code = cstr(getattr(part, "item_code", "")).strip()
        if not item_code:
            continue
        qty = flt(getattr(part, "qty", None) or 0)
        rate = flt(getattr(part, "rate", None) or 0)
        amount = flt(getattr(part, "amount", None) or 0)
        if not rate and amount and qty:
            rate = amount / qty
        if not rate:
            rate = flt(frappe.db.get_value("Item", item_code, "standard_rate") or 0)
        if not amount and rate and qty:
            amount = rate * qty
        repair_qc.append(
            "parts_used",
            {
                "item_code": item_code,
                "item_name": getattr(part, "item_name", None),
                "description": getattr(part, "description", None),
                "qty": qty,
                "uom": getattr(part, "uom", None),
                "source": getattr(part, "source", None),
                "stock_status": getattr(part, "stock_status", None),
                "linked_procurement": getattr(part, "linked_procurement", None),
                "warehouse": getattr(part, "warehouse", None),
                "rate": rate,
                "amount": amount,
            },
        )
