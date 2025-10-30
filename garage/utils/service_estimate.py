"""Helpers to build and render service estimate PDFs."""
from __future__ import annotations

import base64
from contextlib import contextmanager
from typing import Any, Dict, Iterable, List, Optional

import frappe
from frappe import _
from frappe.utils import flt, format_datetime, get_datetime, get_url
from frappe.utils.pdf import get_pdf
from frappe.utils.file_manager import save_file

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
    """Format currency in Indonesian Rupiah format."""
    amount = flt(value or 0)
    rounded = int(round(amount))
    return f"Rp{rounded:,.0f}".replace(",", ".")


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


def _collect_bundle_items(bundle: frappe.Document) -> Dict[str, Any]:
    """Extract items from service bundle."""
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
    """Extract required parts from service order."""
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
    """Get full name of a user."""
    if not user_id:
        return "-"
    try:
        with _ignore_permissions():
            full_name = frappe.db.get_value("User", user_id, "full_name")
    except Exception:
        full_name = None
    return (full_name or user_id or "-").strip()


def build_service_estimate_context(service_order: frappe.Document) -> Dict[str, Any]:
    """Build context dictionary for PDF template rendering."""
    
    # Get related documents
    customer = _safe_get_doc("Garage Customer", getattr(service_order, "customer", None))
    vehicle = _safe_get_doc("Garage Vehicle", getattr(service_order, "vehicle", None))

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
        job_items.append({"description": description, "amount": service_fee})

    for row in spare_rows:
        job_items.append({"description": row["description"], "amount": row["amount"]})
    for row in material_rows:
        job_items.append({"description": row["description"], "amount": row["amount"]})

    # Calculate totals
    spare_total = sum(row["amount"] for row in spare_rows)
    material_total = sum(row["amount"] for row in material_rows)

    # Handle case where service fee needs to be calculated
    if not service_fee and not bundle_items:
        estimated_amount = flt(getattr(service_order, "total_estimated_amount", 0))
        if estimated_amount and estimated_amount > (spare_total + material_total):
            service_fee = estimated_amount - (spare_total + material_total)
            job_items.insert(0, {"description": _("Biaya Jasa"), "amount": service_fee})
        elif estimated_amount and not job_items:
            job_items.append({"description": _("Estimasi Service"), "amount": estimated_amount})
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
        return {
            "description": item.get("description") or "-",
            "amount": value,
            "amount_formatted": _format_currency(value),
        }

    job_items = [enrich(item) for item in job_items]

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

    # Get intake notes
    intake_notes = (
        getattr(service_order, "service_notes", None) 
        or getattr(service_order, "inspection_summary", None) 
        or getattr(service_order, "notes", None)
        or "-"
    )

    # Build meta information
    meta = {
        "number": getattr(service_order, "name", "-"),
        "date": _format_date(getattr(service_order, "creation", None)),
        "customer": getattr(customer, "customer_name", None) or getattr(service_order, "customer", "-"),
        "phone": (
            getattr(service_order, "primary_contact", None)
            or getattr(customer, "phone", None)
            or "-"
        ),
        "contact_person": getattr(customer, "customer_name", None) or getattr(service_order, "customer", "-"),
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

    # Return complete context
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
    filename = f"{service_order.name}-estimasi-service.pdf"
    encoded = base64.b64encode(pdf_content).decode("utf-8")
    
    # Log success
    frappe.logger().info(f"Successfully generated PDF for {service_order_name}, size: {len(pdf_content)} bytes")

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

    filename = (pdf_payload.get("filename") or f"{service_order_name}-estimasi-service.pdf").strip()
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
