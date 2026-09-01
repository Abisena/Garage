"""Garage DocType controller for Garage Vehicle."""

import frappe
from frappe import _
from frappe.model.document import Document


class GarageVehicle(Document):
    """Basic controller for the `GarageVehicle` DocType."""

    def before_naming(self) -> None:
        # license_plate drives autoname (field:license_plate) and is unique
        # under a case-insensitive DB collation, so "B 2121" and "b 2121"
        # collide silently at the DB layer. Normalize to uppercase before
        # naming happens, not just in validate(), since set_new_name() reads
        # this field before validate() ever runs.
        self._normalize_license_plate()

    def validate(self) -> None:
        self._normalize_license_plate()

    def _normalize_license_plate(self) -> None:
        if self.license_plate:
            self.license_plate = self.license_plate.strip().upper()


@frappe.whitelist()
def get_owner_history(vehicle: str) -> dict:
    """Return the current owner plus prior owners for a Garage Vehicle.

    Prior owners are derived from the Version log (this doctype has
    track_changes=1), so no separate history table is needed - every save
    that changes `customer` already leaves an audit trail.
    """
    if not frappe.has_permission("Garage Vehicle", "read", doc=vehicle):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    current = frappe.db.get_value(
        "Garage Vehicle",
        vehicle,
        ["customer", "customer_name", "customer_phone"],
        as_dict=True,
    )
    if not current:
        frappe.throw(_("Vehicle {0} not found").format(vehicle))

    versions = frappe.get_all(
        "Version",
        filters={"ref_doctype": "Garage Vehicle", "docname": vehicle},
        fields=["creation", "owner", "data"],
        order_by="creation asc",
    )

    previous_owners = []
    for version in versions:
        try:
            data = frappe.parse_json(version.data) or {}
        except Exception:
            continue

        changed = {
            row[0]: row
            for row in (data.get("changed") or [])
            if isinstance(row, (list, tuple)) and len(row) >= 3
        }

        if "customer" not in changed:
            continue

        before_customer = changed["customer"][1]
        if not before_customer:
            # First-time assignment, not a change from one owner to another.
            continue

        previous_owners.append(
            {
                "owner": before_customer,
                "owner_name": (changed.get("customer_name") or [None, None, before_customer])[1]
                or before_customer,
                "phone": (changed.get("customer_phone") or [None, None, None])[1],
                "changed_on": version.creation,
                "changed_by": frappe.db.get_value("User", version.owner, "full_name") or version.owner,
            }
        )

    previous_owners.reverse()  # most recent change first

    return {
        "vehicle": vehicle,
        "current_owner": {
            "owner": current.customer,
            "owner_name": current.customer_name,
            "phone": current.customer_phone,
        },
        "previous_owners": previous_owners,
    }


@frappe.whitelist()
def update_vehicle_owner(vehicle: str, customer: str) -> dict:
    """Reassign a Garage Vehicle to a different Customer.

    The change itself just needs a normal save - track_changes=1 on this
    doctype leaves the Version log entry that get_owner_history() reads.
    """
    if not frappe.has_permission("Garage Vehicle", "write", doc=vehicle):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    if not customer:
        frappe.throw(_("Customer is required"))

    doc = frappe.get_doc("Garage Vehicle", vehicle)
    if doc.customer == customer:
        frappe.throw(_("Vehicle is already owned by this customer"))

    doc.customer = customer
    doc.save()

    return {
        "customer": doc.customer,
        "customer_name": doc.customer_name,
        "customer_phone": doc.customer_phone,
    }
