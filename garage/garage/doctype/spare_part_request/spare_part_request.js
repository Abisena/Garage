// Copyright (c) 2024, Contributors
// For license information, please see license.txt

frappe.ui.form.on('Spare Part Request', {
  refresh(frm) {
    const grid = frm.get_field('items').grid;

    const updateSelected = (status) => {
      const selected = grid.get_selected_children();
      if (!selected.length) {
        frappe.msgprint(__('Pilih minimal satu item yang ingin diperbarui.'));
        return;
      }

      frappe.call({
        method: 'garage.garage.doctype.spare_part_request.spare_part_request.update_items_status',
        args: {
          name: frm.doc.name,
          item_names: selected.map((row) => row.name),
          status,
        },
        callback: () => frm.reload_doc(),
      });
    };

    frm.add_custom_button(__('Prepare Selected'), () => updateSelected('Prepared'));
    frm.add_custom_button(__('Reject Selected'), () => updateSelected('Rejected'));
  },
});
