const parse_flt = (value) => {
    if (typeof frappe?.utils?.flt === "function") {
        return frappe.utils.flt(value);
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const update_line_amount = (frm, cdt, cdn) => {
    const row = locals[cdt]?.[cdn];

    if (!row) {
        return;
    }

    const qty = parse_flt(row.qty);
    const rate = parse_flt(row.rate);

    frappe.model.set_value(cdt, cdn, "amount", qty * rate);
};

const update_totals = (frm) => {
    const { qty, amount } = (frm.doc.items || []).reduce(
        (acc, item) => {
            acc.qty += parse_flt(item.qty);
            acc.amount += parse_flt(item.amount);
            return acc;
        },
        { qty: 0, amount: 0 },
    );

    frm.set_value("total_qty", qty);
    frm.set_value("total_amount", amount);
};

frappe.ui.form.on("Garage Procurement Order", {
    refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
        update_totals(frm);
    },

    validate(frm) {
        update_totals(frm);
    },
});

frappe.ui.form.on("Garage Procurement Item", {
    qty(frm, cdt, cdn) {
        update_line_amount(frm, cdt, cdn);
        update_totals(frm);
    },

    rate(frm, cdt, cdn) {
        update_line_amount(frm, cdt, cdn);
        update_totals(frm);
    },

    amount(frm) {
        update_totals(frm);
    },

    items_add(frm, cdt, cdn) {
        update_line_amount(frm, cdt, cdn);
        update_totals(frm);
    },

    items_remove(frm) {
        update_totals(frm);
    },
});
