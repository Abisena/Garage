a// Copyright (c) 2024, Contributors
// For license information, please see license.txt

const REQUEST_STATUS = 'Request Spare Part';
const STATUS_INDICATORS = {
  'Request Spare Part': 'orange',
  Prepared: 'green',
  Rejected: 'red',
  'Out of Stock': 'red',
};

// 'request spare part' is deliberately excluded: it's the client-side default the
// moment an item is picked, before it has actually been sent. Only `sentNames`
// (backed by a real Spare Part Request link) proves a row was truly sent.
const PART_LOCKED_STATUSES = [
  'prepared', 'rejected', 'out of stock',
  'issued', 'received', 'approved',
];

const isPartRowLocked = (frm, rowDoc) => {
  if (!rowDoc || rowDoc.__islocal) return false;
  if (!rowDoc.item_code) {
    // Non-item rows (e.g. "Jasa" service fee) lock once the order has been sent at least once.
    return frm.doc.status !== 'Open';
  }
  const sentNames = frm._sentPartRowNames || new Set();
  if (sentNames.has(String(rowDoc.name))) return true;
  return PART_LOCKED_STATUSES.includes((rowDoc.stock_status || '').toLowerCase());
};

const STATUS_COLORS = {
  Open: 'blue',
  'Waiting Part': 'yellow',
  Prepared: 'green',
  'In Progress': 'light-blue',
  Finished: 'cyan',
  'QC Review': 'purple',
  'Waiting Payment': 'orange',
  Completed: 'green',
  Cancelled: 'red',
};

const formatStockStatus = (value) => {
  if (!value) {
    return '';
  }
  const indicator = STATUS_INDICATORS[value] || 'gray';
  return `<span class="indicator-pill ${indicator}">${value}</span>`;
};

const fetchServiceFee = (serviceOrderType) =>
  frappe.call({
    method: 'garage.garage.doctype.garage_service_order.garage_service_order.get_service_type_fee',
    args: { service_order_type: serviceOrderType },
  });

const fetchPackageItems = (bundleName) =>
  frappe.call({
    method: 'garage.garage.doctype.garage_service_order.garage_service_order.get_package_items',
    args: { bundle_name: bundleName },
  });

const applyBundleItems = (frm, items, { replace = false } = {}) => {
  if (!items || !items.length) {
    frappe.msgprint(__('Tidak ada item bundle yang tersedia.'));
    return;
  }

  if (replace) {
    frm.clear_table('required_parts');
  } else {
    // get_garage_bundle_items (garage_service_order.py) always bundles its
    // own "Jasa Paket {name}" labor line alongside the parts/materials -
    // the generic Service Type flat fee (addServiceFeeRow, below) is the
    // only required_parts row ever added with no item_code, so dropping
    // rows without one here is what stops a package selection from
    // double-billing labor on top of the flat fee that was auto-added
    // when Service Type was first picked.
    const withoutGenericFee = (frm.doc.required_parts || []).filter((row) => row.item_code);
    if (withoutGenericFee.length !== (frm.doc.required_parts || []).length) {
      frm.doc.required_parts = withoutGenericFee;
    }
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
    row.item_name = item.item_name || '';
    row.description = item.description || '';
    row.qty = item.qty || 1;
    row.rate = flt(item.rate);
    row.discount = 0;
    row.tax = 0;
    row.amount = flt(flt(row.qty) * flt(row.rate));
    row.stock_status = item.is_stock_item ? REQUEST_STATUS : '';
    existing.add(item.item_code);
  });

  frm.refresh_field('required_parts');
  renderTableFooter(frm);
};

const fetchSentPartNames = (frm) => {
  if (frm.is_new()) {
    frm._sentPartRowNames = new Set();
    return;
  }
  frappe.call({
    method: 'garage.garage.doctype.garage_service_order.garage_service_order.get_sent_part_row_names',
    args: { service_order_name: frm.doc.name },
    callback(r) {
      // Row names come back as strings (Data fieldtype); normalize so `.has()`
      // lookups against numeric row.doc.name (autoincrement child table) still match.
      const names = new Set((r.message || []).map(String));
      const previous = frm._sentPartRowNames;
      const changed = !previous
        || previous.size !== names.size
        || [...names].some((name) => !previous.has(name));
      frm._sentPartRowNames = names;

      // The primary action (Send New Part / Send Additional Part) is rendered
      // synchronously in refresh(), before this async call resolves, so it can
      // briefly show the wrong enabled/disabled state. Re-run refresh once the
      // real "already sent" set arrives so the button reflects reality without
      // needing a manual reload. Guarded by `changed` so this settles after one
      // extra pass instead of looping.
      if (changed) {
        frm.refresh();
      }
    },
  });
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

const addServiceFeeRow = (frm, data) => {
  const fee = flt(data.service_fee);
  if (!fee) return;
  // A Paket Service already carries its own labor line (see applyBundleItems's
  // own comment above / get_garage_bundle_items in garage_service_order.py) -
  // skip the generic flat fee entirely whenever a package is already selected,
  // so re-picking Service Type while a package is active can't double-bill
  // labor back in.
  if (frm.doc.service_package) return;

  const label = 'Jasa ' + (frm.doc.service_order_type || 'Servis');
  const exists = (frm.doc.required_parts || []).some(
    (r) => r.item_name === label
  );
  if (exists) return;

  const row = frm.add_child('required_parts');
  row.item_name = label;
  row.qty = 1;
  row.rate = fee;
  row.discount = 0;
  row.tax = 0;
  row.amount = flt(fee);
  row.stock_status = '';
  frm.refresh_field('required_parts');
  renderTableFooter(frm);
};

const updatePackageFilter = (frm) => {
  const serviceType = frm.doc.service_order_type;
  if (serviceType) {
    frm.set_query('service_package', () => ({
      filters: { service_type: serviceType },
    }));
  } else {
    frm.set_query('service_package', () => ({}));
  }
  frm.set_value('service_package', '');
};

const autoApplyServiceFee = (frm) => {
  if (!frm.doc.service_order_type) return;
  fetchServiceFee(frm.doc.service_order_type).then((response) => {
    const data = response.message || {};
    addServiceFeeRow(frm, data);
  });
};

const autoApplyPackage = (frm) => {
  if (!frm.doc.service_package) return;
  fetchPackageItems(frm.doc.service_package).then((response) => {
    const data = response.message || {};
    applyBundleItems(frm, data.items || []);
  });
};

const showMissingFieldsDialog = (fields) => {
  const rows = fields.map(f => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
      <div style="width:6px;height:6px;border-radius:50%;background:#ef4444;flex-shrink:0;"></div>
      <span style="font-size:12px;color:#1f2937;font-weight:500;">${f}</span>
    </div>`).join('');

  const d = new frappe.ui.Dialog({
    title: ' ',
    fields: [{
      fieldtype: 'HTML',
      options: `
        <div style="text-align:center;padding:10px 0;">
          <div style="width:56px;height:56px;border-radius:50%;background:#fee2e2;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <svg width="28" height="28" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div style="font-size:15px;font-weight:700;color:#dc2626;margin-bottom:4px;">Data Belum Lengkap</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:12px;">Mohon lengkapi field berikut:</div>
          <div style="text-align:left;padding:4px 12px;">${rows}</div>
        </div>`
    }],
    primary_action_label: 'OK',
    primary_action() { d.hide(); },
  });
  d.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
  d.$wrapper.find('.btn-primary').css({background: '#dc2626', border: 'none', fontWeight: '600'});
  d.show();
};

const setStartRepairAction = (frm) => {
  frm.page.set_primary_action(__('Start Repair'), () => {
    // Always ask the server - it reads spk_number fresh from the DB on
    // every call. Don't pre-check frm.doc.spk_number client-side: that
    // field is only ever populated as a side effect of opening the SPK
    // print format (garage/utils/jinja.py), a plain navigation the
    // in-memory frm.doc doesn't reliably pick up on return, which was
    // sending users back to the print screen in a loop even after
    // they'd already printed it.
    frappe.call({
      method: 'garage.garage.doctype.garage_service_order.garage_service_order.start_repair',
      args: { service_order_name: frm.doc.name },
      freeze: true,
      freeze_message: 'Memulai perbaikan...',
      error(r) {
        const msg = r?.exc_type === 'ValidationError' ? (r?._server_messages && JSON.parse(r._server_messages)[0]) : null;
        const text = msg ? JSON.parse(msg).message : '';
        if (text && text.includes('belum pernah dicetak')) {
          frappe.show_alert({
            message: __('SPK belum pernah dicetak - membuka halaman cetak SPK dulu.'),
            indicator: 'orange',
          });
          frm.print_doc();
        }
      },
      callback(r) {
        if (r.message) {
          const sd = new frappe.ui.Dialog({
            title: ' ',
            fields: [{
              fieldtype: 'HTML',
              options: `
                <div style="text-align:center;padding:10px 0;">
                  <div style="width:56px;height:56px;border-radius:50%;background:#dbeafe;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                    <svg width="28" height="28" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                    </svg>
                  </div>
                  <div style="font-size:15px;font-weight:700;color:#2563eb;margin-bottom:6px;">Perbaikan Dimulai!</div>
                  <div style="font-size:12px;color:#6b7280;">Status berubah menjadi <strong style="color:#2563eb;">In Progress</strong></div>
                </div>`
            }],
            primary_action_label: 'OK',
            primary_action() { sd.hide(); frm.reload_doc(); },
          });
          sd.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
          sd.show();
        }
      },
    });
  });
};

const refreshOwnerUpdateButton = (frm) => {
  // vehicle can be set well after refresh() first runs (typed in, or
  // filled by a dev/testing helper) - a plain field-set doesn't re-run the
  // whole refresh(frm) handler, so this is also wired to the `vehicle`
  // field trigger below, not just refresh().
  frm.remove_custom_button(__('Update Data Pemilik'));
  if (!frm.doc.vehicle) return;

  frm.add_custom_button(__('Update Data Pemilik'), () => {
    const d = new frappe.ui.Dialog({
      title: __('Update Data Pemilik'),
      fields: [
        {
          fieldtype: 'HTML',
          options: `<div style="font-size:12px;color:#6b7280;margin-bottom:8px;">
            Pemilik saat ini: <strong>${frappe.utils.escape_html(frm.doc.customer_display || '-')}</strong>
          </div>`,
        },
        {
          fieldtype: 'Link',
          fieldname: 'customer',
          label: __('Pemilik Baru'),
          options: 'Customer',
          reqd: 1,
        },
      ],
      primary_action_label: __('Simpan'),
      primary_action(values) {
        frappe.call({
          method: 'garage.garage.doctype.garage_vehicle.garage_vehicle.update_vehicle_owner',
          args: { vehicle: frm.doc.vehicle, customer: values.customer },
          freeze: true,
          freeze_message: __('Menyimpan data pemilik...'),
          callback(r) {
            if (!r.message) return;
            d.hide();
            frappe.show_alert({ message: __('Data pemilik berhasil diperbarui.'), indicator: 'green' });

            if (!frm.is_new()) {
              frm.reload_doc();
            } else {
              // Not saved yet - no doc to reload, so re-trigger the
              // vehicle -> customer fetch_from chain manually.
              const vehicleName = frm.doc.vehicle;
              frm.set_value('vehicle', '').then(() => frm.set_value('vehicle', vehicleName));
            }
          },
        });
      },
    });
    d.show();
  });
};

frappe.ui.form.on('Garage Service Order', {
  validate(frm) {
    const missing = [];
    if (!frm.doc.vehicle) missing.push('No. Polisi');
    if (!frm.doc.assigned_mechanic) missing.push('Mechanic');
    if (!frm.doc.complaint) missing.push('Complaint / Keluhan');
    if (!frm.doc.service_order_type && !frm.doc.service_package) missing.push('Service Type atau Paket Service');

    if (missing.length) {
      showMissingFieldsDialog(missing);
      frappe.validated = false;
      return;
    }
  },
  refresh(frm) {
    if (frm.is_new() && !frm.doc.branch) {
      frappe.db.get_value('User', frappe.session.user, 'garage_branch', (r) => {
        if (r && r.garage_branch) frm.set_value('branch', r.garage_branch);
      });
    }

    // Garage Service Type is a master list meant to be browsed in full; without this
    // the Link dropdown silently truncates to Frappe's default page_length of 10.
    frm.set_query('service_order_type', () => ({ page_length: 200 }));

    // Only show Employees who are mechanics (User has Role "Mekanik", or -
    // failing that - Designation "Mekanik"). See mechanic_query in
    // garage_service_order.py for the actual filter.
    frm.set_query('assigned_mechanic', () => ({
      query: 'garage.garage.doctype.garage_service_order.garage_service_order.mechanic_query',
    }));

    fetchSentPartNames(frm);
    refreshOwnerUpdateButton(frm);

    const lockedStatuses = ['Finished', 'QC Review', 'Waiting Payment', 'Completed'];
    if (lockedStatuses.includes(frm.doc.status)) {
      frm.set_read_only();
      frm.set_df_property('required_parts', 'read_only', 1);
      const grid = frm.fields_dict.required_parts?.grid;
      if (grid) {
        grid.df.cannot_add_rows = true;
        grid.df.cannot_delete_rows = true;
      }
    } else if (frm.doc.status === 'In Progress') {
      frm.enable_save();
      frm.set_df_property('required_parts', 'read_only', 0);
    }

    if (frm.doc.service_order_type) {
      frm.set_query('service_package', () => ({
        filters: { service_type: frm.doc.service_order_type },
      }));
    } else {
      frm.set_query('service_package', () => ({}));
    }

    const grid = frm.fields_dict.required_parts?.grid;
    if (grid) {
      grid.df.in_place_edit = 1;

      // ITEM CODE | ITEM NAME | STATUS | QTY | RATE | DISC% | TAX% | SUB TOTAL
      const COL_FLEX_SEQ = [
        '1.0 1 0%', '2.6 1 0%', '1.3 1 0%', '0.4 1 0%', '1.0 1 0%',
        '0.5 1 0%', '0.5 1 0%', '1.2 1 0%',
      ];

      grid.refresh();

      const styleGrid = () => {
        grid.wrapper.find('.row > .col:not([data-fieldname]):not(.row-check):not(.row-index)').remove();
        grid.wrapper.find('.row > .grid-static-col:not([data-fieldname])').remove();

        // Apply flex to visible columns
        grid.wrapper.find('.row').each(function () {
          const $cols = $(this).children().not('.row-check, .row-index').filter(function () {
            return this.style.display !== 'none';
          });
          $cols.each(function (i) {
            if (i >= COL_FLEX_SEQ.length) return;
            this.className = this.className.replace(/\bcol-xs-\d+\b/g, '');
            this.style.setProperty('flex', COL_FLEX_SEQ[i], 'important');
            this.style.setProperty('width', '0', 'important');
            this.style.setProperty('max-width', 'none', 'important');
            this.style.setProperty('min-width', '0', 'important');
            this.style.setProperty('overflow', 'hidden', 'important');
          });
        });

        // Item Code: strip description after ":"
        grid.wrapper.find('.rows [data-fieldname="item_code"] .static-area').each(function () {
          let t = this.textContent.trim();
          const idx = t.indexOf(':');
          if (idx > 0) this.textContent = t.substring(0, idx);
        });

        // Qty, Disc%, Tax%: center align + clean percent format
        grid.wrapper.find('.rows [data-fieldname="qty"], .rows [data-fieldname="discount"], .rows [data-fieldname="tax"]').each(function () {
          this.classList.remove('text-right');
        });
        grid.wrapper.find('.rows [data-fieldname="qty"] .static-area, .rows [data-fieldname="discount"] .static-area, .rows [data-fieldname="tax"] .static-area').each(function () {
          this.style.setProperty('text-align', 'center', 'important');
          let t = this.textContent.trim();
          if (!t || !t.includes('%')) return;
          t = t.replace('%', '');
          if (t.includes(',')) {
            t = t.replace(/0+$/, '').replace(/,$/, '');
          }
          this.textContent = (t || '0') + '%';
        });
      };
      const applyCheckboxLocks = () => {
        (grid.grid_rows || []).forEach(row => {
          if (!row.doc || !row.wrapper) return;
          const $checkbox = row.wrapper.find('input.grid-row-check');
          if (!$checkbox.length) return;
          if (isPartRowLocked(frm, row.doc)) {
            $checkbox.prop('checked', false);
            $checkbox
              .prop('disabled', true)
              .prop('title', __('Item sudah dikirim ke Spare Part Request, tidak bisa dipilih untuk dihapus.'));
            row.wrapper.find('.row-check').css({ opacity: 0.4, cursor: 'not-allowed' });
          } else {
            $checkbox.prop('disabled', false).prop('title', '');
            row.wrapper.find('.row-check').css({ opacity: '', cursor: '' });
          }
        });
      };
      frm._applyCheckboxLocks = applyCheckboxLocks;

      setTimeout(styleGrid, 300);
      setTimeout(styleGrid, 800);
      setTimeout(styleGrid, 1500);
      setTimeout(applyCheckboxLocks, 500);
      setTimeout(applyCheckboxLocks, 1200);
      setTimeout(applyCheckboxLocks, 2500);

      if (!frm._gridRenderBound) {
        frm._gridRenderBound = true;
        $(frm.wrapper).on('grid-row-render', () => setTimeout(() => { styleGrid(); frm._applyBadges?.(); frm._applyCheckboxLocks?.(); }, 150));
        $(frm.wrapper).on('grid-make-head-row', () => setTimeout(styleGrid, 150));
      }

      frm.set_query('item_code', 'required_parts', () => ({
        query: 'garage.garage.doctype.garage_service_order.garage_service_order.item_query_with_stock',
      }));

      // Delete guard selalu di-apply ulang tiap refresh — jaga kalau grid object ter-recreate
      // grid._origDeleteRows mencegah double-wrap jika grid object sama
      {
        const origDelete = grid._origDeleteRows || grid.delete_rows.bind(grid);
        grid._origDeleteRows = origDelete;
        grid.delete_rows = function () {
          const selected = grid.get_selected_children();
          const locked = selected.filter(row => !row.__islocal && isPartRowLocked(frm, row));
          if (locked.length) {
            const names = locked.map(r => r.item_name || r.item_code).join(', ');
            frappe.msgprint({
              title: __('Tidak Bisa Dihapus'),
              message: __('Item berikut sudah dikirim ke Spare Part Request dan tidak bisa dihapus: <b>{0}</b>.<br><br>Hubungi tim spare part untuk membatalkan request.', [names]),
              indicator: 'red',
            });
            return;
          }
          origDelete();
          setTimeout(() => renderTableFooter(frm), 200);
        };
      }

      if (!frm._gridDeleteBound) {
        frm._gridDeleteBound = true;
        grid.wrapper.on('change', 'input', function () {
          const $row = $(this).closest('.grid-row');
          const docname = $row.attr('data-name');
          if (docname) {
            calcAmount(frm, 'Garage Service Order Part', docname);
          }
        });
        grid.wrapper.on('focus', '.rows input[data-fieldtype="Link"]', function () {
          const input = this;
          setTimeout(() => {
            const $ul = $(input).closest('.frappe-control').find('ul');
            if ($ul.length) {
              const rect = input.getBoundingClientRect();
              $ul.css({
                position: 'fixed',
                top: (rect.bottom) + 'px',
                left: rect.left + 'px',
                width: rect.width + 'px',
                'z-index': 9999
              });
            }
          }, 150);
        });
        grid.wrapper.on('input', '.rows input[data-fieldtype="Link"]', function () {
          const input = this;
          setTimeout(() => {
            const $ul = $(input).closest('.frappe-control').find('ul');
            if ($ul.length) {
              const rect = input.getBoundingClientRect();
              $ul.css({
                position: 'fixed',
                top: (rect.bottom) + 'px',
                left: rect.left + 'px',
                width: rect.width + 'px',
                'z-index': 9999
              });
            }
          }, 150);
        });
      }
    }
    ['vehicle_brand','vehicle_model','vehicle_type','vehicle_year','vehicle_transmission',
     'vehicle_color','vehicle_fuel_type','vehicle_mileage',
     'customer_number','customer_display','customer_type','primary_contact',
     'customer_email','customer_id_number','customer_address','customer_city'].forEach(field => {
      frm.set_df_property(field, 'read_only', 1);
    });

    subscribeToUpdates(frm);

    if (!frm._partsClickOutsideBound) {
      frm._partsClickOutsideBound = true;
      $(document).on('click', (e) => {
        if (!$(e.target).closest('[data-fieldname="required_parts"] .frappe-control').length) {
          if (frappe.ui.form.editable_row) {
            frappe.ui.form.editable_row.toggle_editable_row(false);
          }
        }
      });
    }

    frm.refresh_field('required_parts');

    {
      const g = frm.fields_dict.required_parts?.grid;
      if (g) {
        // Status badge lives in its own column (stock_status, right of Item
        // Name) rather than glued onto the item_name text - only shown once
        // a row is actually locked (sent to Spare Part Request or beyond),
        // same gating as isPartRowLocked uses elsewhere for this table.
        const applyBadges = () => {
          (g.grid_rows || []).forEach(row => {
            if (!row.doc) return;
            const col = row.columns?.stock_status;
            if (!col || !col.static_area) return;
            if (!row.doc.stock_status || !isPartRowLocked(frm, row.doc)) {
              col.static_area.html('');
              return;
            }
            const indicator = STATUS_INDICATORS[row.doc.stock_status] || 'gray';
            const badge = `<span class="gso-badge indicator-pill ${indicator}" style="font-size:9px;padding:1px 6px;">${frappe.utils.escape_html(row.doc.stock_status)}</span>`;
            col.static_area.html(badge);
            col.static_area[0].style.setProperty('overflow', 'visible', 'important');
            col.static_area[0].style.setProperty('text-overflow', 'unset', 'important');
            col[0].style.setProperty('overflow', 'visible', 'important');
          });
        };
        frm._applyBadges = applyBadges;
        setTimeout(applyBadges, 500);
        setTimeout(applyBadges, 1200);
        setTimeout(applyBadges, 2500);
      }
    }

    const color = STATUS_COLORS[frm.doc.status] || 'gray';
    frm.page.set_indicator(frm.doc.status, color);

    const openPartsWithCode = (frm.doc.required_parts || []).filter(r => r.item_code);
    // A row's stock_status is only ever set (to "Request Spare Part") for a real
    // stock item when it's picked - see fetchItemDetails below. Jasa/labor rows
    // never get a stock_status, so its absence across every row means the order
    // has nothing to physically prepare and can skip Waiting Part entirely.
    const openHasStockPart = openPartsWithCode.some(r => r.stock_status);

    if (frm.doc.status === 'Open' && !frm.is_new() && openPartsWithCode.length && !openHasStockPart) {
      // Jasa-only order - nothing to send to Spare Part Request, so let the
      // mechanic start repair directly instead of getting stuck waiting for a
      // part that will never need preparing.
      setStartRepairAction(frm);
    } else if (frm.doc.status === 'Open' && !frm.is_new() && openHasStockPart) {
      frm.page.set_primary_action(__('Send Order Part'), () => {
        frm.page.btn_primary.prop('disabled', true);

        const itemCount = (frm.doc.required_parts || []).filter(r => r.item_code).length;
        const d = new frappe.ui.Dialog({
          title: ' ',
          fields: [{
            fieldtype: 'HTML',
            options: `
              <div style="text-align:center;padding:10px 0;">
                <div style="width:56px;height:56px;border-radius:50%;background:#fef3c7;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                  <svg width="28" height="28" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                </div>
                <div style="font-size:15px;font-weight:700;color:#1f2937;margin-bottom:6px;">Kirim Order Part?</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.5;">
                  <strong>${itemCount} item</strong> akan dikirim ke<br><strong>Spare Part Request</strong>
                </div>
                <div style="margin-top:12px;padding:8px 14px;background:#f8fafc;border-radius:6px;display:inline-block;">
                  <span style="font-size:11px;color:#64748b;">No. WO:</span>
                  <span style="font-size:11px;font-weight:700;color:#1f2937;">${frm.doc.name}</span>
                </div>
              </div>`
          }],
          primary_action_label: 'Kirim Sekarang',
          primary_action() {
            d.hide();
            frappe.call({
              method: 'garage.garage.doctype.garage_service_order.garage_service_order.send_order_part',
              args: { service_order_name: frm.doc.name },
              freeze: true,
              freeze_message: 'Mengirim order part...',
              callback(r) {
                if (r.message) {
                  const successDialog = new frappe.ui.Dialog({
                    title: ' ',
                    fields: [{
                      fieldtype: 'HTML',
                      options: `
                        <div style="text-align:center;padding:10px 0;">
                          <div style="width:56px;height:56px;border-radius:50%;background:#d1fae5;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                            <svg width="28" height="28" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          </div>
                          <div style="font-size:15px;font-weight:700;color:#059669;margin-bottom:6px;">Order Part Terkirim!</div>
                          <div style="font-size:12px;color:#6b7280;">Status berubah menjadi <strong style="color:#d97706;">Waiting Part</strong></div>
                        </div>`
                    }],
                    primary_action_label: 'OK',
                    primary_action() {
                      successDialog.hide();
                      frm.reload_doc();
                    },
                  });
                  successDialog.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
                  successDialog.show();
                }
              },
            });
          },
          secondary_action_label: 'Batal',
          secondary_action() {
            frm.page.btn_primary.prop('disabled', false);
          },
          onhide() {
            if (!d.primary_action_triggered) {
              frm.page.btn_primary.prop('disabled', false);
            }
          },
        });
        d.primary_action_triggered = false;
        const origPrimary = d.primary_action;
        d.primary_action = function() {
          d.primary_action_triggered = true;
          origPrimary.call(this);
        };
        d.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
        d.$wrapper.find('.btn-primary').css({background: '#d97706', border: 'none', fontWeight: '600'});
        d.show();
      });
    }

    if (['Waiting Part', 'Prepared'].includes(frm.doc.status) && !frm.is_new()) {
      const preparedStatuses = ['prepared', 'received', 'issued', 'approved'];
      const partsWithCode = (frm.doc.required_parts || []).filter(r => r.item_code);
      const anyPrepared = partsWithCode.length > 0 && partsWithCode.some(
        r => preparedStatuses.includes((r.stock_status || '').toLowerCase())
      );
      // "request spare part" alone doesn't mean "never sent" - the status is left
      // unchanged after sending. Only rows absent from _sentPartRowNames are truly new.
      const sentNames = frm._sentPartRowNames || new Set();
      const hasNewParts = partsWithCode.some(
        r => (r.stock_status || '').toLowerCase() === 'request spare part'
          && !sentNames.has(String(r.name))
      );

      if (hasNewParts) {
        frm.page.set_primary_action(__('Send New Part'), () => {
          frm.page.btn_primary.prop('disabled', true);

          const newItems = partsWithCode
            .filter(r => (r.stock_status || '').toLowerCase() === 'request spare part'
              && !sentNames.has(String(r.name)))
            .map(r => r.item_name || r.item_code);

          const itemList = newItems.map(n =>
            `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
              <div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0;"></div>
              <span style="font-size:12px;">${n}</span>
            </div>`
          ).join('');

          const d = new frappe.ui.Dialog({
            title: ' ',
            fields: [{
              fieldtype: 'HTML',
              options: `
                <div style="text-align:center;padding:10px 0;">
                  <div style="width:56px;height:56px;border-radius:50%;background:#dbeafe;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                    <svg width="28" height="28" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                  </div>
                  <div style="font-size:15px;font-weight:700;color:#1f2937;margin-bottom:4px;">Kirim Item Baru?</div>
                  <div style="font-size:12px;color:#6b7280;margin-bottom:10px;"><strong>${newItems.length} item baru</strong> akan dikirim ke Spare Part Request</div>
                  <div style="text-align:left;padding:4px 16px;">${itemList}</div>
                </div>`
            }],
            primary_action_label: 'Kirim Sekarang',
            primary_action() {
              d.hide();
              frappe.call({
                method: 'garage.garage.doctype.garage_service_order.garage_service_order.send_order_part',
                args: { service_order_name: frm.doc.name },
                freeze: true,
                freeze_message: 'Mengirim item baru...',
                callback(r) {
                  if (r.message) {
                    frappe.show_alert({ message: 'Item baru berhasil dikirim ke Spare Part Request.', indicator: 'green' });
                    frm.reload_doc();
                  }
                },
              });
            },
            secondary_action_label: 'Batal',
            secondary_action() {
              frm.page.btn_primary.prop('disabled', false);
            },
            onhide() {
              if (!d.primary_action_triggered) {
                frm.page.btn_primary.prop('disabled', false);
              }
            },
          });
          d.primary_action_triggered = false;
          const origPrimary = d.primary_action;
          d.primary_action = function() {
            d.primary_action_triggered = true;
            origPrimary.call(this);
          };
          d.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
          d.$wrapper.find('.btn-primary').css({background: '#2563eb', border: 'none', fontWeight: '600'});
          d.show();
        });
      } else if (anyPrepared) {
        // Only offer Start Repair once something has actually been prepared by
        // the spare part team. If nothing is prepared yet, there's nothing for
        // the mechanic to act on - show no primary action at all rather than a
        // "Start Repair" button that looks clickable but isn't.
        setStartRepairAction(frm);
      }

      const rejectedStatuses = ['rejected', 'out of stock'];
      const hasRejected = partsWithCode.some(
        r => rejectedStatuses.includes((r.stock_status || '').toLowerCase())
      );
      if (hasRejected) {
        frm.add_custom_button(__('Re-send Order Part'), () => {
          const rejectedItems = partsWithCode
            .filter(r => rejectedStatuses.includes((r.stock_status || '').toLowerCase()))
            .map(r => r.item_name || r.item_code);

          const itemList = rejectedItems.map(n =>
            `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
              <div style="width:6px;height:6px;border-radius:50%;background:#ef4444;flex-shrink:0;"></div>
              <span style="font-size:12px;">${n}</span>
            </div>`
          ).join('');

          const d = new frappe.ui.Dialog({
            title: ' ',
            fields: [{
              fieldtype: 'HTML',
              options: `
                <div style="text-align:center;padding:10px 0;">
                  <div style="width:56px;height:56px;border-radius:50%;background:#fef3c7;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                    <svg width="28" height="28" fill="none" stroke="#d97706" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    </svg>
                  </div>
                  <div style="font-size:15px;font-weight:700;color:#1f2937;margin-bottom:4px;">Item Tidak Tersedia</div>
                  <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">Item berikut perlu diganti atau dihapus:</div>
                  <div style="text-align:left;padding:4px 16px;">${itemList}</div>
                  <div style="font-size:11px;color:#9ca3af;margin-top:10px;">Ubah item di Required Parts, lalu klik Re-send.</div>
                </div>`
            }],
            primary_action_label: 'Re-send Sekarang',
            primary_action() {
              d.hide();
              frappe.call({
                method: 'garage.garage.doctype.garage_service_order.garage_service_order.send_order_part',
                args: { service_order_name: frm.doc.name },
                freeze: true,
                freeze_message: 'Mengirim ulang order part...',
                callback(r) {
                  if (r.message) {
                    frappe.show_alert({ message: 'Order part berhasil dikirim ulang.', indicator: 'green' });
                    frm.reload_doc();
                  }
                },
              });
            },
            secondary_action_label: 'Batal',
          });
          d.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
          d.$wrapper.find('.btn-primary').css({background: '#d97706', border: 'none', fontWeight: '600'});
          d.show();
        });
      }
    }

    if (frm.doc.status === 'In Progress' && !frm.is_new()) {
      const sentNamesInProgress = frm._sentPartRowNames || new Set();
      const hasNewParts = (frm.doc.required_parts || []).some(
        r => r.item_code && (r.stock_status || '').toLowerCase() === 'request spare part'
          && !sentNamesInProgress.has(String(r.name))
      );
      if (hasNewParts) {
        frm.page.set_primary_action(__('Send Additional Part'), () => {
          // Disable tombol langsung saat diklik
          frm.page.btn_primary.prop('disabled', true);

          const newItems = (frm.doc.required_parts || [])
            .filter(r => r.item_code && (r.stock_status || '').toLowerCase() === 'request spare part'
              && !sentNamesInProgress.has(String(r.name)))
            .map(r => r.item_name || r.item_code);

          const itemList = newItems.map(n =>
            `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
              <div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0;"></div>
              <span style="font-size:12px;">${n}</span>
            </div>`
          ).join('');

          const d = new frappe.ui.Dialog({
            title: ' ',
            fields: [{
              fieldtype: 'HTML',
              options: `
                <div style="text-align:center;padding:10px 0;">
                  <div style="width:56px;height:56px;border-radius:50%;background:#dbeafe;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                    <svg width="28" height="28" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                  </div>
                  <div style="font-size:15px;font-weight:700;color:#1f2937;margin-bottom:4px;">Kirim Part Tambahan?</div>
                  <div style="font-size:12px;color:#6b7280;margin-bottom:10px;"><strong>${newItems.length} item baru</strong> akan dikirim ke Spare Part Request</div>
                  <div style="text-align:left;padding:4px 16px;">${itemList}</div>
                </div>`
            }],
            primary_action_label: 'Kirim Sekarang',
            primary_action() {
              d.hide();
              frappe.call({
                method: 'garage.garage.doctype.garage_service_order.garage_service_order.send_additional_part',
                args: { service_order_name: frm.doc.name },
                freeze: true,
                freeze_message: 'Mengirim part tambahan...',
                callback(r) {
                  if (r.message) {
                    const sd = new frappe.ui.Dialog({
                      title: ' ',
                      fields: [{
                        fieldtype: 'HTML',
                        options: `
                          <div style="text-align:center;padding:10px 0;">
                            <div style="width:56px;height:56px;border-radius:50%;background:#d1fae5;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                              <svg width="28" height="28" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            </div>
                            <div style="font-size:15px;font-weight:700;color:#059669;margin-bottom:6px;">Part Tambahan Terkirim!</div>
                            <div style="font-size:12px;color:#6b7280;">Status tetap <strong style="color:#2563eb;">In Progress</strong></div>
                          </div>`
                      }],
                      primary_action_label: 'OK',
                      primary_action() { sd.hide(); frm.reload_doc(); },
                    });
                    sd.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
                    sd.show();
                  }
                },
              });
            },
            secondary_action_label: 'Batal',
            secondary_action() {
              // Batal → enable tombol lagi
              frm.page.btn_primary.prop('disabled', false);
            },
            onhide() {
              // Klik X atau tutup dialog → enable tombol lagi
              if (!d.primary_action_triggered) {
                frm.page.btn_primary.prop('disabled', false);
              }
            },
          });
          d.primary_action_triggered = false;
          const origPrimary = d.primary_action;
          d.primary_action = function() {
            d.primary_action_triggered = true;
            origPrimary.call(this);
          };
          d.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
          d.$wrapper.find('.btn-primary').css({background: '#2563eb', border: 'none', fontWeight: '600'});
          d.show();
        });
      } else {
        frm.page.set_primary_action(__('Finish Repair'), () => {
          const d = new frappe.ui.Dialog({
            title: ' ',
            fields: [{
              fieldtype: 'HTML',
              options: `
                <div style="text-align:center;padding:10px 0;">
                  <div style="width:56px;height:56px;border-radius:50%;background:#cffafe;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                    <svg width="28" height="28" fill="none" stroke="#0891b2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                      <path d="M22 4L12 14.01l-3-3"/>
                    </svg>
                  </div>
                  <div style="font-size:15px;font-weight:700;color:#1f2937;margin-bottom:6px;">Selesaikan Perbaikan?</div>
                  <div style="font-size:12px;color:#6b7280;">Status akan berubah ke <strong style="color:#0891b2;">Finished</strong></div>
                </div>`
            }],
            primary_action_label: 'Finish',
            primary_action() {
              d.hide();
              frappe.call({
                method: 'garage.garage.doctype.garage_service_order.garage_service_order.finish_repair',
                args: { service_order_name: frm.doc.name },
                freeze: true,
                error_handlers: {
                  ValidationError: (r) => {
                    let msg = __('Terjadi kesalahan.');
                    try {
                      const serverMessages = JSON.parse(r._server_messages || '[]');
                      if (serverMessages.length) {
                        const parsed = JSON.parse(serverMessages[0]);
                        msg = parsed.message || serverMessages[0];
                      }
                    } catch (e) {
                      // keep default msg
                    }
                    const ed = new frappe.ui.Dialog({
                      title: ' ',
                      fields: [{
                        fieldtype: 'HTML',
                        options: `
                          <div style="text-align:center;padding:10px 0;">
                            <div style="width:56px;height:56px;border-radius:50%;background:#fee2e2;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                              <svg width="28" height="28" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                                <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                              </svg>
                            </div>
                            <div style="font-size:15px;font-weight:700;color:#dc2626;margin-bottom:6px;">Belum Bisa Finish Repair</div>
                            <div style="font-size:12px;color:#6b7280;line-height:1.5;">${msg}</div>
                          </div>`
                      }],
                      primary_action_label: 'Oke',
                      primary_action() { ed.hide(); },
                    });
                    ed.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
                    ed.$wrapper.find('.btn-primary').css({background: '#dc2626', border: 'none', fontWeight: '600'});
                    ed.show();
                  },
                },
                callback(r) {
                  if (r.message) {
                    frappe.show_alert({ message: r.message.message, indicator: 'green' });
                    frm.reload_doc();
                  }
                },
              });
            },
            secondary_action_label: 'Batal',
          });
          d.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
          d.$wrapper.find('.btn-primary').css({background: '#0891b2', border: 'none', fontWeight: '600'});
          d.show();
        });
      }
    }

    if (frm.doc.status === 'Finished' && !frm.is_new()) {
      frm.page.set_primary_action(__('Selesai & Kirim ke Pembayaran'), () => {
        const d = new frappe.ui.Dialog({
          title: ' ',
          fields: [{
            fieldtype: 'HTML',
            options: `
              <div style="text-align:center;padding:10px 0;">
                <div style="width:56px;height:56px;border-radius:50%;background:#f3e8ff;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                  <svg width="28" height="28" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6"/>
                    <path d="M9 14l2 2 4-4"/>
                  </svg>
                </div>
                <div style="font-size:15px;font-weight:700;color:#1f2937;margin-bottom:6px;">Selesai & lanjut ke pembayaran?</div>
                <div style="font-size:12px;color:#6b7280;">Service order akan langsung masuk status Waiting Payment.</div>
              </div>`
          }],
          primary_action_label: 'Lanjut',
          primary_action() {
            d.hide();
            frappe.call({
              method: 'garage.garage.doctype.garage_service_order.garage_service_order.submit_to_qc',
              args: { service_order_name: frm.doc.name },
              freeze: true,
              callback(r) {
                if (r.message) {
                  frappe.show_alert({ message: r.message.message, indicator: 'green' });
                  frm.reload_doc();
                }
              },
            });
          },
          secondary_action_label: 'Batal',
        });
        d.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
        d.$wrapper.find('.btn-primary').css({background: '#7c3aed', border: 'none', fontWeight: '600'});
        d.show();
      });

      frm.add_custom_button(__('Re-open'), () => {
        const d = new frappe.ui.Dialog({
          title: ' ',
          fields: [{
            fieldtype: 'HTML',
            options: `
              <div style="text-align:center;padding:10px 0;">
                <div style="width:56px;height:56px;border-radius:50%;background:#dbeafe;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                  <svg width="28" height="28" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 105.64-12.36L1 10"/>
                  </svg>
                </div>
                <div style="font-size:15px;font-weight:700;color:#1f2937;margin-bottom:6px;">Buka Kembali?</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.5;">
                  Status akan kembali ke <strong style="color:#2563eb;">In Progress</strong><br>Anda bisa menambahkan part lagi.
                </div>
              </div>`
          }],
          primary_action_label: 'Re-open',
          primary_action() {
            d.hide();
            frappe.call({
              method: 'garage.garage.doctype.garage_service_order.garage_service_order.reopen_service_order',
              args: { service_order_name: frm.doc.name },
              freeze: true,
              callback(r) {
                if (r.message) {
                  frappe.show_alert({ message: r.message.message, indicator: 'blue' });
                  frm.reload_doc();
                }
              },
            });
          },
          secondary_action_label: 'Batal',
        });
        d.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
        d.$wrapper.find('.btn-primary').css({background: '#2563eb', border: 'none', fontWeight: '600'});
        d.show();
      });
    }

    renderTableFooter(frm);
  },
  after_save(frm) {
    if (frm.doc.status === 'Open') {
      const d = new frappe.ui.Dialog({
        title: ' ',
        fields: [{
          fieldtype: 'HTML',
          options: `
            <div style="text-align:center;padding:10px 0;">
              <div style="width:56px;height:56px;border-radius:50%;background:#dbeafe;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <svg width="28" height="28" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/>
                </svg>
              </div>
              <div style="font-size:15px;font-weight:700;color:#1f2937;margin-bottom:6px;">Work Order Tersimpan</div>
              <div style="font-size:12px;color:#6b7280;line-height:1.5;">
                Status: <strong style="color:#2563eb;">Open</strong>
              </div>
              <div style="margin-top:10px;padding:8px 14px;background:#f8fafc;border-radius:6px;display:inline-block;">
                <span style="font-size:11px;color:#64748b;">No. WO:</span>
                <span style="font-size:11px;font-weight:700;color:#1f2937;">${frm.doc.name}</span>
              </div>
            </div>`
        }],
        primary_action_label: 'OK',
        primary_action() { d.hide(); },
      });
      d.$wrapper.find('.modal-dialog').css({'max-width': '380px', 'margin': 'auto'});
      d.$wrapper.find('.btn-primary').css({background: '#2563eb', border: 'none', fontWeight: '600'});
      d.show();
    }
  },
  vehicle(frm) {
    refreshOwnerUpdateButton(frm);
  },
  service_order_type(frm) {
    autoApplyServiceFee(frm);
    updatePackageFilter(frm);
  },
  service_package(frm) {
    autoApplyPackage(frm);
  },
  required_parts_remove(frm) {
    setTimeout(() => renderTableFooter(frm), 200);
  },
});

const fetchItemDetails = (frm, cdt, cdn, row, isStock) => {
  // Rate comes from garage.utils.pricing.get_item_rate_api (Item Price),
  // not Item.standard_rate - that field is only ever shown on a brand new,
  // unsaved Item and nothing keeps it updated afterward, so it's stuck at 0
  // for every real/imported Item.
  Promise.all([
    frappe.call({
      method: 'frappe.client.get_value',
      args: {
        doctype: 'Item',
        filters: { name: row.item_code },
        fieldname: ['item_name', 'description', 'stock_uom'],
      },
    }),
    frappe.call({
      method: 'garage.utils.pricing.get_item_rate_api',
      args: { item_code: row.item_code },
    }),
  ]).then(([itemRes, rateRes]) => {
    if (!itemRes.message) return;
    frappe.model.set_value(cdt, cdn, {
      item_name: itemRes.message.item_name,
      description: itemRes.message.description,
      qty: 1,
      rate: flt(rateRes.message),
      uom: itemRes.message.stock_uom || 'Unit',
      discount: 0,
      tax: 0,
      stock_status: isStock ? REQUEST_STATUS : '',
    }).then(() => {
      calcAmount(frm, cdt, cdn);
      const gridRow = frm.fields_dict.required_parts.grid.grid_rows_by_docname[cdn];
      if (gridRow) {
        gridRow.toggle_editable_row(false);
      }
    });
  });
};

frappe.ui.form.on('Garage Service Order Part', {
  item_code(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row.item_code) return;
    frappe.call({
      method: 'frappe.client.get_value',
      args: {
        doctype: 'Item',
        filters: { name: row.item_code },
        fieldname: ['is_stock_item'],
      },
      callback(checkRes) {
        const isStock = checkRes.message?.is_stock_item;
        if (isStock) {
          frappe.call({
            method: 'garage.garage.doctype.garage_service_order.garage_service_order.get_stock_qty',
            args: { item_code: row.item_code },
            callback(stockRes) {
              const stockQty = flt(stockRes.message?.stock_qty || 0);
              if (stockQty <= 0) {
                frappe.model.set_value(cdt, cdn, 'item_code', '');
                frappe.show_alert({ message: __('Item ini stock habis, tidak bisa dipilih.'), indicator: 'red' }, 5);
                return;
              }
              fetchItemDetails(frm, cdt, cdn, row, true);
            },
          });
        } else {
          fetchItemDetails(frm, cdt, cdn, row, false);
        }
      },
    });
  },
  qty(frm, cdt, cdn) {
    validateNonNegative(cdt, cdn, 'qty');
    calcAmount(frm, cdt, cdn);
  },
  rate(frm, cdt, cdn) {
    validateNonNegative(cdt, cdn, 'rate');
    calcAmount(frm, cdt, cdn);
  },
  discount(frm, cdt, cdn) {
    calcAmount(frm, cdt, cdn);
  },
  tax(frm, cdt, cdn) {
    calcAmount(frm, cdt, cdn);
  },
});

const validateNonNegative = (cdt, cdn, field) => {
  const row = locals[cdt][cdn];
  if (flt(row[field]) < 0) {
    frappe.model.set_value(cdt, cdn, field, 0);
    frappe.show_alert({ message: __(`${field} tidak boleh negatif`), indicator: 'orange' });
  }
};

const calcAmount = (frm, cdt, cdn) => {
  const row = locals[cdt][cdn];
  const subtotal = flt(row.qty) * flt(row.rate);
  const afterDisc = flt(subtotal * (1 - flt(row.discount) / 100));
  row.amount = flt(afterDisc * (1 + flt(row.tax) / 100));
  frm.refresh_field('required_parts');
  renderTableFooter(frm);
};

const renderTableFooter = (frm) => {
  const grid = frm.fields_dict.required_parts?.grid;
  if (!grid) return;

  let totalDisc = 0;
  let totalPPN = 0;
  let totalSubTotal = 0;

  const visibleRows = grid.wrapper.find('.rows .grid-row').length;
  if (visibleRows > 0) {
    (frm.doc.required_parts || []).forEach((row) => {
      const subtotal = flt(row.qty) * flt(row.rate);
      totalDisc += flt(subtotal * flt(row.discount) / 100);
      const afterDisc = flt(subtotal * (1 - flt(row.discount) / 100));
      totalPPN += flt(afterDisc * flt(row.tax) / 100);
      totalSubTotal += flt(row.amount);
    });
  }

  frm.doc.total_amount = flt(totalSubTotal, 2);

  const totalItems = (frm.doc.required_parts || []).length;
  frm.fields_dict.required_parts.$wrapper.find('.item-count-badge').remove();
  if (totalItems > 0) {
    frm.fields_dict.required_parts.$wrapper.prepend(`<div class="item-count-badge" style="display:inline-block;background:var(--g-accent);color:#fff;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;margin-bottom:6px;">${totalItems} item</div>`);
  }

  const fmt = (v) => frappe.format(flt(v, 2), { fieldtype: 'Currency' });

  let $footer = frm.fields_dict.required_parts.$wrapper.find('.custom-grid-footer');
  if (!$footer.length) {
    $footer = $('<div class="custom-grid-footer" style="margin-top:4px;"></div>');
    frm.fields_dict.required_parts.$wrapper.append($footer);
  }

  const summaryRow = (label, value, isGrand) => `
        <div style="display:flex; background:${isGrand ? 'var(--g-accent, #4f46e5)' : '#2c3e50'}; border-bottom:1px solid rgba(255,255,255,0.1);">
          <div style="flex:1; padding:8px 10px; text-align:left; font-weight:${isGrand ? '700' : '600'}; white-space:nowrap; color:#fff;">${label}</div>
          <div style="flex:3; padding:8px 10px; text-align:right; font-weight:${isGrand ? '700' : '600'}; color:#fff;">${value}</div>
        </div>`;

  $footer.html(`
      <div style="display:flex; justify-content:flex-end; margin-top:0;">
        <div style="width:300px; overflow:hidden;">
          ${summaryRow('Disc', fmt(totalDisc), false)}
          ${summaryRow('PPN', fmt(totalPPN), false)}
          ${summaryRow('Grand Total', fmt(totalSubTotal), true)}
        </div>
      </div>
  `);
};

