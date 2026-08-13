// Removes the row-edit pencil (+ "Configure Columns" gear) from the Items
// grid, same treatment as purchase_order.js/purchase_invoice.js/
// sales_order.js already give their own Items grids - see purchase_order.
// js's own disable_row_open() for the full reasoning (add_open_form_
// button()/grid_row.js internals, the REMOVED_BUTTON_STUB workaround for a
// stale Escape handler). Also plain_item_code() - same as those three
// files' own, see purchase_order.js's comment for the full reasoning
// (ERPNext's sitewide "CODE: Item Name" Link formatter, turned off just
// for this one grid column now that Description is its own column here
// too, matching Purchase Order's own layout minus Received Qty, explicit
// user request). No item-tax-rate formatter or Discount Mode toggle
// though - Sales Invoice Item's grid shows Discount (%) and PPN (%) as
// their own permanent columns, nothing to swap.
(() => {
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

    // See purchase_order.js's own plain_item_code()/apply_item_code_
    // formatter() for the full reasoning (frappe.meta.docfield_map vs
    // grid.docfields, the permanent per-doctype+docname docfield_copy
    // cache that has to be cleared for the formatter to actually stick).
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
        const map = frappe.meta.docfield_map['Sales Invoice Item'];
        const df = map && map.item_code;
        if (df) df.formatter = plain_item_code;
    }

    function sync_grid_customizations(frm) {
        apply_item_code_formatter();
        delete frappe.meta.docfield_copy['Sales Invoice Item'];

        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid) return;
        if (!grid._customizations_applied) {
            grid._customizations_applied = true;
            grid.reset_grid();
        }
    }

    // Customer Number/Service Order/No. Polisi are all read_only=1 custom
    // fields (fetched/derived, never hand-typed - see each field's own
    // Custom Field description) - Frappe hides any read-only field that's
    // still empty (frappe/public/js/frappe/form/controls/base_control.js
    // get_status(): a read-only field with a null value gets status
    // "None", i.e. hidden). On a brand new Sales Invoice - straight from
    // the list view, or mapped from a Sales Order via sales_order_invoice_
    // hooks.py before that server call resolves - all three are still
    // blank, so they vanished from the form entirely instead of just
    // showing empty, reported directly by the user ("field yg dimaksud
    // gak muncul"). Same fix as Sales Order's own lock_customer_number():
    // keep the DocField NOT read_only (Sales Invoice-<field>-read_only
    // Property Setter/Custom Field set to 0) so Frappe's own hide-when-
    // empty check never triggers, and lock the actual <input> element
    // directly here instead - genuinely un-typable, but always rendered.
    //
    // customer_name/tax_id/company_tax_id used to need this same treatment
    // (native fields, fetch_from-driven same as the three above, same hide
    // bug once a Sales Invoice is submitted - see git history) - now just
    // hidden outright instead (Sales Invoice-<field>-hidden Property
    // Setter), explicit user request: redundant with Customer's own
    // display, no reason to show a locked duplicate of it.
    const LOCKED_FIELDS = ['customer_number', 'service_order', 'no_polisi'];

    // Explicit user request (again - a SUBMITTED invoice with a genuinely
    // blank Service Order, e.g. one created from a Sales Order rather than
    // a Garage Service Order, still needs its own "empty" state visible,
    // not vanished): removing read_only (above) only fixed a DRAFT
    // document. On a SUBMITTED one, frappe.perm.get_field_display_status
    // forces status "Read" for every field regardless of its own read_only
    // flag at all (`if (status === "Write" && cint(doc.docstatus) > 0)
    // status = "Read"` - a submitted doc is read-only as a WHOLE), which
    // re-triggers base_control.js's own "hide read-only + null value"
    // check purely off that forced status, independent of read_only.
    // There's no Property Setter that can turn this off - `df.get_status`
    // is the one documented escape hatch base_control.js's own get_status()
    // checks FIRST, before any of that permission/read-only/null logic
    // ever runs, so this bypasses the whole thing outright and always
    // reports "Read" (still genuinely un-typable either way, matching
    // lock_fields()'s own DOM-level lock below).
    function force_visible(frm) {
        LOCKED_FIELDS.forEach((fieldname) => {
            const control = frm.fields_dict[fieldname];
            if (!control) return;
            const already_patched = control.df.get_status && control.df.get_status.__garage_force_visible;
            if (already_patched && control.disp_status !== 'None') return;
            const patched = () => 'Read';
            patched.__garage_force_visible = true;
            control.df.get_status = patched;
            // Just setting df.get_status isn't enough on its own - the
            // control caches its LAST computed status in this.disp_status
            // (base_control.js refresh()) and only toggles the "hide-
            // control" class + re-renders when refresh() actually runs
            // again, so this has to explicitly re-trigger that too.
            if (control.refresh) control.refresh();
        });
    }

    function lock_fields(frm) {
        LOCKED_FIELDS.forEach((fieldname) => {
            const control = frm.fields_dict[fieldname];
            if (!control || !control.$input) return;
            control.$input.prop('readOnly', true);
        });
    }

    // frappe.meta.docfield_copy[doctype][docname] (frappe/public/js/frappe/
    // model/meta.js) - the per-document snapshot every field's own `df`
    // object is actually built from (get_docfield_copy() -> make_docfield_
    // copy_for()) - only ever gets built ONCE per doctype+docname and is
    // never resynced afterward, same underlying cache sync_grid_
    // customizations() already has to work around for the Items grid (see
    // its own comment above). On the MAIN form this snapshot can end up
    // built from an earlier, incomplete doctype payload - confirmed live:
    // right after page load, frappe.meta.docfield_map (the single shared,
    // correct source every fresh copy is supposed to come FROM) already
    // had the right hidden:0 for customer_name, but the already-built
    // per-doc copy still read hidden:1, and Frappe never re-syncs an
    // existing copy once made. This is what made customer_name vanish on
    // a real, non-empty, SUBMITTED invoice - reported directly by the
    // user - even though clearing the cache and re-rendering fixes it
    // immediately once called.
    //
    // The tricky part: WHEN the underlying payload actually becomes
    // correct is itself a race with no single reliable completion hook to
    // attach to (same class of problem the rest of this file's polling
    // loop below already exists for) - clearing this once from refresh()
    // was tried first and turned out to run too early, before the
    // correction had actually landed, rebuilding the exact same stale
    // copy right back. So this instead runs from the polling loop,
    // repeatedly, for a bounded number of ticks after each fresh document
    // load (not forever - discarding this cache also discards any OTHER
    // script's runtime df mutations made since load, so this needs to
    // stop once the payload has clearly settled, not keep undoing things
    // indefinitely).
    let docfield_copy_retries_left = 0;
    let docfield_copy_cleared_for = null;

    function clear_stale_docfield_copy(frm) {
        if (docfield_copy_cleared_for !== frm.docname) {
            docfield_copy_cleared_for = frm.docname;
            docfield_copy_retries_left = 5;
        }
        if (docfield_copy_retries_left <= 0) return;
        docfield_copy_retries_left -= 1;
        delete frappe.meta.docfield_copy['Sales Invoice'];
        frm.refresh_fields();
    }

    let si_interval_bound = false;
    let latest_si_frm = null;

    function watch_si_form(frm) {
        latest_si_frm = frm;
        if (si_interval_bound) return;
        si_interval_bound = true;
        setInterval(() => {
            if (!latest_si_frm) return;
            // disable_row_open() also needs to run AFTER refresh_grid_if_idle()
            // here, not just before it - grid.refresh() (called inside
            // refresh_grid_if_idle whenever no row is actively being edited)
            // rebuilds the grid's header row from scratch, which re-adds the
            // "Configure Columns" gear button disable_row_open() just removed
            // a moment earlier in this exact same tick. Calling it a second
            // time, after that rebuild, is what actually makes the removal
            // stick instead of the button reappearing on every idle tick.
            disable_row_open(latest_si_frm);
            refresh_grid_if_idle(latest_si_frm);
            disable_row_open(latest_si_frm);
            lock_fields(latest_si_frm);
            // AFTER clear_stale_docfield_copy(), not before - that call
            // rebuilds every field's df object from scratch via refresh_
            // fields(), which would silently wipe the get_status override
            // this sets if run in the other order.
            clear_stale_docfield_copy(latest_si_frm);
            force_visible(latest_si_frm);
        }, 400);
    }

    frappe.ui.form.on('Sales Invoice', {
        before_load(frm) {
            const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
            if (grid) grid.df.in_place_edit = 1;
        },
        onload(frm) {
            sync_grid_customizations(frm);
        },
        refresh(frm) {
            disable_row_open(frm);
            sync_grid_customizations(frm);
            watch_si_form(frm);
            lock_fields(frm);
            force_visible(frm);
        },
        // Explicit user request: submitting a Sales Invoice should
        // immediately show the customer-facing document (Nota Service,
        // already the default print format for this doctype - see the
        // Sales Invoice-main-default_print_format Property Setter) - same
        // convenience Sales Order's own on_submit and Payment Entry's own
        // on_submit already give their documents (see sales_order.js/
        // garage_theme.js). Bound on the doctype itself, not any one
        // creation path, so this fires the same way regardless of whether
        // the invoice was created via Sales Order, Delivery Note, or
        // straight from the Sales Invoice list - a fully background
        // auto-submit with no browser involved at all (Repair QC's own
        // si.submit(), see repair_qc.py) has no frm to trigger this from
        // in the first place, so that one specific path still won't
        // auto-print; every other submit - including a human manually
        // submitting a GSO-linked invoice from its own form - does.
        on_submit(frm) {
            frm.print_doc();
        },
    });
})();
