"""Vehicle Handover DocType for capturing SIKK/permit details."""

from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import cint, nowdate


class VehicleHandover(Document):
    """Stores vehicle permit data coming from the web app or manual entry."""

    def on_update(self) -> None:  # pragma: no cover - frappe lifecycle hook
        self._complete_service_order_if_printed()

    def _complete_service_order_if_printed(self) -> None:
        service_order_name = getattr(self, "service_order", None)
        if not service_order_name:
            return

        print_count = cint(getattr(self, "print_count", 0))
        if print_count <= 0:
            return

        try:
            service_order = frappe.get_doc("Garage Service Order", service_order_name)
        except Exception:
            return

        if getattr(service_order, "status", None) in {"Completed", "Cancelled"}:
            return

        service_order.status = "Completed"
        if hasattr(service_order, "job_card_status"):
            service_order.job_card_status = "Completed"
        if hasattr(service_order, "qc_status"):
            service_order.qc_status = "Passed"
        if hasattr(service_order, "actual_delivery_date"):
            service_order.actual_delivery_date = (
                service_order.actual_delivery_date or nowdate()
            )

        service_order.save(ignore_permissions=True)
