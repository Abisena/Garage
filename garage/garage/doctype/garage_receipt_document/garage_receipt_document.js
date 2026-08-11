frappe.ui.form.on('Garage Receipt Document', {
  refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
  },
});
