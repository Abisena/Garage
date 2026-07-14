"""DocType controller for Garage Sales Invoice."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document

from garage.utils import naming


class GarageSalesInvoice(Document):
    """Prefix invoice IDs with the selected branch code."""

    def autoname(self) -> None:
        naming.make_branch_autoname(self, "INV")

    def validate(self) -> None:
        if self.status == "Cancelled" and self.has_value_changed("status"):
            self._block_cancel_if_paid()

    def _block_cancel_if_paid(self) -> None:
        linked_payment = frappe.db.sql(
            """
            select gpa.parent
            from `tabGarage Payment Allocation` gpa
            inner join `tabGarage Payment Entry` gpe on gpe.name = gpa.parent
            where gpa.invoice = %s
              and gpe.status in ('Submitted', 'Cleared')
            limit 1
            """,
            self.name,
        )
        if linked_payment:
            frappe.throw(
                _(
                    "Cannot cancel {0} because it has a linked payment ({1}). "
                    "Cancel the payment first."
                ).format(self.name, linked_payment[0][0])
            )
