// Hides the Items grid's "Add Row"/"Add Multiple" buttons - Purchase
// Receipt items should only ever come from the Purchase Order they were
// created against (via "Get Items From"), not typed in ad hoc at
// receiving time. Unlike Download/Upload (a real DocField property,
// allow_bulk_edit, turned off via a plain Property Setter - no code
// needed there), Frappe has no persisted schema field for this specific
// pair of buttons - grid.js's own add_row()/refresh_toolbar() only ever
// check a runtime `cannot_add_rows` flag on the grid/its docfield, so
// there's nothing to configure and this is the smallest way to reach it.
(() => {
    function disable_add_row(frm) {
        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid) return;
        grid.cannot_add_rows = true;
        grid.refresh();
    }

    // ERPNext core (erpnext/public/js/utils.js) registers frappe.form.
    // link_formatters["Item"] globally - once a row also has item_name,
    // ANY Item Link field anywhere in the system renders as "CODE: Item
    // Name", not just the code. Purchase Order hit the exact same thing
    // (see purchase_order.js's own plain_item_code + apply_item_code_
    // formatter) - now that Description is its own column here too, the
    // combined "code: name" in Item Code is redundant with it. Same fix,
    // same reasoning: a per-column df.formatter (frappe.format()'s own
    // override hook) replicating the default Link formatter's link-
    // building logic minus the link_formatters["Item"] step.
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

    // Mutating grid.docfields directly looked right but doesn't stick -
    // frappe.meta.get_docfields() (what setup_fields() actually calls)
    // rebuilds that array from frappe.meta.get_docfield_copy() on every
    // single call, and that copy is itself cached PERMANENTLY per
    // doctype+docname (and, separately, per ROW docname too - GridRow.
    // set_docfields() calls the same function with the ROW's own docname)
    // the first time it's ever built, never re-syncing from docfield_map
    // again afterward. Same three-part fix already proven out for
    // Purchase Order: write the formatter onto frappe.meta.docfield_map
    // directly (the one shared object every copy is actually cloned
    // FROM), wipe the whole per-doctype docfield_copy cache so every
    // key - parent-level or per-row - rebuilds fresh from it, then
    // reset_grid() once so any row already built before this ran picks
    // it up too.
    // The docfield_map/docfield_copy mutations below deliberately don't
    // wait on the grid existing - they're what a brand new document's very
    // FIRST paint reads from (frappe.meta.get_docfield_copy(), called by
    // setup_fields() while building that first render) - gating the whole
    // function behind `if (!grid) return` (as this used to) left that
    // first paint showing the raw "CODE: Item Name" link format for a
    // moment, corrected only once refresh()'s own next call found a real
    // grid to reset. Only the grid.reset_grid() call actually needs one.
    function apply_item_code_formatter(frm) {
        const map = frappe.meta.docfield_map['Purchase Receipt Item'];
        const df = map && map.item_code;
        if (df) df.formatter = plain_item_code;

        delete frappe.meta.docfield_copy['Purchase Receipt Item'];

        const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
        if (!grid) return;

        if (!grid._item_code_formatter_reset) {
            grid._item_code_formatter_reset = true;
            grid.reset_grid();
        }
    }

    // garage.utils.purchase_receipt_hooks.strip_service_items (doc_events
    // "before_validate") already drops Services-group rows server-side on
    // every save - correct for what actually gets stored, but "Get Items
    // From"/the "Create > Purchase Receipt" button both populate frm.doc.
    // items on a brand new, not-yet-saved form, and that server hook only
    // ever runs at save time. Left alone, a service line sits visibly in
    // the grid the whole time the user is still reviewing the just-mapped
    // Receipt, before it ever gets removed - looks like it "didn't work"
    // even though save would have cleaned it up correctly. Mirrors it
    // client-side too so it never renders in the first place.
    function strip_service_items(frm) {
        const items = frm.doc.items || [];
        const service_rows = items.filter((row) => row.item_group === 'Services');
        if (!service_rows.length) return;

        const removed_codes = service_rows.map((row) => row.item_code);
        frm.doc.items = items.filter((row) => row.item_group !== 'Services');
        frm.refresh_field('items');

        frappe.show_alert({
            message: __('Item jasa ({0}) otomatis dihapus - jasa tidak melalui proses penerimaan barang.', [
                removed_codes.join(', '),
            ]),
            indicator: 'blue',
        });
    }

    // item_group isn't something a discrete field-change event fires for -
    // same root cause already traced in purchase_order.js (frm.call({child:
    // ...}) bulk-assigns fetched fields like item_group with a bare
    // property write, never through frappe.model.set_value, so nothing
    // triggers off of it) - and "Get Items From" populates the whole grid
    // in one shot with no single reliable completion hook either. Polling
    // is the same proven fix used for that same class of problem
    // throughout this app's own Purchase Order customizations.
    let pr_interval_bound = false;
    let latest_pr_frm = null;

    function watch_pr_form(frm) {
        latest_pr_frm = frm;
        if (pr_interval_bound) return;
        pr_interval_bound = true;
        setInterval(() => {
            if (!latest_pr_frm) return;
            strip_service_items(latest_pr_frm);
            sync_ppn_from_source_po(latest_pr_frm);
            sync_ppn_checkboxes(latest_pr_frm);
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

    // "Include PPN" / "Exclude PPN" - explicit ask (2026-08-10): Include/
    // Exclude is a Purchase Order-only decision. Purchase Receipt just
    // MIRRORS whichever Purchase Taxes and Charges Template the source
    // PO already picked, read-only, so the same physical purchase can
    // never end up tax-inconsistent partway through its own PO -> PR ->
    // PI chain. A standalone Purchase Receipt with no PO reference on
    // any item row has nothing to mirror - both boxes stay locked AND
    // unchecked rather than falling back to the old Supplier-driven Tax
    // Rule auto-detect this file used to do, which is the intended nudge
    // back towards "start from a Purchase Order" for anything tax-
    // bearing (Purchase Order itself is still fully editable - see its
    // own apply_ppn_category()).
    function lock_ppn_fields(frm) {
        frm.set_df_property('ppn_include', 'read_only', 1);
        frm.set_df_property('ppn_exclude', 'read_only', 1);
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

    // Keeps the two boxes reflecting whatever tax_category sync_ppn_
    // from_source_po() (or, on a fresh "Get Items From" mapping, core's
    // own field copy) landed - same polling reasoning as watch_pr_form()'s
    // other callers (no discrete event to hook for either path).
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

    frappe.ui.form.on('Purchase Receipt', {
        // onload fires after frm.doc is populated but before the grid's
        // DOM is first built (form.js: before_load -> onload -> render_
        // form() -> refresh_fields() -> "refresh") - patching docfield_map
        // here, instead of waiting for refresh() to do it after that first
        // paint already happened, stops the raw "CODE: Item Name" format
        // from ever being visible in the first place, matching the same
        // fix applied to Purchase Order (purchase_order.js).
        onload(frm) {
            apply_item_code_formatter(frm);
            sync_supplier_name_visibility(frm);
        },
        refresh(frm) {
            disable_add_row(frm);
            apply_item_code_formatter(frm);
            strip_service_items(frm);
            watch_pr_form(frm);
            lock_ppn_fields(frm);
            sync_ppn_from_source_po(frm);
            sync_ppn_checkboxes(frm);
        },
        // Same flow as Purchase Order (purchase_order.js's own on_submit) -
        // frm.print_doc() is exactly what the "Full Page" toolbar button
        // already does (form.js's own print_doc() - frappe.set_route
        // ("print", doctype, docname)), reused here so staff land on the
        // print view the moment Submit succeeds instead of having to find
        // and click the print icon themselves as a separate step.
        on_submit(frm) {
            frm.print_doc();
        },
    });
})();
