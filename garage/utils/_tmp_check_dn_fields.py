import frappe

def run():
    meta = frappe.get_meta("Delivery Note")
    for f in sorted(meta.fields, key=lambda x: x.idx):
        print(f.idx, f.fieldname, "|", f.fieldtype, "|", f.label, "| hidden=", f.hidden, "| depends_on=", f.depends_on)
