"""Garage DocType controller for Garage Service Order Task."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class GarageServiceOrderTask(Document):
    """Validate service task rows to maintain accurate planning data."""

    STATUSES = {"Pending", "In Progress", "Completed", "Deferred"}

    def validate(self) -> None:  # noqa: D401
        if self.status and self.status not in self.STATUSES:
            frappe.throw(_("Status tugas tidak valid."))
        if self.estimated_hours is not None and self.estimated_hours < 0:
            frappe.throw(_("Estimasi jam kerja tidak boleh negatif."))
        if self.actual_hours is not None and self.actual_hours < 0:
            frappe.throw(_("Jam kerja aktual tidak boleh negatif."))


__all__ = ["GarageServiceOrderTask"]
