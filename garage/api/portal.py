"""Frappe API endpoints powering the Garage website workflow portal."""
from __future__ import annotations

from contextlib import contextmanager
import re
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence

import frappe
from frappe import _
from frappe.utils import cint, flt, now_datetime, nowdate

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
            "model",
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
            "model",
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
}

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
                ignore_permissions=True,
                ignore_user_permissions=True,
            )
    except Exception:
        return []
    return [dict(row) for row in rows]


def _group_status(doctype: str) -> Dict[str, int]:
    try:
        with _ignoring_permissions():
            rows = frappe.db.get_all(
                doctype,
                fields=["status", "count(*) as total"],
                group_by="status",
                order_by="total desc",
                ignore_permissions=True,
                ignore_user_permissions=True,
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
                ignore_user_permissions=True,
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
        "brand",
        "model",
        "vehicle_year",
        "color",
        "transmission",
        "fuel_type",
        "mileage",
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
            ["stock_status", "not in", ["Received", "Issued"]],
        ],
        limit=200,
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
        "brand",
        "model",
        "vehicle_year",
        "color",
        "transmission",
        "fuel_type",
        "mileage",
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
    
    for order in orders:
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
                    ["license_plate", "brand", "model", "vehicle_year"],
                    as_dict=True
                )
                if vehicle:
                    order["vehicle_plate"] = vehicle.get("license_plate")
                    order["vehicle_brand"] = vehicle.get("brand")
                    order["vehicle_model"] = vehicle.get("model")
                    order["vehicle_year"] = vehicle.get("vehicle_year")
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
def get_service_order_details(order_id: str) -> Dict[str, Any]:
    """Get complete details of a service order including all child tables."""
    
    _require_login()
    
    if not order_id:
        frappe.throw(_("Service Order ID diperlukan."))
    
    try:
        # Get main document
        order = frappe.get_doc("Garage Service Order", order_id)
    except Exception as e:
        frappe.throw(_("Service Order tidak ditemukan: {0}").format(str(e)))
    
    # Build response
    result = {
        # Main fields
        "name": order.name,
        "status": order.status,
        "service_order_type": order.service_order_type,
        "order_category": order.order_category,
        "priority": order.priority,
        "service_booking_date": order.service_booking_date,
        "estimated_delivery_date": order.estimated_delivery_date,
        "actual_delivery_date": order.actual_delivery_date,
        "total_estimated_amount": order.total_estimated_amount,
        "total_approved_amount": order.total_approved_amount,
        "approval_date": order.approval_date,
        "customer_confirmation": order.customer_confirmation,
        "rejection_reason": order.rejection_reason,
        "inspection_summary": order.inspection_summary,
        "service_notes": order.service_notes,
        "job_card_status": order.job_card_status,
        "work_order_status": order.work_order_status,
        "qc_status": order.qc_status,
        
        # Customer info
        "customer": order.customer,
        "vehicle": order.vehicle,
        "service_advisor": order.service_advisor,
        "primary_contact": order.primary_contact,
        
        # Child tables (will be populated if they exist)
        "inspection_items": [],
        "service_tasks": [],
        "required_parts": [],
        "progress_logs": [],
        "quality_checks": [],
        "payment_schedule": [],
        
        # Timestamps
        "creation": order.creation,
        "modified": order.modified
    }
    
    # Get customer details
    if order.customer:
        try:
            customer = frappe.get_doc("Garage Customer", order.customer)
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
    if order.vehicle:
        try:
            vehicle = frappe.get_doc("Garage Vehicle", order.vehicle)
            result["vehicle_details"] = {
                "name": vehicle.name,
                "license_plate": vehicle.license_plate,
                "brand": vehicle.brand,
                "model": vehicle.model,
                "vehicle_year": vehicle.vehicle_year,
                "color": vehicle.color,
                "transmission": vehicle.transmission,
                "fuel_type": vehicle.fuel_type,
                "mileage": vehicle.mileage
            }
        except Exception:
            pass
    
    # Get child table data - with error handling
    try:
        if hasattr(order, "inspection_items") and order.inspection_items:
            result["inspection_items"] = [item.as_dict() for item in order.inspection_items]
    except Exception:
        pass
    
    try:
        if hasattr(order, "service_tasks") and order.service_tasks:
            result["service_tasks"] = [task.as_dict() for task in order.service_tasks]
    except Exception:
        pass
    
    try:
        if hasattr(order, "required_parts") and order.required_parts:
            result["required_parts"] = [part.as_dict() for part in order.required_parts]
    except Exception:
        pass
    
    try:
        if hasattr(order, "progress_logs") and order.progress_logs:
            result["progress_logs"] = [log.as_dict() for log in order.progress_logs]
    except Exception:
        pass
    
    try:
        if hasattr(order, "quality_checks") and order.quality_checks:
            result["quality_checks"] = [qc.as_dict() for qc in order.quality_checks]
    except Exception:
        pass
    
    try:
        if hasattr(order, "payment_schedule") and order.payment_schedule:
            result["payment_schedule"] = [payment.as_dict() for payment in order.payment_schedule]
    except Exception:
        pass

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
        limit=200,
    )

    return result


@frappe.whitelist(allow_guest=True)
def update_service_order_inspection(order_id: str, inspection_data: Optional[Any] = None) -> Dict[str, Any]:
    """Update service order with inspection and planning details."""
    
    _require_login()
    
    if not order_id:
        frappe.throw(_("Service Order ID diperlukan."))
    
    data = _ensure_dict(inspection_data or {})
    
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
    
    return {
        "name": doc.name,
        "status": doc.status,
        "message": _("Inspection data berhasil disimpan.")
    }


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


@frappe.whitelist()
def lookup_customer(query: Optional[str] = None, name: Optional[str] = None) -> Dict[str, Any]:
    """Fetch a customer (and their vehicles) by identifier or partial name."""

    _require_login()
    identifier = (name or query or "").strip()
    if not identifier:
        return {}

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
            identifier,
            customer_fields,
            as_dict=True,
        )

        if not customer_doc:
            customer_doc = frappe.db.get_value(
                "Garage Customer",
                {"customer_name": identifier},
                customer_fields,
                as_dict=True,
            )

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
                customer_doc = matches[0]

    if not customer_doc:
        return {}

    vehicles = frappe.get_all(
        "Garage Vehicle",
        filters={"customer": customer_doc["name"]},
        fields=[
            "name",
            "customer",
            "license_plate",
            "brand",
            "model",
            "vehicle_year",
            "color",
            "transmission",
            "fuel_type",
            "mileage",
            "last_service_date",
        ],
        order_by="modified desc",
        limit=20,
    )

    return {"customer": customer_doc, "vehicles": vehicles}


@frappe.whitelist()
def register_customer_vehicle(payload: Optional[Any] = None) -> Dict[str, Any]:
    """Create master data from the intake form and enqueue a service order."""

    _require_login()
    data = _ensure_dict(payload or {})

    created: Dict[str, Any] = {}
    existing_customer = data.get("existing_customer")
    customer_name = existing_customer

    if not existing_customer:
        customer_payload = _filter_fields(data, ALLOWED_DOCS["Garage Customer"]["fields"])
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
        vehicle_doc.customer = data.get("vehicle_customer") or customer_name
        if not vehicle_doc.customer:
            frappe.throw(_("Pilih customer untuk kendaraan."))
        if not vehicle_doc.license_plate:
            frappe.throw(_("Nomor polisi kendaraan wajib diisi."))
        _insert_doc(vehicle_doc)
        vehicle_name = vehicle_doc.name
        created["vehicle"] = vehicle_doc.name
    elif data.get("vehicle_customer"):
        # Vehicle fields empty but explicit request to attach? ignore gracefully.
        created["vehicle"] = None

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
        if intake_notes:
            service_payload["service_notes"] = intake_notes
            service_payload["inspection_summary"] = intake_notes
        if data.get("phone"):
            service_payload["primary_contact"] = data.get("phone")

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
