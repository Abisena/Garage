"""Authentication helpers for the Garage public portal."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import Any, Dict, List

import frappe
from frappe.utils import now

from garage.config import role_map


PORTAL_NAV_ITEMS: List[Dict[str, Any]] = [
    {
        "route": "/garage/intake",
        "key": "intake",
        "label": "📋 Registrasi",
        "roles": ["Admin", "Registrasi", "Customer Service", "Front Desk"],
    },
    {
        "route": "/garage/service",
        "key": "service",
        "label": "🔧 Servis",
        "roles": ["Service", "Servis", "Service Advisor", "Technician", "Teknisi", "Mechanic", "Mekanik"],
    },
    {
        "route": "/garage/sparepart",
        "key": "sparepart",
        "label": "📦 Sparepart",
        "roles": ["Sparepart", "Spare Part", "Inventory", "Inventory Controller"],
    },
    {
        "route": "/garage/procurement",
        "key": "procurement",
        "label": "🛒 Pengadaan",
        "roles": ["Pengadaan", "Procurement", "Buying"],
    },
    {
        "route": "/garage/finance",
        "key": "finance",
        "label": "💰 Keuangan",
        "roles": ["Finance", "Keuangan", "Accountant", "Cashier"],
    },
    {
        "route": "/garage/log-history",
        "key": "log-history",
        "label": "🕒 Log History",
        "roles": [
            "Admin",
            "Manager",
            "System Manager",
            "Garage Manager",
            "Manager Bengkel",
            "Head Manager Bengkel",
        ],
    },
    {"route": "/garage/insight", "key": "insight", "label": "📊 Report", "roles": []},
]


# ``fetchSessionUser`` on the Next.js frontend now calls this endpoint via the
# default ``POST`` method to avoid framework-specific "method not allowed"
# errors in environments that do not yet support HTTP method filters on
# ``frappe.whitelist``. Keeping the decorator simple ensures compatibility with
# older Frappe releases that may back this repository.
@frappe.whitelist(allow_guest=True)
def get_logged_user() -> Dict[str, str]:
    """Get current logged in user profile information.
    
    Returns user ID, full name, and email for the authenticated session user.
    This is a whitelisted alternative to frappe.auth.get_logged_user.
    """
    user = frappe.session.user
    
    if user == "Guest":
        # Mirror frappe.auth.get_logged_user behaviour and allow guests to
        # discover whether they already have an authenticated session.  The
        # frontend treats a ``Guest`` response as an unauthenticated state and
        # will prompt the user to log in.
        return {"id": "Guest", "full_name": "Guest", "email": ""}

    # Get user document
    user_doc = frappe.get_doc("User", user)

    return {
        "id": user,
        "full_name": user_doc.full_name or user,
        "email": user_doc.email or user,
    }


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


def _coerce_roles(value: Sequence[str] | Iterable[str] | str | None) -> List[str]:
    """Normalise potential role payloads received from the client."""

    if not value:
        return []

    if isinstance(value, str):
        try:
            parsed = frappe.parse_json(value)
        except Exception:  # noqa: BLE001 - fall back to treating the value as a single role
            return [value]

        if isinstance(parsed, str):
            return [parsed]
        if isinstance(parsed, Iterable):
            return [role for role in parsed if role]
        return []

    if isinstance(value, Iterable):
        return [role for role in value if role]

    return []


@frappe.whitelist(allow_guest=False)
def check_portal_access(required_roles: Sequence[str] | str | None = None) -> Dict[str, bool]:
    """Validate whether the current session user may view a guarded page."""

    user = frappe.session.user
    if user == "Guest":
        raise frappe.PermissionError(frappe._("Please log in to access the portal."))

    allowed_roles = _coerce_roles(required_roles)
    user_roles = frappe.get_roles(user)
    has_access = role_map.user_has_access(user_roles, allowed_roles)

    return {"has_access": has_access}


@frappe.whitelist(allow_guest=False)
def get_portal_navigation() -> Dict[str, List[Dict[str, Any]]]:
    """Return the navigation structure with access flags for the current user."""

    user = frappe.session.user
    if user == "Guest":
        raise frappe.PermissionError(frappe._("Please log in to access the portal."))

    user_roles = frappe.get_roles(user)
    items: List[Dict[str, Any]] = []

    for item in PORTAL_NAV_ITEMS:
        payload = dict(item)
        required_roles = item.get("roles", [])
        payload["allowed"] = True if not required_roles else role_map.user_has_access(user_roles, required_roles)
        items.append(payload)

    return {"items": items}


@frappe.whitelist(allow_guest=False)
def keep_portal_session_alive() -> Dict[str, str]:
    """Touch the current session so it remains active for portal users."""

    user = frappe.session.user
    if user == "Guest":
        raise frappe.PermissionError(frappe._("Please log in to access the portal."))

    return {"user": user, "refreshed_at": now()}