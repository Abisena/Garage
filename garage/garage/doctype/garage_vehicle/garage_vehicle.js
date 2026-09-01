// garage.attachLicensePlateAutoFormat is defined in garage_theme.js (loaded
// on every desk page via app_include_js). It has to live there, not here:
// this file is Garage Vehicle's doctype_js, which only loads when *this*
// doctype's own form is open - it does *not* load just because another
// form (e.g. Garage Service Order) references Garage Vehicle through a Link
// field and pops its Quick Entry dialog, so a formatter defined here would
// never run for that dialog.

const NON_INPUT_FIELD_TYPES = new Set([
  'Section Break',
  'Column Break',
  'Tab Break',
  'HTML',
  'Button',
  'Fold',
]);

const toggleFormEditable = (frm, enabled) => {
  frm.meta.fields.forEach((df) => {
    if (!df.fieldname || NON_INPUT_FIELD_TYPES.has(df.fieldtype)) {
      return;
    }

    if (df.__original_read_only === undefined) {
      df.__original_read_only = df.read_only || 0;
    }

    frm.set_df_property(
      df.fieldname,
      'read_only',
      enabled ? df.__original_read_only : 1,
    );
  });

  frm.refresh_fields();
};

const lockIfNeeded = (frm) => {
  if (!frm.is_new() && !frm.__is_update_mode) {
    toggleFormEditable(frm, false);
  }
};

const OWNER_AVATAR_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed'];

const ownerAvatarHtml = (name, size) => {
  const clean = (name || '?').trim();
  const parts = clean.split(/\s+/);
  const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || clean[0].toUpperCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  const color = OWNER_AVATAR_COLORS[Math.abs(hash) % OWNER_AVATAR_COLORS.length];
  return `
    <div style="width:${size}px;height:${size}px;min-width:${size}px;border-radius:50%;background:${color}1a;
      color:${color};display:flex;align-items:center;justify-content:center;font-weight:700;
      font-size:${Math.round(size * 0.4)}px;">${frappe.utils.escape_html(initials)}</div>`;
};

const showOwnerHistoryDialog = (data) => {
  const rows = (data.previous_owners || [])
    .map((o) => {
      const dateOnly = (o.changed_on || '').split(' ')[0];
      const dateLabel = dateOnly ? frappe.datetime.str_to_user(dateOnly) : '-';
      const ownerName = o.owner_name || o.owner || '-';
      const changedBy = o.changed_by || '-';
      return `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 14px 8px 10px;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${ownerAvatarHtml(o.owner_name || o.owner, 24)}
              <span style="font-weight:500;white-space:nowrap;">${frappe.utils.escape_html(ownerName)}</span>
            </div>
          </td>
          <td style="padding:8px 14px 8px 10px;white-space:nowrap;color:#6b7280;">${frappe.utils.escape_html(o.phone || '-')}</td>
          <td style="padding:8px 14px 8px 10px;white-space:nowrap;color:#6b7280;">${dateLabel}</td>
          <td style="padding:8px 10px;white-space:nowrap;color:#6b7280;">${frappe.utils.escape_html(changedBy)}</td>
        </tr>`;
    })
    .join('');

  const tableHtml = rows
    ? `<div style="margin-top:10px;border:1px solid #f1f5f9;border-radius:8px;overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <colgroup>
            <col><col><col><col style="width:100%;">
          </colgroup>
          <thead>
            <tr style="text-align:left;background:#f8fafc;color:#9ca3af;">
              <th style="padding:8px 10px;white-space:nowrap;font-weight:600;">${__('PEMILIK')}</th>
              <th style="padding:8px 10px;white-space:nowrap;font-weight:600;">${__('TELEPON')}</th>
              <th style="padding:8px 10px;white-space:nowrap;font-weight:600;">${__('TGL DIUBAH')}</th>
              <th style="padding:8px 10px;white-space:nowrap;font-weight:600;">${__('OLEH')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
    : `<div style="color:#9ca3af;font-size:12px;margin-top:10px;padding:14px;text-align:center;background:#f8fafc;border-radius:8px;">${__('Belum ada perubahan pemilik.')}</div>`;

  const currentPhone = data.current_owner.phone
    ? ` • ${frappe.utils.escape_html(data.current_owner.phone)}`
    : '';

  const d = new frappe.ui.Dialog({
    title: __('Riwayat Pemilik'),
    fields: [
      {
        fieldtype: 'HTML',
        options: `
          <div style="font-size:11px;font-weight:600;color:#9ca3af;letter-spacing:0.02em;">${frappe.utils.escape_html(data.vehicle)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;padding:12px;background:#f8fafc;border:1px solid #eef2f7;border-radius:8px;">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
              ${ownerAvatarHtml(data.current_owner.owner_name, 38)}
              <div style="min-width:0;">
                <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${frappe.utils.escape_html(data.current_owner.owner_name || '-')}</div>
                <div style="font-size:11px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${frappe.utils.escape_html(data.current_owner.owner || '-')}${currentPhone}</div>
              </div>
            </div>
            <span class="indicator-pill green" style="font-size:10px;white-space:nowrap;flex-shrink:0;">${__('PEMILIK SAAT INI')}</span>
          </div>
          <div style="font-size:11px;font-weight:600;color:#9ca3af;margin-top:16px;text-transform:uppercase;letter-spacing:0.02em;">${__('Pemilik Sebelumnya')}</div>
          ${tableHtml}
        `,
      },
    ],
    primary_action_label: __('Tutup'),
    primary_action() {
      d.hide();
    },
  });
  d.$wrapper.find('.modal-dialog').css({ 'max-width': '760px', margin: 'auto' });
  d.show();
};

const refreshHistoryButton = (frm) => {
  frm.remove_custom_button(__('Riwayat Pemilik'));
  if (frm.is_new()) return;

  frappe.call({
    method: 'garage.garage.doctype.garage_vehicle.garage_vehicle.get_owner_history',
    args: { vehicle: frm.doc.name },
    callback(r) {
      const data = r.message;
      if (!data) return;

      const hasHistory = (data.previous_owners || []).length > 0;
      const $btn = frm.add_custom_button(__('Riwayat Pemilik'), () => showOwnerHistoryDialog(data));
      $btn.prop('disabled', !hasHistory);
      $btn.attr('title', hasHistory ? '' : __('Belum ada perubahan pemilik'));
      $btn.css({ opacity: hasHistory ? '' : 0.5, cursor: hasHistory ? '' : 'not-allowed' });
    },
  });
};

frappe.ui.form.on('Garage Vehicle', {
  setup(frm) {
    frm.set_query('model', () => {
      const filters = {};
      if (frm.doc.brand) {
        filters.brand = frm.doc.brand;
      }

      return { filters };
    });
  },

  refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
    frm.set_df_property('customer_name', 'read_only', 1);
    garage.attachLicensePlateAutoFormat(frm.fields_dict.license_plate);

    lockIfNeeded(frm);
    refreshHistoryButton(frm);
  },

  after_save(frm) {
    frm.__is_update_mode = false;
    lockIfNeeded(frm);
    refreshHistoryButton(frm);
  },

  brand(frm) {
    if (frm.is_dirty() && frm.doc.model) {
      frm.set_value('model', null);
    }
  },
});
