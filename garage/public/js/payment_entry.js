function lockPaymentReferences(frm) {
  const grid = frm.fields_dict.references?.grid;
  if (!grid) return;

  const lock = frm.doc.payment_type === 'Receive';
  grid.df.cannot_add_rows = lock;
  grid.df.cannot_delete_rows = lock;
  grid.wrapper
    .find('.grid-add-row, .grid-add-multiple-rows, .grid-remove-rows, .grid-remove-all-rows')
    .toggle(!lock);
  grid.refresh();
}

// "Referensi Purchase Invoice" (custom field, inserted right after Payment
// Type) - picking an invoice here reuses ERPNext's own get_payment_entry()
// (the exact same server-side call the invoice's own "Create > Payment"
// toolbar button makes) to fill in Party/Paid Amount/Received Amount/
// accounts/exchange rate and the References table all at once, instead of
// staff filling Party by hand, clicking "Get Outstanding Invoices",
// hunting for this one invoice in that dialog, and setting the allocated
// amount themselves - the whole point of adding this field. Reusing
// core's own function (rather than re-deriving amounts/accounts here)
// means this can never disagree with what clicking "Create > Payment"
// straight from the invoice itself would have produced.
const REFERENCE_ROW_IDENTITY_FIELDS = [
  'name',
  'parent',
  'parentfield',
  'parenttype',
  'idx',
  'creation',
  'modified',
  'modified_by',
  'owner',
  'docstatus',
];

function applyPurchaseInvoiceReference(frm) {
  const invoiceName = frm.doc.reference_purchase_invoice;
  if (!invoiceName) return;

  frappe.call({
    method: 'erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry',
    args: {
      dt: 'Purchase Invoice',
      dn: invoiceName,
    },
    callback(r) {
      const data = r.message;
      if (!data) return;

      const fields = [
        'party_type',
        'party',
        'party_name',
        'paid_from',
        'paid_to',
        'paid_from_account_currency',
        'paid_to_account_currency',
        'paid_amount',
        'received_amount',
        'base_paid_amount',
        'base_received_amount',
        'source_exchange_rate',
        'target_exchange_rate',
      ];
      const values = {};
      fields.forEach((fieldname) => {
        if (data[fieldname] !== undefined) values[fieldname] = data[fieldname];
      });
      frm.set_value(values).then(() => {
        frm.clear_table('references');
        (data.references || []).forEach((row) => {
          const rowValues = { ...row };
          REFERENCE_ROW_IDENTITY_FIELDS.forEach((f) => delete rowValues[f]);
          frm.add_child('references', rowValues);
        });
        frm.refresh_field('references');

        // "Reference" natively depends_on party/paid_from/paid_to/paid_
        // amount/received_amount all being set, which is true by now - but
        // garage_theme.js's gpeApplyFieldVisibility() (for the unrelated
        // "Receive from Customer" settlement flow) unconditionally blanks
        // this exact section's depends_on the moment ANY new Payment Entry
        // loads, since payment_type/party_type default to Receive/Customer
        // before the user picks anything - and never restores it once the
        // type is switched to Pay. With depends_on gone, Frappe's own
        // layout.refresh_dependency() has nothing left to recompute (it
        // skips any field whose df.depends_on is falsy), so the section's
        // df.hidden_due_to_dependency flag is stuck at whatever it was the
        // instant depends_on got cleared - true, since none of party/paid_
        // from/etc were set yet at that point. Section.refresh() ORs that
        // stuck flag together with df.hidden, so clearing df.hidden alone
        // isn't enough - both need resetting directly before asking the
        // section to redraw itself.
        const referenceSection = frm.fields_dict.section_break_14;
        if (referenceSection) {
          referenceSection.df.hidden = 0;
          referenceSection.df.hidden_due_to_dependency = false;
          referenceSection.refresh();
        }
      });
    },
  });
}

// Created straight from a Purchase Invoice's own "Create > Payment" button,
// the mapped document already arrives with its References table filled in
// by ERPNext's own core mapper - "Referensi Purchase Invoice" itself is a
// garage-only field nothing in that native path ever touches, so it stayed
// blank even though the invoice it's for is right there in the table.
// Backfill it from that table instead of re-deriving anything, so the field
// always reflects reality regardless of which door the document came in
// through.
function syncReferenceInvoiceField(frm) {
  if (frm.doc.reference_purchase_invoice) return;

  const piRefs = (frm.doc.references || []).filter(
    (row) => row.reference_doctype === 'Purchase Invoice' && row.reference_name
  );
  if (piRefs.length !== 1) return; // ambiguous (multiple/zero invoices) - leave blank rather than guess

  frm.doc.reference_purchase_invoice = piRefs[0].reference_name;
  frm.refresh_field('reference_purchase_invoice');
}

frappe.ui.form.on('Payment Entry', {
  refresh(frm) {
    lockPaymentReferences(frm);
    syncReferenceInvoiceField(frm);
  },
  payment_type(frm) {
    lockPaymentReferences(frm);
  },
  reference_purchase_invoice(frm) {
    applyPurchaseInvoiceReference(frm);
  },
});
