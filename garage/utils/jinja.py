"""Jinja helpers exposed to templates."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import frappe
from frappe.utils import flt

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


def _mark_nota_service_printed(doc) -> str:
    """The printed Nota Service now just shows the Sales Invoice's own
    standard document number (doc.name) instead of a separate NOTA-YYYYNNNNN
    scheme - having two different document numbers on the same invoice was
    confusing, explicit user decision to drop the second one and keep
    things standard.

    What still needs doing here: nota_service_printed (a Check field) gets
    flipped to 1 the first time this print format is actually opened for
    this invoice (not at invoice creation) - see garage_theme.js's
    Create > Payment guard, which refuses to create a Payment Entry until
    this is set, i.e. until the customer's nota has actually been printed
    at least once. That guard is the whole reason this field/function still
    exists even though there's no number left to generate."""

    if not frappe.db.get_value("Sales Invoice", doc.name, "nota_service_printed"):
        frappe.db.set_value("Sales Invoice", doc.name, "nota_service_printed", 1, update_modified=False)
        # Print preview loads via a plain GET (/printview), which Frappe
        # never auto-commits (only POST/PUT/DELETE/PATCH do - see app.py's
        # request teardown) - without this, the flag above is rolled back
        # the moment the request ends, so the invoice looks un-printed
        # again as soon as the user navigates back, and the Payment guard
        # keeps blocking forever.
        frappe.db.commit()
        doc.nota_service_printed = 1

    return doc.name


def get_nota_service_context(doc) -> Dict[str, Any]:
    """Assemble the branch, customer, vehicle and mechanic info a Sales
    Invoice "Nota Service" print format needs, plus items split into jasa
    (service) vs part subtotals. Mostly sourced from the linked Garage
    Service Order (via Sales Invoice.service_order) - Mekanik has no other
    source and stays blank without one - but Nama/Telepon/Alamat/Plat/
    Kendaraan/KM all fall back to the Sales Invoice's own fields (customer_
    name/contact_mobile/address_display/no_polisi - see sales_order_
    invoice_hooks.py) when there's no Service Order at all (an invoice
    created straight from a Sales Order rather than via the garage's own
    Service Order flow) - explicit user request, a real "Plat" the invoice
    itself already has (SAL-ORD-2026-00010's own vehicle, carried across
    by that same hook) printed as a blank dash otherwise."""
    nota_service_number = _mark_nota_service_printed(doc)

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
        customer_phone = frappe.db.get_value("Customer", service_order["customer"], "mobile_no")
    if not customer_phone:
        customer_phone = doc.get("contact_mobile") or doc.get("contact_phone")

    customer_address = (service_order.get("customer_address") if service_order else None) or doc.get(
        "address_display"
    )

    # No Service Order at all (a Sales-Order-only invoice) means no
    # vehicle_brand/vehicle_model/vehicle_mileage snapshot to fall back on
    # either - look the vehicle up directly the same way Sales Order
    # Print's own get_sales_order_print_context() does, via whichever
    # plate the invoice itself already carries (service_order.vehicle, or
    # failing that doc.no_polisi - see this function's own docstring).
    vehicle_plate = (service_order.get("vehicle") if service_order else None) or doc.get("no_polisi")
    vehicle_fallback = None
    if not (service_order and service_order.get("vehicle_brand")) and vehicle_plate:
        vehicle_fallback = frappe.db.get_value(
            "Garage Vehicle",
            vehicle_plate,
            ["brand", "model", "vehicle_year", "mileage"],
            as_dict=True,
        )

    vehicle_display = None
    vehicle_year = None
    if service_order and service_order.get("vehicle_brand"):
        vehicle_display = " ".join(
            part for part in [service_order.get("vehicle_brand"), service_order.get("vehicle_model")] if part
        ) or None
        vehicle_year = service_order.get("vehicle_year")
    elif vehicle_fallback:
        vehicle_display = " ".join(
            part for part in [vehicle_fallback.get("brand"), vehicle_fallback.get("model")] if part
        ) or None
        vehicle_year = vehicle_fallback.get("vehicle_year")
    elif service_order and service_order.get("vehicle_display"):
        vehicle_display = service_order.get("vehicle_display")

    vehicle_mileage = _to_km(service_order.get("vehicle_mileage")) if service_order else None
    if vehicle_mileage is None and vehicle_fallback:
        vehicle_mileage = _to_km(vehicle_fallback.get("mileage"))
    next_service_km = vehicle_mileage + _NEXT_SERVICE_INTERVAL_KM if vehicle_mileage is not None else None

    items: List[Dict[str, Any]] = []
    subtotal_jasa = 0.0
    subtotal_part = 0.0
    total_diskon = 0.0
    for row in doc.items or []:
        item_group = None
        if row.item_code:
            item_group = frappe.get_cached_value("Item", row.item_code, "item_group")
        is_jasa = item_group == _SERVICE_ITEM_GROUP

        # row.amount (rate x qty) is ALREADY tax-exclusive here - _apply_ppn_
        # pricing (garage/api/portal.py, used by both repair_qc.py and
        # garage_service_order.py's own invoice builders) adds PPN as a real
        # tax row instead of baking it into rate, confirmed directly against
        # a real invoice (net_total + total_taxes_and_charges == grand_total,
        # each item's own rate matching its Item's plain standard_rate). The
        # previous version of this function assumed the opposite - that
        # total_taxes_and_charges was always 0 and PPN lived inside rate -
        # and divided every line by (1 + ppn_percent/100) to "back it out",
        # which instead understated every printed Subtotal/Jasa/Part/Total by
        # dividing an amount that was never tax-inclusive to begin with
        # (reported directly by the user: printed Total Tagihan came out
        # ~10% under the invoice's own real Grand Total). row.amount is used
        # as-is now; doc.total_taxes_and_charges (the tax engine's own real
        # figure) is read directly below instead of being reconstructed.
        gross_amount = flt(row.amount)
        # discount_amount on a Sales Invoice Item is a PER-UNIT figure (same
        # convention as Purchase Order Item elsewhere in this app) - row.
        # amount already reflects the discounted rate, this is purely the
        # informational "how much was taken off" figure for the new Diskon
        # column/summary line below.
        line_discount = flt(row.discount_amount) * flt(row.qty)
        total_diskon += line_discount

        if is_jasa:
            subtotal_jasa += gross_amount
        else:
            subtotal_part += gross_amount

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
                "amount": gross_amount,
                "discount": line_discount,
                "is_jasa": is_jasa,
            }
        )

    total_ppn = flt(doc.total_taxes_and_charges)

    return {
        "nota_service_number": nota_service_number,
        "branch": branch,
        # Order type split - explicit user request: a Sales Invoice with a
        # linked Garage Service Order went through an actual repair/service
        # flow (Repair QC's own auto-generation - see this function's own
        # docstring), while one with no Service Order came straight from a
        # Sales Order (make_sales_invoice_with_vehicle in sales_order_
        # invoice_hooks.py), i.e. a parts-only sale with no service ever
        # performed. The print format uses this to swap the header tagline,
        # hide the Mekanik/KM Service/KM Berikut fields (there's no
        # mechanic or service mileage to show), and relabel the "PETUGAS
        # SERVICE" signature/garansi-jasa note - none of which apply to a
        # plain parts sale.
        "is_service": bool(service_order),
        "service_order": service_order,
        "customer_phone": customer_phone,
        "customer_address": customer_address,
        "vehicle_plate": vehicle_plate,
        "vehicle_display": vehicle_display,
        "vehicle_year": vehicle_year,
        "vehicle_mileage_display": _format_km(vehicle_mileage),
        "next_service_km_display": _format_km(next_service_km),
        "line_items": items,
        "subtotal_jasa": subtotal_jasa,
        "subtotal_part": subtotal_part,
        "total_diskon": total_diskon,
        "total_ppn": total_ppn,
        # doc.grand_total directly now, not a reconstructed sum - Jasa/Part
        # already carry the real (already tax-exclusive, already net-of-
        # discount) amounts and total_ppn is the tax engine's own real
        # figure, so this always matches what's actually owed regardless of
        # how the line items happen to group.
        "total_tagihan": flt(doc.grand_total),
    }


def _get_or_generate_spk_number(doc) -> str:
    """Auto-fill Garage Service Order.spk_number the first time the "Surat
    Perintah Kerja" print format is opened for this order - not at order
    creation. Unlike SIKK/Nota Service, this doctype's own `name` is
    already a proper work-order-shaped number (autoname
    format:BGR-SPK-{YYYY}-{#####}), so there's no separate numbering
    scheme to invent - spk_number just gets stamped with that same name,
    with the blank-until-set field itself acting as the "has this been
    printed yet" signal that start_repair() gates on."""

    existing = frappe.db.get_value("Garage Service Order", doc.name, "spk_number")
    if existing:
        return existing

    frappe.db.set_value("Garage Service Order", doc.name, "spk_number", doc.name, update_modified=False)
    # Print preview loads via a plain GET (/printview), which Frappe never
    # auto-commits (only POST/PUT/DELETE/PATCH do - see app.py's request
    # teardown) - without this, spk_number above is rolled back the moment
    # the request ends, so start_repair()'s gate sees it as never-printed
    # again and keeps sending the user back to the print screen.
    frappe.db.commit()
    doc.spk_number = doc.name
    return doc.name


def get_service_order_print_context(doc) -> Dict[str, Any]:
    """Context for the "Garage Service Order Print" (Surat Perintah Kerja)
    format. Its only job right now is triggering spk_number generation as
    a side effect of being called - see _get_or_generate_spk_number()."""

    return {"spk_number": _get_or_generate_spk_number(doc)}


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
            ["name"],
            as_dict=True,
        )
        if invoice:
            invoice_name = invoice.name
            # The Nota Service print format now just shows the Sales
            # Invoice's own standard document number (see
            # _mark_nota_service_printed's docstring above), so this is
            # simply the invoice name - no separate number to prefer.
            ref_nota = invoice.name

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


def _to_float(value) -> float:
    try:
        return float(str(value or "").replace(",", ""))
    except (TypeError, ValueError):
        return 0.0


def _format_idr(value: float) -> str:
    """1127500.0 -> "1.127.500,00" - Indonesian thousands-dot/decimal-comma
    style, matching how amounts are printed elsewhere in this app - done
    directly here rather than via frappe.utils.fmt_money, since that
    depends on the site's System Settings number_format, which isn't
    guaranteed to already be set to the Indonesian convention. Formats
    US-style first (Python's own ",.2f"), then swaps "," and "." - a NUL
    placeholder is needed for the swap since a direct two-step replace
    would turn "," into "." and then immediately re-match that same "."
    in the next replace, corrupting the very digits it just placed."""
    us = f"{value:,.2f}"
    return us.translate(str.maketrans({",": "\x00", ".": ","})).replace("\x00", ".")


def get_bank_statement_import_print_context(doc) -> Dict[str, Any]:
    """Context for the Bank Statement Import recap print format. The
    transaction table/totals are built from get_imported_rows() (reads the
    doc's own cleaned file) rather than querying Bank Transaction directly,
    since that doctype has no field linking a record back to which import
    created it - the cleaned file is the only reliable "what did THIS
    document import" source. error_count comes from Data Import Log (the
    real per-row outcome of the background import job); skipped_count
    comes from the skipped_row_count custom field (garage.utils.
    bca_bank_statement_import.clean_import_file persists it at validate()
    time, since rows dropped during cleaning never make it into the
    cleaned file - there'd be nothing left here to re-derive that count
    from)."""
    from garage.utils.bca_bank_statement_import import get_imported_rows

    rows = get_imported_rows(doc.name)
    for row in rows:
        row["deposit_amt"] = _to_float(row["deposit"])
        row["withdrawal_amt"] = _to_float(row["withdrawal"])
        row["deposit_fmt"] = _format_idr(row["deposit_amt"]) if row["deposit_amt"] else ""
        row["withdrawal_fmt"] = _format_idr(row["withdrawal_amt"]) if row["withdrawal_amt"] else ""
        row["balance_fmt"] = _format_idr(_to_float(row["balance"]))

    deposit_count = sum(1 for r in rows if r["deposit_amt"] > 0)
    withdrawal_count = sum(1 for r in rows if r["withdrawal_amt"] > 0)
    total_deposit = sum(r["deposit_amt"] for r in rows)
    total_withdrawal = sum(r["withdrawal_amt"] for r in rows)
    closing_balance = _to_float(rows[-1]["balance"]) if rows else 0.0

    error_count = frappe.db.count("Data Import Log", {"data_import": doc.name, "success": 0})

    owner = frappe.db.get_value("User", doc.owner, ["full_name", "email"], as_dict=True) or {}

    return {
        "rows": rows,
        "deposit_count": deposit_count,
        "withdrawal_count": withdrawal_count,
        "total_deposit_fmt": _format_idr(total_deposit),
        "total_withdrawal_fmt": _format_idr(total_withdrawal),
        "closing_balance_fmt": _format_idr(closing_balance),
        "period_from": rows[0]["date"] if rows else None,
        "period_to": rows[-1]["date"] if rows else None,
        "error_count": error_count,
        "skipped_count": doc.get("skipped_row_count") or 0,
        "imported_by_name": owner.get("full_name"),
        "imported_by_email": owner.get("email"),
        "site_url": frappe.utils.get_url(),
    }


# The "PERSETUJUAN" signature block is always pinned to the bottom of
# whatever page it ends up on - never just wherever the totals block
# happens to stop. A 2-row "sticky footer" table (row 1 = page content,
# row 2 = signature, vertical-align:bottom) was tried first since it
# needs no height estimate at all - but a real wkhtmltopdf render showed
# it doesn't paginate that table the way a normal browser would: once
# the table's own declared height pushed it even slightly past page 1,
# row 2 landed at the TOP of page 2 with no leftover-space context to
# pin against, not the bottom. Reverted to this estimate-based approach,
# which WAS verified working correctly (bottom-pinned, both on the same
# page and on a forced fresh page) across multiple real wkhtmltopdf
# renders - less elegant, but proven.
#
# These are estimates of this print format's own actual proportions (A4,
# ~267mm usable after wkhtmltopdf's default 15mm top margin and the
# space it reserves for the page-number footer), calibrated against real
# wkhtmltopdf renders - not pixel-exact (item names/descriptions that
# wrap to 2 lines, or a filled-in Terms field, aren't accounted for), but
# close enough that the block lands within a few mm of the true bottom
# rather than floating mid-page.
_PO_PRINT_PAGE_HEIGHT_MM = 267
_PO_PRINT_HEADER_HEIGHT_MM = 117  # everything up to and including the info boxes
_PO_PRINT_ITEMS_TABLE_HEADER_MM = 5
_PO_PRINT_ITEM_ROW_HEIGHT_MM = 10
_PO_PRINT_SUMMARY_ROW_HEIGHT_MM = 9  # each Subtotal/Diskon/PPN/PPh23 line
_PO_PRINT_SUMMARY_TOTAL_BOX_MM = 20  # the "TOTAL PO" box itself
_PO_PRINT_SIGN_BLOCK_CONTENT_MM = 32  # the signature block's own real height
_PO_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM = 17  # buffer for the estimate above being imprecise
# The height ASSIGNED to the sign block (so vertical-align:bottom has
# something to push against) has to stay safely under the true leftover
# space, not just equal to this estimate's best guess at it - a live
# wkhtmltopdf render caught exactly this: content_before_sign_mm came out
# a few mm under the item table's real rendered height (multi-line item
# names take more room than the flat per-row estimate assumes), so a
# height set to the full "remaining_mm" ended up very slightly TALLER
# than the true remaining space, and page-break-inside:avoid pushed the
# whole block onto a fresh page rather than fit it. This extra slack is
# subtracted only from the assigned height (not from the fits/doesn't-
# fit decision below), trading a bit of unused gap above the signature
# block for never mis-triggering an extra page from a few mm of
# estimation error.
_PO_PRINT_HEIGHT_ESTIMATE_SLACK_MM = 25
# Explicit user request: push the signature block down further than the
# safety-margin-only calculation above lands it - capped at remaining_mm
# itself (never more than the space this same estimate already thinks is
# actually left on the page), so this can push it closer to the true
# bottom but can't reintroduce the overflow-to-a-blank-page bug the slack
# margin above exists to prevent. 20mm is the actual empirically-verified
# ceiling against real wkhtmltopdf renders - values as low as 25-30mm
# already overflowed to a blank second page. Removing the closing
# .pop-footer bar (see purchase_order_print's own history) freed up real
# vertical space in what the block visually contains, but did NOT raise
# this ceiling - the ceiling is set by the assigned BOX height vs the
# true remaining space on the physical page, which has nothing to do
# with how much of that box its own content happens to fill.
_PO_PRINT_MANUAL_PUSH_DOWN_MM = 20


def _estimate_po_sign_block_placement(item_count: int, ppn_shown: bool, pph_shown: bool):
    """Returns (needs_new_page, sign_block_height_mm). See the constants
    above for what each term in this estimate represents."""
    summary_rows = 2 + int(ppn_shown) + int(pph_shown)  # Subtotal + Diskon always shown
    content_before_sign_mm = (
        _PO_PRINT_HEADER_HEIGHT_MM
        + _PO_PRINT_ITEMS_TABLE_HEADER_MM
        + item_count * _PO_PRINT_ITEM_ROW_HEIGHT_MM
        + summary_rows * _PO_PRINT_SUMMARY_ROW_HEIGHT_MM
        + _PO_PRINT_SUMMARY_TOTAL_BOX_MM
    )
    used_on_current_page_mm = content_before_sign_mm % _PO_PRINT_PAGE_HEIGHT_MM
    remaining_mm = _PO_PRINT_PAGE_HEIGHT_MM - used_on_current_page_mm
    needed_mm = _PO_PRINT_SIGN_BLOCK_CONTENT_MM + _PO_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM

    if remaining_mm >= needed_mm:
        # Fits below the totals block on the same page it's already on -
        # pin it to the bottom of that leftover space, minus the extra
        # slack explained above, then pushed down further per explicit
        # request - capped at remaining_mm so it still can't exceed what
        # this estimate thinks is actually available.
        height_mm = max(_PO_PRINT_SIGN_BLOCK_CONTENT_MM, remaining_mm - _PO_PRINT_HEIGHT_ESTIMATE_SLACK_MM)
        height_mm = min(remaining_mm, height_mm + _PO_PRINT_MANUAL_PUSH_DOWN_MM)
        return False, round(height_mm)

    # Doesn't fit in what's left on the current page - needs a fresh one,
    # pinned to the bottom of nearly that page's full height instead.
    return True, round(_PO_PRINT_PAGE_HEIGHT_MM - _PO_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM)


def get_purchase_order_print_context(doc) -> Dict[str, Any]:
    """Context for the default Purchase Order print format. Every value
    here is read straight off the submitted document/its linked records -
    nothing here is fabricated placeholder data, since this is what
    actually goes to a supplier.

    PPh 23 handling: purchase_order.js's own render_totals_footer() labels
    the withholding row "{category} ({rate}%)" using the matching taxes
    row's own `rate` field - but that field is only reliably correct
    in-memory, before save. The row is built with charge_type "Actual"
    (see purchase_order_tax_withholding.py's _build_tax_row - "Actual"
    means ERPNext's own tax engine doesn't use `rate` for the actual
    calculation), and ERPNext's own calculate_taxes_and_totals clears
    `rate` back to 0 for "Actual" rows once the document is saved - so a
    submitted PO's stored tax_amount is correct (that's real money
    withheld) but its `rate` field reads 0, not the true percentage. This
    print format only ever shows the withholding category name and the
    real tax_amount, deliberately never a recomputed/guessed percentage -
    an official supplier-facing document should never print a number it
    can't stand behind.
    """
    items = []
    total_disc = 0.0
    for row in doc.items or []:
        description = frappe.utils.strip_html(row.description or "").strip()
        if description == row.item_name:
            description = None
        items.append(
            {
                "item_code": row.item_code,
                "item_name": row.item_name or row.item_code,
                "description": description or None,
                "item_group": row.item_group,
                "is_jasa": row.item_group == _SERVICE_ITEM_GROUP,
                "qty": row.qty,
                "uom": row.uom,
                "rate": row.price_list_rate,
                "amount": row.amount,
            }
        )
        # discount_amount on Purchase Order Item is a PER-UNIT figure, not
        # a row total - same reduce() purchase_order.js's own render_
        # totals_footer() already does for the form's own live Disc figure
        # (doc.discount_amount, read below in the OLD version of this line,
        # is a completely different field - the document-level "Additional
        # Discount" section, deliberately hidden via property setter since
        # this app only ever discounts per line item, never as one lump
        # document-wide amount - so it's always 0 regardless of how much
        # was actually discounted, a real bug: the print format's own
        # "Diskon" line read that always-empty field instead of this sum,
        # so it never matched what the form's own footer already showed).
        total_disc += flt(row.discount_amount) * flt(row.qty)

    pph_row = next((t for t in (doc.taxes or []) if t.is_tax_withholding_account), None)
    # pph_row.description is NOT a tax name - _build_tax_row() (purchase_
    # order_tax_withholding.py) sets it from the Tax Withholding Category's
    # own category_name field, which in this system holds a business-
    # facing label like "Jasa Perawatan Kendaraan" (what the withholding
    # applies to), not an official tax name - printing that instead of
    # "PPh 23" reads as if the deduction's name IS that description.
    # doc.tax_withholding_category (the category's own doctype name, e.g.
    # "(INC) PPH 23") is the only field here that's an actual tax name;
    # same fallback purchase_order.js's own render_totals_footer() already
    # uses on the live form when that field is empty.
    pph_label = doc.tax_withholding_category or "PPh 23"
    pph_amount = flt(doc.taxes_and_charges_deducted)

    company = frappe.db.get_value(
        "Company", doc.company, ["company_name", "phone_no", "email"], as_dict=True
    ) or frappe._dict()

    owner_name = frappe.db.get_value("User", doc.owner, "full_name") or doc.owner

    ppn_amount = flt(doc.taxes_and_charges_added)
    # doc.apply_tds reflects the checkbox's CURRENT state, which can read
    # unchecked on a saved/submitted document even though a real deduction
    # is already baked into taxes_and_charges_deducted/grand_total (e.g. a
    # Purchase Invoice mapped from a PO/Receipt where the header flag
    # didn't carry over the same way the actual tax row did) - gating the
    # print on that flag hid a real, already-paid-for deduction from the
    # printed document while the grand total silently still reflected it,
    # a mismatch a supplier-facing document must never show. The presence
    # of a real amount is the only signal that matters here.
    pph_amount_shown = pph_amount if pph_amount else 0
    needs_dedicated_sign_page, sign_block_height_mm = _estimate_po_sign_block_placement(
        len(items), bool(ppn_amount), bool(pph_amount_shown)
    )

    return {
        "company_name": company.company_name or doc.company,
        "company_phone": company.phone_no,
        "company_email": company.email,
        "line_items": items,
        "subtotal": flt(doc.net_total),
        "discount_amount": total_disc,
        "ppn_amount": ppn_amount,
        "pph_label": pph_label,
        "pph_amount": pph_amount_shown,
        "grand_total": flt(doc.grand_total),
        "owner_name": owner_name,
        "needs_dedicated_sign_page": needs_dedicated_sign_page,
        "sign_block_height_mm": sign_block_height_mm,
    }


# Same bottom-pinning approach as Purchase Order Print's own
# _estimate_po_sign_block_placement above (see that function's own
# comment for the full explanation of why this estimate-based method won
# out over a 2-row sticky-footer table and position:fixed, both tried
# and reverted after failing on a real wkhtmltopdf render) - separate
# constants here since Purchase Receipt Print has no totals/summary
# block at all (this app deliberately keeps receiving quantity-focused,
# not money-focused - see the Purchase Receipt totals-section Property
# Setters hiding grand_total etc.), so its own per-section heights
# differ from Purchase Order Print's.
_PR_PRINT_PAGE_HEIGHT_MM = 267
_PR_PRINT_HEADER_HEIGHT_MM = 117
_PR_PRINT_ITEMS_TABLE_HEADER_MM = 5
_PR_PRINT_ITEM_ROW_HEIGHT_MM = 10
_PR_PRINT_SIGN_BLOCK_CONTENT_MM = 32
_PR_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM = 17
_PR_PRINT_HEIGHT_ESTIMATE_SLACK_MM = 25
_PR_PRINT_MANUAL_PUSH_DOWN_MM = 20


def _estimate_pr_sign_block_placement(item_count: int):
    """Returns (needs_new_page, sign_block_height_mm) - see Purchase
    Order Print's own _estimate_po_sign_block_placement for the full
    reasoning behind this approach."""
    content_before_sign_mm = (
        _PR_PRINT_HEADER_HEIGHT_MM
        + _PR_PRINT_ITEMS_TABLE_HEADER_MM
        + item_count * _PR_PRINT_ITEM_ROW_HEIGHT_MM
    )
    used_on_current_page_mm = content_before_sign_mm % _PR_PRINT_PAGE_HEIGHT_MM
    remaining_mm = _PR_PRINT_PAGE_HEIGHT_MM - used_on_current_page_mm
    needed_mm = _PR_PRINT_SIGN_BLOCK_CONTENT_MM + _PR_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM

    if remaining_mm >= needed_mm:
        height_mm = max(_PR_PRINT_SIGN_BLOCK_CONTENT_MM, remaining_mm - _PR_PRINT_HEIGHT_ESTIMATE_SLACK_MM)
        height_mm = min(remaining_mm, height_mm + _PR_PRINT_MANUAL_PUSH_DOWN_MM)
        return False, round(height_mm)

    return True, round(_PR_PRINT_PAGE_HEIGHT_MM - _PR_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM)


def get_purchase_receipt_print_context(doc) -> Dict[str, Any]:
    """Context for the default Purchase Receipt print format. Every
    value here is read straight off the submitted document/its linked
    Purchase Order(s) - nothing fabricated, since this is the record a
    supplier's delivery gets checked against.

    Only ever shows the items actually in THIS receipt's own items table
    (doc.items) - not every line from the source Purchase Order(s),
    which would mean fabricating "not delivered this time" rows this
    document was never asked to represent. The linked PO's own `status`
    (including the custom "Partially Received" status - see
    garage/__init__.py's status_map patch) already gives the overall
    "how much of the whole order is in so far" answer at a glance,
    without this print format needing to re-derive it per line.
    """
    items = []
    po_names = set()
    for row in doc.items or []:
        description = frappe.utils.strip_html(row.description or "").strip()
        if description == row.item_name:
            description = None

        po_qty = po_received_qty = None
        if row.purchase_order_item:
            po_item = frappe.db.get_value(
                "Purchase Order Item", row.purchase_order_item, ["qty", "received_qty"], as_dict=True
            )
            if po_item:
                po_qty = flt(po_item.qty)
                po_received_qty = flt(po_item.received_qty)

        remaining = None
        row_status = None
        if po_qty is not None:
            remaining = max(po_qty - po_received_qty, 0)
            if po_received_qty >= po_qty:
                row_status = "LENGKAP"
            elif po_received_qty > 0:
                row_status = "PARTIAL"
            else:
                row_status = "BELUM"

        if row.purchase_order:
            po_names.add(row.purchase_order)

        items.append(
            {
                "item_code": row.item_code,
                "item_name": row.item_name or row.item_code,
                "description": description or None,
                "item_group": row.item_group,
                "po_qty": po_qty,
                "received_qty": flt(row.qty),
                "remaining_qty": remaining,
                "uom": row.uom,
                "status": row_status,
            }
        )

    po_status_by_name = {
        name: frappe.db.get_value("Purchase Order", name, "status") for name in po_names
    }

    company = frappe.db.get_value(
        "Company", doc.company, ["company_name", "phone_no", "email"], as_dict=True
    ) or frappe._dict()

    owner_name = frappe.db.get_value("User", doc.owner, "full_name") or doc.owner

    needs_dedicated_sign_page, sign_block_height_mm = _estimate_pr_sign_block_placement(len(items))

    # frappe.utils.get_time_str() doesn't zero-pad ("9:5:41", not
    # "09:05:41"), so slicing by character count to drop seconds isn't
    # reliable - split on ":" and zero-pad each part instead.
    posting_time_display = None
    if doc.posting_time:
        hh, mm, _ = frappe.utils.get_time_str(doc.posting_time).split(":")
        posting_time_display = f"{int(hh):02d}:{int(mm):02d}"

    return {
        "company_name": company.company_name or doc.company,
        "company_phone": company.phone_no,
        "company_email": company.email,
        "line_items": items,
        "po_names": sorted(po_names),
        "po_status_by_name": po_status_by_name,
        "owner_name": owner_name,
        "posting_time_display": posting_time_display,
        "needs_dedicated_sign_page": needs_dedicated_sign_page,
        "sign_block_height_mm": sign_block_height_mm,
    }


# Same bottom-pinning approach as Purchase Order/Receipt Print's own
# estimate functions above - separate constants here since Purchase
# Invoice Print's items table shows one row per ITEM GROUP (categories,
# each with its own aggregated total), not one row per item line, so its
# own row count - and therefore its own per-page content estimate - is
# independent of how many individual item rows the source document has.
_PI_PRINT_PAGE_HEIGHT_MM = 267
_PI_PRINT_HEADER_HEIGHT_MM = 117
_PI_PRINT_ITEMS_TABLE_HEADER_MM = 5
_PI_PRINT_CATEGORY_ROW_HEIGHT_MM = 11  # two-line row (category name + item list subtitle)
_PI_PRINT_SUMMARY_ROW_HEIGHT_MM = 9
_PI_PRINT_SUMMARY_TOTAL_BOX_MM = 22
_PI_PRINT_SIGN_BLOCK_CONTENT_MM = 32
_PI_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM = 17
_PI_PRINT_HEIGHT_ESTIMATE_SLACK_MM = 25
_PI_PRINT_MANUAL_PUSH_DOWN_MM = 20


def _estimate_pi_sign_block_placement(category_count: int, ppn_shown: bool, pph_shown: bool):
    """Returns (needs_new_page, sign_block_height_mm) - see Purchase
    Order Print's own _estimate_po_sign_block_placement for the full
    reasoning behind this approach."""
    summary_rows = 2 + int(ppn_shown) + int(pph_shown)  # Subtotal + Diskon always shown
    content_before_sign_mm = (
        _PI_PRINT_HEADER_HEIGHT_MM
        + _PI_PRINT_ITEMS_TABLE_HEADER_MM
        + category_count * _PI_PRINT_CATEGORY_ROW_HEIGHT_MM
        + summary_rows * _PI_PRINT_SUMMARY_ROW_HEIGHT_MM
        + _PI_PRINT_SUMMARY_TOTAL_BOX_MM
    )
    used_on_current_page_mm = content_before_sign_mm % _PI_PRINT_PAGE_HEIGHT_MM
    remaining_mm = _PI_PRINT_PAGE_HEIGHT_MM - used_on_current_page_mm
    needed_mm = _PI_PRINT_SIGN_BLOCK_CONTENT_MM + _PI_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM

    if remaining_mm >= needed_mm:
        height_mm = max(_PI_PRINT_SIGN_BLOCK_CONTENT_MM, remaining_mm - _PI_PRINT_HEIGHT_ESTIMATE_SLACK_MM)
        height_mm = min(remaining_mm, height_mm + _PI_PRINT_MANUAL_PUSH_DOWN_MM)
        return False, round(height_mm)

    return True, round(_PI_PRINT_PAGE_HEIGHT_MM - _PI_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM)


def _get_po_approver_name(po_name: Optional[str], company: Optional[str]) -> Optional[str]:
    """Name of whoever's authorized to approve the given Purchase Order,
    per Frappe's own built-in Authorization Rule doctype (Setup > ...>
    Authorization Rule) - "Grand Total"-based rules only, since that's
    the only basis that makes sense for an unattended print-time lookup
    (the others - Customerwise/Itemwise/Item Group wise Discount - are
    about permitted DISCOUNT levels, not approval authority over a whole
    document). A rule "applies" once the PO's own grand_total meets or
    exceeds its threshold value; when more than one such rule matches,
    the one with the highest threshold is the most specific/applicable
    tier. Returns None (left blank in the print format, per explicit
    request) whenever no matching rule exists yet, or a matching rule
    exists but only names an Approving Role rather than one specific
    Approving User - a role can resolve to several people, and this is
    printing a single named "atasan" (superior), not a role name.
    """
    if not po_name:
        return None

    grand_total = frappe.db.get_value("Purchase Order", po_name, "grand_total")
    if grand_total is None:
        return None

    rules = frappe.db.get_all(
        "Authorization Rule",
        filters={
            "transaction": "Purchase Order",
            "based_on": "Grand Total",
            "value": ["<=", grand_total],
        },
        fields=["company", "approving_user"],
        order_by="value desc",
    )
    for rule in rules:
        if rule.company and rule.company != company:
            continue
        if rule.approving_user:
            return frappe.db.get_value("User", rule.approving_user, "full_name") or rule.approving_user

    return None


def get_purchase_invoice_print_context(doc) -> Dict[str, Any]:
    """Context for the default Purchase Invoice print format.

    Items are grouped by Item Group ("Kategori") rather than listed one
    row per item - each group row shows the category name, a comma-
    joined list of the item names in it, how many distinct items that
    is, and the group's own summed amount. Matches how this app already
    treats item_group as the meaningful grouping unit elsewhere (Purchase
    Order Print's own "Kategori" badge column, subject_to_pph23 driven by
    item_group == "Services").

    PPh 23 handling mirrors Purchase Order Print's own reasoning exactly
    (see get_purchase_order_print_context's docstring) - only the real,
    already-computed tax_amount is ever shown, never a recomputed rate.
    """
    groups: Dict[str, Dict[str, Any]] = {}
    total_disc = 0.0
    for row in doc.items or []:
        group_name = row.item_group or "Lainnya"
        group = groups.setdefault(group_name, {"item_names": [], "amount": 0.0})
        group["item_names"].append(row.item_name or row.item_code)
        group["amount"] += flt(row.amount)
        # Same per-item sum as Purchase Order Print's own get_purchase_
        # order_print_context() (see its own comment for why doc.discount_
        # amount - the document-level "Additional Discount" field, which
        # this app hides and never uses - is the wrong source here).
        total_disc += flt(row.discount_amount) * flt(row.qty)

    category_rows = [
        {
            "category": name,
            "items_display": ", ".join(group["item_names"]),
            "item_count": len(group["item_names"]),
            "amount": group["amount"],
        }
        for name, group in groups.items()
    ]

    po_names = sorted({row.purchase_order for row in doc.items or [] if row.purchase_order})
    pr_names = sorted({row.purchase_receipt for row in doc.items or [] if row.purchase_receipt})

    pph_row = next((t for t in (doc.taxes or []) if t.is_tax_withholding_account), None)
    # pph_row.description is NOT a tax name - _build_tax_row() (purchase_
    # order_tax_withholding.py) sets it from the Tax Withholding Category's
    # own category_name field, which in this system holds a business-
    # facing label like "Jasa Perawatan Kendaraan" (what the withholding
    # applies to), not an official tax name - printing that instead of
    # "PPh 23" reads as if the deduction's name IS that description.
    # doc.tax_withholding_category (the category's own doctype name, e.g.
    # "(INC) PPH 23") is the only field here that's an actual tax name;
    # same fallback purchase_order.js's own render_totals_footer() already
    # uses on the live form when that field is empty.
    pph_label = doc.tax_withholding_category or "PPh 23"
    pph_amount = flt(doc.taxes_and_charges_deducted)
    ppn_amount = flt(doc.taxes_and_charges_added)
    # See get_purchase_order_print_context()'s own identical fix: doc.
    # apply_tds is the checkbox's current state, not proof of whether a
    # real deduction exists - a Purchase Invoice mapped from a PO/Receipt
    # can read apply_tds=0 while taxes_and_charges_deducted/grand_total
    # already reflect a real, already-applied withholding amount, and
    # this print must never hide that from the printed total.
    pph_amount_shown = pph_amount if pph_amount else 0

    company = frappe.db.get_value(
        "Company", doc.company, ["company_name", "phone_no", "email"], as_dict=True
    ) or frappe._dict()

    owner_name = frappe.db.get_value("User", doc.owner, "full_name") or doc.owner
    approver_name = _get_po_approver_name(po_names[0] if po_names else None, doc.company)

    needs_dedicated_sign_page, sign_block_height_mm = _estimate_pi_sign_block_placement(
        len(category_rows), bool(ppn_amount), bool(pph_amount_shown)
    )

    return {
        "company_name": company.company_name or doc.company,
        "company_phone": company.phone_no,
        "company_email": company.email,
        "category_rows": category_rows,
        "po_names": po_names,
        "pr_names": pr_names,
        "approver_name": approver_name,
        "subtotal": flt(doc.net_total),
        "discount_amount": total_disc,
        "ppn_amount": ppn_amount,
        "pph_label": pph_label,
        "pph_amount": pph_amount_shown,
        "grand_total": flt(doc.grand_total),
        "owner_name": owner_name,
        "needs_dedicated_sign_page": needs_dedicated_sign_page,
        "sign_block_height_mm": sign_block_height_mm,
    }


# Same bottom-pinning approach as Purchase Order Print's own
# _estimate_po_sign_block_placement above (see that function's own long
# comment for the full explanation of why an estimate-based height, not a
# sticky-footer table or position:fixed, is what actually works on a real
# wkhtmltopdf render). Sales Order Print's own layout differs enough
# (Terms and the Totals box sit side by side in one row, not stacked, and
# there's a closing dark footer bar PO's own format doesn't have) that it
# needs its own calibrated constants rather than reusing PO's.
_SO_PRINT_PAGE_HEIGHT_MM = 255  # a bit under PO's own 267 - this format's own footer is a
# taller colored bar, not just a single line of page-number text, so wkhtmltopdf reserves
# more space for it below the page's own bottom margin than PO's format needs to account for.
_SO_PRINT_HEADER_HEIGHT_MM = 98  # everything up to and including the info boxes
_SO_PRINT_ITEMS_TABLE_HEADER_MM = 9
_SO_PRINT_ITEM_ROW_HEIGHT_MM = 17  # calibrated against a real wkhtmltopdf render
_SO_PRINT_TOTALS_ONLY_MM = 40  # Totals column alone, when there's no Terms box next to it
_SO_PRINT_TERMS_TOTALS_ROW_MM = 95  # Terms box + Totals box, side by side, tallest of the two
_SO_PRINT_SIGN_BLOCK_CONTENT_MM = 30
_SO_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM = 17
_SO_PRINT_HEIGHT_ESTIMATE_SLACK_MM = 20


def _estimate_so_sign_block_placement(item_count: int, has_terms: bool):
    """Returns (needs_new_page, sign_block_height_mm) - same idea as
    Purchase Order Print's own _estimate_po_sign_block_placement."""
    content_before_sign_mm = (
        _SO_PRINT_HEADER_HEIGHT_MM
        + _SO_PRINT_ITEMS_TABLE_HEADER_MM
        + item_count * _SO_PRINT_ITEM_ROW_HEIGHT_MM
        + (_SO_PRINT_TERMS_TOTALS_ROW_MM if has_terms else _SO_PRINT_TOTALS_ONLY_MM)
    )
    used_on_current_page_mm = content_before_sign_mm % _SO_PRINT_PAGE_HEIGHT_MM
    remaining_mm = _SO_PRINT_PAGE_HEIGHT_MM - used_on_current_page_mm
    needed_mm = _SO_PRINT_SIGN_BLOCK_CONTENT_MM + _SO_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM

    if remaining_mm >= needed_mm:
        height_mm = max(_SO_PRINT_SIGN_BLOCK_CONTENT_MM, remaining_mm - _SO_PRINT_HEIGHT_ESTIMATE_SLACK_MM)
        return False, round(height_mm)

    return True, round(_SO_PRINT_PAGE_HEIGHT_MM - _SO_PRINT_SIGN_BLOCK_SAFETY_MARGIN_MM)


def get_sales_order_print_context(doc) -> Dict[str, Any]:
    """Context for the default Sales Order print format. Every value here
    is read straight off the submitted document/its linked records, same
    "nothing fabricated" rule as Purchase Order Print's own context
    function - this is what actually goes to a customer.

    "Data Kendaraan & Referensi": Kendaraan/Plat/KM come from doc.vehicle
    (a Garage Vehicle, added to Sales Order after this print format was
    first built - the print format's own template originally hardcoded
    "-" for all four of these cells since Sales Order carried no vehicle
    data at all yet). Ref. Estimasi still has no real source (no
    quotation-reference concept on Sales Order), so it stays a plain "-"
    in the template itself.

    "Petugas Part" is doc.petugas_part (stamped by garage.utils.
    sales_order_hooks.set_petugas_part at submit time) - falls back to the
    document owner's own name for a draft/not-yet-submitted print preview,
    where petugas_part hasn't been set yet.
    """

    items = []
    total_disc = 0.0
    for row in doc.items or []:
        description = frappe.utils.strip_html(row.description or "").strip()
        if description == row.item_name:
            description = None
        items.append(
            {
                "item_name": row.item_name or row.item_code,
                "description": description or None,
                "is_jasa": row.item_group == _SERVICE_ITEM_GROUP,
                "qty": row.qty,
                "uom": row.uom,
                "rate": row.price_list_rate,
                "amount": row.amount,
            }
        )
        total_disc += flt(row.discount_amount) * flt(row.qty)

    company = frappe.db.get_value(
        "Company", doc.company, ["company_name", "phone_no", "email", "website"], as_dict=True
    ) or frappe._dict()

    address_name = frappe.db.get_value(
        "Dynamic Link",
        {"link_doctype": "Company", "link_name": doc.company, "parenttype": "Address"},
        "parent",
    )
    company_address = None
    if address_name:
        addr = frappe.get_doc("Address", address_name)
        company_address = ", ".join(
            part for part in [addr.address_line1, addr.city] if part
        ) or None

    owner_name = frappe.db.get_value("User", doc.owner, "full_name") or doc.owner
    petugas_part = doc.get("petugas_part") or owner_name

    subtotal = flt(doc.net_total)
    ppn_amount = flt(doc.total_taxes_and_charges)
    ppn_rate = round(ppn_amount / subtotal * 100) if subtotal else 0
    grand_total = flt(doc.grand_total)

    needs_dedicated_sign_page, sign_block_height_mm = _estimate_so_sign_block_placement(
        len(items), bool(doc.terms)
    )

    vehicle_name = None
    vehicle_plate = None
    vehicle_mileage = None
    if doc.get("vehicle"):
        vehicle = frappe.db.get_value(
            "Garage Vehicle",
            doc.vehicle,
            ["license_plate", "brand", "model", "vehicle_year", "mileage"],
            as_dict=True,
        )
        if vehicle:
            vehicle_plate = vehicle.license_plate
            vehicle_name = " ".join(
                part for part in [vehicle.brand, vehicle.model, str(vehicle.vehicle_year or "")] if part
            ).strip() or None
            vehicle_mileage = vehicle.mileage

    return {
        "company_name": company.company_name or doc.company,
        "company_phone": company.phone_no,
        "company_website": company.website,
        "company_address": company_address,
        "line_items": items,
        "subtotal": subtotal,
        "discount_amount": total_disc,
        "ppn_amount": ppn_amount,
        "ppn_rate": ppn_rate,
        "grand_total": grand_total,
        "owner_name": owner_name,
        "petugas_part": petugas_part,
        "needs_dedicated_sign_page": needs_dedicated_sign_page,
        "sign_block_height_mm": sign_block_height_mm,
        "vehicle_name": vehicle_name,
        "vehicle_plate": vehicle_plate,
        "vehicle_mileage": vehicle_mileage,
    }
