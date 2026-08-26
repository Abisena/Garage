// Hides the Items grid's "Add Row"/"Add Multiple" buttons - Purchase
// Invoice items should only ever come from the Purchase Receipt they were
// billed against (via "Get Items From"), not typed in ad hoc at billing
// time. Same reasoning and mechanism already used on Purchase Receipt
// (purchase_receipt.js) - Download/Upload is a real DocField property,
// allow_bulk_edit, turned off via a plain Property Setter instead, since
// grid.js's own add_row()/refresh_toolbar() only ever check a runtime
// cannot_add_rows flag on the grid/its docfield for these two buttons
// specifically, so there's nothing to configure for them and this is the
// smallest way to reach it.
// Disc / Tax / Grand Total summary box under the Items grid - same visual
// pattern and reasoning as Purchase Order's own version (purchase_order.js
// render_totals_footer()): the native Total/Taxes and Charges/Grand Total
// section is hidden (Purchase Invoice-section_break_26/totals/section_
// break_49-hidden, see hooks.py) since this app's own single-currency,
// no-manual-tax-template reality makes ERPNext's default layout for it
// mostly redundant boilerplate - this reads the same already-computed
// doctype fields (taxes_and_charges_added/deducted, grand_total) instead
// of hiding that information entirely. Unlike Purchase Order's own
// version, there's no separate PPh 23 preview call to make here - a
// Purchase Invoice's own "taxes" table (including any withholding row)
// normally arrives already computed, copied over by "Get Items From" from
// the Purchase Order/Receipt it bills against, so this only ever reads
// frm.doc, never recomputes anything itself.
(() => {
    function fmt(v) {
        return frappe.format(flt(v, 2), { fieldtype: 'Currency' }, { doc: cur_frm && cur_frm.doc });
    }

    function summary_row(label, value, is_grand) {
        return `
            <div style="display:flex; background:${is_grand ? 'var(--g-accent, #4f46e5)' : '#2c3e50'}; border-bottom:1px solid rgba(255,255,255,0.1);">
              <div style="flex:1; padding:8px 10px; text-align:left; font-weight:${is_grand ? '700' : '600'}; white-space:nowrap; color:#fff;">${label}</div>
              <div style="flex:3; padding:8px 10px; text-align:right; font-weight:${is_grand ? '700' : '600'}; color:#fff;">${value}</div>
            </div>`;
    }

    function render_totals_footer(frm) {
        const field = frm.fields_dict.items;
        if (!field) return;

        const total_disc = (frm.doc.items || []).reduce(
            (sum, row) => sum + flt(row.discount_amount) * flt(row.qty),
            0
        );
        const total_tax = flt(frm.doc.taxes_and_charges_added);
        const pph_amount = flt(frm.doc.taxes_and_charges_deducted);
        const grand_total = flt(frm.doc.grand_total);

        const rows = [summary_row('Disc', fmt(total_disc), false), summary_row('Tax', fmt(total_tax), false)];

        // Mirrors Purchase Order's own label logic exactly (see
        // purchase_order.js render_totals_footer()) so a withholding row
        // carried over from the source PO reads identically here.
        if (pph_amount) {
            const pph_row = (frm.doc.taxes || []).find((t) => t.is_tax_withholding_account);
            const label = pph_row
                ? `${frm.doc.tax_withholding_category || 'PPh'} (${flt(pph_row.rate, 2)}%)`
                : frm.doc.tax_withholding_category || 'PPh';
            rows.push(summary_row(label, fmt(pph_amount), false));
        }

        rows.push(summary_row('Grand Total', fmt(grand_total), true));

        let $footer = field.$wrapper.find('.pi-totals-footer');
        if (!$footer.length) {
            $footer = $('<div class="pi-totals-footer" style="margin-top:4px;"></div>');
            field.$wrapper.append($footer);
        }

        $footer.html(`
            <div style="display:flex; justify-content:flex-end; margin-top:0;">
              <div style="width:300px; overflow:hidden;">
                ${rows.join('')}
              </div>
            </div>
        `);
    }

    function disable_add_row(frm) {
        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid) return;
        grid.cannot_add_rows = true;
        grid.refresh();
    }

    // Hides the row-edit pencil (.btn-open-row) that opens the full-row
    // dialog - same mechanism and reasoning as Purchase Order's own
    // disable_row_open() (purchase_order.js): grid_row.js only ever adds
    // that button when grid.df.in_place_edit is falsy, so setting the
    // flag is the real fix, not a CSS rule - and a dummy stand-in (not
    // null) once a real button gets removed, since add_open_form_button()
    // also binds a permanent $(document) "escape" handler the first time
    // it ever builds a button, with no matching .off() this file can
    // reach to unregister it; nulling the button out crashes that handler
    // the next time Escape fires, so a no-op stand-in keeps it harmless
    // instead.
    const REMOVED_BUTTON_STUB = { parent: () => ({ focus() {} }) };

    function disable_row_open(frm) {
        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid) return;
        grid.df.in_place_edit = 1;
        (grid.grid_rows || []).forEach((row) => {
            if (row.open_form_button && row.open_form_button !== REMOVED_BUTTON_STUB) {
                row.open_form_button.parent('.col').remove();
                row.open_form_button = REMOVED_BUTTON_STUB;
            }
            if (row.configure_columns_button) {
                row.configure_columns_button.remove();
                row.configure_columns_button = null;
            }
        });
        // The "Configure Columns" gear button is a SEPARATE thing from
        // the per-row edit pencil above - grid_row.js's own add_column_
        // configure_button() appends it once, to the HEADER row specifically
        // (grid.header_row, not part of grid.grid_rows) - left alone, it
        // reserves a real, visible chunk of width at the end of the row
        // (confirmed via a live render: ~130px of blank dark header space
        // after "Amount") since nothing else in this file ever reaches
        // grid.header_row to clean it up the same way. Same removal
        // mechanics as the per-row buttons above.
        if (grid.header_row && grid.header_row.configure_columns_button) {
            grid.header_row.configure_columns_button.remove();
            grid.header_row.configure_columns_button = null;
        }
    }

    // Items grid column parity with Purchase Order (purchase_order.js) -
    // same formatters, same Discount Mode toggle, same computed "Amount"
    // column, so the two doctypes' items tables read identically instead
    // of Purchase Invoice Item falling back to ERPNext's own bare default
    // columns (Item, Accepted Qty, Rate, Amount). See purchase_order.js's
    // own long comments on each of these for the full reasoning - repeated
    // here only where the Purchase Invoice version actually differs.
    function plain_item_code(value) {
        if (!value) return '';
        const doctype = 'Item';
        let link_title = frappe.utils.get_link_title(doctype, value);
        if (link_title === value) link_title = null;
        if (!frappe.model.can_read(doctype)) return link_title || value;
        const a = document.createElement('a');
        a.href = `/app/${encodeURIComponent(frappe.router.slug(doctype))}/${encodeURIComponent(value)}`;
        a.dataset.doctype = doctype;
        a.dataset.name = value;
        a.dataset.value = value;
        a.innerText = __(link_title || value);
        return a.outerHTML;
    }

    function apply_item_code_formatter() {
        const map = frappe.meta.docfield_map['Purchase Invoice Item'];
        const df = map && map.item_code;
        if (df) df.formatter = plain_item_code;
    }

    function parse_item_tax_rates(doc) {
        if (!doc || !doc.item_tax_rate) return [];
        try {
            const parsed = JSON.parse(doc.item_tax_rate);
            return Object.values(parsed).map((r) => flt(r));
        } catch (e) {
            return [];
        }
    }

    // Whether the document's own Purchase Taxes and Charges Template
    // treats its rate as already-included-in-the-price ("Is this Tax
    // included in Basic Rate?", included_in_print_rate on each tax row) -
    // a document-wide setting, not per item, mirroring Purchase Order's
    // own is_tax_inclusive() exactly.
    function is_tax_inclusive(frm) {
        return (frm.doc.taxes || []).some((t) => cint(t.included_in_print_rate));
    }

    // "Include PPN" / "Exclude PPN" / "Non PPN" - explicit ask (2026-08-10,
    // extended 2026-08-26 for the third box): Include/Exclude/Non is a
    // Purchase Order-only decision. Purchase Invoice just MIRRORS whichever
    // Purchase Taxes and Charges Template the source PO already picked,
    // read-only, so the same physical purchase can never end up tax-
    // inconsistent partway through its own PO -> PR -> PI chain. A
    // standalone Purchase Invoice with no PO reference on any item row has
    // nothing to mirror - all three boxes stay locked AND unchecked rather
    // than falling back to the old Supplier-driven Tax Rule auto-detect
    // this file used to do, which is the intended nudge back towards
    // "start from a Purchase Order" for anything tax-bearing (Purchase
    // Order itself is still fully editable - see its own
    // apply_ppn_category()).
    const PPN_CATEGORY = { ppn_include: 'PPN Include', ppn_exclude: 'PPN Exclude', ppn_non: 'PPN Non' };
    const PPN_FIELDS = Object.keys(PPN_CATEGORY);

    function lock_ppn_fields(frm) {
        PPN_FIELDS.forEach((fieldname) => frm.set_df_property(fieldname, 'read_only', 1));
    }

    let ppn_synced_from_po = null;

    function sync_ppn_from_source_po(frm) {
        const source_po = (frm.doc.items || []).map((row) => row.purchase_order).find(Boolean);

        if (!source_po) {
            ppn_synced_from_po = null;
            if (frm.doc.tax_category || frm.doc.taxes_and_charges) {
                frm.doc.tax_category = '';
                frm.refresh_field('tax_category');
                frm.set_value('taxes_and_charges', '');
            }
            return;
        }

        if (source_po === ppn_synced_from_po) return;
        ppn_synced_from_po = source_po;

        frappe.db.get_value('Purchase Order', source_po, ['tax_category', 'taxes_and_charges']).then(({ message }) => {
            if (!message || !message.taxes_and_charges) return;
            if (message.taxes_and_charges === frm.doc.taxes_and_charges) return;
            frm.doc.tax_category = message.tax_category;
            frm.refresh_field('tax_category');
            frm.set_value('taxes_and_charges', message.taxes_and_charges);
        });
    }

    // Keeps the three boxes reflecting whatever tax_category sync_ppn_
    // from_source_po() (or, on a fresh "Get Items From" mapping, core's
    // own field copy) landed - polled the same "no discrete event to
    // hook" way this file's own item_tax_rate handling already is.
    function sync_ppn_checkboxes(frm) {
        PPN_FIELDS.forEach((fieldname) => {
            const want = frm.doc.tax_category === PPN_CATEGORY[fieldname] ? 1 : 0;
            if (cint(frm.doc[fieldname]) !== want) {
                frm.doc[fieldname] = want;
                frm.refresh_field(fieldname);
            }
        });
    }

    // "Amount" (custom field amount_after_tax) = Subtotal + tax, mirroring
    // Purchase Order Item's own field of the same name exactly (same
    // fieldname, same computation) - Purchase Invoice Item has no native
    // per-row "amount including tax" field either. When the document's
    // template is tax-inclusive, the typed rate already contains the tax,
    // so nothing is added - must match the Grand Total ERPNext's own
    // engine computes, or this column contradicts it.
    // item.item_tax_rate (what parse_item_tax_rates() reads) ONLY ever
    // gets populated by erpnext core when the ITEM ITSELF has its own
    // Item Tax Template assigned - get_item_tax_info() (erpnext/stock/
    // get_item_details.py) explicitly `continue`s past any item with no
    // item_tax_template of its own, never backfilling it from the
    // document's own default rate. Most items here have no such
    // override, so parse_item_tax_rates() alone silently returns []
    // (0% - not "unknown") for the common case - falling back to the
    // document's own Purchase Taxes and Charges rows (the rate that
    // actually applies whenever no per-item override exists) is what
    // keeps this column truthful for a plain, no-override item instead
    // of quietly showing "no tax added" while Grand Total disagrees.
    function get_effective_tax_rate(frm, item) {
        const own_rates = parse_item_tax_rates(item);
        if (own_rates.length) return own_rates.reduce((sum, r) => sum + r, 0);
        return (frm.doc.taxes || []).reduce((sum, t) => sum + flt(t.rate), 0);
    }

    // Mutates the row doc directly + refresh_field() (static-cell re-paint
    // only, no model event) rather than frappe.model.set_value() - see
    // Purchase Order's own sync_amount_after_tax() for the full reasoning
    // (set_value() unconditionally marks the form dirty, which flipped an
    // already-saved, unedited document to Not Saved the moment today's
    // PPN Tax Rule fix changed what this purely-for-display value
    // computes to).
    function sync_amount_after_tax(frm, cdt, cdn) {
        const item = locals[cdt][cdn];
        const total_rate = get_effective_tax_rate(frm, item);
        const subtotal = flt(item.amount);
        const final_amount = is_tax_inclusive(frm)
            ? subtotal
            : flt(
                subtotal + (subtotal * total_rate) / 100,
                precision('amount_after_tax', item)
            );
        if (flt(item.amount_after_tax) !== final_amount) {
            item.amount_after_tax = final_amount;
            const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
            const gridRow = grid && grid.grid_rows_by_docname && grid.grid_rows_by_docname[cdn];
            if (gridRow) gridRow.refresh_field('amount_after_tax');
        }
    }

    // "Tax" column - a genuinely populated, read-only Data field (custom
    // field ppn_display), not a formatter layered on top of the empty
    // item_tax_template Link (same fix as Purchase Order's own
    // purchase_order.js - see its own comment for the full reasoning on
    // why a formatter-only display flickered blank on click).
    //
    // Mutates the row doc directly + refresh_field() (static-cell re-paint
    // only, no model event) rather than frappe.model.set_value() -
    // set_value() unconditionally marks the whole form dirty, so opening
    // ANY already-saved document from before this field existed
    // (ppn_display starts out unset) flipped it to Not Saved on the very
    // first poll tick with zero actual user edits - reported directly by
    // the user. This value is fully re-derivable from rate/tax_category
    // every time, so it never needs to be a real, persisted edit.
    function sync_ppn_display(frm, cdt, cdn) {
        const item = locals[cdt][cdn];
        const rate = get_effective_tax_rate(frm, item);
        const text = rate ? `${flt(rate, 2)}% ${is_tax_inclusive(frm) ? 'Inc' : 'Exc'}` : '';
        if ((item.ppn_display || '') !== text) {
            item.ppn_display = text;
            const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
            const gridRow = grid && grid.grid_rows_by_docname && grid.grid_rows_by_docname[cdn];
            if (gridRow) gridRow.refresh_field('ppn_display');
        }
    }

    // Discount Mode (custom field, mirrors Purchase Order's own toggle) -
    // swaps which one of discount_percentage/discount_amount is the
    // visible grid column, both labeled plain "Discount".
    const DISCOUNT_FIELDS = ['discount_percentage', 'discount_amount'];

    function apply_discount_mode(frm) {
        const map = frappe.meta.docfield_map['Purchase Invoice Item'];
        if (!map) return false;

        const mode = frm.doc.discount_mode || 'Percentage';
        const visible_fieldname = mode === 'Percentage' ? 'discount_percentage' : 'discount_amount';

        let changed = false;
        DISCOUNT_FIELDS.forEach((fieldname) => {
            const df = map[fieldname];
            if (!df) return;
            const should_show = fieldname === visible_fieldname ? 1 : 0;
            if (df.in_list_view !== should_show) changed = true;
            df.in_list_view = should_show;
            df.label = 'Discount';
        });
        return changed;
    }

    // Metadata mutations run unconditionally (not gated on the grid
    // existing) so they apply from onload, before the grid's very FIRST
    // paint - see purchase_order.js's own sync_grid_customizations() for
    // the full explanation of why gating this on the grid used to cause a
    // visible flash of the raw, un-patched column state.
    function sync_grid_customizations(frm) {
        apply_item_code_formatter();
        const discount_changed = apply_discount_mode(frm);

        delete frappe.meta.docfield_copy['Purchase Invoice Item'];

        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid) return;

        if (discount_changed || !grid._customizations_applied) {
            grid._customizations_applied = true;
            grid.reset_grid();
        }
    }

    function on_item_row_change(frm, cdt, cdn) {
        sync_amount_after_tax(frm, cdt, cdn);
        frm.refresh_field('items');
        render_totals_footer(frm);
    }

    // Same discount-mode-aware rate recompute as Purchase Order's own
    // sync_discount_and_rate() - "Subtotal" (native `rate` field) becomes
    // price_list_rate minus the discount so it flows into Amount/taxes/
    // Grand Total via ERPNext's own already-correct engine.
    function sync_discount_and_rate(frm, cdt, cdn) {
        const item = locals[cdt][cdn];
        const mode = frm.doc.discount_mode || 'Percentage';
        const price_list_rate = flt(item.price_list_rate);

        let discount_amount = flt(item.discount_amount);
        let discount_percentage = flt(item.discount_percentage);
        if (mode === 'Percentage') {
            discount_amount = flt(
                (price_list_rate * discount_percentage) / 100,
                precision('discount_amount', item)
            );
        } else {
            discount_percentage = price_list_rate
                ? flt((100 * discount_amount) / price_list_rate, precision('discount_percentage', item))
                : 0;
        }
        const new_rate = flt(price_list_rate - discount_amount, precision('rate', item));

        frappe.model.set_value(cdt, cdn, {
            discount_amount: discount_amount,
            discount_percentage: discount_percentage,
            rate: new_rate,
        }).then(() => {
            if (frm.cscript && typeof frm.cscript.calculate_taxes_and_totals === 'function') {
                frm.cscript.calculate_taxes_and_totals();
            }
            on_item_row_change(frm, cdt, cdn);
        });
    }

    // erpnext's own calculate_taxes_and_totals() is async (see the longer
    // explanation in purchase_order.js's own watch_po_form()) - polling
    // and re-rendering from whatever frm.doc currently holds, instead of
    // trusting any single field-change event to have already-fresh totals
    // by the time it fires, is the same proven fix used there and on the
    // Bank Reconciliation Tool's main table for the same class of problem.
    let pi_interval_bound = false;
    let latest_pi_frm = null;

    function watch_pi_form(frm) {
        latest_pi_frm = frm;
        if (pi_interval_bound) return;
        pi_interval_bound = true;
        setInterval(() => {
            if (!latest_pi_frm) return;
            disable_row_open(latest_pi_frm);
            render_totals_footer(latest_pi_frm);
            sync_ppn_from_source_po(latest_pi_frm);
            sync_ppn_checkboxes(latest_pi_frm);
            // item_tax_rate populates asynchronously (get_item_tax_map
            // round trip) with no discrete event of its own to hook - see
            // purchase_order.js's own watch_po_form() for the same
            // reasoning - re-scanning every row here is what catches it
            // landing after item_code/item_tax_template selection.
            (latest_pi_frm.doc.items || []).forEach((row) => {
                sync_amount_after_tax(latest_pi_frm, row.doctype, row.name);
                sync_ppn_display(latest_pi_frm, row.doctype, row.name);
            });
        }, 400);
    }

    // ERPNext core's own BuyingController (erpnext/public/js/controllers/
    // buying.js refresh()) hides "Supplier Name" whenever it's identical to
    // "Supplier" itself - true for every supplier in this system today,
    // since Supplier's own naming here uses the supplier's name directly as
    // its ID (name === supplier_name) - but core only ever applies that
    // check in ITS OWN refresh(), which runs after the form's first paint,
    // so the redundant field flashes visible for a moment before core's
    // own logic hides it again. Replicating the exact same condition here,
    // in onload (before that first paint), is what actually prevents the
    // flash rather than just reacting to it a moment later - core's own
    // refresh() still runs afterward and finds nothing left to change.
    function sync_supplier_name_visibility(frm) {
        const shown = frm.doc.supplier_name && frm.doc.supplier_name !== frm.doc.supplier;
        frm.set_df_property('supplier_name', 'hidden', shown ? 0 : 1);
    }

    frappe.ui.form.on('Purchase Invoice', {
        before_load(frm) {
            const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
            if (grid) grid.df.in_place_edit = 1;
        },
        // onload fires after frm.doc is populated but before the grid's
        // DOM is first built (see purchase_order.js's own onload handler
        // for the full form.js lifecycle explanation) - patching the
        // formatters/discount mode here, instead of waiting for refresh()
        // to do it after that first paint already happened, stops the raw
        // un-patched column state from ever being visible in the first
        // place.
        onload(frm) {
            sync_grid_customizations(frm);
            sync_supplier_name_visibility(frm);
        },
        refresh(frm) {
            disable_add_row(frm);
            disable_row_open(frm);
            sync_grid_customizations(frm);
            render_totals_footer(frm);
            watch_pi_form(frm);
            lock_ppn_fields(frm);
            sync_ppn_from_source_po(frm);
            sync_ppn_checkboxes(frm);
        },
        discount_mode(frm) {
            sync_grid_customizations(frm);
            render_totals_footer(frm);
        },
        items_remove(frm) {
            render_totals_footer(frm);
        },
        // Same flow as Purchase Order/Purchase Receipt (purchase_order.js/
        // purchase_receipt.js's own on_submit) - frm.print_doc() is exactly
        // what the "Full Page" toolbar button already does (form.js's own
        // print_doc() - frappe.set_route("print", doctype, docname)),
        // reused here so staff land on the Purchase Invoice Print view the
        // moment Submit succeeds instead of having to find and click the
        // print icon themselves as a separate step.
        on_submit(frm) {
            frm.print_doc();
        },
    });

    frappe.ui.form.on('Purchase Invoice Item', {
        qty: on_item_row_change,
        price_list_rate: sync_discount_and_rate,
        discount_amount: sync_discount_and_rate,
        discount_percentage: sync_discount_and_rate,
        item_tax_template: on_item_row_change,
    });
})();
