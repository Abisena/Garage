"""Frappe API endpoints powering the Garage website workflow portal."""
from __future__ import annotations

from collections import defaultdict
from contextlib import contextmanager
from urllib.parse import quote
import re
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence, Set

import frappe
from frappe import _
from frappe.utils import (
    cint,
    cstr,
    flt,
    get_datetime,
    get_url,
    now_datetime,
    nowdate,
    strip_html_tags,
)

TECHNICIAN_ACTIVE_TASK_STATUSES = {"Pending", "In Progress"}
SERVICE_ORDER_ACTIVE_STATUSES = {
    "Draft",
    "Inspection",
    "Estimate",
    "Awaiting Approval",
    "Approved",
    "Work In Progress",
    "Awaiting QC",
}
TECHNICIAN_ACTIVE_STATUS = {"Active"}
TECHNICIAN_ROLE_NAMES = {"Technician", "Teknisi"}

# Whitelisted DocTypes that can be created/updated from the public portal along with
# the permitted fields. The definition intentionally mirrors the JSON DocType schema
# so the website can drive the same flow as the Desk (Pravenya) implementation.
ALLOWED_DOCS: Mapping[str, Dict[str, Any]] = {
    "Garage Customer": {
        "fields": {
            "customer_name",
            "customer_type",
            "phone",
            "email",
            "preferred_contact_method",
            "id_number",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "marketing_source",
            "is_vip",
            "notes",
        },
        "update_fields": {
            "customer_name",
            "customer_type",
            "phone",
            "email",
            "preferred_contact_method",
            "id_number",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "marketing_source",
            "is_vip",
            "notes",
        },
    },
    "Garage Vehicle": {
        "fields": {
            "customer",
            "license_plate",
            "vin",
            "brand",
            "type_model",
            "model",
            "model_variant",
            "vehicle_year",
            "color",
            "transmission",
            "fuel_type",
            "mileage",
            "engine_number",
            "last_service_date",
            "last_service_logged_at",
            "notes",
        },
        "update_fields": {
            "license_plate",
            "vin",
            "brand",
            "type_model",
            "model",
            "model_variant",
            "vehicle_year",
            "color",
            "transmission",
            "fuel_type",
            "mileage",
            "engine_number",
            "last_service_date",
            "last_service_logged_at",
            "notes",
        },
    },
    "Garage Service Order": {
        "fields": {
            "service_order_type",
            "order_category",
            "status",
            "priority",
            "intake_type",
            "booking_channel",
            "booking_reference",
            "service_booking_date",
            "customer",
            "vehicle",
            "service_advisor",
            "primary_contact",
            "job_card_status",
            "work_order_status",
            "qc_status",
            "estimated_delivery_date",
            "actual_delivery_date",
            "total_estimated_amount",
            "total_approved_amount",
            "approval_date",
            "customer_confirmation",
            "rejection_reason",
            "inspection_summary",
            "service_notes",
        },
        "children": {
            "inspection_items": {
                "fields": {
                    "item",
                    "severity",
                    "findings",
                    "recommended_action",
                    "photo",
                }
            },
            "service_tasks": {
                "fields": {
                    "task",
                    "description",
                    "technician",
                    "estimated_hours",
                    "actual_hours",
                    "status",
                    "completion_date",
                },
                "required_fields": {"task"},
            },
            "required_parts": {
                "fields": {
                    "item_code",
                    "item_name",
                    "description",
                    "qty",
                    "uom",
                    "source",
                    "stock_status",
                    "linked_procurement",
                    "warehouse",
                    "rate",
                    "amount",
                    "discount_amount",
                },
                "required_fields": {"item_code"},
            },
            "progress_logs": {
                "fields": {
                    "log_date",
                    "status",
                    "technician",
                    "percent_complete",
                    "progress_notes",
                }
            },
            "quality_checks": {
                "fields": {
                    "checkpoint",
                    "result",
                    "inspected_by",
                    "inspection_date",
                    "remarks",
                }
            },
            "payment_schedule": {
                "fields": {
                    "due_date",
                    "description",
                    "percentage",
                    "amount",
                    "status",
                }
            },
        },
        "update_fields": {
            "status",
            "priority",
            "job_card_status",
            "work_order_status",
            "qc_status",
            "intake_type",
            "booking_channel",
            "booking_reference",
            "estimated_delivery_date",
            "actual_delivery_date",
            "total_estimated_amount",
            "total_approved_amount",
            "approval_date",
            "customer_confirmation",
            "rejection_reason",
            "inspection_summary",
            "service_notes",
        },
    },
    "Garage Spare Part Order": {
        "fields": {
            "order_date",
            "customer",
            "contact_person",
            "status",
            "pickup_method",
            "delivery_date",
            "warehouse",
            "total_amount",
            "notes",
        },
        "children": {
            "items": {
                "fields": {
                    "item_code",
                    "item_name",
                    "description",
                    "qty",
                    "uom",
                    "rate",
                    "amount",
                    "stock_status",
                }
            }
        },
        "update_fields": {
            "status",
            "pickup_method",
            "delivery_date",
            "warehouse",
            "total_amount",
            "notes",
        },
    },
    "Garage Spare Part": {
        "fields": {
            "part_code",
            "part_name",
            "category",
            "brand",
            "uom",
            "unit_price",
            "stock_qty",
            "reserved_qty",
            "reorder_level",
            "warehouse_location",
            "managed_by",
            "status",
            "last_restocked_on",
            "image",
            "notes",
        },
        "update_fields": {
            "part_name",
            "category",
            "brand",
            "uom",
            "unit_price",
            "stock_qty",
            "reserved_qty",
            "reorder_level",
            "warehouse_location",
            "managed_by",
            "status",
            "last_restocked_on",
            "image",
            "notes",
        },
    },
    "Garage Procurement Order": {
        "fields": {
            "reference_type",
            "reference_name",
            "supplier",
            "status",
            "order_date",
            "expected_date",
            "total_qty",
            "total_amount",
            "remarks",
        },
        "children": {
            "items": {
                "fields": {
                    "item_code",
                    "item_name",
                    "description",
                    "qty",
                    "uom",
                    "rate",
                    "amount",
                    "received_qty",
                    "service_order_ref",
                }
            }
        },
        "update_fields": {
            "status",
            "supplier",
            "expected_date",
            "total_qty",
            "total_amount",
            "remarks",
        },
    },
    "Garage Stock Movement": {
        "fields": {
            "movement_type",
            "reference_type",
            "reference_name",
            "posting_date",
            "posting_time",
            "warehouse",
            "status",
            "remarks",
        },
        "children": {
            "items": {
                "fields": {
                    "item_code",
                    "item_name",
                    "description",
                    "qty",
                    "uom",
                    "source_warehouse",
                    "target_warehouse",
                    "batch_no",
                    "serial_no",
                    "status",
                    "remarks",
                }
            }
        },
        "update_fields": {
            "status",
            "posting_date",
            "posting_time",
            "warehouse",
            "remarks",
        },
    },
    "Garage Sales Invoice": {
        "fields": {
            "invoice_date",
            "customer",
            "source_type",
            "source_name",
            "status",
            "due_date",
            "total_amount",
            "outstanding_amount",
            "notes",
        },
        "children": {
            "items": {
                "fields": {
                    "item_code",
                    "item_name",
                    "description",
                    "qty",
                    "uom",
                    "rate",
                    "amount",
                    "income_account",
                    "cost_center",
                }
            },
            "payment_schedule": {
                "fields": {
                    "due_date",
                    "description",
                    "percentage",
                    "amount",
                    "status",
                }
            },
        },
        "update_fields": {
            "status",
            "due_date",
            "total_amount",
            "outstanding_amount",
            "notes",
        },
    },
    "Garage Payment Entry": {
        "fields": {
            "payment_date",
            "customer",
            "mode_of_payment",
            "reference_no",
            "reference_date",
            "paid_amount",
            "received_amount",
            "status",
            "notes",
        },
        "children": {
            "allocations": {
                "fields": {
                    "invoice",
                    "allocated_amount",
                    "outstanding_before",
                    "outstanding_after",
                }
            }
        },
        "update_fields": {
            "status",
            "mode_of_payment",
            "reference_no",
            "reference_date",
            "received_amount",
            "notes",
        },
    },
    "Garage Receipt Document": {
        "fields": {
            "payment_entry",
            "receipt_date",
            "receipt_number",
            "delivery_method",
            "issued_by",
            "notes",
        },
        "update_fields": {
            "receipt_date",
            "receipt_number",
            "delivery_method",
            "issued_by",
            "notes",
        },
    },
    "Garage Division Request": {
        "fields": {
            "request_title",
            "request_date",
            "reference_type",
            "reference_name",
            "request_scope",
            "requesting_division",
            "target_division",
            "request_purpose",
            "approval_status",
            "requested_by",
            "requested_by_full_name",
            "requesting_head",
            "requesting_head_signature",
            "requesting_head_signed_on",
            "target_head",
            "target_head_signature",
            "target_head_signed_on",
            "source_request_names",
            "notes",
        },
        "children": {
            "items": {
                "fields": {
                    "source_row",
                    "item_code",
                    "item_name",
                    "description",
                    "qty",
                    "uom",
                    "source",
                    "requested_warehouse",
                    "remarks",
                }
            }
        },
        "update_fields": {
            "request_purpose",
            "approval_status",
            "requesting_head",
            "requesting_head_signature",
            "target_head",
            "target_head_signature",
            "notes",
        },
    },
}

SPARE_REQUEST_CLOSED_STATUSES = ["Received", "Issued", "Rejected", "Cancelled"]

DOC_TYPES = tuple(ALLOWED_DOCS.keys())
DEFAULT_LIMIT = 20


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------


def _require_login() -> None:
    if frappe.session.user == "Guest":
        frappe.throw(_("Silakan login untuk mengakses portal Garage."), frappe.PermissionError)


@contextmanager
def _ignoring_permissions():
    """Temporarily bypass DocType permission checks."""

    had_previous = hasattr(frappe.flags, "ignore_permissions")
    previous = getattr(frappe.flags, "ignore_permissions", None)
    frappe.flags.ignore_permissions = True
    try:
        yield
    finally:
        if had_previous:
            frappe.flags.ignore_permissions = previous
        else:
            try:
                delattr(frappe.flags, "ignore_permissions")
            except AttributeError:
                pass


def _ensure_dict(payload: Any) -> MutableMapping[str, Any]:
    data = frappe.parse_json(payload) if isinstance(payload, str) else payload
    if not isinstance(data, MutableMapping):
        frappe.throw(_("Payload harus berupa objek JSON."))
    return data


def _filter_fields(data: Mapping[str, Any], allowed: Iterable[str]) -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    for field in allowed:
        if field in data:
            value = data[field]
            if value not in (None, ""):
                result[field] = value
    return result


def _normalize_license_plate(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z]", "", (value or "").upper())


def _normalized_plate_expression(column: str) -> str:
    expr = f"upper(coalesce({column}, ''))"
    for char in (' ', '-', '.', '/', '_'):
        expr = f"replace({expr}, '{char}', '')"
    return expr


def _find_vehicle_by_plate(license_plate: str, *, fields: Sequence[str] = ("name",)) -> Optional[Dict[str, Any]]:
    normalized = _normalize_license_plate(license_plate or "")
    if not normalized:
        return None

    selected_fields = tuple(dict.fromkeys(fields)) or ("name",)
    columns = ", ".join(f"`tabGarage Vehicle`.`{field}`" for field in selected_fields)
    normalized_expr = _normalized_plate_expression("`tabGarage Vehicle`.license_plate")

    with _ignoring_permissions():
        rows = frappe.db.sql(
            f"""
            select {columns}
            from `tabGarage Vehicle`
            where {normalized_expr} = %s
            order by modified desc
            limit 1
            """,
            normalized,
            as_dict=True,
        )

    if not rows:
        return None

    return rows[0]


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, (list, tuple, set, dict)):
        return len(value) == 0
    return False


def _sanitize_child_rows(table_field: str, rows: Any, config: Mapping[str, Any]) -> List[Dict[str, Any]]:
    if not rows:
        return []
    allowed_fields = config.get("fields", set())
    required_fields = config.get("required_fields", set())
    sanitized: List[Dict[str, Any]] = []
    for row in rows:
        row_data = _ensure_dict(row)
        payload = _filter_fields(row_data, allowed_fields)
        if not payload:
            continue

        if required_fields:
            missing_required = False
            for field in required_fields:
                if _is_blank(row_data.get(field)):
                    missing_required = True
                    break
            if missing_required:
                continue

        sanitized.append(payload)
    return sanitized


def _apply_defaults(doctype: str, doc: frappe.Document) -> None:
    if doctype == "Garage Service Order":
        if not doc.service_booking_date:
            doc.service_booking_date = now_datetime()
        if not doc.status or doc.status in {"", "Draft"}:
            doc.status = "Inspection"
        if not doc.intake_type:
            doc.intake_type = "Walk-In"
        if doc.intake_type != "Booking":
            doc.booking_channel = doc.booking_channel or None
            doc.booking_reference = doc.booking_reference or None
    elif doctype == "Garage Spare Part Order" and not doc.order_date:
        doc.order_date = nowdate()
    elif doctype == "Garage Procurement Order" and not doc.order_date:
        doc.order_date = nowdate()
    elif doctype == "Garage Stock Movement" and not doc.posting_date:
        doc.posting_date = nowdate()
    elif doctype == "Garage Sales Invoice" and not doc.invoice_date:
        doc.invoice_date = nowdate()
    elif doctype == "Garage Payment Entry" and not doc.payment_date:
        doc.payment_date = nowdate()
    elif doctype == "Garage Receipt Document" and not doc.receipt_date:
        doc.receipt_date = nowdate()


def _new_document(doctype: str, data: Mapping[str, Any]) -> frappe.Document:
    config = ALLOWED_DOCS[doctype]
    doc = frappe.new_doc(doctype)
    doc.update(_filter_fields(data, config.get("fields", [])))

    for table_field, child_config in config.get("children", {}).items():
        child_rows = _sanitize_child_rows(table_field, data.get(table_field), child_config)
        for row in child_rows:
            doc.append(table_field, row)

    _apply_defaults(doctype, doc)
    return doc


def _insert_document(doctype: str, data: Mapping[str, Any]) -> frappe.Document:
    doc = _new_document(doctype, data)
    return _insert_doc(doc)


def _update_document(doctype: str, name: str, data: Mapping[str, Any]) -> frappe.Document:
    config = ALLOWED_DOCS[doctype]
    allowed_fields = config.get("update_fields", config.get("fields", []))
    doc = _get_doc(doctype, name)

    updates = _filter_fields(data, allowed_fields)
    for field, value in updates.items():
        if field == "customer_confirmation":
            doc.set(field, cint(value))
        else:
            doc.set(field, value)

    for table_field, child_config in config.get("children", {}).items():
        if table_field in data:
            doc.set(table_field, [])
            child_rows = _sanitize_child_rows(table_field, data.get(table_field), child_config)
            for row in child_rows:
                doc.append(table_field, row)

    _save_doc(doc)
    return doc


def _list_dicts(doctype: str, fields: Iterable[str], *, filters: Optional[Any] = None, limit: int = DEFAULT_LIMIT) -> List[Dict[str, Any]]:
    try:
        with _ignoring_permissions():
            rows = frappe.db.get_all(
                doctype,
                fields=list(fields),
                filters=filters or [],
                order_by="modified desc",
                limit=limit,
            )
    except Exception:
        return []
    return [dict(row) for row in rows]


def _user_display_map(user_ids: Iterable[str]) -> Dict[str, str]:
    unique_ids = sorted({user for user in user_ids if user})
    if not unique_ids:
        return {}

    try:
        with _ignoring_permissions():
            rows = frappe.db.get_all(
                "User",
                filters=[["name", "in", unique_ids]],
                fields=["name", "full_name"],
            )
    except Exception:
        return {user: user for user in unique_ids}

    display_map = {row.get("name"): row.get("full_name") or row.get("name") for row in rows}
    for user in unique_ids:
        display_map.setdefault(user, user)
    return display_map


def _employee_display_map(employee_ids: Iterable[str]) -> Dict[str, str]:
    unique_ids = sorted({emp for emp in employee_ids if emp})
    if not unique_ids:
        return {}

    try:
        with _ignoring_permissions():
            rows = frappe.db.get_all(
                "Employee",
                filters=[["name", "in", unique_ids]],
                fields=["name", "employee_name", "user_id"],
            )
    except Exception:
        return {emp: emp for emp in unique_ids}

    user_display = _user_display_map(row.get("user_id") for row in rows if row.get("user_id"))
    display_map: Dict[str, str] = {}
    for row in rows:
        name = row.get("name")
        user_id = row.get("user_id")
        display_map[name] = (
            row.get("employee_name")
            or (user_display.get(user_id) if user_id else None)
            or user_id
            or name
        )

    for emp in unique_ids:
        display_map.setdefault(emp, emp)

    return display_map


def _get_activity_logs(doc: Any) -> List[Dict[str, Any]]:
    try:
        with _ignoring_permissions():
            rows = frappe.db.get_all(
                "Comment",
                filters={
                    "reference_doctype": doc.doctype,
                    "reference_name": doc.name,
                    "comment_type": ["in", ["Comment", "Info", "Edit"]],
                },
                fields=["name", "owner", "creation", "comment_type", "content"],
                order_by="creation desc",
                limit=50,
            )
    except Exception:
        return []

    user_map = _user_display_map(row.get("owner") for row in rows)
    logs: List[Dict[str, Any]] = []

    for row in rows:
        logs.append(
            {
                "id": row.get("name"),
                "owner": row.get("owner"),
                "owner_name": user_map.get(row.get("owner"), row.get("owner")),
                "timestamp": row.get("creation"),
                "type": row.get("comment_type"),
                "message": strip_html_tags(row.get("content") or ""),
            }
        )

    return logs


def _technician_load_map(exclude_order: Optional[str] = None) -> Dict[str, int]:
    statuses = tuple(TECHNICIAN_ACTIVE_TASK_STATUSES)
    order_statuses = tuple(SERVICE_ORDER_ACTIVE_STATUSES)
    if not statuses:
        return {}

    status_placeholders = ", ".join(["%s"] * len(statuses))
    order_placeholders = ", ".join(["%s"] * len(order_statuses)) if order_statuses else ""

    conditions = [
        "task.parenttype = 'Garage Service Order'",
        "COALESCE(task.technician, '') != ''",
        f"task.status in ({status_placeholders})",
    ]
    params: List[Any] = list(statuses)

    if order_placeholders:
        conditions.append(f"so.status in ({order_placeholders})")
        params.extend(order_statuses)

    if exclude_order:
        conditions.append("task.parent != %s")
        params.append(exclude_order)

    query = f"""
        select task.technician, count(*) as total
        from `tabGarage Service Order Task` task
        inner join `tabGarage Service Order` so on so.name = task.parent
        where {' and '.join(conditions)}
        group by task.technician
    """

    try:
        with _ignoring_permissions():
            rows = frappe.db.sql(query, tuple(params))
    except Exception:
        return {}

    return {row[0]: cint(row[1]) for row in rows if row and row[0]}


def _update_roster_capacity(technician: MutableMapping[str, Any]) -> None:
    max_jobs = cint(technician.get("max_active_jobs") or 0)
    load = cint(technician.get("active_task_count") or 0)
    technician["available_capacity"] = max(0, max_jobs - load) if max_jobs else None
    technician["is_available"] = (
        technician.get("status") in TECHNICIAN_ACTIVE_STATUS
        and (max_jobs == 0 or load < max_jobs)
    )


def _get_technician_roster(*, only_active: bool = False, exclude_order: Optional[str] = None) -> List[Dict[str, Any]]:
    filters = [["status", "=", "Active"]] if only_active else None

    try:
        roster = _list_dicts(
            "Garage Technician",
            [
                "name",
                "employee",
                "employee_name",
                "user_id",
                "status",
                "max_active_jobs",
                "skill_tags",
                "phone",
                "email",
                "notes",
            ],
            filters=filters,
            limit=200,
        )
    except Exception:
        return []

    roster = _merge_technicians_with_role_assignments(roster, only_active=only_active)

    loads = _technician_load_map(exclude_order=exclude_order)
    for technician in roster:
        employee = technician.get("employee") or technician.get("name")
        technician["active_task_count"] = loads.get(employee, 0)
        _update_roster_capacity(technician)

    return roster


def _merge_technicians_with_role_assignments(
    roster: List[Dict[str, Any]], *, only_active: bool
) -> List[Dict[str, Any]]:
    employees_in_roster = {
        entry.get("employee") or entry.get("name") for entry in roster if entry.get("employee") or entry.get("name")
    }

    fallback_profiles = _technician_profiles_from_roles(
        exclude_employees=employees_in_roster, only_active=only_active
    )

    if not fallback_profiles:
        return roster

    return roster + fallback_profiles


def _technician_profiles_from_roles(
    *, exclude_employees: Set[str], only_active: bool
) -> List[Dict[str, Any]]:
    users_with_roles = _technician_role_user_ids()
    if not users_with_roles:
        return []

    try:
        with _ignoring_permissions():
            employee_filters: Dict[str, Any] = {
                "user_id": ("in", list(users_with_roles)),
            }
            if only_active:
                employee_filters["status"] = "Active"

            employees = frappe.db.get_all(
                "Employee",
                fields=[
                    "name",
                    "employee_name",
                    "user_id",
                    "status",
                    "cell_number",
                    "company_email",
                ],
                filters=employee_filters,
                limit=200,
            )
    except Exception:
        return []

    fallback: List[Dict[str, Any]] = []
    for employee in employees:
        identifier = employee.get("name")
        if not identifier or identifier in exclude_employees:
            continue

        raw_status = (employee.get("status") or "").strip()
        normalized_status = (
            raw_status
            if raw_status in {"Active", "On Leave", "Inactive"}
            else ("Active" if raw_status.lower() == "active" else "Inactive")
        )

        fallback.append(
            {
                "name": identifier,
                "employee": identifier,
                "employee_name": employee.get("employee_name") or identifier,
                "user_id": employee.get("user_id"),
                "status": normalized_status or "Active",
                "max_active_jobs": 3,
                "skill_tags": "",
                "phone": employee.get("cell_number"),
                "email": employee.get("company_email"),
                "notes": "",
            }
        )

    return fallback


def _technician_role_user_ids() -> Set[str]:
    if not TECHNICIAN_ROLE_NAMES:
        return set()

    try:
        with _ignoring_permissions():
            rows = frappe.db.get_all(
                "Has Role",
                fields=["parent"],
                filters={
                    "parenttype": "User",
                    "role": ("in", tuple(TECHNICIAN_ROLE_NAMES)),
                },
                limit=200,
            )
    except Exception:
        return set()

    return {row.get("parent") for row in rows if row.get("parent")}


def _auto_assign_technicians(
    tasks: List[Dict[str, Any]],
    *,
    current_order: Optional[str] = None,
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    if not tasks:
        return tasks, []

    roster = _get_technician_roster(only_active=False, exclude_order=current_order)
    if not roster:
        return tasks, []

    roster_by_employee = {
        (tech.get("employee") or tech.get("name")): tech for tech in roster if tech.get("employee") or tech.get("name")
    }

    loads = {
        employee: cint(meta.get("active_task_count") or 0) for employee, meta in roster_by_employee.items()
    }

    for task in tasks:
        technician = task.get("technician")
        if technician:
            loads[technician] = loads.get(technician, 0) + 1
            meta = roster_by_employee.get(technician)
            if meta:
                meta["active_task_count"] = loads[technician]
                _update_roster_capacity(meta)

    auto_assigned: List[Dict[str, Any]] = []

    for task in tasks:
        if task.get("technician"):
            continue

        candidates = []
        for employee, meta in roster_by_employee.items():
            if meta.get("status") not in TECHNICIAN_ACTIVE_STATUS:
                continue

            max_jobs = cint(meta.get("max_active_jobs") or 0)
            current_load = loads.get(employee, 0)
            if max_jobs and current_load >= max_jobs:
                continue

            candidates.append(
                (
                    current_load,
                    meta.get("employee_name") or employee,
                    employee,
                )
            )

        if not candidates:
            continue

        candidates.sort()
        chosen_employee = candidates[0][2]
        task["technician"] = chosen_employee
        loads[chosen_employee] = loads.get(chosen_employee, 0) + 1
        meta = roster_by_employee.get(chosen_employee)
        if meta:
            meta["active_task_count"] = loads[chosen_employee]
            _update_roster_capacity(meta)

        auto_assigned.append(
            {
                "task": task.get("task"),
                "technician": chosen_employee,
            }
        )

    return tasks, auto_assigned


def _group_status(doctype: str) -> Dict[str, int]:
    try:
        with _ignoring_permissions():
            rows = frappe.db.get_all(
                doctype,
                fields=["status", "count(*) as total"],
                group_by="status",
                order_by="total desc",
                ignore_permissions=True,
            )
    except Exception:
        return {}
    return {row.get("status") or "Unknown": cint(row.get("total") or 0) for row in rows}


def _sum_field(doctype: str, field: str, filters: Optional[Any] = None) -> float:
    try:
        with _ignoring_permissions():
            result = frappe.db.get_all(
                doctype,
                filters=filters or [],
                fields=[f"sum({field}) as total"],
                ignore_permissions=True,
            )
    except Exception:
        return 0.0
    if result:
        return flt(result[0].get("total") or 0)
    return 0.0


def _get_doc(doctype: str, name: str) -> frappe.Document:
    with _ignoring_permissions():
        return frappe.get_doc(doctype, name)


def _insert_doc(doc: frappe.Document) -> frappe.Document:
    with _ignoring_permissions():
        doc.insert(ignore_permissions=True)
    return doc


def _save_doc(doc: frappe.Document) -> frappe.Document:
    with _ignoring_permissions():
        doc.save(ignore_permissions=True)
    return doc


def _desk_route(doctype: str) -> Dict[str, str]:
    slug = frappe.scrub(doctype)
    return {
        "list": f"/app/{slug}",
        "form": f"/app/{slug}/{{name}}",
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


@frappe.whitelist()
def portal_bootstrap() -> Dict[str, Any]:
    """Return aggregated data for the Garage website portal dashboard."""

    _require_login()

    customers = _list_dicts(
        "Garage Customer",
        [
            "name",
            "customer_name",
            "customer_type",
            "phone",
            "email",
            "preferred_contact_method",
            "marketing_source",
            "is_vip",
        ],
        limit=100,
    )
    vehicle_fields = [
        "name",
        "customer",
        "license_plate",
        "vin",
        "brand",
        "type_model",
        "model",
        "model_variant",
        "vehicle_year",
        "color",
        "transmission",
        "fuel_type",
        "mileage",
        "engine_number",
        "last_service_date",
        "creation",
    ]
    if frappe.db.has_column("Garage Vehicle", "last_service_logged_at"):
        vehicle_fields.append("last_service_logged_at")
    vehicles = _list_dicts(
        "Garage Vehicle",
        vehicle_fields,
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
            "service_notes",
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
            "service_notes",
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
    spare_parts = _list_dicts(
        "Garage Spare Part",
        [
            "name",
            "part_code",
            "part_name",
            "category",
            "brand",
            "uom",
            "unit_price",
            "stock_qty",
            "reserved_qty",
            "reorder_level",
            "warehouse_location",
            "managed_by",
            "status",
            "last_restocked_on",
            "image",
            "notes",
        ],
        limit=200,
    )
    spare_part_requests = _list_dicts(
        "Garage Service Order Part",
        [
            "name",
            "parent",
            "idx",
            "item_code",
            "item_name",
            "description",
            "qty",
            "uom",
            "rate",
            "amount",
            "stock_status",
            "warehouse",
            "source",
        ],
        filters=[
            ["parenttype", "=", "Garage Service Order"],
            ["stock_status", "not in", SPARE_REQUEST_CLOSED_STATUSES],
        ],
        limit=200,
    )
    service_tasks = _list_dicts(
        "Garage Service Order Task",
        ["name", "parent", "task", "status", "technician"],
        filters=[["parenttype", "=", "Garage Service Order"]],
        limit=500,
    )

    technician_ids: Set[str] = set()
    tasks_by_order: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for task in service_tasks:
        parent = task.get("parent")
        if not parent:
            continue
        technician = task.get("technician")
        if technician:
            technician_ids.add(technician)
        tasks_by_order[parent].append(task)

    technician_display = _employee_display_map(technician_ids)
    for request in spare_part_requests:
        parent = request.get("parent")
        if not parent:
            continue
        technicians = []
        for task in tasks_by_order.get(parent, []):
            technician = task.get("technician")
            if technician:
                technicians.append(
                    {
                        "technician": technician,
                        "technician_name": technician_display.get(technician, technician),
                        "task": task.get("task"),
                        "status": task.get("status"),
                    }
                )
        if technicians:
            request["technicians"] = technicians
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
        "spare_parts": spare_parts,
        "spare_part_requests": spare_part_requests,
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


@frappe.whitelist()
def lookup_vehicle_by_plate(license_plate: Optional[str] = None) -> Dict[str, Any]:
    """Look up a single vehicle (and its customer) by license plate."""

    _require_login()
    normalized = _normalize_license_plate(license_plate or "")
    if not normalized:
        return {}

    vehicle_fields = [
        "name",
        "customer",
        "license_plate",
        "vin",
        "brand",
        "type_model",
        "model",
        "model_variant",
        "vehicle_year",
        "color",
        "transmission",
        "fuel_type",
        "mileage",
        "engine_number",
        "last_service_date",
    ]
    if frappe.db.has_column("Garage Vehicle", "last_service_logged_at"):
        vehicle_fields.append("last_service_logged_at")

    columns = ", ".join(f"`tabGarage Vehicle`.{field}" for field in vehicle_fields)
    normalized_expr = _normalized_plate_expression("`tabGarage Vehicle`.license_plate")

    with _ignoring_permissions():
        rows = frappe.db.sql(
            f"""
            select {columns}
            from `tabGarage Vehicle`
            where {normalized_expr} = %s
            order by modified desc
            limit 1
            """,
            normalized,
            as_dict=True,
        )

    if not rows:
        return {}

    vehicle = rows[0]
    customer_doc: Optional[Dict[str, Any]] = None
    customer_name = vehicle.get("customer")

    if customer_name:
        customer_fields = [
            "name",
            "customer_name",
            "customer_type",
            "phone",
            "email",
            "preferred_contact_method",
            "marketing_source",
            "is_vip",
        ]
        with _ignoring_permissions():
            customer_doc = frappe.db.get_value(
                "Garage Customer",
                customer_name,
                customer_fields,
                as_dict=True,
            )
        if customer_doc:
            # ``frappe.db.get_value`` may omit the primary key when ``as_dict`` is
            # used.  The client-side helpers rely on ``customer.name`` to register
            # and prefill the customer details, so make sure the identifier is
            # always present.
            customer_doc = dict(customer_doc)
            customer_doc.setdefault("name", customer_name)

    return {"vehicle": vehicle, "customer": customer_doc}

# ============================================================================
# SERVICE MANAGEMENT API ENDPOINTS - FIXED VERSION
# Tambahkan code ini ke file portal.py yang sudah ada
# ============================================================================

@frappe.whitelist()
def list_service_orders(filters: Optional[Any] = None) -> Dict[str, Any]:
    """List all service orders with filtering and categorization."""
    
    _require_login()
    
    filter_dict = _ensure_dict(filters or {})
    
    # Base fields to fetch
    fields = [
        "name",
        "status",
        "service_order_type",
        "order_category",
        "priority",
        "intake_type",
        "booking_channel",
        "booking_reference",
        "customer",
        "vehicle",
        "service_booking_date",
        "estimated_delivery_date",
        "actual_delivery_date",
        "total_estimated_amount",
        "total_approved_amount",
        "inspection_summary",
        "service_notes",
        "job_card_status",
        "work_order_status",
        "qc_status",
        "creation",
        "modified"
    ]
    
    # Build filters
    db_filters = {}
    
    # Add status filter if provided
    if filter_dict.get("status"):
        db_filters["status"] = filter_dict["status"]
    
    # Add date range filter if provided
    if filter_dict.get("from_date"):
        db_filters["creation"] = [">=", filter_dict["from_date"]]
    
    if filter_dict.get("to_date"):
        if "creation" in db_filters:
            db_filters["creation"] = [
                [">=", filter_dict["from_date"]],
                ["<=", filter_dict["to_date"]]
            ]
        else:
            db_filters["creation"] = ["<=", filter_dict["to_date"]]
    
    # Fetch service orders
    try:
        orders = frappe.get_all(
            "Garage Service Order",
            filters=db_filters,
            fields=fields,
            order_by="creation desc",
            limit_page_length=100
        )
    except Exception as e:
        frappe.log_error(f"Error fetching service orders: {str(e)}")
        return {
            "orders": [],
            "total_count": 0,
            "error": str(e)
        }
    
    # Enrich with related data
    enriched_orders = []
    
    current_timestamp = now_datetime()

    for order in orders:
        intake_type = (order.get("intake_type") or "Walk-In").strip() or "Walk-In"
        if intake_type not in {"Walk-In", "Booking"}:
            intake_type = "Walk-In"
        order["intake_type"] = intake_type
        if intake_type != "Booking":
            order["booking_channel"] = order.get("booking_channel") or None
            order["booking_reference"] = order.get("booking_reference") or None
        booking_dt = None
        if intake_type == "Booking" and order.get("service_booking_date"):
            try:
                booking_dt = get_datetime(order.get("service_booking_date"))
            except Exception:
                booking_dt = None
        if booking_dt:
            delta_hours = (booking_dt - current_timestamp).total_seconds() / 3600.0
            if delta_hours < -2:
                order["booking_window"] = "overdue"
            elif delta_hours < 0:
                order["booking_window"] = "arriving"
            elif delta_hours <= 2:
                order["booking_window"] = "due"
            elif delta_hours <= 24:
                order["booking_window"] = "upcoming"
            else:
                order["booking_window"] = "scheduled"
            order["hours_until_booking"] = delta_hours

        # Get customer info
        if order.get("customer"):
            try:
                customer = frappe.db.get_value(
                    "Garage Customer",
                    order["customer"],
                    ["customer_name", "phone", "email"],
                    as_dict=True
                )
                if customer:
                    order["customer_name"] = customer.get("customer_name")
                    order["customer_phone"] = customer.get("phone")
                    order["customer_email"] = customer.get("email")
            except Exception:
                pass  # Skip if customer not found
        
        # Get vehicle info
        if order.get("vehicle"):
            try:
                vehicle = frappe.db.get_value(
                    "Garage Vehicle",
                    order["vehicle"],
                    [
                        "license_plate",
                        "brand",
                        "type_model",
                        "model",
                        "vehicle_year",
                        "vin",
                        "engine_number",
                    ],
                    as_dict=True
                )
                if vehicle:
                    order["vehicle_plate"] = vehicle.get("license_plate")
                    order["vehicle_brand"] = vehicle.get("brand")
                    order["vehicle_type_model"] = vehicle.get("type_model")
                    order["vehicle_model"] = vehicle.get("model")
                    order["vehicle_model_variant"] = vehicle.get("model_variant")
                    order["vehicle_year"] = vehicle.get("vehicle_year")
                    order["vehicle_vin"] = vehicle.get("vin")
                    order["vehicle_engine_number"] = vehicle.get("engine_number")
            except Exception:
                pass  # Skip if vehicle not found
        
        # Count related items - with error handling for missing tables
        order["technician_count"] = 0
        order["parts_count"] = 0
        order["tasks_count"] = 0
        
        # Try to count service tasks
        try:
            # Check if table exists first
            if frappe.db.table_exists("Garage Service Task"):
                order["tasks_count"] = frappe.db.count(
                    "Garage Service Task",
                    {"parent": order["name"], "parenttype": "Garage Service Order"}
                )
        except Exception:
            pass
        
        # Try to count required parts
        try:
            if frappe.db.table_exists("Garage Required Part"):
                order["parts_count"] = frappe.db.count(
                    "Garage Required Part",
                    {"parent": order["name"], "parenttype": "Garage Service Order"}
                )
        except Exception:
            pass
        
        # Technician count - dari service tasks yang punya technician
        try:
            if frappe.db.table_exists("Garage Service Task"):
                # Count distinct technicians from tasks
                result = frappe.db.sql("""
                    SELECT COUNT(DISTINCT technician) 
                    FROM `tabGarage Service Task` 
                    WHERE parent = %s 
                    AND parenttype = 'Garage Service Order'
                    AND technician IS NOT NULL
                    AND technician != ''
                """, (order["name"],))
                
                if result and result[0][0]:
                    order["technician_count"] = result[0][0]
        except Exception:
            pass
        
        enriched_orders.append(order)
    
    return {
        "orders": enriched_orders,
        "total_count": len(enriched_orders)
    }
    
@frappe.whitelist()
def list_spare_parts(filters: Optional[Any] = None) -> Dict[str, Any]:
    """
    List all spare parts with filtering and search capabilities.
    
    Args:
        filters: Optional filters dict with keys:
            - search: Search term for part_code, part_name, or brand
            - category: Filter by category
            - status: Filter by status (Active/Inactive/Low Stock)
            - min_stock: Show only items with stock_qty >= this value
            - max_stock: Show only items with stock_qty <= this value
            
    Returns:
        Dict containing:
            - spare_parts: List of spare part records
            - total_count: Total number of records
            - active_count: Number of active parts
            - low_stock_count: Number of parts below reorder level
    """
    _require_login()
    
    data = _ensure_dict(filters or {})
    
    # Build filters
    filter_conditions = []
    
    # Status filter
    if data.get("status"):
        if data["status"] == "Low Stock":
            # Special handling for low stock - will be filtered after query
            pass
        else:
            filter_conditions.append(["status", "=", data["status"]])
    
    # Category filter
    if data.get("category"):
        filter_conditions.append(["category", "=", data["category"]])
    
    # Stock range filters
    if data.get("min_stock"):
        filter_conditions.append(["stock_qty", ">=", data["min_stock"]])
    
    if data.get("max_stock"):
        filter_conditions.append(["stock_qty", "<=", data["max_stock"]])
    
    # Get all spare parts
    spare_parts = _list_dicts(
        "Garage Spare Part",
        [
            "name",
            "part_code",
            "part_name",
            "category",
            "brand",
            "uom",
            "unit_price",
            "stock_qty",
            "reserved_qty",
            "reorder_level",
            "warehouse_location",
            "managed_by",
            "status",
            "last_restocked_on",
            "image",
            "notes",
        ],
        filters=filter_conditions if filter_conditions else None,
        limit=500,
    )

    # Fetch open spare part requests from service orders so the portal can
    # surface new needs from the workshop.
    spare_part_requests = _list_dicts(
        "Garage Service Order Part",
        [
            "name",
            "parent",
            "idx",
            "item_code",
            "item_name",
            "description",
            "qty",
            "uom",
            "rate",
            "amount",
            "stock_status",
            "warehouse",
            "source",
        ],
        filters=[
            ["parenttype", "=", "Garage Service Order"],
            ["stock_status", "not in", SPARE_REQUEST_CLOSED_STATUSES],
        ],
        limit=200,
    )

    # Enrich requests with service order context and technician information to
    # make the UI rendering straightforward.
    parent_order_names = sorted(
        {request.get("parent") for request in spare_part_requests if request.get("parent")}
    )
    service_order_map: Dict[str, Dict[str, Any]] = {}
    if parent_order_names:
        service_orders = _list_dicts(
            "Garage Service Order",
            ["name", "customer", "vehicle", "priority", "service_advisor"],
            filters=[["name", "in", parent_order_names]],
            limit=len(parent_order_names),
        )
        service_order_map = {row.get("name"): row for row in service_orders}

        service_tasks = _list_dicts(
            "Garage Service Order Task",
            ["name", "parent", "task", "status", "technician"],
            filters=[["parent", "in", parent_order_names]],
            limit=500,
        )

        technician_ids = sorted(
            {task.get("technician") for task in service_tasks if task.get("technician")}
        )
        technician_display = _employee_display_map(technician_ids)

        tasks_by_parent: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for task in service_tasks:
            parent = task.get("parent")
            if parent:
                tasks_by_parent[parent].append(task)

        for request in spare_part_requests:
            parent = request.get("parent")
            if not parent:
                continue

            order_info = service_order_map.get(parent, {})
            request["service_customer"] = order_info.get("customer")
            request["service_vehicle"] = order_info.get("vehicle")
            request["service_priority"] = order_info.get("priority")
            request["service_advisor"] = order_info.get("service_advisor")

            technicians: List[Dict[str, Any]] = []
            for task in tasks_by_parent.get(parent, []):
                technician = task.get("technician")
                if not technician:
                    continue
                technicians.append(
                    {
                        "technician": technician,
                        "technician_name": technician_display.get(technician, technician),
                        "task": task.get("task"),
                        "status": task.get("status"),
                    }
                )
            if technicians:
                request["technicians"] = technicians

    # Apply search filter if provided
    search_term = (data.get("search") or "").strip().lower()
    if search_term:
        spare_parts = [
            part for part in spare_parts
            if search_term in (part.get("part_code") or "").lower()
            or search_term in (part.get("part_name") or "").lower()
            or search_term in (part.get("brand") or "").lower()
        ]
    
    # Filter low stock items if requested
    if data.get("status") == "Low Stock":
        spare_parts = [
            part for part in spare_parts
            if flt(part.get("stock_qty", 0)) <= flt(part.get("reorder_level", 0))
        ]
    
    # Calculate statistics
    active_parts = [p for p in spare_parts if p.get("status") == "Active"]
    low_stock_parts = [
        p for p in spare_parts
        if flt(p.get("stock_qty", 0)) <= flt(p.get("reorder_level", 0))
    ]

    return {
        "spare_parts": spare_parts,
        "spare_part_requests": spare_part_requests,
        "total_count": len(spare_parts),
        "active_count": len(active_parts),
        "low_stock_count": len(low_stock_parts),
        "request_count": len(spare_part_requests),
    }


# JUGA TAMBAHKAN FUNGSI INI UNTUK MENDAPATKAN STATISTIK SPARE PART

@frappe.whitelist()
def get_spare_part_stats() -> Dict[str, Any]:
    """
    Get spare part statistics for dashboard.
    
    Returns:
        Dict containing:
            - total_parts: Total number of spare parts
            - active_parts: Number of active parts
            - low_stock_parts: Number of parts below reorder level
            - out_of_stock_parts: Number of parts with zero stock
            - total_stock_value: Total value of all stock
    """
    _require_login()
    
    # Get all spare parts
    spare_parts = _list_dicts(
        "Garage Spare Part",
        [
            "name",
            "status",
            "stock_qty",
            "reserved_qty",
            "reorder_level",
            "unit_price",
        ],
        limit=1000,
    )
    
    # Calculate statistics
    total_parts = len(spare_parts)
    active_parts = len([p for p in spare_parts if p.get("status") == "Active"])
    
    low_stock_parts = len([
        p for p in spare_parts
        if flt(p.get("stock_qty", 0)) <= flt(p.get("reorder_level", 0))
        and flt(p.get("stock_qty", 0)) > 0
    ])
    
    out_of_stock_parts = len([
        p for p in spare_parts
        if flt(p.get("stock_qty", 0)) == 0
    ])
    
    # Calculate total stock value
    total_stock_value = sum(
        flt(p.get("stock_qty", 0)) * flt(p.get("unit_price", 0))
        for p in spare_parts
    )
    
    return {
        "total_parts": total_parts,
        "active_parts": active_parts,
        "low_stock_parts": low_stock_parts,
        "out_of_stock_parts": out_of_stock_parts,
        "total_stock_value": total_stock_value,
    }


@frappe.whitelist()
def get_service_order_details(order_id: str) -> Dict[str, Any]:
    '''
    Get detailed information about a service order including:
    - Order details
    - Customer details  
    - Vehicle details
    - Service tasks
    - Required parts
    - Available spare parts catalog
    '''
    
    _require_login()
    
    if not order_id:
        frappe.throw(_("Service Order ID diperlukan."))
    
    # Get service order document
    doc = _get_doc("Garage Service Order", order_id)
    
    # Build result
    result = {
        "name": doc.name,
        "status": doc.status,
        "customer": doc.customer,
        "vehicle": doc.vehicle,
        "service_order_type": doc.service_order_type,
        "order_category": doc.order_category,
        "priority": doc.priority,
        "intake_type": doc.intake_type,
        "booking_channel": doc.booking_channel,
        "booking_reference": doc.booking_reference,
        "service_booking_date": doc.service_booking_date,
        "estimated_delivery_date": doc.estimated_delivery_date,
        "actual_delivery_date": doc.actual_delivery_date,
        "total_estimated_amount": doc.total_estimated_amount,
        "total_approved_amount": doc.total_approved_amount,
        "inspection_summary": doc.inspection_summary,
        "service_notes": doc.service_notes,
        "job_card_status": doc.job_card_status,
        "work_order_status": doc.work_order_status,
        "qc_status": doc.qc_status,
    }
    
    # Get customer details
    if doc.customer:
        try:
            customer = frappe.get_doc("Garage Customer", doc.customer)
            result["customer_details"] = {
                "name": customer.name,
                "customer_name": customer.customer_name,
                "customer_type": customer.customer_type,
                "phone": customer.phone,
                "email": customer.email,
                "is_vip": customer.is_vip
            }
        except Exception:
            pass
    
    # Get vehicle details
    if doc.vehicle:
        try:
            vehicle = frappe.get_doc("Garage Vehicle", doc.vehicle)
            result["vehicle_details"] = {
                "name": vehicle.name,
                "license_plate": vehicle.license_plate,
                "brand": vehicle.brand,
                "type_model": vehicle.type_model,
                "model": vehicle.model,
                "vehicle_year": vehicle.vehicle_year,
                "color": vehicle.color,
                "transmission": vehicle.transmission,
                "fuel_type": vehicle.fuel_type,
                "mileage": vehicle.mileage,
                "vin": vehicle.vin,
                "engine_number": vehicle.engine_number,
            }
        except Exception:
            pass
    
    # Get child table data
    try:
        if hasattr(doc, "service_tasks") and doc.service_tasks:
            tasks = [task.as_dict() for task in doc.service_tasks]
            technician_display = _employee_display_map(
                task.get("technician") for task in tasks if task.get("technician")
            )
            for task in tasks:
                technician = task.get("technician")
                if technician:
                    task["technician_name"] = technician_display.get(technician, technician)
            result["service_tasks"] = tasks
    except Exception:
        pass
    
    try:
        if hasattr(doc, "required_parts") and doc.required_parts:
            result["required_parts"] = [part.as_dict() for part in doc.required_parts]
    except Exception:
        pass
    
    try:
        if hasattr(doc, "payment_schedule") and doc.payment_schedule:
            result["payment_schedule"] = [payment.as_dict() for payment in doc.payment_schedule]
    except Exception:
        pass

    try:
        if hasattr(doc, "progress_logs") and doc.progress_logs:
            logs = [log.as_dict() for log in doc.progress_logs]
            technician_display = _employee_display_map(
                log.get("technician") for log in logs if log.get("technician")
            )
            for log in logs:
                technician = log.get("technician")
                if technician:
                    log["technician_name"] = technician_display.get(technician, technician)
            result["progress_logs"] = logs
    except Exception:
        pass

    result["activity_logs"] = _get_activity_logs(doc)

    # ========== CRITICAL: GET AVAILABLE SPARE PARTS ==========
    # This is needed for the dropdown in inspection page
    result["available_spare_parts"] = _list_dicts(
        "Garage Spare Part",
        [
            "name",
            "part_code",
            "part_name",
            "category",
            "brand",
            "uom",
            "unit_price",
            "stock_qty",
            "reserved_qty",
            "reorder_level",
            "warehouse_location",
            "managed_by",
            "status",
            "last_restocked_on",
            "image",
            "notes",
        ],
        filters=[["status", "=", "Active"]],
        limit=200,
    )
    # =========================================================

    result["available_technicians"] = _get_technician_roster()

    return result

@frappe.whitelist(allow_guest=True)
def update_service_order_inspection(order_id: str, inspection_data: Optional[Any] = None) -> Dict[str, Any]:
    """Update service order with inspection and planning details."""
    
    _require_login()
    
    if not order_id:
        frappe.throw(_("Service Order ID diperlukan."))
    
    data = _ensure_dict(inspection_data or {})
    
    auto_assignments: List[Dict[str, Any]] = []

    # Get the document
    doc = _get_doc("Garage Service Order", order_id)
    
    # Update main fields
    allowed_fields = {
        "service_order_type",
        "order_category",
        "priority",
        "estimated_delivery_date",
        "total_estimated_amount",
        "inspection_summary",
        "service_notes"
    }
    
    for field, value in data.items():
        if field in allowed_fields and value is not None:
            setattr(doc, field, value)
    
    status_update = data.get("status")
    if status_update:
        allowed_statuses = {
            "Draft",
            "Inspection",
            "Estimate",
            "Awaiting Approval",
            "Approved",
            "Work In Progress",
            "Awaiting QC",
            "Completed",
            "Cancelled",
        }
        if status_update not in allowed_statuses:
            frappe.throw(_("Status {0} tidak diperbolehkan untuk inspeksi.").format(status_update))

        doc.status = status_update

        if status_update == "Work In Progress" and hasattr(doc, "job_card_status"):
            doc.job_card_status = "Work In Progress"

        if status_update == "Awaiting QC" and hasattr(doc, "qc_status"):
            doc.qc_status = "Pending"
    
    # Handle child tables if provided - with error handling
    if "inspection_items" in data:
        try:
            if hasattr(doc, "inspection_items"):
                doc.inspection_items = []
                for item in data["inspection_items"]:
                    doc.append("inspection_items", item)
        except Exception as e:
            frappe.log_error(f"Error updating inspection_items: {str(e)}")
    
    if "service_tasks" in data:
        try:
            if hasattr(doc, "service_tasks"):
                doc.service_tasks = []
                child_config = ALLOWED_DOCS["Garage Service Order"]["children"]["service_tasks"]
                tasks = _sanitize_child_rows("service_tasks", data["service_tasks"], child_config)
                tasks, auto_assignments = _auto_assign_technicians(tasks, current_order=doc.name)
                for task in tasks:
                    doc.append("service_tasks", task)
        except Exception as e:
            frappe.log_error(f"Error updating service_tasks: {str(e)}")

    if "required_parts" in data:
        try:
            if hasattr(doc, "required_parts"):
                doc.required_parts = []
                child_config = ALLOWED_DOCS["Garage Service Order"]["children"]["required_parts"]
                parts = _sanitize_child_rows("required_parts", data["required_parts"], child_config)
                for part in parts:
                    doc.append("required_parts", part)
        except Exception as e:
            frappe.log_error(f"Error updating required_parts: {str(e)}")
    
    if "payment_schedule" in data:
        try:
            if hasattr(doc, "payment_schedule"):
                doc.payment_schedule = []
                for payment in data["payment_schedule"]:
                    doc.append("payment_schedule", payment)
        except Exception as e:
            frappe.log_error(f"Error updating payment_schedule: {str(e)}")
    
    # Save document
    _save_doc(doc)
    
    response = {
        "name": doc.name,
        "status": doc.status,
        "message": _("Inspection data berhasil disimpan."),
        "available_technicians": _get_technician_roster(),
    }

    if auto_assignments:
        response["auto_assignments"] = auto_assignments

    return response


@frappe.whitelist()
def move_to_in_progress(order_id: str) -> Dict[str, Any]:
    """Move service order from inspection planning stages into execution."""
    
    _require_login()
    
    if not order_id:
        frappe.throw(_("Service Order ID diperlukan."))
    
    doc = _get_doc("Garage Service Order", order_id)
    
    # Validate current status
    if doc.status not in ["Inspection", "Estimate", "Awaiting Approval", "Approved"]:
        frappe.throw(_("Service order harus dalam status Inspection atau persiapan sebelum dikerjakan."))

    # Update status
    doc.status = "Work In Progress"
    if hasattr(doc, "job_card_status"):
        doc.job_card_status = "Work In Progress"
    
    _save_doc(doc)
    
    return {
        "name": doc.name,
        "status": doc.status,
        "message": _("Service order berhasil dipindah ke In Progress.")
    }


@frappe.whitelist()
def complete_service_order(order_id: str, completion_data: Optional[Any] = None) -> Dict[str, Any]:
    """Mark service order as completed."""
    
    _require_login()
    
    if not order_id:
        frappe.throw(_("Service Order ID diperlukan."))
    
    data = _ensure_dict(completion_data or {})
    
    doc = _get_doc("Garage Service Order", order_id)
    
    # Validate current status
    if doc.status != "Awaiting QC":
        frappe.throw(_("Service order harus dalam status Awaiting QC sebelum diselesaikan."))
    
    # Update status
    doc.status = "Completed"
    if hasattr(doc, "job_card_status"):
        doc.job_card_status = "Completed"
    if hasattr(doc, "qc_status"):
        doc.qc_status = "Passed"
    
    doc.actual_delivery_date = data.get("actual_delivery_date") or nowdate()
    
    # Update approved amount if provided
    if data.get("total_approved_amount"):
        doc.total_approved_amount = data.get("total_approved_amount")
        if hasattr(doc, "approval_date"):
            doc.approval_date = nowdate()
    
    # Add completion notes if provided
    if data.get("completion_notes"):
        if doc.service_notes:
            doc.service_notes += f"\n\n[Completion] {data.get('completion_notes')}"
        else:
            doc.service_notes = data.get("completion_notes")
    
    _save_doc(doc)
    
    return {
        "name": doc.name,
        "status": doc.status,
        "message": _("Service order berhasil diselesaikan.")
    }


@frappe.whitelist()
def get_service_statistics() -> Dict[str, Any]:
    """Get service order statistics for dashboard."""
    
    _require_login()
    
    # Count by status
    status_counts = {}
    statuses = [
        "Draft",
        "Inspection",
        "Estimate",
        "Awaiting Approval",
        "Approved",
        "Work In Progress",
        "Awaiting QC",
        "Quality Check",
        "Completed",
        "Cancelled",
    ]
    
    for status in statuses:
        try:
            count = frappe.db.count("Garage Service Order", {"status": status})
            status_counts[status] = count
        except Exception:
            status_counts[status] = 0
    
    # Aggregate counts for workflow stages
    inspection_count = sum(
        status_counts.get(stage, 0)
        for stage in ["Draft", "Inspection", "Estimate", "Awaiting Approval", "Approved"]
    )

    progress_count = (
        status_counts.get("Work In Progress", 0)
        + status_counts.get("Awaiting QC", 0)
        + status_counts.get("Quality Check", 0)
    )
    
    completed_count = status_counts.get("Completed", 0)
    
    # Get today's orders
    try:
        today_orders = frappe.db.count(
            "Garage Service Order",
            {"creation": [">=", nowdate()]}
        )
    except Exception:
        today_orders = 0
    
    # Get orders needing attention (overdue)
    try:
        overdue_orders = frappe.db.count(
            "Garage Service Order",
            {
                "status": ["in", ["Work In Progress", "Awaiting QC"]],
                "estimated_delivery_date": ["<", nowdate()]
            }
        )
    except Exception:
        overdue_orders = 0
    
    return {
        "status_counts": status_counts,
        "workflow_counts": {
            "inspection": inspection_count,
            "progress": progress_count,
            "completed": completed_count
        },
        "today_orders": today_orders,
        "overdue_orders": overdue_orders
    }


VEHICLE_LOOKUP_FIELDS = [
    "name",
    "customer",
    "license_plate",
    "vin",
    "brand",
    "type_model",
    "model",
    "model_variant",
    "vehicle_year",
    "color",
    "transmission",
    "fuel_type",
    "mileage",
    "engine_number",
    "last_service_date",
]


@frappe.whitelist()
def lookup_customer(query: Optional[str] = None, name: Optional[str] = None) -> Dict[str, Any]:
    """Fetch a customer (and their vehicles) by identifier or partial name.

    The lookup now prioritises matching a license plate so the associated
    customer can be autofilled when the intake form searches by nomor polisi.
    """

    _require_login()
    identifier = (name or query or "").strip()
    if not identifier:
        return {}

    normalized_identifier = _normalize_license_plate(identifier)

    customer_fields = [
        "name",
        "customer_name",
        "customer_type",
        "phone",
        "email",
        "preferred_contact_method",
        "marketing_source",
        "is_vip",
    ]

    customer_doc: Optional[Dict[str, Any]] = None
    matched_vehicle: Optional[Dict[str, Any]] = None

    with _ignoring_permissions():
        if normalized_identifier:
            fields_sql = ", ".join(f"`{field}`" for field in VEHICLE_LOOKUP_FIELDS)
            normalized_expr = _normalized_plate_expression("`license_plate`")
            vehicle_rows = frappe.db.sql(
                f"""
                SELECT {fields_sql}
                FROM `tabGarage Vehicle`
                WHERE {normalized_expr} = %s
                ORDER BY modified DESC
                LIMIT 1
                """,
                normalized_identifier,
                as_dict=True,
            )

            if vehicle_rows:
                matched_vehicle = vehicle_rows[0]
                if matched_vehicle.get("customer"):
                    customer_doc = frappe.db.get_value(
                        "Garage Customer",
                        matched_vehicle["customer"],
                        customer_fields,
                        as_dict=True,
                    )
                    if customer_doc:
                        customer_doc = dict(customer_doc)
                        customer_doc.setdefault("name", matched_vehicle["customer"])

        if not customer_doc:
            customer_doc = frappe.db.get_value(
                "Garage Customer",
                identifier,
                customer_fields,
                as_dict=True,
            )
            if customer_doc:
                customer_doc = dict(customer_doc)
                customer_doc.setdefault("name", identifier)

        if not customer_doc:
            customer_doc = frappe.db.get_value(
                "Garage Customer",
                {"customer_name": identifier},
                customer_fields,
                as_dict=True,
            )
            if customer_doc:
                customer_doc = dict(customer_doc)

        if not customer_doc:
            like_pattern = f"%{identifier}%"
            matches = frappe.get_all(
                "Garage Customer",
                filters={"customer_name": ["like", like_pattern]},
                fields=customer_fields,
                order_by="modified desc",
                limit=1,
            )
            if matches:
                customer_doc = dict(matches[0])

    if not customer_doc and not matched_vehicle:
        return {}

    vehicles: List[Dict[str, Any]] = []
    if customer_doc:
        vehicles = frappe.get_all(
            "Garage Vehicle",
            filters={"customer": customer_doc["name"]},
            fields=VEHICLE_LOOKUP_FIELDS,
            order_by="modified desc",
            limit=20,
        )
    elif matched_vehicle:
        vehicles = [matched_vehicle]

    return {"customer": customer_doc, "vehicles": vehicles}


@frappe.whitelist()
def register_customer_vehicle(payload: Optional[Any] = None) -> Dict[str, Any]:
    """Create master data from the intake form and enqueue a service order."""

    _require_login()
    data = _ensure_dict(payload or {})

    created: Dict[str, Any] = {}
    existing_customer = (data.get("existing_customer") or "").strip()
    customer_name = existing_customer

    manual_customer_name = (
        (data.get("customer_name") or "").strip()
        or (data.get("new_customer_name") or "").strip()
        or (data.get("existing_customer_search") or "").strip()
    )

    if not existing_customer and manual_customer_name:
        with _ignoring_permissions():
            matched_customer = frappe.db.get_value(
                "Garage Customer",
                {"customer_name": manual_customer_name},
                "name",
            )
        if matched_customer:
            existing_customer = matched_customer
            customer_name = matched_customer

    if not existing_customer:
        customer_payload = _filter_fields(data, ALLOWED_DOCS["Garage Customer"]["fields"])
        if manual_customer_name and not customer_payload.get("customer_name"):
            customer_payload["customer_name"] = manual_customer_name
        if not customer_payload.get("customer_name"):
            frappe.throw(_("Nama customer wajib diisi."))
        customer_doc = _insert_document("Garage Customer", customer_payload)
        customer_name = customer_doc.name
        created["customer"] = customer_doc.name
    else:
        _get_doc("Garage Customer", existing_customer)  # validate existence

    vehicle_fields = ALLOWED_DOCS["Garage Vehicle"]["fields"] - {"customer"}
    vehicle_payload = _filter_fields(data, vehicle_fields)
    intake_notes = (data.get("notes") or "").strip()
    vehicle_name: Optional[str] = None

    if vehicle_payload:
        vehicle_doc = frappe.new_doc("Garage Vehicle")
        vehicle_doc.update(vehicle_payload)
        timestamp = now_datetime()
        vehicle_doc.last_service_logged_at = timestamp
        if not vehicle_doc.last_service_date:
            vehicle_doc.last_service_date = nowdate()
        vehicle_doc.customer = customer_name
        if not vehicle_doc.license_plate:
            frappe.throw(_("Nomor polisi kendaraan wajib diisi."))
        _insert_doc(vehicle_doc)
        vehicle_name = vehicle_doc.name
        created["vehicle"] = vehicle_doc.name

    if not vehicle_name and data.get("license_plate"):
        existing_vehicle = _find_vehicle_by_plate(data.get("license_plate"), fields=("name", "customer"))
        if existing_vehicle:
            vehicle_name = existing_vehicle.get("name")
            if vehicle_name:
                created["vehicle"] = vehicle_name
            if not customer_name and existing_vehicle.get("customer"):
                customer_name = existing_vehicle.get("customer")

    created["customer_name"] = customer_name

    if customer_name and vehicle_name:
        service_payload: Dict[str, Any] = {
            "customer": customer_name,
            "vehicle": vehicle_name,
            "status": "Inspection",
        }
        service_type = (data.get("service_order_type") or "").strip()
        if service_type:
            service_payload["service_order_type"] = service_type
        intake_type = (data.get("intake_type") or "Walk-In").strip() or "Walk-In"
        if intake_type not in {"Walk-In", "Booking"}:
            intake_type = "Walk-In"
        service_payload["intake_type"] = intake_type
        booking_channel = (data.get("booking_channel") or "").strip()
        booking_reference = (data.get("booking_reference") or "").strip()
        booking_datetime = (data.get("service_booking_date") or "").strip()
        if intake_type == "Booking":
            if booking_channel:
                service_payload["booking_channel"] = booking_channel
            if booking_reference:
                service_payload["booking_reference"] = booking_reference
            if booking_datetime:
                service_payload["service_booking_date"] = booking_datetime
        elif booking_datetime:
            service_payload["service_booking_date"] = booking_datetime
        if intake_notes:
            service_payload["service_notes"] = intake_notes
            service_payload["inspection_summary"] = intake_notes
        if data.get("phone"):
            service_payload["primary_contact"] = data.get("phone")
        priority = (data.get("priority") or "").strip()
        if priority:
            normalized_priority = priority.lower()
            priority_map = {
                "normal": "Normal",
                "high": "High",
                "urgent": "Urgent",
                "critical": "Critical",
            }
            service_payload["priority"] = priority_map.get(normalized_priority, priority)
        estimated_delivery = (data.get("estimated_delivery_date") or "").strip()
        if estimated_delivery:
            service_payload["estimated_delivery_date"] = estimated_delivery
        estimated_amount = data.get("total_estimated_amount")
        if estimated_amount not in (None, ""):
            amount_value = flt(estimated_amount)
            if amount_value < 0:
                amount_value = 0
            service_payload["total_estimated_amount"] = amount_value

        service_doc = _insert_document("Garage Service Order", service_payload)
        created["service_order"] = service_doc.name
        created["service_order_status"] = service_doc.status

    return created


@frappe.whitelist()
def create_service_order(order: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(order or {})
    doc = _insert_document("Garage Service Order", data)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def update_service_order(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Service Order", name, data)
    return {"name": doc.name, "status": doc.status, "job_card_status": doc.job_card_status, "qc_status": doc.qc_status}


@frappe.whitelist()
def append_service_progress(name: str, log_entry: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(log_entry or {})
    progress_config = ALLOWED_DOCS["Garage Service Order"]["children"]["progress_logs"]
    row = _sanitize_child_rows("progress_logs", [data], progress_config)
    if not row:
        frappe.throw(_("Data progres tidak boleh kosong."))
    doc = _get_doc("Garage Service Order", name)
    doc.append("progress_logs", row[0])
    _save_doc(doc)
    return {"name": doc.name, "progress_count": len(doc.progress_logs)}


@frappe.whitelist()
def create_spare_part_order(order: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(order or {})
    doc = _insert_document("Garage Spare Part Order", data)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def update_spare_part_order(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Spare Part Order", name, data)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def update_spare_part_request_status(name: str, action: str) -> Dict[str, Any]:
    """Approve, reject, or cancel a spare part request from a service order."""

    _require_login()

    if not name:
        frappe.throw(_("ID permintaan tidak boleh kosong."))

    normalized_action = (action or "").strip().lower()
    status_map = {
        "approve": "Issued",
        "approved": "Issued",  # alias in case the UI sends a descriptive label
        "reject": "Rejected",
        "rejected": "Rejected",
        "cancel": "Cancelled",
        "cancelled": "Cancelled",
    }

    if normalized_action not in status_map:
        frappe.throw(_("Aksi {0} tidak dikenali.").format(action))

    request = frappe.db.get_value(
        "Garage Service Order Part",
        name,
        ["name", "parent", "item_code", "item_name", "qty", "stock_status", "uom", "source"],
        as_dict=True,
    )

    if not request:
        frappe.throw(_("Permintaan sparepart tidak ditemukan."))

    current_status = (request.get("stock_status") or "").strip()
    new_status = status_map[normalized_action]

    if current_status == new_status:
        return {
            "name": name,
            "parent": request.get("parent"),
            "stock_status": new_status,
            "message": _("Permintaan sudah berada pada status {0}.").format(new_status),
        }

    if current_status in SPARE_REQUEST_CLOSED_STATUSES:
        frappe.throw(
            _("Permintaan sudah diproses dengan status {0}.").format(current_status or _("tidak diketahui"))
        )

    response: Dict[str, Any] = {
        "name": name,
        "parent": request.get("parent"),
        "stock_status": new_status,
    }

    if new_status == "Issued":
        qty = flt(request.get("qty") or 0)
        if qty <= 0:
            frappe.throw(_("Jumlah permintaan tidak valid."))

        part_code = (request.get("item_code") or "").strip()
        if not part_code:
            frappe.throw(_("Kode sparepart belum diisi pada permintaan."))

        try:
            part_doc = _get_doc("Garage Spare Part", part_code)
        except Exception:
            part_name = frappe.db.get_value("Garage Spare Part", {"part_code": part_code}, "name")
            if not part_name:
                frappe.throw(_("Sparepart {0} tidak ditemukan di master.").format(part_code))
            part_doc = _get_doc("Garage Spare Part", part_name)

        available = flt(part_doc.stock_qty or 0)
        if qty > available:
            frappe.throw(
                _(
                    "Stok {0} tidak mencukupi. Permintaan {1} {2}, stok tersedia {3}."
                ).format(
                    part_doc.part_name or part_code,
                    "{:g}".format(flt(qty)),
                    request.get("uom") or "",
                    "{:g}".format(flt(available)),
                )
            )

        part_doc.stock_qty = available - qty
        if flt(part_doc.reserved_qty):
            part_doc.reserved_qty = max(flt(part_doc.reserved_qty) - qty, 0)

        _save_doc(part_doc)

        updated_fields = {"stock_status": new_status}
        if not request.get("source"):
            updated_fields["source"] = "On Hand"

        frappe.db.set_value("Garage Service Order Part", name, updated_fields)

        response.update(
            {
                "message": _("Permintaan sparepart disetujui. Stok tersisa {0}.").format(
                    "{:g}".format(flt(part_doc.stock_qty or 0))
                ),
                "part": {
                    "name": part_doc.name,
                    "part_code": part_doc.part_code,
                    "stock_qty": part_doc.stock_qty,
                    "reserved_qty": part_doc.reserved_qty,
                },
            }
        )
    else:
        frappe.db.set_value("Garage Service Order Part", name, {"stock_status": new_status})
        response["message"] = (
            _("Permintaan sparepart ditolak.") if new_status == "Rejected" else _("Permintaan sparepart dibatalkan.")
        )

    return response


@frappe.whitelist()
def generate_spare_part_approval_document(
    service_order: str, request_name: Optional[str] = None
) -> Dict[str, Any]:
    """Prepare or refresh a division approval document for spare part requests."""

    _require_login()

    if not service_order:
        frappe.throw(_("Order servis wajib dipilih."))

    service_order = service_order.strip()
    request_name = cstr(request_name).strip() if request_name is not None else ""
    service_doc = _get_doc("Garage Service Order", service_order)

    parts = []
    for row in service_doc.get("required_parts", []) or []:
        if request_name and cstr(row.name) != request_name:
            continue
        status = (row.stock_status or "").strip()
        if status == "Cancelled":
            continue
        parts.append(row)

    if request_name and not parts:
        frappe.throw(_("Permintaan sparepart {0} tidak ditemukan.").format(request_name))

    if not parts:
        frappe.throw(_("Tidak ada permintaan sparepart aktif pada order {0}.").format(service_order))

    existing = frappe.db.get_all(
        "Garage Division Request",
        filters=[
            ["Garage Division Request", "reference_type", "=", "Garage Service Order"],
            ["Garage Division Request", "reference_name", "=", service_order],
            ["Garage Division Request", "docstatus", "!=", 2],
        ],
        fields=["name", "approval_status"],
        order_by="creation desc",
        limit=1,
    )

    division_doc = None
    if existing:
        candidate = existing[0]
        if candidate.get("approval_status") not in {"Approved", "Rejected"}:
            division_doc = _get_doc("Garage Division Request", candidate["name"])

    if division_doc:
        division_doc.set("items", [])
    else:
        division_doc = frappe.new_doc("Garage Division Request")
        division_doc.reference_type = "Garage Service Order"
        division_doc.reference_name = service_order
        division_doc.requesting_division = division_doc.requesting_division or "Service"
        division_doc.target_division = division_doc.target_division or "Spare Part"

    division_doc.request_scope = _("Service Order {0}").format(service_order)
    division_doc.request_date = nowdate()
    if frappe.session.user != "Guest":
        division_doc.requested_by = division_doc.requested_by or frappe.session.user
    division_doc.approval_status = (
        division_doc.approval_status
        if division_doc.approval_status in {"Approved", "Rejected"}
        else "Pending Approval"
    )

    if not division_doc.request_title:
        division_doc.request_title = _("Persetujuan Sparepart {0}").format(service_order)
    if not division_doc.request_purpose:
        division_doc.request_purpose = _(
            "Pemenuhan kebutuhan sparepart untuk service order {0}."
        ).format(service_order)

    for row in parts:
        division_doc.append(
            "items",
            {
                "source_row": row.name,
                "item_code": row.item_code,
                "item_name": row.item_name or row.item_code,
                "description": row.description,
                "qty": row.qty,
                "uom": row.uom,
                "source": row.source,
                "requested_warehouse": row.warehouse,
            },
        )

    source_names = sorted({cstr(row.name) for row in parts if row.name})
    division_doc.source_request_names = ", ".join(source_names)

    if division_doc.is_new():
        division_doc = _insert_doc(division_doc)
    else:
        division_doc = _save_doc(division_doc)

    base_url = get_url()
    doctype = "Garage Division Request"
    print_format = "Standard"
    quoted_doctype = quote(cstr(doctype))
    quoted_docname = quote(cstr(division_doc.name))
    quoted_format = quote(cstr(print_format))
    print_url = (
        f"{base_url}/printview?doctype={quoted_doctype}&name={quoted_docname}"
        f"&format={quoted_format}&no_letterhead=1"
    )
    form_url = f"{base_url}/app/garage-division-request/{quoted_docname}"

    return {
        "name": division_doc.name,
        "form_url": form_url,
        "print_url": print_url,
        "message": _("Dokumen persetujuan lintas divisi siap digunakan."),
    }


@frappe.whitelist()
def create_spare_part(part: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(part or {})
    doc = _insert_document("Garage Spare Part", data)
    return {"name": doc.name, "part_code": getattr(doc, "part_code", doc.name)}


@frappe.whitelist()
def update_spare_part(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Spare Part", name, data)
    return {
        "name": doc.name,
        "part_code": getattr(doc, "part_code", doc.name),
        "stock_qty": getattr(doc, "stock_qty", 0),
        "unit_price": getattr(doc, "unit_price", 0),
    }


@frappe.whitelist()
def create_procurement_order(order: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(order or {})
    doc = _insert_document("Garage Procurement Order", data)
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
    doc = _insert_document("Garage Stock Movement", data)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def update_stock_movement(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Stock Movement", name, data)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def create_sales_invoice(invoice: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(invoice or {})
    doc = _insert_document("Garage Sales Invoice", data)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def update_sales_invoice(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Sales Invoice", name, data)
    return {"name": doc.name, "status": doc.status, "outstanding": doc.outstanding_amount}


@frappe.whitelist()
def create_payment_entry(entry: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(entry or {})
    doc = _insert_document("Garage Payment Entry", data)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def update_payment_entry(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Payment Entry", name, data)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def create_receipt_document(receipt: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(receipt or {})
    doc = _insert_document("Garage Receipt Document", data)
    return {"name": doc.name}


@frappe.whitelist()
def update_receipt_document(name: str, updates: Optional[Any] = None) -> Dict[str, Any]:
    _require_login()
    data = _ensure_dict(updates or {})
    doc = _update_document("Garage Receipt Document", name, data)
    return {"name": doc.name}
