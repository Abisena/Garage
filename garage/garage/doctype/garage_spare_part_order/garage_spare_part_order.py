"""DocType controller for Garage Spare Part Order."""

from __future__ import annotations

from frappe.model.document import Document

from garage.utils import naming


class GarageSparePartOrder(Document):
    """Apply branch-aware autoname for spare part orders."""

    def autoname(self) -> None:
        naming.make_branch_autoname(self, "SP")
