from frappe.model.naming import make_autoname


def set_import_naming(doc, method=None):
    current_name = doc.get("name")

    if current_name:
        if current_name.startswith("BCA-IMPORT-"):
            return
        if not current_name.startswith("New "):
            return

    doc.name = make_autoname("BCA-IMPORT-.#####")
