"""Reproduce the Customer form layout that already exists on the reference
deployment this app was cloned from (see [[project_garage_customer_consolidated]]
and add_customer_profile_fields.py), but whose Property Setters - unlike the
Custom Fields - were never captured in this app's fixtures either.

On the reference site, "New Customer" shows the garage-specific fields
(city/state/country/id_number/postal_code/address_line1/2 on the left,
preferred_contact_method/customer_type/customer_group/is_vip/
is_internal_customer/mobile_no/email_id on the right) flowing directly in
the Details tab, with ERPNext's own Defaults/More Information/Internal
Customer/Address & Contact-summary sections tucked out of the way since a
garage customer never needs price lists, loyalty tiers, leads, etc. up
front. Without this, the same fields exist (add_customer_profile_fields
already created them) but sit inside a collapsed "Profil Garage" section
underneath the full, unfiltered core ERPNext layout - functionally fine,
just not what the reference UI looks like.

This patch reconstructs that via `field_order` (moves the fields) plus a
handful of `hidden` Property Setters (tucks the now-empty/irrelevant core
sections away) and switches `mobile_no`/`email_id` from ERPNext's default
"Read Only" fieldtype to "Data" - on a brand new Customer there's no Contact
to fetch them from yet, so Read Only would just render as a permanently
blank, uneditable box.
"""

from __future__ import annotations

import json

import frappe

FIELD_ORDER = [
	"basic_info",
	"naming_series",
	"customer_name",
	"customer_number",
	"city",
	"state",
	"country",
	"id_number",
	"postal_code",
	"address_line1",
	"address_line2",
	"column_break0",
	"preferred_contact_method",
	"customer_type",
	"customer_group",
	"is_vip",
	"is_internal_customer",
	"mobile_no",
	"email_id",
	"more_info",
	"salutation",
	"territory",
	"gender",
	"lead_name",
	"opportunity_name",
	"prospect_name",
	"account_manager",
	"image",
	"garage_profile_section",
	"branch",
	"registration_date",
	"registration_time",
	"notes",
	"marketing_source",
	"market_segment",
	"industry",
	"customer_pos_id",
	"website",
	"language",
	"column_break_45",
	"customer_details",
	"defaults_tab",
	"default_currency",
	"default_bank_account",
	"column_break_14",
	"default_price_list",
	"internal_customer_section",
	"represents_company",
	"column_break_70",
	"companies",
	"dashboard_tab",
	"contact_and_address_tab",
	"address_contacts",
	"address_html",
	"column_break1",
	"contact_html",
	"primary_address_and_contact_detail",
	"column_break_26",
	"customer_primary_address",
	"primary_address",
	"column_break_nwor",
	"customer_primary_contact",
	"first_name",
	"last_name",
	"tax_tab",
	"taxation_section",
	"tax_id",
	"column_break_21",
	"tax_category",
	"tax_withholding_category",
	"accounting_tab",
	"credit_limit_section",
	"payment_terms",
	"credit_limits",
	"default_receivable_accounts",
	"accounts",
	"loyalty_points_tab",
	"loyalty_program",
	"column_break_54",
	"loyalty_program_tier",
	"sales_team_tab",
	"sales_team",
	"sales_team_section",
	"default_sales_partner",
	"column_break_66",
	"default_commission_rate",
	"settings_tab",
	"so_required",
	"dn_required",
	"column_break_53",
	"is_frozen",
	"disabled",
	"portal_users_tab",
	"portal_users",
]

# (fieldname, property, value) for plain DocField-level Property Setters.
FIELD_PROPERTIES = [
	("more_info", "hidden", "1"),
	("defaults_tab", "hidden", "1"),
	("internal_customer_section", "hidden", "1"),
	("address_contacts", "hidden", "1"),
	("marketing_source", "hidden", "1"),
	("garage_profile_section", "hidden", "1"),
	("mobile_no", "fieldtype", "Data"),
	("email_id", "fieldtype", "Data"),
	# Included in the Customer quick-entry dialog (nested inside Garage
	# Vehicle's own quick-entry) alongside the garage-specific fields above,
	# which get `allow_in_quick_entry` set directly on their Custom Field
	# definition in add_customer_profile_fields.py - these are core ERPNext
	# fields, so a Property Setter is the only way to add the same flag.
	("customer_group", "allow_in_quick_entry", "1"),
	("is_internal_customer", "allow_in_quick_entry", "1"),
	("mobile_no", "allow_in_quick_entry", "1"),
	("email_id", "allow_in_quick_entry", "1"),
]


def _set_property(fieldname, property_name, value, doctype_or_field="DocField", property_type=None):
	name = f"Customer-{fieldname}-{property_name}"
	if frappe.db.exists("Property Setter", name):
		frappe.delete_doc("Property Setter", name, ignore_permissions=True, force=True)

	args = {
		"doctype": "Customer",
		"fieldname": fieldname,
		"property": property_name,
		"value": value,
		"doctype_or_field": doctype_or_field,
	}
	if property_type:
		args["property_type"] = property_type

	frappe.make_property_setter(args, ignore_validate=True, validate_fields_for_doctype=False)


def execute() -> None:
	if not frappe.db.table_exists("Customer"):
		return

	# Only reorder fields that actually exist on this site's Customer
	# doctype. Use every field in the meta (not get_valid_columns(), which
	# only returns fields with a real DB column and silently drops
	# structural fields like Section/Column Break, HTML, and Table).
	valid = {f.fieldname for f in frappe.get_meta("Customer").fields}
	field_order = [f for f in FIELD_ORDER if f in valid]

	_set_property("main", "field_order", json.dumps(field_order), doctype_or_field="DocType", property_type="Text")

	# Core Customer's own default ("customer_group,territory, mobile_no,
	# primary_address" - see erpnext/selling/doctype/customer/customer.json)
	# is why every Link-field dropdown result for Customer (e.g. Garage
	# Vehicle's own "Customer" field) showed the customer's full address
	# underneath their name - primary_address pulls the linked Address
	# doc's whole formatted text. Swapped for customer_number instead -
	# explicit user request, so the dropdown shows "NAME, 26XXXXXXXX" and
	# staff can tell two similarly-named customers apart by their generated
	# ID instead of a wall of address text.
	_set_property("main", "search_fields", "customer_number", doctype_or_field="DocType", property_type="Data")

	for fieldname, prop, value in FIELD_PROPERTIES:
		if fieldname not in valid:
			continue
		_set_property(fieldname, prop, value)

	frappe.clear_cache(doctype="Customer")
