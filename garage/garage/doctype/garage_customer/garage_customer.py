"""Garage DocType controller for Garage Customer."""

from frappe.model.document import Document
from frappe.utils import nowdate, nowtime


class GarageCustomer(Document):
    """Basic controller for the `GarageCustomer` DocType."""

    def before_insert(self):
        """Set registration timestamps when the record is first created."""

        if not self.registration_date:
            self.registration_date = nowdate()
        if not self.registration_time:
            self.registration_time = nowtime()
