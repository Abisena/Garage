"""DocType for capturing repair and quality control inspections."""

import frappe
from frappe.model.document import Document


class RepairQC(Document):
    """Document model for repair and QC inspections with checklist fields."""

    def before_insert(self):
        self._set_default_users()

    def validate(self):
        self._set_default_users()

    def _set_default_users(self):
        current_user = frappe.session.user if frappe.session else None
        if not current_user:
            return

        if not self.service_advisor:
            self.service_advisor = current_user

        if not self.qc_inspector:
            self.qc_inspector = current_user
