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

// Vehicle ownership is a one-time assignment, not an editable attribute:
// once "No. Customer" has a value - even on a brand new, not-yet-saved
// record - it locks immediately and stays locked, including through
// "Update" mode (which normally restores every other field's editability).
// Backed up server-side in garage_vehicle.py's _lock_customer().
const lockCustomerIfSet = (frm) => {
  if (frm.doc.customer) {
    frm.set_df_property('customer', 'read_only', 1);
  }
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

    if (!frm.is_new() && !frm.__is_update_mode) {
      frm.add_custom_button('Update', () => {
        frm.__is_update_mode = true;
        toggleFormEditable(frm, true);
        lockCustomerIfSet(frm);
      });
    }

    lockIfNeeded(frm);
    lockCustomerIfSet(frm);
  },

  after_save(frm) {
    frm.__is_update_mode = false;
    lockIfNeeded(frm);
    lockCustomerIfSet(frm);
  },

  customer(frm) {
    lockCustomerIfSet(frm);
  },

  brand(frm) {
    if (frm.is_dirty() && frm.doc.model) {
      frm.set_value('model', null);
    }
  },
});
