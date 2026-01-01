// Copyright (c) 2024, Contributors
// For license information, please see license.txt

// ========================================
// FORM VIEW SETTINGS
// ========================================
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

// ========================================
// LIST VIEW SETTINGS
// ========================================
frappe.listview_settings['Spare Part Request'] = {
  // Status indicator dot (left side of row)
  get_indicator: function(doc) {
    const status_map = {
      'Pending': 'orange',
      'Partial Approve': 'blue',
      'Partial Reject': 'orange',
      'Prepared': 'green',
      'Rejected': 'red'
    };
    
    const color = status_map[doc.status] || 'gray';
    return [doc.status, color, 'status,=,' + doc.status];
  },
  
  // Format columns with colored badges
  formatters: {
    status: function(value) {
      if (!value) return value;
      
      const config = {
        'Pending': { bg: '#fef3c7', text: '#92400e', icon: '⏳' },
        'Partial Approve': { bg: '#dbeafe', text: '#1e40af', icon: '✓' },
        'Partial Reject': { bg: '#fed7aa', text: '#9a3412', icon: '⚠️' },
        'Prepared': { bg: '#d1fae5', text: '#065f46', icon: '✅' },
        'Rejected': { bg: '#fee2e2', text: '#991b1b', icon: '❌' }
      }[value] || { bg: '#f3f4f6', text: '#374151', icon: '•' };
      
      return `<span style="background: ${config.bg}; color: ${config.text}; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; display: inline-block;">
        ${config.icon} ${value}
      </span>`;
    },
    
    priority: function(value) {
      if (!value) return value;
      
      const config = {
        'Normal': { bg: '#dbeafe', text: '#1e40af', icon: '📋' },
        'High': { bg: '#fed7aa', text: '#9a3412', icon: '⚠️' },
        'Urgent': { bg: '#fee2e2', text: '#991b1b', icon: '🚨' }
      }[value] || { bg: '#f3f4f6', text: '#374151', icon: '•' };
      
      return `<span style="background: ${config.bg}; color: ${config.text}; padding: 4px 12px; border-radius: 12px; font-weight: 700; font-size: 11px; display: inline-block;">
        ${config.icon} ${value}
      </span>`;
    }
  },
  
  // Add custom buttons and styles
  onload: function(listview) {
    // Add bulk action buttons
    listview.page.add_action_item(__('✅ Bulk Prepare'), function() {
      bulk_update_status(listview, 'Prepared');
    });
    
    listview.page.add_action_item(__('❌ Bulk Reject'), function() {
      bulk_update_status(listview, 'Rejected');
    });
    
    // Add stats button
    listview.page.add_inner_button(__('📊 Show Stats'), function() {
      show_list_stats();
    });
    
    // Inject custom styles
    inject_list_view_styles();
  },
  
  // Refresh callback
  refresh: function(listview) {
    inject_list_view_styles();
  }
};

// ========================================
// BULK UPDATE FUNCTION
// ========================================
function bulk_update_status(listview, new_status) {
  const selected = listview.get_checked_items();
  
  if (!selected.length) {
    frappe.msgprint({
      title: __('No Selection'),
      message: __('⚠️ Please select at least one request'),
      indicator: 'orange'
    });
    return;
  }
  
  const emoji = new_status === 'Prepared' ? '✅' : '❌';
  const action = new_status === 'Prepared' ? 'PREPARE' : 'REJECT';
  
  frappe.confirm(
    __(`${emoji} ${action} ${selected.length} requests?`),
    function() {
      frappe.dom.freeze(__('Updating...'));
      
      let completed = 0;
      let errors = 0;
      
      selected.forEach(item => {
        frappe.call({
          method: 'frappe.client.set_value',
          args: {
            doctype: 'Spare Part Request',
            name: item.name,
            fieldname: 'status',
            value: new_status
          },
          callback: function(r) {
            completed++;
            if (r.exc) errors++;
            
            // All done
            if (completed === selected.length) {
              frappe.dom.unfreeze();
              listview.refresh();
              
              if (errors === 0) {
                frappe.show_alert({
                  message: __(`${emoji} All ${selected.length} requests ${action}ED!`),
                  indicator: new_status === 'Prepared' ? 'green' : 'red'
                }, 5);
              } else {
                frappe.msgprint({
                  title: __('Completed with errors'),
                  message: __(`${selected.length - errors} succeeded, ${errors} failed`),
                  indicator: 'orange'
                });
              }
            }
          }
        });
      });
    }
  );
}

// ========================================
// SHOW STATISTICS
// ========================================
function show_list_stats() {
  frappe.call({
    method: 'frappe.client.get_count',
    args: {
      doctype: 'Spare Part Request',
      filters: [['status', '=', 'Pending']]
    },
    callback: function(r) {
      const pending = r.message || 0;
      
      frappe.call({
        method: 'frappe.client.get_count',
        args: {
          doctype: 'Spare Part Request',
          filters: [['status', '=', 'Prepared']]
        },
        callback: function(r2) {
          const prepared = r2.message || 0;
          
          frappe.call({
            method: 'frappe.client.get_count',
            args: {
              doctype: 'Spare Part Request',
              filters: [['status', '=', 'Rejected']]
            },
            callback: function(r3) {
              const rejected = r3.message || 0;
              
              frappe.msgprint({
                title: '📊 Request Statistics',
                message: `
                  <div style="padding: 20px;">
                    <div style="margin-bottom: 12px;">
                      <span style="background: #fef3c7; color: #92400e; padding: 6px 14px; border-radius: 8px; font-weight: 700; display: inline-block;">
                        ⏳ Pending: ${pending}
                      </span>
                    </div>
                    <div style="margin-bottom: 12px;">
                      <span style="background: #d1fae5; color: #065f46; padding: 6px 14px; border-radius: 8px; font-weight: 700; display: inline-block;">
                        ✅ Prepared: ${prepared}
                      </span>
                    </div>
                    <div>
                      <span style="background: #fee2e2; color: #991b1b; padding: 6px 14px; border-radius: 8px; font-weight: 700; display: inline-block;">
                        ❌ Rejected: ${rejected}
                      </span>
                    </div>
                  </div>
                `,
                indicator: 'blue'
              });
            }
          });
        }
      });
    }
  });
}

// ========================================
// INJECT CUSTOM STYLES FOR LIST VIEW
// NO ALTERNATING COLORS - CLEAN LOOK
// ========================================
function inject_list_view_styles() {
  if ($('#spare-part-request-list-styles').length) return; // Already added
  
  const css = `
    <style id="spare-part-request-list-styles">
      /* Row hover effect */
      .list-row-container:hover {
        background: #f9fafb !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
        border-left: 3px solid #667eea !important;
        transition: all 0.2s ease;
      }
      
      /* Selected rows */
      .list-row-container:has(input:checked) {
        background: #eff6ff !important;
        border-left: 3px solid #3b82f6 !important;
      }
      
      /* Request title bold */
      .list-row [data-field="request_title"] .ellipsis {
        font-weight: 600;
        color: #1f2937;
      }
      
      /* Service order link */
      .list-row [data-field="service_order"] a {
        color: #667eea;
        font-weight: 600;
        text-decoration: none;
      }
      
      .list-row [data-field="service_order"] a:hover {
        color: #764ba2;
        text-decoration: underline;
      }
      
      /* Make status and priority stand out */
      .list-row [data-field="status"],
      .list-row [data-field="priority"] {
        font-weight: 700;
      }
      
      /* NO alternating row colors - clean white background */
    </style>
  `;
  
  $('head').append(css);
}
