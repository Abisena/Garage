// Copyright (c) 2024, Contributors
// For license information, please see license.txt

frappe.listview_settings['Garage Service Order'] = {
  onload(listview) {
    listview.page.on('show', () => {
      listview.refresh();
    });
  },
};
