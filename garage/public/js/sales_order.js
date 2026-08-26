// Disc / Tax / Grand Total summary box under the Items grid, and the grid
// column treatment (plain item code, "Discount" toggle, tax rate instead
// of template name, Subtotal/Amount split) - all a direct port of
// purchase_order.js's own version, adapted from Supplier/Purchase Order
// Item to Customer/Sales Order Item. Deliberately leaves out the PPh 23
// withholding pieces (force_tds_editable/sync_pph23_*) - that's a BUYER's
// obligation when paying a supplier for services, not something a seller
// applies to its own sales total. See the "PPh disamakan?" conversation
// this was built alongside for the full reasoning.
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
        const total_tax = flt(frm.doc.total_taxes_and_charges);
        const grand_total = flt(frm.doc.grand_total);

        const rows = [
            summary_row('Disc', fmt(total_disc), false),
            summary_row('Tax', fmt(total_tax), false),
            summary_row('Grand Total', fmt(grand_total), true),
        ];

        let $footer = field.$wrapper.find('.so-totals-footer');
        if (!$footer.length) {
            $footer = $('<div class="so-totals-footer" style="margin-top:4px;"></div>');
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

    // See purchase_order.js's own disable_row_open() for the full
    // reasoning (add_open_form_button()/grid_row.js internals, the
    // REMOVED_BUTTON_STUB workaround for a stale Escape handler) - this is
    // that same logic, unchanged, just reading from Sales Order's own grid.
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
        if (grid.header_row && grid.header_row.configure_columns_button) {
            grid.header_row.configure_columns_button.remove();
            grid.header_row.configure_columns_button = null;
        }
    }

    function refresh_grid_if_idle(frm) {
        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid || !grid.wrapper) return;
        if (grid.wrapper.find('.data-row.editable-row').length) return;
        grid.refresh();
    }

    // Same link_formatters["Item"] override as purchase_order.js's own
    // plain_item_code() - see that file's comment for why (ERPNext's
    // sitewide "CODE: Item Name" Link formatter, turned off just for this
    // one grid column rather than globally).
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

    function plain_item_code_map_df() {
        const map = frappe.meta.docfield_map['Sales Order Item'];
        return map && map.item_code;
    }

    function apply_item_code_formatter() {
        const df = plain_item_code_map_df();
        if (df) df.formatter = plain_item_code;
    }

    // Tax now comes from the document-level Sales Taxes and Charges
    // template (see apply_ppn_category()/sync_ppn_checkboxes() below - the
    // same Include/Exclude PPN checkbox pattern as Purchase Order, ported
    // here on explicit request so Sales Order stops relying on staff
    // manually picking an Item Tax Template per row). get_effective_tax_
    // rate() mirrors purchase_order.js's own version exactly: an item's own
    // item_tax_rate override still wins if one is set, otherwise it falls
    // back to summing frm.doc.taxes' own rates. The is_tax_withholding_
    // account filter never actually matches anything on the sales side
    // (Sales Order never carries a withholding row) but is kept anyway so
    // this stays a drop-in match with the Purchase Order/Receipt version
    // instead of silently diverging if that ever changes.
    function parse_item_tax_rates(doc) {
        if (!doc || !doc.item_tax_rate) return [];
        try {
            const parsed = JSON.parse(doc.item_tax_rate);
            return Object.values(parsed).map((r) => flt(r));
        } catch (e) {
            return [];
        }
    }

    function get_effective_tax_rate(frm, item) {
        const own_rates = parse_item_tax_rates(item);
        if (own_rates.length) return own_rates.reduce((sum, r) => sum + r, 0);
        return (frm.doc.taxes || [])
            .filter((t) => !t.is_tax_withholding_account)
            .reduce((sum, t) => sum + flt(t.rate), 0);
    }

    function is_tax_inclusive(frm) {
        return (frm.doc.taxes || []).some((t) => cint(t.included_in_print_rate));
    }

    // "Amount" (amount_after_tax) = Subtotal + tax, computed client-side
    // the same way as purchase_order.js's sync_amount_after_tax() - Sales
    // Order Item has no native per-row "amount including tax" field either.
    //
    // Mutates the row doc directly + refresh_field() (static-cell re-paint
    // only, no model event) rather than frappe.model.set_value() -
    // set_value() unconditionally marks the whole form dirty, which would
    // flip an already-saved, unedited document to Not Saved the instant
    // this purely-for-display value's computed result drifts from
    // whatever was last persisted (see Purchase Order's own
    // sync_amount_after_tax() for the incident this was reported from).
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

    // "Tax" column (ppn_display) - same real, populated Data field as
    // Purchase Order/Receipt/Invoice Item, replacing item_tax_template's
    // own raw grid column (now hidden via Property Setter) as the visible
    // Tax display.
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

    // Explicit request: Description should always read in uppercase on
    // print/invoice - core's own item_code fetch (transaction.js) applies
    // description via a bare `opts.child[key] = r.message[key]` property
    // write (frm.call's own child-table path), not frappe.model.set_value(),
    // so it never fires a "description" field trigger at all (same root
    // cause already traced for item_group elsewhere in this app - see
    // purchase_order.js's own sync_pph23_flags() comment). Polling for a
    // mismatch, same idle-tick pattern as the rest of this file, is what
    // catches both that silent auto-fetch AND a manually-typed value.
    function sync_description_uppercase(frm) {
        let changed = false;
        (frm.doc.items || []).forEach((row) => {
            if (!row.description) return;
            const upper = row.description.toUpperCase();
            if (row.description !== upper) {
                row.description = upper;
                changed = true;
            }
        });
        if (changed) frm.refresh_field('items');
    }

    // "Include PPN" / "Exclude PPN" / "Non PPN" - direct port of
    // purchase_order.js's own apply_ppn_category()/sync_ppn_checkboxes(),
    // Supplier swapped for Customer. Drives tax_category (now hidden, see
    // the Property Setter created alongside these checkboxes) through the
    // same "PPN Include"/"PPN Exclude"/"PPN Non" Tax Category + Tax Rule
    // records already used on the buying side, rather than inventing a
    // second, parallel way to pick a tax template for selling. "PPN Non"
    // (2026-08-26 explicit ask) resolves to a template with zero tax rows
    // - a sale that genuinely has no PPN, distinct from leaving all three
    // boxes unticked (which still doesn't clear tax_category).
    const PPN_CATEGORY = { ppn_include: 'PPN Include', ppn_exclude: 'PPN Exclude', ppn_non: 'PPN Non' };
    const PPN_FIELDS = Object.keys(PPN_CATEGORY);

    function apply_ppn_category(frm, fieldname) {
        const category = PPN_CATEGORY[fieldname];
        const others = PPN_FIELDS.filter((f) => f !== fieldname);

        if (!cint(frm.doc[fieldname])) {
            return;
        }

        if (!frm.doc.company || !frm.doc.customer || !(frm.doc.transaction_date || frm.doc.posting_date)) {
            frappe.msgprint(__('Pilih Customer dan Company dulu sebelum pilih Include/Exclude/Non PPN.'));
            frm.doc[fieldname] = 0;
            frm.refresh_field(fieldname);
            return;
        }

        others.forEach((other) => {
            frm.doc[other] = 0;
            frm.refresh_field(other);
        });
        frm.doc.tax_category = category;
        frm.refresh_field('tax_category');
        erpnext.utils.set_taxes(frm, 'tax_category');
    }

    function sync_ppn_checkboxes(frm) {
        PPN_FIELDS.forEach((fieldname) => {
            const want = frm.doc.tax_category === PPN_CATEGORY[fieldname] ? 1 : 0;
            if (cint(frm.doc[fieldname]) !== want) {
                frm.doc[fieldname] = want;
                frm.refresh_field(fieldname);
            }
        });
    }

    // Swaps which ONE of discount_percentage/discount_amount is the
    // visible grid column, both labeled plain "Discount" - see
    // purchase_order.js's own apply_discount_mode() for the full
    // reasoning (a single grid column can't show both at once).
    const DISCOUNT_FIELDS = ['discount_percentage', 'discount_amount'];

    function apply_discount_mode(frm) {
        const map = frappe.meta.docfield_map['Sales Order Item'];
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

    function sync_grid_customizations(frm) {
        apply_item_code_formatter();
        const discount_changed = apply_discount_mode(frm);

        delete frappe.meta.docfield_copy['Sales Order Item'];

        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid) return;

        if (discount_changed || !grid._customizations_applied) {
            grid._customizations_applied = true;
            grid.reset_grid();
        }
    }

    let so_interval_bound = false;
    let latest_so_frm = null;
    let last_seen_customer;

    function watch_so_form(frm) {
        latest_so_frm = frm;
        if (so_interval_bound) return;
        so_interval_bound = true;
        setInterval(() => {
            if (!latest_so_frm) return;
            // disable_row_open() also needs to run AFTER refresh_grid_if_idle()
            // here, not just before it - grid.refresh() (called inside
            // refresh_grid_if_idle whenever no row is actively being edited)
            // rebuilds the grid's header row from scratch, which re-adds the
            // "Configure Columns" gear button disable_row_open() just removed
            // a moment earlier in this exact same tick. Calling it a second
            // time, after that rebuild, is what actually makes the removal
            // stick instead of the button reappearing on every idle tick.
            disable_row_open(latest_so_frm);
            refresh_grid_if_idle(latest_so_frm);
            disable_row_open(latest_so_frm);
            lock_customer_number(latest_so_frm);
            render_totals_footer(latest_so_frm);
            sync_ppn_checkboxes(latest_so_frm);
            sync_description_uppercase(latest_so_frm);
            (latest_so_frm.doc.items || []).forEach((row) => {
                sync_amount_after_tax(latest_so_frm, row.doctype, row.name);
                sync_ppn_display(latest_so_frm, row.doctype, row.name);
            });
            // Polling frm.doc.customer directly, instead of relying only on
            // the customer(frm) trigger below, is what actually makes the
            // No. Polisi auto-fill feel instant - frappe.ui.form.on triggers
            // for the same event name run SERIALLY (script_manager.js's
            // trigger() -> frappe.run_serially()), and ERPNext core's own
            // customer(frm) handler (a full get_party_details round trip:
            // price list, address, tax templates, currency, ...) is
            // registered before this app's own (erpnext loads before garage
            // per apps.txt), so this file's customer(frm) handler used to
            // sit queued behind that entire round trip before it even
            // started - a very noticeable delay, reported directly by the
            // user. frm.doc.customer itself updates in memory the moment a
            // value is picked, well before that serial trigger chain even
            // begins, so catching the change here (next 400ms tick, same
            // polling idea already used for lock_customer_number/render_
            // totals_footer/sync_amount_after_tax above) reacts far sooner
            // than waiting for the queue to clear.
            if (latest_so_frm.doc.customer !== last_seen_customer) {
                last_seen_customer = latest_so_frm.doc.customer;
                sync_vehicle_from_customer(latest_so_frm);
            }
        }, 400);
    }

    function close_row(frm, cdn) {
        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        const gridRow = grid && grid.grid_rows_by_docname && grid.grid_rows_by_docname[cdn];
        if (gridRow) gridRow.toggle_editable_row(false);
    }

    function on_item_row_change(frm, cdt, cdn) {
        sync_amount_after_tax(frm, cdt, cdn);
        sync_ppn_display(frm, cdt, cdn);
        frm.refresh_field('items');
        close_row(frm, cdn);
        render_totals_footer(frm);
    }

    // Recomputes discount_amount/discount_percentage/rate from
    // price_list_rate + whichever discount field the user just edited,
    // then writes the result into the native `rate` field so ERPNext's own
    // calculate_item_values() (amount = rate * qty) carries the discount
    // through into Amount/taxes/Grand Total - see purchase_order.js's own
    // sync_discount_and_rate() for the full reasoning.
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

    // Explicit user request: Customer Number should look/behave read-only
    // (no typing into it) but stay visible even before a Customer is
    // picked. The DocField's own `read_only` property can't do this by
    // itself - Frappe hides any read-only field that's empty (frappe/
    // public/js/frappe/form/controls/base_control.js get_status(): a
    // read-only field with a null value gets status "None", i.e. hidden -
    // see the earlier "field kosong makanya ilang" fix this session,
    // which is why this field's own Custom Field is NOT read_only=1).
    // Locking the actual <input> element directly here instead sidesteps
    // that Frappe-level hide-when-empty check entirely: the DocField
    // stays editable as far as Frappe's own visibility logic is
    // concerned (so it's always rendered), while the real DOM input is
    // genuinely un-typable.
    function lock_customer_number(frm) {
        const control = frm.fields_dict.customer_number;
        if (!control || !control.$input) return;
        control.$input.prop('readOnly', true);
    }

    // No. Polisi's own picker only ever offers vehicles that actually
    // belong to the selected Customer, once one is picked - explicit user
    // request ("lw filter yah") alongside the Customer -> No. Polisi
    // auto-fill below, so staff can't accidentally attach a Sales Order to
    // someone else's vehicle. Registered on every refresh/onload (not just
    // inside customer(frm)) so the filter is already correct on a freshly
    // loaded document, not only after Customer gets changed once.
    function apply_vehicle_query(frm) {
        frm.set_query('vehicle', () => ({
            filters: frm.doc.customer ? { customer: frm.doc.customer } : {},
        }));
    }

    // Explicit user request: picking Customer should auto-fill No. Polisi
    // from that customer's own registered vehicle, same as picking No.
    // Polisi already fills Customer (see the vehicle(frm) trigger below).
    // Only auto-fills when the match is unambiguous (exactly one Garage
    // Vehicle registered to this customer) and No. Polisi isn't already
    // set - a customer with 2+ vehicles is left blank rather than guessing
    // which car this order is actually for; apply_vehicle_query()'s filter
    // still narrows the picker down to just this customer's own vehicles
    // either way, so manually finishing the pick is never more than a
    // couple of clicks. Called from both the customer(frm) trigger AND
    // watch_so_form()'s polling loop - see that loop's own comment for why
    // the polling path is what actually makes this feel instant.
    function sync_vehicle_from_customer(frm) {
        apply_vehicle_query(frm);
        if (!frm.doc.customer || frm.doc.vehicle) return;
        frappe.db.get_list('Garage Vehicle', {
            filters: { customer: frm.doc.customer },
            fields: ['name'],
            limit: 2,
        }).then((rows) => {
            if (rows.length === 1 && frm.doc.customer && !frm.doc.vehicle) {
                frm.set_value('vehicle', rows[0].name);
            }
        });
    }

    frappe.ui.form.on('Sales Order', {
        before_load(frm) {
            const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
            if (grid) grid.df.in_place_edit = 1;
        },
        onload(frm) {
            sync_grid_customizations(frm);
            apply_vehicle_query(frm);
        },
        refresh(frm) {
            disable_row_open(frm);
            sync_grid_customizations(frm);
            watch_so_form(frm);
            lock_customer_number(frm);
            apply_vehicle_query(frm);
            sync_ppn_checkboxes(frm);
        },
        discount_mode(frm) {
            sync_grid_customizations(frm);
            disable_row_open(frm);
            render_totals_footer(frm);
        },
        ppn_include(frm) {
            apply_ppn_category(frm, 'ppn_include');
        },
        ppn_exclude(frm) {
            apply_ppn_category(frm, 'ppn_exclude');
        },
        ppn_non(frm) {
            apply_ppn_category(frm, 'ppn_non');
        },
        // Explicit user request: picking No. Polisi should auto-fill
        // Customer from that vehicle's own registered owner (Garage
        // Vehicle's own "customer" field) - not a data-fetch failure,
        // this connection was just never built when the vehicle field
        // itself was added. Customer Number then fills in on its own
        // right after, via its existing fetch_from (customer.
        // customer_number) once Customer itself is set.
        vehicle(frm) {
            if (!frm.doc.vehicle) return;
            frappe.db.get_value('Garage Vehicle', frm.doc.vehicle, 'customer').then((r) => {
                const owner = r.message && r.message.customer;
                if (owner) {
                    frm.set_value('customer', owner);
                }
            });
        },
        // See sync_vehicle_from_customer()'s own comment above - this
        // trigger is a correctness fallback (e.g. a programmatic set_value
        // from a server script), the polling loop in watch_so_form() is
        // what actually fires first in the normal picked-from-the-dropdown
        // case.
        customer(frm) {
            last_seen_customer = frm.doc.customer;
            sync_vehicle_from_customer(frm);
        },
        items_remove(frm) {
            render_totals_footer(frm);
        },
        // Explicit user request: submitting a Sales Order should
        // immediately show the customer-facing document (Sales Order
        // Print, the default print format set via property setter), not
        // leave staff to find the Print button themselves. frm.print_doc()
        // is the same print preview the toolbar's own Print button opens -
        // this just triggers it automatically once submit succeeds.
        on_submit(frm) {
            frm.print_doc();
        },
    });

    frappe.ui.form.on('Sales Order Item', {
        item_code: on_item_row_change,
        qty: on_item_row_change,
        price_list_rate: sync_discount_and_rate,
        discount_amount: sync_discount_and_rate,
        discount_percentage: sync_discount_and_rate,
        item_tax_template: on_item_row_change,
        uom: on_item_row_change,
    });
})();
