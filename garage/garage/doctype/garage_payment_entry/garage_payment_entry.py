"""DocType controller for Garage Payment Entry."""

from __future__ import annotations

from frappe.model.document import Document

from garage.utils import naming


class GaragePaymentEntry(Document):
    """Generate branch-specific numbering for payment entries."""

    def autoname(self) -> None:
        naming.make_branch_autoname(self, "PAY")
