"""Tests for date parsing helpers in ``garage.api.portal``.

These tests provide lightweight stubs for the Frappe utilities used by the
helpers so they can run in isolation.
"""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
import sys
import types

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ---------------------------------------------------------------------------
# Frappe stubs
# ---------------------------------------------------------------------------
if "frappe" not in sys.modules:
    frappe_stub = types.ModuleType("frappe")
    exceptions_stub = types.ModuleType("frappe.exceptions")
    utils_stub = types.ModuleType("frappe.utils")
    defaults_stub = types.ModuleType("frappe.defaults")

    class PermissionError(Exception):
        pass

    exceptions_stub.PermissionError = PermissionError

    def cint(value: object) -> int:
        return int(value or 0)

    def cstr(value: object) -> str:
        return "" if value is None else str(value)

    def flt(value: object) -> float:
        return float(value or 0)

    def _parse_datetime(value: str) -> datetime:
        candidates = (
            "%Y-%m-%d",
            "%Y-%m-%d %H:%M:%S",
            "%d %b %Y",
            "%d %b %Y %H:%M",
            "%d %b %Y, %H.%M",
            "%d %b %Y, %H:%M",
            "%d %b %Y %H.%M",
        )

        for pattern in candidates:
            try:
                return datetime.strptime(value, pattern)
            except ValueError:
                continue

        raise ValueError(value)

    def getdate(value: object) -> date:
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        return _parse_datetime(str(value)).date()

    def get_datetime(value: object) -> datetime:
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        parsed = _parse_datetime(str(value))
        return parsed

    def now_datetime() -> datetime:  # pragma: no cover - deterministic enough for tests
        return datetime(2024, 1, 1, 12, 0)

    def nowdate() -> date:  # pragma: no cover - deterministic enough for tests
        return date(2024, 1, 1)

    def now() -> datetime:  # pragma: no cover - mirrors frappe.utils.now
        return now_datetime()

    def get_url(path: str) -> str:  # pragma: no cover - unused in tests
        return path

    utils_stub.cint = cint
    utils_stub.cstr = cstr
    utils_stub.flt = flt
    utils_stub.get_datetime = get_datetime
    utils_stub.get_url = get_url
    utils_stub.getdate = getdate
    utils_stub.now = now
    utils_stub.now_datetime = now_datetime
    utils_stub.nowdate = nowdate

    def _(message: str, *args: object, **kwargs: object) -> str:
        return message

    frappe_stub._ = _
    frappe_stub._dict = dict
    frappe_stub.whitelist = lambda *args, **kwargs: (lambda fn: fn)
    frappe_stub.get_all = lambda *args, **kwargs: []  # pragma: no cover - unused
    frappe_stub.get_doc = lambda *args, **kwargs: None  # pragma: no cover - unused
    frappe_stub.db = types.SimpleNamespace(get_value=lambda *a, **k: None)
    frappe_stub.session = types.SimpleNamespace(user="test-user")
    frappe_stub.defaults = defaults_stub
    frappe_stub.utils = utils_stub
    frappe_stub.exceptions = exceptions_stub

    defaults_stub.get_user_default = lambda *_args, **_kwargs: None

    sys.modules["frappe"] = frappe_stub
    sys.modules["frappe.exceptions"] = exceptions_stub
    sys.modules["frappe.utils"] = utils_stub
    sys.modules["frappe.defaults"] = defaults_stub


if "garage.utils.service_estimate" not in sys.modules:
    sys.modules["garage.utils.service_estimate"] = types.ModuleType("service_estimate")

if "garage.utils.spare_part_issue" not in sys.modules:
    sys.modules["garage.utils.spare_part_issue"] = types.ModuleType("spare_part_issue")

if "garage.garage.doctype.garage_service_order.garage_service_order" not in sys.modules:
    gso_stub = types.ModuleType("garage_service_order")

    def derive_part_charge_status(statuses):  # pragma: no cover - unused
        return statuses

    gso_stub.derive_part_charge_status = derive_part_charge_status
    sys.modules[
        "garage.garage.doctype.garage_service_order.garage_service_order"
    ] = gso_stub


if "garage.api.auth" not in sys.modules:
    sys.modules["garage.api.auth"] = types.ModuleType("garage.api.auth")


# Import after stubs are prepared
import importlib

portal = importlib.import_module("garage.api.portal")


def test_sanitize_iso_date_accepts_dot_time_separator():
    """Date strings with comma and dot time separators should parse cleanly."""

    assert portal._sanitize_iso_date("18 Nov 2025, 16.50") == "2025-11-18"


def test_coerce_date_value_normalizes_to_iso_with_time():
    """Ensure datetime strings are normalized to ISO-style timestamps."""

    result = portal._coerce_date_value("18 Nov 2025, 18.19")

    assert result == "2025-11-18 18:19:00"
