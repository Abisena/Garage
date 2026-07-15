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
app_include_css = "/assets/garage/css/garage_desk.css?v=129"
app_include_js = ["/assets/garage/js/route_aliases.js?v=1", "/assets/garage/js/garage_theme.js?v=34"]

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
}
doctype_list_js = {
    "Garage Vehicle": "public/js/garage_vehicle_list.js",
    "Garage Customer": "public/js/garage_customer_list.js",
    "Garage Service Order": "public/js/garage_service_order_list.js",
    "Sales Invoice": "public/js/sales_invoice_list.js",
    "Repair QC": "public/js/repair_qc_list.js",
    "Bank Statement Import": "public/js/bca_bank_statement_import_list.js",
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
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "garage.event.get_events"
# }
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
    "Workspace",
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
            ],
        ]],
    },
    {
        "doctype": "Custom Field",
        "filters": [[
            "name",
            "in",
            [
                "Product Bundle-service_type",
                "User-garage_branch",
            ],
        ]],
    },
    {
        "doctype": "Property Setter",
        "filters": [[
            "name",
            "in",
            [
                "Payment Entry-main-default_print_format",
                "Sales Invoice-main-default_print_format",
                "Payment Entry-main-links_order",
                "Vehicle Handover-main-default_print_format",
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
        "on_update": "garage.utils.vehicle_handover.handle_paid_payment_entry",
        "on_submit": "garage.utils.payment_hooks.handle_payment_entry_submit",
    },
    "Garage Service Order": {
        "on_update": "garage.utils.vehicle_handover.handle_completed_service_order",
    },
    "Item": {
        "on_trash": "garage.utils.item_hooks.block_delete_if_spare_part_requested",
    },
}
