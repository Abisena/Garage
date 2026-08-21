"""Garage DocType controller for Garage Service Order."""

from __future__ import annotations

import re
from typing import Iterable, Optional

import frappe
from frappe.utils import cstr, flt, getdate, nowdate

from frappe.model.document import Document

from garage.utils import naming


def _slugify(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "-", (value or "").strip()).strip("-").upper()


def _ensure_non_stock_item(item_code: str, item_name: str, item_group: str, stock_uom: str = "Nos") -> str:
    """Get-or-create a non-stock Item used purely as a billing line.

    Non-stock because the auto-generated Sales Invoice never sets
    `update_stock`, so these Items never touch ERPNext's stock ledger -
    real stock stays in this app's own Garage Spare Part / Garage Stock
    Movement system.
    """
    if not frappe.db.exists("Item", item_code):
        frappe.get_doc(
            {
                "doctype": "Item",
                "item_code": item_code,
                "item_name": item_name,
                "item_group": item_group,
                "stock_uom": stock_uom,
                "is_stock_item": 0,
                "include_item_in_manufacturing": 0,
            }
        ).insert(ignore_permissions=True)

    return item_code


def get_or_create_service_fee_item(service_type: str) -> str:
    """Return the Item code for a Service Type's labor/service fee, creating
    a dedicated non-stock Item the first time this service type is billed.

    Keeping one Item per Service Type (instead of one generic item for all
    labor charges) lets item-wise sales reports distinguish revenue per
    service type.
    """
    item_code = f"JASA-{_slugify(service_type)}"[:140]
    return _ensure_non_stock_item(item_code, f"Jasa {service_type}", "Services")


def get_or_create_bundle_fee_item(bundle) -> str:
    """Return the Item code for a Garage Service Bundle's own labor/service
    fee (Biaya Jasa), creating a dedicated non-stock Item per bundle."""
    bundle_name = getattr(bundle, "bundle_name", None) or bundle.name
    item_code = f"JASA-PAKET-{_slugify(bundle_name)}"[:140]
    return _ensure_non_stock_item(item_code, f"Jasa Paket {bundle_name}", "Services")


def get_or_create_item_for_spare_part(part_code: str) -> str:
    """Return the Item code for a Garage Spare Part, creating a bridging
    Item the first time this part is billed via a service bundle.

    Reuses `part_code` verbatim as the Item code: several other code paths
    (spare part request, stock movement) already assume `Item.item_code ==
    Garage Spare Part.part_code` without ever creating it, so this also
    retroactively unblocks those for any part billed through a bundle.
    """
    part = frappe.db.get_value(
        "Garage Spare Part", part_code, ["part_name", "uom"], as_dict=True
    ) or {}
    return _ensure_non_stock_item(
        part_code,
        part.get("part_name") or part_code,
        "Products",
        part.get("uom") or "Nos",
    )


PART_PENDING_STATUSES = {
    "draft",
    "request",
    "pending",
    "pending check",
    "available",
    "to order",
    "ordered",
    "in transit",
    "backordered",
    "re-request",
    "request spare part",
}
PART_COMPLETED_STATUSES = {"received", "issued", "prepared", "approved"}
PART_REJECTED_STATUSES = {"rejected", "out of stock"}
PART_CANCELLED_STATUSES = {"cancelled"}

# "request spare part" is deliberately excluded: it's the default status the moment an
# item is picked, before it has actually been sent. Only a real Spare Part Request Item
# link (checked via `sent_names` in `_guard_locked_part_rows`) proves a row was truly sent.
PART_LOCKED_DELETE_STATUSES = PART_COMPLETED_STATUSES | PART_REJECTED_STATUSES


class GarageServiceOrder(Document):
    """Ensure branch-prefixed naming for service orders and derived statuses."""

    def autoname(self) -> None:
        naming.make_branch_autoname(self, "SPK", include_year=True)

    def validate(self) -> None:
        if not self.service_order_type and not self.service_package:
            frappe.throw("Pilih minimal Service Type atau Paket Service.")
        self._guard_locked_part_rows()
        self._update_display_fields()
        self._apply_bundle_items()
        self._calculate_total_amount()
        self._update_part_charge_status()

    def _guard_locked_part_rows(self) -> None:
        """Prevent removal of part rows already sent to Spare Part Request."""

        if self.is_new():
            return

        previous_rows = frappe.db.get_all(
            "Garage Service Order Part",
            filters={"parent": self.name, "parenttype": "Garage Service Order"},
            fields=["name", "item_code", "item_name", "stock_status"],
        )
        if not previous_rows:
            return

        # Row names travel through raw SQL (int, for autoincrement child tables) and
        # through Data-typed link fields (str) — normalize to str before comparing,
        # otherwise `266 in {"266"}` silently evaluates to False.
        sent_names = {
            cstr(name) for name in frappe.db.get_all(
                "Spare Part Request Item",
                filters={"service_order_part": ["in", [row.name for row in previous_rows]]},
                pluck="service_order_part",
            )
        }
        previous_status = frappe.db.get_value("Garage Service Order", self.name, "status")
        order_already_sent = bool(previous_status) and previous_status != "Open"
        locked_names = {
            cstr(row.name) for row in previous_rows
            if cstr(row.name) in sent_names
            or (
                row.item_code
                and cstr(row.stock_status).strip().lower() in PART_LOCKED_DELETE_STATUSES
            )
            or (not row.item_code and order_already_sent)
        }
        if not locked_names:
            return

        current_names = {cstr(row.name) for row in getattr(self, "required_parts", []) or []}
        removed = locked_names - current_names
        if removed:
            removed_items = [
                row.item_name or row.item_code
                for row in previous_rows
                if cstr(row.name) in removed
            ]
            frappe.throw(
                "Item berikut sudah dikirim ke Spare Part Request dan tidak bisa dihapus: "
                + ", ".join(removed_items)
            )

    def _update_display_fields(self) -> None:
        customer_name: Optional[str] = None
        if self.customer:
            customer_name = frappe.db.get_value("Customer", self.customer, "customer_name")

        self.customer_display = customer_name or self.customer

        bundle_name: Optional[str] = None
        if self.service_package:
            bundle_name = frappe.db.get_value("Garage Service Bundle", self.service_package, "bundle_name")
        self.service_package_display = bundle_name or self.service_package

        vehicle_parts: dict[str, object] = {}
        if self.vehicle:
            vehicle_parts = frappe.db.get_value(
                "Garage Vehicle",
                self.vehicle,
                ["license_plate", "brand", "model", "vehicle_year", "color"],
                as_dict=True,
            ) or {}

        vehicle_bits = []
        license_plate = vehicle_parts.get("license_plate")
        if license_plate:
            vehicle_bits.append(str(license_plate))

        brand_model = " ".join(
            filter(None, [vehicle_parts.get("brand"), vehicle_parts.get("model")])
        ).strip()
        if brand_model:
            vehicle_bits.append(brand_model)

        vehicle_year = vehicle_parts.get("vehicle_year")
        if vehicle_year:
            vehicle_bits.append(str(vehicle_year))

        color = vehicle_parts.get("color")
        if color:
            vehicle_bits.append(str(color))

        display_value = " • ".join(vehicle_bits) if vehicle_bits else None
        self.vehicle_display = display_value or self.vehicle

        if self.customer and not self.primary_contact:
            phone = frappe.db.get_value("Customer", self.customer, "mobile_no")
            if phone:
                self.primary_contact = phone

    def _calculate_total_amount(self) -> None:
        total = 0.0
        for row in getattr(self, "required_parts", []) or []:
            rate = flt(getattr(row, "rate", 0))
            qty = flt(getattr(row, "qty", 0))
            discount = flt(getattr(row, "discount", 0))
            tax = flt(getattr(row, "tax", 0))
            subtotal = qty * rate
            after_disc = subtotal * (1 - discount / 100)
            row.amount = flt(after_disc * (1 + tax / 100), 2)
            total += row.amount
        self.total_amount = flt(total, 2)

    def _apply_bundle_items(self) -> None:
        required_parts = list(getattr(self, "required_parts", []) or [])

        self._backfill_service_fee_item_codes(required_parts)

        if required_parts:
            return

        if getattr(self, "service_order_type", None):
            service_fee = flt(frappe.db.get_value(
                "Garage Service Type", self.service_order_type, "service_fee"
            ))
            if service_fee:
                item_code = get_or_create_service_fee_item(self.service_order_type)
                self.append(
                    "required_parts",
                    {
                        "item_code": item_code,
                        "item_name": f"Jasa {self.service_order_type}",
                        "qty": 1,
                        "rate": service_fee,
                        "tax": 0,
                        "amount": flt(service_fee),
                        "stock_status": "",
                    },
                )

        bundle_name = getattr(self, "service_package", None)
        if bundle_name:
            bundle_items = get_garage_bundle_items(bundle_name)
            for item in bundle_items:
                rate = flt(item.get("rate"))
                qty = item.get("qty") or 1
                is_stock = item.get("is_stock_item", 1)
                self.append(
                    "required_parts",
                    {
                        "item_code": item.get("item_code"),
                        "item_name": item.get("item_name") or "",
                        "description": item.get("description") or "",
                        "qty": qty,
                        "rate": rate,
                        "tax": 0,
                        "amount": flt(qty * rate),
                        "stock_status": "Request Spare Part" if is_stock else "",
                    },
                )

    def _backfill_service_fee_item_codes(self, rows) -> None:
        """The client-side addServiceFeeRow() (garage_service_order.js) adds
        the labor-fee row with item_name "Jasa {service_type}" but no
        item_code - only the bootstrap branch below (when required_parts
        starts empty) assigns one via get_or_create_service_fee_item(). Once
        the client has already added the row, that branch never runs (guard
        below returns early whenever required_parts is non-empty), so the
        row stays without an item_code permanently.

        _build_invoice_items() (repair_qc.py) silently drops any row with no
        item_code, so this row - the labor charge - never reached the Sales
        Invoice. Backfill it unconditionally so it's fixed regardless of
        which path added the row.
        """
        if not self.service_order_type:
            return

        item_code = None
        for row in rows:
            if getattr(row, "item_code", None):
                continue
            item_name = (getattr(row, "item_name", None) or "").strip()
            if not item_name.startswith("Jasa "):
                continue
            if item_code is None:
                item_code = get_or_create_service_fee_item(self.service_order_type)
            row.item_code = item_code

    def _update_part_charge_status(self) -> None:
        """Derive the aggregated sparepart/material charge status."""

        computed = self._compute_part_charge_status()
        current = getattr(self, "part_charge_status", None) or ""

        if computed in {"Partial Prepared", "Partial Reject", "Rejected"}:
            self.part_charge_status = computed
            return

        if not current or current == "Not Started":
            self.part_charge_status = computed
            return

        if current == "Approved" and computed not in {"Approved", "Not Started"}:
            self.part_charge_status = computed

    def _compute_part_charge_status(self) -> str:
        rows: Iterable[object] = getattr(self, "required_parts", []) or []
        statuses = []
        for row in rows:
            status = getattr(row, "stock_status", None)
            if not status and hasattr(row, "as_dict"):
                status = row.as_dict().get("stock_status")
            status_str = (status or "").strip()
            if status_str:
                statuses.append(status_str)
                continue

            has_content = False
            for field in ("item_code", "item_name", "description", "qty"):
                value = getattr(row, field, None)
                if value is None and hasattr(row, "as_dict"):
                    value = row.as_dict().get(field)
                if value:
                    has_content = True
                    break

            if has_content:
                statuses.append("Pending")

        return derive_part_charge_status(statuses, getattr(self, "part_charge_status", None))

    def _sync_spare_part_request(self) -> None:
        """Ensure a Spare Part Request document mirrors required part rows."""

        if getattr(frappe.flags, "skip_service_order_spare_part_request_sync", False):
            return

        if self.is_new():
            return

        required_parts = [
            row for row in getattr(self, "required_parts", [])
            if getattr(row, "item_code", None)
            and frappe.db.get_value("Item", row.item_code, "is_stock_item")
        ]
        if not required_parts:
            return

        if not frappe.db.exists("Garage Service Order", self.name):
            return

        request_name = frappe.db.get_value("Spare Part Request", {"service_order": self.name}, "name")
        if request_name:
            request = frappe.get_doc("Spare Part Request", request_name)
        else:
            request = frappe.new_doc("Spare Part Request")
            request.service_order = self.name
            request.request_date = nowdate()

        request.customer = self.customer
        request.vehicle = self.vehicle

        # `service_order_part` is a Data field (always str), but `part.name` on an
        # autoincrement child table comes back as int - normalize both to str or
        # the lookup below silently misses every row, per the same gotcha already
        # documented in `_guard_locked_part_rows`.
        existing_rows = {
            cstr(row.service_order_part): row for row in getattr(request, "items", [])
        }
        request.set("items", [])

        for part in required_parts:
            # Only preserve approval_status for the exact same row (edited, not new).
            # A newly added row must always start unprepared, even if it happens to
            # share an item_code with a part that was already prepared earlier.
            preserved = existing_rows.get(cstr(part.name))
            approval_status = getattr(preserved, "approval_status", None)
            item_code = getattr(part, "item_code", None)
            bin_data = frappe.db.get_value(
                "Bin", {"item_code": item_code}, ["actual_qty", "warehouse"], as_dict=True
            ) if item_code else None

            request.append(
                "items",
                {
                    "service_order_part": part.name,
                    "item_code": item_code,
                    "item_name": getattr(part, "item_name", None),
                    "description": getattr(part, "description", None),
                    "qty": getattr(part, "qty", None),
                    "uom": getattr(part, "uom", None),
                    "stock_qty": flt(bin_data.actual_qty) if bin_data else 0,
                    "warehouse": bin_data.warehouse if bin_data else "",
                    "source_warehouse": getattr(part, "warehouse", None),
                    "approval_status": approval_status or "Request Part",
                    "stock_movement": getattr(preserved, "stock_movement", None),
                },
            )

        frappe.flags.skip_spare_part_request_service_order_sync = True
        try:
            request.save(ignore_permissions=True)
        finally:
            frappe.flags.skip_spare_part_request_service_order_sync = False

        try:
            frappe.publish_realtime(
                "garage_spare_part_request_updated",
                {"name": request.name},
            )
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                "Failed to publish Spare Part Request update",
            )


def derive_part_charge_status(
    statuses: Iterable[str],
    base_status: Optional[str] = None,
) -> str:
    collected = [status.strip() for status in statuses if status]
    if not collected:
        return base_status or "Not Started"

    normalized = [status.lower() for status in collected]
    has_active = any(status not in PART_REJECTED_STATUSES | PART_CANCELLED_STATUSES for status in normalized)
    has_rejected = any(status in PART_REJECTED_STATUSES for status in normalized)
    has_cancelled = any(status in PART_CANCELLED_STATUSES for status in normalized)
    has_completed = any(status in PART_COMPLETED_STATUSES for status in normalized)
    has_pending = any(status in PART_PENDING_STATUSES for status in normalized)

    if has_rejected and has_active:
        return "Partial Reject"
    if has_rejected and not has_active:
        return "Rejected"
    if has_cancelled and not has_active:
        return "Rejected"
    if has_completed and has_pending:
        return "Partial Prepared"
    if has_pending:
        return "Pending"
    if all(status in PART_COMPLETED_STATUSES or status in PART_CANCELLED_STATUSES for status in normalized):
        return "Approved"
    if has_active:
        return "Pending"
    return base_status or "Not Started"


def get_garage_bundle_items(bundle_name: str) -> list[dict[str, object]]:
    """Expand a Garage Service Bundle into billing lines: its own labor fee
    (Biaya Jasa) plus one row per spare part / material, each bridged to a
    real Item via get_or_create_bundle_fee_item / get_or_create_item_for_spare_part
    so they can flow into required_parts and, eventually, Sales Invoice.
    """
    if not bundle_name:
        return []

    try:
        bundle = frappe.get_doc("Garage Service Bundle", bundle_name)
    except Exception:
        return []

    items: list[dict[str, object]] = []

    service_fee = flt(bundle.service_fee)
    if service_fee:
        items.append(
            {
                "item_code": get_or_create_bundle_fee_item(bundle),
                "item_name": f"Jasa Paket {bundle.bundle_name}",
                "qty": 1,
                "rate": service_fee,
                "description": "",
                # no stock_status - it's a labor line, not a physical part
                "is_stock_item": 0,
            }
        )

    for row in list(bundle.spare_parts or []) + list(bundle.materials or []):
        part_code = row.get("spare_part") or row.get("material")
        if not part_code:
            continue
        qty = flt(row.get("quantity") or 0) or 1
        items.append(
            {
                "item_code": get_or_create_item_for_spare_part(part_code),
                "item_name": row.get("item_name") or part_code,
                "qty": qty,
                "rate": flt(row.get("unit_price") or 0),
                "description": "",
                # always 1: these rows always need physical fulfillment,
                # regardless of the bridged Item's own is_stock_item flag
                "is_stock_item": 1,
            }
        )

    return items


@frappe.whitelist()
def get_service_type_fee(service_order_type: str | None = None) -> dict[str, object]:
    service_fee = 0
    if service_order_type:
        service_fee = flt(frappe.db.get_value(
            "Garage Service Type", service_order_type, "service_fee"
        ))
    return {"service_fee": service_fee}


@frappe.whitelist()
def get_package_items(bundle_name: str | None = None) -> dict[str, object]:
    items = get_garage_bundle_items(bundle_name or "")
    return {"items": items}


@frappe.whitelist()
def get_stock_qty(item_code: str) -> dict[str, object]:
    if not item_code:
        return {"stock_qty": 0}
    qty = flt(frappe.db.get_value("Bin", {"item_code": item_code}, "actual_qty"))
    return {"stock_qty": qty}


@frappe.whitelist()
def item_query_with_stock(doctype, txt, searchfield, start, page_len, filters):
    items = frappe.db.sql("""
        SELECT
            i.name,
            i.item_name,
            i.item_group,
            COALESCE(b.actual_qty, 0) as stock_qty
        FROM `tabItem` i
        LEFT JOIN `tabBin` b ON b.item_code = i.name
        WHERE i.disabled = 0
          AND (i.name LIKE %(txt)s OR i.item_name LIKE %(txt)s)
        GROUP BY i.name
        ORDER BY i.name
        LIMIT %(start)s, %(page_len)s
    """, {
        "txt": f"%{txt}%",
        "start": start,
        "page_len": 50,
    }, as_list=True)

    results = []
    for row in items:
        stock = flt(row[3])
        if stock <= 0:
            stock_label = '<span style="color:#dc2626;font-weight:700;">Stock: 0 ⛔</span>'
            desc = f'<span style="color:#ccc;">{row[1]}, {row[2]}</span> | {stock_label}'
        else:
            stock_label = f'<span style="color:#059669;font-weight:700;">Stock: {int(stock)}</span>'
            desc = f"{row[1]}, {row[2]} | {stock_label}"
        results.append([row[0], desc])
    return results


@frappe.whitelist()
def get_sent_part_row_names(service_order_name: str) -> list[str]:
    """Return Required Parts row names that are already linked to a Spare Part Request."""

    row_names = frappe.db.get_all(
        "Garage Service Order Part",
        filters={"parent": service_order_name, "parenttype": "Garage Service Order"},
        pluck="name",
    )
    if not row_names:
        return []

    return frappe.db.get_all(
        "Spare Part Request Item",
        filters={"service_order_part": ["in", row_names]},
        pluck="service_order_part",
    )


@frappe.whitelist()
def send_order_part(service_order_name: str) -> dict[str, object]:
    doc = frappe.get_doc("Garage Service Order", service_order_name)

    if doc.status not in ("Open", "Waiting Part", "Prepared"):
        frappe.throw("Order part hanya bisa dikirim saat status Open, Waiting Part, atau Prepared.")

    required_parts = [row for row in getattr(doc, "required_parts", []) if getattr(row, "item_code", None)]
    if not required_parts:
        frappe.throw("Tidak ada item dengan Item Code di Required Parts.")

    doc._sync_spare_part_request()

    doc.status = "Waiting Part"
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "Waiting Part", "message": "Order part berhasil dikirim."}


@frappe.whitelist()
def start_repair(service_order_name: str) -> dict[str, object]:
    doc = frappe.get_doc("Garage Service Order", service_order_name)

    if doc.status not in ("Waiting Part", "Prepared"):
        frappe.throw("Start Repair hanya bisa dilakukan saat status Waiting Part atau Prepared.")

    if not doc.spk_number:
        frappe.throw(
            "Surat Perintah Kerja (SPK) untuk service order ini belum pernah dicetak. "
            "Cetak SPK dulu sebelum memulai perbaikan."
        )

    parts_with_code = [row for row in getattr(doc, "required_parts", []) if getattr(row, "item_code", None)]
    prepared_statuses = {"prepared", "received", "issued", "approved"}
    any_prepared = any(
        cstr(getattr(row, "stock_status", "")).strip().lower() in prepared_statuses
        for row in parts_with_code
    ) if parts_with_code else False

    if not any_prepared:
        frappe.throw("Minimal satu spare part harus sudah Prepared sebelum memulai perbaikan.")

    doc.status = "In Progress"
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "In Progress", "message": "Perbaikan dimulai."}


@frappe.whitelist()
def send_additional_part(service_order_name: str) -> dict[str, object]:
    doc = frappe.get_doc("Garage Service Order", service_order_name)

    if doc.status != "In Progress":
        frappe.throw("Kirim part tambahan hanya bisa saat status In Progress.")

    new_parts = [
        row for row in getattr(doc, "required_parts", [])
        if getattr(row, "item_code", None)
        and cstr(getattr(row, "stock_status", "")).strip().lower() == "request spare part"
        and frappe.db.get_value("Item", row.item_code, "is_stock_item")
    ]
    if not new_parts:
        frappe.throw("Tidak ada item baru dengan status Request Spare Part.")

    doc._sync_spare_part_request()
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "In Progress", "message": "Part tambahan berhasil dikirim."}


@frappe.whitelist()
def finish_repair(service_order_name: str) -> dict[str, object]:
    doc = frappe.get_doc("Garage Service Order", service_order_name)

    if doc.status != "In Progress":
        frappe.throw("Finish Repair hanya bisa saat status In Progress.")

    resolved_statuses = {"prepared", "rejected", "out of stock", "issued", "received", "approved"}
    unresolved = []
    for row in getattr(doc, "required_parts", []):
        if not getattr(row, "item_code", None):
            continue
        status = cstr(getattr(row, "stock_status", "")).strip().lower()
        if not status:
            continue
        if status not in resolved_statuses:
            unresolved.append(getattr(row, "item_name", None) or row.item_code)
    if unresolved:
        names = ", ".join(unresolved[:5])
        frappe.throw(f"Masih ada part yang belum di-approve: {names}. Tunggu approval dari Spare Part.")

    doc.status = "Finished"
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "Finished", "message": "Perbaikan selesai."}


def _build_invoice_items_for_service_order(doc) -> list[dict]:
    """Mirror of Repair QC's required_parts fallback branch in
    _build_invoice_items() - kept as its own copy here (rather than shared)
    so Repair QC's own invoice flow stays completely untouched."""

    items: list[dict] = []
    for row in doc.required_parts or []:
        item_code = (row.item_code or "").strip()
        if not item_code:
            continue

        qty = flt(row.qty or 0)
        if qty <= 0:
            continue

        amount = flt(row.amount or 0)
        rate = flt(row.rate or 0)
        discount_pct = flt(row.discount or 0)

        if not rate and amount:
            rate = amount / qty

        if not rate and item_code.startswith("JASA-PAKET-"):
            if doc.service_package:
                rate = flt(frappe.db.get_value("Garage Service Bundle", doc.service_package, "service_fee"))

        if not rate:
            rate = flt(frappe.db.get_value("Item", item_code, "standard_rate") or 0)
        if not rate:
            rate = 100000

        price_list_rate = rate
        if discount_pct:
            rate = flt(rate * (1 - discount_pct / 100))

        item_defaults = frappe.db.get_value(
            "Item", item_code, ["item_name", "stock_uom", "description"], as_dict=True
        ) or {}

        items.append({
            "item_code": item_code,
            "item_name": row.item_name or item_defaults.get("item_name") or item_code,
            "description": row.description or item_defaults.get("description") or item_code,
            "qty": qty,
            "uom": row.uom or item_defaults.get("stock_uom") or "Nos",
            "rate": rate,
            "amount": flt(rate * qty),
            "price_list_rate": price_list_rate,
            "discount_percentage": discount_pct,
            "tax_percent": flt(row.tax or 0),
        })

    if not items:
        service_type = doc.service_order_type or "General Service"
        items.append({
            "item_code": "SERVICE-GENERAL",
            "item_name": f"Service - {service_type}",
            "description": f"Service for {service_type}",
            "qty": 1,
            "uom": "Nos",
            "rate": 500000,
            "amount": 500000,
        })

    return items


def _create_draft_sales_invoice(doc) -> Optional[str]:
    """Auto-create a draft Sales Invoice from a Service Order, linked via
    `po_no` (the field the Garage Service Order -> Sales Invoice Connection
    already uses). Left as a draft - staff review/adjust it before
    submitting and collecting payment, unlike Repair QC's own flow which
    auto-submits."""

    existing = frappe.db.get_value(
        "Sales Invoice", {"po_no": doc.name, "docstatus": ["!=", 2]}, "name"
    )
    if existing:
        return existing

    if not doc.customer:
        return None

    items = _build_invoice_items_for_service_order(doc)
    if not items:
        return None

    from garage.api.portal import _apply_ppn_pricing, _ensure_erp_customer

    try:
        customer_name = _ensure_erp_customer(doc.customer, doc.branch)
    except Exception:
        frappe.clear_last_message()
        customer_name = None

    if not customer_name:
        return None

    company = frappe.db.get_single_value("Global Defaults", "default_company")
    if not company:
        companies = frappe.get_all("Company", limit=1)
        company = companies[0].name if companies else None
    if not company:
        return None

    posting_date = getdate(nowdate())

    si = frappe.new_doc("Sales Invoice")
    si.customer = customer_name
    si.company = company
    si.posting_date = posting_date
    si.set_posting_time = 1
    si.due_date = posting_date
    si.po_no = doc.name
    si.remarks = f"Auto-generated from Service Order {doc.name}"

    si_meta = frappe.get_meta("Sales Invoice")
    if si_meta.has_field("branch"):
        si.branch = doc.branch

    for fieldname in ("service_order", "service_order_ref", "garage_service_order", "garage_service_order_ref"):
        if si_meta.has_field(fieldname):
            setattr(si, fieldname, doc.name)
            break

    if si_meta.has_field("no_polisi"):
        si.no_polisi = doc.vehicle

    for item in items:
        si.append("items", item)

    base_total = sum(flt(item.get("rate") or 0) * flt(item.get("qty") or 0) for item in items)

    si.run_method("set_missing_values")
    _apply_ppn_pricing(si, base_total)
    si.calculate_taxes_and_totals()

    if not si.posting_date:
        si.posting_date = posting_date
    if not si.due_date:
        si.due_date = posting_date

    si.base_write_off_amount = flt(si.base_write_off_amount or 0)
    si.write_off_amount = flt(si.write_off_amount or 0)

    si.insert(ignore_permissions=True)

    return si.name


@frappe.whitelist()
def submit_to_qc(service_order_name: str) -> dict[str, object]:
    """Despite the name, this now skips QC Review entirely and goes
    straight to Waiting Payment - the Service Order flow no longer routes
    through Repair QC. The Repair QC doctype itself is untouched; nothing
    stops a QC record being created and linked by hand elsewhere."""

    doc = frappe.get_doc("Garage Service Order", service_order_name)

    if doc.status != "Finished":
        frappe.throw("Submit to QC hanya bisa saat status Finished.")

    doc.status = "Waiting Payment"
    doc.save(ignore_permissions=True)

    invoice_name = None
    try:
        invoice_name = _create_draft_sales_invoice(doc)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Garage Service Order - Sales Invoice")

    frappe.db.commit()

    message = "Perbaikan selesai. Menunggu pembayaran."
    if invoice_name:
        message += f" Draft Sales Invoice {invoice_name} telah dibuat."

    return {
        "status": "Waiting Payment",
        "message": message,
        "sales_invoice": invoice_name,
    }


@frappe.whitelist()
def complete_qc(service_order_name: str) -> dict[str, object]:
    doc = frappe.get_doc("Garage Service Order", service_order_name)

    if doc.status != "QC Review":
        frappe.throw("Complete QC hanya bisa saat status QC Review.")

    doc.status = "Waiting Payment"
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "Waiting Payment", "message": "QC selesai. Menunggu pembayaran."}


@frappe.whitelist()
def reopen_service_order(service_order_name: str) -> dict[str, object]:
    doc = frappe.get_doc("Garage Service Order", service_order_name)

    if doc.status not in ("Finished", "Waiting Payment", "QC Review"):
        frappe.throw("Re-Open hanya bisa saat status Finished, Waiting Payment atau QC Review.")

    doc.status = "In Progress"
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "In Progress", "message": "Service Order dibuka kembali."}
