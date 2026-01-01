// Client Script for Spare Part Request
// Full-featured with simplified action buttons

frappe.ui.form.on('Spare Part Request', {
    refresh: function(frm) {
        // Add ONLY simplified buttons
        add_simple_buttons(frm);
        
        // Update quick info card
        update_quick_info_card(frm);
        
        // Set status indicator
        update_status_indicator(frm);
        
        // Update timeline
        update_timeline(frm);
    },
    
    onload: function(frm) {
        // Set defaults
        if (frm.is_new()) {
            set_defaults(frm);
        }
        
        // Add tooltips
        add_field_tooltips(frm);
    },
    
    service_order: function(frm) {
        // Auto-fetch service order details
        if (frm.doc.service_order) {
            fetch_service_order_details(frm);
        }
    },
    
    status: function(frm) {
        // Update indicators
        update_status_indicator(frm);
        update_quick_info_card(frm);
        
        // Show alerts
        show_status_alerts(frm);
    },
    
    priority: function(frm) {
        // Show priority alerts
        if (['High', 'Urgent'].includes(frm.doc.priority)) {
            frappe.show_alert({
                message: __('⚠️ {0} priority request! Process urgently.', [frm.doc.priority]),
                indicator: 'red'
            }, 5);
        }
    },
    
    before_save: function(frm) {
        // Validate items
        validate_request(frm);
        
        // Auto-update status based on approvals
        auto_update_status(frm);
    }
});

// ========================================
// SIMPLIFIED BUTTONS - ONLY 2 ACTIONS
// ========================================
function add_simple_buttons(frm) {
    if (frm.is_new()) return;
    
    // Make status read-only
    frm.set_df_property('status', 'read_only', 1);
    
    // Clear all custom buttons first
    frm.clear_custom_buttons();
    
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
                frappe.show_alert({
                    message: __('Operation cancelled'),
                    indicator: 'blue'
                }, 2);
            }
        );
    };
    
    // ========================================
    // ADD ONLY 2 BUTTONS IN ACTIONS DROPDOWN
    // ========================================
    frm.add_custom_button(
        __('Prepared All'), 
        () => updateAll('Prepared'), 
        __('Actions')
    );
    
    frm.add_custom_button(
        __('Rejected All'), 
        () => updateAll('Rejected'), 
        __('Actions')
    );
}

// ========================================
// QUICK INFO CARD
// ========================================
function update_quick_info_card(frm) {
    if (frm.is_new()) return;
    
    const items_count = (frm.doc.items || []).length;
    const approved_count = (frm.doc.items || []).filter(i => i.approval_status === 'Approved').length;
    const rejected_count = (frm.doc.items || []).filter(i => i.approval_status === 'Rejected').length;
    const pending_count = items_count - approved_count - rejected_count;
    
    const total_qty = calculate_total_qty(frm);
    
    const status_colors = {
        'Pending': '#f59e0b',
        'Partial Approve': '#3b82f6',
        'Partial Reject': '#f97316',
        'Prepared': '#22c55e',
        'Rejected': '#ef4444'
    };
    
    const status_color = status_colors[frm.doc.status] || '#9ca3af';
    
    const html = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin: 10px 0 20px 0; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; font-size: 18px;">📦 Request Summary</h4>
                <div style="background: ${status_color}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
                    ${frm.doc.status || 'Pending'}
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
                <div style="background: rgba(255, 255, 255, 0.15); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
                    <div style="font-size: 11px; opacity: 0.9;">Total Items</div>
                    <div style="font-size: 18px; font-weight: 700;">${items_count}</div>
                </div>
                <div style="background: rgba(34, 197, 94, 0.3); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
                    <div style="font-size: 11px; opacity: 0.9;">✅ Approved</div>
                    <div style="font-size: 18px; font-weight: 700;">${approved_count}</div>
                </div>
                <div style="background: rgba(239, 68, 68, 0.3); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
                    <div style="font-size: 11px; opacity: 0.9;">❌ Rejected</div>
                    <div style="font-size: 18px; font-weight: 700;">${rejected_count}</div>
                </div>
                <div style="background: rgba(245, 158, 11, 0.3); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
                    <div style="font-size: 11px; opacity: 0.9;">⏳ Pending</div>
                    <div style="font-size: 18px; font-weight: 700;">${pending_count}</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.15); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
                    <div style="font-size: 11px; opacity: 0.9;">Total Quantity</div>
                    <div style="font-size: 18px; font-weight: 700;">${total_qty}</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.15); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
                    <div style="font-size: 11px; opacity: 0.9;">Priority</div>
                    <div style="font-size: 18px; font-weight: 700;">${get_priority_emoji(frm.doc.priority)} ${frm.doc.priority || 'Normal'}</div>
                </div>
            </div>
        </div>
    `;
    
    $('#spare-part-request-quick-info').html(html);
}

function get_priority_emoji(priority) {
    const emojis = {
        'Normal': '📋',
        'High': '⚠️',
        'Urgent': '🚨'
    };
    return emojis[priority] || '📋';
}

// ========================================
// STATUS INDICATOR
// ========================================
function update_status_indicator(frm) {
    if (!frm.doc.status) return;
    
    // Status indicator removed to avoid double banners
    // The Quick Info Card already shows the status with colors
}

// ========================================
// TIMELINE
// ========================================
function update_timeline(frm) {
    if (frm.is_new()) return;
    
    const events = [
        {
            icon: '📝',
            title: 'Request Created',
            date: frm.doc.creation,
            user: frm.doc.requested_by || frm.doc.owner
        }
    ];
    
    if (frm.doc.approved_by) {
        events.push({
            icon: '✅',
            title: 'Request Approved',
            date: frm.doc.approval_date,
            user: frm.doc.approved_by
        });
    }
    
    if (frm.doc.status === 'Prepared') {
        events.push({
            icon: '📦',
            title: 'Parts Prepared',
            date: frm.doc.modified,
            user: frm.doc.modified_by
        });
    }
    
    let html = '<div style="padding: 20px; background: #f9fafb; border-radius: 8px; border: 2px dashed #d1d5db;">';
    
    events.forEach((event, index) => {
        const is_last = index === events.length - 1;
        html += `
            <div style="display: flex; align-items: flex-start; margin-bottom: ${is_last ? '0' : '16px'}; position: relative; padding-left: 40px;">
                ${!is_last ? '<div style="position: absolute; left: 12px; top: 25px; bottom: -16px; width: 2px; background: #d1d5db;"></div>' : ''}
                <div style="position: absolute; left: 0; top: 0; width: 28px; height: 28px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);">
                    ${event.icon}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #1f2937; margin-bottom: 4px;">${event.title}</div>
                    <div style="font-size: 12px; color: #6b7280;">${frappe.datetime.str_to_user(event.date)} • ${event.user || 'System'}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    $('#request-timeline').html(html);
}

// ========================================
// DEFAULTS
// ========================================
function set_defaults(frm) {
    if (!frm.doc.request_date) {
        frm.set_value('request_date', frappe.datetime.get_today());
    }
    
    if (!frm.doc.status) {
        frm.set_value('status', 'Pending');
    }
    
    if (!frm.doc.priority) {
        frm.set_value('priority', 'Normal');
    }
    
    if (!frm.doc.requested_by) {
        frm.set_value('requested_by', frappe.session.user);
    }
}

// ========================================
// TOOLTIPS
// ========================================
function add_field_tooltips(frm) {
    frm.set_df_property('priority', 'description',
        '⚠️ Set urgency: Normal for regular requests, High/Urgent for critical needs');
    
    frm.set_df_property('service_order', 'description',
        '🔗 Link to the service order requiring these parts');
}

// ========================================
// FETCH SERVICE ORDER DETAILS
// ========================================
function fetch_service_order_details(frm) {
    frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Garage Service Order',
            name: frm.doc.service_order
        },
        callback: function(r) {
            if (r.message) {
                if (r.message.customer) {
                    frm.set_value('customer', r.message.customer);
                }
                if (r.message.vehicle) {
                    frm.set_value('vehicle', r.message.vehicle);
                }
                
                frappe.show_alert({
                    message: __('Service order details loaded'),
                    indicator: 'green'
                }, 2);
            }
        }
    });
}

// ========================================
// AUTO UPDATE STATUS
// ========================================
function auto_update_status(frm) {
    const items = frm.doc.items || [];
    if (items.length === 0) return;
    
    const approved = items.filter(i => i.approval_status === 'Approved').length;
    const rejected = items.filter(i => i.approval_status === 'Rejected').length;
    const total = items.length;
    
    if (rejected === total) {
        frm.set_value('status', 'Rejected');
    } else if (approved > 0 && rejected > 0) {
        frm.set_value('status', 'Partial Reject');
    } else if (approved > 0) {
        frm.set_value('status', 'Partial Approve');
    }
}

// ========================================
// VALIDATION
// ========================================
function validate_request(frm) {
    if (!frm.doc.items || frm.doc.items.length === 0) {
        frappe.msgprint({
            title: __('No Items'),
            message: __('Please add at least one item to request'),
            indicator: 'red'
        });
        frappe.validated = false;
    }
}

// ========================================
// STATUS ALERTS
// ========================================
function show_status_alerts(frm) {
    const alerts = {
        'Prepared': { message: '✅ Parts prepared and ready for use!', color: 'green' },
        'Rejected': { message: '❌ Request has been rejected.', color: 'red' },
        'Partial Approve': { message: '✓ Some items approved. Review rejections.', color: 'blue' }
    };
    
    const alert = alerts[frm.doc.status];
    if (alert) {
        frappe.show_alert({
            message: __(alert.message),
            indicator: alert.color
        }, 5);
    }
}

// ========================================
// CALCULATIONS
// ========================================
function calculate_total_qty(frm) {
    let total = 0;
    (frm.doc.items || []).forEach(row => {
        total += flt(row.qty || 0);
    });
    return total;
}

// ========================================
// CHILD TABLE: ITEMS
// ========================================
frappe.ui.form.on('Spare Part Request Item', {
    qty: function(frm, cdt, cdn) {
        auto_calculate_amount(cdt, cdn);
        update_quick_info_card(frm);
    },
    
    rate: function(frm, cdt, cdn) {
        auto_calculate_amount(cdt, cdn);
        update_quick_info_card(frm);
    },
    
    approval_status: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        
        if (row.approval_status === 'Approved') {
            frappe.show_alert({
                message: __('✅ Item approved: {0}', [row.item_name || row.item_code]),
                indicator: 'green'
            }, 2);
        } else if (row.approval_status === 'Rejected') {
            frappe.show_alert({
                message: __('❌ Item rejected: {0}', [row.item_name || row.item_code]),
                indicator: 'red'
            }, 2);
        }
        
        update_quick_info_card(frm);
    },
    
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Item',
                    filters: { name: row.item_code },
                    fieldname: ['item_name', 'standard_rate']
                },
                callback: function(r) {
                    if (r.message) {
                        frappe.model.set_value(cdt, cdn, 'item_name', r.message.item_name);
                        if (!row.rate && r.message.standard_rate) {
                            frappe.model.set_value(cdt, cdn, 'rate', r.message.standard_rate);
                        }
                    }
                }
            });
        }
    }
});

function auto_calculate_amount(cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.qty && row.rate) {
        frappe.model.set_value(cdt, cdn, 'amount', flt(row.qty) * flt(row.rate));
    }
}

// ========================================
// LIST VIEW SETTINGS
// ========================================
frappe.listview_settings['Spare Part Request'] = {
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
    
    onload: function(listview) {
        listview.page.add_action_item(__('✅ Bulk Prepare'), function() {
            bulk_update_status(listview, 'Prepared');
        });
        
        listview.page.add_action_item(__('❌ Bulk Reject'), function() {
            bulk_update_status(listview, 'Rejected');
        });
        
        listview.page.add_inner_button(__('📊 Show Stats'), function() {
            show_list_stats();
        });
        
        inject_list_view_styles();
    },
    
    refresh: function(listview) {
        inject_list_view_styles();
    }
};

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

function inject_list_view_styles() {
    if ($('#spare-part-request-list-styles').length) return;
    
    const css = `
        <style id="spare-part-request-list-styles">
            .list-row-container:hover {
                background: #f9fafb !important;
                border-left: 3px solid #667eea !important;
                transition: all 0.2s ease;
            }
            
            .list-row-container:has(input:checked) {
                background: #eff6ff !important;
                border-left: 3px solid #3b82f6 !important;
            }
            
            .list-row [data-field="request_title"] .ellipsis {
                font-weight: 600;
                color: #1f2937;
            }
            
            .list-row [data-field="service_order"] a {
                color: #667eea;
                font-weight: 600;
                text-decoration: none;
            }
            
            .list-row [data-field="service_order"] a:hover {
                color: #764ba2;
                text-decoration: underline;
            }
            
            .list-row [data-field="status"],
            .list-row [data-field="priority"] {
                font-weight: 700;
            }
        </style>
    `;
    
    $('head').append(css);
}
