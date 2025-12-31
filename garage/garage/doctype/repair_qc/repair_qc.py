"""DocType for capturing repair and quality control inspections."""

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, nowdate


class RepairQC(Document):
    """Document model for repair and QC inspections with checklist fields."""

    def before_insert(self):
        self._set_default_users()

    def validate(self):
        self._set_default_users()
        self._sync_parts_used_pricing()
        if not getattr(self.flags, "ignore_completion_validation", False):
            self._validate_completion_fields()
        if not getattr(self.flags, "ignore_auto_status", False):
            self._set_auto_status()
        
        # ✅ Auto-create Sales Invoice when status is Finished
        if self.status == "Finished" and not self.get("__islocal"):
            self._ensure_sales_invoice()
        
        self._sync_invoice_summary()

    def on_update(self):
        self._sync_service_order_status()
        
        # ✅ Auto-create Payment Entry draft when Sales Invoice exists
        if self.status == "Finished":
            self._create_payment_entry_if_finished()

    def _set_default_users(self):
        current_user = frappe.session.user if frappe.session else None
        if not current_user:
            return

        if not self.service_advisor:
            self.service_advisor = current_user

        if not self.qc_inspector:
            self.qc_inspector = current_user

    def _set_auto_status(self):
        missing_fields = self._get_missing_completion_fields()
        self.status = "Finished" if not missing_fields else "Draft"

    def _validate_completion_fields(self):
        if self.status != "Finished":
            return

        missing_fields = self._get_missing_completion_fields()
        if missing_fields:
            missing_items = "".join(f"<li>{item}</li>" for item in missing_fields)
            frappe.throw(
                f"<p>Lengkapi data berikut sebelum disimpan:</p><ul>{missing_items}</ul>",
                title="Data Belum Lengkap",
            )

    def _get_missing_completion_fields(self):
        meta = self.meta
        missing_fields = []

        required_fields = [
            "service_order",
            "service_advisor",
            "qc_inspector",
            "inspection_date",
        ]
        checklist_fields = [
            "brakes_functioning_properly",
            "engine_starts_smoothly",
            "no_fluid_leaks_detected",
            "lights_and_signals_functional",
            "battery_holding_charge",
            "power_steering_responsive",
            "suspension_normal",
            "steering_alignment_normal",
            "windows_and_mirrors_cleaned",
            "exterior_washed_and_dried",
            "interior_vacuumed_and_wiped",
            "interior_disinfected",
            "interior_reconditioned",
            "interior_air_freshener",
            "all_work_order_documented",
            "spare_parts_installation_verified",
            "photos_before_after_taken",
            "acceleration_smooth_responsive",
            "braking_effective_without_pulling",
            "no_unusual_noise_during_drive",
            "dry_and_wet_brakes_tested",
            "dashboard_indicators_normal",
        ]

        for fieldname in required_fields:
            if not self.get(fieldname):
                missing_fields.append(meta.get_label(fieldname))

        for fieldname in checklist_fields:
            if not self.get(fieldname):
                missing_fields.append(meta.get_label(fieldname))

        for row in self.spare_parts_verification or []:
            if not row.verified:
                item_label = row.item_code or row.item_name or f"Baris {row.idx}"
                missing_fields.append(
                    f"{meta.get_label('spare_parts_verification')}: {item_label}"
                )

        return missing_fields

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

        if frappe.db.table_exists("tabSales Invoice"):
            sales_invoice = self._get_latest_sales_invoice()
            if sales_invoice:
                sales_invoice["doctype"] = "Sales Invoice"
                return sales_invoice
            return None

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

        link_field = self._get_sales_invoice_link_field()
        if link_field:
            filters = {
                link_field: self.service_order,
                "docstatus": ["!=", 2],
            }
        else:
            filters = {
                "remarks": ["like", f"%{self.service_order}%"],
                "docstatus": ["!=", 2],
            }

        invoices = frappe.get_all(
            "Sales Invoice",
            filters=filters,
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

    def _get_sales_invoice_link_field(self):
        if not frappe.db.table_exists("tabSales Invoice"):
            return None

        meta = frappe.get_meta("Sales Invoice")
        for fieldname in (
            "service_order",
            "service_order_ref",
            "garage_service_order",
            "garage_service_order_ref",
        ):
            if meta.has_field(fieldname):
                return fieldname
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

    def _ensure_sales_invoice(self):
        """
        ✅ AUTO-CREATE SALES INVOICE when status is Finished
        """
        # Skip if invoice already exists
        if self._get_latest_invoice():
            frappe.msgprint(
                _("Sales Invoice already exists: {0}").format(self.summary_invoice),
                indicator="blue",
                alert=True
            )
            return

        # Skip if no service order
        if not self.service_order:
            return

        # Get service order
        try:
            service_order = frappe.get_doc("Garage Service Order", self.service_order)
        except Exception as e:
            frappe.log_error(f"Failed to get Service Order: {str(e)}")
            return

        # Build invoice items
        items = self._build_invoice_items(service_order)
        if not items:
            frappe.msgprint(
                _("No billable items found. Sales Invoice not created."),
                indicator="orange",
                alert=True
            )
            return

        # Check if Sales Invoice doctype exists
        if not frappe.db.table_exists("tabSales Invoice"):
            frappe.msgprint(
                _("Sales Invoice module not installed. Cannot create invoice."),
                indicator="red",
                alert=True
            )
            return

        # Get customer for invoice
        link_field = self._get_sales_invoice_link_field()
        from garage.api.portal import _ensure_erp_customer

        invoice_customer = _ensure_erp_customer(
            getattr(service_order, "customer", None),
            getattr(service_order, "branch", None),
        )
        
        if not invoice_customer:
            frappe.msgprint(
                _("Could not determine customer for Sales Invoice."),
                indicator="red",
                alert=True
            )
            return

        # Get company
        company = (
            frappe.defaults.get_user_default("company")
            or frappe.defaults.get_global_default("company")
        )
        
        if not company:
            frappe.throw(_("Please set default company in User Defaults or Global Defaults"))

        # Create Sales Invoice
        try:
            invoice_doc = frappe.new_doc("Sales Invoice")
            invoice_doc.company = company
            invoice_doc.customer = invoice_customer
            invoice_doc.posting_date = nowdate()
            invoice_doc.set_posting_time = 1
            invoice_doc.due_date = nowdate()
            invoice_doc.remarks = (
                f"Auto-generated from Repair QC {self.name} "
                f"(Service Order {service_order.name})"
            )
            
            # Set branch if field exists
            if self._doctype_has_field("Sales Invoice", "branch"):
                invoice_doc.branch = getattr(service_order, "branch", None)

            # Link to service order if field exists
            if link_field:
                setattr(invoice_doc, link_field, service_order.name)

            # Add items
            for row in items:
                invoice_doc.append("items", row)

            # Calculate totals
            invoice_doc.run_method("set_missing_values")
            invoice_doc.calculate_taxes_and_totals()
            
            # Fix write-off amounts
            invoice_doc.base_write_off_amount = flt(invoice_doc.base_write_off_amount)
            invoice_doc.write_off_amount = flt(invoice_doc.write_off_amount)
            
            # Insert invoice (DRAFT)
            invoice_doc.insert(ignore_permissions=True)
            
            # ✅ SUBMIT INVOICE AUTOMATICALLY
            try:
                invoice_doc.submit()
                frappe.msgprint(
                    _("✅ Sales Invoice {0} created and submitted successfully!").format(
                        f"<a href='/app/sales-invoice/{invoice_doc.name}'>{invoice_doc.name}</a>"
                    ),
                    indicator="green",
                    alert=True
                )
            except Exception as submit_error:
                frappe.log_error(
                    frappe.get_traceback(),
                    "Failed to submit auto-generated Sales Invoice from Repair QC"
                )
                frappe.msgprint(
                    _("⚠️ Sales Invoice {0} created but NOT submitted. Please submit manually.").format(
                        f"<a href='/app/sales-invoice/{invoice_doc.name}'>{invoice_doc.name}</a>"
                    ),
                    indicator="orange",
                    alert=True
                )
            
            # Update summary fields
            self.db_set("summary_invoice", invoice_doc.name, update_modified=False)
            self.reload()
            
        except Exception as e:
            frappe.log_error(
                frappe.get_traceback(),
                "Failed to create Sales Invoice from Repair QC"
            )
            frappe.msgprint(
                _("❌ Failed to create Sales Invoice: {0}").format(str(e)),
                indicator="red",
                alert=True
            )

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
        
        for row in bundle_items:
            item_code = (row.get("item_code") or "").strip()
            if not item_code:
                continue
            qty = flt(row.get("qty") or 0)
            if qty <= 0:
                continue
            rate = self._get_item_rate(item_code)
            amount = rate * qty
            if amount <= 0:
                continue

            item_defaults = frappe.db.get_value(
                "Item",
                item_code,
                ["item_name", "stock_uom", "description"],
                as_dict=True,
            ) or {}
            items.append(
                {
                    "item_code": item_code,
                    "item_name": item_defaults.get("item_name") or item_code,
                    "description": item_defaults.get("description") or item_code,
                    "qty": qty,
                    "uom": item_defaults.get("stock_uom") or "Unit",
                    "rate": rate,
                    "amount": amount,
                }
            )
            seen_codes.add(item_code)

        for row in rows:
            item_code = getattr(row, "item_code", None)
            if not item_code:
                continue
            if item_code in seen_codes:
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

    def _get_bundle_items(self, service_order):
        service_order_type = getattr(service_order, "service_order_type", None)
        if not service_order_type:
            return []

        try:
            from garage.garage.doctype.garage_service_order.garage_service_order import (
                get_bundle_items_for_service_type,
            )
        except Exception:
            return []

        return get_bundle_items_for_service_type(service_order_type)

    def _get_item_rate(self, item_code: str) -> float:
        if not item_code:
            return 0

        standard_rate = flt(frappe.db.get_value("Item", item_code, "standard_rate") or 0)
        if standard_rate:
            return standard_rate

        prices = frappe.get_all(
            "Item Price",
            filters={"item_code": item_code, "selling": 1},
            fields=["price_list_rate"],
            order_by="modified desc",
            limit=1,
        )
        if prices:
            return flt(prices[0].get("price_list_rate") or 0)

        standard_selling = frappe.db.get_value(
            "Item Price",
            {"item_code": item_code, "price_list": "Standard Selling"},
            "price_list_rate",
        )
        return flt(standard_selling or 0)

    def _create_payment_entry_if_finished(self):
        """
        ✅ AUTO-CREATE PAYMENT ENTRY DRAFT when Sales Invoice exists
        """
        # Skip if payment entry already exists
        if self.payment_entry:
            return

        # Get invoice
        invoice = self._get_latest_invoice()
        if not invoice:
            return

        # Handle ERPNext Sales Invoice
        if invoice.get("doctype") == "Sales Invoice":
            try:
                from erpnext.accounts.doctype.payment_entry.payment_entry import (
                    get_payment_entry,
                )
            except Exception:
                frappe.msgprint(
                    _("Payment Entry module not available"),
                    indicator="orange",
                    alert=True
                )
                return

            outstanding_amount = flt(
                invoice.get("outstanding_amount") or invoice.get("grand_total") or 0
            )
            
            if outstanding_amount <= 0:
                frappe.msgprint(
                    _("Invoice already fully paid. No payment entry needed."),
                    indicator="blue",
                    alert=True
                )
                return

            try:
                invoice_doc = frappe.get_doc("Sales Invoice", invoice.get("name"))
            except Exception:
                return

            # Create Payment Entry draft
            try:
                payment_entry = get_payment_entry("Sales Invoice", invoice_doc.name)
                
                # Set branch if field exists
                if self._doctype_has_field("Payment Entry", "branch") and getattr(
                    invoice_doc, "branch", None
                ):
                    payment_entry.branch = invoice_doc.branch
                
                payment_entry.posting_date = nowdate()
                payment_entry.reference_no = f"QC-{self.name}"
                payment_entry.reference_date = nowdate()
                payment_entry.remarks = f"Auto-generated from Repair QC {self.name}"
                
                # ✅ INSERT AS DRAFT (don't submit)
                payment_entry.insert(ignore_permissions=True)
                
                # Update Repair QC with payment entry link
                frappe.db.set_value(
                    self.doctype,
                    self.name,
                    "payment_entry",
                    payment_entry.name,
                    update_modified=False,
                )
                
                frappe.msgprint(
                    _("✅ Payment Entry {0} created as DRAFT. Please review and submit.").format(
                        f"<a href='/app/payment-entry/{payment_entry.name}'>{payment_entry.name}</a>"
                    ),
                    indicator="green",
                    alert=True
                )
                
            except Exception as e:
                frappe.log_error(
                    frappe.get_traceback(),
                    "Failed to create Payment Entry from Repair QC"
                )
                frappe.msgprint(
                    _("❌ Failed to create Payment Entry: {0}").format(str(e)),
                    indicator="red",
                    alert=True
                )
            
            return

        # Handle Garage Payment Entry (if using custom module)
        outstanding_amount = flt(invoice.get("outstanding_amount") or invoice.get("total_amount"))
        if outstanding_amount <= 0:
            return

        try:
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
            
            frappe.msgprint(
                _("✅ Garage Payment Entry {0} created successfully!").format(payment_entry.name),
                indicator="green",
                alert=True
            )
            
        except Exception as e:
            frappe.log_error(
                frappe.get_traceback(),
                "Failed to create Garage Payment Entry from Repair QC"
            )
