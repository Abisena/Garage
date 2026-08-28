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

    def on_update(self) -> None:  # pragma: no cover - frappe lifecycle hook
        """Raise/resolve a Garage Stock Alert the moment stock actually
        changes, instead of waiting for a scheduled sweep (explicit
        request: alert as soon as a part touches its minimum, not up to an
        hour later). Only runs the check when stock_qty or reorder_level
        was actually part of this save - most saves touch neither.
        """
        if self.status != "Active":
            return
        if not (self.has_value_changed("stock_qty") or self.has_value_changed("reorder_level")):
            return

        from garage.garage.doctype.garage_stock_alert.garage_stock_alert import (
            _evaluate_part_stock,
            _notify_stock_alerts,
        )

        result = _evaluate_part_stock(self.name, self.stock_qty, self.reorder_level)
        if result and result[0] == "created":
            _notify_stock_alerts([result[1]])
