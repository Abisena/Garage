"""Garage DocType controller for Garage Service Order Quality."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class GarageServiceOrderQuality(Document):
    """Validate QC checkpoint results."""

    RESULTS = {"Pending", "Pass", "Fail"}

    def validate(self) -> None:  # noqa: D401
        if self.result and self.result not in self.RESULTS:
            frappe.throw(_("Hasil QC tidak valid."))


__all__ = ["GarageServiceOrderQuality"]
