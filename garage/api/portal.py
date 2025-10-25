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
                }
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
                }
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


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


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


def _sanitize_child_rows(table_field: str, rows: Any, config: Mapping[str, Any]) -> List[Dict[str, Any]]:
    if not rows:
        return []
    allowed_fields = config.get("fields", set())
    sanitized: List[Dict[str, Any]] = []
    for row in rows:
        row_data = _ensure_dict(row)
        payload = _filter_fields(row_data, allowed_fields)
        if payload:
            sanitized.append(payload)
    return sanitized


def _apply_defaults(doctype: str, doc: frappe.Document) -> None:
    if doctype == "Garage Service Order" and not doc.service_booking_date:
        doc.service_booking_date = now_datetime()
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
            rows = frappe.get_all(
                doctype,
                fields=list(fields),
                filters=filters or [],
                order_by="modified desc",
                limit_page_length=limit,
                ignore_permissions=True,
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
            "phone_number",
            "mobile_no",
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

    customer_index = {customer.get("name"): customer for customer in customers if customer.get("name")}
    for vehicle in vehicles:
        customer = customer_index.get(vehicle.get("customer"))
        if not customer:
            continue

        phone_candidates = [
            customer.get("phone"),
            customer.get("phone_number"),
            customer.get("mobile_no"),
        ]
        email_candidates = [customer.get("email")]

        vehicle["customer_name"] = customer.get("customer_name") or customer.get("name")
        vehicle["customer_type"] = customer.get("customer_type")
        vehicle["customer_phone"] = next((p for p in phone_candidates if p), None)
        vehicle["customer_email"] = next((e for e in email_candidates if e), None)
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

    customer_map = {row.get("name"): row for row in customers}
    vehicle_map = {row.get("name"): row for row in vehicles}

    service_registrations: List[Dict[str, Any]] = []
    for order in service_orders:
        customer = customer_map.get(order.get("customer")) if order.get("customer") else None
        vehicle = vehicle_map.get(order.get("vehicle")) if order.get("vehicle") else None

        vehicle_label_parts = [
            (vehicle or {}).get("license_plate"),
            (vehicle or {}).get("brand"),
            (vehicle or {}).get("model"),
            _safe_text((vehicle or {}).get("vehicle_year")),
        ]
        vehicle_label = " – ".join(part for part in vehicle_label_parts if part)

        contact_parts = [
            _safe_text((customer or {}).get("phone")),
            _safe_text((customer or {}).get("email")),
        ]
        contact_display = " • ".join(part for part in contact_parts if part)

        service_registrations.append(
            {
                "order_name": order.get("name"),
                "status": order.get("status"),
                "priority": order.get("priority"),
                "booking_date": order.get("service_booking_date"),
                "target_date": order.get("estimated_delivery_date"),
                "completion_date": order.get("actual_delivery_date"),
                "total_estimated_amount": order.get("total_estimated_amount"),
                "total_approved_amount": order.get("total_approved_amount"),
                "job_card_status": order.get("job_card_status"),
                "work_order_status": order.get("work_order_status"),
                "qc_status": order.get("qc_status"),
                "notes": order.get("service_notes"),
                "customer": order.get("customer"),
                "customer_name": (customer or {}).get("customer_name"),
                "customer_type": (customer or {}).get("customer_type"),
                "customer_phone": (customer or {}).get("phone"),
                "customer_email": (customer or {}).get("email"),
                "customer_display": (customer or {}).get("customer_name")
                or order.get("customer"),
                "customer_contact": contact_display,
                "vehicle": order.get("vehicle"),
                "vehicle_plate": (vehicle or {}).get("license_plate"),
                "vehicle_brand": (vehicle or {}).get("brand"),
                "vehicle_model": (vehicle or {}).get("model"),
                "vehicle_year": (vehicle or {}).get("vehicle_year"),
                "vehicle_color": (vehicle or {}).get("color"),
                "vehicle_transmission": (vehicle or {}).get("transmission"),
                "vehicle_fuel": (vehicle or {}).get("fuel_type"),
                "vehicle_mileage": (vehicle or {}).get("mileage"),
                "vehicle_label": vehicle_label or order.get("vehicle"),
            }
        )

    return {
        "customers": customers,
        "vehicles": vehicles,
        "service_orders": service_orders,
        "service_registrations": service_registrations,
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
