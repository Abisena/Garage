// Copyright (c) 2024, Contributors
// For license information, please see license.txt

frappe.ui.form.on('Spare Part Request', {
  refresh(frm) {
    const itemsField = frm.get_field('items');
    const grid = itemsField ? itemsField.grid : null;
    const status = (frm.doc.status || '').toLowerCase();
    const statusColorMap = {
      prepared: 'green',
      rejected: 'red',
      pending: 'orange',
      'partial approve': 'blue',
      'partial reject': 'orange',
    };
    const indicatorColor = statusColorMap[status];
    if (indicatorColor) {
      frm.set_indicator(frm.doc.status, indicatorColor);
    }

    const updateSelected = (status) => {
      if (!grid) {
        frappe.msgprint(__('Daftar item belum tersedia.'));
        return;
      }
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

    frm.clear_custom_buttons();
    if (!frm.is_new()) {
      frm.add_custom_button(__('Prepare Selected'), () => updateSelected('Prepared'));
      frm.add_custom_button(__('Reject Selected'), () => updateSelected('Rejected'));
    }

    if (grid?.add_custom_button) {
      if (grid.clear_custom_buttons) {
        grid.clear_custom_buttons();
      }
      grid.add_custom_button(__('Prepare Selected'), () => updateSelected('Prepared'));
      grid.add_custom_button(__('Reject Selected'), () => updateSelected('Rejected'));
    }
  },
});
