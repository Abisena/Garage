"""Utility helpers for working with base64 encoded documents."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any, Dict, Optional, Union


class MissingBase64ContentError(ValueError):
    """Raised when base64 content is missing from the payload."""


class InvalidBase64ContentError(ValueError):
    """Raised when the provided content cannot be decoded from base64."""


def _extract_pdf_payload(message: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Extract the estimate PDF payload from a webhook message.

    Args:
        message: Webhook payload dictionary.

    Returns:
        A dictionary containing the ``filename`` and ``content`` keys when the
        payload is available. ``None`` is returned when the payload is missing.
    """

    pdf_info = message.get("estimate_pdf")
    if not isinstance(pdf_info, dict):
        return None

    filename = pdf_info.get("filename")
    content = pdf_info.get("content")

    if not isinstance(content, str) or not content:
        return None

    if not isinstance(filename, str) or not filename.strip():
        filename = "estimate.pdf"

    return {"filename": filename, "content": content}


def save_estimate_pdf(message: Dict[str, Any], output_dir: Union[str, Path]) -> Path:
    """Persist a base64-encoded estimate PDF from an IMOGI webhook message.

    Args:
        message: The webhook payload containing the ``estimate_pdf`` structure.
        output_dir: Directory where the decoded PDF should be saved.

    Returns:
        The :class:`pathlib.Path` of the written PDF file.

    Raises:
        MissingBase64ContentError: If the webhook payload does not include the
            ``estimate_pdf`` data.
        InvalidBase64ContentError: If the encoded content cannot be decoded.
    """

    payload = _extract_pdf_payload(message)
    if payload is None:
        raise MissingBase64ContentError("estimate_pdf payload is missing or empty")

    output_path = Path(output_dir) / payload["filename"]
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        decoded = base64.b64decode(payload["content"], validate=True)
    except (base64.binascii.Error, ValueError) as exc:  # type: ignore[attr-defined]
        raise InvalidBase64ContentError("estimate_pdf content is not valid base64") from exc

    output_path.write_bytes(decoded)
    return output_path


__all__ = [
    "MissingBase64ContentError",
    "InvalidBase64ContentError",
    "save_estimate_pdf",
]