// Copyright (c) 2024, Contributors
// For license information, please see license.txt

const REQUEST_STATUS = 'Request Spare Part';
const STATUS_INDICATORS = {
  'Request Spare Part': 'orange',
  Prepared: 'green',
  Rejected: 'red',
};

const formatStockStatus = (value) => {
  if (!value) {
    return '';
  }

  const indicator = STATUS_INDICATORS[value] || 'gray';
  return `<span class="indicator-pill ${indicator}">${value}</span>`;
};

const fetchBundleItems = (serviceOrderType) =>
  frappe.call({
    method: 'garage.garage.doctype.garage_service_order.garage_service_order.get_bundle_items',
    args: { service_order_type: serviceOrderType },
  });

const applyBundleItems = (frm, items, { replace = false } = {}) => {
  if (!items || !items.length) {
    frappe.msgprint(__('Tidak ada item bundle yang tersedia.'));
    return;
  }

  if (replace) {
    frm.clear_table('required_parts');
  }

  const existing = new Set(
    (frm.doc.required_parts || [])
      .map((row) => row.item_code)
      .filter((itemCode) => !!itemCode),
  );

  items.forEach((item) => {
    if (!item.item_code || existing.has(item.item_code)) {
      return;
    }

    const row = frm.add_child('required_parts');
    row.item_code = item.item_code;
    row.qty = item.qty || 1;
    row.stock_status = REQUEST_STATUS;
    existing.add(item.item_code);
  });

  frm.refresh_field('required_parts');
};

const subscribeToUpdates = (frm) => {
  if (frm._garageServiceOrderRealtimeBound) {
    return;
  }

  frm._garageServiceOrderRealtimeBound = true;
  frappe.realtime.on('garage_service_order_updated', (payload) => {
    if (!payload || payload.name !== frm.doc.name) {
      return;
    }

    if (frm._garageServiceOrderReloading) {
      return;
    }

    frm._garageServiceOrderReloading = true;
    frm.reload_doc().finally(() => {
      frm._garageServiceOrderReloading = false;
    });
  });
};

const autoApplyBundle = (frm) => {
  if (!frm.doc.service_order_type) {
    return;
  }

  if ((frm.doc.required_parts || []).length) {
    return;
  }

  fetchBundleItems(frm.doc.service_order_type).then((response) => {
    const data = response.message || {};
    if (!data.bundle) {
      return;
    }

    applyBundleItems(frm, data.items || []);
  });
};

frappe.ui.form.on('Garage Service Order', {
  refresh(frm) {
    subscribeToUpdates(frm);
    const statusField = frm.fields_dict.required_parts?.grid?.get_field('stock_status');
    if (statusField) {
      statusField.formatter = formatStockStatus;
      frm.refresh_field('required_parts');
    }
    update_quick_info_card(frm);
    frm.add_custom_button(__('Add Bundle Items'), () => {
      if (!frm.doc.service_order_type) {
        frappe.msgprint(__('Pilih service type terlebih dahulu.'));
        return;
      }

      fetchBundleItems(frm.doc.service_order_type).then((response) => {
        const data = response.message || {};
        if (!data.bundle) {
          frappe.msgprint(__('Service type ini tidak memiliki bundle.'));
          return;
        }

        const hasRows = (frm.doc.required_parts || []).length > 0;
        if (!hasRows) {
          applyBundleItems(frm, data.items || []);
          return;
        }

        frappe.confirm(
          __('Ganti daftar required parts dengan item bundle?'),
          () => applyBundleItems(frm, data.items || [], { replace: true }),
          () => applyBundleItems(frm, data.items || []),
        );
      });
    });
  },
  service_order_type(frm) {
    autoApplyBundle(frm);
    update_quick_info_card(frm);
  },
  customer(frm) {
    update_quick_info_card(frm);
  },
  vehicle(frm) {
    update_quick_info_card(frm);
  },
  assigned_mechanic(frm) {
    update_quick_info_card(frm);
  },
  priority(frm) {
    update_quick_info_card(frm);
  },
  status(frm) {
    update_quick_info_card(frm);
  },
  required_parts_add(frm) {
    update_quick_info_card(frm);
  },
  required_parts_remove(frm) {
    update_quick_info_card(frm);
  },
  required_parts_on_form_rendered(frm) {
    update_quick_info_card(frm);
  },
});

const update_quick_info_card = (frm) => {
  if (frm.is_new()) {
    return;
  }

  const escapeHtml = (value) => frappe.utils.escape_html(value || '-');
  const requiredParts = (frm.doc.required_parts || []).filter((row) => row.item_code).length;
  const partsLabel = `${requiredParts} item${requiredParts === 1 ? '' : 's'}`;
  const statusColors = {
    Draft: '#94a3b8',
    Inspection: '#0ea5e9',
    Estimate: '#6366f1',
    'Awaiting Approval': '#f59e0b',
    Approved: '#22c55e',
    'Request Part': '#f97316',
    'Work In Progress': '#3b82f6',
    'Waiting Payment': '#a855f7',
    Completed: '#10b981',
    Cancelled: '#ef4444',
  };
  const statusColor = statusColors[frm.doc.status] || '#64748b';

  const html = `
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 12px; margin: 10px 0 20px 0; box-shadow: 0 6px 18px rgba(99, 102, 241, 0.3);">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 15px;">
        <h4 style="margin: 0; font-size: 18px;">🧾 Service Order Summary</h4>
        <div style="background: ${statusColor}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
          ${escapeHtml(frm.doc.status || 'Draft')}
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
        <div style="background: rgba(255, 255, 255, 0.15); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
          <div style="font-size: 11px; opacity: 0.9;">Customer</div>
          <div style="font-size: 15px; font-weight: 700;">${escapeHtml(frm.doc.customer_display || frm.doc.customer)}</div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.15); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
          <div style="font-size: 11px; opacity: 0.9;">Vehicle</div>
          <div style="font-size: 15px; font-weight: 700;">${escapeHtml(frm.doc.vehicle_display || frm.doc.vehicle)}</div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.15); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
          <div style="font-size: 11px; opacity: 0.9;">Parts Required</div>
          <div style="font-size: 15px; font-weight: 700;">${escapeHtml(partsLabel)}</div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.15); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
          <div style="font-size: 11px; opacity: 0.9;">Mechanic</div>
          <div style="font-size: 15px; font-weight: 700;">${escapeHtml(frm.doc.assigned_mechanic_name || frm.doc.assigned_mechanic)}</div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.15); padding: 12px; border-radius: 8px; backdrop-filter: blur(10px);">
          <div style="font-size: 11px; opacity: 0.9;">Priority</div>
          <div style="font-size: 15px; font-weight: 700;">${escapeHtml(frm.doc.priority || 'Normal')}</div>
        </div>
      </div>
    </div>
  `;

  $('#service-order-quick-info').html(html);
};
