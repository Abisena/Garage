"""DocType controller for Garage Receipt Document."""

from __future__ import annotations

from frappe.model.document import Document

from garage.utils import naming


class GarageReceiptDocument(Document):
    """Ensure receipt documents follow branch numbering."""

    def autoname(self) -> None:
        naming.make_branch_autoname(self, "RCT")
