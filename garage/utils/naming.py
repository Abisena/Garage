"""Branch-aware document naming helpers."""

from __future__ import annotations

from typing import Optional

import frappe
from frappe import _
from frappe.model.naming import make_autoname
from frappe.utils import now_datetime


def get_branch(branch_name: Optional[str]) -> frappe._dict:
    """Return the branch doc with its code, raising a user error when missing."""

    branch_id = (branch_name or "").strip()
    if not branch_id:
        frappe.throw(_("Cabang wajib dipilih sebelum menyimpan dokumen."))

    branch = frappe.db.get_value(
        "Garage Branch",
        branch_id,
        ["name", "branch_code", "branch_name", "address_line1", "address_line2", "city", "phone", "email"],
        as_dict=True,
    )
    if not branch:
        frappe.throw(_("Cabang {0} tidak ditemukan.").format(branch_id))

    code = (branch.get("branch_code") or "").strip().upper()
    if not code:
        frappe.throw(_("Cabang {0} belum memiliki kode.").format(branch.get("branch_name") or branch_id))

    branch.branch_code = code
    return branch


def make_branch_autoname(
    doc: frappe.model.document.Document,
    series: str,
    *,
    include_year: bool = False,
) -> None:
    """Assign a name combining the branch code and provided series."""

    branch = get_branch(getattr(doc, "branch", None))
    doc.branch_code = branch.branch_code  # type: ignore[attr-defined]

    pattern = f"{branch.branch_code}-{series}-"
    if include_year:
        pattern = f"{pattern}{now_datetime().year}-"

    doc.name = make_autoname(f"{pattern}.#####")
