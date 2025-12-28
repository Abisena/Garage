"""DocType controller for Garage Division Request."""
from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime, nowdate
from frappe.utils import get_fullname

    

class GarageDivisionRequest(Document):
    """Manage validation and defaults for inter-division approval documents."""

    def before_insert(self) -> None:
        self._apply_defaults()

    def validate(self) -> None:
        self._apply_defaults()

        if not self.items:
            frappe.throw(_("Tambahkan minimal satu item pada permintaan."))

        if (
            self.requesting_division
            and self.target_division
            and self.requesting_division == self.target_division
        ):
            frappe.throw(_("Divisi pemohon dan divisi tujuan tidak boleh sama."))

        if self.requested_by and not self.requested_by_full_name:
            self.requested_by_full_name = self._resolve_full_name(self.requested_by)

        if not self.request_scope and self.reference_type and self.reference_name:
            self.request_scope = _("{0} {1}").format(self.reference_type, self.reference_name)

        self._sync_signature_timestamps()

    def _apply_defaults(self) -> None:
        if not self.request_date:
            self.request_date = nowdate()

        if not self.approval_status:
            self.approval_status = "Pending Approval"

        if not self.requested_by and frappe.session.user != "Guest":
            self.requested_by = frappe.session.user

        if not self.request_title:
            base = f"{self.requesting_division or _('Divisi')} → {self.target_division or _('Divisi')}"
            if self.reference_name:
                base = f"{base} - {self.reference_name}"
            self.request_title = base

        if not self.request_purpose and self.reference_type == "Repair Orders" and self.reference_name:
            self.request_purpose = _(
                "Pemenuhan kebutuhan sparepart untuk service order {0}."
            ).format(self.reference_name)

        if not self.request_scope and (self.requesting_division or self.target_division):
            self.request_scope = _(
                "{0} → {1}"
            ).format(self.requesting_division or _("Divisi"), self.target_division or _("Divisi"))

        if not self.requested_by_full_name:
            candidate = self.requested_by or (
                None if frappe.session.user == "Guest" else frappe.session.user
            )
            self.requested_by_full_name = self._resolve_full_name(candidate)

    def _sync_signature_timestamps(self) -> None:
        if not self.requesting_head_signature:
            self.requesting_head_signed_on = None
        elif not self.requesting_head_signed_on:
            self.requesting_head_signed_on = now_datetime()

        if not self.target_head_signature:
            self.target_head_signed_on = None
        elif not self.target_head_signed_on:
            self.target_head_signed_on = now_datetime()

    def _resolve_full_name(self, user: str | None) -> str:
        if not user:
            return ""
        try:
            return get_fullname(user)
        except Exception:
            return frappe.db.get_value("User", user, "full_name") or ""

