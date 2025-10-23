"""Garage DocType controller for Garage Service Order Progress."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class GarageServiceOrderProgress(Document):
    """Validate progress log entries for service orders."""

    STATUSES = {"Started", "In Progress", "Awaiting Parts", "Completed", "Paused"}

    def validate(self) -> None:  # noqa: D401
        if self.status and self.status not in self.STATUSES:
            frappe.throw(_("Status progres tidak valid."))
        if self.percent_complete is not None:
            if self.percent_complete < 0 or self.percent_complete > 100:
                frappe.throw(_("Persentase progres harus 0-100."))


__all__ = ["GarageServiceOrderProgress"]
