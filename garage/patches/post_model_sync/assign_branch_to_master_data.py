"""Assign branch information to existing master data records.

Backfill branch ownership on customers, vehicles, technicians, and approvals.
"""

from __future__ import annotations

import frappe


def _reload() -> None:
    for doc in (
        "garage_customer",
        "garage_vehicle",
        "garage_technician",
        "garage_spare_part_approval",
    ):
        try:
            frappe.reload_doc("garage", "doctype", doc)
        except Exception:
            pass


def _single_branch_fallback() -> str | None:
    try:
        branch_count = frappe.db.count("Garage Branch")
    except Exception:
        return None

    if branch_count != 1:
        return None

    try:
        row = frappe.get_all("Garage Branch", fields=["name"], limit=1)
    except Exception:
        return None

    if not row:
        return None

    return row[0].get("name")


def execute() -> None:
    _reload()

    fallback_branch = _single_branch_fallback()

    customers = frappe.get_all(
        "Garage Customer",
        filters={"branch": ("is", "not set")},
        pluck="name",
    )
    for name in customers:
        branch = None
        try:
            branch = frappe.db.get_value(
                "Garage Service Order",
                {"customer": name, "branch": ("!=", "")},
                "branch",
                order_by="modified desc",
            )
        except Exception:
            branch = None
        if not branch:
            try:
                branch = frappe.db.get_value(
                    "Garage Vehicle",
                    {"customer": name, "branch": ("!=", "")},
                    "branch",
                    order_by="modified desc",
                )
            except Exception:
                branch = None
        if not branch:
            branch = fallback_branch
        if branch:
            frappe.db.set_value("Garage Customer", name, "branch", branch, update_modified=False)

    vehicles = frappe.get_all(
        "Garage Vehicle",
        filters={"branch": ("is", "not set")},
        fields=["name", "customer"],
    )
    for vehicle in vehicles:
        branch = None
        try:
            branch = frappe.db.get_value(
                "Garage Service Order",
                {"vehicle": vehicle.get("name"), "branch": ("!=", "")},
                "branch",
                order_by="modified desc",
            )
        except Exception:
            branch = None
        if not branch and vehicle.get("customer"):
            try:
                branch = frappe.db.get_value("Garage Customer", vehicle["customer"], "branch")
            except Exception:
                branch = None
        if not branch:
            branch = fallback_branch
        if branch:
            frappe.db.set_value("Garage Vehicle", vehicle.get("name"), "branch", branch, update_modified=False)

    technicians = frappe.get_all(
        "Garage Technician",
        filters={"branch": ("is", "not set")},
        fields=["name", "employee"],
    )
    for tech in technicians:
        branch = None
        if tech.get("employee"):
            try:
                branch = frappe.db.get_value("Employee", tech["employee"], "branch")
            except Exception:
                branch = None
        if not branch:
            branch = fallback_branch
        if branch:
            frappe.db.set_value("Garage Technician", tech.get("name"), "branch", branch, update_modified=False)

    approvals = frappe.get_all(
        "Garage Spare Part Approval",
        filters={"branch": ("is", "not set")},
        fields=["name", "service_order"],
    )
    for approval in approvals:
        branch = None
        if approval.get("service_order"):
            try:
                branch = frappe.db.get_value(
                    "Garage Service Order",
                    approval["service_order"],
                    "branch",
                )
            except Exception:
                branch = None
        if not branch:
            branch = fallback_branch
        if branch:
            frappe.db.set_value(
                "Garage Spare Part Approval",
                approval.get("name"),
                "branch",
                branch,
                update_modified=False,
            )
