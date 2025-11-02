"""DocType controller for Garage Sales Invoice."""

from __future__ import annotations

from frappe.model.document import Document

from garage.utils import naming


class GarageSalesInvoice(Document):
    """Prefix invoice IDs with the selected branch code."""

    def autoname(self) -> None:
        naming.make_branch_autoname(self, "INV")
