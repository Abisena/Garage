import frappe
from frappe.exceptions import DoesNotExistError
from frappe.model.document import Document


class GarageVehicleInspection(Document):
    """Standalone inspection document linked to a service order."""

    def validate(self) -> None:  # pragma: no cover - basic field sync
        self._sync_order_fields()

    def after_save(self) -> None:  # pragma: no cover - basic field sync
        self._update_service_order()

    def _sync_order_fields(self) -> None:
        """Mirror key fields from the linked service order onto this document."""

        if not self.service_order:
            return

        try:
            order = frappe.get_doc("Garage Service Order", self.service_order)
        except DoesNotExistError:
            return

        if not self.branch:
            self.branch = getattr(order, "branch", None)

        if not self.vehicle:
            self.vehicle = getattr(order, "vehicle", None)

    def _update_service_order(self) -> None:
        """Ensure the service order references this inspection and mirrors details."""

        if not self.service_order:
            return

        try:
            order = frappe.get_doc("Garage Service Order", self.service_order)
        except DoesNotExistError:
            return

        updated = False

        if getattr(order, "inspection_record", None) != self.name:
            order.inspection_record = self.name
            updated = True

        if hasattr(order, "inspection_summary") and (
            order.inspection_summary or self.inspection_summary
        ):
            if order.inspection_summary != self.inspection_summary:
                order.inspection_summary = self.inspection_summary
                updated = True

        if hasattr(order, "service_notes") and (order.service_notes or self.service_notes):
            if order.service_notes != self.service_notes:
                order.service_notes = self.service_notes
                updated = True

        if hasattr(order, "inspection_items"):
            order.inspection_items = []
            for item in getattr(self, "inspection_items", []) or []:
                order.append(
                    "inspection_items",
                    {
                        "item": getattr(item, "item", None),
                        "severity": getattr(item, "severity", None),
                        "findings": getattr(item, "findings", None),
                        "recommended_action": getattr(item, "recommended_action", None),
                        "photo": getattr(item, "photo", None),
                    },
                )
            updated = True

        if updated:
            order.save(ignore_permissions=True)
