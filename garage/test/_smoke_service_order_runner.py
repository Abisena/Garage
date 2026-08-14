"""Throwaway smoke-test runner for Garage Service Order - not a real test
module, deleted right after use. Invoked via:
bench --site X execute garage.test._smoke_service_order_runner.run
"""

import json
import traceback

import frappe

LOG = []


def step(label, fn):
	try:
		result = fn()
		LOG.append(("OK", label, result))
		return result
	except Exception as e:
		LOG.append(("FAIL", label, f"{type(e).__name__}: {e}"))
		LOG.append(("TRACE", label, traceback.format_exc()))
		return None


def ensure_branch():
	name = frappe.db.get_value("Garage Branch", {}, "name")
	if name:
		return name
	doc = frappe.new_doc("Garage Branch")
	doc.branch_code = "SMK-001"
	doc.branch_name = "Smoke Test Branch"
	doc.insert(ignore_permissions=True)
	return doc.name


def ensure_brand_model():
	brand_name = "SMOKETEST BRAND"
	if not frappe.db.exists("Garage Brand", brand_name):
		b = frappe.new_doc("Garage Brand")
		b.brand_name = brand_name
		b.insert(ignore_permissions=True)
	model_name = "SMOKETEST MODEL"
	if not frappe.db.exists("Garage Model", model_name):
		m = frappe.new_doc("Garage Model")
		m.brand = brand_name
		m.model_name = model_name
		m.insert(ignore_permissions=True)
	return brand_name, model_name


def create_customer():
	name = "SMOKE TEST SERVICE ORDER CUSTOMER"
	if frappe.db.exists("Customer", name):
		frappe.delete_doc("Customer", name, force=1, ignore_permissions=True)
	doc = frappe.new_doc("Customer")
	doc.customer_name = name
	doc.customer_type = "Individual"
	doc.insert(ignore_permissions=True)
	return doc.name


def create_vehicle(customer, brand, model):
	plate = "SMK TEST 1"
	if frappe.db.exists("Garage Vehicle", plate):
		frappe.delete_doc("Garage Vehicle", plate, force=1, ignore_permissions=True)
	doc = frappe.new_doc("Garage Vehicle")
	doc.license_plate = plate
	doc.vin = "SMOKETESTVIN0001"
	doc.engine_number = "SMOKETESTENG0001"
	doc.color = "Merah"
	doc.customer = customer
	doc.brand = brand
	doc.model = model
	doc.vehicle_type = "Sedan"
	doc.vehicle_year = 2024
	doc.transmission = "Automatic (AT)"
	doc.fuel_type = "Petrol (Bensin)"
	doc.mileage = 1000
	doc.insert(ignore_permissions=True)
	return doc.name


def ensure_service_type():
	svc_name = "SMOKETEST SERVICE"
	if frappe.db.exists("Garage Service Type", svc_name):
		return svc_name
	item_code = "SMOKETEST-JASA"
	if not frappe.db.exists("Item", item_code):
		if not frappe.db.exists("Item Group", "Services"):
			ig = frappe.new_doc("Item Group")
			ig.item_group_name = "Services"
			ig.is_group = 0
			ig.insert(ignore_permissions=True)
		item = frappe.new_doc("Item")
		item.item_code = item_code
		item.item_name = "Jasa Smoke Test"
		item.item_group = "Services"
		item.stock_uom = "Nos"
		item.is_stock_item = 0
		item.standard_rate = 50000
		item.insert(ignore_permissions=True)
	st = frappe.new_doc("Garage Service Type")
	st.service_type = svc_name
	st.item = item_code
	st.is_active = 1
	st.insert(ignore_permissions=True)
	return svc_name


def ensure_employee():
	full_name = "Smoke Test Mechanic"
	existing = frappe.db.get_value("Employee", {"employee_name": full_name}, "name")
	if existing:
		return existing
	company = frappe.db.get_value("Company", {}, "name")
	if not company:
		return None
	doc = frappe.new_doc("Employee")
	doc.first_name = "Smoke Test"
	doc.last_name = "Mechanic"
	doc.company = company
	doc.gender = "Male"
	doc.date_of_birth = "1995-01-01"
	doc.date_of_joining = frappe.utils.today()
	doc.insert(ignore_permissions=True)
	return doc.name


def create_service_order(vehicle, customer, service_type, branch, mechanic):
	doc = frappe.new_doc("Garage Service Order")
	doc.vehicle = vehicle
	doc.customer = customer
	doc.service_order_type = service_type
	doc.order_date = frappe.utils.today()
	doc.branch = branch
	doc.assigned_mechanic = mechanic
	doc.insert(ignore_permissions=True)
	return doc.name


def run():
	branch = step("Pastikan Garage Branch ada", ensure_branch)
	brand_model = step("Buat Garage Brand + Garage Model uji", ensure_brand_model)
	brand, model = brand_model if brand_model else (None, None)
	customer = step("Buat Customer uji", create_customer)
	vehicle = (
		step("Buat Garage Vehicle uji", lambda: create_vehicle(customer, brand, model))
		if customer and brand
		else None
	)
	svc_type = step("Pastikan Garage Service Type ada", ensure_service_type)
	mechanic = step("Pastikan Employee (mekanik) ada", ensure_employee)
	so_name = (
		step(
			"Buat Garage Service Order",
			lambda: create_service_order(vehicle, customer, svc_type, branch, mechanic),
		)
		if vehicle and svc_type and mechanic
		else None
	)

	if so_name:
		doc = frappe.get_doc("Garage Service Order", so_name)
		LOG.append(("INFO", "Status awal", doc.status))
		LOG.append(("INFO", "required_parts rows", len(doc.get("required_parts") or [])))
		LOG.append(("INFO", "total_amount", doc.total_amount))

		def gen_spk():
			from garage.utils.jinja import _get_or_generate_spk_number
			return _get_or_generate_spk_number(doc)

		step("Generate SPK number (spk_number)", gen_spk)

		from garage.garage.doctype.garage_service_order.garage_service_order import (
			finish_repair,
			send_order_part,
			start_repair,
			submit_to_qc,
		)

		step("send_order_part()", lambda: send_order_part(so_name))
		doc.reload()
		LOG.append(("INFO", "Status setelah send_order_part", doc.status))
		LOG.append(
			("INFO", "stock_status baris part", [r.stock_status for r in doc.get("required_parts") or []])
		)

		step("start_repair()", lambda: start_repair(so_name))
		step("finish_repair()", lambda: finish_repair(so_name))
		step("submit_to_qc()", lambda: submit_to_qc(so_name))

		doc.reload()
		LOG.append(("INFO", "Status akhir", doc.status))
		LOG.append(
			("INFO", "sales_invoice terkait?", frappe.db.exists("Sales Invoice", {"service_order": so_name}))
		)

	frappe.db.commit()
	print("===SMOKE_TEST_RESULT_JSON_START===")
	print(json.dumps(LOG, default=str))
	print("===SMOKE_TEST_RESULT_JSON_END===")
