frappe.ui.form.on('Garage Stock Ledger Entry', {
  refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
  },
});
