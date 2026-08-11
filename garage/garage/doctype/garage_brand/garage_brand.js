frappe.ui.form.on('Garage Brand', {
  refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
  },
});
