const GSB_CHILD_CONFIG = {
  spare_parts: {
    link_field: 'spare_part',
    link_doctype: 'Garage Spare Part',
    link_label: 'Spare Part',
    title: 'Daftar Spare Part',
  },
  materials: {
    link_field: 'material',
    link_doctype: 'Garage Spare Part',
    link_label: 'Bahan',
    title: 'Daftar Bahan',
  },
};

frappe.ui.form.on('Garage Service Bundle', {
  refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
    setTimeout(() => {
      gsb_render_table(frm, 'spare_parts');
      gsb_render_table(frm, 'materials');
    }, 300);
  },
  service_fee(frm) {
    gsb_recompute_totals(frm);
  },
});

function gsb_get_container(frm, fieldname) {
  const field = frm.get_field(fieldname);
  if (!field || !field.grid) return null;

  if (!field.grid.gsb_hidden) {
    field.grid.wrapper.hide();
    field.grid.gsb_hidden = true;
  }

  let $container = field.$wrapper.find('.gsb-custom-table-wrapper');
  if (!$container.length) {
    $container = $('<div class="gsb-custom-table-wrapper"></div>');
    field.$wrapper.append($container);
  }
  return $container;
}

function gsb_locate_row(frm, fieldname, row_name) {
  return (frm.doc[fieldname] || []).find((row) => row.name === row_name);
}

function gsb_recompute_row_amount(row) {
  row.amount = flt(row.unit_price) * flt(row.quantity || 0);
}

function gsb_sum_amount(rows) {
  return (rows || []).reduce((total, row) => total + flt(row.amount), 0);
}

function gsb_recompute_totals(frm) {
  const spare_total = gsb_sum_amount(frm.doc.spare_parts);
  const material_total = gsb_sum_amount(frm.doc.materials);
  frm.set_value('total_spare_amount', spare_total);
  frm.set_value('total_material_amount', material_total);
  frm.set_value('grand_total', flt(frm.doc.service_fee) + spare_total + material_total);
}

function gsb_show_center_notice(message, kind) {
  let $stack = $('#gsb-center-notice-stack');
  if (!$stack.length) {
    $stack = $('<div id="gsb-center-notice-stack"></div>').appendTo('body');
  }

  const icon = kind === 'remove' ? '&minus;' : '+';
  const $notice = $(`
    <div class="gsb-center-notice gsb-notice-${kind}">
      <span class="gsb-notice-icon">${icon}</span>
      <span class="gsb-notice-text"></span>
    </div>
  `);
  $notice.find('.gsb-notice-text').text(message);
  $stack.append($notice);

  requestAnimationFrame(() => $notice.addClass('gsb-notice-in'));

  setTimeout(() => {
    $notice.removeClass('gsb-notice-in').addClass('gsb-notice-out');
    setTimeout(() => $notice.remove(), 200);
  }, 2200);
}

function gsb_add_row(frm, fieldname) {
  frm.add_child(fieldname, { quantity: 1 });
  frm.dirty();
  gsb_render_table(frm, fieldname);
  gsb_show_center_notice(`${GSB_CHILD_CONFIG[fieldname].link_label} ditambahkan.`, 'add');
}

function gsb_remove_row(frm, fieldname, row_name) {
  const row = gsb_locate_row(frm, fieldname, row_name);
  if (!row) return;

  frappe.model.clear_doc(row.doctype, row.name);
  frm.doc[fieldname] = (frm.doc[fieldname] || []).filter((r) => r.name !== row_name);
  frm.doc[fieldname].forEach((r, i) => {
    r.idx = i + 1;
  });

  frm.dirty();
  gsb_recompute_totals(frm);
  gsb_render_table(frm, fieldname);
  gsb_show_center_notice(`${GSB_CHILD_CONFIG[fieldname].link_label} dihapus.`, 'remove');
}

function gsb_on_qty_change(frm, fieldname, row_name, value) {
  const row = gsb_locate_row(frm, fieldname, row_name);
  if (!row) return;

  row.quantity = value;
  gsb_recompute_row_amount(row);
  frm.dirty();
  gsb_recompute_totals(frm);
  gsb_render_table(frm, fieldname);
}

function gsb_on_item_selected(frm, fieldname, row_name, value) {
  const cfg = GSB_CHILD_CONFIG[fieldname];
  const row = gsb_locate_row(frm, fieldname, row_name);
  if (!row) return;

  row[cfg.link_field] = value;

  const finish = () => {
    gsb_recompute_row_amount(row);
    frm.dirty();
    gsb_recompute_totals(frm);
    gsb_render_table(frm, fieldname);
  };

  if (!value) {
    row.item_name = '';
    row.part_code = '';
    row.uom = '';
    row.unit_price = 0;
    row.stock_qty = 0;
    finish();
    return;
  }

  frappe.db
    .get_value('Garage Spare Part', value, ['part_name', 'part_code', 'uom', 'unit_price', 'stock_qty'])
    .then(({ message }) => {
      if (!message) return;
      row.item_name = message.part_name;
      row.part_code = message.part_code;
      row.uom = message.uom;
      row.unit_price = flt(message.unit_price);
      row.stock_qty = message.stock_qty;
      finish();
    });
}

function gsb_render_table(frm, fieldname) {
  const cfg = GSB_CHILD_CONFIG[fieldname];
  const $container = gsb_get_container(frm, fieldname);
  if (!$container) return;

  const rows = frm.doc[fieldname] || [];
  let body_rows = '';
  let total = 0;

  rows.forEach((row) => {
    const amount = flt(row.amount);
    total += amount;
    const row_name = frappe.utils.escape_html(row.name);
    body_rows += `
      <div class="gsb-grid-row gsb-row">
        <div class="gsb-cell gsb-cell-link" data-name="${row_name}"></div>
        <div class="gsb-cell gsb-desc">${frappe.utils.escape_html(row.item_name || '')}</div>
        <div class="gsb-cell gsb-uom">${frappe.utils.escape_html(row.uom || '')}</div>
        <div class="gsb-cell gsb-qty">
          <input type="number" min="0" step="any" class="gsb-qty-input" data-name="${row_name}" value="${flt(row.quantity) || 0}">
        </div>
        <div class="gsb-cell gsb-price">${frappe.format(row.unit_price, { fieldtype: 'Currency' })}</div>
        <div class="gsb-cell gsb-total">${frappe.format(amount, { fieldtype: 'Currency' })}</div>
        <div class="gsb-cell gsb-action">
          <button type="button" class="gsb-remove-btn" data-name="${row_name}" title="Hapus">&times;</button>
        </div>
      </div>`;
  });

  $container.html(`
    <div class="gsb-container">
      <div class="gsb-header">
        <span>${cfg.title}</span>
        <span class="gsb-badge">${rows.length}</span>
      </div>
      <div class="gsb-table">
        <div class="gsb-grid-row gsb-thead-row">
          <div class="gsb-th">Kode</div>
          <div class="gsb-th">Deskripsi</div>
          <div class="gsb-th">Satuan</div>
          <div class="gsb-th gsb-th-qty">Qty</div>
          <div class="gsb-th gsb-th-price">Harga Satuan</div>
          <div class="gsb-th gsb-th-total">Subtotal</div>
          <div class="gsb-th"></div>
        </div>
        <div class="gsb-tbody">
          ${body_rows || `<div class="gsb-empty-row">Belum ada ${cfg.link_label.toLowerCase()}</div>`}
        </div>
        <div class="gsb-grid-row gsb-tfoot-row">
          <div class="gsb-foot-label">TOTAL</div>
          <div class="gsb-foot-total">${frappe.format(total, { fieldtype: 'Currency' })}</div>
          <div></div>
        </div>
      </div>
      <button type="button" class="gsb-add-btn">+ Tambah ${cfg.link_label}</button>
    </div>
  `);

  rows.forEach((row) => {
    const $cell = $container.find(`.gsb-cell-link[data-name="${$.escapeSelector(row.name)}"]`);
    if (!$cell.length) return;

    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: 'Link',
        fieldname: cfg.link_field,
        options: cfg.link_doctype,
        placeholder: cfg.link_label,
        onchange: () => {
          gsb_on_item_selected(frm, fieldname, row.name, control.get_value());
        },
      },
      parent: $cell.get(0),
      render_input: true,
    });
    control.refresh();
    // set_input_value only updates the displayed text, unlike set_value() it won't re-fire onchange and loop the render.
    if (row[cfg.link_field]) {
      control.set_input_value(row[cfg.link_field]);
    }
  });

  $container.find('.gsb-qty-input').on('change', function () {
    gsb_on_qty_change(frm, fieldname, $(this).data('name'), parseFloat($(this).val()) || 0);
  });

  $container.find('.gsb-remove-btn').on('click', function () {
    gsb_remove_row(frm, fieldname, $(this).data('name'));
  });

  $container.find('.gsb-add-btn').on('click', function () {
    gsb_add_row(frm, fieldname);
  });
}
