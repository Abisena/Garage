"""Helpers for syncing Garage Service Order status based on workflow events."""

from __future__ import annotations

from typing import Iterable

import frappe

TERMINAL_STATUSES = {"Completed", "Cancelled"}
STATUS_FLOW = [
    "Draft",
    "Inspection",
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
