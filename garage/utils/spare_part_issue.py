"""Utilities to generate and persist spare part issue documents."""

from __future__ import annotations

import base64
from typing import Any, Dict, Iterable, Optional

import frappe
from frappe import _
from frappe.utils import cint, cstr, flt, format_datetime, get_datetime, get_url, now_datetime
from frappe.utils.file_manager import save_file
from frappe.utils.pdf import get_pdf

from garage.utils import service_estimate

SPARE_PART_ISSUE_TEMPLATE = "garage/templates/pdf/spare_part_issue.html"


def _safe_get_service_order(name: str) -> Optional[frappe.Document]:
    if not name:
        return None
    try:
        with service_estimate._ignore_permissions():  # type: ignore[attr-defined]
            return frappe.get_doc("Garage Service Order", name)
    except Exception:
        frappe.log_error(
            title="Spare part issue - load failed",
            message=f"Could not load Garage Service Order {name}\n{frappe.get_traceback()}",
        )
        return None


def _format_branch_label(service_order: frappe.Document) -> Dict[str, str]:
    branch_name = cstr(getattr(service_order, "branch", ""))
    if not branch_name:
        return {"code": "", "name": "-", "address": "-", "contact": "-"}

    branch_doc = service_estimate._safe_get_doc("Garage Branch", branch_name)  # type: ignore[attr-defined]
    if not branch_doc:
        identifier = cstr(branch_name).strip()
        return {"code": identifier, "name": identifier or "-", "address": "-", "contact": "-"}

    code = cstr(getattr(branch_doc, "branch_code", "") or getattr(branch_doc, "name", "")).strip()
    address = service_estimate._format_branch_address(branch_doc)  # type: ignore[attr-defined]
    contact = service_estimate._format_branch_contact(branch_doc)  # type: ignore[attr-defined]
    name = cstr(getattr(branch_doc, "branch_name", "") or getattr(branch_doc, "name", "")).strip()

    return {
        "code": code or name,
        "name": name or code or "-",
        "address": address or "-",
        "contact": contact or "-",
    }


def format_spare_part_issue_number(service_order: frappe.Document) -> str:
    """Return the document number in the Cabang-FPS-Year-Order format."""

    branch_identifier = (
        service_estimate._resolve_branch_identifier(service_order)  # type: ignore[attr-defined]
        or "CABANG"
    )
    branch_identifier = cstr(branch_identifier).strip().upper()

    try:
        year = get_datetime(getattr(service_order, "creation", None)).year
    except Exception:
        year = now_datetime().year

    order_number = cstr(getattr(service_order, "name", "")).strip() or "ORDER"

    return f"{branch_identifier}-FPS-{year}-{order_number}"


def _compose_issue_filename(service_order: frappe.Document) -> str:
    branch_identifier = (
        service_estimate._resolve_branch_identifier(service_order)  # type: ignore[attr-defined]
        or "CABANG"
    )
    try:
        year = get_datetime(getattr(service_order, "creation", None)).year
    except Exception:
        year = now_datetime().year

    order_identifier = cstr(getattr(service_order, "name", "")).strip()
    if not order_identifier:
        order_identifier = service_estimate._extract_sequence(getattr(service_order, "name", None))  # type: ignore[attr-defined]

    order_slug = service_estimate._slugify(order_identifier, fallback="order")  # type: ignore[attr-defined]
    branch_slug = service_estimate._slugify(branch_identifier, fallback="cabang")  # type: ignore[attr-defined]

    filename = f"{branch_slug}-FPS-{year}-{order_slug}.pdf"
    return filename.replace("--", "-")


def _coalesce_row_value(row: object, *fields: str) -> str:
    """Return the first non-empty attribute or mapping value for the given fields."""

    row_dict: Optional[Dict[str, Any]] = None

    for field in fields:
        value = getattr(row, field, None)
        if value:
            return cstr(value).strip()

        if row_dict is None and hasattr(row, "as_dict") and callable(row.as_dict):
            try:
                row_dict = row.as_dict() or {}
            except Exception:
                row_dict = {}

        if row_dict:
            value = row_dict.get(field)
            if value:
                return cstr(value).strip()

    return ""


def _collect_issued_parts(service_order: frappe.Document) -> Iterable[Dict[str, Any]]:
    for row in service_order.get("required_parts", []) or []:
        status = cstr(getattr(row, "stock_status", "")).strip()
        if status != "Issued":
            continue

        qty = flt(getattr(row, "qty", 0))

        item_code = _coalesce_row_value(row, "item_code", "part_code", "item", "spare_part") or "-"
        item_name = (
            _coalesce_row_value(row, "item_name", "description", "part_name", "item_description")
            or "-"
        )
        warehouse = _coalesce_row_value(
            row,
            "warehouse",
            "warehouse_location",
            "requested_warehouse",
            "issue_warehouse",
            "issued_from",
        )
        source = _coalesce_row_value(row, "source", "managed_by", "source_type", "part_source")

        yield {
            "item_code": item_code,
            "item_name": item_name,
            "qty": qty,
            "qty_display": service_estimate._format_quantity(qty),  # type: ignore[attr-defined]
            "uom": cstr(getattr(row, "uom", "")).strip() or "Unit",
            "warehouse": warehouse,
            "source": source,
        }


def _resolve_customer_label(service_order: frappe.Document) -> str:
    for field in ("customer_name", "customer", "customer_display_name"):
        value = cstr(getattr(service_order, field, "")).strip()
        if value:
            return value
    return "-"


def _resolve_vehicle_label(service_order: frappe.Document) -> str:
    vehicle = getattr(service_order, "vehicle", None)
    if not vehicle:
        return "-"
    vehicle_doc = service_estimate._safe_get_doc("Garage Vehicle", vehicle)  # type: ignore[attr-defined]
    if not vehicle_doc:
        return cstr(vehicle)

    plate = cstr(getattr(vehicle_doc, "license_plate", "")).strip()
    description_parts = []
    for field in ("brand", "type_model", "model", "model_variant"):
        part = cstr(getattr(vehicle_doc, field, "")).strip()
        if part:
            description_parts.append(part)
    description = " / ".join(description_parts)
    if plate and description:
        return f"{plate} – {description}"
    return plate or description or cstr(vehicle)


def build_spare_part_issue_context(service_order: frappe.Document) -> Dict[str, Any]:
    parts = list(_collect_issued_parts(service_order))
    if not parts:
        raise ValueError("Service order has no issued spare parts")

    branch_info = _format_branch_label(service_order)
    issue_number = format_spare_part_issue_number(service_order)
    mechanic_name = service_estimate._resolve_mechanic_name(service_order)  # type: ignore[attr-defined]
    service_advisor = service_estimate._resolve_user_full_name(  # type: ignore[attr-defined]
        getattr(service_order, "service_advisor", None)
    )

    return {
        "title": _("FORM PENGELUARAN SPAREPART"),
        "issue_number": issue_number,
        "generated_on": format_datetime(now_datetime(), "dd MMM yyyy HH:mm"),
        "service_order": {
            "name": cstr(getattr(service_order, "name", "")),
            "customer": _resolve_customer_label(service_order),
            "vehicle": _resolve_vehicle_label(service_order),
            "mechanic": mechanic_name,
            "service_advisor": service_advisor,
            "branch": branch_info,
        },
        "items": parts,
    }


def create_spare_part_issue_pdf(service_order_name: str) -> Optional[Dict[str, str]]:
    """Generate the spare part issue PDF for the given service order."""

    service_order = _safe_get_service_order(service_order_name)
    if not service_order:
        return None

    try:
        context = build_spare_part_issue_context(service_order)
    except Exception:
        frappe.log_error(
            title="Spare part issue - context failed",
            message=f"Could not build context for {service_order_name}\n{frappe.get_traceback()}",
        )
        return None

    try:
        template = frappe.get_template(SPARE_PART_ISSUE_TEMPLATE)
        html = template.render(context)
        pdf_content = get_pdf(
            html,
            options={
                "page-size": "A5",
                "margin-top": "8mm",
                "margin-right": "8mm",
                "margin-bottom": "8mm",
                "margin-left": "8mm",
            },
        )
    except Exception:
        frappe.log_error(
            title="Spare part issue - render failed",
            message=f"Could not render PDF for {service_order_name}\n{frappe.get_traceback()}",
        )
        return None

    if not pdf_content:
        return None

    filename = _compose_issue_filename(service_order)
    encoded = base64.b64encode(pdf_content).decode("utf-8")

    return {"filename": filename, "content": encoded, "mime_type": "application/pdf"}


def persist_spare_part_issue_pdf(
    service_order_name: str,
    pdf_payload: Optional[Dict[str, Any]],
    *,
    replace_existing: bool = True,
) -> Optional[Dict[str, Any]]:
    """Attach the generated spare part issue PDF to the service order."""

    if not service_order_name or not pdf_payload or not pdf_payload.get("content"):
        return None

    filename = cstr(pdf_payload.get("filename") or "").strip()
    if not filename:
        service_order = _safe_get_service_order(service_order_name)
        if service_order:
            filename = _compose_issue_filename(service_order)
        else:
            filename = f"{service_order_name}.pdf"

    if not filename.lower().endswith(".pdf"):
        filename = f"{filename}.pdf"

    content = cstr(pdf_payload.get("content") or "").strip()
    if not content:
        return None

    if content.startswith("data:"):
        parts = content.split(",", 1)
        if len(parts) == 2:
            content = parts[1]

    try:
        if replace_existing:
            existing = frappe.get_all(
                "File",
                filters={
                    "attached_to_doctype": "Garage Service Order",
                    "attached_to_name": service_order_name,
                    "file_name": filename,
                    "is_folder": 0,
                },
                fields=["name"],
            )
            for row in existing:
                frappe.delete_doc("File", row.get("name"), ignore_permissions=True, force=True)

        file_doc = save_file(
            filename,
            content,
            "Garage Service Order",
            service_order_name,
            decode=True,
            is_private=1,
        )
    except Exception:
        frappe.log_error(
            title="Spare part issue - save failed",
            message=(
                "Tidak dapat menyimpan dokumen pengeluaran sparepart untuk {order}\n{trace}".format(
                    order=service_order_name,
                    trace=frappe.get_traceback(),
                )
            ),
        )
        return None

    file_url = getattr(file_doc, "file_url", None)

    return {
        "file_doc": getattr(file_doc, "name", None),
        "file_name": getattr(file_doc, "file_name", filename),
        "file_url": file_url,
        "absolute_file_url": get_url(file_url) if file_url else None,
        "filename": filename,
    }


def record_spare_part_approval(
    service_order_name: str,
    *,
    pdf_payload: Optional[Dict[str, Any]],
    approved_by: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Create or update the approval history record for a service order."""

    service_order = _safe_get_service_order(service_order_name)
    if not service_order:
        return None

    saved = persist_spare_part_issue_pdf(service_order.name, pdf_payload)

    doc_name = frappe.db.exists(
        "Garage Spare Part Approval", {"service_order": service_order.name}
    )
    if doc_name:
        approval_doc = frappe.get_doc("Garage Spare Part Approval", doc_name)
        approval_doc.approval_count = cint(approval_doc.approval_count or 0) + 1
    else:
        approval_doc = frappe.new_doc("Garage Spare Part Approval")
        approval_doc.service_order = service_order.name
        approval_doc.approval_count = 1

    approval_doc.branch = getattr(service_order, "branch", None)
    approval_doc.document_number = format_spare_part_issue_number(service_order)
    approval_doc.approved_on = now_datetime()
    if approved_by:
        approval_doc.approved_by = approved_by
    elif frappe.session.user and frappe.session.user not in {"Guest"}:
        approval_doc.approved_by = frappe.session.user

    if saved:
        approval_doc.document_file = saved.get("file_doc")
        approval_doc.document_url = saved.get("file_url") or saved.get("absolute_file_url")

    if approval_doc.is_new():
        approval_doc.insert(ignore_permissions=True)
    else:
        approval_doc.save(ignore_permissions=True)

    return {
        "name": approval_doc.name,
        "document_number": approval_doc.document_number,
        "document_url": approval_doc.document_url,
        "file_name": saved.get("file_name") if saved else None,
    }
