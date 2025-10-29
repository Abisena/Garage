"""Jinja helpers exposed to templates."""

from __future__ import annotations

from typing import Any, Dict, List

from garage.api import auth


def get_portal_nav_items() -> List[Dict[str, Any]]:
    """Return the static portal navigation configuration.

    Templates render the structure client-side, so return a shallow copy of the
    configuration to avoid accidental mutation of the source data.
    """

    return [dict(item) for item in auth.PORTAL_NAV_ITEMS]
