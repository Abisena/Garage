"""Helpers to build and render service estimate PDFs."""
from __future__ import annotations

import base64
import re
from contextlib import contextmanager
from typing import Any, Dict, Iterable, List, Optional

import frappe
from frappe import _
from frappe.utils import flt, format_datetime, get_datetime, get_url, now_datetime
from frappe.utils.pdf import get_pdf
from frappe.utils.file_manager import save_file

TEMPLATE_PATH = "garage/templates/pdf/service_estimate.html"
SPK_TEMPLATE_PATH = "garage/templates/pdf/spk.html"


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
    """Format currency in Indonesian Rupiah format."""
    amount = flt(value or 0)
    rounded = int(round(amount))
    return f"Rp{rounded:,.0f}".replace(",", ".")


def _format_quantity(value: Any) -> str:
    """Format quantity values for human friendly display."""

    qty = flt(value or 0)
    if qty == 0:
        return "-"

    if float(qty).is_integer():
        return str(int(qty))

    return f"{qty:.2f}".rstrip("0").rstrip(".")


def _format_date(value: Any) -> str:
    """Format date to Indonesian format."""
    if not value:
        return "-"
    try:
        dt = get_datetime(value)
    except Exception:
        return str(value)
    return format_datetime(dt, "dd MMM yyyy")


def _format_vehicle_description(vehicle: Optional[frappe.Document]) -> str:
    """Build vehicle description from multiple fields."""
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
    return " — ".join(parts) if parts else "-"


def _format_plate(vehicle: Optional[frappe.Document]) -> str:
    """Get vehicle license plate."""
    if not vehicle:
        return "-"
    license_plate = (getattr(vehicle, "license_plate", None) or "").strip()
    return license_plate or "-"


def _format_branch_address(branch: Optional[frappe.Document]) -> str:
    """Combine branch address fields into a readable string."""
    if not branch:
        return "-"
    parts: List[str] = []
    for field in ("address_line1", "address_line2", "city"):
        value = (getattr(branch, field, None) or "").strip()
        if value:
            parts.append(value)
    return ", ".join(parts) if parts else "-"


def _format_branch_contact(branch: Optional[frappe.Document]) -> str:
    """Combine branch phone and email."""
    if not branch:
        return "-"
    contacts: List[str] = []
    phone = (getattr(branch, "phone", None) or "").strip()
    email = (getattr(branch, "email", None) or "").strip()
    if phone:
        contacts.append(f"Telp: {phone}")
    if email:
        contacts.append(f"Email: {email}")
    return " | ".join(contacts) if contacts else "-"


def _resolve_mechanic_name(service_order: frappe.Document) -> str:
    """Determine the mechanic name associated with the service order."""

    for field in (
        "assigned_mechanic_name",
        "mechanic_in_charge_name",
        "assigned_mechanic",
        "mechanic_in_charge",
        "technician_name",
    ):
        value = getattr(service_order, field, None)
        if value:
            text = str(value).strip()
            if text:
                return text

    return "-"


def _safe_get_doc(doctype: str, name: Optional[str]) -> Optional[frappe.Document]:
    """Safely retrieve a document with permission bypass."""
    if not (doctype and name):
        return None
    try:
        with _ignore_permissions():
            return frappe.get_doc(doctype, name)
    except Exception as e:
        frappe.log_error(
            title=f"Failed to get {doctype}",
            message=f"Could not load {doctype} {name}: {str(e)}"
        )
        return None


def _slugify(value: Optional[str], *, fallback: str = "") -> str:
    """Return a filesystem-friendly slug based on the provided value."""

    text = (value or "").strip().lower()
    if not text:
        text = (fallback or "").strip().lower()
    if not text:
        return ""

    slug = re.sub(r"[^a-z0-9]+", "-", text)
    slug = slug.strip("-")
    return slug or ""


def _extract_sequence(identifier: Optional[str], *, width: int = 5) -> str:
    """Extract the trailing numeric sequence from a document identifier."""

    if not identifier:
        return "0".zfill(width)

    if not isinstance(identifier, str):
        try:
            identifier = str(identifier)
        except Exception:
            return "0".zfill(width)

    matches = re.findall(r"(\d+)", identifier)
    if not matches:
        return "0".zfill(width)

    return matches[-1].zfill(width)


def _resolve_branch_identifier(service_order: frappe.Document) -> str:
    """Determine the human readable branch identifier for filenames."""

    branch_code = (getattr(service_order, "branch_code", None) or "").strip()
    if branch_code:
        return branch_code

    branch_name = getattr(service_order, "branch", None)
    if not branch_name:
        return "CABANG"

    branch_doc = _safe_get_doc("Garage Branch", branch_name)
    if not branch_doc:
        return branch_name

    return (
        (getattr(branch_doc, "branch_code", None) or getattr(branch_doc, "name", None) or branch_name)
        .strip()
        or branch_name
    )


def format_service_order_document_number(service_order: frappe.Document) -> str:
    """Format document numbers to include branch, sequence, and year."""

    branch_identifier = (_resolve_branch_identifier(service_order) or "CABANG").upper()
    branch_parts = [
        part.strip()
        for part in re.split(r"[-/]+", branch_identifier)
        if part and part.strip()
    ]

    sequence = _extract_sequence(getattr(service_order, "name", None), width=4)

    try:
        year = get_datetime(getattr(service_order, "creation", None)).year
    except Exception:
        year = now_datetime().year

    parts: List[str] = branch_parts or ["CABANG"]
    parts.append("SPK")
    parts.append(sequence)
    parts.append(str(year))

    return "-".join(parts)


def _derive_customer_name(service_order: frappe.Document) -> str:
    """Pick the most descriptive customer label for filenames."""

    customer_name = (getattr(service_order, "customer_name", None) or "").strip()
    if customer_name:
        return customer_name

    customer_link = getattr(service_order, "customer", None)
    if not customer_link:
        return ""

    customer_doc = _safe_get_doc("Garage Customer", customer_link)
    if not customer_doc:
        return customer_link

    return (getattr(customer_doc, "customer_name", None) or getattr(customer_doc, "name", None) or customer_link).strip()


def _compose_document_filename(service_order: frappe.Document, *, suffix: str) -> str:
    """Compose a descriptive filename for estimate-related documents."""

    branch_identifier = _resolve_branch_identifier(service_order)
    sequence = _extract_sequence(getattr(service_order, "name", None))

    try:
        creation_year = get_datetime(getattr(service_order, "creation", None)).year
    except Exception:
        creation_year = now_datetime().year

    customer_name = _derive_customer_name(service_order)
    customer_slug = _slugify(customer_name, fallback="customer")

    parts = [
        branch_identifier or "CABANG",
        suffix.strip().upper() or "DOC",
        str(creation_year),
        sequence,
    ]

    if customer_slug:
        parts.append(customer_slug)

    base = "-".join(parts)
    return f"{base}.pdf"


def _collect_bundle_items(bundle: frappe.Document) -> Dict[str, Any]:
    """Extract items from service bundle."""
    service_fee = flt(getattr(bundle, "service_fee", 0))
    spare_rows: List[Dict[str, Any]] = []
    material_rows: List[Dict[str, Any]] = []

    for row in getattr(bundle, "spare_parts", []) or []:
        qty = flt(getattr(row, "quantity", 0)) or flt(getattr(row, "qty", 0)) or 0
        rate = flt(getattr(row, "unit_price", 0)) or flt(getattr(row, "rate", 0)) or 0
        amount = flt(getattr(row, "amount", 0))
        if not amount and qty and rate:
            amount = qty * rate
        if amount and qty and not rate:
            rate = amount / qty
        description = (
            getattr(row, "item_name", None)
            or getattr(row, "part_name", None)
            or getattr(row, "spare_part", None)
            or _("Spare Part")
        )
        spare_rows.append(
            {
                "code": getattr(row, "item_code", None) or getattr(row, "spare_part", None),
                "description": description,
                "qty": qty,
                "uom": getattr(row, "uom", None) or getattr(row, "unit", None),
                "rate": rate,
                "amount": amount,
                "category": "spare_part",
            }
        )

    for row in getattr(bundle, "materials", []) or []:
        qty = flt(getattr(row, "quantity", 0)) or flt(getattr(row, "qty", 0)) or 0
        rate = flt(getattr(row, "unit_price", 0)) or flt(getattr(row, "rate", 0)) or 0
        amount = flt(getattr(row, "amount", 0))
        if not amount and qty and rate:
            amount = qty * rate
        if amount and qty and not rate:
            rate = amount / qty
        description = (
            getattr(row, "item_name", None)
            or getattr(row, "part_name", None)
            or getattr(row, "material", None)
            or _("Material")
        )
        material_rows.append(
            {
                "code": getattr(row, "item_code", None) or getattr(row, "material", None),
                "description": description,
                "qty": qty,
                "uom": getattr(row, "uom", None) or getattr(row, "unit", None),
                "rate": rate,
                "amount": amount,
                "category": "material",
            }
        )

    return {
        "service_fee": service_fee,
        "spare_parts": spare_rows,
        "materials": material_rows,
    }


def _collect_required_parts(parts: Iterable[Any]) -> List[Dict[str, Any]]:
    """Extract required parts from service order."""
    items: List[Dict[str, Any]] = []
    for row in parts or []:
        qty = flt(getattr(row, "qty", 0)) or flt(getattr(row, "quantity", 0)) or 0
        rate = flt(getattr(row, "rate", 0)) or flt(getattr(row, "unit_price", 0)) or 0
        amount = flt(getattr(row, "amount", 0))
        if not amount and qty and rate:
            amount = qty * rate
        if amount and qty and not rate:
            rate = amount / qty
        description = (
            getattr(row, "item_name", None)
            or getattr(row, "item_code", None)
            or _("Komponen")
        )
        items.append(
            {
                "code": getattr(row, "item_code", None),
                "description": description,
                "qty": qty,
                "uom": getattr(row, "uom", None) or getattr(row, "unit", None),
                "rate": rate,
                "amount": amount,
                "category": "spare_part",
            }
        )
    return items


def _resolve_user_full_name(user_id: Optional[str]) -> str:
    """Get full name of a user."""
    if not user_id:
        return "-"
    try:
        with _ignore_permissions():
            full_name = frappe.db.get_value("User", user_id, "full_name")
    except Exception:
        full_name = None
    return (full_name or user_id or "-").strip()


def _resolve_employee_name(employee_id: Optional[str]) -> str:
    """Get the human friendly name for an employee identifier."""
    if not employee_id:
        return "-"

    identifier = (str(employee_id).strip() if employee_id else "") or "-"

    try:
        with _ignore_permissions():
            row = frappe.db.get_value(
                "Employee",
                identifier,
                ["employee_name", "user_id"],
                as_dict=True,
            )
    except Exception:
        row = None

    if not row:
        return identifier

    employee_name = (row.get("employee_name") or "").strip()
    if employee_name:
        return employee_name

    user_id = (row.get("user_id") or "").strip()
    if user_id:
        resolved = _resolve_user_full_name(user_id)
        if resolved and resolved != "-":
            return resolved

    return identifier


def _resolve_mechanic_name(service_order: frappe.Document) -> str:
    """Extract the best available mechanic name from the service order."""

    name_fields = (
        "assigned_mechanic_display",
        "assigned_mechanic_name",
        "mechanic_in_charge_name",
        "mechanic_name",
        "technician_name",
    )

    for field in name_fields:
        raw_value = getattr(service_order, field, None)
        if not raw_value:
            continue
        value = raw_value.strip() if isinstance(raw_value, str) else str(raw_value).strip()
        if value:
            return value

    id_fields = (
        "assigned_mechanic",
        "mechanic_in_charge",
        "mechanic",
        "technician",
        "technician_in_charge",
    )

    for field in id_fields:
        raw_identifier = getattr(service_order, field, None)
        if not raw_identifier:
            continue

        identifier = (
            raw_identifier.strip()
            if isinstance(raw_identifier, str)
            else str(raw_identifier).strip()
        )
        if not identifier:
            continue

        resolved = _resolve_employee_name(identifier)
        if resolved and resolved != "-":
            return resolved

        return identifier

    return "-"


def build_service_estimate_context(service_order: frappe.Document) -> Dict[str, Any]:
    """Build context dictionary for PDF template rendering."""
    
    # Get related documents
    customer = _safe_get_doc("Garage Customer", getattr(service_order, "customer", None))
    vehicle = _safe_get_doc("Garage Vehicle", getattr(service_order, "vehicle", None))
    branch_doc = _safe_get_doc("Garage Branch", getattr(service_order, "branch", None))
    branch_info = {
        "name": "-",
        "code": "-",
        "address": _format_branch_address(branch_doc),
        "contact": _format_branch_contact(branch_doc),
        "phone": "-",
        "email": "-",
    }
    if branch_doc:
        branch_name = (getattr(branch_doc, "branch_name", None) or getattr(branch_doc, "name", None) or "-").strip()
        branch_code = (getattr(branch_doc, "branch_code", None) or getattr(branch_doc, "name", None) or "-").strip()
        branch_info["name"] = branch_name or "-"
        branch_info["code"] = (branch_code or "-").upper()
        phone_value = (getattr(branch_doc, "phone", None) or "").strip()
        email_value = (getattr(branch_doc, "email", None) or "").strip()
        branch_info["phone"] = phone_value or "-"
        branch_info["email"] = email_value or "-"

    # Get service bundle if exists
    bundle_doc = None
    if getattr(service_order, "service_bundle", None):
        bundle_doc = _safe_get_doc("Garage Service Bundle", service_order.service_bundle)

    # Collect bundle items
    bundle_items = _collect_bundle_items(bundle_doc) if bundle_doc else None
    service_fee = bundle_items["service_fee"] if bundle_items else 0
    spare_rows = bundle_items["spare_parts"] if bundle_items else []
    material_rows = bundle_items["materials"] if bundle_items else []

    # If no bundle, use required parts from service order
    if not bundle_items:
        spare_rows = _collect_required_parts(getattr(service_order, "required_parts", []))

    # Build job items list
    job_items: List[Dict[str, Any]] = []
    if service_fee:
        label = getattr(service_order, "service_bundle_name", None) or getattr(bundle_doc, "bundle_name", None)
        if label:
            description = _("Biaya Jasa - {name}").format(name=label)
        else:
            description = _("Biaya Jasa")
        job_items.append(
            {
                "description": description,
                "amount": service_fee,
                "qty": 1,
                "uom": _("Jasa"),
                "rate": service_fee,
                "category": "service",
            }
        )

    for row in spare_rows:
        job_items.append(row)
    for row in material_rows:
        job_items.append(row)

    # Calculate totals
    spare_total = sum(row["amount"] for row in spare_rows)
    material_total = sum(row["amount"] for row in material_rows)

    # Handle case where service fee needs to be calculated
    if not service_fee and not bundle_items:
        estimated_amount = flt(getattr(service_order, "total_estimated_amount", 0))
        if estimated_amount and estimated_amount > (spare_total + material_total):
            service_fee = estimated_amount - (spare_total + material_total)
            job_items.insert(
                0,
                {
                    "description": _("Biaya Jasa"),
                    "amount": service_fee,
                    "qty": 1,
                    "uom": _("Jasa"),
                    "rate": service_fee,
                    "category": "service",
                },
            )
        elif estimated_amount and not job_items:
            job_items.append(
                {
                    "description": _("Estimasi Service"),
                    "amount": estimated_amount,
                    "qty": 1,
                    "uom": _("Jasa"),
                    "rate": estimated_amount,
                    "category": "service",
                }
            )
            service_fee = estimated_amount

    # Calculate grand total
    grand_total = service_fee + spare_total + material_total
    if not grand_total:
        grand_total = flt(getattr(service_order, "total_estimated_amount", 0))
    if not grand_total:
        grand_total = sum(item["amount"] for item in job_items)

    # Format job items with currency
    def enrich(item: Dict[str, Any]) -> Dict[str, Any]:
        value = flt(item.get("amount") or 0)
        qty_value = flt(item.get("qty") or 0)
        rate_value = flt(item.get("rate") or 0)
        if not rate_value and qty_value and value:
            rate_value = value / qty_value
        return {
            "code": item.get("code") or "-",
            "description": item.get("description") or "-",
            "qty": qty_value,
            "qty_formatted": _format_quantity(qty_value),
            "uom": item.get("uom") or "-",
            "rate": rate_value,
            "rate_formatted": _format_currency(rate_value) if rate_value else "-",
            "amount": value,
            "amount_formatted": _format_currency(value),
            "category": item.get("category") or "",
        }

    job_items = [enrich(item) for item in job_items]

    parts_material_total = sum(
        item["amount"]
        for item in job_items
        if item.get("category") in {"spare_part", "material"}
    )

    # Build summary
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

    estimated_amount = flt(getattr(service_order, "total_estimated_amount", 0))
    if not estimated_amount:
        estimated_amount = summary["grand_total"]

    dpp = estimated_amount
    ppn = dpp * 0.11 if dpp else 0
    pph = dpp * 0.025 if dpp else 0
    total_with_tax = dpp + ppn + pph

    taxes = {
        "parts_material": parts_material_total,
        "parts_material_formatted": _format_currency(parts_material_total),
        "service_fee": summary["service_total"],
        "service_fee_formatted": _format_currency(summary["service_total"]),
        "dpp": dpp,
        "dpp_formatted": _format_currency(dpp),
        "ppn": ppn,
        "ppn_formatted": _format_currency(ppn),
        "pph": pph,
        "pph_formatted": _format_currency(pph),
        "total": total_with_tax,
        "total_formatted": _format_currency(total_with_tax),
    }

    # Get intake notes
    intake_notes = (
        getattr(service_order, "service_notes", None) 
        or getattr(service_order, "inspection_summary", None) 
        or getattr(service_order, "notes", None)
        or "-"
    )

    # Build meta information
    meta = {
        "number": format_service_order_document_number(service_order),
        "date": _format_date(getattr(service_order, "creation", None)),
        "customer": getattr(customer, "customer_name", None) or getattr(service_order, "customer", "-"),
        "phone": (
            getattr(service_order, "primary_contact", None)
            or getattr(customer, "phone", None)
            or "-"
        ),
        "contact_person": getattr(customer, "customer_name", None) or getattr(service_order, "customer", "-"),
        "mechanic": _resolve_mechanic_name(service_order),
        "branch_name": branch_info["name"],
        "branch_code": branch_info["code"],
        "branch_contact": branch_info["contact"],
        "branch_email": branch_info["email"],
        "branch_address": branch_info["address"],
    }

    # Build vehicle information
    vehicle_info = {
        "description": _format_vehicle_description(vehicle),
        "plate": _format_plate(vehicle),
    }

    # Build signatures
    signatures = {
        "prepared_by": _resolve_user_full_name(getattr(service_order, "service_advisor", None)),
        "approved_by": getattr(customer, "customer_name", None) or getattr(service_order, "customer", "-"),
    }

    assigned_mechanic_name = _resolve_mechanic_name(service_order)
    signatures["assigned_mechanic"] = assigned_mechanic_name

    service_advisor_name = signatures.get("prepared_by") or "-"

    # Return complete context
    return {
        "title": _("ESTIMASI BIAYA PERBAIKAN KENDARAAN"),
        "meta": meta,
        "vehicle": vehicle_info,
        "job_items": job_items,
        "summary": summary,
        "notes": intake_notes,
        "signatures": signatures,
        "branch": branch_info,
        "assigned_mechanic": assigned_mechanic_name,
        "service_advisor_name": service_advisor_name,
        "taxes": taxes,
    }


def create_service_estimate_pdf(service_order_name: str) -> Optional[Dict[str, str]]:
    """
    Generate service estimate PDF for a given service order.
    
    Returns:
        Dictionary with filename, content (base64), and mime_type
        Returns None if generation fails
    """
    if not service_order_name:
        frappe.log_error(
            title="Service estimate PDF - Missing order name",
            message="service_order_name parameter is required"
        )
        return None

    # Load service order
    try:
        with _ignore_permissions():
            service_order = frappe.get_doc("Garage Service Order", service_order_name)
    except Exception as e:
        frappe.log_error(
            title="Service estimate PDF - Load failed",
            message=f"Could not load service order {service_order_name}\nError: {str(e)}\n{frappe.get_traceback()}",
        )
        return None

    # Build context
    try:
        context = build_service_estimate_context(service_order)
        
        # Log context for debugging (remove in production)
        frappe.logger().info(f"PDF Context for {service_order_name}: Job items count: {len(context.get('job_items', []))}")
        
    except Exception as e:
        frappe.log_error(
            title="Service estimate PDF - Context build failed",
            message=f"Could not build context for {service_order_name}\nError: {str(e)}\n{frappe.get_traceback()}",
        )
        return None

    # Render HTML and generate PDF
    try:
        template = frappe.get_template(TEMPLATE_PATH)
        html = template.render(context)
        
        # Log HTML length for debugging
        frappe.logger().info(f"Generated HTML length: {len(html)} characters")
        
        pdf_content = get_pdf(html)
        
        if not pdf_content:
            frappe.log_error(
                title="Service estimate PDF - Empty PDF",
                message=f"PDF generation returned empty content for {service_order_name}"
            )
            return None
            
    except Exception as e:
        frappe.log_error(
            title="Service estimate PDF - Rendering failed",
            message=f"Could not render PDF for {service_order_name}\nError: {str(e)}\n{frappe.get_traceback()}",
        )
        return None

    # Encode and return
    filename = _compose_document_filename(service_order, suffix="SPK")
    encoded = base64.b64encode(pdf_content).decode("utf-8")
    
    # Log success
    frappe.logger().info(f"Successfully generated PDF for {service_order_name}, size: {len(pdf_content)} bytes")

    return {
        "filename": filename,
        "content": encoded,
        "mime_type": "application/pdf",
    }


def create_spk_pdf(service_order_name: str) -> Optional[Dict[str, str]]:
    """Generate a simple SPK (work order) PDF for the service order."""

    if not service_order_name:
        frappe.log_error(
            title="SPK PDF - Missing order name",
            message="service_order_name parameter is required",
        )
        return None

    try:
        with _ignore_permissions():
            service_order = frappe.get_doc("Garage Service Order", service_order_name)
    except Exception:
        frappe.log_error(
            title="SPK PDF - Load failed",
            message=f"Could not load service order {service_order_name}\n{frappe.get_traceback()}",
        )
        return None

    try:
        context = build_service_estimate_context(service_order)
        context = dict(context)
        context["title"] = _("SURAT PERINTAH KERJA")
    except Exception:
        frappe.log_error(
            title="SPK PDF - Context failed",
            message=f"Could not build context for {service_order_name}\n{frappe.get_traceback()}",
        )
        return None

    try:
        template = frappe.get_template(SPK_TEMPLATE_PATH)
        html = template.render(context)
        pdf_content = get_pdf(html)
    except Exception:
        frappe.log_error(
            title="SPK PDF - Rendering failed",
            message=f"Could not render PDF for {service_order_name}\n{frappe.get_traceback()}",
        )
        return None

    if not pdf_content:
        frappe.log_error(
            title="SPK PDF - Empty PDF",
            message=f"PDF generation returned empty content for {service_order_name}",
        )
        return None

    filename = _compose_document_filename(service_order, suffix="SPK")
    encoded = base64.b64encode(pdf_content).decode("utf-8")

    return {
        "filename": filename,
        "content": encoded,
        "mime_type": "application/pdf",
    }


def persist_service_estimate_pdf(
    service_order_name: str,
    pdf_payload: Optional[Dict[str, Any]],
    *,
    replace_existing: bool = True,
) -> Optional[Dict[str, Any]]:
    """Attach the generated estimate PDF to the service order.

    Args:
        service_order_name: The ``Garage Service Order`` identifier.
        pdf_payload: The dictionary produced by :func:`create_service_estimate_pdf`.
        replace_existing: Whether to remove files with the same name beforehand.

    Returns:
        Mapping with details about the saved file (``file_doc``, ``file_url`` ...)
        or ``None`` when the attachment step fails.
    """

    if not service_order_name:
        return None

    if not pdf_payload or not pdf_payload.get("content"):
        return None

    filename = (pdf_payload.get("filename") or "").strip()
    if not filename:
        service_order = _safe_get_doc("Garage Service Order", service_order_name)
        if service_order:
            filename = _compose_document_filename(service_order, suffix="SPK")
        else:
            filename = f"{service_order_name}.pdf"
    if not filename.lower().endswith(".pdf"):
        filename = f"{filename}.pdf"

    content = (pdf_payload.get("content") or "").strip()
    if not content:
        return None

    if content.startswith("data:"):
        parts = content.split(",", 1)
        if len(parts) == 2:
            content = parts[1]

    file_doc = None

    try:
        if replace_existing:
            existing_files = frappe.get_all(
                "File",
                filters={
                    "attached_to_doctype": "Garage Service Order",
                    "attached_to_name": service_order_name,
                    "file_name": filename,
                    "is_folder": 0,
                },
                fields=["name"],
            )

            for row in existing_files:
                try:
                    frappe.delete_doc(
                        "File",
                        row["name"],
                        ignore_permissions=True,
                        force=True,
                    )
                except Exception:
                    frappe.log_error(
                        title="Service estimate PDF - Cleanup failed",
                        message=(
                            "Tidak dapat menghapus file lama {file} untuk {order}\n{trace}".format(
                                file=row["name"],
                                order=service_order_name,
                                trace=frappe.get_traceback(),
                            )
                        ),
                    )

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
            title="Service estimate PDF - Save failed",
            message=(
                "Tidak dapat menyimpan PDF estimasi untuk {order}\n{trace}".format(
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
