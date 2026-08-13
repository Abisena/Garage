import frappe
import json

def run():
    cf_name = "Sales Order-chassis_number"
    if not frappe.db.exists("Custom Field", cf_name):
        cf = frappe.new_doc("Custom Field")
        cf.dt = "Sales Order"
        cf.fieldname = "chassis_number"
        cf.label = "Nomor Rangka"
        cf.fieldtype = "Data"
        cf.fetch_from = "vehicle.vin"
        cf.insert_after = "vehicle"
        cf.in_list_view = 0
        cf.insert(ignore_permissions=True)
        print("created:", cf.name)
    else:
        print("already exists:", cf_name)

    ps_name = "Sales Order-main-field_order"
    order = json.loads(frappe.db.get_value("Property Setter", ps_name, "value"))
    order = [f for f in order if f != "chassis_number"]
    idx = order.index("vehicle")
    order.insert(idx + 1, "chassis_number")
    frappe.db.set_value("Property Setter", ps_name, "value", json.dumps(order))

    frappe.clear_cache(doctype="Sales Order")
    frappe.db.commit()
    print("done")
