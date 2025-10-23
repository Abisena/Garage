"""Garage DocType controller for Garage Payment Schedule Item."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class GaragePaymentScheduleItem(Document):
    """Validate payment schedule rows for invoices or service orders."""

    STATUSES = {"Pending", "Paid", "Overdue"}

    def validate(self) -> None:  # noqa: D401
        if self.status and self.status not in self.STATUSES:
            frappe.throw(_("Status termin tidak valid."))
        if self.percentage is not None and self.percentage < 0:
            frappe.throw(_("Persentase termin tidak boleh negatif."))
        if self.amount is not None and self.amount < 0:
            frappe.throw(_("Nominal termin tidak boleh negatif."))


__all__ = ["GaragePaymentScheduleItem"]
