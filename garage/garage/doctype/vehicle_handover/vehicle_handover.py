"""Vehicle Handover DocType for capturing SIKK/permit details."""

from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import cint, nowdate


class VehicleHandover(Document):
    """Stores vehicle permit data coming from the web app or manual entry."""

    def on_update(self) -> None:  # pragma: no cover - frappe lifecycle hook
        # REMOVED: Status update logic karena sekarang status diubah dari Sales Invoice
        pass
        
    # OPTIONAL: Bisa tambahkan validasi bahwa Vehicle Handover hanya bisa dibuat 
    # jika Service Order sudah Completed
    def validate(self) -> None:
        service_order_name = getattr(self, "service_order", None)
        if not service_order_name:
            return
            
        try:
            service_order = frappe.get_doc("Garage Service Order", service_order_name)
            current_status = getattr(service_order, "status", None)
            
            if current_status != "Completed":
                frappe.throw(
                    f"Cannot create Vehicle Handover. Service Order status must be 'Completed' (current: {current_status})"
                )
        except Exception as e:
            if "does not exist" not in str(e):
                raise
