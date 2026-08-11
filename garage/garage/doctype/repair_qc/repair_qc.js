const QC_SECTIONS = [
  {
    id: 'mechanical', label: 'Mechanical', color: '#2563eb',
    fields: [
      { f: 'brakes_functioning_properly', label: 'Rem berfungsi baik' },
      { f: 'engine_starts_smoothly', label: 'Mesin start normal' },
      { f: 'no_fluid_leaks_detected', label: 'Tidak ada kebocoran cairan' },
      { f: 'lights_and_signals_functional', label: 'Lampu dan sein berfungsi' },
      { f: 'battery_holding_charge', label: 'Aki normal' },
      { f: 'power_steering_responsive', label: 'Power steering responsif' },
      { f: 'suspension_normal', label: 'Suspensi normal' },
      { f: 'steering_alignment_normal', label: 'Alignment stir normal' },
    ]
  },
  {
    id: 'cleanliness', label: 'Kebersihan', color: '#0891b2',
    fields: [
      { f: 'windows_and_mirrors_cleaned', label: 'Kaca dan spion bersih' },
      { f: 'exterior_washed_and_dried', label: 'Eksterior dicuci' },
      { f: 'interior_vacuumed_and_wiped', label: 'Interior divakum' },
      { f: 'interior_disinfected', label: 'Interior didisinfeksi' },
      { f: 'interior_reconditioned', label: 'Interior direkondisi' },
      { f: 'interior_air_freshener', label: 'Pengharum ruangan' },
    ]
  },
  {
    id: 'documentation', label: 'Dokumentasi', color: '#7c3aed',
    fields: [
      { f: 'all_work_order_documented', label: 'Work order terdokumentasi' },
      { f: 'spare_parts_installation_verified', label: 'Pemasangan part terverifikasi' },
      { f: 'photos_before_after_taken', label: 'Foto before/after diambil' },
    ]
  },
  {
    id: 'testdrive', label: 'Test Drive', color: '#059669',
    fields: [
      { f: 'acceleration_smooth_responsive', label: 'Akselerasi halus' },
      { f: 'braking_effective_without_pulling', label: 'Pengereman efektif' },
      { f: 'no_unusual_noise_during_drive', label: 'Tidak ada suara abnormal' },
      { f: 'dry_and_wet_brakes_tested', label: 'Rem kering/basah ditest' },
      { f: 'dashboard_indicators_normal', label: 'Indikator dashboard normal' },
    ]
  },
];

const getAllFields = () => {
  const all = [];
  QC_SECTIONS.forEach(s => s.fields.forEach(f => all.push(f.f)));
  return all;
};

const getStats = (frm) => {
  let total = 0, checked = 0;
  QC_SECTIONS.forEach(s => s.fields.forEach(f => { total++; if (frm.doc[f.f]) checked++; }));
  return { total, checked, pct: total ? Math.round(checked / total * 100) : 0 };
};

const getSectionStats = (frm, section) => {
  let total = 0, checked = 0;
  section.fields.forEach(f => { total++; if (frm.doc[f.f]) checked++; });
  return { total, checked };
};

const renderChecklist = (frm) => {
  const $target = $(frm.fields_dict.checklist_html?.wrapper);
  if (!$target.length) return;

  const { total, checked, pct } = getStats(frm);
  const barColor = pct === 100 ? '#059669' : pct > 50 ? '#d97706' : '#ef4444';
  const isLocked = frm.doc.status === 'QC Complete';

  let html = `<div class="qc-app">`;

  html += `<div class="qc-grid">`;

  QC_SECTIONS.forEach(section => {
    const ss = getSectionStats(frm, section);
    const sectionDone = ss.checked === ss.total;
    const sectionColor = sectionDone ? '#059669' : ss.checked > 0 ? '#d97706' : '#6b7280';

    html += `
      <div class="qc-section" data-section="${section.id}">
        <div class="qc-section-header">
          <div class="qc-section-title">${section.label}</div>
          <div class="qc-section-meta">
            <span class="qc-section-badge" style="background:${sectionColor}">${ss.checked}/${ss.total}</span>
            ${!isLocked ? `<span class="qc-check-all" data-section="${section.id}">${sectionDone ? 'Uncheck' : 'Check All'}</span>` : ''}
          </div>
        </div>
        <div class="qc-section-items">
    `;

    section.fields.forEach((field) => {
      const isChecked = frm.doc[field.f] ? true : false;
      html += `
        <div class="qc-item ${isChecked ? 'qc-item-checked' : ''} ${isLocked ? 'qc-item-locked' : ''}" data-field="${field.f}">
          <div class="qc-item-check">${isChecked ? '&#10003;' : ''}</div>
          <span class="qc-item-label">${field.label}</span>
        </div>
      `;
    });

    html += `</div></div>`;
  });

  html += `</div>`;

  // Result card
  const status = frm.doc.status;
  if (status === 'QC Complete') {
    html += `<div class="qc-result qc-result-pass"><div class="qc-result-icon">&#10003;</div><div class="qc-result-title">QC PASSED</div><div class="qc-result-sub">Kendaraan lolos inspeksi dan siap diserahkan</div></div>`;
  } else if (status === 'Fail') {
    html += `<div class="qc-result qc-result-fail"><div class="qc-result-icon">&#10007;</div><div class="qc-result-title">QC FAILED</div><div class="qc-result-sub">Inspeksi tidak lolos. Lihat catatan untuk detail.</div></div>`;
  } else if (pct === 100) {
    html += `<div class="qc-result qc-result-ready"><div class="qc-result-icon">&#9889;</div><div class="qc-result-title">SIAP REVIEW</div><div class="qc-result-sub">Semua item sudah dicek. Pilih Pass atau Fail.</div></div>`;
  }

  html += `</div>`;
  $target.html(html);

  // Bind events
  if (!isLocked) {
    $target.find('.qc-item:not(.qc-item-locked)').on('click', function () {
      const field = $(this).data('field');
      const newVal = frm.doc[field] ? 0 : 1;
      frm.set_value(field, newVal);
      setTimeout(() => { renderChecklist(frm); setupButtons(frm); }, 50);
    });

    $target.find('.qc-check-all').on('click', function (e) {
      e.stopPropagation();
      const sectionId = $(this).data('section');
      const section = QC_SECTIONS.find(s => s.id === sectionId);
      if (!section) return;
      const allChecked = section.fields.every(f => frm.doc[f.f]);
      section.fields.forEach(f => frm.set_value(f.f, allChecked ? 0 : 1));
      setTimeout(() => { renderChecklist(frm); setupButtons(frm); }, 50);
    });
  }

  // Update primary button state
  if (frm.page.btn_primary && status !== 'QC Complete' && status !== 'Fail') {
    frm.page.btn_primary.prop('disabled', pct < 100).css({
      opacity: pct < 100 ? 0.5 : 1,
      cursor: pct < 100 ? 'not-allowed' : 'pointer'
    });
  }
};

const isPartsAllVerified = (frm) => {
  const parts = (frm._partsData?.items || []).filter(p => p.item_code);
  return parts.length > 0 && parts.every(p => p._verified);
};

const updateQcPassButton = (frm) => {
  const { pct } = getStats(frm);
  const partsOk = isPartsAllVerified(frm);
  const canPass = pct === 100 && partsOk;
  if (frm.page.btn_primary && frm.doc.status !== 'QC Complete' && frm.doc.status !== 'Fail') {
    frm.page.btn_primary.prop('disabled', !canPass).css({
      opacity: canPass ? 1 : 0.5,
      cursor: canPass ? 'pointer' : 'not-allowed'
    });
  }
};

const renderPartsTable = (frm) => {
  const $target = $(frm.fields_dict.parts_table_html?.wrapper);
  if (!$target.length || !frm.doc.service_order) return;

  if (!frm._partsData) frm._partsData = {};

  const parts = (frm._partsData.items || []).filter(p => p.item_code);
  if (!parts.length) {
    $target.html('');
    return;
  }

  const allVerified = parts.every(p => p._verified);
  let totalAmount = 0;
  let rows = '';

  parts.forEach((p, i) => {
    const amount = flt(p.qty) * flt(p.rate);
    totalAmount += amount;
    const checked = p._verified ? true : false;
    rows += `
      <tr class="pv-row ${checked ? 'pv-checked' : ''}" data-idx="${i}">
        <td class="pv-check-cell">
          <div class="pv-checkbox ${checked ? 'pv-cb-on' : ''}">
            ${checked ? '&#10003;' : ''}
          </div>
        </td>
        <td class="pv-name">${p.item_name || p.item_code}</td>
        <td class="pv-code">${p.item_code}</td>
        <td class="pv-qty">${p.qty || 1}</td>
        <td class="pv-price">${frappe.format(p.rate, {fieldtype: 'Currency'})}</td>
        <td class="pv-total">${frappe.format(amount, {fieldtype: 'Currency'})}</td>
      </tr>`;
  });

  const verifiedCount = parts.filter(p => p._verified).length;
  const badgeColor = allVerified ? '#059669' : verifiedCount > 0 ? '#d97706' : '#6b7280';

  $target.html(`
    <div class="pv-container">
      <div class="pv-header">
        <span>Installed Parts Verification</span>
        <span class="pv-badge" style="background:${badgeColor}">${verifiedCount}/${parts.length}</span>
      </div>
      <table class="pv-table">
        <thead>
          <tr>
            <th class="pv-th-check">&#10003;</th>
            <th>Part Name</th>
            <th>Part Number</th>
            <th class="pv-th-qty">Qty</th>
            <th class="pv-th-price">Unit Price</th>
            <th class="pv-th-total">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="pv-foot-label">TOTAL</td>
            <td class="pv-foot-total">${frappe.format(totalAmount, {fieldtype: 'Currency'})}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `);

  $target.find('.pv-row').on('click', function () {
    const idx = $(this).data('idx');
    parts[idx]._verified = !parts[idx]._verified;
    renderPartsTable(frm);
    setupButtons(frm);
  });

  updateQcPassButton(frm);
};

const setupButtons = (frm) => {
  if (frm.doc.status === 'QC Complete') {
    frm.disable_save();
    frm.page.set_primary_action(__('Reopen QC'), () => {
      const soName = frm.doc.service_order;
      frappe.call({
        method: 'frappe.client.set_value',
        args: { doctype: 'Repair QC', name: frm.doc.name, fieldname: 'status', value: 'Reopened' },
        freeze: true,
        freeze_message: 'Reopening...',
        callback() {
          if (soName) {
            frappe.call({
              method: 'garage.garage.doctype.garage_service_order.garage_service_order.reopen_service_order',
              args: { service_order_name: soName },
              async: false,
            });
          }
          frm.reload_doc();
        },
      });
    });
    // Locked once QC is finished: Sales Invoice/Payment Entry auto-create
    // as soon as status hits QC Complete, so QC can no longer be reopened
    // from the UI at that point (avoids orphaning the invoice).
    frm.page.btn_primary
      .prop('disabled', true)
      .attr('title', 'QC tidak bisa dibuka kembali setelah proses pembayaran dimulai')
      .css({ background: '#d97706', border: 'none', opacity: 0.5, cursor: 'not-allowed' });
  } else if (frm.doc.status !== 'Fail') {
    frm.page.set_primary_action(__('Finished Inspection'), () => {
      const d = new frappe.ui.Dialog({
        title: ' ',
        fields: [{
          fieldtype: 'HTML',
          options: `<div style="text-align:center;padding:10px 0;">
            <div style="width:56px;height:56px;border-radius:50%;background:#d1fae5;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:24px;color:#059669;">&#10003;</div>
            <div style="font-size:15px;font-weight:700;color:#059669;">Finished Inspection?</div>
            <div style="font-size:12px;color:#6b7280;">Kendaraan dinyatakan lolos inspeksi.</div>
          </div>`
        }],
        primary_action_label: 'Finish',
        primary_action() {
          d.hide();
          frm.set_value('status', 'QC Complete');
          frm.save().then(() => {
            if (frm.doc.service_order) {
              frappe.call({
                method: 'garage.garage.doctype.garage_service_order.garage_service_order.complete_qc',
                args: { service_order_name: frm.doc.service_order },
              });
            }
          });
        },
        secondary_action_label: 'Batal',
      });
      d.$wrapper.find('.modal-dialog').css({'max-width':'380px',margin:'auto'});
      d.$wrapper.find('.btn-primary').css({background:'#059669',border:'none'});
      d.show();
    });

    frm.add_custom_button(__('Reject Inspection'), () => {
      const d = new frappe.ui.Dialog({
        title: ' ',
        fields: [{
          fieldtype: 'HTML',
          options: `<div style="text-align:center;padding:10px 0;">
            <div style="width:56px;height:56px;border-radius:50%;background:#fee2e2;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:24px;color:#dc2626;">&#10007;</div>
            <div style="font-size:15px;font-weight:700;color:#dc2626;">Reject Inspection?</div>
            <div style="font-size:12px;color:#6b7280;margin-top:6px;">Service Order akan dikembalikan ke <strong>In Progress</strong> untuk diperbaiki mechanic.</div>
          </div>`
        }],
        primary_action_label: 'Fail',
        primary_action() {
          d.hide();
          frm.set_value('status', 'Fail');
          frm.save().then(() => {
            if (frm.doc.service_order) {
              frappe.call({
                method: 'garage.garage.doctype.garage_service_order.garage_service_order.reopen_service_order',
                args: { service_order_name: frm.doc.service_order },
                freeze: true,
                freeze_message: 'Mengembalikan ke mechanic...',
                callback(r) {
                  if (r.message) {
                    frappe.show_alert({ message: 'Service Order dikembalikan ke In Progress.', indicator: 'orange' }, 5);
                  }
                },
              });
            }
          });
        },
        secondary_action_label: 'Batal',
      });
      d.$wrapper.find('.modal-dialog').css({'max-width':'380px',margin:'auto'});
      d.$wrapper.find('.btn-primary').css({background:'#dc2626',border:'none'});
      d.show();
    });

    updateQcPassButton(frm);
  }
};

frappe.ui.form.on('Repair QC', {
  refresh(frm) {
    setTimeout(async () => {
      renderChecklist(frm);
      if (frm.doc.service_order && !frm._partsData?.items?.length) {
        const so = await frappe.db.get_doc('Garage Service Order', frm.doc.service_order);
        frm._partsData = {
          items: (so.required_parts || [])
            .filter(p => p.item_code)
            .map(p => ({
              item_code: p.item_code, item_name: p.item_name,
              qty: p.qty, rate: p.rate, _verified: false,
            }))
        };
      }
      renderPartsTable(frm);
      if (!frm.is_new()) setupButtons(frm);
    }, 300);
  },

  async service_order(frm) {
    if (!frm.doc.service_order) {
      frm._partsData = {};
      renderPartsTable(frm);
      return;
    }
    const so = await frappe.db.get_doc('Garage Service Order', frm.doc.service_order);
    const parts = (so.required_parts || [])
      .filter(p => p.item_code)
      .map(p => ({
        item_code: p.item_code,
        item_name: p.item_name,
        qty: p.qty,
        rate: p.rate,
        _verified: false,
      }));
    frm._partsData = { items: parts };
    renderPartsTable(frm);
  },
});
