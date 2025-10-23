"""Garage DocType controller for Garage Service Order Inspection."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class GarageServiceOrderInspection(Document):
    """Validate inspection findings for service orders."""

    SEVERITY_LEVELS = {"Low", "Medium", "High", "Critical"}

    def validate(self) -> None:  # noqa: D401
        if self.severity and self.severity not in self.SEVERITY_LEVELS:
            frappe.throw(_("Severity inspeksi tidak valid."))


__all__ = ["GarageServiceOrderInspection"]
