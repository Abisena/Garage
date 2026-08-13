console.log('>>> product_bundle.js LOADED');
let df = frappe.meta.get_docfield('Product Bundle Item', 'rate');
if (df) { df.hidden = 0; df.in_list_view = 1; }

frappe.ui.form.on('Product Bundle', {
  before_load(frm) {
    const grid = frm.fields_dict.items?.grid;
    if (grid) grid.df.in_place_edit = 1;
  },
  refresh(frm) {
    let $sec = $(frm.fields_dict.basic_section.wrapper);
    if (!$sec.find('.section-head').length) {
      $sec.prepend('<div class="section-head">Info Bundle</div>');
    }
    const grid = frm.fields_dict.items?.grid;
    if (grid) grid.df.in_place_edit = 1;

    let style = document.getElementById('hide-bundle-edit-col');
    if (!style) {
      style = document.createElement('style');
      style.id = 'hide-bundle-edit-col';
      document.head.appendChild(style);
    }
    style.textContent = `
      [data-fieldname="items"] .rows .row > .col:not(.grid-static-col):not(.row-check):not(.row-index),
      [data-fieldname="items"] .grid-heading-row .row > .grid-static-col:not([data-fieldname]) {
        display: none !important;
      }
    `;

    // JS removal as backup
    if (grid) {
      grid.grid_rows?.forEach((row) => {
        if (row.open_form_button) {
          row.open_form_button.parent('.col').remove();
          row.open_form_button = null;
        }
        if (row.configure_columns_button) {
          row.configure_columns_button.remove();
          row.configure_columns_button = null;
        }
      });
    }
  },
});
