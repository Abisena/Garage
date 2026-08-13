frappe.ui.form.on('Garage Branch', {
  refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');

    // autoname is "field:branch_code", so core Frappe hides this field once
    // the doc is saved (assumes the docname alone is enough). Keep it
    // visible for consistency - editable while new, read-only afterwards.
    frm.toggle_display('branch_code', true);
    frm.set_df_property('branch_code', 'read_only', !frm.doc.__islocal);
  },
});
