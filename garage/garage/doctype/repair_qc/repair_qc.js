frappe.ui.form.on('Repair QC', {
  async service_order(frm) {
    if (!frm.doc.service_order) {
      frm.clear_table('spare_parts_verification');
      frm.refresh_field('spare_parts_verification');
      return;
    }

    const existingRows = frm.doc.spare_parts_verification || [];
    if (!frm.is_new() && existingRows.length) {
      return;
    }

    const serviceOrder = await frappe.db.get_doc('Garage Service Order', frm.doc.service_order);
    const requiredParts = serviceOrder.required_parts || [];

    frm.clear_table('spare_parts_verification');

    requiredParts.forEach((part) => {
      const row = frm.add_child('spare_parts_verification');
      row.item_code = part.item_code;
      row.item_name = part.item_name;
      row.qty = part.qty;
      row.uom = part.uom;
    });

    frm.refresh_field('spare_parts_verification');
  }
});
