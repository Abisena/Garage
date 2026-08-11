frappe.ui.form.on('Garage Spare Part Approval', {
  refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
  },
});
