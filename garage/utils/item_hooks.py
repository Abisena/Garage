"""DocType hooks for Item."""
from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import get_link_to_form

REJECTED_STATUS = "Rejected"


def block_delete_if_spare_part_requested(doc, method=None) -> None:  # pragma: no cover - frappe lifecycle hook
    """Prevent deleting an Item that is still referenced by an active Spare Part Request."""
    requests = frappe.db.sql(
        """
        select spri.parent
        from `tabSpare Part Request Item` spri
        inner join `tabSpare Part Request` spr on spr.name = spri.parent
        where spri.item_code = %s and spr.status != %s
        """,
        (doc.name, REJECTED_STATUS),
        as_dict=True,
    )
    if not requests:
        return

    request_links = ", ".join(
        get_link_to_form("Spare Part Request", row.parent) for row in requests
    )
    frappe.throw(
        _("Cannot delete Item {0} because it is linked with Spare Part Request {1}").format(
            frappe.bold(doc.name), request_links
        ),
        title=_("Not Allowed"),
    )
