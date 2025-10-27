"""Authentication helpers for the Garage public portal."""

from __future__ import annotations

from typing import Dict

import frappe

from garage.config import role_map


@frappe.whitelist(allow_guest=False)
def get_portal_home() -> Dict[str, str]:
    """Return the default portal landing page for the current session user.

    The frontend uses this endpoint after a successful login (and when a user is
    denied access to a page) to determine which section of the portal should be
    shown. The mapping itself lives in :mod:`garage.config.role_map` so it can be
    reused by Jinja templates and other server-side utilities.
    """

    user = frappe.session.user
    if user == "Guest":
        raise frappe.PermissionError(frappe._("Please log in to access the portal."))

    return {"route": role_map.get_portal_home_for_user(user)}

