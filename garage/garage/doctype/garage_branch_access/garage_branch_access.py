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

        self._sync_default_flag()

    def after_insert(self) -> None:
        _clear_branch_cache()

    def on_update(self) -> None:
        _clear_branch_cache()

    def on_trash(self) -> None:
        _clear_branch_cache()


    def _sync_default_flag(self) -> None:
        if not self.user:
            return

        defaults = frappe.get_all(
            "Garage Branch Access",
            filters={
                "user": self.user,
                "is_default": 1,
                "name": ("!=", self.name) if self.name else ("!=", ""),
            },
            pluck="name",
        )

        if self.is_default:
            changed = False
            for other in defaults:
                frappe.db.set_value("Garage Branch Access", other, "is_default", 0, update_modified=False)
                changed = True
            if changed:
                _clear_branch_cache()
            return

        if defaults:
            return

        # No other default configured; automatically make the current record default.
        self.is_default = 1


def _clear_branch_cache() -> None:
    try:
        from garage.api import portal

        portal._allowed_branches.cache_clear()
        portal._default_branch.cache_clear()
        portal._branch_access_has_default_flag.cache_clear()
    except Exception:
        pass
