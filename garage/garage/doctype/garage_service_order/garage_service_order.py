"""Garage DocType controller for Garage Service Order."""

from __future__ import annotations

from frappe.model.document import Document

from garage.utils import naming


class GarageServiceOrder(Document):
    """Ensure branch-prefixed naming for service orders."""

    def autoname(self) -> None:
        naming.make_branch_autoname(self, "SO")
