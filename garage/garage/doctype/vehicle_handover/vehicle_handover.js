const CHECKLIST_FIELDS = [
  ['completeness_checked', 'Kelengkapan Kendaraan'],
  ['spare_part_release_confirmed', 'Pengeluaran Sparepart'],
  ['body_checked', 'Checklist Bodi'],
  ['workshop_approved', 'Persetujuan Workshop'],
  ['signature_captured', 'Tanda Tangan'],
  ['stamped', 'Stempel'],
];

const renderQuickInfo = (frm) => {
  const $el = frm.fields_dict.quick_info_html?.$wrapper?.find('#vehicle-handover-quick-info');
  if (!$el || !$el.length) return;

  if (frm.is_new()) {
    $el.html('');
    return;
  }

  const statusLabel = { 0: 'Draft', 1: 'Submitted', 2: 'Cancelled' }[frm.doc.docstatus] || '';
  const statusColor = { 0: '#f0ad4e', 1: '#5cb85c', 2: '#d9534f' }[frm.doc.docstatus] || '#999';

  const item = (label, value) => `
    <div style="flex:1; min-width:140px; padding:6px 10px;">
      <div style="font-size:11px; color:#8d99a6; text-transform:uppercase; letter-spacing:.03em;">${frappe.utils.escape_html(label)}</div>
      <div style="font-size:13px; font-weight:600;">${value ? frappe.utils.escape_html(String(value)) : '-'}</div>
    </div>`;

  $el.html(`
    <div style="display:flex; flex-wrap:wrap; align-items:center; background:#f8f9fa; border:1px solid #e3e8ee; border-radius:8px; padding:4px 4px;">
      ${item('SIKK Number', frm.doc.sikk_number)}
      ${item('Kendaraan', [frm.doc.license_plate, frm.doc.vehicle_brand, frm.doc.vehicle_model].filter(Boolean).join(' • '))}
      ${item('Service Order', frm.doc.service_order)}
      <div style="flex:0 0 auto; padding:6px 10px;">
        <span class="indicator-pill" style="background:${statusColor}; color:#fff;">${statusLabel}</span>
      </div>
    </div>
  `);
};

const renderChecklistProgress = (frm) => {
  const $el = frm.fields_dict.checklist_progress_html?.$wrapper?.find('#checklist-progress');
  if (!$el || !$el.length) return;

  const done = CHECKLIST_FIELDS.filter(([fieldname]) => cint(frm.doc[fieldname])).length;
  const total = CHECKLIST_FIELDS.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const color = pct === 100 ? '#5cb85c' : pct > 0 ? '#f0ad4e' : '#d9534f';

  $el.html(`
    <div style="margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; margin-bottom:4px;">
        <span>Checklist Progress</span>
        <span>${done} / ${total}</span>
      </div>
      <div style="background:#e3e8ee; border-radius:6px; height:8px; overflow:hidden;">
        <div style="width:${pct}%; height:100%; background:${color};"></div>
      </div>
    </div>
  `);
};

frappe.ui.form.on('Vehicle Handover', {
  refresh(frm) {
    renderQuickInfo(frm);
    renderChecklistProgress(frm);
  },
  ...Object.fromEntries(
    CHECKLIST_FIELDS.map(([fieldname]) => [fieldname, (frm) => renderChecklistProgress(frm)])
  ),
});
