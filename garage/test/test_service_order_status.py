"""Tests covering service order part status aggregation logic."""

from pathlib import Path
import sys
import types

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if "frappe" not in sys.modules:
    frappe_stub = types.ModuleType("frappe")
    model_stub = types.ModuleType("frappe.model")
    document_stub = types.ModuleType("frappe.model.document")

    class Document:  # pragma: no cover - simple stand-in for frappe.model.document.Document
        pass

    document_stub.Document = Document
    frappe_stub.model = model_stub
    model_stub.document = document_stub

    sys.modules["frappe"] = frappe_stub
    sys.modules["frappe.model"] = model_stub
    sys.modules["frappe.model.document"] = document_stub

if "garage.utils.naming" not in sys.modules:
    naming_stub = types.ModuleType("garage.utils.naming")

    def _not_implemented(*args, **kwargs):  # pragma: no cover - placeholder for autoname helpers
        raise NotImplementedError("Naming helpers are not available in tests.")

    naming_stub.make_branch_autoname = _not_implemented
    sys.modules["garage.utils.naming"] = naming_stub

    # Ensure the stub is discoverable via the package attribute as well.
    import garage.utils as utils_pkg  # type: ignore import-not-found

    utils_pkg.naming = naming_stub  # type: ignore[attr-defined]

import ast

import pytest

from garage.garage.doctype.garage_service_order.garage_service_order import (
    derive_part_charge_status,
)

PORTAL_PATH = PROJECT_ROOT / "garage" / "api" / "portal.py"


@pytest.mark.parametrize(
    "statuses, expected",
    [
        ([], "Not Started"),
        (["Re-Request"], "Pending"),
        (["Issued", "Re-Request"], "Partial Approve"),
    ],
)
def test_derive_part_charge_status_handles_re_request(statuses, expected):
    """Re-requested parts should keep the order pending until they are issued."""

    assert derive_part_charge_status(statuses) == expected


def test_re_request_included_in_active_statuses():
    """Spare part queues should surface items that were re-requested."""

    source = PORTAL_PATH.read_text(encoding="utf-8")
    module = ast.parse(source)

    for node in module.body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == "SPARE_REQUEST_ACTIVE_STATUSES":
                values = [
                    elt.value
                    for elt in getattr(node.value, "elts", [])
                    if isinstance(elt, ast.Constant) and isinstance(elt.value, str)
                ]
                assert "Re-Request" in values
                return

    pytest.fail("SPARE_REQUEST_ACTIVE_STATUSES definition was not found")
