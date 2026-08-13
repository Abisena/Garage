import frappe


@frappe.whitelist()
def make_sales_invoice_with_vehicle(source_name, target_doc=None, ignore_permissions=False, args=None):
    """Whitelisted method override for Sales Order's own "Create > Sales
    Invoice" button (erpnext.selling.doctype.sales_order.sales_order.
    make_sales_invoice - see override_whitelisted_methods in hooks.py).

    Explicit user request: a Sales Invoice created from a Garage Service
    Order (via Repair QC's own auto-generation, see repair_qc.py) always
    gets No. Polisi populated - not directly, but as a side effect of
    Service Order being set there (no_polisi's own fetch_from is
    "service_order.vehicle", see the Sales Invoice-no_polisi Custom
    Field). A Sales Invoice created straight from a Sales Order instead
    (this app's OTHER selling flow, no Garage Service Order involved at
    all) left both fields blank - Service Order correctly has nothing to
    link to here, but No. Polisi has no reason to stay empty too, since
    Sales Order carries its own "vehicle" field already. This copies that
    value across directly (fetch_from can't help here - there's no Service
    Order to fetch through), while deliberately leaving Service Order
    itself unset, since this invoice genuinely isn't linked to one.
    """

    from erpnext.selling.doctype.sales_order.sales_order import (
        make_sales_invoice as make_sales_invoice_from_so,
    )

    invoice = make_sales_invoice_from_so(source_name, target_doc, ignore_permissions, args)

    vehicle = frappe.db.get_value("Sales Order", source_name, "vehicle")
    if vehicle:
        invoice.no_polisi = vehicle

    return invoice
