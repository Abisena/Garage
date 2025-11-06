"""DocType controller for Garage Spare Part Approval."""

from frappe.model.document import Document


class GarageSparePartApproval(Document):
    """Basic controller for the spare part approval history."""

    def validate(self) -> None:  # pragma: no cover - simple data guard
        if self.approval_count is None:
            self.approval_count = 1
