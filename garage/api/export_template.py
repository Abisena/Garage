"""Whitelisted API behind the Export Template section of the Export Data dialog.

The dialog (garage/public/js/export_template.js) talks only to this module,
never to the Garage Export Template doctype directly - that doctype is
System Manager only, so every rule that decides who may see or change a
template is written out here instead of leaning on a permission table:

- you may read your own templates, plus anyone's template flagged is_shared
- you may only write or delete your own
- on top of both, you must have read permission on the reference doctype
  itself; a shared "Salary Slip" template must not become a list of a
  doctype's fieldnames for someone with no access to Salary Slip

Writes run with ignore_permissions because the doctype is deliberately closed
to ordinary users, so the checks above are the whole gate - keep them first
in every entry point.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _


DOCTYPE = "Garage Export Template"
EXPORTING_FOR_OPTIONS = ("Insert New Records", "Update Existing Records")


@frappe.whitelist()
def get_templates(reference_doctype: str, exporting_for: str | None = None) -> list[dict]:
    """Templates the current user may load for this doctype, own ones first."""
    _check_reference_access(reference_doctype)

    filters: dict[str, Any] = {"reference_doctype": reference_doctype}
    if exporting_for:
        filters["exporting_for"] = _validate_exporting_for(exporting_for)

    rows = frappe.get_all(
        DOCTYPE,
        filters=filters,
        or_filters={"owner": frappe.session.user, "is_shared": 1},
        fields=["name", "template_name", "owner", "is_shared", "exporting_for", "modified"],
        order_by="template_name asc",
    )

    user = frappe.session.user
    for row in rows:
        row["is_own"] = 1 if row.owner == user else 0
    rows.sort(key=lambda r: (0 if r["is_own"] else 1, (r["template_name"] or "").lower()))
    return rows


@frappe.whitelist()
def get_template(name: str) -> dict:
    """One template, resolved into the shape the export dialog replays."""
    doc = frappe.get_doc(DOCTYPE, name)
    _check_read(doc)
    _check_reference_access(doc.reference_doctype)

    return {
        "name": doc.name,
        "template_name": doc.template_name,
        "reference_doctype": doc.reference_doctype,
        "exporting_for": doc.exporting_for,
        "file_type": doc.file_type,
        "export_records": doc.export_records,
        "export_fields": doc.get_fields_map(),
        "export_filters": doc.get_filters(),
        "is_shared": doc.is_shared,
        "is_own": 1 if doc.owner == frappe.session.user else 0,
    }


@frappe.whitelist()
def save_template(
    reference_doctype: str,
    template_name: str,
    export_fields: Any,
    exporting_for: str,
    export_filters: Any = None,
    file_type: str | None = None,
    export_records: str | None = None,
    is_shared: Any = 0,
    overwrite: Any = 0,
) -> dict:
    """Create the template, or update the caller's own one of the same name.

    Returns the saved name so the dialog can re-select it straight away.
    """
    if frappe.session.user == "Guest":
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    _check_reference_access(reference_doctype)
    exporting_for = _validate_exporting_for(exporting_for)
    template_name = (template_name or "").strip()
    if not template_name:
        frappe.throw(_("Template Name is required"))

    values = {
        "template_name": template_name,
        "reference_doctype": reference_doctype,
        "exporting_for": exporting_for,
        "file_type": file_type or "CSV",
        "export_records": export_records or "all",
        "export_fields": json.dumps(_as_json(export_fields) or {}),
        "export_filters": json.dumps(_as_json(export_filters) or []),
        "is_shared": 1 if frappe.utils.cint(is_shared) else 0,
    }

    existing = frappe.db.get_value(
        DOCTYPE,
        {
            "owner": frappe.session.user,
            "reference_doctype": reference_doctype,
            "exporting_for": exporting_for,
            "template_name": template_name,
        },
        "name",
    )

    if existing:
        if not frappe.utils.cint(overwrite):
            frappe.throw(
                _("You already have an export template named {0}").format(
                    frappe.bold(template_name)
                ),
                frappe.DuplicateEntryError,
            )
        doc = frappe.get_doc(DOCTYPE, existing)
        doc.update(values)
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc({"doctype": DOCTYPE, **values})
        doc.insert(ignore_permissions=True)

    return {"name": doc.name, "template_name": doc.template_name, "updated": bool(existing)}


@frappe.whitelist()
def delete_template(name: str) -> dict:
    """Delete one of the caller's own templates."""
    doc = frappe.get_doc(DOCTYPE, name)
    if doc.owner != frappe.session.user and "System Manager" not in frappe.get_roles():
        frappe.throw(
            _("Only {0} can delete this export template").format(frappe.bold(doc.owner)),
            frappe.PermissionError,
        )

    frappe.delete_doc(DOCTYPE, name, ignore_permissions=True)
    return {"name": name}


def _check_read(doc) -> None:
    if doc.owner == frappe.session.user:
        return
    if frappe.utils.cint(doc.is_shared):
        return
    frappe.throw(_("Not permitted to read this export template"), frappe.PermissionError)


def _check_reference_access(reference_doctype: str) -> None:
    if not reference_doctype:
        frappe.throw(_("Reference Document Type is required"))
    if not frappe.has_permission(reference_doctype, "read"):
        frappe.throw(
            _("Not permitted to read {0}").format(frappe.bold(reference_doctype)),
            frappe.PermissionError,
        )


def _validate_exporting_for(exporting_for: str) -> str:
    if exporting_for not in EXPORTING_FOR_OPTIONS:
        frappe.throw(
            _("Invalid Exporting For {0}").format(frappe.bold(exporting_for or ""))
        )
    return exporting_for


def _as_json(value: Any) -> Any:
    """Accept both a real object and the JSON string frappe.call sends."""
    if value in (None, ""):
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        frappe.throw(_("Invalid JSON payload"))
