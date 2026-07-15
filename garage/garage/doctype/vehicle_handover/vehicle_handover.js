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
      ${item('Pemilik', frm.doc.owner_name)}
      ${item('Service Order', frm.doc.service_order)}
      <div style="flex:0 0 auto; padding:6px 10px;">
        <span class="indicator-pill" style="background:${statusColor}; color:#fff;">${statusLabel}</span>
      </div>
    </div>
  `);
};

frappe.ui.form.on('Vehicle Handover', {
  refresh(frm) {
    renderQuickInfo(frm);
  },
  on_submit(frm) {
    // After Submit, jump straight to the print-ready view of the SIKK
    // (Garage Vehicle Handover Print, already the default print format for
    // this doctype) - same pattern as Payment Entry's auto-print on submit.
    frm.print_doc();
  },
});
