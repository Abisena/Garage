frappe.ui.form.on('Garage Service Type', {
    refresh(frm) {
        toggle_fields(frm);
    },

    service_type(frm) {
        if (frm.doc.service_type) {
            frm.set_value('product_bundle', '');
        }
        toggle_fields(frm);
    },

    product_bundle(frm) {
        if (frm.doc.product_bundle) {
            frm.set_value('service_type', '');
        }
        toggle_fields(frm);
    },
});

function toggle_fields(frm) {
    const has_service_type = Boolean(frm.doc.service_type);
    const has_product_bundle = Boolean(frm.doc.product_bundle);

    frm.set_df_property('service_type', 'read_only', has_product_bundle);
    frm.set_df_property('product_bundle', 'read_only', has_service_type);

    frm.set_df_property('service_type', 'reqd', !has_product_bundle);
    frm.set_df_property('product_bundle', 'reqd', !has_service_type);
}
