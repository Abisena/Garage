"""Jinja helpers exposed to templates."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import frappe

from garage.api import auth


def get_portal_nav_items() -> List[Dict[str, Any]]:
    """Return the static portal navigation configuration.

    Templates render the structure client-side, so return a shallow copy of the
    configuration to avoid accidental mutation of the source data.
    """

    return [dict(item) for item in auth.PORTAL_NAV_ITEMS]


_ONES = [
    "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan",
    "sepuluh", "sebelas",
]


def _angka_ke_kata(n: int) -> str:
    """Recursive Indonesian number-to-words, e.g. 755900 -> "tujuh ratus lima
    puluh lima ribu sembilan ratus". No existing terbilang utility in this
    codebase (or in Frappe core - frappe.utils.money_in_words is English-only),
    so implemented directly per the standard Indonesian short-scale algorithm."""
    if n < 12:
        return _ONES[n]
    if n < 20:
        return _angka_ke_kata(n - 10) + " belas"
    if n < 100:
        sisa = n % 10
        return _angka_ke_kata(n // 10) + " puluh" + (f" {_angka_ke_kata(sisa)}" if sisa else "")
    if n < 200:
        sisa = n - 100
        return "seratus" + (f" {_angka_ke_kata(sisa)}" if sisa else "")
    if n < 1000:
        sisa = n % 100
        return _angka_ke_kata(n // 100) + " ratus" + (f" {_angka_ke_kata(sisa)}" if sisa else "")
    if n < 2000:
        sisa = n - 1000
        return "seribu" + (f" {_angka_ke_kata(sisa)}" if sisa else "")
    if n < 1_000_000:
        sisa = n % 1000
        return _angka_ke_kata(n // 1000) + " ribu" + (f" {_angka_ke_kata(sisa)}" if sisa else "")
    if n < 1_000_000_000:
        sisa = n % 1_000_000
        return _angka_ke_kata(n // 1_000_000) + " juta" + (f" {_angka_ke_kata(sisa)}" if sisa else "")
    if n < 1_000_000_000_000:
        sisa = n % 1_000_000_000
        return _angka_ke_kata(n // 1_000_000_000) + " miliar" + (f" {_angka_ke_kata(sisa)}" if sisa else "")
    sisa = n % 1_000_000_000_000
    return _angka_ke_kata(n // 1_000_000_000_000) + " triliun" + (f" {_angka_ke_kata(sisa)}" if sisa else "")


def rupiah_terbilang(amount) -> str:
    """Indonesian words for a rupiah amount, sentence-cased with a "rupiah"
    suffix - e.g. 755900 -> "Tujuh ratus lima puluh lima ribu sembilan ratus
    rupiah". Used on printed receipts/kuitansi."""
    try:
        n = int(round(float(amount or 0)))
    except (TypeError, ValueError):
        n = 0
    if n <= 0:
        return "Nol rupiah"
    words = f"{_angka_ke_kata(n)} rupiah"
    return words[0].upper() + words[1:]


def get_payment_receipt_context(doc) -> Dict[str, Any]:
    """Assemble the branch identity, linked Sales Invoice/Service Order/
    vehicle and receiving-bank info a Payment Entry receipt print format
    needs. Payment Entry (and Sales Invoice) don't carry a `branch` field on
    this site, so the branch is resolved by chasing the same Sales Invoice ->
    Garage Service Order link the desk form's own "Untuk Service Order" badge
    uses (see garage_theme.js's gpeRenderSourceInfo)."""
    invoice_ref = next(
        (r for r in (doc.references or []) if r.reference_doctype == "Sales Invoice"), None
    )

    service_order: Optional[Dict[str, Any]] = None
    if invoice_ref:
        service_order_name = frappe.db.get_value(
            "Sales Invoice", invoice_ref.reference_name, "service_order"
        )
        if service_order_name:
            service_order = frappe.db.get_value(
                "Garage Service Order",
                service_order_name,
                ["service_order_type", "vehicle", "vehicle_display", "branch"],
                as_dict=True,
            )

    branch_fields = ["branch_name", "address_line1", "address_line2", "city", "phone", "email"]
    branch = None
    if service_order and service_order.get("branch"):
        branch = frappe.db.get_value("Garage Branch", service_order["branch"], branch_fields, as_dict=True)
    if not branch:
        # No resolvable link (e.g. a payment with no Sales Invoice reference
        # yet) - fall back to the first active branch rather than showing a
        # blank header.
        branch = frappe.db.get_value("Garage Branch", {"is_active": 1}, branch_fields, as_dict=True)

    bank_name = None
    if doc.paid_to:
        bank_name = frappe.db.get_value("Bank Account", {"account": doc.paid_to}, "bank")

    return {
        "branch": branch,
        "invoice_name": invoice_ref.reference_name if invoice_ref else None,
        "service_order": service_order,
        "bank_name": bank_name,
    }


_SERVICE_ITEM_GROUP = "Services"
_NEXT_SERVICE_INTERVAL_KM = 5000


def _to_km(value) -> Optional[int]:
    """Garage Service Order.vehicle_mileage is a free-text Data field, not a
    number field, so it can hold non-numeric or blank values - coerce
    defensively rather than letting a bad value break the print format."""
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _format_km(value: Optional[int]) -> Optional[str]:
    if value is None:
        return None
    return f"{value:,}".replace(",", ".") + " km"


def _get_or_generate_nota_service_number(doc) -> str:
    """NOTA-{4-digit year}{5-digit sequence}, e.g. NOTA-202600001 - same
    scheme as Vehicle Handover's SIKK number. Generated lazily the first
    time the Nota Service print format is actually opened for this
    invoice (not at invoice creation), so an invoice nobody has printed
    yet stays blank - see garage_theme.js's Create > Payment guard, which
    refuses to create a Payment Entry until this is set."""

    existing = frappe.db.get_value("Sales Invoice", doc.name, "nota_service_number")
    if existing:
        return existing

    year = str(frappe.utils.getdate(doc.posting_date or frappe.utils.nowdate()).year)
    prefix = f"NOTA-{year}"
    existing_count = frappe.db.count(
        "Sales Invoice", filters={"nota_service_number": ["like", f"{prefix}%"]}
    )

    candidate_seq = existing_count + 1
    while True:
        candidate = f"{prefix}{candidate_seq:05d}"
        if not frappe.db.exists("Sales Invoice", {"nota_service_number": candidate}):
            break
        candidate_seq += 1

    frappe.db.set_value("Sales Invoice", doc.name, "nota_service_number", candidate, update_modified=False)
    doc.nota_service_number = candidate
    return candidate


def get_nota_service_context(doc) -> Dict[str, Any]:
    """Assemble the branch, customer, vehicle and mechanic info a Sales
    Invoice "Nota Service" print format needs, plus items split into jasa
    (service) vs part subtotals. Sourced entirely from the linked Garage
    Service Order (via Sales Invoice.service_order) so the printed nota can
    never show data that didn't come from the source service order."""
    nota_service_number = _get_or_generate_nota_service_number(doc)

    service_order = None
    if getattr(doc, "service_order", None):
        service_order = frappe.db.get_value(
            "Garage Service Order",
            doc.service_order,
            [
                "branch",
                "customer",
                "customer_display",
                "customer_address",
                "vehicle",
                "vehicle_display",
                "vehicle_brand",
                "vehicle_model",
                "vehicle_year",
                "vehicle_mileage",
                "assigned_mechanic",
                "assigned_mechanic_name",
            ],
            as_dict=True,
        )

    branch_fields = ["branch_name", "address_line1", "address_line2", "city", "phone", "email"]
    branch = None
    if service_order and service_order.get("branch"):
        branch = frappe.db.get_value("Garage Branch", service_order["branch"], branch_fields, as_dict=True)
    if not branch:
        branch = frappe.db.get_value("Garage Branch", {"is_active": 1}, branch_fields, as_dict=True)

    customer_phone = None
    if service_order and service_order.get("customer"):
        customer_phone = frappe.db.get_value("Garage Customer", service_order["customer"], "phone")

    vehicle_mileage = _to_km(service_order.get("vehicle_mileage")) if service_order else None
    next_service_km = vehicle_mileage + _NEXT_SERVICE_INTERVAL_KM if vehicle_mileage is not None else None

    items: List[Dict[str, Any]] = []
    subtotal_jasa = 0.0
    subtotal_part = 0.0
    total_ppn = 0.0
    for row in doc.items or []:
        item_group = None
        if row.item_code:
            item_group = frappe.get_cached_value("Item", row.item_code, "item_group")
        is_jasa = item_group == _SERVICE_ITEM_GROUP

        # doc.total_taxes_and_charges is always 0 in this app - PPN is baked
        # into each item's tax-inclusive rate via the custom ppn_percent
        # field instead (see repair_qc.py's _apply_ppn_pricing), so row.amount
        # is tax-inclusive. Back the tax out per line (same formula
        # garage_theme.js's gsiRenderTotalsBox() uses for the "Total Taxes
        # and Charges (PPN)" row on the Sales Invoice form) so the printed
        # "Subtotal" column shows the pre-tax amount and Jasa + Part + PPN
        # adds back up to the tax-inclusive grand total, instead of Jasa/Part
        # silently already including tax and PPN double-counting on top.
        gross_amount = row.amount or 0
        ppn_percent = row.get("ppn_percent") or 0
        pre_tax_amount = gross_amount / (1 + ppn_percent / 100) if ppn_percent else gross_amount
        total_ppn += gross_amount - pre_tax_amount

        if is_jasa:
            subtotal_jasa += pre_tax_amount
        else:
            subtotal_part += pre_tax_amount

        item_name = row.item_name or row.item_code
        description = frappe.utils.strip_html(row.description or "").strip()
        if description == item_name:
            description = None

        items.append(
            {
                "item_code": row.item_code,
                "item_name": item_name,
                "description": description or None,
                "qty": row.qty,
                "amount": pre_tax_amount,
                "is_jasa": is_jasa,
            }
        )

    return {
        "nota_service_number": nota_service_number,
        "branch": branch,
        "service_order": service_order,
        "customer_phone": customer_phone,
        "vehicle_mileage_display": _format_km(vehicle_mileage),
        "next_service_km_display": _format_km(next_service_km),
        "line_items": items,
        "subtotal_jasa": subtotal_jasa,
        "subtotal_part": subtotal_part,
        "total_ppn": total_ppn,
        # Explicitly Jasa + Part + PPN, per what the printed nota shows above
        # it - not doc.grand_total directly, so the total on the page is
        # always exactly the sum of the lines printed above it, even if
        # grand_total and this ever drift apart for some other reason.
        "total_tagihan": subtotal_jasa + subtotal_part + total_ppn,
    }


def get_vehicle_handover_context(doc) -> Dict[str, Any]:
    """Assemble the branch, service-order timeline, mechanic and invoice
    reference info the "SIKK" (Surat Izin Keluar/Masuk Kendaraan) print
    format needs. Vehicle/owner fields are already plain fields on the
    Vehicle Handover doc itself (fetched from its Service Order at save
    time), so only the extra context not already on the doc is built here."""

    service_order = None
    if getattr(doc, "service_order", None):
        service_order = frappe.db.get_value(
            "Garage Service Order",
            doc.service_order,
            ["order_date", "assigned_mechanic", "assigned_mechanic_name", "branch"],
            as_dict=True,
        )

    branch_fields = ["branch_name", "address_line1", "address_line2", "city", "phone", "email"]
    branch = None
    branch_name = getattr(doc, "branch", None) or (service_order or {}).get("branch")
    if branch_name:
        branch = frappe.db.get_value("Garage Branch", branch_name, branch_fields, as_dict=True)
    if not branch:
        branch = frappe.db.get_value("Garage Branch", {"is_active": 1}, branch_fields, as_dict=True)

    invoice_name = None
    ref_nota = None
    jenis_service = None
    if getattr(doc, "service_order", None):
        invoice = frappe.db.get_value(
            "Sales Invoice",
            {"service_order": doc.service_order, "docstatus": ["<", 2]},
            ["name", "nota_service_number"],
            as_dict=True,
        )
        if invoice:
            invoice_name = invoice.name
            # Prefer the Nota Service's own document number over the raw
            # Sales Invoice name - by the time a SIKK exists, a Payment
            # Entry must already exist too, which the Create > Payment
            # guard in garage_theme.js only allows once Nota Service has
            # been printed (and therefore has a number), so this should
            # always be set in practice; falls back to the invoice name
            # just in case (e.g. a handover created outside that flow).
            ref_nota = invoice.nota_service_number or invoice.name

            service_item_names = []
            for row in frappe.get_all(
                "Sales Invoice Item", filters={"parent": invoice_name}, fields=["item_code", "item_name"]
            ):
                item_group = frappe.get_cached_value("Item", row.item_code, "item_group")
                if item_group == _SERVICE_ITEM_GROUP:
                    service_item_names.append(row.item_name or row.item_code)
            jenis_service = ", ".join(service_item_names) or None

    tanggal_keluar = getattr(doc, "submission_date", None)

    return {
        "branch": branch,
        "tanggal_masuk": (service_order or {}).get("order_date"),
        "tanggal_keluar": tanggal_keluar,
        "mechanic_name": (service_order or {}).get("assigned_mechanic_name"),
        "mechanic_code": (service_order or {}).get("assigned_mechanic"),
        "jenis_service": jenis_service,
        "ref_nota": ref_nota,
    }
