function lockPaymentReferences(frm) {
  const grid = frm.fields_dict.references?.grid;
  if (!grid) return;

  const lock = frm.doc.payment_type === 'Receive';
  grid.df.cannot_add_rows = lock;
  grid.df.cannot_delete_rows = lock;
  grid.wrapper
    .find('.grid-add-row, .grid-add-multiple-rows, .grid-remove-rows, .grid-remove-all-rows')
    .toggle(!lock);
  grid.refresh();
}

frappe.ui.form.on('Payment Entry', {
  refresh(frm) {
    lockPaymentReferences(frm);
  },
  payment_type(frm) {
    lockPaymentReferences(frm);
  },
});
