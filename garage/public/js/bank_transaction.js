// bank_transaction.json's field_order splits Date/Status/Bank Account/
// Company/Deposit/Withdrawal/Currency/Description/Reference Number/
// Transaction ID/Transaction Type across THREE separate (unlabeled)
// Section Breaks (section_break_4, section_break_10) before the real
// "Payment Entries" table section. A new section only starts once BOTH
// columns of the PREVIOUS section finish, aligned to whichever column was
// taller - section 1's right column (Status/Bank Account/Company, 3
// fields) is much taller than its left column (Date alone, 1 field), so
// section 2 (Deposit/Withdrawal) starts far below where Date ended,
// leaving a big empty gap under Date with nothing explaining it visually.
//
// Merged into one continuous 2-column block instead of three stacked
// sections, so both columns fill evenly with no artificial pause between
// them:
//   Left:  Date, Deposit, Withdrawal, Description
//   Right: Status, Bank Account, Company, Reference Number, Transaction
//          ID, Transaction Type
// (Currency is hidden entirely via a Property Setter - see hooks.py
// fixtures - not moved here.) The "Payment Entries" table section is left
// alone - a full-width table belongs in its own section regardless.
frappe.ui.form.on('Bank Transaction', {
    refresh(frm) {
        merge_top_sections(frm);
        split_payment_from_to(frm);
        split_extended_bank_statement(frm);
    },
});

// "Payment From / To" (party_section) has a real column break
// (column_break_3czf) already, but Party Type AND Party both sat in the
// left column, leaving the right column looking empty (its own fields -
// bank_party_name/account_number/iban - have no allow_on_submit, so on a
// submitted doc with no value in any of them they're hidden entirely by
// base_control.js's get_status(), same reasoning as before). Since
// there's nothing else usable to put there, Party itself is moved into
// that right column instead, so the section at least reads as two real
// columns (Party Type left, Party right) rather than one column stacked
// next to permanently-empty space.
function split_payment_from_to(frm) {
    if (frm.__grs_party_split) return;

    const party_field = frm.fields_dict.party;
    const bank_party_name_field = frm.fields_dict.bank_party_name;
    if (!party_field || !bank_party_name_field) return;

    const right_col = bank_party_name_field.$wrapper.parent();
    if (!right_col.length) return;

    right_col.prepend(party_field.$wrapper);
    frm.__grs_party_split = true;
}

// "Extended Bank Statement" has no column break at all in its field_order
// (extended_bank_statement_section -> included_fee -> excluded_fee, both
// fields, no Column Break in between) - Frappe renders it as ONE column
// only, so the right half of the section is just empty space. Built a
// second .form-column by hand, matching the exact structure Column.make()
// itself creates (frappe/form/column.js - a .form-column wrapping a
// <form>, both columns then set to col-sm-6 as Column.resize_all_columns()
// would for a 2-column section), and moved Excluded Fee into it.
function split_extended_bank_statement(frm) {
    if (frm.__grs_extended_split) return;

    const included_field = frm.fields_dict.included_fee;
    const excluded_field = frm.fields_dict.excluded_fee;
    if (!included_field || !excluded_field) return;

    const left_col = included_field.$wrapper.parent().parent(); // .frappe-control -> <form> -> .form-column
    const section_body = left_col.parent();
    if (!section_body.length) return;

    const right_col = $('<div class="form-column"><form></form></div>').appendTo(section_body);
    right_col.find('form').append(excluded_field.$wrapper);

    left_col.removeClass().addClass('form-column col-sm-6');
    right_col.removeClass().addClass('form-column col-sm-6');

    frm.__grs_extended_split = true;
}

function merge_top_sections(frm) {
    if (frm.__grs_layout_merged) return;

    const date_field = frm.fields_dict.date;
    const status_field = frm.fields_dict.status;
    if (!date_field || !status_field) return;

    const left_col = date_field.$wrapper.parent();
    const right_col = status_field.$wrapper.parent();
    if (!left_col.length || !right_col.length) return;

    ['deposit', 'withdrawal', 'description'].forEach((fieldname) => {
        const field = frm.fields_dict[fieldname];
        if (field) left_col.append(field.$wrapper);
    });

    ['transaction_id', 'transaction_type'].forEach((fieldname) => {
        const field = frm.fields_dict[fieldname];
        if (field) right_col.append(field.$wrapper);
    });

    // Reference Number goes in the right column specifically right after
    // Company (insertAfter, not appended to the end) so it lands directly
    // under Company as asked, ahead of Transaction ID/Transaction Type.
    const company_field = frm.fields_dict.company;
    const reference_number_field = frm.fields_dict.reference_number;
    if (company_field && reference_number_field) {
        reference_number_field.$wrapper.insertAfter(company_field.$wrapper);
    }

    // Both now-emptied section breaks would otherwise still render their
    // own (small but visible) top margin/border even with no fields left
    // inside them.
    frm.toggle_display('section_break_4', false);
    frm.toggle_display('section_break_10', false);

    frm.__grs_layout_merged = true;
}
