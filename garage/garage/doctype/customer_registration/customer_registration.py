# Copyright (c) 2024, Garage and contributors
# For license information, please see license.txt

from __future__ import annotations

from typing import Any, Dict, Optional

import frappe
from frappe import _
from frappe.model.document import Document

from garage.api import portal
from garage.garage.doctype.customer_entry.customer_entry import create_from_registration

VEHICLE_FIELDS = (
    "license_plate",
    "vin",
    "engine_number",
    "brand",
    "model",
    "vehicle_type",
    "vehicle_year",
    "assembly_type",
    "transmission",
    "fuel_type",
    "mileage",
)

CUSTOMER_FIELDS = (
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
)

SERVICE_FIELDS = (
    "service_order_type",
    "service_bundle",
    "service_bundle_name",
    "priority",
    "intake_type",
    "notes",
    "service_notes",
)


class CustomerRegistration(Document):
    """Combined vehicle + customer intake form for the desk/portal flows."""

    def before_save(self):
        self.flags.ignore_version = True

    def before_insert(self):
        self._apply_branch_default()
        self._sync_master_records()

    def after_insert(self):
        create_from_registration(self)

    def _apply_branch_default(self) -> None:
        """Ensure the intake inherits the user's preferred branch when blank."""

        if self.branch:
            return

        default_branch = portal._default_branch(frappe.session.user)
        if default_branch:
            self.branch = default_branch

    def _sync_master_records(self) -> None:
        """Create or update master data using the same logic as the portal."""

        if getattr(getattr(self, "flags", None), "skip_portal_sync", False):
            return

        payload = self._as_portal_payload()
        result = portal.register_customer_vehicle(payload=payload)

        created = result.get("created", {}) if isinstance(result, dict) else {}
        if not isinstance(created, dict):
            created = {}

        self.customer = created.get("customer") or self.customer
        self.vehicle = created.get("vehicle") or self.vehicle
        self.service_order = created.get("service_order") or self.service_order

        if not self.customer_name:
            customer_name = created.get("customer_name")
            if customer_name:
                self.customer_name = customer_name

    def _as_portal_payload(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {}

        for field in ("branch", *VEHICLE_FIELDS, *CUSTOMER_FIELDS, *SERVICE_FIELDS):
            value = self.get(field)
            if value not in (None, ""):
                payload[field] = value

        # Ensure plate number drives lookups and avoid blank branches
        payload["license_plate"] = (payload.get("license_plate") or "").strip()
        payload["branch"] = (payload.get("branch") or "").strip()

        return payload


@frappe.whitelist()
def fetch_by_plate(license_plate: str, branch: Optional[str] = None) -> Dict[str, Any]:
    """Pull existing vehicle + customer data by plate number for auto-fill."""

    _require_login()

    plate = (license_plate or "").strip()
    branch_name = (branch or "").strip()

    if not plate:
        return {}

    vehicle_fields = [
        "name",
        "customer",
        "branch",
        *VEHICLE_FIELDS,
        "assembly_type",
        "notes",
    ]

    filters: Dict[str, Any] = {"license_plate": plate}
    if branch_name:
        filters["branch"] = branch_name

    vehicle = frappe.db.get_value("Garage Vehicle", filters, vehicle_fields, as_dict=True)

    if not vehicle:
        vehicle = frappe.db.get_value(
            "Garage Vehicle", {"license_plate": plate}, vehicle_fields, as_dict=True
        )

    if not vehicle:
        return {}

    response: Dict[str, Any] = {"vehicle": vehicle}

    customer_name = vehicle.get("customer")
    if customer_name:
        customer = frappe.db.get_value(
            "Garage Customer", customer_name, CUSTOMER_FIELDS + ("name",), as_dict=True
        )
        if customer:
            response["customer"] = customer

    return response


@frappe.whitelist()
def get_default_branch() -> Optional[str]:
    """Expose the user's preferred branch for client defaults."""

    _require_login()
    return portal._default_branch(frappe.session.user)


def _require_login() -> None:
    if frappe.session.user and frappe.session.user != "Guest":
        return
    frappe.throw(_("You must be logged in to perform this action."), frappe.PermissionError)
