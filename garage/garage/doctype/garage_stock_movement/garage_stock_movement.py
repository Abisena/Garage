"""Garage DocType controller for Garage Stock Movement."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class GarageStockMovement(Document):
    """Validate stock movements to avoid inconsistent quantity updates."""

    MOVEMENT_TYPES = {"Receipt", "Issue"}
    REFERENCE_TYPES = {
        "Garage Procurement Order",
        "Garage Service Order",
        "Garage Spare Part Order",
    }
    STATUS_OPTIONS = {"Draft", "Submitted", "Cancelled"}

    def validate(self) -> None:  # noqa: D401
        self._validate_headers()
        self._validate_items()

    def _validate_headers(self) -> None:
        if self.movement_type and self.movement_type not in self.MOVEMENT_TYPES:
            frappe.throw(_("Tipe movement tidak valid."))
        if self.reference_type and self.reference_type not in self.REFERENCE_TYPES:
            frappe.throw(_("Reference type tidak valid untuk movement."))
        if self.status and self.status not in self.STATUS_OPTIONS:
            frappe.throw(_("Status movement tidak valid."))

    def _validate_items(self) -> None:
        if not self.items:
            frappe.throw(_("Detail movement wajib diisi."))
        for row in self.items:
            if row.qty is None or row.qty <= 0:
                frappe.throw(_("Qty movement harus lebih besar dari 0."))
            if self.movement_type == "Issue" and not row.source_warehouse:
                frappe.throw(_("Source warehouse wajib diisi untuk movement Issue."))
            if self.movement_type == "Receipt" and not row.target_warehouse:
                frappe.throw(_("Target warehouse wajib diisi untuk movement Receipt."))


__all__ = ["GarageStockMovement"]
