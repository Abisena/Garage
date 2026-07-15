"""Vehicle Handover DocType for capturing SIKK/permit details."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, now_datetime, nowdate


class VehicleHandover(Document):
    """Stores vehicle permit data coming from the web app or manual entry."""

    def before_insert(self) -> None:  # pragma: no cover - frappe lifecycle hook
        if not self.sikk_number:
            self.sikk_number = self._generate_sikk_number()

    def validate(self) -> None:
        service_order_name = getattr(self, "service_order", None)
        if not service_order_name:
            return

        try:
            service_order = frappe.get_doc("Garage Service Order", service_order_name)
            current_status = getattr(service_order, "status", None)

            if current_status != "Completed":
                frappe.throw(
                    _("Cannot create Vehicle Handover. Service Order status must be 'Completed' (current: {0})").format(
                        current_status
                    )
                )
        except Exception as e:
            if "does not exist" not in str(e):
                raise

    def before_submit(self) -> None:  # pragma: no cover - frappe lifecycle hook
        # No longer requires handover_completed to be checked first - that
        # gate was tied to the Security Checklist workflow, which this
        # doctype dropped (it's now just an auto-filled SIKK printout).
        # Still auto-stamp handover_date on submit as a convenience.
        if not self.handover_date:
            self.handover_date = now_datetime()

    def on_trash(self) -> None:  # pragma: no cover - frappe lifecycle hook
        if not self.payment_entry:
            return

        payment_docstatus = frappe.db.get_value("Payment Entry", self.payment_entry, "docstatus")
        if payment_docstatus == 1:
            frappe.throw(
                _(
                    "SIKK {0} tidak bisa dihapus karena Payment Entry {1} masih berlaku. "
                    "Batalkan Payment Entry-nya dulu sebelum menghapus SIKK ini."
                ).format(self.name, self.payment_entry)
            )

    def _generate_sikk_number(self) -> str:
        """SIKK-{4-digit year}{5-digit sequence}, e.g. SIKK-202600001.
        Sequence resets each year. Retries on collision instead of trusting
        a single count query, since two handovers could insert at nearly
        the same time (SPR/QC auto-creation isn't rate-limited)."""

        year = str(getdate(self.submission_date or nowdate()).year)

        prefix = f"SIKK-{year}"
        existing_count = frappe.db.count(
            "Vehicle Handover", filters={"sikk_number": ["like", f"{prefix}%"]}
        )

        candidate_seq = existing_count + 1
        while True:
            candidate = f"{prefix}{candidate_seq:05d}"
            if not frappe.db.exists("Vehicle Handover", {"sikk_number": candidate}):
                return candidate
            candidate_seq += 1
