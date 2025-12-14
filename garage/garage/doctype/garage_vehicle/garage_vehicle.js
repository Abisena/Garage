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

  brand(frm) {
    if (frm.is_dirty() && frm.doc.model) {
      frm.set_value('model', null);
    }
  },
});
