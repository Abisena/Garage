"""Garage DocType controller for Garage Spare Part Order."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate


class GarageSparePartOrder(Document):
    """Validate spare part requisitions and calculate totals."""

    STATUS_OPTIONS = {
        "Draft",
        "Pending Procurement",
        "Ready for Delivery",
        "Delivered",
        "Cancelled",
    }
    PICKUP_METHODS = {"Pickup", "Delivery"}
    ITEM_STATUSES = {"Pending Check", "Available", "To Order", "Ordered", "Received", "Issued"}

    def validate(self) -> None:  # noqa: D401
        self._validate_customer()
        self._validate_status_fields()
        self._validate_dates()
        self._validate_items()
        self._update_totals()

    def _validate_customer(self) -> None:
        if not self.customer:
            frappe.throw(_("Customer wajib diisi."))
        if not frappe.db.exists("Garage Customer", self.customer):
            frappe.throw(_("Customer {0} tidak ditemukan.").format(self.customer))

    def _validate_status_fields(self) -> None:
        if self.status and self.status not in self.STATUS_OPTIONS:
            frappe.throw(_("Status order tidak valid."))
        if self.pickup_method and self.pickup_method not in self.PICKUP_METHODS:
            frappe.throw(_("Metode pengambilan tidak valid."))

    def _validate_dates(self) -> None:
        if self.delivery_date and self.order_date:
            if getdate(self.delivery_date) < getdate(self.order_date):
                frappe.throw(_("Tanggal delivery tidak boleh sebelum tanggal order."))

    def _validate_items(self) -> None:
        if not self.items:
            frappe.throw(_("Daftar item wajib diisi."))
        for row in self.items:
            if row.stock_status and row.stock_status not in self.ITEM_STATUSES:
                frappe.throw(_("Status stok item tidak valid."))
            if row.qty is None or row.qty <= 0:
                frappe.throw(_("Qty item harus lebih besar dari 0."))
            if row.rate is not None and row.rate < 0:
                frappe.throw(_("Rate item tidak boleh negatif."))
            if row.amount is not None and row.amount < 0:
                frappe.throw(_("Amount item tidak boleh negatif."))

    def _update_totals(self) -> None:
        total = 0.0
        for row in self.items:
            expected_amount = flt(row.qty) * flt(row.rate)
            if row.rate is not None and row.qty is not None:
                row.amount = expected_amount
            total += flt(row.amount)
        self.total_amount = total


__all__ = ["GarageSparePartOrder"]
