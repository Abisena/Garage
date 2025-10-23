"""Portal API surface grouped by domain modules."""
from __future__ import annotations

from .common import ALLOWED_DOCS, DOC_TYPES
from .customers import register_customer_vehicle
from .dashboard import portal_bootstrap
from .finance import (
    create_payment_entry,
    create_receipt_document,
    create_sales_invoice,
    update_payment_entry,
    update_receipt_document,
    update_sales_invoice,
)
from .procurement import (
    create_procurement_order,
    create_spare_part_order,
    create_stock_movement,
    update_procurement_order,
    update_spare_part_order,
    update_stock_movement,
)
from .service_orders import (
    append_service_progress,
    create_service_order,
    update_service_order,
)

__all__ = [
    "ALLOWED_DOCS",
    "DOC_TYPES",
    "portal_bootstrap",
    "register_customer_vehicle",
    "create_service_order",
    "update_service_order",
    "append_service_progress",
    "create_spare_part_order",
    "update_spare_part_order",
    "create_procurement_order",
    "update_procurement_order",
    "create_stock_movement",
    "update_stock_movement",
    "create_sales_invoice",
    "update_sales_invoice",
    "create_payment_entry",
    "update_payment_entry",
    "create_receipt_document",
    "update_receipt_document",
]
