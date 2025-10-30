"""Helpers to build and render service estimate PDFs."""
from __future__ import annotations

import base64
from contextlib import contextmanager
from typing import Any, Dict, Iterable, List, Optional

import frappe
from frappe import _
from frappe.utils import flt, format_datetime, get_datetime
from frappe.utils.pdf import get_pdf

TEMPLATE_PATH = "garage/templates/pdf/service_estimate.html"


@contextmanager
def _ignore_permissions():
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


def _format_currency(value: Any) -> str:
    amount = flt(value or 0)
    rounded = int(round(amount))
    return f"Rp{rounded:,.0f}".replace(",", ".")


def _format_date(value: Any) -> str:
    if not value:
        return "-"
    try:
        dt = get_datetime(value)
    except Exception:
        return str(value)
    return format_datetime(dt, "dd MMM yyyy")


def _format_vehicle_description(vehicle: Optional[frappe.Document]) -> str:
    if not vehicle:
        return "-"
    parts: List[str] = []
    for field in ("brand", "type_model", "model", "model_variant"):
        value = (getattr(vehicle, field, None) or "").strip()
        if value:
            parts.append(value)
    year = getattr(vehicle, "vehicle_year", None)
    if year:
        parts.append(str(year))
    return " – ".join(parts) if parts else "-"


def _format_plate(vehicle: Optional[frappe.Document]) -> str:
    if not vehicle:
        return "-"
    license_plate = (getattr(vehicle, "license_plate", None) or "").strip()
    return license_plate or "-"


def _safe_get_doc(doctype: str, name: Optional[str]) -> Optional[frappe.Document]:
    if not (doctype and name):
        return None
    try:
        with _ignore_permissions():
            return frappe.get_doc(doctype, name)
    except Exception:
        return None


def _collect_bundle_items(bundle: frappe.Document) -> Dict[str, Any]:
    service_fee = flt(getattr(bundle, "service_fee", 0))
    spare_rows: List[Dict[str, Any]] = []
    material_rows: List[Dict[str, Any]] = []

    for row in getattr(bundle, "spare_parts", []) or []:
        amount = flt(getattr(row, "amount", 0))
        if not amount:
            qty = flt(getattr(row, "quantity", 0)) or 0
            rate = flt(getattr(row, "unit_price", 0)) or 0
            amount = qty * rate
        description = (
            getattr(row, "item_name", None)
            or getattr(row, "part_name", None)
            or getattr(row, "spare_part", None)
            or _("Spare Part")
        )
        spare_rows.append({
            "description": description,
            "amount": amount,
        })

    for row in getattr(bundle, "materials", []) or []:
        amount = flt(getattr(row, "amount", 0))
        if not amount:
            qty = flt(getattr(row, "quantity", 0)) or 0
            rate = flt(getattr(row, "unit_price", 0)) or 0
            amount = qty * rate
        description = (
            getattr(row, "item_name", None)
            or getattr(row, "part_name", None)
            or getattr(row, "material", None)
            or _("Material")
        )
        material_rows.append({
            "description": description,
            "amount": amount,
        })

    return {
        "service_fee": service_fee,
        "spare_parts": spare_rows,
        "materials": material_rows,
    }


def _collect_required_parts(parts: Iterable[Any]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for row in parts or []:
        amount = flt(getattr(row, "amount", 0))
        if not amount:
            qty = flt(getattr(row, "qty", 0)) or 0
            rate = flt(getattr(row, "rate", 0)) or 0
            amount = qty * rate
        description = (
            getattr(row, "item_name", None)
            or getattr(row, "item_code", None)
            or _("Komponen")
        )
        items.append({
            "description": description,
            "amount": amount,
        })
    return items


def _resolve_user_full_name(user_id: Optional[str]) -> str:
    if not user_id:
        return "-"
    try:
        with _ignore_permissions():
            full_name = frappe.db.get_value("User", user_id, "full_name")
    except Exception:
        full_name = None
    return (full_name or user_id or "-").strip()


def build_service_estimate_context(service_order: frappe.Document) -> Dict[str, Any]:
    customer = _safe_get_doc("Garage Customer", getattr(service_order, "customer", None))
    vehicle = _safe_get_doc("Garage Vehicle", getattr(service_order, "vehicle", None))

    bundle_doc = None
    if getattr(service_order, "service_bundle", None):
        bundle_doc = _safe_get_doc("Garage Service Bundle", service_order.service_bundle)

    bundle_items = _collect_bundle_items(bundle_doc) if bundle_doc else None
    service_fee = bundle_items["service_fee"] if bundle_items else 0
    spare_rows = bundle_items["spare_parts"] if bundle_items else []
    material_rows = bundle_items["materials"] if bundle_items else []

    if not bundle_items:
        spare_rows = _collect_required_parts(getattr(service_order, "required_parts", []))

    job_items: List[Dict[str, Any]] = []
    if service_fee:
        label = getattr(service_order, "service_bundle_name", None) or getattr(bundle_doc, "bundle_name", None)
        if label:
            description = _("Biaya Jasa - {name}").format(name=label)
        else:
            description = _("Biaya Jasa")
        job_items.append({"description": description, "amount": service_fee})

    for row in spare_rows:
        job_items.append({"description": row["description"], "amount": row["amount"]})
    for row in material_rows:
        job_items.append({"description": row["description"], "amount": row["amount"]})

    spare_total = sum(row["amount"] for row in spare_rows)
    material_total = sum(row["amount"] for row in material_rows)

    if not service_fee and not bundle_items:
        estimated_amount = flt(getattr(service_order, "total_estimated_amount", 0))
        if estimated_amount and estimated_amount > (spare_total + material_total):
            service_fee = estimated_amount - (spare_total + material_total)
            job_items.insert(0, {"description": _("Biaya Jasa"), "amount": service_fee})
        elif estimated_amount and not job_items:
            job_items.append({"description": _("Estimasi Service"), "amount": estimated_amount})
            service_fee = estimated_amount

    grand_total = service_fee + spare_total + material_total
    if not grand_total:
        grand_total = flt(getattr(service_order, "total_estimated_amount", 0))
    if not grand_total:
        grand_total = sum(item["amount"] for item in job_items)

    def enrich(item: Dict[str, Any]) -> Dict[str, Any]:
        value = flt(item.get("amount") or 0)
        return {
            "description": item.get("description") or "-",
            "amount": value,
            "amount_formatted": _format_currency(value),
        }

    job_items = [enrich(item) for item in job_items]

    summary = {
        "service_total": flt(service_fee),
        "service_total_formatted": _format_currency(service_fee),
        "spare_total": flt(spare_total),
        "spare_total_formatted": _format_currency(spare_total),
        "material_total": flt(material_total),
        "material_total_formatted": _format_currency(material_total),
        "grand_total": flt(grand_total),
        "grand_total_formatted": _format_currency(grand_total),
    }

    intake_notes = getattr(service_order, "service_notes", None) or getattr(service_order, "inspection_summary", None) or "-"

    meta = {
        "number": getattr(service_order, "name", "-"),
        "date": _format_date(getattr(service_order, "creation", None)),
        "customer": getattr(customer, "customer_name", None) or getattr(service_order, "customer", "-"),
        "phone": getattr(service_order, "primary_contact", None)
        or getattr(customer, "phone", None)
        or "-",
        "contact_person": getattr(customer, "customer_name", None) or getattr(service_order, "customer", "-"),
        "intake_notes": intake_notes,
    }

    vehicle_info = {
        "description": _format_vehicle_description(vehicle),
        "plate": _format_plate(vehicle),
    }

    signatures = {
        "prepared_by": _resolve_user_full_name(getattr(service_order, "service_advisor", None)),
        "approved_by": getattr(customer, "customer_name", None) or getattr(service_order, "customer", "-"),
    }

    return {
        "title": _("ESTIMASI SERVICE KENDARAAN"),
        "meta": meta,
        "vehicle": vehicle_info,
        "job_items": job_items,
        "summary": summary,
        "notes": intake_notes,
        "signatures": signatures,
    }


def create_service_estimate_pdf(service_order_name: str) -> Optional[Dict[str, str]]:
    if not service_order_name:
        return None

    try:
        with _ignore_permissions():
            service_order = frappe.get_doc("Garage Service Order", service_order_name)
    except Exception:
        frappe.log_error(
            title="Service estimate PDF failed",
            message=f"Could not load service order {service_order_name}\n{frappe.get_traceback()}",
        )
        return None

    context = build_service_estimate_context(service_order)

    try:
        html = frappe.render_template(TEMPLATE_PATH, context)
        pdf_content = get_pdf(html)
    except Exception:
        frappe.log_error(
            title="Service estimate PDF rendering failed",
            message=f"Could not render PDF for {service_order_name}\n{frappe.get_traceback()}",
        )
        return None

    filename = f"{service_order.name}-estimasi-service.pdf"
    encoded = base64.b64encode(pdf_content or b"").decode("utf-8")

    return {
        "filename": filename,
        "content": encoded,
        "mime_type": "application/pdf",
    }
