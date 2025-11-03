"""Tests for base64 encoded document helpers."""

import base64
from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest

from garage.utils.base64_files import (
    InvalidBase64ContentError,
    MissingBase64ContentError,
    save_estimate_pdf,
)


@pytest.fixture
def sample_message() -> dict:
    """Provide a sample webhook payload containing an estimate PDF."""

    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF\n"
    encoded = base64.b64encode(pdf_bytes).decode()
    return {
        "estimate_pdf": {
            "filename": "25-estimasi-service.pdf",
            "content": encoded,
        }
    }


def test_save_estimate_pdf_writes_file(tmp_path: Path, sample_message: dict) -> None:
    """The helper should persist the decoded PDF to the provided directory."""

    output_path = save_estimate_pdf(sample_message, tmp_path)

    assert output_path.exists()
    assert output_path.read_bytes().startswith(b"%PDF-1.4")


def test_save_estimate_pdf_missing_payload(tmp_path: Path) -> None:
    """Missing payload information should raise a descriptive error."""

    with pytest.raises(MissingBase64ContentError):
        save_estimate_pdf({}, tmp_path)


def test_save_estimate_pdf_invalid_base64(tmp_path: Path, sample_message: dict) -> None:
    """Invalid base64 data should raise a dedicated error type."""

    sample_message["estimate_pdf"]["content"] = "not-base64"

    with pytest.raises(InvalidBase64ContentError):
        save_estimate_pdf(sample_message, tmp_path)
