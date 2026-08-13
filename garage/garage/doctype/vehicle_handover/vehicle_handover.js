const item = (label, value) => `
  <div style="flex:1; min-width:140px; padding:6px 10px;">
    <div style="font-size:11px; color:#8d99a6; text-transform:uppercase; letter-spacing:.03em;">${frappe.utils.escape_html(label)}</div>
    <div style="font-size:13px; font-weight:600;">${value ? frappe.utils.escape_html(String(value)) : '-'}</div>
  </div>`;

const renderQuickInfo = (frm) => {
  const $el = frm.fields_dict.quick_info_html?.$wrapper?.find('#vehicle-handover-quick-info');
  if (!$el || !$el.length) return;

  if (frm.is_new()) {
    $el.html('');
    return;
  }

  const statusLabel = { 0: 'Draft', 1: 'Submitted', 2: 'Cancelled' }[frm.doc.docstatus] || '';
  const statusColor = { 0: '#f0ad4e', 1: '#5cb85c', 2: '#d9534f' }[frm.doc.docstatus] || '#999';

  $el.html(`
    <div style="display:flex; flex-wrap:wrap; align-items:center; background:#f8f9fa; border:1px solid #e3e8ee; border-radius:8px; padding:4px 4px;">
      ${item('SIKK Number', frm.doc.sikk_number)}
      ${item('Kendaraan', [frm.doc.vehicle, frm.doc.vehicle_brand, frm.doc.vehicle_model].filter(Boolean).join(' • '))}
      ${item('Pemilik', frm.doc.owner_name)}
      ${item('Service Order', frm.doc.service_order)}
      <div style="flex:0 0 auto; padding:6px 10px;">
        <span class="indicator-pill" style="background:${statusColor}; color:#fff;">${statusLabel}</span>
      </div>
    </div>
    <div class="sikk-preview-row" style="display:flex; flex-wrap:wrap; align-items:center; background:#fdf6e3; border:1px solid #f0e0a8; border-radius:8px; padding:4px 4px; margin-top:8px;"></div>
  `);

  // Same data the printed SIKK shows - fetched separately since it's
  // derived from the linked Service Order/Sales Invoice, not stored
  // directly on this doc. Only re-fetch when service_order actually
  // changes, not on every refresh.
  if (!frm.doc.service_order) return;
  if (frm._sikkPreviewFor === frm.doc.service_order) return;
  frm._sikkPreviewFor = frm.doc.service_order;

  frappe.call({
    method: 'garage.garage.doctype.vehicle_handover.vehicle_handover.get_sikk_preview',
    args: { name: frm.doc.name },
  }).then((r) => {
    const ctx = r.message || {};
    const $row = $el.find('.sikk-preview-row');
    if (!$row.length) return;
    $row.html(`
      ${item('Tanggal Masuk', ctx.tanggal_masuk ? frappe.datetime.str_to_user(ctx.tanggal_masuk) : null)}
      ${item('Tanggal Keluar', ctx.tanggal_keluar ? frappe.datetime.str_to_user(String(ctx.tanggal_keluar).split(' ')[0]) : null)}
      ${item('Jenis Service', ctx.jenis_service)}
      ${item('Mekanik', [ctx.mechanic_name, ctx.mechanic_code].filter(Boolean).join(' • '))}
      ${item('Ref. Nota', ctx.ref_nota)}
    `);
  });
};

frappe.ui.form.on('Vehicle Handover', {
  refresh(frm) {
    renderQuickInfo(frm);

    if (frm.doc.service_order) {
      frm.add_custom_button(frm.doc.service_order, () => {
        frappe.set_route('Form', 'Garage Service Order', frm.doc.service_order);
      }, __('View'));
    }
    if (frm.doc.payment_entry) {
      frm.add_custom_button(frm.doc.payment_entry, () => {
        frappe.set_route('Form', 'Payment Entry', frm.doc.payment_entry);
      }, __('View'));
    }
  },
  on_submit(frm) {
    // After Submit, jump straight to the print-ready view of the SIKK
    // (Garage Vehicle Handover Print, already the default print format for
    // this doctype) - same pattern as Payment Entry's auto-print on submit.
    frm.print_doc();
  },
});
