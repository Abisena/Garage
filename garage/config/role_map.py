"""Role-based routing configuration for the Garage portal."""

from __future__ import annotations

from typing import Iterable, Mapping, Sequence, Set

import frappe

# Roles that are considered privileged and therefore have access to every
# section of the portal. These users land on the overview page by default.
PRIVILEGED_ROLES: Set[str] = {
    "Administrator",
    "System Manager",
    "Manager Bengkel",
    "Garage Manager",
}


# Default routes per role for non-privileged users. The keys intentionally cover
# several potential spellings so the portal works with the roles commonly used
# by workshops in Indonesia.
ROLE_HOME_ROUTES: Mapping[str, str] = {
    # Registration / intake team
    "Admin": "/garage/intake",
    "Registrasi": "/garage/intake",
    "Customer Service": "/garage/intake",
    "Front Desk": "/garage/intake",

    # Service operations
    "Service": "/garage/service",
    "Servis": "/garage/service",
    "Service Advisor": "/garage/service",
    "Technician": "/garage/service",
    "Teknisi": "/garage/service",

    # Spare part & inventory teams
    "Sparepart": "/garage/sparepart",
    "Spare Part": "/garage/sparepart",
    "Inventory": "/garage/sparepart",
    "Inventory Controller": "/garage/sparepart",

    # Procurement / purchasing
    "Pengadaan": "/garage/procurement",
    "Procurement": "/garage/procurement",
    "Buying": "/garage/procurement",

    # Finance & cashier
    "Finance": "/garage/finance",
    "Keuangan": "/garage/finance",
    "Accountant": "/garage/finance",
    "Cashier": "/garage/finance",
}


DEFAULT_PRIVILEGED_ROUTE = "/garage/intake"
DEFAULT_FALLBACK_ROUTE = "/garage/login"


def _roles_to_set(roles: Iterable[str]) -> Set[str]:
    return {role for role in roles if role}


def get_portal_home_for_roles(roles: Iterable[str]) -> str:
    """Return the best landing page for the provided roles."""

    role_set = _roles_to_set(roles)
    if role_set & PRIVILEGED_ROLES:
        return DEFAULT_PRIVILEGED_ROUTE

    for role in role_set:
        route = ROLE_HOME_ROUTES.get(role)
        if route:
            return route

    return DEFAULT_FALLBACK_ROUTE


def get_portal_home_for_user(user: str) -> str:
    """Return the default portal page for the given user ID."""

    if not user or user == "Guest":
        return DEFAULT_FALLBACK_ROUTE

    roles = frappe.get_roles(user)
    return get_portal_home_for_roles(roles)


def user_has_access(user_roles: Sequence[str], allowed_roles: Sequence[str]) -> bool:
    """Check if a user should be able to view a page.

    Privileged users automatically pass the check while other users must have at
    least one role that matches ``allowed_roles``.
    """

    role_set = _roles_to_set(user_roles)
    if role_set & PRIVILEGED_ROLES:
        return True

    allowed_set = _roles_to_set(allowed_roles)
    return bool(role_set & allowed_set)

