// Disc / Tax / Grand Total summary box under the Items grid, matching the
// visual pattern already used on Garage Service Order's Required Parts
// table (garage_service_order.js renderTableFooter()) - same dark rows,
// same highlighted final row. Unlike that doctype's own custom qty/rate/
// discount%/tax% child table, Purchase Order already has ERPNext's own
// tax/discount engine (erpnext's taxes_and_totals.js) computing accurate
// total_taxes_and_charges/grand_total on every relevant field change -
// this reads those already-computed values rather than re-deriving tax
// math client-side, only "Disc" (sum of each line's own discount_amount x
// qty - Purchase Order Item's discount_amount is a per-unit figure, not a
// row total) has no ready-made aggregate field, so that one's summed here.
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
        // taxes_and_charges_added/deducted (native ERPNext fields, kept
        // hidden from the form itself - Purchase Order-taxes_and_charges_
        // added/deducted-hidden - since this footer is meant to fully
        // replace that default display) split what total_taxes_and_charges
        // blends into one net figure back into its added (VAT) vs deducted
        // (PPh 23 withholding) parts, so a mixed goods+services PO doesn't
        // show a single confusing net "Tax" number.
        const total_tax = flt(frm.doc.taxes_and_charges_added);
        const pph_amount = flt(frm.doc.taxes_and_charges_deducted);
        const grand_total = flt(frm.doc.grand_total);

        const rows = [summary_row('Disc', fmt(total_disc), false), summary_row('Tax', fmt(total_tax), false)];

        // The withholding row itself (see purchase_order_tax_withholding.py
        // _build_tax_row()) carries its own rate for exactly this - reading
        // it straight from frm.doc.taxes means the label can never disagree
        // with the amount actually being shown right next to it.
        if (pph_amount) {
            const pph_row = (frm.doc.taxes || []).find((t) => t.is_tax_withholding_account);
            const label = pph_row
                ? `${frm.doc.tax_withholding_category || 'PPh'} (${flt(pph_row.rate, 2)}%)`
                : frm.doc.tax_withholding_category || 'PPh';
            rows.push(summary_row(label, fmt(pph_amount), false));
        }

        rows.push(summary_row('Grand Total', fmt(grand_total), true));

        let $footer = field.$wrapper.find('.po-totals-footer');
        if (!$footer.length) {
            $footer = $('<div class="po-totals-footer" style="margin-top:4px;"></div>');
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

    // Hides the row-edit pencil (.btn-open-row) that opens the full-row
    // dialog - grid_row.js only ever adds that button when grid.df.
    // in_place_edit is falsy (add_open_form_button()), so setting the flag
    // is the real mechanism, not a CSS rule. Same idea already used for
    // Garage Service Order's own Required Parts grid and for Product
    // Bundle - but Product Bundle's own version (product_bundle.js) needed
    // more than the flag alone: it also sets it in before_load (before the
    // grid's rows first construct, not just on every refresh) and directly
    // removes any already-rendered buttons as a backup, since a row whose
    // make() already ran once won't retroactively lose a button it already
    // appended just because the flag changed afterward. Purchase Order's
    // own grid rows are already fully built by the time this doctype's
    // refresh handlers run (a plain refresh-only flag left the pencil
    // showing here, unlike on Service Order), so this follows Product
    // Bundle's fuller version rather than Service Order's flag-only one.
    // A dummy stand-in, not null, once a real button gets removed below -
    // add_open_form_button() (grid_row.js) also binds a PERMANENT $(document)
    // "escape" handler the first time it ever builds a button
    // (`me.open_form_button.parent().focus()`), and that handler has no
    // matching .off() this file can reach to unregister it. On a brand new
    // Purchase Order, before_load fires before frm.fields_dict.items even
    // exists (so setting in_place_edit that early is a no-op there), which
    // leaves a window where the child table's very first auto-created row
    // builds its button - and that stale handler - before refresh()'s own
    // cleanup ever runs. Nulling the button out then made every later
    // Escape press crash ("Cannot read properties of null (reading
    // 'parent')") once that handler eventually fired. A no-op stand-in
    // keeps `.parent().focus()` harmless without needing to hunt down and
    // unbind an anonymous closure this file doesn't have a reference to.
    const REMOVED_BUTTON_STUB = { parent: () => ({ focus() {} }) };

    function disable_row_open(frm) {
        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid) return;
        grid.df.in_place_edit = 1;
        (grid.grid_rows || []).forEach((row) => {
            // Only a REAL jQuery button (still has .remove()) gets torn
            // down here - this runs on every refresh, so without this
            // check the stub from a PREVIOUS pass would reach .remove()
            // on the very next call and crash the same way the raw null
            // used to (the stub's own .parent() return value has no
            // .remove method either, on purpose - nothing here is meant
            // to be re-removed twice).
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
        // configure_button() appends it once, to the HEADER row
        // specifically (grid.header_row, not part of grid.grid_rows), so
        // the per-row cleanup above never reaches it. Whether it ends up
        // taking real visible width at the end of the header row or
        // collapsing to 0 turns out to depend on exactly when in_place_edit
        // got set relative to when the header was first built - a timing
        // accident, not something guaranteed - so this reaches it
        // directly instead of relying on that turning out favorably.
        if (grid.header_row && grid.header_row.configure_columns_button) {
            grid.header_row.configure_columns_button.remove();
            grid.header_row.configure_columns_button = null;
        }
    }

    // ERPNext core's own Purchase Order controller (buying/doctype/
    // purchase_order/purchase_order.js) locks "Apply Tax Withholding
    // Amount" read-only - and hides "Tax Withholding Category" entirely -
    // the moment a Supplier is selected, UNLESS that specific Supplier
    // already has its own default Tax Withholding Category configured
    // (onload: `if (!frm.doc.__onload.supplier_tds) frm.set_df_property
    // ("apply_tds", "read_only", 1)`; supplier(frm): same check again via
    // an async get_party_details() call). That's built for shops where
    // withholding is a fixed, supplier-level default - not this app's own
    // reality, where whether PPh 23 applies depends on whether THIS
    // particular purchase has a service line (subject_to_pph23), which
    // varies transaction to transaction regardless of which supplier it
    // is. Left alone, staff who pick a supplier with no configured
    // default (the common case here) find the checkbox locked - and if
    // they only notice after already entering items, core's own onload-
    // only unlock means there's no way back short of starting over.
    // Since core's own unlock check is itself async (a server round trip
    // inside supplier(frm)), just calling this once from this file's own
    // refresh() could still lose the race and get overwritten a moment
    // later - reusing the same polling loop as the rest of this file's
    // "some other async process might change this" cases makes it self-
    // correcting regardless of timing.
    function force_tds_editable(frm) {
        const apply_tds_field = frm.fields_dict.apply_tds;
        if (apply_tds_field && apply_tds_field.df.read_only) {
            frm.set_df_property('apply_tds', 'read_only', 0);
        }
        // tax_withholding_category's own depends_on ("eval: doc.apply_tds")
        // is what SHOULD hide it whenever the checkbox is off - that's
        // correct and must be left alone. The only thing this function is
        // meant to override is core's separate onload/supplier(frm) check,
        // which force-hides it even while apply_tds IS checked, for
        // suppliers with no configured TDS default (see comment above).
        // Without this guard, unhiding unconditionally fought the field's
        // own depends_on the moment it correctly hid the field because
        // apply_tds was unchecked (e.g. a brand new PO, or any supplier
        // with no TDS default) - showing it briefly on this function's own
        // next poll tick before Frappe's real dependency check re-hid it a
        // moment later, an unwanted flash-then-disappear.
        if (!frm.doc.apply_tds) return;
        const category_field = frm.fields_dict.tax_withholding_category;
        if (category_field && category_field.df.hidden) {
            frm.set_df_property('tax_withholding_category', 'hidden', 0);
        }
    }

    // toggle_editable_row(false) (grid_row.js) - what runs when a row
    // stops being the active/edited one - only re-formats each column's
    // static-area text `if (!this.frm)`: the branch that actually calls
    // this.refresh_field() is written for grids OUTSIDE a form (web
    // forms/standalone), skipped entirely for a normal form-bound grid
    // like this one. Net effect: once a row has been clicked into, its
    // static display can get stuck showing stale/placeholder content
    // instead of its real current values after clicking away, until
    // something else forces a full rebuild.
    // Patching toggle_editable_row per row instance (GridRow isn't
    // exposed on any frappe.* namespace to patch its prototype once) was
    // the first attempt at fixing this directly - dropped after tracing
    // an actual repro: with two rows on the page, activating the second
    // one deactivates the first via frappe.ui.form.editable_row.
    // toggle_editable_row(false), and at that exact moment the FIRST
    // row's own `this.doc` reference had already gone stale (read back
    // as undefined for freshly-set fields) - patching the per-row method
    // can only re-render from whatever that instance's own `this.doc`
    // currently points to, so it inherited the same staleness rather
    // than fixing it.
    // grid.refresh() sidesteps that - it rebuilds grid_rows from
    // frm.doc.items directly (the actual source of truth) rather than
    // trusting any one row instance's own possibly-stale cached
    // reference. Only calling it when no row is visibly still open is
    // what makes this safe to run on a timer: rebuilding mid-keystroke
    // would wipe out whatever the user is actively typing.
    // frappe.ui.form.editable_row (the obvious thing to check for "is a
    // row currently open") turned out not to reliably reflect that here -
    // clicking a plain form field outside the grid (Supplier, in the
    // repro) removed the row's own "editable-row" DOM class (real visual
    // deactivation happened) but never reset that global back to null,
    // so a check against it stayed permanently blocked from ever running
    // grid.refresh() again for the rest of the page's life. The DOM class
    // itself doesn't share that gap - it's what toggle_editable_row's
    // `this.row.toggleClass("editable-row", show !== false)` line
    // actually still runs correctly either way - so checking for its
    // presence directly is the more reliable signal.
    function refresh_grid_if_idle(frm) {
        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid || !grid.wrapper) return;
        if (grid.wrapper.find('.data-row.editable-row').length) return;
        grid.refresh();
    }

    // Purchase Order Item carries BOTH discount_percentage and
    // discount_amount natively (ERPNext keeps them in sync - editing
    // either one recalculates the other), but a single grid column can
    // only ever be bound to one field, not both at once. Rather than show
    // both columns side by side (redundant - they're the same underlying
    // discount, just two units), a document-level "Discount Mode" select
    // (custom field, see hooks.py fixtures) swaps which ONE is the
    // visible grid column, both labeled plain "Discount" so the switch is
    // invisible except for which unit the header/values are actually in.
    // ERPNext core (erpnext/public/js/utils.js) registers frappe.form.
    // link_formatters["Item"] globally - ANY Item Link field, anywhere in
    // the system, renders as "CODE: Item Name" once the row also has an
    // item_name. That's not this app's own Description column leaking in
    // (a separate field, added earlier this phase) - it's item_name being
    // appended by that shared, sitewide formatter. Turning it off globally
    // would change how Item links look everywhere else, which isn't what
    // was asked for - so instead this sets a per-column df.formatter
    // (frappe.format()'s own override hook, see formatters.js: `df.
    // formatter || frappe.form.get_formatter(fieldtype)`) just for this
    // grid's item_code column, replicating the same Link formatter's link-
    // building logic minus the link_formatters["Item"] step, so the column
    // shows only the code while staying a clickable link.
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

    // Mutating grid.docfields (setup_fields() -> frappe.meta.get_docfields())
    // looked right and even verified as "set" right after calling it - but
    // get_docfields() (frappe/model/meta.js) builds that array by cloning
    // frappe.meta.get_docfield_copy(doctype, docname) FRESH on every single
    // call, so the mutation only ever lived on one disposable clone and was
    // gone again the next time anything (this file's own polling loop,
    // frm.refresh_field(), etc. - all of which run constantly here) called
    // grid.refresh() and rebuilt that array from scratch. ERPNext's own
    // core Purchase Order controller (buying/doctype/purchase_order/
    // purchase_order.js, setup()) sets an item_code indicator formatter via
    // frm.set_indicator_formatter(), which - unlike the grid.docfields path
    // - writes directly onto frappe.meta.docfield_map[doctype][fieldname],
    // the one shared, permanent object every fresh get_docfield(s)() clone
    // is actually copied FROM. That's the real source of truth (confirmed
    // live: grid.docfields' own item_code entry and frappe.meta.docfield_
    // map's are two different objects entirely), and it's what every grid
    // row's own column ends up reading - so both this and the discount
    // mode column swap below have to write there too, the same way
    // ERPNext's own code does, to actually stick.
    //
    // Writing to docfield_map still isn't enough on its own though:
    // frappe.meta.get_docfield_copy() (meta.js) - what setup_fields()
    // actually calls - caches its result PERMANENTLY per doctype+docname
    // the first time it's ever built (frappe.meta.docfield_copy[doctype]
    // [docname]) and never re-syncs it from docfield_map again afterward.
    // That first snapshot happens very early (before this file's own
    // refresh handler ever runs), so it already has ERPNext core's
    // item_code indicator formatter baked in. Worse, this cache isn't
    // keyed by the PARENT form's docname alone - GridRow.set_docfields()
    // (grid_row.js) calls the same get_docfields() with THIS ROW'S OWN
    // docname (`this.doc.name`, e.g. "new-purchase-order-item-<random>"),
    // so every individual row has its own separate cached copy under its
    // own key - the whole per-doctype cache object has to go so every key,
    // parent-level or per-row, gets rebuilt fresh from the now-mutated
    // docfield_map.
    function plain_item_code_map_df() {
        const map = frappe.meta.docfield_map['Purchase Order Item'];
        return map && map.item_code;
    }

    function apply_item_code_formatter() {
        const df = plain_item_code_map_df();
        if (df) df.formatter = plain_item_code;
    }

    // The "Tax" column (item_tax_template, a Link to Item Tax Template)
    // defaults to showing the template's own name ("Indonesia Tax - I")
    // instead of its rate - confusing for staff who just want to know
    // "how much tax", not which template. item_tax_template's own title
    // field happens to already read "11%" for the one template this app
    // currently has, but that's just a naming convention on a free-text
    // field, not guaranteed to stay numeric if someone renames it later.
    // item_tax_rate (Purchase Order Item, hidden Code/JSON field) is what
    // ERPNext's own core item_tax_template(doc,cdt,cdn) handler
    // (transaction.js) actually populates with the real resolved rate(s)
    // - `{"VAT - I - IND": 11.0}` - via an async get_item_tax_map call
    // every time the template is set, so reading it here shows the true
    // configured percentage regardless of how the template happens to be
    // named. That fetch is async like item_code's own rate lookup - this
    // file's existing polling loop (refresh_grid_if_idle) already re-
    // renders from frm.doc.items once it lands, the same way it already
    // does for rate/amount.
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
    // a document-wide setting (see purchase_taxes_and_charges_template_
    // list.js and this app's own tax config notes), not per item. When
    // inclusive, the rate the staff typed IS the final price already, so
    // nothing gets added on top of Subtotal for display either.
    function is_tax_inclusive(frm) {
        return (frm.doc.taxes || []).some((t) => cint(t.included_in_print_rate));
    }

    // Explicit ask (2026-08-10): a one-line badge read "gak umum" (not a
    // familiar pattern) - a plain checkbox pair reads more standard, so
    // this replaced the earlier HTML-badge version entirely. Tax Category
    // and the template Link field both stay hidden (see this app's own
    // Property Setter fixtures) - "Include PPN" / "Exclude PPN" become
    // the only visible surface, and drive tax_category behind the scenes
    // exactly the same way the (hidden) Tax Category field itself would
    // have, through the two "PPN Include" / "PPN Exclude" Tax Category
    // records + their matching Tax Rule records (see Tax Rule list) -
    // reusing that already-correct, already-core mechanism rather than
    // inventing a second parallel way to pick a tax template.
    const PPN_CATEGORY = { ppn_include: 'PPN Include', ppn_exclude: 'PPN Exclude' };

    // erpnext.utils.set_taxes (party.js) hard frappe.throw()s - and wipes
    // the field that triggered it back to "" - if company/party/date
    // aren't set yet (see validate_mandatory there). A checkbox click is
    // the wrong moment for that: guard the same three fields ourselves
    // first with a plain, recoverable frappe.msgprint instead, and leave
    // the checkbox unchecked rather than let the box appear to work and
    // then silently get blanked back out from under the user.
    function apply_ppn_category(frm, fieldname) {
        const category = PPN_CATEGORY[fieldname];
        const other = fieldname === 'ppn_include' ? 'ppn_exclude' : 'ppn_include';

        if (!cint(frm.doc[fieldname])) {
            // Unchecking a box on its own doesn't clear tax_category -
            // there's no "neither" state worth landing on mid-edit -
            // checking the OTHER box is how you actually switch modes.
            return;
        }

        if (!frm.doc.company || !frm.doc.supplier || !(frm.doc.transaction_date || frm.doc.posting_date)) {
            frappe.msgprint(__('Pilih Supplier dan Company dulu sebelum pilih Include/Exclude PPN.'));
            frm.doc[fieldname] = 0;
            frm.refresh_field(fieldname);
            return;
        }

        frm.doc[other] = 0;
        frm.refresh_field(other);
        frm.doc.tax_category = category;
        frm.refresh_field('tax_category');
        erpnext.utils.set_taxes(frm, 'tax_category');
    }

    // Keeps the two checkboxes truthful whenever tax_category changes for
    // any OTHER reason than the checkboxes themselves - most commonly,
    // core's own supplier(frm) handler already calls erpnext.utils.
    // set_taxes(frm, "supplier") on every Supplier change (buying.js),
    // which resolves tax_category from the Supplier's own default via
    // the Tax Rule engine same as this file's own apply_ppn_category()
    // does - polled the same "no discrete event to hook" way the rest of
    // this file's watch_po_form() loop already handles item_tax_rate.
    function sync_ppn_checkboxes(frm) {
        const want_include = frm.doc.tax_category === 'PPN Include' ? 1 : 0;
        const want_exclude = frm.doc.tax_category === 'PPN Exclude' ? 1 : 0;
        if (cint(frm.doc.ppn_include) !== want_include) {
            frm.doc.ppn_include = want_include;
            frm.refresh_field('ppn_include');
        }
        if (cint(frm.doc.ppn_exclude) !== want_exclude) {
            frm.doc.ppn_exclude = want_exclude;
            frm.refresh_field('ppn_exclude');
        }
    }

    // "Amount" (custom field amount_after_tax) = Subtotal + tax - the
    // final per-row figure, distinct from "Subtotal" (native `amount`
    // field, qty * rate = the line total before tax). Purchase Order Item
    // has no native per-row "amount including tax" field of its own -
    // ERPNext's own tax engine only ever distributes/tracks tax at the
    // document level (Purchase Taxes and Charges' own item_wise_tax_detail
    // JSON), not as a plain field on each item row - so this is computed
    // here from the same item_tax_rate this file's own Tax column already
    // reads, purely for display. Multiple tax rows (rare, but item_tax_
    // rate can hold more than one account) are summed, matching how the
    // Tax column already shows "5% + 6%" for that same case. When the
    // document's template is tax-inclusive, the typed rate already
    // contains the tax, so nothing is added - this must match the same
    // Grand Total ERPNext's own engine computes (see determine_exclusive_
    // rate() in taxes_and_totals.py), or this column contradicts it.
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
    // only, no model event) rather than frappe.model.set_value() -
    // set_value() unconditionally marks the whole form dirty. This field
    // is "purely for display" (see the comment above), recomputed fresh
    // on every poll tick regardless, but today's PPN Tax Rule fix means
    // its computed value can now genuinely differ from whatever was
    // stored on an already-saved document from before that fix existed -
    // opening such a document then immediately flipped it to Not Saved
    // with zero actual user edits, reported directly by the user.
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
    // item_tax_template Link. A formatter-only display looked fine at
    // rest but flickered back to blank the moment the (still technically
    // editable-until-clicked) Link field's own control took over on click
    // - reported directly by the user. Writing a real value here has no
    // such control-vs-formatter mismatch, and doubles as what the
    // Include/Exclude PPN checkboxes actually drive per row now instead
    // of a second, contradictory Item Tax Template picker.
    //
    // Mutates the row doc directly + refresh_field() (static-cell re-paint
    // only, no model event) rather than frappe.model.set_value() -
    // set_value() unconditionally marks the whole form dirty, so on ANY
    // already-saved document from before this field existed (ppn_display
    // starts out unset), the very first poll tick after opening it would
    // "backfill" the field and flip the form to Not Saved with zero actual
    // user edits - reported directly by the user. This value is fully
    // re-derivable from rate/tax_category every time regardless, so it
    // never needs to be a real, persisted edit in the first place.
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

    // Purchase Order Item carries BOTH discount_percentage and
    // discount_amount natively (ERPNext keeps them in sync - editing
    // either one recalculates the other), but a single grid column can
    // only ever be bound to one field, not both at once. Rather than show
    // both columns side by side (redundant - they're the same underlying
    // discount, just two units), a document-level "Discount Mode" select
    // (custom field, see hooks.py fixtures) swaps which ONE is the
    // visible grid column, both labeled plain "Discount" so the switch is
    // invisible except for which unit the header/values are actually in.
    // Returns whether visibility actually changed, same "only rebuild
    // when something really moved" reasoning as apply_item_code_formatter.
    const DISCOUNT_FIELDS = ['discount_percentage', 'discount_amount'];

    function apply_discount_mode(frm) {
        const map = frappe.meta.docfield_map['Purchase Order Item'];
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

    // Single place that actually invalidates the stale per-docname/per-row
    // cache (see the long comment above) and forces the grid to rebuild
    // from the now-current docfield_map - shared by both customizations
    // above so the cache only gets busted once per refresh cycle, and the
    // (comparatively expensive, DOM-rebuilding) reset_grid() call only
    // runs when something actually needs it: the very first time for this
    // grid instance (existing rows built before any of this ran), or
    // whenever discount mode visibility actually flips.
    //
    // The docfield_map/docfield_copy mutations below deliberately do NOT
    // wait on the grid existing - they're what a brand new document's very
    // FIRST paint reads from (frappe.meta.get_docfield_copy(), called by
    // setup_fields() while building that first render), so gating them
    // behind `if (!grid) return` (as this used to) left that first paint
    // showing the server's raw, un-patched column state - "CODE: Item Name"
    // instead of the plain code, the item_tax_template's own template name
    // instead of its resolved rate, and (since the DocType's own base
    // definition happens to default discount_amount visible/discount_
    // percentage hidden - the opposite of what "Percentage" mode, this
    // form's own default discount_mode, needs) the WRONG discount column -
    // for a moment, until this function's own next call (from refresh(),
    // which by then has a real grid to reset) corrected it. Only the
    // grid.reset_grid() call actually needs a real grid to act on.
    function sync_grid_customizations(frm) {
        apply_item_code_formatter();
        const discount_changed = apply_discount_mode(frm);

        delete frappe.meta.docfield_copy['Purchase Order Item'];

        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid) return;

        if (discount_changed || !grid._customizations_applied) {
            grid._customizations_applied = true;
            grid.reset_grid();
        }
    }

    // erpnext's own calculate_taxes_and_totals() (taxes_and_totals.js) is
    // `async` - it awaits calculate_shipping_charges() and, in some
    // configurations, a real frappe.call() round trip - so frm.doc.
    // grand_total is NOT necessarily updated yet by the time a qty/rate
    // field-change handler registered here even finishes running, let
    // alone by the next JS tick (setTimeout(fn, 0) was tried first and
    // read a stale value nearly every time: qty changed 1 -> 5 read back
    // grand_total as if qty were still 1). Rather than guess how long the
    // real recalculation takes, or chase down every single field that can
    // end up affecting it (item_code also changes rate via its own
    // server call, warehouse can matter for tax templates, etc.), this
    // just polls frm.doc on a short interval and re-renders from
    // whatever it currently holds - same approach already used for the
    // Bank Reconciliation Tool's main table (bank_reconciliation_tool.js
    // watch_main_table()) for the same class of "some other async process
    // updates this, and there's no single reliable completion hook to
    // attach to" problem.
    // disable_row_open() only ever ran from refresh() - a whole-form
    // lifecycle event "Add Row" doesn't trigger (it only refreshes the
    // grid field itself) - but in practice this rarely matters in
    // isolation, since grid.df.in_place_edit is a GRID-level flag, not
    // per-row: once set (before_load/refresh), every row created
    // afterward - including via the real Add Row button - already skips
    // creating a pencil in the first place (add_open_form_button()'s own
    // `!this.grid.df.in_place_edit` check). The per-row cleanup here only
    // matters for whichever row(s) existed in that brief window before
    // the flag was first set. Kept in the same polling loop as
    // refresh_grid_if_idle()/render_totals_footer() below anyway, since
    // it's cheap and already idempotent either way.
    let po_interval_bound = false;
    let latest_po_frm = null;

    function watch_po_form(frm) {
        latest_po_frm = frm;
        if (po_interval_bound) return;
        po_interval_bound = true;
        setInterval(() => {
            if (!latest_po_frm) return;
            disable_row_open(latest_po_frm);
            force_tds_editable(latest_po_frm);
            refresh_grid_if_idle(latest_po_frm);
            render_totals_footer(latest_po_frm);
            sync_ppn_checkboxes(latest_po_frm);
            sync_pph23_flags(latest_po_frm);
            // Unconditional, not gated on sync_pph23_flags() actually
            // changing anything - deleting the one row that was flagged
            // subject_to_pph23 shrinks the service base to zero without
            // ANY row's own flag changing (there's no longer a row to
            // mismatch), so gating this on "did a flag change" left the
            // stale withholding row and its old amount sitting in frm.doc.
            // taxes forever after a delete. apply_pph23_tax_row() itself
            // already no-ops cheaply when nothing actually changed, so
            // calling this every tick regardless costs one lightweight
            // frappe.call, not a real recalculation, in the common case.
            sync_pph23_preview(latest_po_frm);
            // item_tax_rate populates asynchronously (same get_item_tax_map
            // round trip the Tax column's own formatter already tolerates)
            // and fires no discrete event of its own to hook - re-scanning
            // every row here is what catches it landing after item_code/
            // item_tax_template selection, the same "poll instead of chase
            // a completion hook that doesn't exist" pattern as the rest of
            // this loop.
            (latest_po_frm.doc.items || []).forEach((row) => {
                sync_amount_after_tax(latest_po_frm, row.doctype, row.name);
                sync_ppn_display(latest_po_frm, row.doctype, row.name);
            });
        }, 400);
    }

    // Garage Service Order's own Required Parts grid never shows this
    // stale-display bug, traced to one specific thing its own field
    // handlers do that this file's polling loop above doesn't:
    // fetchItemDetails() there explicitly calls `gridRow.toggle_editable_
    // row(false)` right after frappe.model.set_value(...).then(...), on
    // every qty/rate/discount/tax change - it never waits for the row to
    // deactivate on its own (confirmed live: clicking a plain form field
    // outside the grid does NOT remove the "editable-row" DOM class by
    // itself, so relying on that happening naturally is what was broken
    // here). Forcing the row closed immediately after each relevant field
    // change, the same way, means refresh_grid_if_idle() above always
    // finds the grid idle on its very next tick and can rebuild the row's
    // static display from frm.doc.items (the real values) instead of
    // whatever the row's own live input widgets were last showing - this
    // still works even for item_code, where ERPNext's own core handler
    // fetches rate/uom/etc via an async frappe.call(): closing the row
    // here runs before that call resolves, but that's fine, since once
    // closed the row is no longer "active" and the next poll tick above
    // picks up the fetched values from frm.doc.items once they land.
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
        sync_pph23_preview(frm);
    }

    // "Rate" (price_list_rate) is the staff's own manual entry, the
    // original/list price - left completely alone here, never written to
    // by this file. "Subtotal" is the native `rate` field: ERPNext's own
    // calculate_item_values() (taxes_and_totals.js) already does `item.
    // amount = item.rate * item.qty` on every recalculation, completely
    // unconditionally - so making Subtotal (this native `rate` field)
    // equal price_list_rate minus the discount, instead of overriding
    // `amount`/`net_amount` directly ourselves and fighting that
    // unconditional overwrite on every future recalc, is what makes the
    // discount actually flow through into Amount, taxes and Grand Total
    // via ERPNext's own already-correct engine rather than reimplementing
    // it. ERPNext does have a native price_list_rate(doc,cdt,cdn) trigger
    // that does something similar (apply_pricing_rule_on_item, transaction
    // .js), but nothing native exists for editing discount_amount/
    // discount_percentage directly (this app's own primary input, via the
    // Discount Mode toggle) - and that native helper's own percentage-vs-
    // amount resolution (`if (item.discount_percentage && !item.
    // discount_amount)`) assumes whichever one is 0 is the "unused" one,
    // which doesn't hold here since BOTH fields keep whatever they were
    // last set to even while hidden by the mode toggle. Recomputing
    // explicitly from the CURRENT discount_mode every time sidesteps that
    // ambiguity entirely instead of relying on it.
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
            // calculate_taxes_and_totals() is what turns the new Subtotal
            // (`rate`) into a correct Amount/net total/taxes/Grand Total -
            // frm.cscript here is the PurchaseOrderController instance
            // (extends BuyingController extends TransactionController
            // extends erpnext.taxes_and_totals, buying/doctype/
            // purchase_order/purchase_order.js), the same object ERPNext's
            // own core field triggers call this method on.
            if (frm.cscript && typeof frm.cscript.calculate_taxes_and_totals === 'function') {
                frm.cscript.calculate_taxes_and_totals();
            }
            on_item_row_change(frm, cdt, cdn);
        });
    }

    // PPh 23 (and similar withholding taxes) only apply to the JASA/
    // service portion of a purchase, never goods - but ERPNext's own core
    // Tax Withholding mechanism (apply_tds/tax_withholding_category,
    // buying/doctype/purchase_order/purchase_order.js set_tax_withholding())
    // only ever knows how to compute against the WHOLE document's net_
    // total, and only does so server-side on save (no client-side preview
    // exists in core at all - confirmed nothing calls set_tax_withholding
    // from any 'Purchase Order' JS trigger). Auto-flagging each row whose
    // Item Group is "Services" (subject_to_pph23, Custom Field) and
    // summing only THOSE rows' amount as the withholding base - both here
    // and, authoritatively, in garage.utils.purchase_order_tax_withholding
    // .fix_service_only_withholding() (doc_events "validate", corrects
    // whatever core's own whole-total-based row said right after it runs)
    // - is what keeps a mixed goods+services PO from having PPh 23 wrongly
    // eat into the goods portion too.
    // Can't just register a field handler on item_group's own change event -
    // item_code's own fetch (transaction.js, get_item_details) applies
    // item_group (and rate, price_list_rate, uom, ...) via frm.call({child:
    // item, ...}), which - confirmed by reading form.js's own frm.call()
    // implementation - does a bare `opts.child[key] = r.message[key]` for
    // every fetched field, not frappe.model.set_value(), so it NEVER fires
    // an "item_group" (or any other fetched field's) trigger event at all.
    // Polling for a mismatch instead, same idle-tick pattern this file
    // already uses elsewhere for other "some other async process updates
    // this doc, no reliable completion hook exists" cases (watch_po_form()
    // above). Returns whether anything changed, so the caller only pays
    // for a fresh tax-withholding preview call when it's actually needed.
    function sync_pph23_flags(frm) {
        let changed = false;
        (frm.doc.items || []).forEach((row) => {
            const should_flag = row.item_group === 'Services' ? 1 : 0;
            if (cint(row.subject_to_pph23) !== should_flag) {
                row.subject_to_pph23 = should_flag;
                changed = true;
            }
        });
        if (changed) frm.refresh_field('items');
        return changed;
    }

    function recalc_after_tax_row_change(frm) {
        if (frm.cscript && typeof frm.cscript.calculate_taxes_and_totals === 'function') {
            frm.cscript.calculate_taxes_and_totals();
        }
        render_totals_footer(frm);
    }

    // Mirrors the exact row shape purchase_order_tax_withholding.py's own
    // _build_tax_row() returns (that's where tax_row actually comes from -
    // this just applies it), so the live preview and the save-time
    // correction can never end up representing the withholding row
    // differently from one another.
    function apply_pph23_tax_row(frm, tax_row) {
        const taxes = frm.doc.taxes || [];
        const existing = taxes.find((t) => t.is_tax_withholding_account);

        if (!tax_row) {
            if (existing) {
                frm.doc.taxes = taxes.filter((t) => t !== existing);
                frm.refresh_field('taxes');
                recalc_after_tax_row_change(frm);
            }
            return;
        }

        if (existing) {
            // Called on every 400ms poll tick regardless of whether
            // anything actually moved (see watch_po_form() above) - skip
            // the set_value()+recalc cycle entirely when the amount is
            // already correct, so the common "nothing changed" case only
            // costs the frappe.call itself, not a redundant recalculation/
            // dirty-form-marking on every single tick.
            if (
                flt(existing.tax_amount) === flt(tax_row.tax_amount) &&
                existing.account_head === tax_row.account_head
            ) {
                return;
            }
            frappe.model.set_value(existing.doctype, existing.name, tax_row).then(() => {
                recalc_after_tax_row_change(frm);
            });
        } else {
            frm.add_child('taxes', tax_row);
            frm.refresh_field('taxes');
            recalc_after_tax_row_change(frm);
        }
    }

    function sync_pph23_preview(frm) {
        if (!frm.doc.apply_tds || !frm.doc.tax_withholding_category || !frm.doc.company) {
            apply_pph23_tax_row(frm, null);
            return;
        }

        const service_base = (frm.doc.items || []).reduce(
            (sum, row) => sum + (cint(row.subject_to_pph23) ? flt(row.amount) : 0),
            0
        );

        frappe.call({
            method: 'garage.utils.purchase_order_tax_withholding.preview_service_tax_withholding',
            args: {
                company: frm.doc.company,
                tax_withholding_category: frm.doc.tax_withholding_category,
                posting_date: frm.doc.transaction_date,
                service_base_amount: service_base,
            },
            callback(r) {
                apply_pph23_tax_row(frm, r.message);
            },
        });
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

    frappe.ui.form.on('Purchase Order', {
        before_load(frm) {
            const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
            if (grid) grid.df.in_place_edit = 1;
        },
        // onload fires after frm.doc is populated but before render_form()
        // builds the grid's DOM for the very first time (form.js: before_
        // load -> onload -> render_form() -> refresh_fields() -> "refresh")
        // - patching docfield_map here, instead of waiting for refresh()
        // to do it after that first paint already happened, is what
        // actually stops the raw/un-patched column state (see the long
        // comment on sync_grid_customizations above) from ever being
        // visible in the first place, rather than flashing then getting
        // corrected a moment later.
        onload(frm) {
            sync_grid_customizations(frm);
            sync_supplier_name_visibility(frm);
        },
        refresh(frm) {
            disable_row_open(frm);
            force_tds_editable(frm);
            sync_grid_customizations(frm);
            watch_po_form(frm);
            sync_pph23_preview(frm);
            sync_ppn_checkboxes(frm);
        },
        discount_mode(frm) {
            sync_grid_customizations(frm);
            disable_row_open(frm);
            render_totals_footer(frm);
        },
        apply_tds(frm) {
            sync_pph23_preview(frm);
        },
        tax_withholding_category(frm) {
            sync_pph23_preview(frm);
        },
        ppn_include(frm) {
            apply_ppn_category(frm, 'ppn_include');
        },
        ppn_exclude(frm) {
            apply_ppn_category(frm, 'ppn_exclude');
        },
        // GridRow.remove() (grid_row.js) fires "<fieldname>_remove" on the
        // PARENT form once a row is actually deleted - ERPNext core itself
        // listens for this same event (transaction.js: this["items_remove"]
        // = this.process_item_removal, which re-runs calculate_taxes_and_
        // totals) to keep Amount/Grand Total correct immediately rather
        // than waiting on some other trigger. Doing the same here for the
        // PPh 23 preview and this file's own footer means deleting the
        // one row that was flagged subject_to_pph23 clears the withholding
        // row and refreshes the footer right away, instead of waiting up
        // to 400ms for the next watch_po_form() poll tick to catch it.
        items_remove(frm) {
            sync_pph23_preview(frm);
            render_totals_footer(frm);
        },
        // frm.print_doc() is the exact same navigation the "Full Page"
        // toolbar button already does (form.js's own print_doc() -
        // frappe.set_route("print", doctype, docname)) - reusing it here
        // means staff land straight on the Purchase Order Print view the
        // moment Submit succeeds, instead of having to submit, then find
        // and click the print icon themselves as a separate step.
        on_submit(frm) {
            frm.print_doc();
        },
    });

    frappe.ui.form.on('Purchase Order Item', {
        item_code: on_item_row_change,
        subject_to_pph23(frm) {
            sync_pph23_preview(frm);
        },
        qty: on_item_row_change,
        price_list_rate: sync_discount_and_rate,
        discount_amount: sync_discount_and_rate,
        discount_percentage: sync_discount_and_rate,
        item_tax_template: on_item_row_change,
        uom: on_item_row_change,
    });
})();
