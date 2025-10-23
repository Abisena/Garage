"""High fidelity implementation of the secure garage workflow."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from .exceptions import InvalidTransitionError, PermissionError, ValidationError
from .models import (
    AuditLogEntry,
    BookingStatus,
    Customer,
    DeliveryNote,
    Estimate,
    EstimateLine,
    InspectionReport,
    InspectionSeverity,
    InvoiceStatus,
    JobCard,
    JobCardStatus,
    PaymentMethod,
    PaymentRecord,
    PaymentTerm,
    PaymentTermStatus,
    PurchaseOrder,
    PurchaseOrderStatus,
    QualityResult,
    ReceiptDocument,
    ReceivableFollowUp,
    Role,
    SalesInvoice,
    SalesOrder,
    SalesOrderStatus,
    ServiceBooking,
    ServiceType,
    StockEntry,
    StockItem,
    StockMovement,
    User,
    Vehicle,
    WorkOrder,
    WorkOrderStatus,
)


def _generate_id(prefix: str) -> str:
    from uuid import uuid4

    return f"{prefix}-{uuid4().hex[:8]}"


class AccessController:
    """Simple role-based access controller."""

    _DEFAULT_ACL: Dict[Role, Tuple[str, ...]] = {
        Role.MANAGER: (
            "register_user",
            "register_customer",
            "register_vehicle",
            "register_inventory_item",
            "adjust_inventory",
            "create_service_booking",
            "record_inspection",
            "create_job_card",
            "create_estimate",
            "record_customer_decision",
            "create_work_order",
            "prepare_work_order",
            "check_work_order_stock",
            "create_purchase_order",
            "receive_purchase_order",
            "create_stock_entry",
            "issue_materials",
            "start_work",
            "update_job_progress",
            "complete_work",
            "perform_quality_check",
            "complete_job_card",
            "create_sales_order",
            "check_sales_order_stock",
            "reserve_sales_stock",
            "create_delivery_note",
            "generate_sales_invoice",
            "create_payment_term",
            "record_payment",
            "follow_up_receivable",
            "print_receipt",
            "close_customer_interaction",
            "generate_reports",
            "evaluate_reorder_levels",
        ),
        Role.SERVICE_ADVISOR: (
            "register_customer",
            "register_vehicle",
            "create_service_booking",
            "record_inspection",
            "create_job_card",
            "create_estimate",
            "record_customer_decision",
            "create_work_order",
            "prepare_work_order",
            "generate_sales_invoice",
        ),
        Role.TECHNICIAN: (
            "start_work",
            "update_job_progress",
            "complete_work",
            "perform_quality_check",
        ),
        Role.INVENTORY_CONTROLLER: (
            "register_inventory_item",
            "adjust_inventory",
            "check_work_order_stock",
            "check_sales_order_stock",
            "create_purchase_order",
            "receive_purchase_order",
            "create_stock_entry",
            "issue_materials",
            "reserve_sales_stock",
            "create_delivery_note",
            "evaluate_reorder_levels",
        ),
        Role.CASHIER: (
            "generate_sales_invoice",
            "create_payment_term",
            "record_payment",
            "follow_up_receivable",
            "print_receipt",
            "close_customer_interaction",
        ),
    }

    def __init__(self, acl: Optional[Dict[Role, Tuple[str, ...]]] = None) -> None:
        self._acl = acl or self._DEFAULT_ACL

    def require(self, user: User, action: str) -> None:
        if not self.is_allowed(user, action):
            raise PermissionError(f"{user.full_name} is not allowed to perform '{action}'")

    def is_allowed(self, user: User, action: str) -> bool:
        return action in self._acl.get(user.role, ())


class InMemoryStore:
    """Holds workflow data in memory."""

    def __init__(self) -> None:
        self.users: Dict[str, User] = {}
        self.customers: Dict[str, Customer] = {}
        self.vehicles: Dict[str, Vehicle] = {}
        self.bookings: Dict[str, ServiceBooking] = {}
        self.inspections: Dict[str, InspectionReport] = {}
        self.estimates: Dict[str, Estimate] = {}
        self.job_cards: Dict[str, JobCard] = {}
        self.work_orders: Dict[str, WorkOrder] = {}
        self.purchase_orders: Dict[str, PurchaseOrder] = {}
        self.stock_entries: Dict[str, StockEntry] = {}
        self.inventory: Dict[str, StockItem] = {}
        self.stock_movements: List[StockMovement] = []
        self.sales_orders: Dict[str, SalesOrder] = {}
        self.delivery_notes: Dict[str, DeliveryNote] = {}
        self.invoices: Dict[str, SalesInvoice] = {}
        self.payments: Dict[str, PaymentRecord] = {}
        self.payment_terms: Dict[str, PaymentTerm] = {}
        self.receivable_followups: Dict[str, List[ReceivableFollowUp]] = {}
        self.receipts: Dict[str, ReceiptDocument] = {}
        self.audit_log: List[AuditLogEntry] = []


class GarageWorkflowEngine:
    """Encapsulates business logic for the complete garage workflow."""

    def __init__(self, store: Optional[InMemoryStore] = None, access_controller: Optional[AccessController] = None) -> None:
        self.store = store or InMemoryStore()
        self.access = access_controller or AccessController()

    # ------------------------------------------------------------------
    # Security & auditing helpers
    # ------------------------------------------------------------------

    def register_user(self, user: User, acting_user: Optional[User] = None) -> None:
        if acting_user:
            self.access.require(acting_user, "register_user")
        self.store.users[user.user_id] = user
        self._log_action(acting_user or user, "register_user", user.user_id, asdict(user))

    def register_customer(self, user: User, full_name: str, phone: Optional[str] = None, email: Optional[str] = None) -> Customer:
        self.access.require(user, "register_customer")
        if not full_name:
            raise ValidationError("Customer name is required")
        customer = Customer(customer_id=_generate_id("CUS"), full_name=full_name, phone=phone, email=email)
        self.store.customers[customer.customer_id] = customer
        self._log_action(user, "register_customer", customer.customer_id, asdict(customer))
        return customer

    def register_vehicle(
        self,
        user: User,
        customer_id: str,
        registration: str,
        make: Optional[str] = None,
        model: Optional[str] = None,
        year: Optional[int] = None,
        vin: Optional[str] = None,
        color: Optional[str] = None,
    ) -> Vehicle:
        self.access.require(user, "register_vehicle")
        customer = self._get_customer(customer_id)
        if not registration:
            raise ValidationError("Vehicle registration is required")
        if any(vehicle.registration == registration for vehicle in self.store.vehicles.values()):
            raise ValidationError(f"Vehicle with registration {registration} already registered")
        vehicle = Vehicle(
            vehicle_id=_generate_id("VEH"),
            customer_id=customer.customer_id,
            registration=registration,
            make=make,
            model=model,
            year=year,
            vin=vin,
            color=color,
        )
        self.store.vehicles[vehicle.vehicle_id] = vehicle
        self._log_action(user, "register_vehicle", vehicle.vehicle_id, asdict(vehicle))
        return vehicle

    def register_inventory_item(
        self,
        user: User,
        item_code: str,
        description: str,
        quantity: int = 0,
        reorder_level: int = 0,
        uom: str = "pcs",
    ) -> StockItem:
        self.access.require(user, "register_inventory_item")
        if quantity < 0 or reorder_level < 0:
            raise ValidationError("Quantity and reorder level must be non-negative")
        if item_code in self.store.inventory:
            raise ValidationError(f"Item {item_code} already exists")
        stock_item = StockItem(
            item_code=item_code,
            description=description,
            quantity_on_hand=quantity,
            reorder_level=reorder_level,
            uom=uom,
        )
        self.store.inventory[item_code] = stock_item
        self._log_action(user, "register_inventory_item", item_code, asdict(stock_item))
        return stock_item

    def adjust_inventory(self, user: User, item_code: str, quantity_delta: int, reason: str) -> StockItem:
        self.access.require(user, "adjust_inventory")
        stock_item = self._get_stock_item(item_code)
        if stock_item.quantity_on_hand + quantity_delta < 0:
            raise ValidationError("Inventory cannot go negative")
        stock_item.quantity_on_hand += quantity_delta
        movement = StockMovement(movement_id=_generate_id("MOVE"), item_code=item_code, quantity=quantity_delta, reason=reason)
        self.store.stock_movements.append(movement)
        self._log_action(user, "adjust_inventory", item_code, asdict(movement))
        return stock_item

    def _log_action(self, user: User, action: str, reference_id: str, details: Dict[str, object]) -> None:
        entry = AuditLogEntry(timestamp=datetime.utcnow(), user_id=user.user_id, action=action, reference_id=reference_id, details=details)
        self.store.audit_log.append(entry)

    # ------------------------------------------------------------------
    # Service bookings & inspections
    # ------------------------------------------------------------------

    def create_service_booking(
        self,
        user: User,
        customer_id: str,
        vehicle_id: str,
        service_type: ServiceType,
        concern: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> ServiceBooking:
        self.access.require(user, "create_service_booking")
        customer = self._get_customer(customer_id)
        vehicle = self._get_vehicle(vehicle_id)
        if vehicle.customer_id != customer.customer_id:
            raise ValidationError("Vehicle does not belong to the selected customer")
        booking = ServiceBooking(
            booking_id=_generate_id("BOOK"),
            customer_id=customer.customer_id,
            vehicle_id=vehicle.vehicle_id,
            service_type=service_type,
            concern=concern,
            notes=notes,
        )
        self.store.bookings[booking.booking_id] = booking
        self._log_action(user, "create_service_booking", booking.booking_id, asdict(booking))
        return booking

    def record_inspection(
        self,
        user: User,
        booking_id: str,
        advisor: User,
        notes: str,
        severity: InspectionSeverity = InspectionSeverity.MEDIUM,
    ) -> InspectionReport:
        self.access.require(user, "record_inspection")
        booking = self._get_booking(booking_id)
        if booking.status == BookingStatus.CANCELLED:
            raise InvalidTransitionError("Cannot inspect a cancelled booking")
        if not notes:
            raise ValidationError("Inspection notes are required")
        report = InspectionReport(
            inspection_id=_generate_id("INSP"),
            booking_id=booking.booking_id,
            advisor_id=advisor.user_id,
            notes=notes,
            severity=severity,
        )
        booking.status = BookingStatus.INSPECTED
        booking.inspection_id = report.inspection_id
        self.store.inspections[report.inspection_id] = report
        self._log_action(user, "record_inspection", report.inspection_id, asdict(report))
        return report

    def create_job_card(self, user: User, booking_id: str, technician: User) -> JobCard:
        self.access.require(user, "create_job_card")
        booking = self._get_booking(booking_id)
        if booking.status != BookingStatus.INSPECTED:
            raise InvalidTransitionError("Booking must be inspected before creating a job card")
        job_card = JobCard(
            job_card_id=_generate_id("JOB"),
            booking_id=booking.booking_id,
            technician=technician.user_id,
            inspection_id=booking.inspection_id,
        )
        self.store.job_cards[job_card.job_card_id] = job_card
        self._log_action(user, "create_job_card", job_card.job_card_id, asdict(job_card))
        return job_card

    def create_estimate(
        self,
        user: User,
        job_card_id: str,
        advisor: User,
        labor_hours: float,
        labor_rate: float,
        lines: Optional[Sequence[EstimateLine | Dict[str, object]]] = None,
        additional_costs: float = 0.0,
        notes: Optional[str] = None,
    ) -> Estimate:
        self.access.require(user, "create_estimate")
        job_card = self._get_job_card(job_card_id)
        if job_card.status not in {JobCardStatus.INSPECTION, JobCardStatus.ESTIMATED, JobCardStatus.AWAITING_APPROVAL}:
            raise InvalidTransitionError("Estimate can only be created after inspection and before approval")
        if labor_hours < 0 or labor_rate < 0 or additional_costs < 0:
            raise ValidationError("Labor hours, rate, and additional costs must be non-negative")
        estimate_lines = self._coerce_estimate_lines(lines or [])
        estimate = Estimate(
            estimate_id=_generate_id("EST"),
            job_card_id=job_card.job_card_id,
            advisor_id=advisor.user_id,
            labor_hours=labor_hours,
            labor_rate=labor_rate,
            lines=estimate_lines,
            additional_costs=additional_costs,
            notes=notes,
        )
        job_card.status = JobCardStatus.AWAITING_APPROVAL
        job_card.estimate_id = estimate.estimate_id
        self.store.estimates[estimate.estimate_id] = estimate
        self._log_action(user, "create_estimate", estimate.estimate_id, asdict(estimate))
        return estimate

    def record_customer_decision(
        self,
        user: User,
        job_card_id: str,
        approved: bool,
        reason: Optional[str] = None,
    ) -> JobCard:
        self.access.require(user, "record_customer_decision")
        job_card = self._get_job_card(job_card_id)
        if job_card.status != JobCardStatus.AWAITING_APPROVAL:
            raise InvalidTransitionError("Customer decision can only be recorded when awaiting approval")
        booking = self._get_booking(job_card.booking_id)
        if not approved:
            job_card.status = JobCardStatus.CANCELLED
            job_card.cancellation_reason = reason or "Customer rejected estimate"
            booking.status = BookingStatus.CANCELLED
            self._log_action(user, "cancel_job_card", job_card.job_card_id, asdict(job_card))
            return job_card
        job_card.status = JobCardStatus.APPROVED
        job_card.approval_timestamp = datetime.utcnow()
        self._log_action(user, "approve_job_card", job_card.job_card_id, {})
        return job_card

    def create_work_order(self, user: User, job_card_id: str) -> WorkOrder:
        self.access.require(user, "create_work_order")
        job_card = self._get_job_card(job_card_id)
        if job_card.status != JobCardStatus.APPROVED:
            raise InvalidTransitionError("Work order can only be created after job card approval")
        for existing in self.store.work_orders.values():
            if existing.job_card_id == job_card.job_card_id:
                raise InvalidTransitionError("Work order already exists for this job card")
        work_order = WorkOrder(work_order_id=_generate_id("WORK"), job_card_id=job_card.job_card_id, tasks=[])
        self.store.work_orders[work_order.work_order_id] = work_order
        self._log_action(
            user,
            "create_work_order",
            work_order.work_order_id,
            {"job_card_id": job_card.job_card_id},
        )
        return work_order

    def prepare_work_order(
        self,
        user: User,
        work_order_id: str,
        tasks: Optional[Iterable[str]] = None,
        required_parts: Optional[Dict[str, int]] = None,
    ) -> WorkOrder:
        self.access.require(user, "prepare_work_order")
        work_order = self._get_work_order(work_order_id)
        if work_order.status not in {WorkOrderStatus.PENDING, WorkOrderStatus.ON_HOLD}:
            raise InvalidTransitionError("Work order must be pending before it can be prepared")
        work_order.tasks = list(tasks or work_order.tasks or ["General service"])
        if required_parts is not None:
            validated_parts: Dict[str, int] = {}
            for item_code, qty in required_parts.items():
                if qty <= 0:
                    raise ValidationError("Required part quantity must be positive")
                self._ensure_stock_placeholder(item_code)
                validated_parts[item_code] = qty
            work_order.required_parts = validated_parts
        self._log_action(user, "prepare_work_order", work_order.work_order_id, {
            "tasks": work_order.tasks,
            "required_parts": work_order.required_parts,
        })
        return work_order

    def check_work_order_stock(self, user: User, work_order_id: str) -> Dict[str, int]:
        self.access.require(user, "check_work_order_stock")
        work_order = self._get_work_order(work_order_id)
        shortages: Dict[str, int] = {}
        for item_code, qty in work_order.required_parts.items():
            stock_item = self._get_stock_item(item_code)
            if stock_item.available < qty:
                shortages[item_code] = qty - stock_item.available
        self._log_action(user, "check_work_order_stock", work_order.work_order_id, {"shortages": shortages})
        return shortages

    # ------------------------------------------------------------------
    # Purchase orders & stock intake
    # ------------------------------------------------------------------

    def create_purchase_order(self, user: User, source_reference: str, items: Dict[str, int]) -> PurchaseOrder:
        self.access.require(user, "create_purchase_order")
        if not items:
            raise ValidationError("Purchase order requires at least one item")
        normalised_items: Dict[str, int] = {}
        for item_code, qty in items.items():
            if qty <= 0:
                raise ValidationError("Purchase quantity must be positive")
            self._ensure_stock_placeholder(item_code)
            normalised_items[item_code] = qty
        purchase_order = PurchaseOrder(
            purchase_order_id=_generate_id("PO"),
            source_reference=source_reference,
            items=normalised_items,
            status=PurchaseOrderStatus.ORDERED,
        )
        self.store.purchase_orders[purchase_order.purchase_order_id] = purchase_order
        self._log_action(user, "create_purchase_order", purchase_order.purchase_order_id, asdict(purchase_order))
        return purchase_order

    def receive_purchase_order(self, user: User, purchase_order_id: str) -> PurchaseOrder:
        self.access.require(user, "receive_purchase_order")
        purchase_order = self._get_purchase_order(purchase_order_id)
        if purchase_order.status != PurchaseOrderStatus.ORDERED:
            raise InvalidTransitionError("Only ordered purchase orders can be received")
        purchase_order.status = PurchaseOrderStatus.RECEIVED
        purchase_order.received_at = datetime.utcnow()
        self._log_action(user, "receive_purchase_order", purchase_order.purchase_order_id, asdict(purchase_order))
        return purchase_order

    def create_stock_entry(self, user: User, purchase_order_id: str) -> StockEntry:
        self.access.require(user, "create_stock_entry")
        purchase_order = self._get_purchase_order(purchase_order_id)
        if purchase_order.status != PurchaseOrderStatus.RECEIVED:
            raise InvalidTransitionError("Stock entry can only be created after goods receipt")
        entry = StockEntry(
            entry_id=_generate_id("STK"),
            purchase_order_id=purchase_order.purchase_order_id,
            items=dict(purchase_order.items),
            posted_by=user.user_id,
        )
        for item_code, qty in entry.items.items():
            stock_item = self._ensure_stock_placeholder(item_code)
            stock_item.quantity_on_hand += qty
            movement = StockMovement(
                movement_id=_generate_id("MOVE"),
                item_code=item_code,
                quantity=qty,
                reason=f"Stock entry {entry.entry_id} for {purchase_order.purchase_order_id}",
            )
            self.store.stock_movements.append(movement)
        purchase_order.status = PurchaseOrderStatus.CLOSED
        self.store.stock_entries[entry.entry_id] = entry
        self._log_action(user, "create_stock_entry", entry.entry_id, asdict(entry))
        return entry

    def issue_materials(self, user: User, job_card_id: str, items: Dict[str, int]) -> None:
        self.access.require(user, "issue_materials")
        job_card = self._get_job_card(job_card_id)
        if job_card.status not in {JobCardStatus.APPROVED, JobCardStatus.IN_PROGRESS, JobCardStatus.QUALITY_CHECK}:
            raise InvalidTransitionError("Materials can only be issued for approved or active jobs")
        work_order = self._get_work_order_by_job(job_card_id)
        for item_code, qty in items.items():
            if qty <= 0:
                raise ValidationError("Issued quantity must be positive")
            stock_item = self._get_stock_item(item_code)
            if stock_item.available < qty:
                raise ValidationError(f"Insufficient stock for {item_code}")
            stock_item.quantity_on_hand -= qty
            work_order.issued_parts[item_code] = work_order.issued_parts.get(item_code, 0) + qty
            movement = StockMovement(
                movement_id=_generate_id("MOVE"),
                item_code=item_code,
                quantity=-qty,
                reason=f"Material issue for {job_card.job_card_id}",
            )
            self.store.stock_movements.append(movement)
        self._log_action(user, "issue_materials", job_card.job_card_id, {"items": items})

    # ------------------------------------------------------------------
    # Work execution & quality control
    # ------------------------------------------------------------------

    def start_work(self, user: User, job_card_id: str) -> WorkOrder:
        self.access.require(user, "start_work")
        job_card = self._get_job_card(job_card_id)
        if job_card.status not in {JobCardStatus.APPROVED, JobCardStatus.IN_PROGRESS}:
            raise InvalidTransitionError("Job must be approved before work can start")
        work_order = self._get_work_order_by_job(job_card_id)
        pending_materials = {
            item_code: qty - work_order.issued_parts.get(item_code, 0)
            for item_code, qty in work_order.required_parts.items()
            if work_order.issued_parts.get(item_code, 0) < qty
        }
        if pending_materials:
            missing_list = ", ".join(f"{code} ({short})" for code, short in pending_materials.items())
            raise InvalidTransitionError(
                "Cannot start work before issuing required materials: " + missing_list
            )
        work_order.status = WorkOrderStatus.IN_PROGRESS
        work_order.started_at = datetime.utcnow()
        job_card.status = JobCardStatus.IN_PROGRESS
        self._log_action(user, "start_work", work_order.work_order_id, {"job_card": job_card_id})
        return work_order

    def update_job_progress(self, user: User, job_card_id: str, note: str) -> JobCard:
        self.access.require(user, "update_job_progress")
        if not note:
            raise ValidationError("Progress note cannot be empty")
        job_card = self._get_job_card(job_card_id)
        if job_card.status not in {JobCardStatus.IN_PROGRESS, JobCardStatus.APPROVED}:
            raise InvalidTransitionError("Progress can only be updated while job is active")
        job_card.progress_notes.append(note)
        self._log_action(user, "update_job_progress", job_card.job_card_id, {"note": note})
        return job_card

    def complete_work(self, user: User, job_card_id: str) -> JobCard:
        self.access.require(user, "complete_work")
        job_card = self._get_job_card(job_card_id)
        if job_card.status != JobCardStatus.IN_PROGRESS:
            raise InvalidTransitionError("Only in-progress jobs can move to quality check")
        work_order = self._get_work_order_by_job(job_card_id)
        work_order.status = WorkOrderStatus.COMPLETED
        work_order.completed_at = datetime.utcnow()
        job_card.status = JobCardStatus.QUALITY_CHECK
        job_card.completed_at = datetime.utcnow()
        self._log_action(user, "complete_work", job_card.job_card_id, {"work_order": work_order.work_order_id})
        return job_card

    def perform_quality_check(self, user: User, job_card_id: str, passed: bool, notes: Optional[str] = None) -> JobCard:
        self.access.require(user, "perform_quality_check")
        job_card = self._get_job_card(job_card_id)
        if job_card.status != JobCardStatus.QUALITY_CHECK:
            raise InvalidTransitionError("Quality check can only be executed when job is awaiting QC")
        work_order = self._get_work_order_by_job(job_card_id)
        if passed:
            job_card.quality_result = QualityResult.PASSED
            job_card.status = JobCardStatus.COMPLETED
            work_order.quality_notes.append(notes or "Quality check passed")
        else:
            job_card.quality_result = QualityResult.FAILED
            job_card.status = JobCardStatus.IN_PROGRESS
            work_order.status = WorkOrderStatus.ON_HOLD
            work_order.quality_notes.append(notes or "Rework required")
        self._log_action(
            user,
            "perform_quality_check",
            job_card.job_card_id,
            {"result": job_card.quality_result.value, "notes": work_order.quality_notes[-1]},
        )
        return job_card

    def complete_job_card(self, user: User, job_card_id: str) -> JobCard:
        self.access.require(user, "complete_job_card")
        job_card = self._get_job_card(job_card_id)
        if job_card.status != JobCardStatus.COMPLETED:
            raise InvalidTransitionError("Job card must pass quality control before completion")
        job_card.status = JobCardStatus.CLOSED
        job_card.closed_at = datetime.utcnow()
        booking = self._get_booking(job_card.booking_id)
        booking.status = BookingStatus.COMPLETED
        self._log_action(user, "complete_job_card", job_card.job_card_id, {"closed_at": job_card.closed_at.isoformat()})
        return job_card

    # ------------------------------------------------------------------
    # Counter sales flow
    # ------------------------------------------------------------------

    def create_sales_order(self, user: User, customer_name: str, items: Dict[str, int]) -> SalesOrder:
        self.access.require(user, "create_sales_order")
        if not customer_name:
            raise ValidationError("Customer name is required")
        if not items:
            raise ValidationError("Sales order requires at least one item")
        order_items: Dict[str, int] = {}
        for item_code, qty in items.items():
            if qty <= 0:
                raise ValidationError("Sales order quantities must be positive")
            self._ensure_stock_placeholder(item_code)
            order_items[item_code] = qty
        sales_order = SalesOrder(sales_order_id=_generate_id("SO"), customer_name=customer_name, items=order_items)
        self.store.sales_orders[sales_order.sales_order_id] = sales_order
        self._log_action(user, "create_sales_order", sales_order.sales_order_id, asdict(sales_order))
        return sales_order

    def check_sales_order_stock(self, user: User, sales_order_id: str) -> Dict[str, int]:
        self.access.require(user, "check_sales_order_stock")
        sales_order = self._get_sales_order(sales_order_id)
        shortages: Dict[str, int] = {}
        for item_code, qty in sales_order.items.items():
            stock_item = self._get_stock_item(item_code)
            if stock_item.available < qty:
                shortages[item_code] = qty - stock_item.available
        self._log_action(user, "check_sales_order_stock", sales_order.sales_order_id, {"shortages": shortages})
        return shortages

    def reserve_sales_stock(self, user: User, sales_order_id: str) -> Dict[str, int]:
        self.access.require(user, "reserve_sales_stock")
        sales_order = self._get_sales_order(sales_order_id)
        shortages: Dict[str, int] = {}
        for item_code, qty in sales_order.items.items():
            stock_item = self._get_stock_item(item_code)
            available = stock_item.available
            if available >= qty:
                stock_item.reserved += qty
            else:
                stock_item.reserved += available
                shortages[item_code] = qty - available
        sales_order.status = SalesOrderStatus.RESERVED if not shortages else SalesOrderStatus.DRAFT
        self._log_action(user, "reserve_sales_stock", sales_order.sales_order_id, {"shortages": shortages})
        return shortages

    def create_delivery_note(self, user: User, sales_order_id: str) -> DeliveryNote:
        self.access.require(user, "create_delivery_note")
        sales_order = self._get_sales_order(sales_order_id)
        if sales_order.status != SalesOrderStatus.RESERVED:
            raise InvalidTransitionError("Delivery note can only be created for reserved orders")
        for item_code, qty in sales_order.items.items():
            stock_item = self._get_stock_item(item_code)
            if stock_item.reserved < qty:
                raise ValidationError(f"Insufficient reserved stock for {item_code}")
            stock_item.reserved -= qty
            stock_item.quantity_on_hand -= qty
            movement = StockMovement(
                movement_id=_generate_id("MOVE"),
                item_code=item_code,
                quantity=-qty,
                reason=f"Delivery for sales order {sales_order.sales_order_id}",
            )
            self.store.stock_movements.append(movement)
        delivery_note = DeliveryNote(
            delivery_note_id=_generate_id("DN"),
            sales_order_id=sales_order.sales_order_id,
            items=dict(sales_order.items),
        )
        self.store.delivery_notes[delivery_note.delivery_note_id] = delivery_note
        sales_order.status = SalesOrderStatus.DELIVERED
        self._log_action(user, "create_delivery_note", delivery_note.delivery_note_id, asdict(delivery_note))
        return delivery_note

    # ------------------------------------------------------------------
    # Billing & payments
    # ------------------------------------------------------------------

    def generate_sales_invoice(
        self,
        user: User,
        source_reference: str,
        amount: float,
        currency: str = "IDR",
    ) -> SalesInvoice:
        self.access.require(user, "generate_sales_invoice")
        if amount <= 0:
            raise ValidationError("Invoice amount must be positive")
        job_card = self.store.job_cards.get(source_reference)
        if job_card and job_card.status != JobCardStatus.CLOSED:
            raise InvalidTransitionError("Job card must be closed before invoicing")
        sales_order = self.store.sales_orders.get(source_reference)
        if sales_order and sales_order.status != SalesOrderStatus.DELIVERED:
            raise InvalidTransitionError("Sales order must be delivered before invoicing")
        invoice = SalesInvoice(
            invoice_id=_generate_id("INV"),
            source_reference=source_reference,
            amount=amount,
            currency=currency,
            status=InvoiceStatus.SUBMITTED,
        )
        self.store.invoices[invoice.invoice_id] = invoice
        if source_reference in self.store.sales_orders:
            self.store.sales_orders[source_reference].status = SalesOrderStatus.INVOICED
        if source_reference in self.store.job_cards:
            self.store.job_cards[source_reference].progress_notes.append(f"Invoice {invoice.invoice_id} generated")
        self._log_action(user, "generate_sales_invoice", invoice.invoice_id, asdict(invoice))
        return invoice

    def create_payment_term(
        self,
        user: User,
        invoice_id: str,
        due_date: datetime,
        amount: float,
        notes: Optional[str] = None,
    ) -> PaymentTerm:
        self.access.require(user, "create_payment_term")
        invoice = self._get_invoice(invoice_id)
        if amount <= 0:
            raise ValidationError("Payment term amount must be positive")
        if due_date <= datetime.utcnow():
            raise ValidationError("Due date must be in the future")
        existing = sum(term.amount for term in self.store.payment_terms.values() if term.invoice_id == invoice_id and term.status != PaymentTermStatus.SETTLED)
        if existing + amount > invoice.amount:
            raise ValidationError("Payment terms exceed invoice total")
        term = PaymentTerm(term_id=_generate_id("TERM"), invoice_id=invoice.invoice_id, due_date=due_date, amount=amount, notes=notes)
        self.store.payment_terms[term.term_id] = term
        self._log_action(user, "create_payment_term", term.term_id, asdict(term))
        return term

    def record_payment(
        self,
        user: User,
        invoice_id: str,
        method: PaymentMethod,
        amount: float,
        notes: Optional[str] = None,
    ) -> PaymentRecord:
        self.access.require(user, "record_payment")
        invoice = self._get_invoice(invoice_id)
        if amount < 0:
            raise ValidationError("Payment amount cannot be negative")
        if method != PaymentMethod.CREDIT and amount == 0:
            raise ValidationError("Payment amount must be positive")
        total_paid = sum(payment.amount for payment in self.store.payments.values() if payment.invoice_id == invoice_id)
        if total_paid + amount > invoice.amount:
            raise ValidationError("Payment cannot exceed invoice amount")
        payment = PaymentRecord(
            payment_id=_generate_id("PAY"),
            invoice_id=invoice.invoice_id,
            method=method,
            amount=amount,
            received_by=user.user_id,
            notes=notes,
        )
        self.store.payments[payment.payment_id] = payment
        total_paid += amount
        if total_paid >= invoice.amount:
            invoice.status = InvoiceStatus.PAID
            for term in self.store.payment_terms.values():
                if term.invoice_id == invoice.invoice_id:
                    term.status = PaymentTermStatus.SETTLED
        else:
            outstanding_terms = any(
                term.invoice_id == invoice.invoice_id and term.status != PaymentTermStatus.SETTLED
                for term in self.store.payment_terms.values()
            )
            invoice.status = InvoiceStatus.SUBMITTED if outstanding_terms else InvoiceStatus.OVERDUE
        self._log_action(user, "record_payment", payment.payment_id, asdict(payment))
        return payment

    def follow_up_receivable(
        self,
        user: User,
        payment_term_id: str,
        contact_person: str,
        method: str,
        notes: str,
    ) -> ReceivableFollowUp:
        self.access.require(user, "follow_up_receivable")
        if not notes:
            raise ValidationError("Follow up notes are required")
        term = self._get_payment_term(payment_term_id)
        follow_up = ReceivableFollowUp(
            follow_up_id=_generate_id("FU"),
            invoice_id=term.invoice_id,
            contact_person=contact_person,
            method=method,
            notes=notes,
        )
        bucket = self.store.receivable_followups.setdefault(term.invoice_id, [])
        bucket.append(follow_up)
        if datetime.utcnow() > term.due_date and term.status != PaymentTermStatus.SETTLED:
            term.status = PaymentTermStatus.ESCALATED
        else:
            term.status = PaymentTermStatus.FOLLOWED_UP
        self._log_action(user, "follow_up_receivable", follow_up.follow_up_id, asdict(follow_up))
        return follow_up

    def print_receipt(self, user: User, invoice_id: str, payment_id: str) -> ReceiptDocument:
        self.access.require(user, "print_receipt")
        invoice = self._get_invoice(invoice_id)
        payment = self._get_payment(payment_id)
        if payment.invoice_id != invoice.invoice_id:
            raise ValidationError("Payment does not belong to the specified invoice")
        content = (
            f"Invoice: {invoice.invoice_id}\n"
            f"Source: {invoice.source_reference}\n"
            f"Amount: {invoice.amount:.2f} {invoice.currency}\n"
            f"Payment: {payment.amount:.2f} via {payment.method.value}\n"
            f"Printed at: {datetime.utcnow().isoformat()}"
        )
        receipt = ReceiptDocument(
            receipt_id=_generate_id("RCT"),
            invoice_id=invoice.invoice_id,
            payment_id=payment.payment_id,
            generated_by=user.user_id,
            content=content,
        )
        self.store.receipts[receipt.receipt_id] = receipt
        self._log_action(user, "print_receipt", receipt.receipt_id, asdict(receipt))
        return receipt

    def close_customer_interaction(self, user: User, booking_id: str) -> ServiceBooking:
        self.access.require(user, "close_customer_interaction")
        booking = self._get_booking(booking_id)
        if booking.status != BookingStatus.COMPLETED:
            raise InvalidTransitionError("Booking must be completed before closing the interaction")
        related_job_cards = [jc for jc in self.store.job_cards.values() if jc.booking_id == booking.booking_id]
        related_refs = {booking.booking_id, *(jc.job_card_id for jc in related_job_cards)}
        outstanding_invoices = [
            invoice.invoice_id
            for invoice in self.store.invoices.values()
            if invoice.source_reference in related_refs and invoice.status != InvoiceStatus.PAID
        ]
        if outstanding_invoices:
            raise InvalidTransitionError(
                "Cannot close interaction while invoices remain unpaid: " + ", ".join(outstanding_invoices)
            )
        self._log_action(user, "close_customer_interaction", booking.booking_id, {"status": booking.status.value})
        return booking

    # ------------------------------------------------------------------
    # Reporting & monitoring
    # ------------------------------------------------------------------

    def generate_reports(self, user: User) -> Dict[str, object]:
        self.access.require(user, "generate_reports")
        stock_alerts = self._compute_reorder_alerts()
        job_status_counts = defaultdict(int)
        for job_card in self.store.job_cards.values():
            job_status_counts[job_card.status.value] += 1
        invoice_totals = {
            "count": len(self.store.invoices),
            "total": sum(invoice.amount for invoice in self.store.invoices.values()),
            "paid": sum(invoice.amount for invoice in self.store.invoices.values() if invoice.status == InvoiceStatus.PAID),
        }
        payments_total = sum(payment.amount for payment in self.store.payments.values())
        outstanding_terms = [
            {
                "invoice_id": term.invoice_id,
                "due_date": term.due_date.isoformat(),
                "amount": term.amount,
                "status": term.status.value,
            }
            for term in self.store.payment_terms.values()
            if term.status != PaymentTermStatus.SETTLED
        ]
        report = {
            "sales_report": {
                "invoice_summary": invoice_totals,
                "payments_recorded": payments_total,
            },
            "inventory_report": {
                "items": [asdict(item) for item in self.store.inventory.values()],
                "low_stock_alerts": stock_alerts,
            },
            "job_card_report": {
                "totals": dict(job_status_counts),
                "backlog": [jc.job_card_id for jc in self.store.job_cards.values() if jc.status not in {JobCardStatus.CLOSED, JobCardStatus.CANCELLED}],
            },
            "financial_report": {
                "receivables": invoice_totals["total"] - payments_total,
                "open_payment_terms": outstanding_terms,
            },
        }
        self._log_action(user, "generate_reports", "reports", report)
        return report

    def evaluate_reorder_levels(self, user: User) -> List[Dict[str, object]]:
        self.access.require(user, "evaluate_reorder_levels")
        alerts = self._compute_reorder_alerts()
        self._log_action(user, "evaluate_reorder_levels", "inventory", {"alerts": alerts})
        return alerts

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _coerce_estimate_lines(self, lines: Sequence[EstimateLine | Dict[str, object]]) -> List[EstimateLine]:
        result: List[EstimateLine] = []
        for line in lines:
            if isinstance(line, EstimateLine):
                payload = line
            else:
                try:
                    payload = EstimateLine(
                        description=str(line["description"]),
                        quantity=float(line["quantity"]),
                        unit_price=float(line["unit_price"]),
                        item_code=line.get("item_code"),
                    )
                except (KeyError, TypeError, ValueError) as exc:
                    raise ValidationError("Invalid estimate line payload") from exc
            if payload.quantity <= 0 or payload.unit_price < 0:
                raise ValidationError("Estimate line quantities must be positive and price non-negative")
            result.append(payload)
        return result

    def _compute_reorder_alerts(self) -> List[Dict[str, object]]:
        return [
            {
                "item_code": item.item_code,
                "available": item.available,
                "reorder_level": item.reorder_level,
            }
            for item in self.store.inventory.values()
            if item.available <= item.reorder_level
        ]

    def _ensure_stock_placeholder(self, item_code: str) -> StockItem:
        stock_item = self.store.inventory.get(item_code)
        if not stock_item:
            stock_item = StockItem(item_code=item_code, description=item_code)
            self.store.inventory[item_code] = stock_item
        return stock_item

    def _get_customer(self, customer_id: str) -> Customer:
        try:
            return self.store.customers[customer_id]
        except KeyError as exc:
            raise ValidationError(f"Customer {customer_id} not found") from exc

    def _get_vehicle(self, vehicle_id: str) -> Vehicle:
        try:
            return self.store.vehicles[vehicle_id]
        except KeyError as exc:
            raise ValidationError(f"Vehicle {vehicle_id} not found") from exc

    def _get_booking(self, booking_id: str) -> ServiceBooking:
        try:
            return self.store.bookings[booking_id]
        except KeyError as exc:
            raise ValidationError(f"Booking {booking_id} not found") from exc

    def _get_job_card(self, job_card_id: str) -> JobCard:
        try:
            return self.store.job_cards[job_card_id]
        except KeyError as exc:
            raise ValidationError(f"Job card {job_card_id} not found") from exc

    def _get_work_order(self, work_order_id: str) -> WorkOrder:
        try:
            return self.store.work_orders[work_order_id]
        except KeyError as exc:
            raise ValidationError(f"Work order {work_order_id} not found") from exc

    def _get_work_order_by_job(self, job_card_id: str) -> WorkOrder:
        for work_order in self.store.work_orders.values():
            if work_order.job_card_id == job_card_id:
                return work_order
        raise ValidationError(f"Work order for job {job_card_id} not found")

    def _get_purchase_order(self, purchase_order_id: str) -> PurchaseOrder:
        try:
            return self.store.purchase_orders[purchase_order_id]
        except KeyError as exc:
            raise ValidationError(f"Purchase order {purchase_order_id} not found") from exc

    def _get_stock_item(self, item_code: str) -> StockItem:
        try:
            return self.store.inventory[item_code]
        except KeyError as exc:
            raise ValidationError(f"Stock item {item_code} not found") from exc

    def _get_sales_order(self, sales_order_id: str) -> SalesOrder:
        try:
            return self.store.sales_orders[sales_order_id]
        except KeyError as exc:
            raise ValidationError(f"Sales order {sales_order_id} not found") from exc

    def _get_invoice(self, invoice_id: str) -> SalesInvoice:
        try:
            return self.store.invoices[invoice_id]
        except KeyError as exc:
            raise ValidationError(f"Invoice {invoice_id} not found") from exc

    def _get_payment(self, payment_id: str) -> PaymentRecord:
        try:
            return self.store.payments[payment_id]
        except KeyError as exc:
            raise ValidationError(f"Payment {payment_id} not found") from exc

    def _get_payment_term(self, term_id: str) -> PaymentTerm:
        try:
            return self.store.payment_terms[term_id]
        except KeyError as exc:
            raise ValidationError(f"Payment term {term_id} not found") from exc
