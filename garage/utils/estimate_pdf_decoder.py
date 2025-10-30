"""Utility helpers to persist estimate PDFs shipped inside webhook payloads."""
from __future__ import annotations

import argparse
import base64
import json
import sys
from pathlib import Path
from typing import Any, Dict


def _load_payload(path: str) -> Dict[str, Any]:
    if path == "-":
        data = json.load(sys.stdin)
    else:
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("Payload root must be a JSON object")
    return data

def _extract_pdf_info(payload: Dict[str, Any]) -> Dict[str, str]:
    message = payload.get("message")
    if not isinstance(message, dict):
        raise ValueError("Payload does not contain a 'message' object")

    pdf_info = message.get("estimate_pdf")
    if not isinstance(pdf_info, dict):
        raise ValueError("Payload does not contain an 'estimate_pdf' object")

    filename = pdf_info.get("filename")
    content = pdf_info.get("content")

    if not filename:
        raise ValueError("'estimate_pdf.filename' is required")
    if not content:
        raise ValueError("'estimate_pdf.content' is required")

    return {"filename": str(filename), "content": str(content)}


def save_estimate_pdf(payload: Dict[str, Any], output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_info = _extract_pdf_info(payload)
    target = output_dir / pdf_info["filename"]
    binary = base64.b64decode(pdf_info["content"], validate=True)
    target.write_bytes(binary)
    return target


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Decode the base64-encoded estimate PDF that Garage sends inside "
            "webhook payloads."
        )
    )
    parser.add_argument(
        "payload",
        help="Path to the JSON payload (use '-' to read from stdin).",
    )
    parser.add_argument(
        "--output-dir",
        default="docs/estimates",
        type=Path,
        help="Directory where the PDF should be written (default: docs/estimates).",
    )
    return parser


def main(argv: Any = None) -> Path:
    parser = _build_parser()
    args = parser.parse_args(argv)
    payload = _load_payload(args.payload)
    return save_estimate_pdf(payload, args.output_dir)


if __name__ == "__main__":
    path = main()
    print(f"PDF saved to {path}")
