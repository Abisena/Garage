frappe.listview_settings['Garage Stock Alert'] = {
    add_fields: ['status', 'stock_qty', 'reorder_level'],

    get_indicator(doc) {
        const map = {
            Open: 'red',
            Approved: 'blue',
            Dismissed: 'gray',
            Resolved: 'green',
        };
        return [__(doc.status), map[doc.status] || 'gray', `status,=,${doc.status}`];
    },

    onload(listview) {
        // Explicit request: several parts breaching their reorder level
        // together should turn into ONE Procurement Order, not one per
        // alert - select any number of Open rows and approve them as a
        // single purchase run (mirrors bulk_approve() server-side).
        listview.page.add_action_item(__('Approve Selected'), () => {
            const names = listview.get_checked_items(true);
            if (!names.length) {
                frappe.msgprint(__('Pilih minimal 1 Stock Alert dulu (centang baris di list).'));
                return;
            }

            frappe.confirm(
                __(
                    'Buat 1 Garage Procurement Order berisi {0} item terpilih? Order dibuat sebagai Draft - stok baru bertambah setelah Anda submit dan barangnya diterima.',
                    [names.length]
                ),
                () => {
                    frappe.call({
                        method: 'garage.garage.doctype.garage_stock_alert.garage_stock_alert.bulk_approve',
                        args: { names },
                        freeze: true,
                        freeze_message: __('Membuat Procurement Order...'),
                    }).then((r) => {
                        if (!r.exc) {
                            frappe.show_alert({
                                message: __('Procurement Order {0} dibuat untuk {1} item.', [r.message, names.length]),
                                indicator: 'green',
                            });
                            listview.refresh();
                        }
                    });
                }
            );
        });
    },
};
