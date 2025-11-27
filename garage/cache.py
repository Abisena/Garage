"""Server-side persistent cache API for Garage frontend."""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import add_days, now_datetime


def _assert_user() -> str:
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("Authentication required"))
    return user


def _parse_json(value: Any) -> str:
    if value in (None, ""):
        return "null"
    try:
        if isinstance(value, str):
            parsed = json.loads(value)
        else:
            parsed = value
        return json.dumps(parsed)
    except Exception as exc:  # noqa: BLE001
        frappe.throw(_(f"Invalid JSON payload: {exc}"))
    return "null"


@frappe.whitelist()
def save(key: str, value: Any) -> dict[str, Any]:
    """Create or update a cache entry for the current user."""

    user = _assert_user()
    cache_key = (key or "").strip()
    if not cache_key:
        frappe.throw(_("Cache key is required"))

    serialized_value = _parse_json(value)

    existing = frappe.get_all(
        "Garage Cache",
        filters={"cache_key": cache_key, "cache_owner": user},
        pluck="name",
        limit_page_length=1,
    )

    if existing:
        name = existing[0]
        frappe.db.set_value(
            "Garage Cache",
            name,
            "cache_value",
            serialized_value,
            update_modified=True,
            modified_by=user,
        )
        doc = frappe.get_doc("Garage Cache", name)
    else:
        doc = frappe.get_doc(
            {
                "doctype": "Garage Cache",
                "cache_key": cache_key,
                "cache_value": serialized_value,
            }
        )
        doc.insert(ignore_permissions=False)

    return {
        "success": True,
        "cache_key": cache_key,
        "updated_at": doc.updated_at,
    }


@frappe.whitelist()
def load(key: str) -> Any:
    """Return cached JSON payload for the current user or ``None``."""

    user = _assert_user()
    cache_key = (key or "").strip()
    if not cache_key:
        frappe.throw(_("Cache key is required"))

    existing = frappe.get_all(
        "Garage Cache",
        filters={"cache_key": cache_key, "cache_owner": user},
        fields=["name", "cache_value"],
        limit_page_length=1,
    )
    if not existing:
        return None

    raw_value = existing[0].get("cache_value") if isinstance(existing[0], dict) else None
    if raw_value in (None, ""):
        return None
    try:
        return json.loads(raw_value)
    except Exception:
        return None


@frappe.whitelist()
def delete(key: str) -> dict[str, Any]:
    """Delete a cache entry belonging to the current user."""

    user = _assert_user()
    cache_key = (key or "").strip()
    if not cache_key:
        frappe.throw(_("Cache key is required"))

    existing = frappe.get_all(
        "Garage Cache",
        filters={"cache_key": cache_key, "cache_owner": user},
        pluck="name",
        limit_page_length=1,
    )
    if existing:
        frappe.delete_doc("Garage Cache", existing[0], ignore_permissions=False)

    return {"success": True}


def cleanup_expired_cache(days: int | None = None) -> int:
    """Delete ephemeral cache entries older than the configured window.

    Args:
        days: Retention period in days. Defaults to value from ``garage_cache_retention_days``
            in site config or 30 days.
    Returns:
        Number of deleted records.
    """

    retention_days = days or int(frappe.conf.get("garage_cache_retention_days", 30))
    cutoff = add_days(now_datetime(), -retention_days)

    old_entries = frappe.get_all(
        "Garage Cache",
        filters=[
            ["updated_at", "<", cutoff],
            ["or", ["cache_key", "like", "draft:%"], ["cache_key", "like", "temp:%"]],
        ],
        pluck="name",
    )
    deleted = 0
    for name in old_entries:
        try:
            frappe.delete_doc("Garage Cache", name, ignore_permissions=True)
            deleted += 1
        except Exception:
            continue
    return deleted

