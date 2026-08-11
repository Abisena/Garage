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
        add_allocated_column(frm);
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
//
// The interval itself is only ever created once (main_table_interval_
// bound), but it used to close over whichever `frm` was passed in on that
// first refresh() and never update - if this page gets left/re-visited
// several times in the same tab and Frappe hands refresh() a *new* frm
// object on a later visit (this tool never persists, so there's no saved
// document identity keeping it stable the way a normal doctype's frm is),
// the interval kept quietly polling the old, detached one while the
// visible page's real table never got touched. latest_frm is updated on
// every refresh() and is what the interval actually reads from.
let main_table_interval_bound = false;
let latest_frm = null;

function watch_main_table(frm) {
    latest_frm = frm;
    if (main_table_interval_bound) return;
    main_table_interval_bound = true;
    setInterval(() => fix_main_table_columns(latest_frm), 400);
    // Slower cadence than the column-width fix on purpose - this one does
    // a network round trip (get_allocated_amounts), and the info it shows
    // is only ever informational, not layout-critical, so a couple-second
    // lag after a reconcile action is an acceptable trade for not hammering
    // the server on every 400ms tick.
}

// A partially-reconciled row's Unallocated Amount column tells you SOME of
// the deposit/withdrawal is unaccounted for, but not how much already got
// matched - finding that out otherwise means opening the Bank Transaction
// record directly. A genuine extra column ("Allocated") shows it inline
// instead - frappe-datatable has no addColumn() API for a table that's
// already been constructed (only removeColumn()), so this works by
// patching three DataTableManager.prototype methods ONCE, before core's
// own class ever builds an instance: get_dt_columns() (adds the column
// definition), make_dt() (also fetches allocated_amount alongside the
// normal transaction fetch, since core's own get_bank_transactions never
// returns it at all), and format_row() (returns the per-row value at the
// same array position the new column sits at). Patched at the prototype
// level, not per-instance, because render() (core, bank_reconciliation_
// tool.js) constructs a BRAND NEW DataTableManager every time the account/
// date range changes - an instance-level patch would only ever survive
// until the next one of those.
//
// The Actions button's own click handling (set_listeners(), data_table_
// manager.js) is delegated by CSS class + a data-name attribute read off
// whichever .btn was actually clicked - not by column index or count - so
// it's unaffected by another column existing.
let allocated_column_patched = false;

function add_allocated_column(frm) {
    if (allocated_column_patched) return;
    const DataTableManager = erpnext.accounts
        && erpnext.accounts.bank_reconciliation
        && erpnext.accounts.bank_reconciliation.DataTableManager;
    if (!DataTableManager) return;
    allocated_column_patched = true;

    const ALLOCATED_COLUMN_NAME = 'Allocated';

    const original_get_dt_columns = DataTableManager.prototype.get_dt_columns;
    DataTableManager.prototype.get_dt_columns = function () {
        original_get_dt_columns.call(this);
        const insert_at = this.columns.findIndex((c) => c.name === __('Unallocated Amount')) + 1;
        this.columns.splice(insert_at, 0, {
            name: ALLOCATED_COLUMN_NAME,
            editable: false,
            sortable: false,
            width: 110,
            format: (value) => (value
                ? `<span style="color:#c2410c;font-weight:600;">${format_currency(value, this.currency)}</span>`
                : ''),
        });
    };

    // Fixed index, NOT looked up via this.columns - make_dt() (both core's
    // original and the patched version below) calls format_data() (which
    // calls this per row) BEFORE get_dt_columns(), so this.columns doesn't
    // exist yet the first time this runs for a fresh instance -
    // this.columns.findIndex(...) throwing TypeError: Cannot read
    // properties of undefined right here is what silently killed the
    // whole table (the exception aborts make_dt()'s callback before it
    // ever reaches get_datatable(), so nothing renders at all - "data gak
    // tampil sama sekali" with no visible error). The original format_row
    // always returns exactly 9 values in a fixed order (date, party_type,
    // party, description, deposit, withdrawal, unallocated_amount,
    // reference_number, actions) - index 7 sits right after unallocated_
    // amount(6), matching where get_dt_columns() below inserts the column
    // definition. Logged instead of silently misaligning data if a future
    // ERPNext update ever changes that fixed shape.
    const original_format_row = DataTableManager.prototype.format_row;
    DataTableManager.prototype.format_row = function (row) {
        const formatted = original_format_row.call(this, row);
        if (formatted.length !== 9) {
            console.error(
                'garage: Bank Reconciliation Tool format_row() returned',
                formatted.length,
                'values, expected 9 - "Allocated" column insertion skipped, core layout may have changed.'
            );
            return formatted;
        }
        formatted.splice(7, 0, row['allocated_amount'] || 0);
        return formatted;
    };

    // Reimplements make_dt() end to end rather than wrapping it, since the
    // part that needs to change (what happens inside get_bank_transactions'
    // own callback, before format_data() runs) is nested inside that
    // callback, not something a wrapper could intercept from outside. If
    // core ever changes make_dt()'s own implementation in a future ERPNext
    // update, this override won't pick up that change automatically - kept
    // as close to the original structure as possible to minimize that risk.
    DataTableManager.prototype.make_dt = function () {
        const me = this;
        frappe.call({
            method: 'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_bank_transactions',
            args: {
                bank_account: this.bank_account,
                from_date: this.bank_statement_from_date,
                to_date: this.bank_statement_to_date,
            },
            callback: function (response) {
                const transactions = response.message || [];
                const names = transactions.map((t) => t.name);

                const finish = (allocated_by_name) => {
                    transactions.forEach((t) => {
                        t.allocated_amount = allocated_by_name[t.name] || 0;
                    });
                    me.format_data(transactions);
                    me.get_dt_columns();
                    me.get_datatable();
                    me.set_listeners();
                };

                if (!names.length) {
                    finish({});
                    return;
                }

                frappe.call({
                    method: 'garage.utils.bank_reconciliation.get_allocated_amounts',
                    args: { names },
                    callback: (r) => finish(r.message || {}),
                });
            },
        });
    };
}

// First pass at these widths (Description: 600) treated this table like
// the dialog's - "no fixed budget, just scroll if it doesn't fit" - but
// that's exactly what the user then flagged as "gak compact lagi... scroll
// horizontal muncul lagi": a page users land on directly (not a modal they
// opened to do one focused task) reads as broken with a scrollbar, not
// "expected for a wide report". A second pass then kept the total under a
// fixed, modest ~1300px so it comfortably fits without scrolling - but on
// an ordinary wide desktop screen, "modest" just left a wide dead strip of
// empty page to the right of the table, since the actual container is
// nearly always wider than 1300px on a normal monitor. Description is now
// the one column WITHOUT a fixed width - see fix_main_table_columns below,
// which hands it whatever's actually left over in the real container each
// time, so it fills a wide screen instead of leaving that gap, while a
// narrower window still shrinks it down (never below its old 320px)
// instead of reintroducing the horizontal scrollbar.
const MAIN_TABLE_COLUMN_WIDTHS = {
    Date: 115, // 100 clipped "24-05-2026" (10 chars) to "24-05-20..."
    'Party Type': 90,
    Party: 70,
    // Floors, not fixed sizes. Used to be sized off just the HEADER text
    // ("Deposit"=7 chars, "Withdrawal"=10) rather than the actual money
    // values these columns hold ("Rp 187.000,00" is 13 chars on its own,
    // more for anything in the millions) - fit the header fine, clipped
    // real data every time, reported directly by the user ("kolom deposit
    // kepotong"). Sized off a realistic value length instead now (14
    // chars ~ "Rp 9.999.999,00", chars*7+16+6 same width_tight formula as
    // before, inlined for the same temporal-dead-zone reason). Both
    // Deposit and Withdrawal use the same floor since they hold the same
    // kind of content - only the header label differs, not the data.
    // fix_main_table_columns() below still grows these past this floor,
    // up to MAIN_TABLE_AMOUNT_MAX_WIDTH, using whatever room is actually
    // spare - raising the floor just means Description (which reserves
    // room for this floor before taking its own share - see that
    // reservation's own comment below) gives up exactly the width these
    // two needed, instead of the table growing past what the screen
    // actually fits.
    Deposit: 135, // width_tight(16), "Rp 6.096.493,00"-length (16 chars) still clipped at 120
    Withdrawal: 135, // same content shape as Deposit, same floor
    'Unallocated Amount': 150,
    // Floor, not a fixed size, same as Deposit/Withdrawal above - added by
    // add_allocated_column()'s patch to get_dt_columns(), and the library's
    // own fluid-layout recalculation would otherwise be free to resize it
    // away from the 110px it's defined with. fix_main_table_columns() below
    // grows it past this floor with whatever's left after Deposit/
    // Withdrawal take their own share, up to MAIN_TABLE_AMOUNT_MAX_WIDTH.
    Allocated: 110,
    'Reference Number': 70,
    Actions: 90,
};
// Explicit user request: MIN pinned equal to MAX (both 497.5) forced
// Description to that exact width unconditionally, ignoring how much room
// was actually free (the whole point of the available - other_total
// computation below) - fine on whatever screen that value happened to be
// tuned against, but a real horizontal scrollbar on any narrower one,
// which is exactly the failure mode this dynamic sizing exists to avoid
// in the first place. Genuine floor restored instead - low enough that
// the table always fits without scrolling regardless of window size, at
// the cost of Description reading as tight (not empty/unreadable) on a
// narrow screen rather than forcing overflow.
const MAIN_TABLE_DESCRIPTION_MIN_WIDTH = 200;
// "Fill 100% of whatever's left over" (the original fix for the dead-space
// bug) turned into its own problem once the space really was available:
// Description stretching to fill nearly the whole table isn't "compact",
// and on some layouts the sum of every column's width came out a few px
// over what the container could actually hold without a horizontal
// scrollbar (rounding/border overhead across 10 columns adds up). Capped
// here instead - Description grows to fill available space same as
// before, but only up to a size that still reads as one compact table,
// not a lopsided one dominated by a single free-text column.
const MAIN_TABLE_DESCRIPTION_MAX_WIDTH = 497.5;

// Ceiling for Deposit/Withdrawal's growth past their header-sized floor -
// letting them eat 100% of the leftover space (an earlier version of this
// did exactly that) made them balloon far past anything a currency value
// actually needs on a wide screen, which read as "kelebaran", not compact.
// Capped instead at what the data itself needs: "Rp 90.000.000,00" (an
// actual value already seen in this table) is 16 characters -
// chars*7+16+16 (CHAR_WIDTH_PX/CELL_PADDING_PX/width_loose, defined
// further down this file) = 144, inlined as a plain number for the same
// temporal-dead-zone reason as the floors above. Whatever's left over
// beyond this cap is deliberately left unused, same as Description's own
// cap just above - "compact" outranks "fill every last pixel" here too.
const MAIN_TABLE_AMOUNT_MAX_WIDTH = 144; // width_loose(16), "Rp 90.000.000,00" = 16 chars

// Used to walk up through ancestors and take whichever reported the
// LARGEST clientWidth, on the theory that the field wrapper's own
// clientWidth had, more than once, turned out narrower than the page
// actually had room for (a not-yet-settled layout on the tick this first
// runs, etc.). That "widest ancestor" turned out to be exactly the wrong
// thing to optimize for though - confirmed live: on a completely normal
// desk layout, some ancestor further up genuinely IS wider than the field
// wrapper itself (page padding/sidebar consuming space an outer container
// doesn't know about), so "widest" doesn't mean "actually available" -
// fix_main_table_columns() ended up sizing Description (and by extension
// Deposit/Withdrawal/Allocated) off that inflated number, overflowing the
// field wrapper's own real width and forcing exactly the horizontal
// scrollbar this whole dynamic-sizing function exists to avoid - reported
// directly by the user. The field wrapper's own clientWidth (`el`, always
// reconciliation_tool_dt's own DOM node - see get_field() in
// fix_main_table_columns() below) is what actually constrains how wide
// the table can render without scrolling, so this trusts it directly now;
// only truly falls back to walking up if it reads exactly 0 (the one
// case that really does mean "not rendered/settled yet", not just
// "narrower than something else on the page").
function get_widest_ancestor_width(el) {
    if (el.clientWidth) return el.clientWidth;
    let node = el.parentElement;
    let hops = 0;
    while (node && hops < 10) {
        if (node.clientWidth) return node.clientWidth;
        if (node.classList && node.classList.contains('page-content')) break;
        node = node.parentElement;
        hops++;
    }
    return 0;
}

function fix_main_table_columns(frm) {
    const manager = frm.bank_reconciliation_data_table_manager;
    const datatable = manager && manager.datatable;
    if (!datatable || !datatable.datamanager || !datatable.columnmanager) return;

    const body = datatable.wrapper;
    if (!body) return;

    // getColumns(true), not (false) - was the actual cause of the
    // horizontal scrollbar reported directly by the user: (true) silently
    // drops the checkbox/serial-number column (name: null - confirmed
    // live, an 11th column at colIndex 0, ~40px, that just never showed up
    // in this array at all), so `other_total` below undercounted the row's
    // real width by however wide that column actually renders, and every
    // dynamic column downstream (Description first, then Deposit/
    // Withdrawal/Allocated off Description's own leftover) ended up sized
    // ~40px too generous for the row to actually fit without scrolling.
    // (false) still safely skips touching that column's own width in the
    // forEach further below - its name is null, so it never matches
    // dynamic_widths or MAIN_TABLE_COLUMN_WIDTHS and apply_column_width()
    // is never called for it - this only changes whether its EXISTING
    // width gets counted in the sum, not whether it gets resized.
    const columns = datatable.datamanager.getColumns(false);

    // Sums every column's ACTUAL current width except Description, Deposit,
    // Withdrawal and Allocated - those four are sized dynamically below, off
    // whatever's left once this total is known. Everything else (including
    // checkbox/serial-number, no entry in MAIN_TABLE_COLUMN_WIDTHS, so it
    // falls back to column.width, whatever the library already assigned
    // during its own initial render) stays fixed.
    const DYNAMIC_COLUMN_NAMES = ['Description', 'Deposit', 'Withdrawal', 'Allocated'];
    const other_total = columns.reduce((sum, column) => {
        if (DYNAMIC_COLUMN_NAMES.includes(column.name)) return sum;
        const width = MAIN_TABLE_COLUMN_WIDTHS[column.name] || column.width || 0;
        return sum + width;
    }, 0);

    // datatable.wrapper (used as `body` above, for the actual column-width
    // DOM writes) is frappe-datatable's OWN internal node - it sizes
    // itself to fit its content (the columns' own widths), so measuring
    // clientWidth on IT is circular: "how much room is free" kept coming
    // back as "basically however much the columns already add up to",
    // which is why Description barely grew no matter how wide the actual
    // screen was. The HTML field's own wrapper (reconciliation_tool_dt -
    // see erpnext's bank_reconciliation_tool.js/data_table_manager.js,
    // $reconciliation_tool_dt) is the real page column the datatable sits
    // inside - THAT element's width reflects the actual available space,
    // independent of whatever the library does with its own internal node.
    const field = frm.get_field('reconciliation_tool_dt');
    const container = field && field.$wrapper && field.$wrapper[0];
    if (!container) return;

    // 24px of slack (border/scrollbar rounding across 10 columns adds up
    // more than the 4px this used to reserve - that was occasionally just
    // enough over to trigger the exact horizontal scrollbar this whole
    // dynamic-width approach exists to avoid) - other_total already
    // accounts for every column that isn't Description, measured rather
    // than estimated.
    //
    // Whatever's left over once Description hits MAIN_TABLE_DESCRIPTION_
    // MAX_WIDTH is deliberately left unused (not handed out to the other
    // columns) - an earlier version of this function DID redistribute it,
    // to avoid a dead strip of empty page on a wide screen, but that's
    // explicitly NOT what's wanted here: every other column should stay at
    // its own compact, defined size regardless of how much room is left
    // over - "compact" outranks "fill every last pixel" for this table.
    const available = get_widest_ancestor_width(container);
    const buffer = 24;

    // Deposit/Withdrawal/Allocated's own floors have to be reserved BEFORE
    // Description claims its share, not after - explicit user request
    // ("gara2 itu layarnya gak compact... muncul scroll bar horizontal").
    // The original version computed description_width off `available -
    // other_total` alone, with no idea those three floors (273px combined)
    // still needed to come out of that same available space - so on a
    // container wide enough to let Description hit MAIN_TABLE_DESCRIPTION_
    // MAX_WIDTH by that math alone, but not wide enough for MAX_WIDTH
    // *plus* all three floors too, the total column width silently ran
    // past the container's real width and forced a horizontal scrollbar,
    // even though every individual column looked "capped" or "at its
    // floor" in isolation. Carving these floors out up front guarantees
    // the whole row fits at minimum (everyone at their floor, Description
    // at whatever's genuinely left), the same guarantee Description's own
    // MIN_WIDTH clamp below was supposed to provide but couldn't on its
    // own once these three floors were left out of the sum entirely.
    const deposit_floor = MAIN_TABLE_COLUMN_WIDTHS.Deposit;
    const withdrawal_floor = MAIN_TABLE_COLUMN_WIDTHS.Withdrawal;
    const allocated_floor = MAIN_TABLE_COLUMN_WIDTHS.Allocated;
    const description_width = Math.min(
        MAIN_TABLE_DESCRIPTION_MAX_WIDTH,
        Math.max(
            MAIN_TABLE_DESCRIPTION_MIN_WIDTH,
            available - other_total - deposit_floor - withdrawal_floor - allocated_floor - buffer
        )
    );

    // Whatever's still unused after Description takes its (capped) share
    // goes here instead of nowhere - split evenly between Deposit and
    // Withdrawal, on top of their own header-sized floor from MAIN_TABLE_
    // COLUMN_WIDTHS, but never past MAIN_TABLE_AMOUNT_MAX_WIDTH each - past
    // that point there's nothing left in the actual data to justify the
    // width, so it's NOT left unused past this point like Description's own
    // cap above - it rolls into Allocated instead, below, since that's a
    // fourth same-shaped currency column with the exact same floor/cap
    // logic and was flagged as the one still worth widening once Deposit/
    // Withdrawal stop being able to use any more of it themselves.
    const leftover = Math.max(
        0,
        available - other_total - description_width
            - deposit_floor - withdrawal_floor - allocated_floor - buffer
    );
    const deposit_width = Math.min(
        MAIN_TABLE_AMOUNT_MAX_WIDTH,
        deposit_floor + Math.floor(leftover / 2)
    );
    const withdrawal_width = Math.min(
        MAIN_TABLE_AMOUNT_MAX_WIDTH,
        withdrawal_floor + Math.ceil(leftover / 2)
    );
    // Whatever Deposit/Withdrawal couldn't use because they'd already hit
    // their own cap goes to Allocated on top of ITS floor, capped the same
    // way - genuinely unused space (beyond even that) is only then left
    // blank, same principle as Description, just one column further down
    // the chain.
    const deposit_over_cap = leftover / 2 - (deposit_width - deposit_floor);
    const withdrawal_over_cap = leftover / 2 - (withdrawal_width - withdrawal_floor);
    const allocated_extra = Math.max(0, deposit_over_cap) + Math.max(0, withdrawal_over_cap);
    const allocated_width = Math.min(
        MAIN_TABLE_AMOUNT_MAX_WIDTH,
        allocated_floor + Math.floor(allocated_extra)
    );

    const dynamic_widths = {
        Description: description_width,
        Deposit: deposit_width,
        Withdrawal: withdrawal_width,
        Allocated: allocated_width,
    };
    columns.forEach((column) => {
        const width = Object.prototype.hasOwnProperty.call(dynamic_widths, column.name)
            ? dynamic_widths[column.name]
            : MAIN_TABLE_COLUMN_WIDTHS[column.name];
        if (!width) return;
        apply_column_width(datatable, body, column.colIndex, width);
    });

    // A column's own cell width (set just above) isn't what determines how
    // wide the table renders overall - frappe-datatable caps its scrollable
    // viewport (setBodyStyle(), datatable.js) at the OUTER .datatable/.dt-
    // scrollable/.dt-row elements' own width, which never grew just because
    // one column's stored width changed - Description's cell content got
    // wider under the hood, but the table's visible footprint stayed
    // clipped at its old size. Trying to re-measure and re-write that outer
    // width by hand on the same polling interval (an earlier version of
    // this function did exactly that) was racing the library's own re-
    // renders - fragile, and whichever write landed last each tick decided
    // what was visible. Handled once, permanently, via CSS instead - see
    // [data-fieldname="reconciliation_tool_dt"] rules in garage_desk.css:
    // the library sets
    // these widths with plain `el.style.width = ...` (frappe-datatable.js
    // $.style()), no !important, so a stylesheet rule that DOES use
    // !important always wins over it regardless of write order or timing,
    // no race to lose.
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

// columnmanager.setColumnHeaderWidth() sets a header cell's width via a
// cache (this.$columnMap[colIndex]) that's populated once and never
// invalidated - if the datatable's header DOM ever gets rebuilt (a fresh
// frappe.call rebuilding this table's data on a bank_account/date-range
// change, or a dialog re-render), $columnMap keeps pointing at the old,
// now-detached header cells. Calling setColumnHeaderWidth() again after
// that silently widens nodes nobody can see, while the real header stays
// at its default width - this is what caused "Party Type"/"Reference
// Number" etc. to render truncated again despite this function having
// already run successfully once before. Root-caused and fixed the same
// way for the Bank Statement Import preview table
// (bca_bank_statement_import.py's sibling, bank_statement_import.js) -
// queried directly via querySelectorAll here too, same as the body cells
// right below, so there's no cache to go stale regardless of how many
// times the header gets rebuilt.
function apply_column_width(datatable, body, colIndex, width) {
    datatable.datamanager.updateColumn(colIndex, { width });
    if (!body) return;
    body.querySelectorAll(`.dt-cell__content--header-${colIndex}`).forEach((el) => {
        el.style.width = width + 'px';
    });
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
