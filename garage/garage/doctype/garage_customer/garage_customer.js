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

frappe.ui.form.on('Garage Customer', {
  refresh(frm) {
    if (!frm.is_new() && !frm.__is_update_mode) {
      frm.add_custom_button('Update', () => {
        frm.__is_update_mode = true;
        toggleFormEditable(frm, true);
      });
    }

    lockIfNeeded(frm);
  },

  after_save(frm) {
    frm.__is_update_mode = false;
    lockIfNeeded(frm);
  },
});
