frappe.provide('garage');

// Indonesian license plates are [huruf wilayah][angka][huruf seri], e.g.
// "B 1234 XYZ" or "BK 5678 AB" - auto-insert the spaces between those three
// groups as the user types, rather than making them type the spaces
// themselves. Permissive on purpose (no length caps / format validation):
// region codes are usually 1-2 letters but a few Java codes (AA, AB, AD, AE,
// AG) are 2 letters too, so this only handles spacing, not correctness.
//
// Lives here (not Garage Vehicle's own doctype_js) because it also has to
// run inside the Quick Entry dialog opened from *other* forms (e.g. Garage
// Service Order's "No. Polisi" field -> "+ Create New"), and Garage
// Vehicle's doctype_js only loads when Garage Vehicle's own form is open,
// not just because another form references it through a Link field.
const GARAGE_LICENSE_PLATE_GROUPS = /^([A-Z]*)([0-9]*)([A-Z]*)$/;

garage.formatLicensePlateInput = function (raw) {
  const clean = (raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const match = clean.match(GARAGE_LICENSE_PLATE_GROUPS);
  if (!match) return clean;
  return [match[1], match[2], match[3]].filter(Boolean).join(' ');
};

garage.attachLicensePlateAutoFormat = function (control) {
  const inputEl = control && control.$input && control.$input.get(0);
  if (!inputEl || inputEl.__garagePlateFormatterAttached) return;
  inputEl.__garagePlateFormatterAttached = true;

  // Capture phase, so this runs and reformats *before* Frappe's own
  // (bubble-phase) input listener reads the value - otherwise Frappe's
  // control would capture the raw unspaced text instead of the formatted one.
  inputEl.addEventListener(
    'input',
    (e) => {
      const input = e.target;
      const cursorPos = input.selectionStart;
      const rawBeforeCursor = input.value
        .slice(0, cursorPos)
        .replace(/[^A-Za-z0-9]/g, '').length;

      const formatted = garage.formatLicensePlateInput(input.value);
      if (formatted === input.value) return;
      input.value = formatted;

      let seen = 0;
      let pos = formatted.length;
      for (let i = 0; i < formatted.length; i++) {
        if (/[A-Za-z0-9]/.test(formatted[i])) seen++;
        if (seen === rawBeforeCursor) {
          pos = i + 1;
          break;
        }
      }
      input.setSelectionRange(pos, pos);
    },
    true,
  );
};

// Quick Entry dialog customization hook (frappe.ui.form.{Doctype}QuickEntryForm
// is core's documented mechanism for this - see
// frappe/public/js/frappe/form/quick_entry.js make_quick_entry()).
if (frappe.ui.form.QuickEntryForm && !frappe.ui.form.GarageVehicleQuickEntryForm) {
  frappe.ui.form.GarageVehicleQuickEntryForm = class GarageVehicleQuickEntryForm extends (
    frappe.ui.form.QuickEntryForm
  ) {
    is_quick_entry() {
      // Only pop the small dialog when triggered from another form's Link
      // field (e.g. Service Order's "No. Polisi" -> "+ Create New" - see
      // frappe/public/js/frappe/form/controls/link.js new_doc(), which sets
      // frappe._from_link right before opening this). That's the
      // stay-in-context case quick_entry=1 was turned on for. Direct
      // creation - the List View's "+ Add Garage Vehicle", or navigating to
      // the /new route straight - goes through frappe.new_doc() instead,
      // which never sets frappe._from_link, so this falls through to the
      // full form: a real new vehicle record needs more than the 4
      // mandatory-field dialog (type, color, transmission, fuel, mileage...).
      if (!frappe._from_link) return false;
      return super.is_quick_entry();
    }

    render_dialog() {
      super.render_dialog();
      const control = this.dialog.fields_dict.license_plate;
      garage.attachLicensePlateAutoFormat(control);

      // The dialog can open pre-filled with whatever the user already typed
      // into the Vehicle Link field's search box before clicking "+ Create
      // New" (frappe/public/js/frappe/model/get_new_doc() copies
      // route_options.name_field straight into the autoname field). That
      // initial value is set programmatically, not typed, so it never fires
      // the 'input' event the live formatter listens for - reformat it once
      // here, through the dialog's own set_value() (not a raw DOM write) so
      // the control's internal value/doc stay in sync too.
      const current = control && control.get_value();
      const formatted = current && garage.formatLicensePlateInput(current);
      if (formatted && formatted !== current) {
        this.dialog.set_value('license_plate', formatted);
      }
    }
  };
}

// Fix a Frappe core bug that breaks nested "+ Create New" chains inside a
// Quick Entry dialog (e.g. Service Order -> new Vehicle quick-entry -> new
// Customer quick-entry nested inside it). When the nested dialog resolves,
// core's frappe.ui.form.update_calling_link() (frappe/public/js/frappe/form/save.js)
// writes the new link value onto `frappe._from_link`, a *deep clone* of the
// calling Link control taken when "+ Create New" was clicked
// (frappe/public/js/frappe/form/controls/link.js new_doc()). For a field
// living on a Form that clone's set_value() still reaches the real doc via
// frappe.model.set_value(), so it's harmless there - but for a field living
// inside a Dialog (no `.frm`), set_model_value() falls back to writing
// straight onto the clone's own `this.doc`/`this.value`, which are separate
// objects from the live dialog's. Only the shared $input DOM node gets
// updated, so the field *looks* filled - until Dialog.get_values()
// (frappe/public/js/frappe/ui/field_group.js) does its mandatory-field pass,
// sees the live control's `.value` is still empty, calls refresh_input() on
// it, and wipes the input back to blank. Net effect: the "No. Customer"
// field shows a value right after the nested customer is created, then
// silently reports "missing" the moment you click Save on the vehicle
// dialog. Work around it by routing dialog-context updates through the
// *live* dialog (window.cur_dialog, which frappe/public/js/frappe/ui/dialog.js
// already restacks to the parent dialog the instant the nested one hides -
// before update_calling_link runs) and its own set_value(), which updates
// the real control instead of the clone.
if (frappe.ui.form && frappe.ui.form.update_calling_link && !frappe.ui.form.update_calling_link.__garage_nested_quick_entry_patched) {
  const original_update_calling_link = frappe.ui.form.update_calling_link;
  const patched_update_calling_link = function (newdoc) {
    const from_link = frappe._from_link;
    const dialog = window.cur_dialog;

    if (
      from_link &&
      !from_link.frm &&
      from_link.df &&
      from_link.df.fieldtype === 'Link' &&
      from_link.df.options === newdoc.doctype &&
      dialog &&
      dialog.fields_dict &&
      dialog.fields_dict[from_link.df.fieldname]
    ) {
      dialog.set_value(from_link.df.fieldname, newdoc.name);
      // Core's own update_calling_link() always clears this at the end (it's
      // a one-shot global) - do the same here. Otherwise it dangles pointing
      // at *this* nested field's clone, so the next level up in a nested
      // chain (e.g. the vehicle dialog's own "+ Create New" callback firing
      // after *it* saves) finds a stale, mismatched frappe._from_link,
      // silently fails its doctype check, and never propagates the value
      // back to the form that started the chain.
      frappe._from_link = null;
      return;
    }

    return original_update_calling_link(newdoc);
  };
  patched_update_calling_link.__garage_nested_quick_entry_patched = true;
  frappe.ui.form.update_calling_link = patched_update_calling_link;
}

// Collapse the form sidebar (tags/attachments/assign panel behind the ☰ toggle)
// by default whenever a doctype form is freshly opened. Users can still expand
// it manually; the flag on `page` only suppresses the auto-collapse for
// subsequent documents viewed in the same Form instance during the session.
if (frappe.ui.form && frappe.ui.form.Form && !frappe.ui.form.Form.prototype.__garage_sidebar_patched) {
  frappe.ui.form.Form.prototype.__garage_sidebar_patched = true;
  const original_refresh = frappe.ui.form.Form.prototype.refresh;
  frappe.ui.form.Form.prototype.refresh = function () {
    const result = original_refresh.apply(this, arguments);
    if (this.page && !this.page.__garage_sidebar_default_applied) {
      this.page.__garage_sidebar_default_applied = true;
      const $sidebar = this.page.wrapper.find('.layout-side-section');
      if ($sidebar.length) {
        // Don't gate on `:visible` here: at this point in the render the page
        // container itself may not be attached/shown yet, so jQuery reports the
        // sidebar as not visible even though it will be once the route settles.
        $sidebar.hide();
        this.page.update_sidebar_icon && this.page.update_sidebar_icon();
      }
    }
    return result;
  };
}

// Same idea for List View's own sidebar (Filter By / Assigned To / Tags panel):
// collapse it by default the first time a list is opened.
//
// Tried hooking the documented `list_sidebar_setup` event first, but Frappe
// fires it *before* `cur_list` is assigned (list_factory.js constructs the
// ListView, which builds the sidebar synchronously, and only afterwards calls
// set_cur_list()) - so `cur_list` read inside the handler was always null on a
// list's first-ever load. Patching ListSidebar.make() directly sidesteps that
// ordering issue since `this.page` is available immediately.
if (frappe.views.ListSidebar && !frappe.views.ListSidebar.prototype.__garage_sidebar_patched) {
  frappe.views.ListSidebar.prototype.__garage_sidebar_patched = true;
  const original_make = frappe.views.ListSidebar.prototype.make;
  frappe.views.ListSidebar.prototype.make = function () {
    const result = original_make.apply(this, arguments);
    const page = this.page;
    if (page && !page.__garage_sidebar_default_applied) {
      page.__garage_sidebar_default_applied = true;
      const $sidebar = page.wrapper.find('.layout-side-section');
      if ($sidebar.length) {
        $sidebar.hide();
        page.update_sidebar_icon && page.update_sidebar_icon();
      }
    }
    return result;
  };
}

// Testing-only "Reset Test Data" button: wipes transactional documents
// (orders, invoices, payments, stock moves) and their GL/stock ledger
// fallout, leaving master data (customers, vehicles, service types,
// bundles, spare parts) untouched. System Manager only, and gated behind
// a confirm dialog since garage.api.dev_tools.reset_test_transactions is
// destructive - see that module for what it actually does.
if (frappe.user.has_role('System Manager') && !$('#garage-reset-test-data-btn').length) {
  const $btn = $(`
    <button id="garage-reset-test-data-btn" title="Hapus semua transaksi test (Sales Invoice, Payment, Stock Entry, Service Order, dst). Master data aman." style="
      position: fixed; bottom: 20px; right: 20px; z-index: 1100;
      background: #dc2626; color: #fff; border: none; border-radius: 999px;
      padding: 10px 18px; font-size: 12px; font-weight: 700;
      box-shadow: 0 4px 12px rgba(220,38,38,0.35); cursor: pointer;
      letter-spacing: 0.02em;
    ">Reset Data Testing</button>
  `).appendTo('body');

  $btn.on('click', () => {
    frappe.confirm(
      `Ini akan <strong>menghapus semua data transaksi</strong> (Sales Invoice, Payment Entry, Stock Entry, Garage Service Order, Repair QC, Spare Part Request) beserta GL Entry & Stock Ledger Entry turunannya.<br><br>` +
      `Master data (Customer, Vehicle, Service Type, Service Bundle, Spare Part) <strong>tidak</strong> akan disentuh.<br><br>` +
      `Tindakan ini <strong>tidak bisa dibatalkan</strong>. Lanjutkan?`,
      () => {
        frappe.dom.freeze('Menghapus data transaksi test...');
        frappe.call({
          method: 'garage.api.dev_tools.reset_test_transactions',
          args: { confirm: 1 },
          callback(r) {
            frappe.dom.unfreeze();
            if (r.message) {
              const lines = Object.entries(r.message)
                .map(([doctype, count]) => `${doctype}: ${count}`)
                .join('<br>');
              frappe.msgprint({
                title: __('Data Testing Direset'),
                indicator: 'green',
                message: lines,
              });
            }
          },
          error() {
            frappe.dom.unfreeze();
          },
        });
      }
    );
  });
}

// Sales Invoice: hide sections not relevant to this app's workflow

// Mirrors the "${totalItems} item" badge garage_service_order.js prepends
// above its required_parts table - moves Total Quantity from its default
// spot below the grid to a small badge above it instead.
const gsiRenderTotalQtyBadge = (frm) => {
  const itemsWrapper = frm.fields_dict.items?.$wrapper;
  if (!itemsWrapper) return;

  itemsWrapper.find('.gsi-total-qty-badge').remove();
  const totalQty = flt(frm.doc.total_qty);
  if (totalQty) {
    itemsWrapper.prepend(
      `<div class="gsi-total-qty-badge" style="display:inline-block;background:var(--g-accent);color:#fff;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;margin-bottom:6px;">Total Qty: ${totalQty}</div>`
    );
  }
};

// Same boxed-summary pattern as garage_service_order.js's Disc/PPN/Grand
// Total footer, extended with the two fields that only exist on Sales
// Invoice (Total Advance, Outstanding Amount) - hence "properly" here means
// a rounded card with 5 rows instead of GSO's flat 3, not a re-design.
const gsiRenderTotalsBox = (frm) => {
  // Anchor to the items grid, not grand_total's own section: once
  // total_taxes_and_charges/grand_total/total_advance/outstanding_amount are
  // all hidden, Frappe collapses the now-empty "Totals" section itself
  // (layout.js hides sections with no visible controls left), which would
  // take a box inserted inside it down too. The items grid always stays
  // visible, so it's a stable place to hang the box off instead.
  const itemsWrapper = frm.fields_dict.items?.$wrapper;
  if (!itemsWrapper) return;

  $(frm.wrapper).find('.gsi-totals-box').remove();

  const fmt = (v) => frappe.format(flt(v, 2), { fieldtype: 'Currency' });

  let totalDiscount = 0;
  let totalPpn = 0;
  (frm.doc.items || []).forEach((row) => {
    const priceListRate = flt(row.price_list_rate);
    const rate = flt(row.rate);
    const qty = flt(row.qty);
    if (priceListRate) {
      totalDiscount += (priceListRate - rate) * qty;
    }
    const ppnPercent = flt(row.ppn_percent);
    if (ppnPercent) {
      totalPpn += flt(row.amount) - flt(row.amount) / (1 + ppnPercent / 100);
    }
  });

  const summaryRow = (label, value, variant) => {
    const bg = variant === 'grand' ? 'var(--g-accent, #4f46e5)' : '#2c3e50';
    const weight = variant === 'grand' ? '700' : '600';
    // flex:0 0 auto + min-width:0 on the label lets long labels ("Total
    // Taxes and Charges (PPN)") wrap onto a second line within the box
    // instead of forcing the row wider than the box and clipping the value.
    return `
      <div style="display:flex; align-items:center; background:${bg}; border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="flex:1 1 0; min-width:0; padding:8px 10px; text-align:left; font-weight:${weight}; color:#fff;">${label}</div>
        <div style="flex:0 0 auto; padding:8px 10px; text-align:right; font-weight:${weight}; white-space:nowrap; color:#fff;">${value}</div>
      </div>`;
  };

  const $box = $(`
    <div class="gsi-totals-box" style="display:flex; justify-content:flex-end; margin:8px 0;">
      <div style="width:340px; border-radius:var(--g-radius-sm, 8px); overflow:hidden; box-shadow:var(--g-shadow, 0 1px 3px rgba(0,0,0,0.15));">
        ${summaryRow('Total Diskon', fmt(totalDiscount))}
        ${summaryRow('Total Taxes and Charges (PPN)', fmt(totalPpn))}
        ${summaryRow('Grand Total', fmt(frm.doc.grand_total), 'grand')}
        ${summaryRow('Total Advance', fmt(frm.doc.total_advance))}
        ${summaryRow('Outstanding Amount', fmt(frm.doc.outstanding_amount))}
      </div>
    </div>
  `);

  itemsWrapper.closest('.form-group, .frappe-control').after($box);
};

frappe.ui.form.on('Sales Invoice', {
  refresh(frm) {
    frm.set_df_property('currency_and_price_list', 'hidden', 1);
    frm.set_df_property('accounting_dimensions_section', 'hidden', 1);
    frm.set_df_property('is_pos', 'hidden', 1);
    frm.set_df_property('is_return', 'hidden', 1);
    frm.set_df_property('is_debit_note', 'hidden', 1);
    frm.set_df_property('update_stock', 'hidden', 1);

    // Totals: rounding is applied automatically, no need to expose the
    // knobs - IDR has no cents, so Rounded Total is redundant with Grand
    // Total anyway. Keep Grand Total, Total Advance, Outstanding Amount.
    frm.set_df_property('rounding_adjustment', 'hidden', 1);
    frm.set_df_property('rounded_total', 'hidden', 1);
    frm.set_df_property('disable_rounded_total', 'hidden', 1);
    frm.set_df_property('total_qty', 'hidden', 1);
    frm.set_df_property('total', 'hidden', 1); // "Total (IDR)" - redundant with Grand Total when no taxes/discount apply
    frm.set_df_property('section_break_49', 'hidden', 1); // "Additional Discount" section
    gsiRenderTotalQtyBadge(frm);

    // "Download"/"Upload" grid footer buttons (bulk CSV edit of the items
    // table, from the items field's allow_bulk_edit) aren't a workflow this
    // app uses - hide them rather than expose a raw CSV import for a table
    // whose rows come from Service Order items.
    frm.fields_dict.items?.grid?.wrapper
      ?.find('.grid-download, .grid-upload')
      .addClass('hidden');

    // Item rate already has PPN (11%) baked in (see repair_qc.py's
    // _apply_ppn_pricing) rather than shown as a separate tax line, which
    // reads as a mismatch against the Service Order's pre-tax rate unless
    // the column says so. A Property Setter on the label alone doesn't
    // reach this grid's header (cached client-side), so set it at render
    // time directly instead. Use make_head() (rebuilds the header row from
    // grid.docfields), not grid.refresh() - refresh() calls setup_fields()
    // first, which re-reads docfields from meta and silently undoes this.
    // Deferred: the grid's own internal setup (data render, column sizing)
    // runs after this refresh handler and redraws the header again from its
    // own docfields snapshot, clobbering an in-place relabel otherwise.
    //
    // Also deferred for the same reason: ERPNext's own SalesInvoiceController
    // calls set_dynamic_labels() -> set_currency_labels() -> frm.refresh_fields()
    // as part of its own refresh handling, which re-derives each control's
    // hidden state from a fresh docfield lookup and silently un-hides
    // total_taxes_and_charges/grand_total/total_advance/outstanding_amount
    // if that runs after ours.
    setTimeout(() => {
      const itemsGrid = frm.fields_dict.items?.grid;
      if (itemsGrid) {
        try {
          itemsGrid.update_docfield_property('rate', 'label', 'Rate (Termasuk PPN)');
          itemsGrid.make_head();
        } catch (e) {
          // field not rendered yet on this view; ignore
        }
      }

      // Grand Total / Total Taxes and Charges / Total Advance / Outstanding
      // Amount are replaced by the single gsi-totals-box card below (built
      // alongside Total Diskon, which has no field of its own) - hide the
      // scattered originals instead of showing both.
      frm.set_df_property('total_taxes_and_charges', 'hidden', 1);
      frm.set_df_property('grand_total', 'hidden', 1);
      frm.set_df_property('total_advance', 'hidden', 1);
      frm.set_df_property('outstanding_amount', 'hidden', 1);
      gsiRenderTotalsBox(frm);
    }, 300);
  },
  total_qty(frm) {
    // Fires whenever ERPNext recalculates the total (e.g. row qty edited),
    // independent of the form's own refresh cycle - keeps the badge in sync.
    gsiRenderTotalQtyBadge(frm);
  },
  grand_total(frm) {
    gsiRenderTotalsBox(frm);
  },
  total_advance(frm) {
    gsiRenderTotalsBox(frm);
  },
  outstanding_amount(frm) {
    gsiRenderTotalsBox(frm);
  },
});

// Payment Entry: today every Payment Entry in this app is a Receive/Customer
// settlement auto-created against a Sales Invoice by the Service Order ->
// Repair QC flow (see repair_qc.py's _create_payment_entry_if_finished) -
// full ERPNext Payment Entry exposes a lot more than that one flow needs
// (multi-currency writeoff, tax withholding, accounting dimensions...).
// Gate the cleanup behind that shape instead of hiding unconditionally, so a
// future Pay/Supplier flow (parts purchasing) or an advance/DP payment isn't
// silently stripped of fields it actually needs.
const gpeIsServiceOrderSettlement = (frm) =>
  frm.doc.payment_type === 'Receive' && frm.doc.party_type === 'Customer';

const gpeApplyFieldVisibility = (frm) => {
  if (!gpeIsServiceOrderSettlement(frm)) return;

  frm.set_df_property('bank_account', 'hidden', 1); // Company Bank Account - garage takes cash/QRIS at the counter, no bank reconciliation
  frm.set_df_property('party_bank_account', 'hidden', 1);
  frm.set_df_property('get_outstanding_orders', 'hidden', 1); // Sales Order flow isn't used here, only Sales Invoice
  frm.set_df_property('get_outstanding_invoices', 'hidden', 1); // Payment References is always pre-filled by the source Sales Invoice, this bulk-fetch dialog is never needed
  frm.set_df_property('section_break_34', 'hidden', 1); // Writeoff - allocated amount already comes fixed from the source Sales Invoice
  // "Taxes and Charges" is actually 3 separate section breaks under one
  // collapsible header (template/withholding, the "taxes" table, and the
  // totals) - all 3 need hiding or the table/totals show up on their own.
  // PPN is baked into the Sales Invoice item rate, not applied again here.
  frm.set_df_property('taxes_and_charges_section', 'hidden', 1);
  frm.set_df_property('section_break_56', 'hidden', 1);
  frm.set_df_property('section_break_60', 'hidden', 1);
  frm.set_df_property('deductions_or_loss_section', 'hidden', 1);
  frm.set_df_property('accounting_dimensions_section', 'hidden', 1);
  frm.set_df_property('subscription_section', 'hidden', 1); // Auto Repeat - not a subscription business
  frm.set_df_property('clearance_date', 'hidden', 1); // bank-clearing field, not used
  frm.set_df_property('paid_to_account_currency', 'hidden', 1); // Account Currency (To) - always IDR, no multi-currency here
  frm.set_df_property('contact_person', 'hidden', 1); // Contact - Party (customer name) already covers this
  frm.set_df_property('contact_email', 'hidden', 1); // Email - not used for anything in this flow
  frm.set_df_property('payment_accounts_section', 'hidden', 1); // Accounts (paid_from/paid_to) - already auto-filled from party + Mode of Payment, no manual override needed
  frm.set_df_property('section_break_12', 'hidden', 1); // More Information - status is already shown as the doc's title badge, remarks/letter head/payment order aren't used here

  // Transaction ID (Cheque/Reference No + Date) - ERPNext makes these
  // mandatory whenever money moves through a Bank-type account (see
  // payment_entry.js's toggle_reqd on account_type == "Bank"), so hiding the
  // section outright needs a fallback value or Wire Transfer payments would
  // fail to submit with "mandatory" errors on a field nobody can see.
  // Default both to the posting date - not a real bank transaction
  // reference, just enough to satisfy the mandatory check.
  frm.set_df_property('transaction_references', 'hidden', 1);
  if (!frm.doc.reference_no) frm.set_value('reference_no', frm.doc.posting_date);
  if (!frm.doc.reference_date) frm.set_value('reference_date', frm.doc.posting_date);

  // "Payment From / To" is generic ERPNext wording for a section that, in
  // this flow, is always money coming IN from a customer - and it duplicated
  // itself (Party + Party Name showing the same "DEWI LESTARI" twice) while
  // giving no clue which Service Order the payment actually belongs to.
  frm.set_df_property('party_type', 'hidden', 1); // always "Customer" under this guard
  frm.set_df_property('party_name', 'hidden', 1); // duplicates the Party field's own label
  // Section.refresh() only toggles collapse state, it never re-renders the
  // header text from df.label (see frappe/public/js/frappe/form/section.js)
  // - the label is a plain text node baked into `.head` at construction
  // time, so it has to be edited directly instead.
  const partySection = frm.fields_dict.party_section;
  if (partySection && partySection.head) {
    partySection.df.label = 'Diterima Dari';
    const textNode = partySection.head
      .contents()
      .filter(function () {
        return this.nodeType === 3;
      })
      .first();
    if (textNode.length) textNode[0].nodeValue = 'Diterima Dari';
  }

  // Move Paid Amount up into "Diterima Dari"'s second column (previously
  // Contact/Email, both hidden above) instead of leaving it alone in its
  // own "Amount" section below - anchor on contact_person's wrapper since
  // column breaks don't get their own frm.fields_dict entry, only fields do.
  const paidAmountField = frm.get_field('paid_amount');
  const contactField = frm.get_field('contact_person');
  if (paidAmountField && contactField) {
    paidAmountField.$wrapper.appendTo(contactField.$wrapper.parent());
    frm.set_df_property('payment_amounts_section', 'hidden', 1); // now empty - Paid Amount moved above
  }

  // Account Paid To ("which bank did the money land in") is the one field
  // out of the whole "Accounts" section that's actually worth seeing - move
  // it next to Mode of Payment instead of un-hiding the entire section
  // (which would also bring back Party Balance, Paid From, account
  // currencies/balances - none of that is relevant with 1 bank account).
  const paidToField = frm.get_field('paid_to');
  const modeOfPaymentField = frm.get_field('mode_of_payment');
  if (paidToField && modeOfPaymentField) {
    paidToField.$wrapper.appendTo(modeOfPaymentField.$wrapper.parent());
  }

  // get_payment_entry() defaults paid_to to the company's default bank/cash
  // account server-side even before Mode of Payment is picked - since that
  // now happens to be the same BCA account we set up, it reads as "the bank
  // is already chosen" when nothing's actually been selected yet.
  if (!frm.doc.mode_of_payment && frm.doc.paid_to) {
    frm.set_value('paid_to', '');
  }

  // "Reference" (the Payment References table showing which Sales Invoice
  // this settles) natively depends_on paid_from && paid_to being set - which
  // now stays blank until Mode of Payment is picked, so the section would
  // stay hidden until then too. The table's own data comes from
  // get_payment_entry() and doesn't actually need paid_to, so drop that
  // gating and let it show from the start.
  frm.set_df_property('section_break_14', 'depends_on', '');
  frm.set_df_property('section_break_14', 'hidden', 0);
};

// Fetches the Sales Invoice this payment settles (via its first Sales
// Invoice reference) and, through that, the Service Order + vehicle it was
// raised for - then shows it as a line under "Diterima Dari" so it's
// obvious at a glance which job this payment belongs to, not just which
// customer.
const gpeRenderSourceInfo = (frm) => {
  const $section = frm.get_field('party')?.$wrapper?.closest('.form-section');
  if (!$section || !$section.length) return;

  $section.find('.gpe-source-info').remove();
  if (!gpeIsServiceOrderSettlement(frm)) return;

  const ref = (frm.doc.references || []).find((r) => r.reference_doctype === 'Sales Invoice');
  if (!ref) return;

  frappe.db.get_value('Sales Invoice', ref.reference_name, 'service_order').then(({ message }) => {
    const serviceOrder = message && message.service_order;
    if (!serviceOrder) return;

    frappe.db.get_value('Garage Service Order', serviceOrder, 'vehicle').then(({ message: gso }) => {
      $section.find('.gpe-source-info').remove();
      const plate = gso && gso.vehicle;
      const plateHtml = plate
        ? ` &middot; No. Polisi <strong>${frappe.utils.escape_html(plate)}</strong>`
        : '';
      $section.prepend(`
        <div class="gpe-source-info" style="
          background: var(--g-accent, #4f46e5); color: #fff;
          padding: 6px 12px; border-radius: var(--g-radius-sm, 8px);
          font-size: 12px; font-weight: 600; margin-bottom: 12px;
        ">
          Untuk Service Order
          <a href="/app/garage-service-order/${encodeURIComponent(serviceOrder)}" target="_blank" style="color: #fff; text-decoration: underline;">${frappe.utils.escape_html(serviceOrder)}</a>${plateHtml}
        </div>
      `);
    });
  });
};

frappe.ui.form.on('Payment Entry', {
  refresh(frm) {
    gpeApplyFieldVisibility(frm);
    gpeRenderSourceInfo(frm);
  },
  party_type: gpeApplyFieldVisibility,
  payment_type: gpeApplyFieldVisibility,
  mode_of_payment(frm) {
    if (!frm.doc.mode_of_payment && frm.doc.paid_to) frm.set_value('paid_to', '');
  },
});

// Product Bundle customizations
frappe.ui.form.on('Product Bundle', {
  before_load(frm) {
    const grid = frm.fields_dict.items?.grid;
    if (grid) grid.df.in_place_edit = 1;

    const sf = frappe.meta.get_docfield('Product Bundle', 'basic_section');
    if (sf) sf.label = 'Bundle Info';
  },
  refresh(frm) {
    const grid = frm.fields_dict.items?.grid;
    if (grid) grid.df.in_place_edit = 1;

    // Add "Bundle Info" label to top section
    const basicSection = frm.fields_dict.basic_section;
    if (basicSection && !basicSection.df.label) {
      basicSection.df.label = 'Bundle Info';
      basicSection.refresh();
    }

    // Hide About section
    frm.set_df_property('section_break_4', 'hidden', 1);
    frm.set_df_property('about', 'hidden', 1);
  },
});
