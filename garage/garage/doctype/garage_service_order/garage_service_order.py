"""Garage DocType controller for Garage Service Order."""

from __future__ import annotations

from typing import Iterable, Optional

from frappe.model.document import Document

from garage.utils import naming


PART_PENDING_STATUSES = {
    "draft",
    "request",
    "pending",
    "pending check",
    "available",
    "to order",
    "ordered",
    "in transit",
    "backordered",
}
PART_COMPLETED_STATUSES = {"received", "issued", "approved"}
PART_REJECTED_STATUSES = {"rejected"}
PART_CANCELLED_STATUSES = {"cancelled"}


class GarageServiceOrder(Document):
    """Ensure branch-prefixed naming for service orders and derived statuses."""

    def autoname(self) -> None:
        naming.make_branch_autoname(self, "SPK", include_year=True)

    def validate(self) -> None:
        self._update_part_charge_status()

    def _update_part_charge_status(self) -> None:
        """Derive the aggregated sparepart/material charge status."""

        computed = self._compute_part_charge_status()
        if computed in {"Partial Approve", "Rejected"}:
            self.part_charge_status = computed
        elif not getattr(self, "part_charge_status", None):
            self.part_charge_status = computed

    def _compute_part_charge_status(self) -> str:
        rows: Iterable[object] = getattr(self, "required_parts", []) or []
        statuses = []
        for row in rows:
            status = getattr(row, "stock_status", None)
            if not status and hasattr(row, "as_dict"):
                status = row.as_dict().get("stock_status")
            status_str = (status or "").strip()
            if status_str:
                statuses.append(status_str)

        return derive_part_charge_status(statuses, getattr(self, "part_charge_status", None))


def derive_part_charge_status(
    statuses: Iterable[str],
    base_status: Optional[str] = None,
) -> str:
    collected = [status.strip() for status in statuses if status]
    if not collected:
        return base_status or "Not Started"

    normalized = [status.lower() for status in collected]
    has_active = any(status not in PART_REJECTED_STATUSES | PART_CANCELLED_STATUSES for status in normalized)
    has_rejected = any(status in PART_REJECTED_STATUSES for status in normalized)
    has_cancelled = any(status in PART_CANCELLED_STATUSES for status in normalized)

    if has_rejected and has_active:
        return "Partial Approve"
    if has_rejected and not has_active:
        return "Rejected"
    if has_cancelled and not has_active:
        return "Rejected"
    if any(status in PART_PENDING_STATUSES for status in normalized):
        return "Pending"
    if all(status in PART_COMPLETED_STATUSES or status in PART_CANCELLED_STATUSES for status in normalized):
        return "Approved"
    if has_active:
        return "Pending"
    return base_status or "Not Started"
