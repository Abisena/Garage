frappe.ui.form.on('Garage Payment Entry', {
  refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
  },
});
