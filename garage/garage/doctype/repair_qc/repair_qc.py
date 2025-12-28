"""DocType for capturing repair and quality control inspections."""

import frappe
from frappe.model.document import Document


class RepairQC(Document):
    """Document model for repair and QC inspections with checklist fields."""

    def before_insert(self):
        self._set_default_users()

    def validate(self):
        self._set_default_users()

    def on_update(self):
        self._sync_service_order_status()

    def _set_default_users(self):
        current_user = frappe.session.user if frappe.session else None
        if not current_user:
            return

        if not self.service_advisor:
            self.service_advisor = current_user

        if not self.qc_inspector:
            self.qc_inspector = current_user

    def _sync_service_order_status(self):
        if not self.service_order:
            return

        try:
            service_order = frappe.get_doc("Repair Orders", self.service_order)
        except Exception:
            return

        updates = {}

        if hasattr(service_order, "qc_status"):
            updates["qc_status"] = "Passed"
        if hasattr(service_order, "job_card_status"):
            updates["job_card_status"] = "Completed"
        if hasattr(service_order, "work_order_status"):
            updates["work_order_status"] = "Completed"

        if updates:
            frappe.db.set_value(service_order.doctype, service_order.name, updates)
