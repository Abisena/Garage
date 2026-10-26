"""Garage DocType controller for Garage Export Template.

Stores one saved field selection for frappe's Export Data dialog, so a user
can pick the same set of columns again next time instead of re-ticking a few
dozen checkboxes (explicit request). One row = one template; the selection
itself lives in export_fields as a JSON map of
{parent doctype or child table fieldname: [fieldname, ...]}, which is exactly
the shape the dialog's MultiCheck fields hand back and exactly what
download_template() expects, so loading a template is a straight replay with
no translation step.

Templates are per-owner by default. is_shared makes a template readable by
anyone who can read the reference doctype, but still writable only by its
owner - see garage/api/export_template.py, which is the only path the dialog
talks to. The doctype's own permission table is System Manager only on
purpose: ordinary users never touch it directly, the API enforces the
owner-or-shared rule itself.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.model.document import Document


EXPORT_RECORDS_OPTIONS = ("all", "by_filter", "5_records", "blank_template")


class GarageExportTemplate(Document):
    def validate(self) -> None:
        self.template_name = (self.template_name or "").strip()
        if not self.template_name:
            frappe.throw(_("Template Name is required"))

        self.export_fields = _dump_json(
            _parse_json(self.export_fields, _("Export Fields")), default={}
        )
        self.export_filters = _dump_json(
            _parse_json(self.export_filters, _("Export Filters")), default=[]
        )

        if not self.get_fields_map():
            frappe.throw(_("Select at least one field before saving a template"))

        if self.export_records and self.export_records not in EXPORT_RECORDS_OPTIONS:
            frappe.throw(
                _("Invalid Export Type {0}").format(frappe.bold(self.export_records))
            )

        self.validate_duplicate()

    def validate_duplicate(self) -> None:
        """One template name per owner per (doctype, exporting_for).

        Scoped to the owner rather than globally so two users can both keep a
        template called "Basic" - a global unique name would make the feature
        a race between whoever saves first.
        """
        duplicate = frappe.db.exists(
            "Garage Export Template",
            {
                "name": ("!=", self.name),
                "owner": self.owner,
                "reference_doctype": self.reference_doctype,
                "exporting_for": self.exporting_for,
                "template_name": self.template_name,
            },
        )
        if duplicate:
            frappe.throw(
                _("You already have an export template named {0} for {1}").format(
                    frappe.bold(self.template_name), frappe.bold(self.reference_doctype)
                ),
                frappe.DuplicateEntryError,
            )

    def get_fields_map(self) -> dict[str, list[str]]:
        """export_fields as {key: [fieldname, ...]}, junk entries dropped."""
        data = _parse_json(self.export_fields, _("Export Fields")) or {}
        if not isinstance(data, dict):
            return {}

        out: dict[str, list[str]] = {}
        for key, values in data.items():
            if not isinstance(values, (list, tuple)):
                continue
            fieldnames = [str(v) for v in values if v]
            if fieldnames:
                out[str(key)] = fieldnames
        return out

    def get_filters(self) -> list[list[Any]]:
        data = _parse_json(self.export_filters, _("Export Filters")) or []
        if not isinstance(data, (list, tuple)):
            return []
        return [list(f) for f in data if isinstance(f, (list, tuple)) and len(f) >= 4]


def _parse_json(value: Any, label: str) -> Any:
    if value in (None, ""):
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        frappe.throw(_("{0} is not valid JSON").format(label))


def _dump_json(value: Any, default: Any) -> str:
    if value in (None, ""):
        value = default
    return json.dumps(value, indent=1, sort_keys=True)
