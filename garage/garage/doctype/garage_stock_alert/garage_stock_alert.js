frappe.ui.form.on('Garage Stock Alert', {
    refresh(frm) {
        if (frm.doc.status !== 'Open') {
            return;
        }

        frm.add_custom_button(__('Approve'), () => {
            frappe.confirm(
                __(
                    'Buat Garage Procurement Order untuk {0}? Order akan dibuat sebagai Draft - stok baru bertambah setelah Anda submit order itu dan barangnya benar diterima.',
                    [frm.doc.part_name || frm.doc.spare_part]
                ),
                () => {
                    frm.call('approve').then((r) => {
                        if (!r.exc) {
                            frappe.show_alert({
                                message: __('Procurement Order {0} dibuat.', [r.message]),
                                indicator: 'green',
                            });
                            frm.reload_doc();
                        }
                    });
                }
            );
        }, null, 'primary');

        frm.add_custom_button(__('Dismiss'), () => {
            frappe.prompt(
                { fieldname: 'remarks', fieldtype: 'Small Text', label: __('Alasan (opsional)') },
                (values) => {
                    frm.call('dismiss', { remarks: values.remarks }).then((r) => {
                        if (!r.exc) {
                            frappe.show_alert({ message: __('Alert di-dismiss.'), indicator: 'orange' });
                            frm.reload_doc();
                        }
                    });
                },
                __('Dismiss Stock Alert')
            );
        });
    },
});
