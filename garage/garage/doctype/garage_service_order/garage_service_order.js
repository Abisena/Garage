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

frappe.ui.form.on('Repair Orders', {
  refresh(frm) {
    const statusField = frm.fields_dict.required_parts?.grid?.get_field('stock_status');
    if (statusField) {
      statusField.formatter = formatStockStatus;
      frm.refresh_field('required_parts');
    }
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
  },
});
