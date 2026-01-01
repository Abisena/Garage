// Copyright (c) 2024, Contributors
// For license information, please see license.txt

frappe.ui.form.on('Spare Part Request', {
  refresh(frm) {
    const grid = frm.get_field('items').grid;
    const status = (frm.doc.status || '').toLowerCase();
    
    // ========================================
    // STATUS INDICATOR (FIXED!)
    // ========================================
    const statusColorMap = {
      prepared: 'green',
      rejected: 'red',
      pending: 'orange',
      'partial approve': 'blue',
      'partial reject': 'orange',
    };
    
    const indicatorColor = statusColorMap[status];
    if (indicatorColor && frm.doc.status) {
      // ✅ CORRECT: Use frm.page.set_indicator()
      frm.page.set_indicator(frm.doc.status, indicatorColor);
    }
    
    // ========================================
    // HELPER: UPDATE SELECTED ITEMS
    // ========================================
    const updateSelected = (status) => {
      const selected = grid.get_selected_children();
      
      if (!selected.length) {
        frappe.msgprint({
          title: __('No Items Selected'),
          message: __('⚠️ Pilih minimal satu item yang ingin diperbarui.'),
          indicator: 'orange'
        });
        return;
      }
      
      const statusLabel = status === 'Prepared' ? 'PREPARED' : 'REJECTED';
      const statusEmoji = status === 'Prepared' ? '✅' : '❌';
      
      frappe.call({
        method: 'garage.garage.doctype.spare_part_request.spare_part_request.update_items_status',
        args: {
          name: frm.doc.name,
          item_names: selected.map((row) => row.name),
          status,
        },
        callback: (r) => {
          if (!r.exc) {
            frm.reload_doc();
            frappe.show_alert({
              message: __('{0} {1} items {2}!', [statusEmoji, selected.length, statusLabel]),
              indicator: status === 'Prepared' ? 'green' : 'red'
            }, 5);
          }
        },
      });
    };
    
    // ========================================
    // HELPER: UPDATE ALL ITEMS
    // ========================================
    const updateAll = (status) => {
      const items = frm.doc.items || [];
      
      if (!items.length) {
        frappe.msgprint({
          title: __('No Items'),
          message: __('⚠️ Tidak ada item untuk diperbarui.'),
          indicator: 'orange'
        });
        return;
      }
      
      const statusLabel = status === 'Prepared' ? 'PREPARE' : 'REJECT';
      const statusEmoji = status === 'Prepared' ? '✅' : '❌';
      const confirmMsg = __(
        '{0} Are you sure you want to {1} ALL {2} items?', 
        [statusEmoji, statusLabel, items.length]
      );
      
      frappe.confirm(
        confirmMsg,
        () => {
          // Show loading
          frappe.dom.freeze(__('Updating all items...'));
          
          frappe.call({
            method: 'garage.garage.doctype.spare_part_request.spare_part_request.update_items_status',
            args: {
              name: frm.doc.name,
              item_names: items.map((row) => row.name),
              status,
            },
            callback: (r) => {
              frappe.dom.unfreeze();
              
              if (!r.exc) {
                frm.reload_doc();
                frappe.show_alert({
                  message: __('{0} All {1} items {2}!', [statusEmoji, items.length, statusLabel + 'D']),
                  indicator: status === 'Prepared' ? 'green' : 'red'
                }, 5);
              }
            },
          });
        },
        () => {
          // Cancelled
          frappe.show_alert({
            message: __('Operation cancelled'),
            indicator: 'blue'
          }, 2);
        }
      );
    };
    
    // ========================================
    // ADD CUSTOM BUTTONS
    // ========================================
    
    // Selected Items dropdown
    frm.add_custom_button(
      __('✅ Prepare Selected'), 
      () => updateSelected('Prepared'), 
      __('Selected Items')
    );
    
    frm.add_custom_button(
      __('❌ Reject Selected'), 
      () => updateSelected('Rejected'), 
      __('Selected Items')
    );
    
    // All Items dropdown
    frm.add_custom_button(
      __('✅ Prepare All'), 
      () => updateAll('Prepared'), 
      __('All Items')
    );
    
    frm.add_custom_button(
      __('❌ Reject All'), 
      () => updateAll('Rejected'), 
      __('All Items')
    );
    
    // ========================================
    // SHOW QUICK STATS IN DASHBOARD
    // ========================================
    if (!frm.is_new() && frm.doc.items) {
      const totalItems = (frm.doc.items || []).length;
      const preparedItems = (frm.doc.items || []).filter(i => 
        i.approval_status === 'Prepared' || i.approval_status === 'Approved'
      ).length;
      const rejectedItems = (frm.doc.items || []).filter(i => 
        i.approval_status === 'Rejected'
      ).length;
      const pendingItems = totalItems - preparedItems - rejectedItems;
      
      const statsMsg = `📊 Items: ${totalItems} Total | ✅ ${preparedItems} Prepared | ❌ ${rejectedItems} Rejected | ⏳ ${pendingItems} Pending`;
      
      // Add to dashboard
      frm.dashboard.add_comment(statsMsg, 'blue', true);
    }
  },
});
