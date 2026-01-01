// Copyright (c) 2024, Contributors
// For license information, please see license.txt

frappe.ui.form.on('Spare Part Request', {
  refresh(frm) {
    const grid = frm.get_field('items').grid;
    const status = (frm.doc.status || '').toLowerCase();
    
    // Status indicator colors
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
    
    // Helper function to update selected items
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
        callback: () => {
          frm.reload_doc();
          frappe.show_alert({
            message: __('✅ {0} items updated to {1}', [selected.length, status]),
            indicator: status === 'Prepared' ? 'green' : 'red'
          }, 3);
        },
      });
    };
    
    // Helper function to update ALL items
    const updateAll = (status) => {
      const items = frm.doc.items || [];
      if (!items.length) {
        frappe.msgprint(__('Tidak ada item untuk diperbarui.'));
        return;
      }
      
      const statusLabel = status === 'Prepared' ? 'PREPARE' : 'REJECT';
      const confirmMsg = __('Are you sure you want to {0} ALL {1} items?', [statusLabel, items.length]);
      
      frappe.confirm(
        confirmMsg,
        () => {
          frappe.call({
            method: 'garage.garage.doctype.spare_part_request.spare_part_request.update_items_status',
            args: {
              name: frm.doc.name,
              item_names: items.map((row) => row.name),
              status,
            },
            callback: () => {
              frm.reload_doc();
              frappe.show_alert({
                message: __('✅ All {0} items updated to {1}', [items.length, status]),
                indicator: status === 'Prepared' ? 'green' : 'red'
              }, 5);
            },
          });
        }
      );
    };
    
    // Add "Selected Items" buttons
    frm.add_custom_button(__('Prepare Selected'), () => updateSelected('Prepared'), __('Selected Items'));
    frm.add_custom_button(__('Reject Selected'), () => updateSelected('Rejected'), __('Selected Items'));
    
    // Add "All Items" dropdown buttons
    frm.add_custom_button(__('Prepare All'), () => updateAll('Prepared'), __('All Items'));
    frm.add_custom_button(__('Reject All'), () => updateAll('Rejected'), __('All Items'));
  },
});
