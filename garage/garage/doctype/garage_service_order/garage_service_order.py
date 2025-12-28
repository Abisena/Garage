"""Garage DocType controller for Garage Service Order."""

from __future__ import annotations

from typing import Iterable, Optional

import frappe
from frappe.utils import nowdate

from frappe.model.document import Document

from garage.utils import naming


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
PART_REJECTED_STATUSES = {"rejected"}
PART_CANCELLED_STATUSES = {"cancelled"}


class GarageServiceOrder(Document):
    """Ensure branch-prefixed naming for service orders and derived statuses."""

    def autoname(self) -> None:
        naming.make_branch_autoname(self, "SPK", include_year=True)

    def validate(self) -> None:
        self._update_display_fields()
        self._apply_bundle_items()
        self._update_part_charge_status()
        self._sync_spare_part_request()

    def on_update(self):  # pragma: no cover - frappe lifecycle hook
        self._sync_spare_part_request()

    def _update_display_fields(self) -> None:
        customer_name: Optional[str] = None
        if self.customer:
            customer_name = frappe.db.get_value("Garage Customer", self.customer, "customer_name")

        self.customer_display = customer_name or self.customer

        vehicle_parts: dict[str, object] = {}
        if self.vehicle:
            vehicle_parts = frappe.db.get_value(
                "Garage Vehicle",
                self.vehicle,
                ["license_plate", "brand", "model", "vehicle_year"],
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

        display_value = " • ".join(vehicle_bits) if vehicle_bits else None
        self.vehicle_display = display_value or self.vehicle

    def _apply_bundle_items(self) -> None:
        if not getattr(self, "service_order_type", None):
            return

        required_parts = list(getattr(self, "required_parts", []) or [])
        if required_parts:
            return

        bundle_items = get_bundle_items_for_service_type(self.service_order_type)
        if not bundle_items:
            return

        for item in bundle_items:
            self.append(
                "required_parts",
                {
                    "item_code": item.get("item_code"),
                    "qty": item.get("qty") or 1,
                    "stock_status": "Request Spare Part",
                },
            )

    def _update_part_charge_status(self) -> None:
        """Derive the aggregated sparepart/material charge status."""

        computed = self._compute_part_charge_status()
        current = getattr(self, "part_charge_status", None) or ""

        if computed in {"Partial Approve", "Partial Reject", "Rejected"}:
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

        required_parts = [row for row in getattr(self, "required_parts", []) if getattr(row, "item_code", None)]
        if not required_parts:
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

        existing_rows = {row.service_order_part: row for row in getattr(request, "items", [])}
        request.set("items", [])

        for part in required_parts:
            preserved = existing_rows.get(part.name)
            request.append(
                "items",
                {
                    "service_order_part": part.name,
                    "item_code": getattr(part, "item_code", None),
                    "item_name": getattr(part, "item_name", None),
                    "description": getattr(part, "description", None),
                    "qty": getattr(part, "qty", None),
                    "uom": getattr(part, "uom", None),
                    "source_warehouse": getattr(part, "warehouse", None),
                    "approval_status": getattr(preserved, "approval_status", None) or "Pending",
                    "stock_movement": getattr(preserved, "stock_movement", None),
                },
            )

        ignore_links = not frappe.db.exists("Garage Service Order", self.name)

        frappe.flags.skip_spare_part_request_service_order_sync = True
        try:
            request.save(ignore_permissions=True, ignore_links=ignore_links)
        finally:
            frappe.flags.skip_spare_part_request_service_order_sync = False


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
        return "Partial Approve"
    if has_pending:
        return "Pending"
    if all(status in PART_COMPLETED_STATUSES or status in PART_CANCELLED_STATUSES for status in normalized):
        return "Approved"
    if has_active:
        return "Pending"
    return base_status or "Not Started"


def get_bundle_items_for_service_type(service_order_type: str) -> list[dict[str, object]]:
    if not service_order_type:
        return []

    try:
        service_type = frappe.get_doc("Garage Service Type", service_order_type)
    except Exception:
        return []

    bundle_name = getattr(service_type, "product_bundle", None)
    if not bundle_name:
        return []

    try:
        bundle = frappe.get_doc("Product Bundle", bundle_name)
    except Exception:
        return []

    items = []
    for row in getattr(bundle, "items", []) or []:
        item_code = getattr(row, "item_code", None)
        if not item_code:
            continue
        items.append(
            {
                "item_code": item_code,
                "qty": getattr(row, "qty", None) or 1,
            }
        )
    return items


@frappe.whitelist()
def get_bundle_items(service_order_type: str | None = None) -> dict[str, object]:
    items = get_bundle_items_for_service_type(service_order_type or "")
    bundle_name = None
    if service_order_type:
        try:
            service_type = frappe.get_doc("Garage Service Type", service_order_type)
            bundle_name = getattr(service_type, "product_bundle", None)
        except Exception:
            bundle_name = None

    return {
        "bundle": bundle_name,
        "items": items,
    }
