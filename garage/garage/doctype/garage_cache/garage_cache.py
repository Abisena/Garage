"""Server-side persistent cache entry for Garage frontend."""

from __future__ import annotations

import json

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class GarageCache(Document):
    """Persist user-scoped cached payloads."""

    def validate(self) -> None:
        self._validate_key()
        self._set_owner()
        self._set_timestamp()
        self._ensure_json_serializable()

    def _validate_key(self) -> None:
        cache_key = (self.cache_key or "").strip()
        if not cache_key:
            frappe.throw("Cache key is required")
        self.cache_key = cache_key

    def _set_owner(self) -> None:
        current_user = frappe.session.user
        if not current_user or current_user == "Guest":
            frappe.throw("Authentication required to manage cache entries")
        self.cache_owner = current_user

    def _set_timestamp(self) -> None:
        self.updated_at = now_datetime()

    def _ensure_json_serializable(self) -> None:
        """Validate that the cache value is valid JSON."""

        # Frappe stores long text as a string; ensure it is JSON serializable
        value = self.cache_value
        if value in (None, ""):
            return

        try:
            parsed = json.loads(value) if isinstance(value, str) else value
            json.dumps(parsed)
        except Exception as exc:  # noqa: BLE001
            frappe.throw(f"Invalid JSON payload: {exc}")

