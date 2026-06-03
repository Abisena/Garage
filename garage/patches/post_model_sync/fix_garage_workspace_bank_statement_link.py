"""Point Garage workspace shortcut to Bank Statement (replaces missing BCA Bank Statement Import)."""

import frappe


def execute():
	if not frappe.db.exists("Workspace", "Garage"):
		return

	ws = frappe.get_doc("Workspace", "Garage")
	ws.content = (ws.content or "").replace("BCA Bank Statement Import", "Bank Statement")

	for row in ws.links or []:
		if row.link_to == "BCA Bank Statement Import":
			row.label = "Bank Statement"
			row.link_to = "Bank Statement"

	for row in ws.shortcuts or []:
		if row.link_to == "BCA Bank Statement Import":
			row.label = "Bank Statement"
			row.link_to = "Bank Statement"

	ws.save(ignore_permissions=True)
	frappe.clear_cache(doctype="Workspace")
