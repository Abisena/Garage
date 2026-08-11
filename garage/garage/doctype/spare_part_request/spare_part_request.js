// Client Script for Spare Part Request

const STATUS_STYLES = {
  'Request Part': { bg: '#fef3c7', fg: '#92400e', label: 'Request' },
  'Prepared':     { bg: '#d1fae5', fg: '#065f46', label: 'Prepared' },
  'Out of Stock': { bg: '#fee2e2', fg: '#991b1b', label: 'Out of Stock' },
  'Rejected':     { bg: '#fecaca', fg: '#7f1d1d', label: 'Rejected' },
};

function updateItemStatus(frm, itemName, status) {
  frappe.call({
    method: 'garage.garage.doctype.spare_part_request.spare_part_request.update_items_status',
    args: { name: frm.doc.name, item_names: [itemName], status },
    freeze: true,
    freeze_message: 'Updating...',
    callback(r) {
      if (!r.exc) frm.reload_doc();
    },
  });
}

function renderItemsTable(frm) {
  const wrapper = frm.fields_dict.items.$wrapper;
  wrapper.find('.spr-custom-table').remove();

  const items = frm.doc.items || [];
  if (!items.length) return;

  // A new/unsaved draft has no real frm.doc.name yet, so the per-row
  // Prepared/Reject actions (which call the server with that name) can't
  // work here - show the same styled table, just without those buttons.
  const isNew = frm.is_new();

  const rows = items.map((row, i) => {
    const st = STATUS_STYLES[row.approval_status] || STATUS_STYLES['Request Part'];
    const badge = `<span style="background:${st.bg};color:${st.fg};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${frappe.utils.escape_html(st.label)}</span>`;

    const isRequest = (row.approval_status || '').toLowerCase() === 'request part';
    let actions = '';
    if (isRequest && !isNew) {
      actions = `
        <button class="btn btn-xs spr-act" data-name="${row.name}" data-status="Prepared" style="background:#059669;color:#fff;border:none;border-radius:6px;padding:3px 10px;font-weight:700;font-size:10px;margin-right:4px;">Prepared</button>
        <button class="btn btn-xs spr-act" data-name="${row.name}" data-status="Rejected" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:3px 10px;font-weight:700;font-size:10px;">Reject</button>`;
    }

    const bgColor = i % 2 === 0 ? '#fff' : '#f8f9fb';
    return `<tr style="background:${bgColor};border-bottom:1px solid #f1f5f9;">
      <td style="padding:8px 10px;font-size:12px;color:#6b7280;text-align:center;width:36px;">${i + 1}</td>
      <td style="padding:8px 10px;font-size:12px;font-weight:600;">${frappe.utils.escape_html(row.item_code || '')}</td>
      <td style="padding:8px 10px;font-size:12px;">${frappe.utils.escape_html(row.item_name || '')}</td>
      <td style="padding:8px 10px;font-size:12px;text-align:center;">${row.qty || 0}</td>
      <td style="padding:8px 10px;font-size:12px;text-align:center;">${flt(row.stock_qty)}</td>
      <td style="padding:8px 10px;font-size:12px;">${frappe.utils.escape_html(row.warehouse || '')}</td>
      <td style="padding:8px 10px;text-align:center;">${badge}</td>
      <td style="padding:8px 10px;text-align:center;white-space:nowrap;">${actions}</td>
    </tr>`;
  }).join('');

  const thStyle = 'padding:8px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;';
  const html = `
    <div class="spr-custom-table" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-top:8px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#1f2937;">
            <th style="${thStyle}text-align:center;width:36px;">No.</th>
            <th style="${thStyle}">Item Code</th>
            <th style="${thStyle}">Item Name</th>
            <th style="${thStyle}text-align:center;">Qty</th>
            <th style="${thStyle}text-align:center;">Stock</th>
            <th style="${thStyle}">Location</th>
            <th style="${thStyle}text-align:center;">Status</th>
            <th style="${thStyle}text-align:center;">Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  wrapper.append(html);

  wrapper.find('.spr-act').on('click', function (e) {
    e.stopPropagation();
    const btn = $(this);
    const itemName = btn.data('name');
    const status = btn.data('status');
    const row = items.find(r => r.name == itemName);
    const isPrepare = status === 'Prepared';
    const iconBg = isPrepare ? '#d1fae5' : '#fee2e2';
    const iconColor = isPrepare ? '#059669' : '#dc2626';
    const iconPath = isPrepare
      ? '<path d="M20 6L9 17l-5-5"/>'
      : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    const label = isPrepare ? 'Prepared' : 'Reject';
    const btnBg = isPrepare ? '#059669' : '#dc2626';
    const d = new frappe.ui.Dialog({
      title: ' ',
      fields: [{
        fieldtype: 'HTML',
        options: `
          <div style="text-align:center;padding:10px 0;">
            <div style="width:56px;height:56px;border-radius:50%;background:${iconBg};display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
              <svg width="28" height="28" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">${iconPath}</svg>
            </div>
            <div style="font-size:15px;font-weight:700;color:#1f2937;margin-bottom:6px;">${label} Item?</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.5;">
              <strong>${frappe.utils.escape_html(row?.item_name || row?.item_code || '')}</strong>
            </div>
          </div>`
      }],
      primary_action_label: label,
      primary_action() {
        d.hide();
        updateItemStatus(frm, String(itemName), status);
      },
      secondary_action_label: 'Batal',
    });
    d.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
    d.$wrapper.find('.btn-primary').css({background: btnBg, border: 'none', fontWeight: '600'});
    d.show();
  });
}

function subscribeToUpdates(frm) {
  if (frm._sprRealtimeBound) return;
  frm._sprRealtimeBound = true;

  frappe.realtime.on('garage_spare_part_request_updated', (payload) => {
    if (!payload || payload.name !== frm.doc.name) return;
    if (frm._sprReloading) return;

    frm._sprReloading = true;
    frm.reload_doc().finally(() => {
      frm._sprReloading = false;
    });
  });
}

frappe.ui.form.on('Spare Part Request', {
  refresh(frm) {
    subscribeToUpdates(frm);

    const grid = frm.fields_dict.items?.grid;
    if (grid) {
      grid.df.cannot_add_rows = true;
      grid.df.cannot_delete_rows = true;
      grid.wrapper.find('.grid-add-row, .grid-add-multiple-rows, .grid-remove-rows, .grid-remove-all-rows').hide();
      grid.wrapper.find('.frappe-list, .grid-body, .grid-heading-row, .grid-footer').hide();
    }

    renderItemsTable(frm);

    if (!frm.is_new()) {
      frm.set_df_property('status', 'read_only', 1);
      if (!frm._sprButtonsDone) {
        frm._sprButtonsDone = true;
        add_simple_buttons(frm);
      }
    }
  },

  onload(frm) {
    if (frm.is_new()) {
      if (!frm.doc.request_date) frm.set_value('request_date', frappe.datetime.get_today());
      if (!frm.doc.status) frm.set_value('status', 'Request Part');
    }
  },

  before_save(frm) {
    if (!frm.doc.items || frm.doc.items.length === 0) {
      frappe.msgprint({ title: __('No Items'), message: __('Tambahkan minimal satu item.'), indicator: 'red' });
      frappe.validated = false;
    }
  },
});

function add_simple_buttons(frm) {
  if (frm.is_new()) return;

  const updateAll = (status) => {
    const items = frm.doc.items || [];
    if (!items.length) {
      frappe.msgprint({ title: __('No Items'), message: __('Tidak ada item.'), indicator: 'orange' });
      return;
    }
    const label = status === 'Prepared' ? 'PREPARE' : 'REJECT';
    frappe.confirm(
      `${label} ALL <strong>${items.length}</strong> items?`,
      () => {
        frappe.dom.freeze('Updating...');
        frappe.call({
          method: 'garage.garage.doctype.spare_part_request.spare_part_request.update_items_status',
          args: { name: frm.doc.name, item_names: items.map(r => r.name), status },
          callback(r) {
            frappe.dom.unfreeze();
            if (!r.exc) {
              frm.reload_doc();
              frappe.show_alert({ message: `All ${items.length} items ${label}D`, indicator: status === 'Prepared' ? 'green' : 'red' }, 5);
            }
          },
        });
      }
    );
  };

  frm.add_custom_button(__('Prepared All'), () => updateAll('Prepared'), __('Actions'));
  frm.add_custom_button(__('Rejected All'), () => updateAll('Rejected'), __('Actions'));
}

frappe.ui.form.on('Spare Part Request Item', {});

frappe.listview_settings['Spare Part Request'] = {
  get_indicator(doc) {
    const map = { 'Request Part': 'orange', 'Partial Prepared': 'blue', 'Partial Reject': 'orange', 'Prepared': 'green', 'Rejected': 'red' };
    return [doc.status, map[doc.status] || 'gray', 'status,=,' + doc.status];
  },
};
