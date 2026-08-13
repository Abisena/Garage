"""Unit tests for spare part issue helpers."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
import sys
import types


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Ensure the production helper is loaded instead of any placeholder module
sys.modules.pop("garage.utils.spare_part_issue", None)
sys.modules.pop("garage.utils.service_estimate", None)


def _install_frappe_stubs() -> None:
    """Provide lightweight frappe modules required for the helpers under test."""

    frappe_stub = sys.modules.get("frappe")
    if frappe_stub is None:
        frappe_stub = types.ModuleType("frappe")
        sys.modules["frappe"] = frappe_stub

    if not hasattr(frappe_stub, "__path__"):
        frappe_stub.__path__ = []  # type: ignore[attr-defined]

    if not hasattr(frappe_stub, "flags"):
        frappe_stub.flags = types.SimpleNamespace()
    if not hasattr(frappe_stub, "local"):
        frappe_stub.local = types.SimpleNamespace()
    if not hasattr(frappe_stub, "session"):
        frappe_stub.session = types.SimpleNamespace(user="tester@example.com")
    if not hasattr(frappe_stub, "db"):
        frappe_stub.db = types.SimpleNamespace(
            get_value=lambda *args, **kwargs: None,
            get_all=lambda *args, **kwargs: [],
            exists=lambda *args, **kwargs: None,
        )
    if not hasattr(frappe_stub, "log_error"):
        frappe_stub.log_error = lambda *args, **kwargs: None
    if not hasattr(frappe_stub, "get_traceback"):
        frappe_stub.get_traceback = lambda: ""
    if not hasattr(frappe_stub, "get_template"):
        frappe_stub.get_template = lambda *args, **kwargs: types.SimpleNamespace(render=lambda ctx: "")
    if not hasattr(frappe_stub, "get_doc"):
        frappe_stub.get_doc = lambda *args, **kwargs: None
    if not hasattr(frappe_stub, "new_doc"):
        frappe_stub.new_doc = lambda *args, **kwargs: types.SimpleNamespace()
    if not hasattr(frappe_stub, "delete_doc"):
        frappe_stub.delete_doc = lambda *args, **kwargs: None
    frappe_stub._ = getattr(frappe_stub, "_", lambda text: text)
    if not getattr(frappe_stub, "__all__", None):
        frappe_stub.__all__ = ["_"]

    utils_stub = sys.modules.get("frappe.utils")
    if utils_stub is None:
        utils_stub = types.ModuleType("frappe.utils")
        sys.modules["frappe.utils"] = utils_stub

    if not hasattr(utils_stub, "__path__"):
        utils_stub.__path__ = []  # type: ignore[attr-defined]

    utils_stub.cint = getattr(utils_stub, "cint", lambda value: int(float(value or 0)))

    def _cstr(value: object) -> str:
        return "" if value is None else str(value)

    utils_stub.cstr = getattr(utils_stub, "cstr", _cstr)
    utils_stub.flt = getattr(utils_stub, "flt", lambda value: float(value or 0))
    utils_stub.get_url = getattr(utils_stub, "get_url", lambda path=None: f"https://example.test{path or ''}")

    def _get_datetime(value):
        if isinstance(value, datetime):
            return value
        if not value:
            return datetime(2024, 1, 1)
        try:
            return datetime.fromisoformat(str(value))
        except ValueError:
            return datetime(2024, 1, 1)

    utils_stub.get_datetime = getattr(utils_stub, "get_datetime", _get_datetime)
    utils_stub.now_datetime = getattr(utils_stub, "now_datetime", lambda: datetime(2024, 1, 1, 12, 0))
    utils_stub.format_datetime = getattr(
        utils_stub, "format_datetime", lambda dt, fmt=None: dt.strftime("%d %b %Y %H:%M")
    )

    pdf_stub = sys.modules.get("frappe.utils.pdf")
    if pdf_stub is None:
        pdf_stub = types.ModuleType("frappe.utils.pdf")
        sys.modules["frappe.utils.pdf"] = pdf_stub
    pdf_stub.get_pdf = getattr(pdf_stub, "get_pdf", lambda *args, **kwargs: b"%PDF-1.4")

    file_manager_stub = sys.modules.get("frappe.utils.file_manager")
    if file_manager_stub is None:
        file_manager_stub = types.ModuleType("frappe.utils.file_manager")
        sys.modules["frappe.utils.file_manager"] = file_manager_stub

    class _FakeFile:
        def __init__(self):
            self.name = "FILE-0001"
            self.file_name = "file.pdf"
            self.file_url = "/files/file.pdf"

    file_manager_stub.save_file = getattr(file_manager_stub, "save_file", lambda *args, **kwargs: _FakeFile())


_install_frappe_stubs()


from garage.utils import spare_part_issue  # noqa: E402  (import after stubs)


class _ServiceOrder(types.SimpleNamespace):
    """Lightweight object mimicking DocType dictionary access."""

    def get(self, key, default=None):  # pragma: no cover - trivial delegator
        return getattr(self, key, default)


class _Row:
    """Simple container mimicking a child table row."""

    def __init__(self, **values):
        self.__dict__.update(values)

    def as_dict(self):  # pragma: no cover - defensive, not used directly in tests
        return dict(self.__dict__)


def test_collect_issued_parts_uses_warehouse_fallback():
    """Warehouse information should fall back to alternative fields."""

    service_order = _ServiceOrder(
        required_parts=[
            _Row(
                stock_status="Issued",
                item_code="BRG-001",
                item_name="Brake Pad",
                qty=2,
                uom="Unit",
                warehouse_location="Gudang Selatan",
            )
        ]
    )

    parts = list(spare_part_issue._collect_issued_parts(service_order))

    assert parts[0]["warehouse"] == "Gudang Selatan"


def test_collect_issued_parts_reads_source_from_mapping():
    """Source should be resolved from dictionary style rows when missing as attributes."""

    class DictRow(_Row):
        def __init__(self, **values):
            super().__init__(**values)
            self._data = dict(values)

        def as_dict(self):  # pragma: no cover - trivial mapping accessor
            return dict(self._data)

    service_order = _ServiceOrder(
        required_parts=[
            DictRow(
                stock_status="Issued",
                item_code="OL-1",
                item_name="Oli Mesin",
                qty=1,
                uom="LTR",
                managed_by="Purchase",
            )
        ]
    )

    parts = list(spare_part_issue._collect_issued_parts(service_order))

    assert parts[0]["source"] == "Purchase"
