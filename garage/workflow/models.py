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


class InspectionSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class QualityResult(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"


class PaymentTermStatus(str, Enum):
    ACTIVE = "active"
    FOLLOWED_UP = "followed_up"
    SETTLED = "settled"
    ESCALATED = "escalated"


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
class Customer:
    customer_id: str
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class Vehicle:
    vehicle_id: str
    customer_id: str
    registration: str
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vin: Optional[str] = None
    color: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class ServiceBooking:
    booking_id: str
    customer_id: str
    vehicle_id: str
    service_type: ServiceType
    concern: Optional[str] = None
    status: BookingStatus = BookingStatus.OPEN
    notes: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    inspection_id: Optional[str] = None


@dataclass(slots=True)
class InspectionReport:
    inspection_id: str
    booking_id: str
    advisor_id: str
    notes: str
    severity: InspectionSeverity
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class EstimateLine:
    description: str
    quantity: float
    unit_price: float
    item_code: Optional[str] = None

    @property
    def total(self) -> float:
        return self.quantity * self.unit_price


@dataclass(slots=True)
class Estimate:
    estimate_id: str
    job_card_id: str
    advisor_id: str
    labor_hours: float
    labor_rate: float
    lines: List[EstimateLine] = field(default_factory=list)
    additional_costs: float = 0.0
    notes: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def parts_total(self) -> float:
        return sum(line.total for line in self.lines)

    @property
    def labor_total(self) -> float:
        return self.labor_hours * self.labor_rate

    @property
    def grand_total(self) -> float:
        return self.parts_total + self.labor_total + self.additional_costs


@dataclass(slots=True)
class JobCard:
    job_card_id: str
    booking_id: str
    technician: str
    status: JobCardStatus = JobCardStatus.INSPECTION
    inspection_id: Optional[str] = None
    estimate_id: Optional[str] = None
    approval_timestamp: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    quality_result: QualityResult = QualityResult.PENDING
    progress_notes: List[str] = field(default_factory=list)
    completed_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None


@dataclass(slots=True)
class WorkOrder:
    work_order_id: str
    job_card_id: str
    tasks: List[str]
    required_parts: Dict[str, int] = field(default_factory=dict)
    issued_parts: Dict[str, int] = field(default_factory=dict)
    status: WorkOrderStatus = WorkOrderStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    quality_notes: List[str] = field(default_factory=list)


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
    uom: str = "pcs"

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
class StockEntry:
    entry_id: str
    purchase_order_id: str
    items: Dict[str, int]
    posted_by: str
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
    currency: str = "IDR"
    status: InvoiceStatus = InvoiceStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class PaymentRecord:
    payment_id: str
    invoice_id: str
    method: PaymentMethod
    amount: float
    received_by: str
    received_at: datetime = field(default_factory=datetime.utcnow)
    notes: Optional[str] = None


@dataclass(slots=True)
class PaymentTerm:
    term_id: str
    invoice_id: str
    due_date: datetime
    amount: float
    status: PaymentTermStatus = PaymentTermStatus.ACTIVE
    notes: Optional[str] = None


@dataclass(slots=True)
class ReceivableFollowUp:
    follow_up_id: str
    invoice_id: str
    contact_person: str
    method: str
    notes: str
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class ReceiptDocument:
    receipt_id: str
    invoice_id: str
    payment_id: str
    generated_by: str
    generated_at: datetime = field(default_factory=datetime.utcnow)
    content: str = ""
