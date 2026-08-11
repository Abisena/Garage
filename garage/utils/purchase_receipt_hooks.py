import frappe
from frappe import _


def strip_service_items(doc, method=None):
    """doc_event: Purchase Receipt.before_validate

    Purchase Receipt records physical goods arriving into a warehouse -
    a Services-group item has nothing to "receive" (no stock ledger
    entry makes sense for it), and should instead flow straight from
    Purchase Order to Purchase Invoice. ERPNext's own make_purchase_
    receipt() (buying/doctype/purchase_order/purchase_order.py) doesn't
    filter by item_group when mapping items over from a PO, so a mixed
    goods+services PO (the exact scenario this app's own subject_to_pph23
    flagging was built for - see purchase_order.js) would otherwise pull
    the service line straight into the Receipt right along with the
    goods.

    Rather than blocking save/submit and making staff hunt down and
    delete the row by hand, this drops it automatically on every save -
    "no receive process for services" means it should just never end up
    staying on this document, not that a human has to intervene each
    time. Runs on before_validate specifically (fires before the
    document's own validate(), which is where AccountsController
    recalculates qty/amount/totals) so the removed row's amount is
    correctly excluded from Grand Total etc. without a second, manual
    recalculation call - it's simply never counted in the first place.
    """
    service_rows = [d for d in doc.items if d.item_group == "Services"]
    if not service_rows:
        return

    removed = [d.item_code for d in service_rows]
    for row in service_rows:
        doc.remove(row)

    frappe.msgprint(
        _(
            "Item jasa berikut otomatis dihapus dari Purchase Receipt - jasa tidak "
            "melalui proses penerimaan barang, tagih langsung lewat Purchase "
            "Invoice: {0}"
        ).format(", ".join(removed)),
        indicator="blue",
        alert=True,
    )
