# Copyright (c) 2024, Garage and contributors
# For license information, please see license.txt
"""DocType implementation for aggregated customer + vehicle master data."""
from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, cstr, flt

from garage.api.portal import build_master_data_snapshot


class GarageMasterData(Document):
    """Persisted master data snapshot for a customer and vehicle pair."""

    def before_save(self):
        snapshot = build_master_data_snapshot(
            customer=self.customer,
            vehicle=self.vehicle,
            license_plate=self.license_plate,
            user=frappe.session.user,
            enforce_login=False,
        )

        if not snapshot:
            frappe.throw(_("Data master tidak dapat diperbarui dari sumber."))

        self._apply_snapshot(snapshot)

    def _apply_snapshot(self, snapshot: dict) -> None:
        customer = snapshot.get("customer") or {}
        vehicle = snapshot.get("vehicle") or {}
        stats = snapshot.get("stats") or {}

        # Core links
        self.customer = cstr(customer.get("name") or self.customer)
        self.customer_name = customer.get("customer_name") or self.customer_name
        self.customer_type = customer.get("customer_type") or self.customer_type
        self.branch = vehicle.get("branch") or customer.get("branch") or self.branch
        self.vehicle = vehicle.get("name") or self.vehicle
        self.license_plate = vehicle.get("license_plate") or self.license_plate

        # Contact + profile
        self.phone = customer.get("phone") or self.phone
        self.email = customer.get("email") or self.email
        self.preferred_contact_method = (
            customer.get("preferred_contact_method") or self.preferred_contact_method
        )
        self.id_number = customer.get("id_number") or self.id_number
        self.address_line1 = customer.get("address_line1") or self.address_line1
        self.address_line2 = customer.get("address_line2") or self.address_line2
        self.city = customer.get("city") or self.city
        self.state = customer.get("state") or self.state
        self.postal_code = customer.get("postal_code") or self.postal_code
        self.country = customer.get("country") or self.country
        self.marketing_source = customer.get("marketing_source") or self.marketing_source
        self.is_vip = cint(customer.get("is_vip") or self.is_vip)

        # Vehicle profile
        self.vehicle_brand = vehicle.get("brand") or self.vehicle_brand
        self.vehicle_model = vehicle.get("model") or self.vehicle_model
        self.vehicle_type = vehicle.get("vehicle_type") or self.vehicle_type
        self.vehicle_year = vehicle.get("vehicle_year") or self.vehicle_year
        self.assembly_type = vehicle.get("assembly_type") or self.assembly_type
        self.transmission = vehicle.get("transmission") or self.transmission
        self.fuel_type = vehicle.get("fuel_type") or self.fuel_type
        self.mileage = vehicle.get("mileage") or self.mileage
        self.last_service_date = vehicle.get("last_service_date") or self.last_service_date

        # Stats
        self.member_since = stats.get("member_since") or self.member_since
        self.last_visit = stats.get("last_visit") or self.last_visit
        self.total_visits = cint(stats.get("total_visits") or 0)
        self.total_spend = flt(stats.get("total_spend") or 0)

        # History table
        self.set("history", [])
        history_rows = snapshot.get("history") or []
        for entry in history_rows:
            row = self.append("history", {})
            row.service_order = entry.get("service_order")
            row.service_type = entry.get("service_type")
            row.status = entry.get("status")
            row.branch = entry.get("branch")
            row.vehicle = entry.get("vehicle")
            row.visit_date = entry.get("visit_date")
            row.amount = flt(entry.get("amount") or 0)
            row.invoice = entry.get("invoice")
            row.invoice_date = entry.get("invoice_date")

        # Summary of the most recent visit
        last_entry = history_rows[0] if history_rows else None
        if last_entry:
            self.last_service_order = last_entry.get("service_order")
            self.last_service_date = last_entry.get("visit_date") or self.last_service_date
            self.last_invoice = last_entry.get("invoice") or self.last_invoice
            self.last_invoice_amount = flt(last_entry.get("amount") or 0)
        elif not self.last_service_order:
            self.last_service_order = None
            self.last_invoice = None
            self.last_invoice_amount = 0

        # Carry over vehicle notes if no master notes set
        if not self.notes:
            self.notes = vehicle.get("notes") or customer.get("notes")
