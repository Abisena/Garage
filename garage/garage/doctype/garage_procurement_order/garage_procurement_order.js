frappe.ui.form.on("Garage Procurement Order", {
    refresh(frm) {
        frm.trigger("update_totals");
    },

    validate(frm) {
        frm.trigger("update_totals");
    },

    update_totals(frm) {
        let total_qty = 0;
        let total_amount = 0;

        (frm.doc.items || []).forEach((item) => {
            const qty = frappe.utils.flt(item.qty);
            const rate = frappe.utils.flt(item.rate);
            const amount = qty * rate;

            frappe.model.set_value(item.doctype, item.name, "amount", amount);

            total_qty += qty;
            total_amount += amount;
        });

        frm.set_value("total_qty", total_qty);
        frm.set_value("total_amount", total_amount);
    },
});

frappe.ui.form.on("Garage Procurement Item", {
    qty(frm) {
        frm.trigger("update_totals");
    },

    rate(frm) {
        frm.trigger("update_totals");
    },

    items_add(frm) {
        frm.trigger("update_totals");
    },

    items_remove(frm) {
        frm.trigger("update_totals");
    },
});
