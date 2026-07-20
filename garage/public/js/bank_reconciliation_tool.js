// Auto-fill "Closing Balance" from the latest imported Bank Transaction's
// running balance (BCA's Saldo column, preserved during CSV cleaning - see
// garage/utils/bca_bank_statement_import.py) instead of forcing the user to
// retype it from a paper statement every time. This tool never saves
// (frm.disable_save() in core's own refresh handler), so there's no risk of
// clobbering a persisted edit - only re-fetching on account/date change
// means a manual revision made mid-session survives until the context
// itself changes.

frappe.ui.form.on('Bank Reconciliation Tool', {
    refresh(frm) {
        fill_closing_balance(frm);
        watch_reconcile_dialog(frm);
        watch_main_table(frm);
    },
    bank_account(frm) {
        fill_closing_balance(frm);
        fill_from_date_after_opening_entry(frm);
    },
    bank_statement_to_date(frm) {
        fill_closing_balance(frm);
    },
});

// The page's own transaction list (frm.bank_reconciliation_data_table_
// manager.datatable, an HTML field "reconciliation_tool_dt" - see render()
// in bank_reconciliation_tool.js) is a *different* DataTable from the
// "Reconcile the Bank Transaction" dialog's voucher-match table further
// down this file - separate instance, separate columns (Date/Party Type/
// Party/Description/Deposit/Withdrawal/Unallocated Amount/Reference
// Number/Actions, from get_dt_columns() in data_table_manager.js), and it
// lives on the page itself rather than inside a modal. get_bank_
// transactions() rebuilds it (async frappe.call) every time bank_account
// or the date range changes, so this can't just run once on refresh - it
// has to keep re-asserting like the dialog's table does.
let main_table_interval_bound = false;

function watch_main_table(frm) {
    if (main_table_interval_bound) return;
    main_table_interval_bound = true;
    setInterval(() => fix_main_table_columns(frm), 400);
}

// Real content is wider than the char-count formula predicted for the
// dialog's voucher table too (Document Name/Reference Number both had to
// be pushed well past their "chars * 7px" estimate before they stopped
// clipping) - sized generously from the start here instead of repeating
// that same trial-and-error. This table lives on the page, not in a
// width-capped modal, so there's no fixed budget to split between columns
// the way the dialog's did - it can just scroll horizontally if the sum
// exceeds the viewport, same as any wide report.
const MAIN_TABLE_COLUMN_WIDTHS = {
    Date: 120,
    'Party Type': 110,
    Party: 70,
    Description: 600, // real bank statement descriptions ("TRSF E-BANKING DB 0807/FTSCY/WS95051 405405.00 REIMBURSE PEMB OUTLET ROSMALA") run 70-80+ chars
    Deposit: 170,
    Withdrawal: 170,
    'Unallocated Amount': 190, // header label itself is 19 chars, longer than most amounts
    'Reference Number': 170,
    Actions: 100,
};

function fix_main_table_columns(frm) {
    const manager = frm.bank_reconciliation_data_table_manager;
    const datatable = manager && manager.datatable;
    if (!datatable || !datatable.datamanager || !datatable.columnmanager) return;

    const body = datatable.wrapper;

    datatable.datamanager.getColumns(true).forEach((column) => {
        const width = MAIN_TABLE_COLUMN_WIDTHS[column.name];
        if (!width) return;
        apply_column_width(datatable, body, column.colIndex, width);
    });
}

// Core's own onload defaults "From Date" to "today minus 1 month"
// (bank_reconciliation_tool.js onload), which almost never lines up with
// when the account's Opening Entry was actually dated - Account Opening
// Balance (get_account_balance, till_date = from_date - 1) then silently
// reads 0 even though a real opening balance exists, because it's looking
// at the wrong side of the opening entry's date. Since onload always ends
// with frm.trigger("bank_account"), this rides that same trigger (fires
// on load if bank_account already has a value, and again on every manual
// change) rather than needing its own onload hook.
function fill_from_date_after_opening_entry(frm) {
    if (!frm.doc.bank_account) return;

    frappe.db.get_value('Bank Account', frm.doc.bank_account, 'account').then((r) => {
        const account = r.message && r.message.account;
        if (!account) return;

        frappe.call({
            method: 'garage.utils.bank_reconciliation.get_latest_opening_entry_date',
            args: { account },
            callback: (res) => {
                const opening_date = res.message;
                if (!opening_date) return;
                frm.set_value('bank_statement_from_date', frappe.datetime.add_days(opening_date, 1));
            },
        });
    });
}

// The per-transaction "Reconcile the Bank Transaction" dialog
// (erpnext/public/js/bank_reconciliation_tool/dialog_manager.js) is a
// plain frappe.ui.Dialog built from standard form fields, appended to
// document.body with no distinguishing class of its own - only its title
// text identifies it. Tag it with our own class the moment it appears so
// garage_desk.css can target it without leaking into every other dialog
// in the app. subtree:true also lets the same observer catch the voucher
// table rendering *inside* the already-open dialog (after get_linked_
// payments() resolves), which a childList-only, body-level watch would
// miss entirely.
let reconcile_dialog_observer_bound = false;

function watch_reconcile_dialog(frm) {
    if (reconcile_dialog_observer_bound) return;
    reconcile_dialog_observer_bound = true;

    new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                const modal = node.matches && node.matches('.modal')
                    ? node
                    : node.querySelector && node.querySelector('.modal');
                if (modal) {
                    const title = modal.querySelector('.modal-title');
                    if (title && title.textContent.trim() === 'Reconcile the Bank Transaction') {
                        modal.classList.add('grs-reconcile-dialog');
                        tag_filters_section(modal);
                        reposition_description_field(modal);
                    }
                }
            });
        });
    }).observe(document.body, { childList: true, subtree: true });

    // render_datatable() in dialog_manager.js builds this table with
    // layout:"fluid" (columns.length < 10) - frappe-datatable's fluid mode
    // actively recalculates/redistributes column widths on its own (see
    // distributeRemainingWidth() in the library), which can undo a one-off
    // width change applied right after construction. Re-asserting on an
    // interval - the same brute-force approach that ended up being needed
    // for the Preview table's header color earlier - guarantees this wins
    // regardless of when or how many times the library recalculates.
    setInterval(() => {
        fix_voucher_table_columns(frm);
        flatten_description_scrollbar();
        align_detail_field_inputs();
    }, 400);
}

// Description/Date (full-width .grs-description-row) vs Deposit/
// Withdrawal (.form-column) kept starting at different x positions even
// with matching 130px label widths and matching 8px container padding on
// both row types - something about the two different container structures
// (col-sm-12 standalone row vs col-sm-6 alongside a sibling column) still
// throws off the box-model math by a few px in a way that wasn't found by
// reading the CSS. Measured and corrected directly instead of guessing at
// another CSS rule: read each field's actual rendered left edge, then
// push whichever ones start too far left further right (margin-left) to
// match the one that starts furthest right. Re-running this on the same
// interval as the voucher table fix makes it self-correcting and stable -
// once a field is already aligned the measured delta is ~0 and nothing
// changes, so it doesn't fight itself on repeated calls.
function align_detail_field_inputs() {
    const modal = document.querySelector('.grs-reconcile-dialog');
    if (!modal) return;

    const wrappers = ['description', 'deposit', 'withdrawal']
        .map((fieldname) => {
            const control = modal.querySelector(`[data-fieldname="${fieldname}"]`);
            return control && control.querySelector('.control-input-wrapper, .control-value');
        })
        .filter(Boolean);
    if (wrappers.length < 2) return;

    wrappers.forEach((el) => el.style.removeProperty('margin-left'));

    const lefts = wrappers.map((el) => el.getBoundingClientRect().left);
    const target = Math.max(...lefts);

    wrappers.forEach((el, i) => {
        const delta = target - lefts[i];
        if (delta > 0.5) {
            el.style.setProperty('margin-left', `${delta}px`, 'important');
        }
    });
}

// CSS alone (overflow-y: hidden on [data-fieldname="description"]
// .control-value) didn't remove the scrollbar arrows the user kept
// reporting - either the CSS isn't reaching whichever element is actually
// scrollable, or something re-renders it with scroll capability again
// after the rule was applied. Rather than keep guessing which one it is
// from a screenshot, force it directly on every element inside the
// Description field that could possibly be the culprit (the real,
// normally-hidden <textarea> AND the read-only .control-value div both,
// since only one is actually visible but which one hasn't been provable
// without live DOM access) - inline styles win over any external CSS
// regardless of which is right, and this reruns on the same interval as
// the voucher table fix so it isn't a one-shot guess that can lose a
// timing race either.
function flatten_description_scrollbar() {
    const control = document.querySelector('.grs-reconcile-dialog [data-fieldname="description"]');
    if (!control) return;

    control.querySelectorAll('textarea, .control-value, .like-disabled-input').forEach((el) => {
        el.style.setProperty('overflow', 'hidden', 'important');
        el.style.setProperty('overflow-y', 'hidden', 'important');
        el.style.setProperty('overflow-x', 'auto', 'important');
        el.style.setProperty('resize', 'none', 'important');
    });
}

// The "Filters" section (Payment Entry/Journal Entry/.../Show Only Exact
// Amount toggles, all fieldtype Check) needs bigger checkboxes than the
// voucher table's row-select checkboxes a few sections below it in the same
// dialog - both are plain <input type="checkbox"> with no distinguishing
// class of their own, so a single dialog-wide selector can't size them
// differently. Its own .form-section has no id/class either, only its
// .section-head text ("Filters") identifies it - same workaround as tagging
// the modal itself in watch_reconcile_dialog above.
function tag_filters_section(modal) {
    modal.querySelectorAll('.form-section').forEach((section) => {
        const head = section.querySelector('.section-head');
        if (head && head.textContent.trim() === 'Filters') {
            section.classList.add('grs-filters-section');
        }
    });
}

// "Transaction Details" (details_section) renders as two side-by-side
// .form-columns - Date/Deposit/Withdrawal on the left, Description/
// Allocated Amount/Unallocated Amount on the right (see dialog_manager.js
// lines ~406-450). Pulling only Description out to a full-width row left
// the left column with 3 rows (Date, Deposit, Withdrawal) against the
// right column's 2 (Allocated Amount, Unallocated Amount) - an orphaned
// row with dead space next to it, not a clean grid. Date is pulled out
// too, onto its own full-width row right below Description, leaving a
// balanced 2x2 underneath: Deposit/Withdrawal on the left, Allocated/
// Unallocated Amount on the right.
//
// Section.make() (frappe/form/section.js) stamps the section's own
// fieldname onto the wrapper as data-fieldname="details_section" and
// wraps its columns in .section-body - each pulled field's .frappe-control
// is reinserted as a full-width (col-sm-12, matching the convention
// .form-section-description already uses) row above both columns.
function reposition_description_field(modal) {
    const section = modal.querySelector('.form-section[data-fieldname="details_section"]');
    if (!section) return;

    const body = section.querySelector('.section-body');
    if (!body) return;

    // Date is redundant here - it's already shown on the main table row
    // the user clicked to open this dialog in the first place - and
    // removing it also frees up a slot in the left column, leaving a
    // clean 2x2 (Deposit/Withdrawal left, Allocated/Unallocated Amount
    // right) under Description.
    const date_control = section.querySelector('[data-fieldname="date"]');
    if (date_control) date_control.style.setProperty('display', 'none', 'important');

    if (body.querySelector('.grs-description-row')) return;

    const description_control = section.querySelector('[data-fieldname="description"]');
    if (description_control) {
        const full_width_row = document.createElement('div');
        full_width_row.className = 'col-sm-12 grs-description-row';
        full_width_row.appendChild(description_control);
        body.insertBefore(full_width_row, body.firstChild);
    }

    // Label width for this section (Date/Deposit/Withdrawal/Description/
    // Allocated Amount/Unallocated Amount) is plain CSS in garage_desk.css
    // (.grs-reconcile-dialog [data-fieldname="..."] .control-label), one
    // fixed width shared by all six - no JS measurement/override here.
}

// get_dt_columns() in dialog_manager.js hard-codes Document Name's width
// to literally 1 (px) and gives every other column less room than its
// real content needs, so several render ellipsis-truncated.
//
// columnmanager.setColumnHeaderWidth() sets the header's width directly
// via element.style.width - immediate, reliable. columnmanager.
// setColumnWidth() instead injects a scoped CSS rule (Style.setStyle())
// targeting .dt-cell__content--col-N - that's why only the HEADER text
// stopped truncating earlier while every BODY row stayed cut off: the two
// methods don't use the same mechanism, and the CSS-injection one wasn't
// taking visual effect here. Body cells are now widened the same direct
// way as the header - no CSS injection, no guessing whether it landed.
//
// Widths are chars * ~7px (this table's 12px font) + 16px cell padding
// (padding: 4px 8px, both sides):
//   - "tight" (+6px): columns whose content is a FIXED format, same
//     length on every row - Document Type ("Payment Entry"/"Journal
//     Entry", both 13 chars), Reference Date ("DD-MM-YYYY", always 10),
//     Document Name ("ACC-JV-YYYY-NNNNN", always 17), Reference Number
//     ("ACC-BTN-YYYY-NNNNN", always 18, since submit_to_qc-adjacent code
//     sets cheque_no = the bank transaction's own name) - no estimation
//     uncertainty, so no need for a generous margin.
//
//     The char count that matters is whichever is LONGER, the data or the
//     column's own header LABEL - the header text renders in the same
//     .dt-cell__content at the same 12px font. "Reference Date" the label
//     is 14 chars, longer than "08-07-2026" the data (10) - sizing off the
//     data alone left the header itself truncated ("Reference ..."), which
//     is the exact bug reported. Each width below is now
//     max(header_chars, data_chars).
//
//     These are left at their exact size below regardless of modal width -
//     widening a fixed-format column just pads empty space its content can
//     never use.
//   - Remaining/Party (a currency amount and a name - both genuinely
//     variable-length) instead split whatever space is left in the modal
//     after the fixed columns, so the table fills the dialog's actual
//     width rather than leaving dead space past the last column. See the
//     comment on VOUCHER_TABLE_COLUMN_WIDTHS below for that math - it has
//     to be kept in sync with .grs-reconcile-dialog .modal-dialog's
//     max-width in garage_desk.css if that ever changes again.
const CHAR_WIDTH_PX = 7;
const CELL_PADDING_PX = 16;

function width_tight(chars) {
    return chars * CHAR_WIDTH_PX + CELL_PADDING_PX + 6;
}

function width_loose(chars) {
    return chars * CHAR_WIDTH_PX + CELL_PADDING_PX + 16;
}

// Fixed-format columns stay at their exact needed size (widening them
// further just pads empty space inside a cell whose content can never use
// it). The modal was widened to 1100px on request, well past what the
// table strictly needs - rather than leave the extra space as dead space
// to the right of the last column ("pincang"), it's handed to the two
// columns whose content actually varies (Remaining: a currency amount;
// Party: a name) so the table fills the modal's real width.
// content area (1100 modal - 40 modal-body padding) 1060: checkbox 30 +
// serial 35 + Document Type 113 + Document Name 187 + Reference Date 120 +
// Remaining 190 + Reference Number 210 + Party 100 = 985, deliberately
// under the 1060 available (rather than exactly filling it) so border/
// scrollbar overhead across 8 columns doesn't push the table into a
// horizontal scrollbar. Document Name and Reference Number both needed
// notably more than the char-count formula predicted (~7px/char was an
// underestimate for this ALL-CAPS+digit+dash content - real data kept
// clipping until pushed well past that) - Party (empty on every demo row,
// only needs to fit its own 5-char header label) is what gave up the
// space for both.
const VOUCHER_TABLE_COLUMN_WIDTHS = {
    'Document Type': width_tight(13), // header "Document Type" (13) == data "Payment Entry"/"Journal Entry" (13)
    'Document Name': 187, // width_tight(17) (141) still clipped real data - widened further, taking the extra px from Remaining below (which had slack to spare)
    'Reference Date': width_tight(14), // header "Reference Date" (14) > data "08-07-2026" (10)
    'Reference Number': 210, // width_tight(18) (148) still clipped real data, same as Document Name above
    Remaining: 190,
    Party: 100, // empty on every demo row - only needs to fit its own "Party" header label
};

function apply_column_width(datatable, body, colIndex, width) {
    datatable.datamanager.updateColumn(colIndex, { width });
    datatable.columnmanager.setColumnHeaderWidth(colIndex);
    if (!body) return;
    body.querySelectorAll(`.dt-cell__content--col-${colIndex}`).forEach((el) => {
        el.style.width = width + 'px';
    });
}

function fix_voucher_table_columns(frm) {
    const dialog_manager = frm.bank_reconciliation_data_table_manager
        && frm.bank_reconciliation_data_table_manager.dialog_manager;
    const datatable = dialog_manager && dialog_manager.datatable;
    if (!datatable || !datatable.datamanager || !datatable.columnmanager) return;

    // datatable.wrapper is the raw DOM node passed at construction
    // (proposals_wrapper.get(0) in dialog_manager.js) - datatableWrapper
    // is a jQuery-wrapped '.datatable' *inside* it, which has no
    // querySelectorAll of its own.
    const body = datatable.wrapper;

    datatable.datamanager.getColumns(true).forEach((column) => {
        const width = VOUCHER_TABLE_COLUMN_WIDTHS[column.name];
        if (!width) return;
        apply_column_width(datatable, body, column.colIndex, width);
    });
    // Checkbox column left at its 32px library default - widening it to
    // 50px stretched the checkbox input itself out of its square shape
    // instead of just adding breathing room around it.

    bind_live_allocation(dialog_manager, datatable);
}

// Checking a voucher's row in this table doesn't touch Allocated Amount/
// Unallocated Amount at all client-side - those two fields only get
// recomputed server-side, inside reconcile_vouchers() -> allocate_payment_
// entries()/update_allocated_amount() (bank_transaction.py), which only
// runs once the dialog's primary action actually submits. There's no
// preview of what a selection will do until after it's already done -
// this makes it live instead, previewing the same MIN(sum of selected
// amounts, remaining unallocated) capping rule the server itself applies
// (allocate_payment_entries()'s "0 < a, a > u: allocate u" branch), so a
// selection's effect is visible before committing to it.
function bind_live_allocation(dialog_manager, datatable) {
    if (datatable.__grs_live_allocation_bound) return;
    datatable.__grs_live_allocation_bound = true;
    datatable.on('onCheckRow', () => update_live_allocation(dialog_manager, datatable));
}

// "Remaining" (the voucher's own outstanding amount) has no format()
// function in get_dt_columns() (dialog_manager.js) - it's stored in the
// cell as the already-formatted display string
// (format_currency(row["paid_amount"], row["currency"]) from format_row())
// rather than a raw number, so it has to be parsed back out. Site-wide
// number format here is Indonesian Rupiah ("Rp 1.234.567,00" - "." as the
// thousands separator, "," as the decimal separator, matching every
// currency value already seen throughout this app), not the general
// case - stripping everything but digits/comma/minus and swapping the
// decimal comma for a dot is enough for that one format.
function parse_rupiah(text) {
    if (!text) return 0;
    const cleaned = String(text).replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

function update_live_allocation(dialog_manager, datatable) {
    const original_unallocated = flt(dialog_manager.bank_transaction
        && dialog_manager.bank_transaction.unallocated_amount);

    const check_map = datatable.rowmanager.checkMap || [];
    let selected_total = 0;
    check_map.forEach((checked, row_index) => {
        if (!checked) return;
        const row = datatable.datamanager.getRow(row_index);
        const remaining_cell = row && row[5];
        if (remaining_cell) selected_total += parse_rupiah(remaining_cell.content);
    });

    const allocated = Math.min(selected_total, original_unallocated);
    const unallocated = original_unallocated - allocated;
    const excess = selected_total - original_unallocated;

    dialog_manager.dialog.set_value('allocated_amount', allocated);
    dialog_manager.dialog.set_value('unallocated_amount', unallocated);

    show_allocation_state(dialog_manager, unallocated, excess);
    toggle_primary_action(dialog_manager, excess);
}

// Three states for Unallocated Amount, all mutually exclusive:
//   - over-allocated (excess > 0): selected total exceeds what's left to
//     allocate. Capping Allocated Amount at the transaction's own
//     unallocated_amount (above) mirrors what the server will actually
//     apply, but on its own that's misleading, not just incomplete -
//     over-select and Unallocated Amount still shows a clean 0, looking
//     like a perfect match, while allocate_payment_entries()
//     (bank_transaction.py) silently gives 0 allocation to whichever
//     selected voucher(s) it didn't get to before the transaction's own
//     remaining amount ran out - no error, they just don't end up linked
//     with anything. Red warning text + red field so this isn't hidden
//     inside a clean-looking 0.
//   - fully matched (unallocated == 0 and no excess): selected total
//     lands exactly on the transaction's remaining amount - green field +
//     a MATCH badge as positive confirmation before submitting.
//   - partial (unallocated > 0, no excess): still short - left in its
//     normal, unstyled state.
function show_allocation_state(dialog_manager, unallocated, excess) {
    const control = dialog_manager.dialog.fields_dict.unallocated_amount;
    if (!control) return;

    let $warning = control.$wrapper.find('.grs-over-allocation-warning');
    if (!$warning.length) {
        $warning = $('<div class="grs-over-allocation-warning"></div>').appendTo(control.$wrapper);
    }
    let $badge = control.$wrapper.find('.grs-match-badge');
    if (!$badge.length) {
        $badge = $('<div class="grs-match-badge">MATCH</div>').appendTo(control.$wrapper);
    }

    const is_over = excess > 0.005;
    const is_match = !is_over && unallocated <= 0.005;

    control.$wrapper.toggleClass('grs-over-allocated', is_over);
    control.$wrapper.toggleClass('grs-fully-matched', is_match);

    if (is_over) {
        const formatted = format_currency(excess, dialog_manager.bank_transaction
            && dialog_manager.bank_transaction.currency);
        $warning.text(`Kelebihan pilih ${formatted} - voucher yang kelebihan itu TIDAK akan ke-alokasi kalau lanjut submit.`);
    }
    $warning.toggle(is_over);
    $badge.toggle(is_match);
}

// Matching only makes sense while the dialog is actually in "Match
// Against Voucher" mode - "Create Voucher"/"Update Bank Transaction" use
// the same primary button for something unrelated to the voucher
// selection total, so the block only applies to that one action.
function toggle_primary_action(dialog_manager, excess) {
    const action = dialog_manager.dialog.get_value('action');
    const should_block = action === 'Match Against Voucher' && excess > 0.005;
    dialog_manager.dialog.get_primary_btn().prop('disabled', should_block);
}

function fill_closing_balance(frm) {
    if (!frm.doc.bank_account || !frm.doc.bank_statement_to_date) return;

    frappe.db.get_list('Bank Transaction', {
        filters: {
            bank_account: frm.doc.bank_account,
            date: ['<=', frm.doc.bank_statement_to_date],
        },
        fields: ['balance'],
        order_by: 'date desc, creation desc',
        limit: 1,
    }).then((rows) => {
        if (!rows.length) return;
        const balance = rows[0].balance;
        if (!balance) return;
        frm.set_value('bank_statement_closing_balance', balance);
    });
}
