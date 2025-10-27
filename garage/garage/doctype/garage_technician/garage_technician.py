"""DocType controller for Garage Technician master data."""
from __future__ import annotations

import frappe
from frappe.model.document import Document


class GarageTechnician(Document):
    """Keep technician metadata in sync with linked employee details."""

    def validate(self) -> None:
        self._sync_employee_details()

    def _sync_employee_details(self) -> None:
        if not self.employee:
            return

        try:
            employee = frappe.get_cached_doc("Employee", self.employee)
        except Exception:
            return

        if not self.employee_name and getattr(employee, "employee_name", None):
            self.employee_name = employee.employee_name

        if employee.user_id and not self.user_id:
            self.user_id = employee.user_id

        if getattr(employee, "cell_number", None) and not self.phone:
            self.phone = employee.cell_number

        if getattr(employee, "company_email", None) and not self.email:
            self.email = employee.company_email
