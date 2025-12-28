frappe.ui.form.on('Repair QC', {
  async service_order(frm) {
    if (!frm.doc.service_order) {
      frm.clear_table('spare_parts_verification');
      frm.refresh_field('spare_parts_verification');
      frm.clear_table('parts_used');
      frm.refresh_field('parts_used');
      return;
    }

    const existingRows = frm.doc.spare_parts_verification || [];
    const existingPartsUsed = frm.doc.parts_used || [];
    const shouldSyncSpareParts = frm.is_new() || !existingRows.length;
    const shouldSyncPartsUsed = frm.is_new() || !existingPartsUsed.length;
    if (!shouldSyncSpareParts && !shouldSyncPartsUsed) {
      return;
    }

    const serviceOrder = await frappe.db.get_doc('Garage Service Order', frm.doc.service_order);
    const requiredParts = serviceOrder.required_parts || [];

    if (shouldSyncSpareParts) {
      frm.clear_table('spare_parts_verification');
    }

    if (shouldSyncPartsUsed) {
      frm.clear_table('parts_used');
    }

    if (shouldSyncSpareParts) {
      requiredParts.forEach((part) => {
        const row = frm.add_child('spare_parts_verification');
        row.item_code = part.item_code;
        row.item_name = part.item_name;
        row.qty = part.qty;
        row.uom = part.uom;
      });

      frm.refresh_field('spare_parts_verification');
    }

    if (shouldSyncPartsUsed) {
      requiredParts.forEach((part) => {
        const row = frm.add_child('parts_used');
        row.item_code = part.item_code;
        row.item_name = part.item_name;
        row.description = part.description;
        row.qty = part.qty;
        row.uom = part.uom;
        row.source = part.source;
        row.stock_status = part.stock_status;
        row.linked_procurement = part.linked_procurement;
        row.warehouse = part.warehouse;
        row.rate = part.rate;
        row.amount = part.amount;
      });

      frm.refresh_field('parts_used');
    }
  }
});
