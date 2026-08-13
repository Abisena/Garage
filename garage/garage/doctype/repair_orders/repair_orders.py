"""Garage Service Order DocType controller wrapper."""

from __future__ import annotations

from garage.garage.doctype.garage_service_order.garage_service_order import (
    GarageServiceOrder,
    derive_part_charge_status,
    get_bundle_items,
    get_bundle_items_for_service_type,
)


class RepairOrders(GarageServiceOrder):
    """Expose the Garage Service Order controller using the expected module path."""

