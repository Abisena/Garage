"""Dataclasses and enums describing the garage workflow entities."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional


class Role(str, Enum):
    """Roles used by the simplified access control list."""

    SERVICE_ADVISOR = "service_advisor"
    TECHNICIAN = "technician"
    INVENTORY_CONTROLLER = "inventory_controller"
    CASHIER = "cashier"
    MANAGER = "manager"


class ServiceType(str, Enum):
    SERVICE = "service"
    REPAIR = "repair"


class BookingStatus(str, Enum):
    OPEN = "open"
    INSPECTED = "inspected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class JobCardStatus(str, Enum):
    INSPECTION = "inspection"
    ESTIMATED = "estimated"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    CANCELLED = "cancelled"
    IN_PROGRESS = "in_progress"
    QUALITY_CHECK = "quality_check"
    COMPLETED = "completed"
    CLOSED = "closed"


class WorkOrderStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"


class PurchaseOrderStatus(str, Enum):
    DRAFT = "draft"
    ORDERED = "ordered"
    RECEIVED = "received"
    CLOSED = "closed"


class SalesOrderStatus(str, Enum):
    DRAFT = "draft"
    RESERVED = "reserved"
    DELIVERED = "delivered"
    INVOICED = "invoiced"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PAID = "paid"
    OVERDUE = "overdue"


class PaymentMethod(str, Enum):
    CASH = "cash"
    TRANSFER = "transfer"
    CREDIT = "credit"


@dataclass(slots=True)
class User:
    user_id: str
    full_name: str
    role: Role


@dataclass(slots=True)
class AuditLogEntry:
    timestamp: datetime
    user_id: str
    action: str
    reference_id: str
    details: Dict[str, object]


@dataclass(slots=True)
class ServiceBooking:
    booking_id: str
    customer_name: str
    vehicle_registration: str
    service_type: ServiceType
    status: BookingStatus = BookingStatus.OPEN
    notes: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    inspection_notes: Optional[str] = None


@dataclass(slots=True)
class JobCard:
    job_card_id: str
    booking_id: str
    technician: str
    status: JobCardStatus = JobCardStatus.INSPECTION
    estimated_labor_hours: float = 0.0
    estimated_parts_cost: float = 0.0
    approval_timestamp: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    progress_notes: List[str] = field(default_factory=list)


@dataclass(slots=True)
class WorkOrder:
    work_order_id: str
    job_card_id: str
    tasks: List[str]
    status: WorkOrderStatus = WorkOrderStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass(slots=True)
class PurchaseOrder:
    purchase_order_id: str
    source_reference: str
    items: Dict[str, int]
    status: PurchaseOrderStatus = PurchaseOrderStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)
    received_at: Optional[datetime] = None


@dataclass(slots=True)
class StockItem:
    item_code: str
    description: str
    quantity_on_hand: int = 0
    reserved: int = 0
    reorder_level: int = 0

    @property
    def available(self) -> int:
        return self.quantity_on_hand - self.reserved


@dataclass(slots=True)
class StockMovement:
    movement_id: str
    item_code: str
    quantity: int
    reason: str
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class SalesOrder:
    sales_order_id: str
    customer_name: str
    items: Dict[str, int]
    status: SalesOrderStatus = SalesOrderStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class DeliveryNote:
    delivery_note_id: str
    sales_order_id: str
    items: Dict[str, int]
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class SalesInvoice:
    invoice_id: str
    source_reference: str
    amount: float
    status: InvoiceStatus = InvoiceStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class PaymentRecord:
    payment_id: str
    invoice_id: str
    method: PaymentMethod
    amount: float
    received_at: datetime = field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
