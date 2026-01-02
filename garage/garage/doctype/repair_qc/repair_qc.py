"""DocType for capturing repair and quality control inspections - SYNCHRONOUS VERSION"""

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, nowdate, getdate, today


class RepairQC(Document):
    """Document model for repair and QC inspections with checklist fields."""

    def before_insert(self):
        self._set_default_users()

    def validate(self):
        self._set_default_users()
        self._sync_parts_used_pricing()

        # ✅ DISABLED - No checkbox validation
        # if not getattr(self.flags, "ignore_completion_validation", False):
        #     self._validate_completion_fields()

        self._sync_invoice_summary()
        if self.status == "Reopened" and self._is_latest_invoice_paid():
            frappe.throw(
                _("Repair QC tidak bisa di-reopen karena Sales Invoice sudah lunas.")
            )

    def on_update(self):
        """Called after document is saved"""
        self._sync_service_order_status()
        
        # ✅ CREATE IMMEDIATELY (not async)
        if self.status == "Finished" and not self.flags.get("skip_auto_create"):
            self._create_sales_invoice_and_payment()

    def _create_sales_invoice_and_payment(self):
        """Create Sales Invoice and Payment Entry immediately"""
        try:
            # Create Sales Invoice
            invoice_name = self._ensure_sales_invoice()
            
            if invoice_name:
                frappe.db.commit()
                
                # Create Payment Entry
                payment_name = self._create_payment_entry_if_finished()
                
                if payment_name:
                    frappe.db.commit()
                    
        except Exception as e:
            frappe.log_error(f"Error creating documents: {str(e)}\n{frappe.get_traceback()}", "Repair QC - Document Creation")

    def _set_default_users(self):
        current_user = frappe.session.user if frappe.session else None
        if not current_user:
            return

        if not self.service_advisor:
            self.service_advisor = current_user

        if not self.qc_inspector:
            self.qc_inspector = current_user

    def _validate_completion_fields(self):
        """DISABLED - Not used"""
        pass

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
        """Get latest Sales Invoice for this Service Order"""
        if not self.service_order:
            return None

        link_field = self._get_sales_invoice_link_field()

        if link_field:
            try:
                invoices = frappe.get_all(
                    "Sales Invoice",
                    filters={link_field: self.service_order, "docstatus": ["!=", 2]},
                    fields=[
                        "name",
                        "grand_total",
                        "rounded_total",
                        "outstanding_amount",
                        "customer",
                        "company",
                        "docstatus",
                    ],
                    order_by="creation desc",
                    limit=1,
                )
                if invoices:
                    invoices[0]["doctype"] = "Sales Invoice"
                    return invoices[0]
            except Exception:
                pass

        try:
            invoices = frappe.get_all(
                "Sales Invoice",
                filters={"po_no": self.service_order, "docstatus": ["!=", 2]},
                fields=[
                    "name",
                    "grand_total",
                    "rounded_total",
                    "outstanding_amount",
                    "customer",
                    "company",
                    "docstatus",
                ],
                order_by="creation desc",
                limit=1,
            )
            if invoices:
                invoices[0]["doctype"] = "Sales Invoice"
                return invoices[0]
        except Exception:
            pass

        # Try SQL query directly
        try:
            invoices = frappe.db.sql("""
                SELECT 
                    name, 
                    grand_total, 
                    rounded_total, 
                    outstanding_amount, 
                    customer, 
                    company,
                    docstatus
                FROM `tabSales Invoice`
                WHERE docstatus != 2
                AND remarks LIKE %s
                ORDER BY creation DESC
                LIMIT 1
            """, (f"%{self.service_order}%",), as_dict=True)
            
            if invoices:
                invoices[0]["doctype"] = "Sales Invoice"
                return invoices[0]
        except Exception:
            pass

        return None

    def _get_latest_sales_invoice(self):
        """Wrapper for _get_latest_invoice"""
        return self._get_latest_invoice()

    def _get_sales_invoice_link_field(self):
        """Find which field links Sales Invoice to Service Order"""
        try:
            meta = frappe.get_meta("Sales Invoice")
            for fieldname in (
                "service_order",
                "service_order_ref",
                "garage_service_order",
                "garage_service_order_ref",
            ):
                if meta.has_field(fieldname):
                    return fieldname
        except Exception:
            pass
        return None

    def _doctype_has_field(self, doctype: str, fieldname: str) -> bool:
        try:
            return frappe.get_meta(doctype).has_field(fieldname)
        except Exception:
            return False

    def _calculate_invoice_totals(
        self, invoice_doctype, invoice_name, fallback_total, fallback_outstanding
    ):
        total_amount = flt(fallback_total or 0)
        outstanding_amount = flt(fallback_outstanding or 0)

        if total_amount and outstanding_amount:
            return total_amount, outstanding_amount

        try:
            invoice_doc = frappe.get_doc(invoice_doctype, invoice_name)
            if invoice_doctype == "Sales Invoice":
                if not total_amount:
                    total_amount = flt(
                        invoice_doc.get("rounded_total") or invoice_doc.get("grand_total") or 0
                    )
                if not outstanding_amount:
                    outstanding_amount = flt(
                        invoice_doc.get("outstanding_amount") or total_amount
                    )
        except Exception:
            pass

        return total_amount, outstanding_amount

    def _is_invoice_paid(self, invoice_name: str) -> bool:
        if not invoice_name:
            return False

        try:
            values = frappe.db.get_value(
                "Sales Invoice",
                invoice_name,
                ["status", "outstanding_amount", "docstatus"],
                as_dict=True,
            )
        except Exception:
            return False

        if not values or values.get("docstatus") != 1:
            return False

        status = (values.get("status") or "").lower()
        outstanding = flt(values.get("outstanding_amount") or 0)
        return status == "paid" or outstanding <= 0

    def _is_latest_invoice_paid(self) -> bool:
        invoice = self._get_latest_invoice()
        if not invoice:
            return False
        if invoice.get("doctype") and invoice.get("doctype") != "Sales Invoice":
            return False

        return self._is_invoice_paid(invoice.get("name"))

    def _sync_invoice_summary(self):
        invoice = self._get_latest_invoice()
        if not invoice:
            self.summary_invoice = None
            self.summary_total_amount = None
            self.summary_outstanding_amount = None
            return

        total_amount, outstanding_amount = self._calculate_invoice_totals(
            invoice.get("doctype") or "Sales Invoice",
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
        """DISABLED"""
        pass

    def _ensure_sales_invoice(self):
        """
        ✅ CREATE SALES INVOICE IMMEDIATELY (SYNCHRONOUS)
        """
        # Check if already exists
        existing = self._get_latest_invoice()
        if existing:
            frappe.msgprint(
                _("Sales Invoice sudah ada: {0}").format(existing.get("name")),
                indicator="blue",
                alert=True
            )
            return existing.get("name")
        
        if not self.service_order:
            return None

        # Get service order
        try:
            service_order = frappe.get_doc("Garage Service Order", self.service_order)
        except Exception as e:
            frappe.log_error(f"Get Service Order failed: {str(e)}", "Repair QC - Sales Invoice")
            frappe.msgprint(
                _("Error: Tidak dapat mengambil Service Order"),
                indicator="red",
                alert=True
            )
            return None

        # Build items
        items = self._build_invoice_items(service_order)
        if not items:
            frappe.msgprint(
                _("Tidak ada item untuk di-invoice"),
                indicator="orange",
                alert=True
            )
            return None

        # Get customer
        customer_link = service_order.get("customer")
        if not customer_link:
            frappe.msgprint(
                _("Customer tidak ditemukan"),
                indicator="red",
                alert=True
            )
            return None
        customer_name = None
        try:
            from garage.api.portal import _ensure_erp_customer

            customer_name = _ensure_erp_customer(
                customer_link, service_order.get("branch")
            )
        except Exception:
            customer_name = None

        if not customer_name:
            frappe.msgprint(
                _("Customer tidak ditemukan"),
                indicator="red",
                alert=True,
            )
            return None

        # Get company
        company = frappe.db.get_single_value("Global Defaults", "default_company")
        if not company:
            companies = frappe.get_all("Company", limit=1)
            company = companies[0].name if companies else None
            
        if not company:
            frappe.msgprint(
                _("Company tidak ditemukan"),
                indicator="red",
                alert=True
            )
            return None

        # Create Sales Invoice
        try:
            # Get proper posting date
            posting_date = getdate(nowdate()) if nowdate() else getdate(today())
            
            si = frappe.new_doc("Sales Invoice")
            si.customer = customer_name
            si.company = company
            si.posting_date = posting_date
            si.set_posting_time = 1
            si.due_date = posting_date
            si.po_no = service_order.name
            si.remarks = f"Auto-generated from Repair QC {self.name} (Service Order {service_order.name})"
            
            # Set branch if field exists
            if self._doctype_has_field("Sales Invoice", "branch"):
                si.branch = service_order.get("branch")

            link_field = self._get_sales_invoice_link_field()
            if link_field:
                setattr(si, link_field, service_order.name)
            
            # Add items
            for item in items:
                si.append("items", item)
            
            # Calculate totals
            si.run_method("set_missing_values")
            si.calculate_taxes_and_totals()

            # Ensure required dates are set after hooks
            if not si.posting_date:
                si.posting_date = posting_date
            if not si.due_date:
                si.due_date = posting_date
            
            # Fix write-off
            si.base_write_off_amount = flt(si.base_write_off_amount or 0)
            si.write_off_amount = flt(si.write_off_amount or 0)
            
            # Save
            si.insert(ignore_permissions=True)
            
            # Submit
            try:
                si.submit()
                frappe.msgprint(
                    _("✅ Sales Invoice {0} berhasil dibuat dan di-submit!").format(
                        f'<a href="/app/sales-invoice/{si.name}" target="_blank">{si.name}</a>'
                    ),
                    indicator="green",
                    alert=True
                )
            except Exception as e:
                frappe.log_error(f"Submit failed: {str(e)}", "Repair QC - Sales Invoice Submit")
                frappe.msgprint(
                    _("⚠️ Sales Invoice {0} dibuat tapi tidak bisa di-submit").format(
                        f'<a href="/app/sales-invoice/{si.name}" target="_blank">{si.name}</a>'
                    ),
                    indicator="orange",
                    alert=True
                )
            
            # Update QC
            frappe.db.set_value("Repair QC", self.name, "summary_invoice", si.name, update_modified=False)
            
            return si.name
            
        except Exception as e:
            frappe.log_error(f"Create Sales Invoice failed: {str(e)}\n{frappe.get_traceback()}", "Repair QC - Sales Invoice")
            frappe.msgprint(
                _("❌ Gagal membuat Sales Invoice: {0}").format(str(e)),
                indicator="red",
                alert=True
            )
            return None

    def _sync_parts_used_pricing(self):
        if not self.service_order:
            return

        rows = list(getattr(self, "parts_used", None) or [])
        if not rows:
            return

        try:
            service_order = frappe.get_doc("Garage Service Order", self.service_order)
        except Exception:
            return

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
                rate = self._get_item_rate(item_code)

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

        bundle_items = self._get_bundle_items(service_order)
        items = []
        seen_codes = set()
        
        # Add bundle items
        for row in bundle_items:
            item_code = (row.get("item_code") or "").strip()
            if not item_code:
                continue
            qty = flt(row.get("qty") or 0)
            if qty <= 0:
                continue
            rate = self._get_item_rate(item_code)
            if rate <= 0:
                rate = 100000  # Default
            amount = rate * qty

            try:
                item_defaults = frappe.db.get_value(
                    "Item",
                    item_code,
                    ["item_name", "stock_uom", "description"],
                    as_dict=True,
                ) or {}
            except Exception:
                item_defaults = {}
                
            items.append({
                "item_code": item_code,
                "item_name": item_defaults.get("item_name") or item_code,
                "description": item_defaults.get("description") or item_code,
                "qty": qty,
                "uom": item_defaults.get("stock_uom") or "Nos",
                "rate": rate,
                "amount": amount,
            })
            seen_codes.add(item_code)

        # Add parts used
        for row in rows:
            item_code = getattr(row, "item_code", None)
            if not item_code or item_code in seen_codes:
                continue

            qty = flt(getattr(row, "qty", None) or 0)
            if qty <= 0:
                continue

            amount = flt(getattr(row, "amount", None) or 0)
            rate = flt(getattr(row, "rate", None) or 0)
            
            if not rate and amount:
                rate = amount / qty
            if not rate:
                rate = self._get_item_rate(item_code)
            if not rate:
                rate = 100000  # Default
            if not amount:
                amount = rate * qty

            item_name = getattr(row, "item_name", None)
            description = getattr(row, "description", None)
            uom = getattr(row, "uom", None)

            if not item_name or not uom:
                try:
                    item_defaults = frappe.db.get_value(
                        "Item",
                        item_code,
                        ["item_name", "stock_uom", "description"],
                        as_dict=True,
                    ) or {}
                    item_name = item_name or item_defaults.get("item_name")
                    uom = uom or item_defaults.get("stock_uom")
                    description = description or item_defaults.get("description")
                except Exception:
                    pass

            items.append({
                "item_code": item_code,
                "item_name": item_name or item_code,
                "description": description or item_code,
                "qty": qty,
                "uom": uom or "Nos",
                "rate": rate,
                "amount": amount,
            })

        # If no items, add default service item
        if not items:
            service_type = service_order.get("service_order_type") or "General Service"
            items.append({
                "item_code": "SERVICE-GENERAL",
                "item_name": f"Service - {service_type}",
                "description": f"Service for {service_type}",
                "qty": 1,
                "uom": "Nos",
                "rate": 500000,
                "amount": 500000,
            })

        return items

    def _get_bundle_items(self, service_order):
        service_order_type = getattr(service_order, "service_order_type", None)
        if not service_order_type:
            return []

        try:
            from garage.garage.doctype.garage_service_order.garage_service_order import (
                get_bundle_items_for_service_type,
            )
            return get_bundle_items_for_service_type(service_order_type)
        except Exception:
            return []

    def _get_item_rate(self, item_code: str) -> float:
        if not item_code:
            return 0

        try:
            standard_rate = flt(frappe.db.get_value("Item", item_code, "standard_rate") or 0)
            if standard_rate:
                return standard_rate
        except Exception:
            pass

        try:
            prices = frappe.get_all(
                "Item Price",
                filters={"item_code": item_code, "selling": 1},
                fields=["price_list_rate"],
                order_by="modified desc",
                limit=1,
            )
            if prices:
                return flt(prices[0].get("price_list_rate") or 0)
        except Exception:
            pass

        return 0

    def _create_payment_entry_if_finished(self):
        """
        ✅ CREATE PAYMENT ENTRY IMMEDIATELY (SYNCHRONOUS)
        """
        if self.payment_entry:
            return self.payment_entry
            
        invoice = self._get_latest_invoice()
        if not invoice:
            return None

        if invoice.get("doctype") != "Sales Invoice":
            return None

        outstanding = flt(invoice.get("outstanding_amount") or 0)
        if outstanding <= 0:
            frappe.msgprint(
                _("Invoice sudah lunas, tidak perlu Payment Entry"),
                indicator="blue",
                alert=True
            )
            return None

        try:
            from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry
            
            # Get proper posting date
            posting_date = getdate(nowdate()) if nowdate() else getdate(today())
            
            pe = get_payment_entry("Sales Invoice", invoice.get("name"))
            
            if self._doctype_has_field("Payment Entry", "branch"):
                pe.branch = frappe.db.get_value("Sales Invoice", invoice.get("name"), "branch")
            
            pe.posting_date = posting_date
            pe.reference_no = f"QC-{self.name}"
            pe.reference_date = posting_date
            pe.remarks = f"Auto-generated from Repair QC {self.name}"
            
            pe.insert(ignore_permissions=True)
            
            frappe.db.set_value("Repair QC", self.name, "payment_entry", pe.name, update_modified=False)
            
            frappe.msgprint(
                _("✅ Payment Entry {0} berhasil dibuat sebagai DRAFT!").format(
                    f'<a href="/app/payment-entry/{pe.name}" target="_blank">{pe.name}</a>'
                ),
                indicator="green",
                alert=True
            )
            
            return pe.name
            
        except Exception as e:
            frappe.log_error(f"Create Payment Entry failed: {str(e)}\n{frappe.get_traceback()}", "Repair QC - Payment Entry")
            frappe.msgprint(
                _("❌ Gagal membuat Payment Entry: {0}").format(str(e)),
                indicator="red",
                alert=True
            )
            return None


@frappe.whitelist()
def is_repair_qc_invoice_paid(repair_qc: str):
    if not repair_qc:
        return {"paid": False, "invoice": None}

    try:
        doc = frappe.get_doc("Repair QC", repair_qc)
    except Exception:
        return {"paid": False, "invoice": None}

    invoice = doc._get_latest_invoice()
    invoice_name = invoice.get("name") if invoice else None
    return {"paid": doc._is_latest_invoice_paid(), "invoice": invoice_name}
