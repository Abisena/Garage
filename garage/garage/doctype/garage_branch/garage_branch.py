"""DocType controller for Garage Branch."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class GarageBranch(Document):
    """Maintain canonical formatting for branch metadata."""

    def validate(self) -> None:
        self.branch_code = (self.branch_code or "").strip().upper()
        if not self.branch_code:
            frappe.throw(_("Kode cabang wajib diisi."))

        self.branch_name = (self.branch_name or "").strip().upper()
        if not self.branch_name:
            frappe.throw(_("Nama cabang wajib diisi."))

    def autoname(self) -> None:
        """Use the branch code as the primary identifier."""

        self.name = (self.branch_code or "").strip().upper()
