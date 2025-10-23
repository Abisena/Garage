"""Garage DocType controller for Garage Service Order."""
from __future__ import annotations

from typing import Iterable

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate


class GarageServiceOrder(Document):
    """Ensure cross-table consistency for the complex service order DocType."""

    STATUS_OPTIONS = {
        "Draft",
        "Inspection",
        "Estimate",
        "Awaiting Approval",
        "Approved",
        "Work In Progress",
        "Awaiting QC",
        "Completed",
        "Cancelled",
    }
    JOB_CARD_STATUSES = {"Not Created", "Open", "On Hold", "Completed", "Cancelled"}
    WORK_ORDER_STATUSES = {
        "Not Created",
        "In Progress",
        "Awaiting Parts",
        "Completed",
        "Cancelled",
    }
    QC_STATUSES = {"Not Required", "Pending", "Passed", "Failed"}
    TASK_STATUSES = {"Pending", "In Progress", "Completed", "Deferred"}
    PART_SOURCES = {"On Hand", "Purchase", "Transfer"}
    PART_STATUSES = {"Pending Check", "Available", "To Order", "Ordered", "Received", "Issued"}
    INSPECTION_SEVERITY = {"Low", "Medium", "High", "Critical"}
    PROGRESS_STATUSES = {"Started", "In Progress", "Awaiting Parts", "Completed", "Paused"}
    PAYMENT_STATUSES = {"Pending", "Paid", "Overdue"}

    def validate(self) -> None:  # noqa: D401 - Frappe hook
        """Run a rich set of validations before persisting the service order."""

        self._validate_links()
        self._validate_status_fields()
        self._validate_amounts()
        self._validate_dates()
        self._validate_child_tables()

    # ------------------------------------------------------------------
    # Core validations
    # ------------------------------------------------------------------
    def _validate_links(self) -> None:
        if not self.customer:
            frappe.throw(_("Customer wajib diisi."))
        if not frappe.db.exists("Garage Customer", self.customer):
            frappe.throw(_("Customer {0} tidak ditemukan.").format(self.customer))

        if not self.vehicle:
            frappe.throw(_("Pilih kendaraan untuk service order."))

        vehicle_customer = frappe.db.get_value("Garage Vehicle", self.vehicle, "customer")
        if not vehicle_customer:
            frappe.throw(_("Kendaraan {0} tidak ditemukan.").format(self.vehicle))
        if vehicle_customer and vehicle_customer != self.customer:
            frappe.throw(
                _("Kendaraan {vehicle} terdaftar untuk customer {customer}.").format(
                    vehicle=self.vehicle,
                    customer=vehicle_customer,
                )
            )

    def _validate_status_fields(self) -> None:
        self._require_in("status", self.status, self.STATUS_OPTIONS)
        self._require_in("job_card_status", self.job_card_status, self.JOB_CARD_STATUSES)
        self._require_in("work_order_status", self.work_order_status, self.WORK_ORDER_STATUSES)
        self._require_in("qc_status", self.qc_status, self.QC_STATUSES)

    def _validate_amounts(self) -> None:
        if self.total_estimated_amount is not None and flt(self.total_estimated_amount) < 0:
            frappe.throw(_("Total estimasi tidak boleh negatif."))
        if self.total_approved_amount is not None and flt(self.total_approved_amount) < 0:
            frappe.throw(_("Total approved tidak boleh negatif."))
        if (
            flt(self.total_estimated_amount)
            and flt(self.total_approved_amount)
            and flt(self.total_approved_amount) > flt(self.total_estimated_amount)
        ):
            frappe.throw(_("Total approved melebihi estimasi."))
        if self.customer_confirmation and not self.approval_date:
            frappe.throw(_("Tanggal approval wajib diisi saat customer menyetujui."))

    def _validate_dates(self) -> None:
        if self.actual_delivery_date and self.service_booking_date:
            if getdate(self.actual_delivery_date) < getdate(self.service_booking_date):
                frappe.throw(_("Tanggal delivery tidak boleh lebih awal dari tanggal booking."))
        if self.estimated_delivery_date and self.service_booking_date:
            if getdate(self.estimated_delivery_date) < getdate(self.service_booking_date):
                frappe.throw(_("Estimasi selesai harus setelah tanggal booking."))

    def _validate_child_tables(self) -> None:
        self._validate_inspection_items()
        self._validate_service_tasks()
        self._validate_required_parts()
        self._validate_progress_logs()
        self._validate_quality_checks()
        self._validate_payment_schedule()

    # ------------------------------------------------------------------
    # Child table helpers
    # ------------------------------------------------------------------
    def _validate_inspection_items(self) -> None:
        for row in self.inspection_items or []:
            self._require_in("severity", row.severity, self.INSPECTION_SEVERITY)

    def _validate_service_tasks(self) -> None:
        for row in self.service_tasks or []:
            self._require_in("status", row.status, self.TASK_STATUSES)
            if row.estimated_hours is not None and row.estimated_hours < 0:
                frappe.throw(_("Estimasi jam kerja tidak boleh negatif."))
            if row.actual_hours is not None and row.actual_hours < 0:
                frappe.throw(_("Jam kerja aktual tidak boleh negatif."))

    def _validate_required_parts(self) -> None:
        for row in self.required_parts or []:
            self._require_in("source", row.source, self.PART_SOURCES)
            self._require_in("stock_status", row.stock_status, self.PART_STATUSES)
            if row.qty is not None and row.qty <= 0:
                frappe.throw(_("Qty part harus lebih besar dari 0."))
            if row.rate is not None and row.rate < 0:
                frappe.throw(_("Rate part tidak boleh negatif."))
            if row.amount is not None and row.amount < 0:
                frappe.throw(_("Amount part tidak boleh negatif."))

    def _validate_progress_logs(self) -> None:
        for row in self.progress_logs or []:
            self._require_in("status", row.status, self.PROGRESS_STATUSES)
            if row.percent_complete is not None:
                if row.percent_complete < 0 or row.percent_complete > 100:
                    frappe.throw(_("Persentase progres harus 0-100."))

    def _validate_quality_checks(self) -> None:
        for row in self.quality_checks or []:
            self._require_in("result", row.result, {"Pending", "Pass", "Fail"})

    def _validate_payment_schedule(self) -> None:
        total_percentage = 0.0
        for row in self.payment_schedule or []:
            self._require_in("status", row.status, self.PAYMENT_STATUSES)
            if row.percentage is not None and row.percentage < 0:
                frappe.throw(_("Persentase termin tidak boleh negatif."))
            if row.amount is not None and row.amount < 0:
                frappe.throw(_("Nominal termin tidak boleh negatif."))
            total_percentage += row.percentage or 0
        if total_percentage > 100.0 + 1e-6:
            frappe.throw(_("Total persentase termin melebihi 100%."))

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------
    def _require_in(self, fieldname: str, value: str, options: Iterable[str]) -> None:
        if value and value not in options:
            frappe.throw(_("Nilai {field} tidak valid.").format(field=_(fieldname.replace("_", " ").title())))


__all__ = ["GarageServiceOrder"]
