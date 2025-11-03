"""DocType controller for Garage Branch Access."""

from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe import _


class GarageBranchAccess(Document):
    """Validate unique branch-user mapping and normalise data."""

    def validate(self) -> None:
        self.branch = (self.branch or "").strip()
        self.user = (self.user or "").strip()

        if not self.branch or not self.user:
            return

        exists = frappe.db.exists(
            "Garage Branch Access",
            {
                "branch": self.branch,
                "user": self.user,
                "name": ("!=", self.name) if self.name else None,
            },
        )
        if exists:
            frappe.throw(
                _("Pengguna {user} sudah memiliki akses ke cabang {branch}.").format(
                    user=self.user,
                    branch=self.branch,
                )
            )

    def after_insert(self) -> None:
        _clear_branch_cache()

    def on_update(self) -> None:
        _clear_branch_cache()

    def on_trash(self) -> None:
        _clear_branch_cache()


def _clear_branch_cache() -> None:
    try:
        from garage.api import portal

        portal._allowed_branches.cache_clear()
    except Exception:
        pass
