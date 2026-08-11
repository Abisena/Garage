"""Migrate old 10-status values to the new 4-status model on Garage Service Order."""

import frappe


OLD_TO_NEW = {
    "Draft": "Open",
    "Inspection": "Open",
    "Estimate": "Open",
    "Awaiting Approval": "Open",
    "Approved": "Open",
    "Request Part": "Open",
    "Work In Progress": "Open",
}


def execute():
    for old_status, new_status in OLD_TO_NEW.items():
        frappe.db.sql(
            """UPDATE `tabGarage Service Order`
               SET `status` = %s
               WHERE `status` = %s""",
            (new_status, old_status),
        )

    frappe.db.commit()
