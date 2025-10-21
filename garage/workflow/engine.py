"""A secure in-memory implementation of the garage workflow."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from uuid import uuid4

from .exceptions import InvalidTransitionError, PermissionError, ValidationError
from .models import (
    AuditLogEntry,
    BookingStatus,
    DeliveryNote,
    InvoiceStatus,
    JobCard,
    JobCardStatus,
    PaymentMethod,
    PaymentRecord,
    PurchaseOrder,
    PurchaseOrderStatus,
    Role,
    SalesInvoice,
    SalesOrder,
    SalesOrderStatus,
    ServiceBooking,
    ServiceType,
    StockItem,
    StockMovement,
    User,
    WorkOrder,
    WorkOrderStatus,
)


def _generate_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8]}"


class GarageWorkflowEngine:
    """Encapsulates all business logic for the garage workflow.

    The engine intentionally keeps data in-memory so it can be embedded inside
    different front-ends or services. Data validation, permission checks, and an
    audit log are baked in to keep the workflow safe to use even in shared
    environments.
    """

    #: mapping of roles to actions they are allowed to execute
    _ACL: Dict[Role, Tuple[str, ...]] = {
        Role.MANAGER: (
            "register_user",
            "register_inventory_item",
            "adjust_inventory",
            "create_service_booking",
            "record_inspection",
            "create_estimate",
            "record_customer_decision",
            "create_purchase_order",
            "receive_purchase_order",
            "issue_materials",
            "start_work",
            "update_job_progress",
            "complete_work",
            "generate_sales_invoice",
            "record_payment",
            "create_sales_order",
            "reserve_sales_stock",
            "create_delivery_note",
            "generate_reports",
        ),
        Role.SERVICE_ADVISOR: (
            "create_service_booking",
            "record_inspection",
            "create_estimate",
            "record_customer_decision",
            "generate_sales_invoice",
        ),
        Role.TECHNICIAN: (
            "issue_materials",
            "start_work",
            "update_job_progress",
            "complete_work",
        ),
        Role.INVENTORY_CONTROLLER: (
            "register_inventory_item",
            "adjust_inventory",
            "create_purchase_order",
            "receive_purchase_order",
            "issue_materials",
            "reserve_sales_stock",
            "create_delivery_note",
        ),
        Role.CASHIER: (
            "generate_sales_invoice",
            "record_payment",
        ),
    }

    def __init__(self) -> None:
        self.users: Dict[str, User] = {}
        self.bookings: Dict[str, ServiceBooking] = {}
        self.job_cards: Dict[str, JobCard] = {}
        self.work_orders: Dict[str, WorkOrder] = {}
        self.purchase_orders: Dict[str, PurchaseOrder] = {}
        self.sales_orders: Dict[str, SalesOrder] = {}
        self.delivery_notes: Dict[str, DeliveryNote] = {}
        self.invoices: Dict[str, SalesInvoice] = {}
        self.payments: Dict[str, PaymentRecord] = {}
        self.inventory: Dict[str, StockItem] = {}
        self.stock_movements: List[StockMovement] = []
        self.audit_log: List[AuditLogEntry] = []

    # ------------------------------------------------------------------
    # Security helpers
    # ------------------------------------------------------------------

    def register_user(self, user: User, acting_user: Optional[User] = None) -> None:
        """Register a new user. Only managers can register others."""

        if acting_user and not self._is_allowed(acting_user, "register_user"):
            raise PermissionError("Only managers can register new users")

        self.users[user.user_id] = user
        self._log_action(acting_user or user, "register_user", user.user_id, asdict(user))

    def _is_allowed(self, user: User, action: str) -> bool:
        allowed_actions = self._ACL.get(user.role, ())
        return action in allowed_actions

    def _require_permission(self, user: User, action: str) -> None:
        if not self._is_allowed(user, action):
            raise PermissionError(f"{user.full_name} is not allowed to perform '{action}'")

    def _log_action(self, user: User, action: str, reference_id: str, details: Dict[str, object]) -> None:
        entry = AuditLogEntry(
            timestamp=datetime.utcnow(),
            user_id=user.user_id,
            action=action,
            reference_id=reference_id,
            details=details,
        )
        self.audit_log.append(entry)

    # ------------------------------------------------------------------
    # Booking & job card handling
    # ------------------------------------------------------------------

    def create_service_booking(
        self,
        user: User,
        customer_name: str,
        vehicle_registration: str,
        service_type: ServiceType,
        notes: Optional[str] = None,
    ) -> ServiceBooking:
        self._require_permission(user, "create_service_booking")
        if not customer_name or not vehicle_registration:
            raise ValidationError("Customer name and vehicle registration are required")

        booking = ServiceBooking(
            booking_id=_generate_id("BOOK"),
            customer_name=customer_name,
            vehicle_registration=vehicle_registration,
            service_type=service_type,
            notes=notes,
        )
        self.bookings[booking.booking_id] = booking
        self._log_action(user, "create_service_booking", booking.booking_id, asdict(booking))
        return booking

    def record_inspection(
        self,
        user: User,
        booking_id: str,
        technician: User,
        inspection_notes: str,
    ) -> JobCard:
        self._require_permission(user, "record_inspection")
        booking = self._get_booking(booking_id)
        if booking.status == BookingStatus.CANCELLED:
            raise InvalidTransitionError("Cannot inspect a cancelled booking")

        booking.status = BookingStatus.INSPECTED
        booking.inspection_notes = inspection_notes
        job_card = JobCard(
            job_card_id=_generate_id("JOB"),
            booking_id=booking.booking_id,
            technician=technician.user_id,
        )
        self.job_cards[job_card.job_card_id] = job_card
        self._log_action(user, "record_inspection", job_card.job_card_id, asdict(job_card))
        return job_card

    def create_estimate(
        self,
        user: User,
        job_card_id: str,
        estimated_labor_hours: float,
        estimated_parts_cost: float,
    ) -> JobCard:
        self._require_permission(user, "create_estimate")
        job_card = self._get_job_card(job_card_id)
        if job_card.status not in {JobCardStatus.INSPECTION, JobCardStatus.ESTIMATED}:
            raise InvalidTransitionError("Estimates can only be created right after inspection")
        if estimated_labor_hours < 0 or estimated_parts_cost < 0:
            raise ValidationError("Estimates cannot be negative")

        job_card.status = JobCardStatus.AWAITING_APPROVAL
        job_card.estimated_labor_hours = estimated_labor_hours
        job_card.estimated_parts_cost = estimated_parts_cost
        self._log_action(user, "create_estimate", job_card.job_card_id, asdict(job_card))
        return job_card

    def record_customer_decision(
        self,
        user: User,
        job_card_id: str,
        approved: bool,
        reason: Optional[str] = None,
    ) -> Tuple[JobCard, Optional[WorkOrder]]:
        self._require_permission(user, "record_customer_decision")
        job_card = self._get_job_card(job_card_id)
        if job_card.status != JobCardStatus.AWAITING_APPROVAL:
            raise InvalidTransitionError("Customer decision can only be recorded after estimating")

        booking = self._get_booking(job_card.booking_id)
        if not approved:
            job_card.status = JobCardStatus.CANCELLED
            job_card.cancellation_reason = reason or "Customer rejected estimate"
            booking.status = BookingStatus.CANCELLED
            self._log_action(user, "cancel_job_card", job_card.job_card_id, asdict(job_card))
            return job_card, None

        job_card.status = JobCardStatus.APPROVED
        job_card.approval_timestamp = datetime.utcnow()
        booking.status = BookingStatus.INSPECTED
        work_order = WorkOrder(
            work_order_id=_generate_id("WORK"),
            job_card_id=job_card.job_card_id,
            tasks=["General service"],
        )
        self.work_orders[work_order.work_order_id] = work_order
        self._log_action(user, "approve_job_card", job_card.job_card_id, asdict(job_card))
        self._log_action(user, "create_work_order", work_order.work_order_id, asdict(work_order))
        return job_card, work_order

    # ------------------------------------------------------------------
    # Inventory operations
    # ------------------------------------------------------------------

    def register_inventory_item(
        self,
        user: User,
        item_code: str,
        description: str,
        quantity: int = 0,
        reorder_level: int = 0,
    ) -> StockItem:
        self._require_permission(user, "register_inventory_item")
        if quantity < 0:
            raise ValidationError("Quantity cannot be negative")
        stock_item = self.inventory.get(item_code)
        if stock_item:
            raise ValidationError(f"Item {item_code} already exists")

        stock_item = StockItem(item_code=item_code, description=description, quantity_on_hand=quantity, reorder_level=reorder_level)
        self.inventory[item_code] = stock_item
        self._log_action(user, "register_inventory_item", item_code, asdict(stock_item))
        return stock_item

    def adjust_inventory(self, user: User, item_code: str, quantity_delta: int, reason: str) -> StockItem:
        self._require_permission(user, "adjust_inventory")
        stock_item = self._get_stock_item(item_code)
        if stock_item.quantity_on_hand + quantity_delta < 0:
            raise ValidationError("Inventory cannot go negative")
        stock_item.quantity_on_hand += quantity_delta
        movement = StockMovement(
            movement_id=_generate_id("MOVE"),
            item_code=item_code,
            quantity=quantity_delta,
            reason=reason,
        )
        self.stock_movements.append(movement)
        self._log_action(user, "adjust_inventory", item_code, asdict(movement))
        return stock_item

    def create_purchase_order(
        self,
        user: User,
        source_reference: str,
        items: Dict[str, int],
    ) -> PurchaseOrder:
        self._require_permission(user, "create_purchase_order")
        if not items:
            raise ValidationError("Purchase order requires at least one item")

        for item_code, qty in items.items():
            if qty <= 0:
                raise ValidationError("Purchase quantity must be positive")
            if item_code not in self.inventory:
                self.inventory[item_code] = StockItem(item_code=item_code, description=item_code)

        purchase_order = PurchaseOrder(
            purchase_order_id=_generate_id("PO"),
            source_reference=source_reference,
            items=dict(items),
            status=PurchaseOrderStatus.ORDERED,
        )
        self.purchase_orders[purchase_order.purchase_order_id] = purchase_order
        self._log_action(user, "create_purchase_order", purchase_order.purchase_order_id, asdict(purchase_order))
        return purchase_order

    def receive_purchase_order(self, user: User, purchase_order_id: str) -> PurchaseOrder:
        self._require_permission(user, "receive_purchase_order")
        purchase_order = self._get_purchase_order(purchase_order_id)
        if purchase_order.status != PurchaseOrderStatus.ORDERED:
            raise InvalidTransitionError("Only ordered purchase orders can be received")

        for item_code, qty in purchase_order.items.items():
            stock_item = self._get_stock_item(item_code)
            stock_item.quantity_on_hand += qty
            movement = StockMovement(
                movement_id=_generate_id("MOVE"),
                item_code=item_code,
                quantity=qty,
                reason=f"Receipt of {purchase_order.purchase_order_id}",
            )
            self.stock_movements.append(movement)

        purchase_order.status = PurchaseOrderStatus.RECEIVED
        purchase_order.received_at = datetime.utcnow()
        self._log_action(user, "receive_purchase_order", purchase_order.purchase_order_id, asdict(purchase_order))
        return purchase_order

    def issue_materials(self, user: User, job_card_id: str, items: Dict[str, int]) -> None:
        self._require_permission(user, "issue_materials")
        job_card = self._get_job_card(job_card_id)
        if job_card.status not in {JobCardStatus.APPROVED, JobCardStatus.IN_PROGRESS}:
            raise InvalidTransitionError("Materials can only be issued for approved or in-progress jobs")

        for item_code, qty in items.items():
            stock_item = self._get_stock_item(item_code)
            if qty <= 0:
                raise ValidationError("Issued quantity must be positive")
            if stock_item.available < qty:
                raise ValidationError(f"Insufficient stock for {item_code}")
            stock_item.reserved -= min(stock_item.reserved, qty)
            stock_item.quantity_on_hand -= qty
            movement = StockMovement(
                movement_id=_generate_id("MOVE"),
                item_code=item_code,
                quantity=-qty,
                reason=f"Material issue for {job_card.job_card_id}",
            )
            self.stock_movements.append(movement)

        self._log_action(user, "issue_materials", job_card.job_card_id, {"items": items})

    # ------------------------------------------------------------------
    # Work execution
    # ------------------------------------------------------------------

    def start_work(self, user: User, job_card_id: str) -> WorkOrder:
        self._require_permission(user, "start_work")
        job_card = self._get_job_card(job_card_id)
        if job_card.status not in {JobCardStatus.APPROVED, JobCardStatus.IN_PROGRESS}:
            raise InvalidTransitionError("Job must be approved before work can start")

        work_order = self._get_work_order_by_job(job_card_id)
        work_order.status = WorkOrderStatus.IN_PROGRESS
        work_order.started_at = datetime.utcnow()
        job_card.status = JobCardStatus.IN_PROGRESS
        self._log_action(user, "start_work", work_order.work_order_id, asdict(work_order))
        return work_order

    def update_job_progress(self, user: User, job_card_id: str, notes: str) -> JobCard:
        self._require_permission(user, "update_job_progress")
        job_card = self._get_job_card(job_card_id)
        if job_card.status not in {JobCardStatus.IN_PROGRESS, JobCardStatus.APPROVED}:
            raise InvalidTransitionError("Progress can only be recorded while job is active")
        job_card.progress_notes.append(notes)
        self._log_action(user, "update_job_progress", job_card.job_card_id, {"note": notes})
        return job_card

    def complete_work(self, user: User, job_card_id: str, passed_quality_check: bool) -> JobCard:
        self._require_permission(user, "complete_work")
        job_card = self._get_job_card(job_card_id)
        if job_card.status != JobCardStatus.IN_PROGRESS:
            raise InvalidTransitionError("Only in-progress jobs can be completed")

        work_order = self._get_work_order_by_job(job_card_id)
        work_order.status = WorkOrderStatus.COMPLETED
        work_order.completed_at = datetime.utcnow()
        job_card.status = JobCardStatus.QUALITY_CHECK
        self._log_action(user, "complete_work", job_card.job_card_id, asdict(work_order))

        if passed_quality_check:
            job_card.status = JobCardStatus.CLOSED
            booking = self._get_booking(job_card.booking_id)
            booking.status = BookingStatus.COMPLETED
            self._log_action(user, "quality_check", job_card.job_card_id, {"result": "passed"})
        else:
            job_card.progress_notes.append("Quality check failed, rework required")
            work_order.status = WorkOrderStatus.PENDING
            job_card.status = JobCardStatus.IN_PROGRESS
            self._log_action(user, "quality_check", job_card.job_card_id, {"result": "failed"})
        return job_card

    # ------------------------------------------------------------------
    # Sales order flow
    # ------------------------------------------------------------------

    def create_sales_order(self, user: User, customer_name: str, items: Dict[str, int]) -> SalesOrder:
        self._require_permission(user, "create_sales_order")
        if not items:
            raise ValidationError("Sales order requires at least one item")
        for qty in items.values():
            if qty <= 0:
                raise ValidationError("Sales order quantities must be positive")

        sales_order = SalesOrder(
            sales_order_id=_generate_id("SO"),
            customer_name=customer_name,
            items=dict(items),
        )
        self.sales_orders[sales_order.sales_order_id] = sales_order
        self._log_action(user, "create_sales_order", sales_order.sales_order_id, asdict(sales_order))
        return sales_order

    def reserve_sales_stock(self, user: User, sales_order_id: str) -> Dict[str, int]:
        self._require_permission(user, "reserve_sales_stock")
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
        sales_order.status = SalesOrderStatus.RESERVED
        self._log_action(user, "reserve_sales_stock", sales_order.sales_order_id, {"shortages": shortages})
        return shortages

    def create_delivery_note(self, user: User, sales_order_id: str) -> DeliveryNote:
        self._require_permission(user, "create_delivery_note")
        sales_order = self._get_sales_order(sales_order_id)
        if sales_order.status not in {SalesOrderStatus.RESERVED, SalesOrderStatus.DRAFT}:
            raise InvalidTransitionError("Delivery note can only be created for reserved orders")

        for item_code, qty in sales_order.items.items():
            stock_item = self._get_stock_item(item_code)
            if stock_item.reserved < qty:
                raise ValidationError(f"Insufficient reserved stock for {item_code}")
            stock_item.reserved -= qty
            stock_item.quantity_on_hand -= qty

        delivery_note = DeliveryNote(
            delivery_note_id=_generate_id("DN"),
            sales_order_id=sales_order_id,
            items=dict(sales_order.items),
        )
        self.delivery_notes[delivery_note.delivery_note_id] = delivery_note
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
    ) -> SalesInvoice:
        self._require_permission(user, "generate_sales_invoice")
        if amount <= 0:
            raise ValidationError("Invoice amount must be positive")

        invoice = SalesInvoice(invoice_id=_generate_id("INV"), source_reference=source_reference, amount=amount)
        invoice.status = InvoiceStatus.SUBMITTED
        self.invoices[invoice.invoice_id] = invoice
        self._log_action(user, "generate_sales_invoice", invoice.invoice_id, asdict(invoice))
        return invoice

    def record_payment(
        self,
        user: User,
        invoice_id: str,
        method: PaymentMethod,
        amount: float,
        notes: Optional[str] = None,
    ) -> PaymentRecord:
        self._require_permission(user, "record_payment")
        invoice = self._get_invoice(invoice_id)
        if amount <= 0:
            raise ValidationError("Payment amount must be positive")
        if amount > invoice.amount:
            raise ValidationError("Payment cannot exceed invoice amount")

        payment = PaymentRecord(
            payment_id=_generate_id("PAY"),
            invoice_id=invoice.invoice_id,
            method=method,
            amount=amount,
            notes=notes,
        )
        self.payments[payment.payment_id] = payment
        if amount == invoice.amount:
            invoice.status = InvoiceStatus.PAID
        else:
            invoice.status = InvoiceStatus.OVERDUE
        self._log_action(user, "record_payment", payment.payment_id, asdict(payment))
        return payment

    # ------------------------------------------------------------------
    # Reporting
    # ------------------------------------------------------------------

    def generate_reports(self, user: User) -> Dict[str, object]:
        self._require_permission(user, "generate_reports")

        stock_alerts = [
            {
                "item_code": item.item_code,
                "available": item.available,
                "reorder_level": item.reorder_level,
            }
            for item in self.inventory.values()
            if item.available <= item.reorder_level
        ]

        job_status_counts = defaultdict(int)
        for job_card in self.job_cards.values():
            job_status_counts[job_card.status.value] += 1

        sales_total = sum(invoice.amount for invoice in self.invoices.values())
        payments_total = sum(payment.amount for payment in self.payments.values())

        report = {
            "sales_report": {
                "invoice_count": len(self.invoices),
                "sales_total": sales_total,
                "payments_total": payments_total,
            },
            "inventory_report": {
                "items": [asdict(item) for item in self.inventory.values()],
                "low_stock_alerts": stock_alerts,
            },
            "job_card_report": {
                "totals": dict(job_status_counts),
            },
            "financial_report": {
                "receivables": sales_total - payments_total,
            },
        }
        self._log_action(user, "generate_reports", "reports", report)
        return report

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_booking(self, booking_id: str) -> ServiceBooking:
        try:
            return self.bookings[booking_id]
        except KeyError as exc:
            raise ValidationError(f"Booking {booking_id} not found") from exc

    def _get_job_card(self, job_card_id: str) -> JobCard:
        try:
            return self.job_cards[job_card_id]
        except KeyError as exc:
            raise ValidationError(f"Job card {job_card_id} not found") from exc

    def _get_work_order_by_job(self, job_card_id: str) -> WorkOrder:
        for work_order in self.work_orders.values():
            if work_order.job_card_id == job_card_id:
                return work_order
        raise ValidationError(f"Work order for job {job_card_id} not found")

    def _get_purchase_order(self, purchase_order_id: str) -> PurchaseOrder:
        try:
            return self.purchase_orders[purchase_order_id]
        except KeyError as exc:
            raise ValidationError(f"Purchase order {purchase_order_id} not found") from exc

    def _get_stock_item(self, item_code: str) -> StockItem:
        try:
            return self.inventory[item_code]
        except KeyError as exc:
            raise ValidationError(f"Stock item {item_code} not found") from exc

    def _get_sales_order(self, sales_order_id: str) -> SalesOrder:
        try:
            return self.sales_orders[sales_order_id]
        except KeyError as exc:
            raise ValidationError(f"Sales order {sales_order_id} not found") from exc

    def _get_invoice(self, invoice_id: str) -> SalesInvoice:
        try:
            return self.invoices[invoice_id]
        except KeyError as exc:
            raise ValidationError(f"Invoice {invoice_id} not found") from exc
