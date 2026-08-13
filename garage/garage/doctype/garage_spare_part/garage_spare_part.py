"""DocType controller for Garage Spare Part."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


ALLOWED_CATEGORIES = {"Spare Part", "Gudang Bahan"}


class GarageSparePart(Document):
    """Basic controller for the Garage Spare Part master."""

    def validate(self) -> None:  # pragma: no cover - frappe lifecycle hook
        """Ensure category selection is always one of the predefined buckets."""

        if not self.category:
            self.category = "Spare Part"
            return

        if self.category not in ALLOWED_CATEGORIES:
            frappe.throw(
                _("Kategori sparepart tidak valid. Pilih 'Spare Part' atau 'Gudang Bahan'.")
            )
