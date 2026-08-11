frappe.ui.form.on('Garage Service Type', {
  refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
  },
});
