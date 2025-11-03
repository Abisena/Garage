"""DocType controller for Garage Branch."""

from __future__ import annotations

import re

import frappe
from frappe import _
from frappe.model.document import Document


CODE_PATTERN = re.compile(r"^([A-Z0-9]+)(?:-?(\d+))?$")


class GarageBranch(Document):
    """Maintain canonical formatting for branch metadata."""

    def validate(self) -> None:
        original_code = (self.branch_code or "").strip().upper()
        if not original_code:
            frappe.throw(_("Kode cabang wajib diisi."))

        prefix, sequence = self._extract_code_parts(original_code)
        if not prefix:
            frappe.throw(
                _("Kode cabang harus terdiri dari huruf atau angka dengan format PREFIX-###."),
            )

        if sequence is None:
            next_sequence = self._next_sequence(prefix, exclude=original_code)
        else:
            next_sequence = int(sequence)

        self.branch_code = f"{prefix}-{next_sequence:03d}"
        self.branch_name = (self.branch_name or "").strip()
        if not self.branch_name:
            frappe.throw(_("Nama cabang wajib diisi."))

    def autoname(self) -> None:
        """Use the branch code as the primary identifier."""

        self.name = (self.branch_code or "").strip().upper()

    @staticmethod
    def _extract_code_parts(value: str) -> tuple[str | None, str | None]:
        match = CODE_PATTERN.match(value or "")
        if not match:
            return None, None
        prefix = match.group(1)
        sequence = match.group(2)
        return prefix, sequence

    def _next_sequence(self, prefix: str, *, exclude: str | None = None) -> int:
        try:
            rows = frappe.get_all(
                "Garage Branch",
                filters=[["branch_code", "like", f"{prefix}%"]],
                pluck="branch_code",
            )
        except Exception:
            rows = []

        max_sequence = 0
        for value in rows:
            normalized = (value or "").strip().upper()
            if not normalized or (exclude and normalized == exclude):
                continue
            match = CODE_PATTERN.match(normalized)
            if not match:
                continue
            if match.group(1) != prefix:
                continue
            try:
                candidate = int(match.group(2) or 0)
            except (TypeError, ValueError):
                continue
            if candidate > max_sequence:
                max_sequence = candidate

        return max_sequence + 1
