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

    // Tax column shows the resolved rate ("11%"), not the template's own
    // name - see purchase_order.js's format_item_tax_rate()/parse_item_tax_
    // rates() for the full reasoning (item_tax_rate is the hidden JSON
    // field core's own item_tax_template handler populates with the real
    // rate(s), same for Sales Order Item as Purchase Order Item).
    function parse_item_tax_rates(doc) {
        if (!doc || !doc.item_tax_rate) return [];
        try {
            const parsed = JSON.parse(doc.item_tax_rate);
            return Object.values(parsed).map((r) => flt(r));
        } catch (e) {
            return [];
        }
    }

    function format_item_tax_rate(value, df, options, doc) {
        if (!value) return '';
        const rates = parse_item_tax_rates(doc);
        if (!rates.length) return '';
        return rates.map((r) => `${flt(r, 2)}%`).join(' + ');
    }

    function apply_item_tax_rate_formatter() {
        const map = frappe.meta.docfield_map['Sales Order Item'];
        const df = map && map.item_tax_template;
        if (df) df.formatter = format_item_tax_rate;
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
        const rates = parse_item_tax_rates(item);
        const total_rate = rates.reduce((sum, r) => sum + r, 0);
        const subtotal = flt(item.amount);
        const final_amount = flt(
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
        apply_item_tax_rate_formatter();
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
            (latest_so_frm.doc.items || []).forEach((row) => {
                sync_amount_after_tax(latest_so_frm, row.doctype, row.name);
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
        },
        discount_mode(frm) {
            sync_grid_customizations(frm);
            disable_row_open(frm);
            render_totals_footer(frm);
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
