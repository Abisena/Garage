"""Garage DocType controller for Garage Sales Invoice Item."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class GarageSalesInvoiceItem(Document):
    """Validate invoice item rows."""

    def validate(self) -> None:  # noqa: D401
        if self.qty is None or self.qty <= 0:
            frappe.throw(_("Qty item invoice harus lebih besar dari 0."))
        if self.rate is not None and self.rate < 0:
            frappe.throw(_("Rate item invoice tidak boleh negatif."))
        if self.rate is not None:
            self.amount = flt(self.qty) * flt(self.rate)


__all__ = ["GarageSalesInvoiceItem"]
