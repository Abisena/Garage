"""Seed default portal users with branch access."""

"""Seed default portal users with branch access."""

from __future__ import annotations

from typing import Optional, Tuple

import frappe
from frappe.utils.password import update_password

DEFAULT_ROLES = ["Garage Manager", "Service Advisor"]
DEFAULT_PASSWORD = "garage123"

BRANCH_USERS = [
    {
        "email": "jakarta.branch@garage.local",
        "full_name": "Jakarta Branch Advisor",
        "branch": "JKT-001",
    },
    {
        "email": "bandung.branch@garage.local",
        "full_name": "Bandung Branch Advisor",
        "branch": "BDG-001",
    },
    {
        "email": "surabaya.branch@garage.local",
        "full_name": "Surabaya Branch Advisor",
        "branch": "SBY-001",
    },
]


def execute() -> None:
    if not frappe.db.table_exists("Garage Branch Access"):
        return

    for entry in BRANCH_USERS:
        branch_name = entry["branch"].strip()
        if not branch_name or not frappe.db.exists("Garage Branch", branch_name):
            continue
        user_id, created = _ensure_user(entry["email"], entry["full_name"])
        if created:
            _set_initial_password(user_id, entry.get("password"))
        _ensure_branch_access(user_id, branch_name)


def _ensure_user(email: str, full_name: str) -> Tuple[str, bool]:
    user_id = email.strip().lower()
    if not user_id:
        raise ValueError("Email wajib diisi untuk membuat user portal.")

    created = False
    if frappe.db.exists("User", user_id):
        user = frappe.get_doc("User", user_id)
    else:
        user = frappe.new_doc("User")
        user.email = user_id
        user.first_name = full_name.split(" ")[0] if full_name else "Branch"
        user.full_name = full_name or user.first_name
        user.enabled = 1
        user.user_type = "System User"
        user.send_welcome_email = 0
        user.insert(ignore_permissions=True)
        created = True

    existing_roles = {role.role for role in user.get("roles", [])}
    updated = False
    for role in DEFAULT_ROLES:
        if role not in existing_roles:
            user.append("roles", {"role": role})
            updated = True
    if updated:
        user.save(ignore_permissions=True)

    return user.name, created


def _set_initial_password(user: str, password: Optional[str]) -> None:
    secret = (password or DEFAULT_PASSWORD or "").strip()
    if not secret:
        return
    update_password(user, secret, logout_all_sessions=False)


def _ensure_branch_access(user: str, branch: str) -> None:
    if frappe.db.exists(
        "Garage Branch Access",
        {"user": user, "branch": branch},
    ):
        return

    doc = frappe.new_doc("Garage Branch Access")
    doc.user = user
    doc.branch = branch
    doc.is_default = 1
    doc.insert(ignore_permissions=True)
