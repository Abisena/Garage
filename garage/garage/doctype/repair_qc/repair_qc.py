"""DocType for capturing repair and quality control inspections."""

import frappe
from frappe.model.document import Document
from frappe.utils import flt, nowdate


class RepairQC(Document):
    """Document model for repair and QC inspections with checklist fields."""

    def before_insert(self):
        self._set_default_users()

    def validate(self):
        self._set_default_users()
        self._sync_parts_used_pricing()
        self._ensure_sales_invoice()
        self._sync_invoice_summary()
        self._validate_final_status()

    def on_update(self):
        self._sync_service_order_status()
        self._create_payment_entry_if_finished()

    def _set_default_users(self):
        current_user = frappe.session.user if frappe.session else None
        if not current_user:
            return

        if not self.service_advisor:
            self.service_advisor = current_user

        if not self.qc_inspector:
            self.qc_inspector = current_user

    def _sync_service_order_status(self):
        if not self.service_order:
            return

        try:
            service_order = frappe.get_doc("Garage Service Order", self.service_order)
        except Exception:
            return

        updates = {}

        if self.status == "Finished":
            if hasattr(service_order, "qc_status"):
                updates["qc_status"] = "Passed"
            if hasattr(service_order, "job_card_status"):
                updates["job_card_status"] = "Completed"
            if hasattr(service_order, "work_order_status"):
                updates["work_order_status"] = "Completed"
            if hasattr(service_order, "status") and service_order.status not in {
                "Waiting Payment",
                "Completed",
                "Cancelled",
            }:
                updates["status"] = "Waiting Payment"

        if updates:
            frappe.db.set_value(service_order.doctype, service_order.name, updates)

    def _get_latest_invoice(self):
        if not self.service_order:
            return None

        sales_invoice = self._get_latest_sales_invoice()
        if sales_invoice:
            sales_invoice["doctype"] = "Sales Invoice"
            return sales_invoice

        invoices = frappe.get_all(
            "Garage Sales Invoice",
            filters={
                "source_type": "Garage Service Order",
                "source_name": self.service_order,
            },
            fields=[
                "name",
                "total_amount",
                "outstanding_amount",
                "branch",
                "customer",
            ],
            order_by="modified desc",
            limit=1,
        )
        if not invoices:
            return None

        invoices[0]["doctype"] = "Garage Sales Invoice"
        return invoices[0]

    def _get_latest_sales_invoice(self):
        if not frappe.db.table_exists("tabSales Invoice"):
            return None

        meta = frappe.get_meta("Sales Invoice")
        link_field = None
        for fieldname in (
            "service_order",
            "service_order_ref",
            "garage_service_order",
            "garage_service_order_ref",
        ):
            if meta.has_field(fieldname):
                link_field = fieldname
                break

        if not link_field:
            return None

        invoices = frappe.get_all(
            "Sales Invoice",
            filters={
                link_field: self.service_order,
                "docstatus": ["!=", 2],
            },
            fields=[
                "name",
                "grand_total",
                "rounded_total",
                "outstanding_amount",
                "customer",
                "company",
            ],
            order_by="modified desc",
            limit=1,
        )
        return invoices[0] if invoices else None

    def _calculate_invoice_totals(
        self, invoice_doctype, invoice_name, fallback_total, fallback_outstanding
    ):
        total_amount = flt(fallback_total or 0)
        outstanding_amount = flt(fallback_outstanding or 0)

        if total_amount and outstanding_amount:
            return total_amount, outstanding_amount

        try:
            invoice_doc = frappe.get_doc(invoice_doctype, invoice_name)
        except Exception:
            return total_amount, outstanding_amount

        if invoice_doctype == "Sales Invoice":
            if not total_amount:
                total_amount = flt(
                    invoice_doc.get("rounded_total") or invoice_doc.get("grand_total") or 0
                )
            if not outstanding_amount:
                outstanding_amount = flt(
                    invoice_doc.get("outstanding_amount") or total_amount
                )
            return total_amount, outstanding_amount

        if not total_amount:
            total_amount = sum(
                flt(item.amount or (flt(item.rate or 0) * flt(item.qty or 0)))
                for item in (invoice_doc.items or [])
            )

        if not outstanding_amount:
            outstanding_amount = total_amount

        return total_amount, outstanding_amount

    def _sync_invoice_summary(self):
        invoice = self._get_latest_invoice()
        if not invoice:
            self.summary_invoice = None
            self.summary_total_amount = None
            self.summary_outstanding_amount = None
            return

        total_amount, outstanding_amount = self._calculate_invoice_totals(
            invoice.get("doctype") or "Garage Sales Invoice",
            invoice.get("name"),
            invoice.get("total_amount") or invoice.get("rounded_total") or invoice.get("grand_total"),
            invoice.get("outstanding_amount"),
        )
        if total_amount <= 0:
            parts_total = sum(
                flt(row.amount or (flt(row.rate or 0) * flt(row.qty or 0)))
                for row in (self.parts_used or [])
            )
            if parts_total > 0:
                total_amount = parts_total
                if outstanding_amount <= 0:
                    outstanding_amount = parts_total
        self.summary_invoice = invoice.get("name")
        self.summary_total_amount = total_amount
        self.summary_outstanding_amount = outstanding_amount

    def _validate_final_status(self):
        if self.status != "Finished":
            return

        if not self.service_order:
            frappe.throw("Service order belum diisi untuk menyelesaikan Repair QC.")

        if not self._get_latest_invoice() and self._has_billable_items():
            frappe.throw(
                "Sales Invoice untuk Service Order ini belum tersedia. "
                "Mohon buat Sales Invoice terlebih dahulu."
            )

    def _ensure_sales_invoice(self):
        if self.status != "Finished":
            return

        if self._get_latest_invoice():
            return

        if not self.service_order:
            return

        try:
            service_order = frappe.get_doc("Garage Service Order", self.service_order)
        except Exception:
            return

        items = self._build_invoice_items(service_order)
        if not items:
            return

        total_amount = sum(item.get("amount", 0) for item in items)

        invoice_doc = frappe.get_doc(
            {
                "doctype": "Garage Sales Invoice",
                "branch": getattr(service_order, "branch", None),
                "invoice_date": nowdate(),
                "due_date": nowdate(),
                "customer": getattr(service_order, "customer", None),
                "source_type": "Garage Service Order",
                "source_name": service_order.name,
                "total_amount": total_amount,
                "outstanding_amount": total_amount,
                "notes": f"Auto-generated from Repair QC {self.name}",
                "items": items,
            }
        )
        invoice_doc.insert(ignore_permissions=True)

    def _sync_parts_used_pricing(self):
        if not self.service_order:
            return

        rows = list(getattr(self, "parts_used", None) or [])
        if not rows:
            return

        try:
            service_order = frappe.get_doc("Garage Service Order", self.service_order)
        except Exception:
            service_order = None

        required_map = {}
        for part in getattr(service_order, "required_parts", []) or []:
            item_code = (getattr(part, "item_code", "") or "").strip()
            if item_code:
                required_map[item_code] = part

        for row in rows:
            item_code = (getattr(row, "item_code", "") or "").strip()
            if not item_code:
                continue

            reference = required_map.get(item_code)
            qty = flt(getattr(row, "qty", None) or 0)
            if qty <= 0 and reference:
                qty = flt(getattr(reference, "qty", None) or 0)
                if qty > 0:
                    row.qty = qty

            rate = flt(getattr(row, "rate", None) or 0)
            amount = flt(getattr(row, "amount", None) or 0)
            if reference:
                rate = rate or flt(getattr(reference, "rate", None) or 0)
                amount = amount or flt(getattr(reference, "amount", None) or 0)

            if not rate and amount and qty:
                rate = amount / qty

            if not rate:
                rate = flt(frappe.db.get_value("Item", item_code, "standard_rate") or 0)

            if not amount and rate and qty:
                amount = rate * qty

            if rate and not flt(getattr(row, "rate", None) or 0):
                row.rate = rate
            if amount and not flt(getattr(row, "amount", None) or 0):
                row.amount = amount

    def _has_billable_items(self):
        try:
            service_order = frappe.get_doc("Garage Service Order", self.service_order)
        except Exception:
            return False

        return bool(self._build_invoice_items(service_order))

    def _build_invoice_items(self, service_order):
        rows = list(getattr(self, "parts_used", None) or [])
        if not rows:
            rows = list(getattr(service_order, "required_parts", None) or [])

        items = []
        for row in rows:
            item_code = getattr(row, "item_code", None)
            if not item_code:
                continue

            qty = flt(getattr(row, "qty", None) or 0)
            if qty <= 0:
                continue

            amount = flt(getattr(row, "amount", None) or 0)
            rate = flt(getattr(row, "rate", None) or 0)
            if not rate and amount:
                rate = amount / qty

            if not rate:
                rate = flt(frappe.db.get_value("Item", item_code, "standard_rate") or 0)

            if not amount:
                amount = rate * qty

            if amount <= 0:
                continue

            item_name = getattr(row, "item_name", None)
            description = getattr(row, "description", None)
            uom = getattr(row, "uom", None)

            if not item_name or not uom:
                item_defaults = frappe.db.get_value(
                    "Item",
                    item_code,
                    ["item_name", "stock_uom", "description"],
                    as_dict=True,
                ) or {}
                item_name = item_name or item_defaults.get("item_name")
                uom = uom or item_defaults.get("stock_uom")
                description = description or item_defaults.get("description")

            items.append(
                {
                    "item_code": item_code,
                    "item_name": item_name,
                    "description": description or item_code,
                    "qty": qty,
                    "uom": uom or "Unit",
                    "rate": rate,
                    "amount": amount,
                }
            )

        return items

    def _create_payment_entry_if_finished(self):
        if self.status != "Finished":
            return

        if self.payment_entry:
            return

        invoice = self._get_latest_invoice()
        if not invoice:
            return
        if invoice.get("doctype") == "Sales Invoice":
            return

        outstanding_amount = flt(invoice.get("outstanding_amount") or invoice.get("total_amount"))
        if outstanding_amount <= 0:
            return

        payment_entry = frappe.get_doc(
            {
                "doctype": "Garage Payment Entry",
                "branch": invoice.get("branch"),
                "payment_date": nowdate(),
                "customer": invoice.get("customer"),
                "paid_amount": outstanding_amount,
                "received_amount": outstanding_amount,
                "notes": f"Auto-generated from Repair QC {self.name}",
                "allocations": [
                    {
                        "invoice": invoice.get("name"),
                        "allocated_amount": outstanding_amount,
                        "outstanding_before": outstanding_amount,
                        "outstanding_after": 0,
                    }
                ],
            }
        )
        payment_entry.insert(ignore_permissions=True)
        frappe.db.set_value(
            self.doctype,
            self.name,
            "payment_entry",
            payment_entry.name,
            update_modified=False,
        )
