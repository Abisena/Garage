"""Child table for Garage Division Request."""
from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class GarageDivisionRequestItem(Document):
    """Validate quantities for each requested item."""

    def validate(self) -> None:
        if flt(self.qty or 0) <= 0:
            frappe.throw(_("Jumlah permintaan harus lebih dari 0."))

