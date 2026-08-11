app_name = "garage"
app_title = "Garage"
app_publisher = "Imogi Developer"
app_description = "For Your manage Garage"
app_email = "imogi.indonesia@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "garage",
# 		"logo": "/assets/garage/logo.png",
# 		"title": "Garage",
# 		"route": "/garage",
# 		"has_permission": "garage.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/garage/css/garage_desk.css?v=365"
app_include_js = ["/assets/garage/js/route_aliases.js?v=1", "/assets/garage/js/garage_theme.js?v=75"]

# include js, css files in header of web template
# web_include_css = "/assets/garage/css/garage.css"
# web_include_js = "/assets/garage/js/garage.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "garage/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    "Product Bundle": "public/js/product_bundle.js",
    "Payment Entry": "public/js/payment_entry.js",
    "Bank Statement Import": "public/js/bank_statement_import.js",
    "Bank Reconciliation Tool": "public/js/bank_reconciliation_tool.js",
    "Bank Transaction": "public/js/bank_transaction.js",
    "Purchase Order": "public/js/purchase_order.js",
    "Purchase Receipt": "public/js/purchase_receipt.js",
    "Purchase Invoice": "public/js/purchase_invoice.js",
    "Sales Order": "public/js/sales_order.js",
    "Sales Invoice": "public/js/sales_invoice.js",
    "Customer": "public/js/customer.js",
}
doctype_list_js = {
    "Garage Branch": "public/js/garage_branch_list.js",
    "Garage Brand": "public/js/garage_brand_list.js",
    "Garage Model": "public/js/garage_model_list.js",
    "Garage Service Bundle": "public/js/garage_service_bundle_list.js",
    "Customer Registration": "public/js/customer_registration_list.js",
    "Garage Vehicle Inspection": "public/js/garage_vehicle_inspection_list.js",
    "Garage Branch Access": "public/js/garage_branch_access_list.js",
    "Garage Service Type": "public/js/garage_service_type_list.js",
    "Garage Vehicle": "public/js/garage_vehicle_list.js",
    "Garage Service Order": "public/js/garage_service_order_list.js",
    "Vehicle Handover": "public/js/vehicle_handover_list.js",
    "Spare Part Request": "public/js/spare_part_request_list.js",
    "Payment Entry": "public/js/payment_entry_list.js",
    "Sales Invoice": "public/js/sales_invoice_list.js",
    "Repair QC": "public/js/repair_qc_list.js",
    "Bank Statement Import": "public/js/bca_bank_statement_import_list.js",
    "Bank Transaction": "public/js/bank_transaction_list.js",
    "Purchase Order": "public/js/purchase_order_list.js",
    "Purchase Invoice": "public/js/purchase_invoice_list.js",
    "Sales Order": "public/js/sales_order_list.js",
    "Customer": "public/js/customer_list.js",
    "Delivery Note": "public/js/delivery_note_list.js",
    "Purchase Receipt": "public/js/purchase_receipt_list.js",
    "Account": "public/js/account_list.js",
    "Item": "public/js/item_list.js",
    "Item Group": "public/js/item_group_list.js",
    "Item Price": "public/js/item_price_list.js",
    "Price List": "public/js/price_list_list.js",
    "Employee": "public/js/employee_list.js",
    "Department": "public/js/department_list.js",
    "Designation": "public/js/designation_list.js",
    "Branch": "public/js/branch_list.js",
    "Salary Component": "public/js/salary_component_list.js",
    "Salary Structure": "public/js/salary_structure_list.js",
    "Salary Structure Assignment": "public/js/salary_structure_assignment_list.js",
    "Payroll Entry": "public/js/payroll_entry_list.js",
    "Salary Slip": "public/js/salary_slip_list.js",
    "Payroll Period": "public/js/payroll_period_list.js",
    "Income Tax Slab": "public/js/income_tax_slab_list.js",
    "Expense Request": "public/js/expense_request_list.js",
    "Bank Account": "public/js/bank_account_list.js",
    "Advanced Expense Request": "public/js/advanced_expense_request_list.js",
    "Administrative Payment Voucher": "public/js/administrative_payment_voucher_list.js",
    "Expense Claim": "public/js/expense_claim_list.js",
    "Expense Approval Setting": "public/js/expense_approval_setting_list.js",
    "Budget": "public/js/budget_list.js",
    "Budget Control Entry": "public/js/budget_control_entry_list.js",
    "Additional Budget Request": "public/js/additional_budget_request_list.js",
    "Budget Approval Setting": "public/js/budget_approval_setting_list.js",
    "Cash Bank Daily Report": "public/js/cash_bank_daily_report_list.js",
    "Internal Charge Request": "public/js/internal_charge_request_list.js",
    "Tax Period Closing": "public/js/tax_period_closing_list.js",
    "Bank Statement Bank List": "public/js/bank_statement_bank_list_list.js",
    "Customer Receipt": "public/js/customer_receipt_list.js",
    "Fiscal Year": "public/js/fiscal_year_list.js",
    "Asset": "public/js/asset_list.js",
    "Asset Category": "public/js/asset_category_list.js",
    "Asset Depreciation Schedule": "public/js/asset_depreciation_schedule_list.js",
    "Asset Value Adjustment": "public/js/asset_value_adjustment_list.js",
    "Asset Repair": "public/js/asset_repair_list.js",
    "Asset Movement": "public/js/asset_movement_list.js",
    "Cost Center": "public/js/cost_center_list.js",
    "Sales Taxes and Charges Template": "public/js/sales_taxes_and_charges_template_list.js",
    "Purchase Taxes and Charges Template": "public/js/purchase_taxes_and_charges_template_list.js",
    "Tax Category": "public/js/tax_category_list.js",
    "Tax Invoice Type": "public/js/tax_invoice_type_list.js",
    "User": "public/js/user_list.js",
    "Role": "public/js/role_list.js",
    "Activity Log": "public/js/activity_log_list.js",
    "Access Log": "public/js/access_log_list.js",
    "Attendance Request": "public/js/attendance_request_list.js",
    "Attendance": "public/js/attendance_list.js",
    "Employee Checkin": "public/js/employee_checkin_list.js",
    "Shift Assignment": "public/js/shift_assignment_list.js",
    "Leave Allocation": "public/js/leave_allocation_list.js",
    "Company": "public/js/company_list.js",
    "Supplier": "public/js/supplier_list.js",
    "Warehouse": "public/js/warehouse_list.js",
    "Tax Withholding Category": "public/js/tax_withholding_category_list.js",
}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Redirect legacy routes
# website_route_rules = [
#     {"from_route": "/customer-entry", "to_route": "/garage/intake"},
# ]

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "garage/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
home_page = "login"

# website user home page (by Role)
# role_home_page = {}

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "garage.utils.jinja_methods",
# 	"filters": "garage.utils.jinja_filters"
# }

jinja = {
    "methods": [
        "garage.utils.jinja.get_portal_nav_items",
        "garage.utils.jinja.rupiah_terbilang",
        "garage.utils.jinja.get_payment_receipt_context",
        "garage.utils.jinja.get_nota_service_context",
        "garage.utils.jinja.get_vehicle_handover_context",
        "garage.utils.jinja.get_service_order_print_context",
        "garage.utils.jinja.get_bank_statement_import_print_context",
        "garage.utils.jinja.get_purchase_order_print_context",
        "garage.utils.jinja.get_purchase_receipt_print_context",
        "garage.utils.jinja.get_purchase_invoice_print_context",
        "garage.utils.jinja.get_sales_order_print_context",
    ]
}

# Installation
# ------------

# before_install = "garage.install.before_install"
# after_install = "garage.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "garage.uninstall.before_uninstall"
# after_uninstall = "garage.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "garage.utils.before_app_install"
# after_app_install = "garage.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "garage.utils.before_app_uninstall"
# after_app_uninstall = "garage.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "garage.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# Scheduled Tasks
# ---------------

scheduler_events = {
	"hourly": [
		"garage.garage.doctype.customer_registration.customer_registration.process_booking_registrations"
	]
}

# Testing
# -------

# before_tests = "garage.install.before_tests"

# Overriding Methods
# ------------------------------
#
override_whitelisted_methods = {
    "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_purchase_invoice": (
        "garage.utils.purchase_receipt_invoice_hooks.make_purchase_invoice_with_services"
    ),
    "erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice": (
        "garage.utils.sales_order_invoice_hooks.make_sales_invoice_with_vehicle"
    ),
}
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "garage.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["garage.utils.before_request"]
# after_request = ["garage.utils.after_request"]

# Job Events
# ----------
# before_job = ["garage.utils.before_job"]
# after_job = ["garage.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"garage.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

fixtures = [
    {
        "doctype": "Workspace",
        "filters": [["module", "=", "Garage"]],
    },
    {
        # Employee Checkin listview badge text ("Off-Shift" -> "Non Shift")
        # comes from hrms core's hardcoded __("Off-Shift") in
        # employee_checkin_list.js, not the offshift field's label - a
        # Property Setter on the field label (see below) doesn't touch it.
        # Overriding the string via Translation is the only config-only way.
        "doctype": "Translation",
        "filters": [
            ["source_text", "=", "Off-Shift"],
            ["language", "=", "en"],
        ],
    },
    {
        "doctype": "Print Format",
        "filters": [[
            "name",
            "in",
            [
                "Garage Vehicle Inspection Report",
                "Garage Service Order Print",
                "Garage Sales Invoice Print",
                "Garage Spare Part Request Print",
                "Garage Vehicle Handover Print",
                "Garage Payment Receipt",
                "Nota Service",
                "Garage Bank Statement Import Print",
                "Purchase Order Print",
                "Purchase Receipt Print",
                "Purchase Invoice Print",
                "Sales Order Print",
            ],
        ]],
    },
    {
        # Annual Payroll History (payroll_indonesia's own custom:1
        # doctype) can't use the doctype_list_js hooks.py hook -
        # FormMeta.add_code() returns early for any custom doctype before
        # ever processing that hook, so a garage .js file registered there
        # is silently never loaded. Client Script (view: "List") is the
        # supported alternative for custom doctypes instead.
        "doctype": "Client Script",
        "filters": [["name", "in", ["Annual Payroll History-List"]]],
    },
    {
        "doctype": "Custom Field",
        "filters": [[
            "name",
            "in",
            [
                "Product Bundle-service_type",
                "Item Price-column_break_note_ref",
                "User-garage_branch",
                "Sales Invoice-nota_service_printed",
                "Sales Invoice-no_polisi",
                "Sales Invoice-service_order",
                "Sales Invoice-customer_number",
                "Sales Invoice Item-ppn_percent",
                "Payment Entry-no_polisi",
                "Bank Transaction-balance",
                "Bank Statement Import-skipped_row_count",
                "Purchase Order-discount_mode",
                "Purchase Order-ppn_include",
                "Purchase Order-ppn_col_break",
                "Purchase Order-ppn_exclude",
                "Purchase Receipt-ppn_include",
                "Purchase Receipt-ppn_col_break",
                "Purchase Receipt-ppn_exclude",
                "Purchase Invoice-ppn_include",
                "Purchase Invoice-ppn_col_break",
                "Purchase Invoice-ppn_exclude",
                "Purchase Order Item-subject_to_pph23",
                "Purchase Order Item-amount_after_tax",
                "Purchase Invoice-discount_mode",
                "Purchase Invoice Item-amount_after_tax",
                "Payment Entry-reference_purchase_invoice",
                "Sales Order-discount_mode",
                "Sales Order Item-amount_after_tax",
                "Sales Order-customer_number",
                "Sales Order-petugas_part",
                "Sales Order-vehicle",
                "Customer-customer_number",
                "Customer-garage_profile_section",
                "Customer-is_vip",
                "Customer-preferred_contact_method",
                "Customer-marketing_source",
                "Customer-id_number",
                "Customer-address_line1",
                "Customer-address_line2",
                "Customer-city",
                "Customer-state",
                "Customer-postal_code",
                "Customer-country",
                "Customer-branch",
                "Customer-notes",
                "Customer-registration_date",
                "Customer-registration_time",
                "Sales Order-main-default_print_format",
            ],
        ]],
    },
    {
        "doctype": "Property Setter",
        "filters": [[
            "name",
            "in",
            [
                "Purchase Order-cost_center-hidden",
                "Purchase Order-project-hidden",
                "Purchase Order-currency-hidden",
                "Purchase Order-currency-reqd",
                "Purchase Order-conversion_rate-hidden",
                "Purchase Order-conversion_rate-reqd",
                "Purchase Order-tax_category-hidden",
                "Purchase Order-taxes_and_charges-hidden",
                "Purchase Order-section_break_52-hidden",
                "Purchase Order-main-field_order",
                "Purchase Receipt-currency-reqd",
                "Purchase Receipt-conversion_rate-reqd",
                "Purchase Receipt-base_net_total-reqd",
                "Purchase Receipt-tax_category-hidden",
                "Purchase Receipt-taxes_and_charges-hidden",
                "Purchase Receipt-taxes_section-hidden",
                "Purchase Receipt-main-field_order",
                "Purchase Invoice-tax_category-hidden",
                "Purchase Invoice-taxes_and_charges-hidden",
                "Purchase Invoice-section_break_51-hidden",
                "Purchase Invoice-main-field_order",
                "Purchase Order-buying_price_list-hidden",
                "Purchase Order-price_list_currency-hidden",
                "Purchase Order-plc_conversion_rate-hidden",
                "Purchase Order-ignore_pricing_rule-hidden",
                "Purchase Order-total_net_weight-hidden",
                "Purchase Order-base_total-hidden",
                "Purchase Order-base_net_total-hidden",
                "Purchase Order-net_total-hidden",
                "Purchase Order-shipping_rule-hidden",
                "Purchase Order-incoterm-hidden",
                "Purchase Order-named_place-hidden",
                "Purchase Order-base_grand_total-hidden",
                "Purchase Order-base_rounding_adjustment-hidden",
                "Purchase Order-base_in_words-hidden",
                "Purchase Order-base_rounded_total-hidden",
                "Purchase Order-grand_total-hidden",
                "Purchase Order-rounding_adjustment-hidden",
                "Purchase Order-rounded_total-hidden",
                "Purchase Order-disable_rounded_total-hidden",
                "Purchase Order-in_words-hidden",
                "Purchase Order-advance_paid-hidden",
                "Purchase Order-apply_discount_on-hidden",
                "Purchase Order-base_discount_amount-hidden",
                "Purchase Order-additional_discount_percentage-hidden",
                "Purchase Order-discount_amount-hidden",
                "Purchase Order-other_charges_calculation-hidden",
                "Sales Order-cost_center-hidden",
                "Sales Order-project-hidden",
                "Sales Order-conversion_rate-hidden",
                "Sales Order-price_list_currency-hidden",
                "Sales Order-plc_conversion_rate-hidden",
                "Sales Order-ignore_pricing_rule-hidden",
                "Sales Order-last_scanned_warehouse-hidden",
                "Sales Order-reserve_stock-hidden",
                "Sales Order-total_qty-hidden",
                "Sales Order-total_net_weight-hidden",
                "Sales Order-base_total-hidden",
                "Sales Order-base_net_total-hidden",
                "Sales Order-total-hidden",
                "Sales Order-net_total-hidden",
                "Sales Order-shipping_rule-hidden",
                "Sales Order-incoterm-hidden",
                "Sales Order-named_place-hidden",
                "Sales Order-base_grand_total-hidden",
                "Sales Order-base_rounding_adjustment-hidden",
                "Sales Order-base_rounded_total-hidden",
                "Sales Order-base_in_words-hidden",
                "Sales Order-grand_total-hidden",
                "Sales Order-rounding_adjustment-hidden",
                "Sales Order-rounded_total-hidden",
                "Sales Order-in_words-hidden",
                "Sales Order-advance_paid-hidden",
                "Sales Order-disable_rounded_total-hidden",
                "Sales Order-apply_discount_on-hidden",
                "Sales Order-base_discount_amount-hidden",
                "Sales Order-coupon_code-hidden",
                "Sales Order-additional_discount_percentage-hidden",
                "Sales Order-discount_amount-hidden",
                "Sales Order-other_charges_calculation-hidden",
                "Delivery Note-cost_center-hidden",
                "Delivery Note-project-hidden",
                "Delivery Note-currency-hidden",
                "Delivery Note-conversion_rate-hidden",
                "Delivery Note-selling_price_list-hidden",
                "Delivery Note-price_list_currency-hidden",
                "Delivery Note-plc_conversion_rate-hidden",
                "Delivery Note-ignore_pricing_rule-hidden",
                "Delivery Note-total_qty-hidden",
                "Delivery Note-total_net_weight-hidden",
                "Delivery Note-base_total-hidden",
                "Delivery Note-base_net_total-hidden",
                "Delivery Note-total-hidden",
                "Delivery Note-net_total-hidden",
                "Delivery Note-shipping_rule-hidden",
                "Delivery Note-incoterm-hidden",
                "Delivery Note-named_place-hidden",
                "Delivery Note-base_grand_total-hidden",
                "Delivery Note-base_rounding_adjustment-hidden",
                "Delivery Note-base_rounded_total-hidden",
                "Delivery Note-base_in_words-hidden",
                "Delivery Note-grand_total-hidden",
                "Delivery Note-rounding_adjustment-hidden",
                "Delivery Note-rounded_total-hidden",
                "Delivery Note-in_words-hidden",
                "Delivery Note-disable_rounded_total-hidden",
                "Delivery Note-apply_discount_on-hidden",
                "Delivery Note-base_discount_amount-hidden",
                "Delivery Note-additional_discount_percentage-hidden",
                "Delivery Note-discount_amount-hidden",
                "Delivery Note-other_charges_calculation-hidden",
                "Delivery Note-transporter-hidden",
                "Delivery Note-driver-hidden",
                "Delivery Note-lr_no-hidden",
                "Delivery Note-vehicle_no-hidden",
                "Delivery Note-transporter_name-hidden",
                "Delivery Note-driver_name-hidden",
                "Delivery Note-lr_date-hidden",
                "Delivery Note-po_no-hidden",
                "Delivery Note-po_date-hidden",
                "Delivery Note-sales_partner-hidden",
                "Delivery Note-amount_eligible_for_commission-hidden",
                "Delivery Note-commission_rate-hidden",
                "Delivery Note-total_commission-hidden",
                "Delivery Note-sales_team-hidden",
                "Purchase Receipt-cost_center-hidden",
                "Purchase Receipt-project-hidden",
                "Purchase Receipt-currency-hidden",
                "Purchase Receipt-conversion_rate-hidden",
                "Purchase Receipt-buying_price_list-hidden",
                "Purchase Receipt-price_list_currency-hidden",
                "Purchase Receipt-plc_conversion_rate-hidden",
                "Purchase Receipt-ignore_pricing_rule-hidden",
                "Purchase Receipt-total_net_weight-hidden",
                "Purchase Receipt-base_total-hidden",
                "Purchase Receipt-base_net_total-hidden",
                "Purchase Receipt-net_total-hidden",
                "Purchase Receipt-shipping_rule-hidden",
                "Purchase Receipt-incoterm-hidden",
                "Purchase Receipt-named_place-hidden",
                "Purchase Receipt-base_grand_total-hidden",
                "Purchase Receipt-base_rounding_adjustment-hidden",
                "Purchase Receipt-base_rounded_total-hidden",
                "Purchase Receipt-base_in_words-hidden",
                "Purchase Receipt-in_words-hidden",
                "Purchase Receipt-apply_discount_on-hidden",
                "Purchase Receipt-base_discount_amount-hidden",
                "Purchase Receipt-additional_discount_percentage-hidden",
                "Purchase Receipt-discount_amount-hidden",
                "Purchase Receipt-other_charges_calculation-hidden",
                "Purchase Receipt-pricing_rules-hidden",
                "Purchase Receipt-get_current_stock-hidden",
                "Purchase Receipt-supplied_items-hidden",
                "Purchase Receipt-auto_repeat-hidden",
                "Purchase Receipt-letter_head-hidden",
                "Purchase Receipt-group_same_items-hidden",
                "Purchase Receipt-select_print_heading-hidden",
                "Purchase Receipt-language-hidden",
                "Purchase Invoice-cost_center-hidden",
                "Purchase Invoice-project-hidden",
                "Purchase Invoice-currency-hidden",
                "Purchase Invoice-conversion_rate-hidden",
                "Purchase Invoice-use_transaction_date_exchange_rate-hidden",
                "Purchase Invoice-buying_price_list-hidden",
                "Purchase Invoice-price_list_currency-hidden",
                "Purchase Invoice-plc_conversion_rate-hidden",
                "Purchase Invoice-ignore_pricing_rule-hidden",
                "Purchase Invoice-scan_barcode-hidden",
                "Purchase Invoice-last_scanned_warehouse-hidden",
                "Purchase Invoice-update_stock-hidden",
                "Purchase Invoice-set_warehouse-hidden",
                "Purchase Invoice-set_from_warehouse-hidden",
                "Purchase Invoice-is_subcontracted-hidden",
                "Purchase Invoice-rejected_warehouse-hidden",
                "Purchase Invoice-supplier_warehouse-hidden",
                "Purchase Invoice-total-hidden",
                "Purchase Invoice-net_total-hidden",
                "Purchase Invoice-shipping_rule-hidden",
                "Purchase Invoice-incoterm-hidden",
                "Purchase Invoice-named_place-hidden",
                "Purchase Invoice-grand_total-hidden",
                "Purchase Invoice-rounding_adjustment-hidden",
                "Purchase Invoice-use_company_roundoff_cost_center-hidden",
                "Purchase Invoice-rounded_total-hidden",
                "Purchase Invoice-in_words-hidden",
                "Purchase Invoice-total_advance-hidden",
                "Purchase Invoice-outstanding_amount-hidden",
                "Purchase Invoice-disable_rounded_total-hidden",
                "Purchase Invoice-apply_discount_on-hidden",
                "Purchase Invoice-base_discount_amount-hidden",
                "Purchase Invoice-additional_discount_percentage-hidden",
                "Purchase Invoice-discount_amount-hidden",
                "Purchase Invoice-other_charges_calculation-hidden",
                "Purchase Invoice-pricing_rules-hidden",
                "Purchase Invoice-supplied_items-hidden",
                "Purchase Invoice-subscription-hidden",
                "Purchase Invoice-auto_repeat-hidden",
                "Purchase Invoice-update_auto_repeat_reference-hidden",
                "Purchase Invoice-from_date-hidden",
                "Purchase Invoice-to_date-hidden",
                "Purchase Invoice-letter_head-hidden",
                "Purchase Invoice-group_same_items-hidden",
                "Purchase Invoice-select_print_heading-hidden",
                "Purchase Invoice-language-hidden",
                "Payment Entry-apply_tax_withholding_amount-hidden",
                "Payment Entry-tax_withholding_category-hidden",
                "Payment Entry-main-default_print_format",
                "Sales Invoice-main-default_print_format",
                "Payment Entry-main-links_order",
                "Payment Entry-section_break_56-hidden",
                "Payment Entry-section_break_60-hidden",
                "Payment Entry-accounting_dimensions_section-hidden",
                "Payment Entry-company-hidden",
                "Payment Entry-paid_from_account_currency-hidden",
                "Payment Entry-paid_to_account_currency-hidden",
                "Payment Entry-source_exchange_rate-hidden",
                "Payment Entry-target_exchange_rate-hidden",
                "Payment Entry-base_paid_amount-hidden",
                "Payment Entry-base_received_amount-hidden",
                "Payment Entry-base_total_allocated_amount-hidden",
                "Payment Entry-base_in_words-hidden",
                "Payment Entry-letter_head-hidden",
                "Payment Entry-print_heading-hidden",
                "Payment Entry-payment_order-hidden",
                "Payment Entry-auto_repeat-hidden",
                "Payment Entry-project-hidden",
                "Payment Entry-cost_center-hidden",
                "Payment Entry-company-reqd",
                "Payment Entry-paid_from_account_currency-reqd",
                "Payment Entry-paid_to_account_currency-reqd",
                "Payment Entry-source_exchange_rate-reqd",
                "Payment Entry-target_exchange_rate-reqd",
                "Payment Entry-base_paid_amount-reqd",
                "Payment Entry-base_received_amount-reqd",
                "Purchase Order-company-reqd",
                "Purchase Receipt-company-reqd",
                "Purchase Invoice-company-reqd",
                "Vehicle Handover-main-default_print_format",
                "Sales Invoice-main-field_order",
                "Sales Invoice-totals-hidden",
                "Sales Invoice-company-hidden",
                "Sales Invoice-company-reqd",
                "Sales Invoice-accounting_dimensions_section-hidden",
                "Sales Invoice-currency_and_price_list-hidden",
                "Sales Invoice-customer_name-read_only",
                "Sales Invoice-tax_id-read_only",
                "Sales Invoice-tax_id-hidden",
                "Sales Invoice-customer_name-hidden",
                "Sales Invoice-company_tax_id-hidden",
                "Sales Invoice-total_qty-hidden",
                "Sales Invoice-total_net_weight-hidden",
                "Sales Invoice-section_break_30-hidden",
                "Sales Invoice-base_total-hidden",
                "Sales Invoice-base_net_total-hidden",
                "Sales Invoice-total-hidden",
                "Sales Invoice-net_total-hidden",
                "Sales Invoice-shipping_rule-hidden",
                "Sales Invoice-incoterm-hidden",
                "Sales Invoice-named_place-hidden",
                "Sales Invoice-section_break_40-hidden",
                "Sales Invoice-section_break_43-hidden",
                "Sales Invoice-section_break_49-hidden",
                "Sales Invoice-apply_discount_on-hidden",
                "Sales Invoice-base_discount_amount-hidden",
                "Sales Invoice-is_cash_or_non_trade_discount-hidden",
                "Sales Invoice-additional_discount_percentage-hidden",
                "Sales Invoice-discount_amount-hidden",
                "Sales Invoice-other_charges_calculation-hidden",
                "Sales Invoice-tax_id-print_hide",
                "Sales Invoice-company_tax_id-read_only",
                "Sales Invoice-update_stock-hidden",
                "Sales Invoice-is_pos-hidden",
                "Sales Invoice-pos_profile-hidden",
                "Sales Invoice-is_consolidated-hidden",
                "Sales Invoice-is_return-hidden",
                "Sales Invoice-return_against-hidden",
                "Sales Invoice-update_outstanding_for_self-hidden",
                "Sales Invoice-update_billed_amount_in_sales_order-hidden",
                "Sales Invoice-update_billed_amount_in_delivery_note-hidden",
                "Sales Invoice-is_debit_note-hidden",
                "Sales Invoice Item-main-field_order",
                "Sales Invoice Item-item_code-columns",
                "Sales Invoice Item-qty-columns",
                "Sales Invoice Item-rate-columns",
                "Sales Invoice Item-amount-columns",
                "Sales Invoice Item-discount_percentage-columns",
                "Sales Invoice Item-discount_percentage-in_list_view",
                "Sales Invoice Item-discount_percentage-label",
                "Sales Invoice Item-description-columns",
                "Sales Invoice Item-description-in_list_view",
                "Sales Invoice Item-uom-columns",
                "Sales Invoice Item-uom-in_list_view",
                "Sales Order-accounting_dimensions_section-hidden",
                "Sales Order-currency-default",
                "Sales Order-currency-hidden",
                "Sales Order-selling_price_list-default",
                "Sales Order-selling_price_list-hidden",
                "Purchase Order-accounting_dimensions_section-hidden",
                "Purchase Order-currency_and_price_list-hidden",
                "Purchase Order-scan_barcode-hidden",
                "Sales Invoice-posting_time-hidden",
                "Sales Invoice-set_posting_time-hidden",
                "Sales Invoice-scan_barcode-hidden",
                "Sales Invoice-time_sheet_list-hidden",
                "Bank Statement Import-import_log_section-hidden",
                "Journal Entry-multi_currency-hidden",
                "Bank Reconciliation Tool-account_opening_balance-label",
                "Bank Transaction-excluded_fee-description",
                "Bank Transaction-currency-hidden",
                "Bank Statement Import-main-default_print_format",
                "Bank Transaction-status-options",
                "Purchase Order-items-allow_bulk_edit",
                "Purchase Order-company-hidden",
                "Purchase Order-discount_section-hidden",
                "Purchase Order-sb_last_purchase-hidden",
                "Purchase Order-totals_section-hidden",
                "Purchase Order-total_qty-hidden",
                "Purchase Order-total-hidden",
                "Purchase Order Item-item_tax_template-in_list_view",
                "Purchase Order Item-discount_amount-in_list_view",
                "Purchase Order Item-discount_percentage-in_list_view",
                "Purchase Order Item-schedule_date-in_list_view",
                "Purchase Order Item-description-in_list_view",
                "Purchase Order Item-discount_amount-columns",
                "Purchase Order Item-rate-columns",
                "Purchase Order Item-item_tax_template-columns",
                "Purchase Order Item-main-field_order",
                "Purchase Order Item-item_tax_template-label",
                "Purchase Order-set_warehouse-hidden",
                "Purchase Order Item-description-columns",
                "Purchase Order Item-warehouse-in_list_view",
                "Purchase Order Item-discount_percentage-columns",
                "Purchase Order Item-discount_amount-depends_on",
                "Purchase Order Item-discount_percentage-depends_on",
                "Purchase Order Item-price_list_rate-in_list_view",
                "Purchase Order Item-price_list_rate-label",
                "Purchase Order Item-price_list_rate-columns",
                "Purchase Order Item-rate-label",
                "Purchase Order Item-rate-read_only",
                "Purchase Order Item-item_code-columns",
                "Purchase Order Item-rate-in_list_view",
                "Purchase Order Item-amount-label",
                "Purchase Order Item-amount-columns",
                "Purchase Order Item-received_qty-in_list_view",
                "Purchase Order Item-received_qty-columns",
                "Purchase Order-totals-hidden",
                "Purchase Order-schedule_date-label",
                "Purchase Receipt-company-hidden",
                "Purchase Receipt-accounting_dimensions_section-hidden",
                "Purchase Receipt-currency_and_price_list-hidden",
                "Purchase Receipt-pricing_rule_details-hidden",
                "Purchase Receipt-raw_material_details-hidden",
                "Purchase Receipt-subscription_detail-hidden",
                "Purchase Receipt-printing_settings-hidden",
                "Purchase Receipt-scan_barcode-hidden",
                "Purchase Receipt-last_scanned_warehouse-hidden",
                "Purchase Receipt-set_from_warehouse-hidden",
                "Purchase Receipt-is_subcontracted-hidden",
                "Purchase Receipt-supplier_warehouse-hidden",
                "Purchase Receipt-subcontracting_receipt-hidden",
                "Purchase Receipt-apply_putaway_rule-hidden",
                "Purchase Receipt-is_internal_supplier-hidden",
                "Purchase Receipt-represents_company-hidden",
                "Purchase Receipt-inter_company_reference-hidden",
                "Purchase Receipt-section_break_42-hidden",
                "Purchase Receipt-section_break0-hidden",
                "Purchase Receipt-totals-hidden",
                "Purchase Receipt-total_qty-hidden",
                "Purchase Receipt-total-hidden",
                "Purchase Receipt-grand_total-hidden",
                "Purchase Receipt-rounding_adjustment-hidden",
                "Purchase Receipt-rounded_total-hidden",
                "Purchase Receipt-disable_rounded_total-hidden",
                "Purchase Receipt-items-allow_bulk_edit",
                "Purchase Receipt-section_break_46-hidden",
                "Purchase Receipt-rejected_warehouse-hidden",
                "Purchase Receipt-set_warehouse-default",
                "Purchase Receipt-main-field_order",
                "Item Price-main-field_order",
                "Purchase Receipt Item-description-in_list_view",
                "Purchase Receipt Item-description-columns",
                "Purchase Receipt Item-item_code-columns",
                "Purchase Receipt Item-main-field_order",
                "Purchase Order-status-options",
                "Purchase Order-main-default_print_format",
                "Purchase Receipt-main-default_print_format",
                "Purchase Invoice-main-default_print_format",
                "Purchase Invoice-items-allow_bulk_edit",
                "Purchase Invoice-company-hidden",
                "Purchase Invoice-is_paid-hidden",
                "Purchase Invoice-is_return-hidden",
                "Purchase Invoice-accounting_dimensions_section-hidden",
                "Purchase Invoice-currency_and_price_list-hidden",
                "Purchase Invoice-sec_warehouse-hidden",
                "Purchase Invoice-section_break_51-hidden",
                "Purchase Invoice-pricing_rule_details-hidden",
                "Purchase Invoice-raw_materials_supplied-hidden",
                "Purchase Invoice-subscription_section-hidden",
                "Purchase Invoice-printing_settings-hidden",
                "Purchase Invoice-total_qty-hidden",
                "Purchase Invoice-total_net_weight-hidden",
                "Purchase Invoice-base_total-hidden",
                "Purchase Invoice-base_net_total-hidden",
                "Purchase Invoice-base_grand_total-hidden",
                "Purchase Invoice-base_rounding_adjustment-hidden",
                "Purchase Invoice-base_rounded_total-hidden",
                "Purchase Invoice-base_in_words-hidden",
                "Purchase Invoice-base_write_off_amount-hidden",
                "Purchase Invoice-base_paid_amount-hidden",
                "Purchase Invoice-is_internal_supplier-hidden",
                "Purchase Invoice-represents_company-hidden",
                "Purchase Invoice-inter_company_invoice_reference-hidden",
                "Purchase Invoice-supplier_group-hidden",
                "Purchase Invoice-unrealized_profit_loss_account-hidden",
                "Purchase Invoice-section_break_26-hidden",
                "Purchase Invoice-totals-hidden",
                "Purchase Invoice-section_break_49-hidden",
                "Purchase Invoice-section_break_44-hidden",
                "Purchase Invoice Item-item_code-columns",
                "Purchase Invoice Item-item_code-label",
                "Purchase Invoice Item-description-in_list_view",
                "Purchase Invoice Item-description-columns",
                "Purchase Invoice Item-qty-label",
                "Purchase Invoice Item-qty-columns",
                "Purchase Invoice Item-received_qty-in_list_view",
                "Purchase Invoice Item-received_qty-columns",
                "Purchase Invoice Item-uom-in_list_view",
                "Purchase Invoice Item-uom-columns",
                "Purchase Invoice Item-price_list_rate-in_list_view",
                "Purchase Invoice Item-price_list_rate-label",
                "Purchase Invoice Item-price_list_rate-columns",
                "Purchase Invoice Item-discount_percentage-in_list_view",
                "Purchase Invoice Item-discount_percentage-columns",
                "Purchase Invoice Item-discount_amount-in_list_view",
                "Purchase Invoice Item-discount_amount-columns",
                "Purchase Invoice Item-rate-label",
                "Purchase Invoice Item-rate-read_only",
                "Purchase Invoice Item-rate-in_list_view",
                "Purchase Invoice Item-rate-columns",
                "Purchase Invoice Item-amount-label",
                "Purchase Invoice Item-amount-columns",
                "Purchase Invoice Item-item_tax_template-in_list_view",
                "Purchase Invoice Item-item_tax_template-label",
                "Purchase Invoice Item-item_tax_template-columns",
                "Sales Order-currency_and_price_list-hidden",
                "Sales Order-scan_barcode-hidden",
                "Sales Order-section_break_40-hidden",
                "Sales Order-section_break_43-hidden",
                "Sales Order-totals-hidden",
                "Sales Order-section_break_48-hidden",
                "Sales Order-po_no-hidden",
                "Sales Order-po_date-hidden",
                "Sales Order-section_break_31-hidden",
                "Sales Order-main-field_order",
                "Customer-main-search_fields",
                "Sales Order Item-delivery_date-in_list_view",
                "Sales Order Item-warehouse-in_list_view",
                "Sales Order-set_warehouse-default",
                "Sales Order Item-description-in_list_view",
                "Sales Order Item-description-columns",
                "Sales Order-company-hidden",
                "Sales Order-company-reqd",
                "Sales Order-sec_warehouse-hidden",
                "Sales Order Item-discount_percentage-in_list_view",
                "Sales Order Item-discount_percentage-columns",
                "Sales Order Item-discount_percentage-depends_on",
                "Sales Order Item-discount_amount-in_list_view",
                "Sales Order Item-discount_amount-columns",
                "Sales Order Item-discount_amount-depends_on",
                "Sales Order Item-item_tax_template-label",
                "Sales Order Item-item_tax_template-columns",
                "Sales Order Item-item_tax_template-in_list_view",
                "Sales Order Item-price_list_rate-label",
                "Sales Order Item-price_list_rate-in_list_view",
                "Sales Order Item-price_list_rate-columns",
                "Sales Order Item-rate-label",
                "Sales Order Item-rate-columns",
                "Sales Order Item-rate-read_only",
                "Sales Order Item-rate-in_list_view",
                "Sales Order Item-amount-label",
                "Sales Order Item-amount-columns",
                "Sales Order Item-uom-in_list_view",
                "Sales Order Item-uom-columns",
                "Sales Order Item-item_code-columns",
                "Sales Order Item-main-field_order",
                "Delivery Note-currency_and_price_list-hidden",
                "Delivery Note-scan_barcode-hidden",
                "Delivery Note-section_break_41-hidden",
                "Delivery Note-section_break_44-hidden",
                "Delivery Note-totals-hidden",
                "Delivery Note-section_break_49-hidden",
                "Delivery Note-customer_po_details-hidden",
                "Delivery Note-section_break_31-hidden",
                "Delivery Note-company-hidden",
                "Delivery Note-company-reqd",
                "Delivery Note-transporter_info-hidden",
                "Delivery Note-sales_team_section_break-hidden",
                "Delivery Note-section_break1-hidden",
                "Delivery Note-accounting_dimensions_section-hidden",
                "Delivery Note-main-field_order",
                "Delivery Note-set_posting_time-hidden",
                "Delivery Note-set_warehouse-default",
                "Customer-main-field_order",
                "Customer-more_info-hidden",
                "Customer-defaults_tab-hidden",
                "Customer-marketing_source-hidden",
                "Customer-address_contacts-hidden",
                "Customer-mobile_no-fieldtype",
                "Customer-email_id-fieldtype",
                "Customer-internal_customer_section-hidden",
                "Customer-garage_profile_section-hidden",
                "Employee Checkin-offshift-label",
            ],
        ]],
    },
    {
        "doctype": "DocType Link",
        "filters": [[
            "parent",
            "=",
            "Payment Entry",
        ], [
            "custom",
            "=",
            1,
        ]],
    },
]

doc_events = {
    "Bank Statement Import": {
        "autoname": "garage.utils.bca_bank_statement_import.set_import_naming",
        "validate": "garage.utils.bca_bank_statement_import.clean_import_file",
        "on_change": "garage.utils.bca_bank_statement_import.delete_if_not_success",
    },
    "Item Tax Template": {
        "autoname": "garage.utils.item_tax_template.drop_company_suffix_from_name",
    },
    "File": {
        "validate": "garage.utils.bca_bank_statement_import.clean_attached_file",
    },
    "Bank Transaction": {
        "on_change": "garage.utils.bank_reconciliation.mark_partial_reconcile",
    },
    "Purchase Receipt": {
        "before_validate": "garage.utils.purchase_receipt_hooks.strip_service_items",
    },
    "Garage Vehicle Inspection": {
        "on_update": "garage.utils.service_order_status.sync_from_inspection",
    },
    "Spare Part Request": {
        "on_update": "garage.utils.service_order_status.sync_from_spare_part_request",
    },
    "Repair QC": {
        "on_update": "garage.utils.service_order_status.sync_from_repair_qc",
    },
    # ==========================================
    # MODIFIED: Sales Invoice sekarang trigger completion
    # ==========================================
    "Garage Sales Invoice": {
        "on_update": "garage.utils.sales_invoice_handler.handle_sales_invoice_paid",
    },
    "Sales Invoice": {
        "on_update": "garage.utils.sales_invoice_handler.handle_sales_invoice_paid",
    },
    "Garage Payment Entry": {
        "on_update": "garage.utils.sales_invoice_handler.handle_sales_invoice_paid",
    },
    "Payment Entry": {
        "validate": "garage.utils.payment_hooks.sync_no_polisi",
        "on_update": "garage.utils.vehicle_handover.handle_paid_payment_entry",
        "on_submit": "garage.utils.payment_hooks.handle_payment_entry_submit",
        "before_cancel": "garage.utils.reconciliation_guard.block_cancel_if_reconciled",
    },
    "Journal Entry": {
        "before_cancel": "garage.utils.reconciliation_guard.block_cancel_if_reconciled",
    },
    "Garage Service Order": {
        "on_update": "garage.utils.vehicle_handover.handle_completed_service_order",
    },
    "Item": {
        "on_trash": "garage.utils.item_hooks.block_delete_if_spare_part_requested",
    },
    "Purchase Order": {
        "validate": [
            "garage.utils.purchase_order_hooks.set_default_warehouse",
            "garage.utils.purchase_order_tax_withholding.fix_service_only_withholding",
        ],
    },
    "Purchase Invoice": {
        "validate": [
            "garage.utils.purchase_order_tax_withholding.fix_service_only_withholding",
        ],
    },
    "Sales Order": {
        "before_submit": "garage.utils.sales_order_hooks.set_petugas_part",
    },
    "Customer": {
        "validate": "garage.utils.customer_hooks.uppercase_customer_name",
        "before_insert": [
            "garage.utils.customer_hooks.uppercase_customer_name",
            "garage.utils.customer_hooks.set_customer_number",
        ],
        "on_update": "garage.utils.customer_hooks.sync_primary_address",
    },
}
