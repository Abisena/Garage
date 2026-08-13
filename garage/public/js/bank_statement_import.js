// Restyles the core "Import File Errors and Warnings" section, which
// ERPNext (bank_statement_import.js show_import_warnings) renders as one
// plain unstyled <h5>/<ul><li> block PER ROW. For a bad CSV that's usually
// the same message repeated for every single row (e.g. "Row has less
// values than columns" x 50), which is unreadable as an endless scroll of
// near-duplicate cards. We don't own that core file, so instead of forking
// it we watch the field's wrapper for the DOM it injects, then re-render
// the same underlying data grouped by message text - one card per distinct
// problem, with the affected row numbers compressed into ranges.

frappe.ui.form.on('Bank Statement Import', {
    refresh(frm) {
        watch_import_warnings(frm);
        watch_preview_datatable(frm);
        force_hide_import_log(frm);
    },
});

// Found the actual culprit by reading frappe's own desk-level SCSS
// (frappe/public/scss/desk/frappe_datatable.scss) instead of just
// frappe-datatable's bundled CSS: Frappe paints the header background on
// the *child* `.dt-cell__content`, not the `.dt-cell--header` cell itself
// (`.dt-cell--header .dt-cell__content { background-color: var(--subtle-
// fg); }`). That child sits directly on top of and fully covers the
// parent's padding-box, so every previous attempt at coloring the parent
// cell was already working - just invisible underneath the child's own
// background. Text color changes were visible earlier because color IS
// set on the right element; only background was on the wrong one. A
// MutationObserver (same pattern as watch_import_warnings below) is enough
// once you're styling the right element - no polling needed.
function watch_preview_datatable(frm) {
    const field = frm.get_field('import_preview');
    if (!field || !field.$wrapper) return;

    const node = field.$wrapper[0];
    if (frm.__bsip_node !== node) {
        if (frm.__bsip_observer) frm.__bsip_observer.disconnect();
        frm.__bsip_observer = new MutationObserver(() => {
            paint_preview_header(frm);
            resize_preview_columns(frm);
            simplify_date_header(frm);
            bind_preview_pagination(frm);
            add_preview_row_borders(frm);
        });
        frm.__bsip_observer.observe(node, { childList: true, subtree: true });
        frm.__bsip_node = node;
    }

    paint_preview_header(frm);
    resize_preview_columns(frm);
    simplify_date_header(frm);
    add_preview_row_borders(frm);
    bind_preview_resize_listener(frm);
    bind_preview_pagination(frm);
}

// Core's own Preview is hard-capped at 10 rows *server-side*
// (frappe/core/doctype/data_import/importer.py - MAX_ROWS_IN_PREVIEW = 10,
// out.data = out.data[:MAX_ROWS_IN_PREVIEW]) - rows past the 10th are
// never even sent to the browser, so there's nothing to page through on
// that endpoint. Paginated against garage.utils.bca_bank_statement_import.
// get_cleaned_preview_page() instead, which reads the same cleaned file
// directly and isn't limited that way - swapping the existing datatable's
// rows via its own .refresh() rather than building a second table.
function bind_preview_pagination(frm) {
    const field = frm.get_field('import_preview');
    if (!field || !field.$wrapper) return;
    if (!frm.doc.name || frm.doc.name.startsWith('New ')) return;

    // NOT "have I ever added this for this doc" - show_import_preview()
    // (core, bank_statement_import.js) calls ImportPreview.refresh() ->
    // make_wrapper() -> this.wrapper.html(...) on the *exact same*
    // field.$wrapper this bar lives in, wiping every child out (this bar
    // included) on every re-render, e.g. every time frm.refresh() re-fires
    // the preview fetch. A "just once per doc" guard here meant the bar
    // got removed by that wipe and then never came back, since the
    // MutationObserver in watch_preview_datatable calls this function
    // again afterwards but that guard was blocking it from re-adding
    // anything. Checked against what's actually in the DOM right now
    // instead, so it gets rebuilt every time core wipes it out.
    if (field.$wrapper.find('.bsip-pagination').length) return;

    // frm is the *same* form controller object across a navigation from
    // one Bank Statement Import document to another (Frappe doesn't
    // rebuild it per document, only reloads frm.doc) - __bsip_preview_page
    // being merely "undefined the first time" meant it kept whatever page
    // number was left over from the *previous* document once set, instead
    // of starting fresh on the new one (e.g. leaving a 7-row Mandiri file
    // stuck on "page 2" because a previously open 16-row BCA file was left
    // there). Reset whenever the tracked doc name no longer matches the
    // one currently open.
    if (frm.__bsip_preview_page_doc !== frm.doc.name) {
        frm.__bsip_preview_page = 1;
        frm.__bsip_preview_page_doc = frm.doc.name;
    }

    const $bar = $(`
        <div class="bsip-pagination">
            <button type="button" class="btn btn-xs btn-default bsip-prev">${__('Previous')}</button>
            <span class="bsip-page-info"></span>
            <button type="button" class="btn btn-xs btn-default bsip-next">${__('Next')}</button>
        </div>
    `).appendTo(field.$wrapper);

    $bar.find('.bsip-prev').on('click', () => go_to_preview_page(frm, frm.__bsip_preview_page - 1));
    $bar.find('.bsip-next').on('click', () => go_to_preview_page(frm, frm.__bsip_preview_page + 1));

    // Restores whatever page the user was already on (e.g. if core wiped
    // and rebuilt the wrapper while they were on page 2) instead of
    // silently dropping them back to page 1.
    go_to_preview_page(frm, frm.__bsip_preview_page);
}

function go_to_preview_page(frm, page) {
    if (page < 1) return;

    frappe.call({
        method: 'garage.utils.bca_bank_statement_import.get_cleaned_preview_page',
        args: { bank_statement_import_name: frm.doc.name, page },
        callback: (r) => {
            const data = r.message;
            const total = data ? data.total : 0;

            // "Start Import" (core, update_primary_action() in bank_
            // statement_import.js) hard-throws "Import template should
            // contain a Header and atleast one row" server-side when
            // every row got skipped during cleaning (e.g. a statement
            // where every transaction is still "PEND", no settled date
            // to reconcile against yet) - disabled here so that's caught
            // before the click instead of after. btn_primary is a stable
            // reference core keeps (frappe/ui/page.js), not recreated on
            // every relabel, so this survives core's own re-renders of
            // the button the same way the field.$wrapper elements don't.
            if (frm.page && frm.page.btn_primary) {
                frm.page.btn_primary.prop('disabled', !total);
            }

            if (!total) {
                const field = frm.get_field('import_preview');
                const $bar = field.$wrapper.find('.bsip-pagination');
                $bar.find('.bsip-page-info').text(
                    __('No importable rows (e.g. all transactions still pending)')
                );
                $bar.find('.bsip-prev, .bsip-next').prop('disabled', true);
                return;
            }

            const datatable = frm.import_preview && frm.import_preview.datatable;
            if (!datatable) return;

            // Core's columns include an explicit "Sr. No" column
            // (prepare_columns() in import_preview.js) as the first cell
            // of every row - our own cleaned rows don't carry that, so a
            // serial number matching this page's actual position is
            // prepended before handing rows back to the *same* datatable
            // (refresh(data) with columns omitted keeps its existing
            // column definitions, per datamanager.init()).
            const start_serial = (data.page - 1) * data.page_size + 1;
            const rows_with_srno = data.rows.map((row, i) => [String(start_serial + i), ...row]);
            datatable.refresh(rows_with_srno);

            frm.__bsip_preview_page = data.page;
            const total_pages = Math.max(1, Math.ceil(data.total / data.page_size));

            const field = frm.get_field('import_preview');
            const $bar = field.$wrapper.find('.bsip-pagination');
            $bar.find('.bsip-page-info').text(
                __('Page {0} of {1} ({2} rows)', [data.page, total_pages, data.total])
            );
            $bar.find('.bsip-prev').prop('disabled', data.page <= 1);
            $bar.find('.bsip-next').prop('disabled', data.page >= total_pages);

            // refresh() rebuilds the header + body from scratch, so our
            // own header color/column-width/date-label fixes need to run
            // again - the MutationObserver already watching this field's
            // wrapper does that automatically once the new DOM lands.
        },
    });
}

// Core (import_preview.js prepare_columns()) appends the detected date
// format to the column label, e.g. "Tanggal Transaksi(yyyy-mm-dd)" - useful
// while debugging a mapping, not something finance needs staring at every
// day. Only the date-format annotation is a parenthetical suffix on this
// header (other columns don't get one), so stripping it is safe to do
// generically once the column is found.
function simplify_date_header(frm) {
    const datatable = frm.import_preview && frm.import_preview.datatable;
    if (!datatable || !datatable.datamanager) return;
    const column = datatable.datamanager.getColumnById('date');
    if (!column) return;

    const field = frm.get_field('import_preview');
    if (!field || !field.$wrapper) return;

    const cell = field.$wrapper[0].querySelector(`.dt-cell--header.dt-cell--col-${column.colIndex}`);
    const indicator = cell && cell.querySelector('.indicator');
    if (!indicator) return;

    const cleaned = indicator.textContent.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (indicator.textContent.trim() !== cleaned) {
        indicator.textContent = cleaned;
    }
}

// A plain CSS rule targeting .dt-row didn't visibly take effect here for
// reasons that weren't found by reading the library's own bundled CSS or
// this table's DOM structure - set directly on each row element instead,
// the same brute-force-but-reliable approach already used for header/body
// cell widths in this exact file.
function add_preview_row_borders(frm) {
    const field = frm.get_field('import_preview');
    if (!field || !field.$wrapper) return;

    // Setting border-bottom on .dt-row itself (the flex row container) had
    // no visible effect, through both a plain CSS rule and this same
    // direct-DOM approach - whatever's happening there wasn't found by
    // reading the library's CSS/DOM structure. The library's OWN default
    // styling only ever borders individual .dt-cell elements, never the
    // row container (frappe-datatable.css: ".dt-row:last-child .dt-cell {
    // border-bottom: ... }" - it borders the *cells* of the last row, not
    // the row itself) - matching that exact mechanism instead of fighting
    // whatever made the row-level border invisible.
    field.$wrapper[0].querySelectorAll('.dt-row:not(.dt-row-filter):not(.dt-row-header) .dt-cell').forEach((el) => {
        el.style.setProperty('border-bottom', '1px solid #b0b7c0', 'important');
    });
}

function paint_preview_header(frm) {
    const field = frm.get_field('import_preview');
    if (!field || !field.$wrapper) return;

    field.$wrapper[0].querySelectorAll('.dt-cell--header .dt-cell__content').forEach((content) => {
        content.style.setProperty('background-color', '#1f2937', 'important');
        content.style.setProperty('color', '#94a3b8', 'important');
        content.style.setProperty('font-weight', '700', 'important');
        content.style.setProperty('text-transform', 'uppercase', 'important');
        content.style.setProperty('letter-spacing', '0.04em', 'important');
    });
}

// Core (import_preview.js prepare_columns()) gives every column a flat
// 120px width regardless of what it holds - Keterangan (long free-text
// descriptions) truncates hard while Deposit/Withdrawal (short currency
// amounts) sit half-empty. Column ids match the Bank Transaction
// fieldnames from BCA_FIELD_MAP on the Python side (bca_bank_statement_
// import.py) - "srno" is core's own special case for the row-number
// column, "balance" was added later (preserves BCA's Saldo column - see
// bca_bank_statement_import.py).
//
// Earlier versions of this function assigned each column a fixed pixel
// width, guessed from what its content roughly needs - that's the wrong
// unit for a table meant to fill the page: the guessed widths' sum has no
// relationship to the container's ACTUAL width, so it either falls short
// (dead space on the right, "kelebihan lebar" wasn't the complaint but its
// mirror image was seen earlier on other tables in this app) or overshoots
// it (the ghost-header/page-overflow bug just fixed). Columns are sized by
// RELATIVE WEIGHT instead - each gets (its own weight / total weight) *
// the field's actual current clientWidth, recomputed against a fresh
// measurement every time this runs (including on window resize), so the
// sum of column widths is always exactly the available width: never more,
// never less, regardless of screen size.
const COLUMN_WEIGHTS = {
    srno: 0.45,
    date: 1.15,
    description: 3.2,
    deposit: 1,
    withdrawal: 1,
    bank_account: 1.4,
    balance: 1.2,
};

// columnmanager.setColumnHeaderWidth() sets the header's width by writing
// directly to element.style.width, but through a cache
// (this.$columnMap[colIndex]) that's only ever populated once and never
// invalidated. datatable.refresh() (used for pagination - see
// go_to_preview_page above) calls columnmanager.renderHeader(), which
// rebuilds the header's DOM nodes from scratch - after that, $columnMap
// still points at the *old, detached* header cells, so calling
// setColumnHeaderWidth() again silently touches nodes nobody can see
// while the real, freshly-rendered header sits unwidened. That's what
// caused the header/body columns to visibly drift out of alignment right
// after using Previous/Next. Queried directly via querySelectorAll
// instead, exactly like the body cells below - no cache to go stale, so
// it's correct on every call regardless of how many times core rebuilds
// the header.
//
// (An earlier version of this function also avoided touching the header
// on every mutation at all, guarded by frm.__bsip_header_resized, because
// going through datamanager.updateColumn()/columnmanager.setColumnHeader
// Width() repeatedly broke the library's sticky-header positioning and
// left a second, detached header floating off to the right. Neither of
// those two methods gets called anymore - direct querySelectorAll +
// el.style.width doesn't touch whatever internal state those two were
// corrupting, so that guard is gone too; this can safely run on every
// mutation now, header included.)
function resize_preview_columns(frm) {
    const datatable = frm.import_preview && frm.import_preview.datatable;
    if (!datatable || !datatable.datamanager) return false;

    const field = frm.get_field('import_preview');
    const body = field && field.$wrapper && field.$wrapper[0];
    if (!body) return false;

    const columns = Object.keys(COLUMN_WEIGHTS)
        .map((id) => ({ id, column: datatable.datamanager.getColumnById(id) }))
        .filter((entry) => entry.column);
    if (!columns.length) return false;

    const total_weight = columns.reduce((sum, entry) => sum + COLUMN_WEIGHTS[entry.id], 0);
    // clientWidth already excludes the vertical scrollbar's own width (if
    // any), so this is genuinely the space available for column content -
    // no extra fudge factor needed to avoid triggering a horizontal one.
    const available_width = body.clientWidth;
    if (!available_width) return false;

    columns.forEach(({ id, column }, index) => {
        // Last column absorbs any leftover px from Math.floor() rounding
        // on the others, so the columns' widths still sum to exactly
        // available_width instead of leaving a few stray px of dead space.
        const width = index === columns.length - 1
            ? available_width - columns.slice(0, -1)
                .reduce((sum, e) => sum + Math.floor(available_width * COLUMN_WEIGHTS[e.id] / total_weight), 0)
            : Math.floor(available_width * COLUMN_WEIGHTS[id] / total_weight);

        body.querySelectorAll(`.dt-cell__content--header-${column.colIndex}`).forEach((el) => {
            el.style.width = width + 'px';
        });
        body.querySelectorAll(`.dt-cell__content--col-${column.colIndex}`).forEach((el) => {
            el.style.width = width + 'px';
        });
    });

    return true;
}

// Column WEIGHTS are proportional to the field's clientWidth, so a
// resized browser window (or sidebar collapse/expand, which changes the
// page's content width without necessarily mutating the datatable's own
// DOM) needs a recompute too - the MutationObserver in watch_preview_
// datatable only fires on DOM changes, not layout changes.
let bsip_resize_bound = false;
function bind_preview_resize_listener(frm) {
    if (bsip_resize_bound) return;
    bsip_resize_bound = true;
    window.addEventListener('resize', frappe.utils.debounce(() => resize_preview_columns(frm), 200));
}

// Core (bank_statement_import.js render_import_log()) force-shows this
// section with frm.toggle_display("import_log_section", true) once an
// import actually produces log rows - that runtime override beats a
// Property Setter every time, so hide it again right after refresh() runs.
// The status badge next to the title plus the "Successfully imported N
// records" banner already say everything finance needs to see.
function force_hide_import_log(frm) {
    frm.toggle_display('import_log_section', false);
}

function watch_import_warnings(frm) {
    const field = frm.get_field('import_warnings');
    if (!field || !field.$wrapper) return;

    const node = field.$wrapper[0];
    if (frm.__bsiw_node === node) return;
    if (frm.__bsiw_observer) frm.__bsiw_observer.disconnect();

    frm.__bsiw_observer = new MutationObserver(() => restyle_import_warnings(field));
    frm.__bsiw_observer.observe(node, { childList: true });
    frm.__bsiw_node = node;

    restyle_import_warnings(field);
}

function compress_rows(row_numbers) {
    const nums = row_numbers.map(Number).sort((a, b) => a - b);
    const ranges = [];
    let start = nums[0];
    let prev = nums[0];

    for (let i = 1; i <= nums.length; i++) {
        const n = nums[i];
        if (n === prev + 1) {
            prev = n;
            continue;
        }
        ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
        if (n !== undefined) {
            start = n;
            prev = n;
        }
    }
    return ranges.join(', ');
}

function restyle_import_warnings(field) {
    const $wrapper = field.$wrapper;
    // Already restyled by us - the .html() call below fires another
    // childList mutation, which would otherwise re-enter this function
    // forever.
    if ($wrapper.find('.bsiw-list').length) return;

    const $rows = $wrapper.find('.warning');
    if (!$rows.length) return;

    // message html -> array of row numbers that produced it
    const row_groups = new Map();
    // "heading::message" -> { heading, message, count }
    const other_groups = new Map();
    const rows_with_issues = new Set();

    $rows.each(function () {
        const $w = $(this);
        const row = $w.attr('data-row');
        const $lis = $w.find('.body li');
        const messages = $lis.length
            ? $lis.map(function () { return $(this).html(); }).get()
            : [$w.find('.body').first().html() || ''];

        if (row) {
            rows_with_issues.add(row);
            messages.forEach((m) => {
                if (!row_groups.has(m)) row_groups.set(m, []);
                row_groups.get(m).push(row);
            });
        } else {
            const heading = $w.find('h5').first().text().trim() || 'Kolom';
            messages.forEach((m) => {
                // "Mapping column X to field Y" is a plain success
                // confirmation (core still tags it type:"info", same as
                // real problems) - showing it in the same alarming
                // orange-bordered card as an actual unmapped-column
                // warning misleads finance into thinking something's
                // still broken when the column mapped just fine.
                if (/^Mapping column\b/i.test(m)) return;
                const key = heading + '::' + m;
                if (!other_groups.has(key)) other_groups.set(key, { heading, message: m, count: 0 });
                other_groups.get(key).count += 1;
            });
        }
    });

    $wrapper.html(build_warning_html(row_groups, other_groups, rows_with_issues.size));
}

function build_warning_html(row_groups, other_groups, total_rows) {
    const summary = total_rows
        ? `<div style="font-size:12px; color:#6b7280; margin-bottom:10px;">
            <strong style="color:#1a1d21;">${total_rows}</strong> baris bermasalah,
            dikelompokkan jadi <strong style="color:#1a1d21;">${row_groups.size}</strong>
            jenis masalah.
          </div>`
        : '';

    const rows_html = Array.from(row_groups.entries()).map(([message, rows]) => {
        const compressed = compress_rows(rows);
        return `
        <div style="
            display:flex; gap:12px; align-items:flex-start;
            background:#fff; border:1px solid #e5e7eb; border-left:3px solid #ef4444;
            border-radius:8px; padding:10px 14px; margin-bottom:8px;
        ">
            <span style="
                flex:0 0 auto; background:#1f2937; color:#ef4444;
                font-size:10px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase;
                padding:3px 10px; border-radius:20px; white-space:nowrap;
            ">${rows.length} BARIS</span>
            <div style="flex:1; font-size:12px; color:#1a1d21; line-height:1.6;">
                <div>${message}</div>
                <div style="margin-top:4px; font-size:11px; color:#9ca3af;">
                    Baris: ${frappe.utils.escape_html(compressed)}
                </div>
            </div>
        </div>`;
    }).join('');

    const other_html = Array.from(other_groups.values()).map((c) => `
        <div style="
            display:flex; gap:12px; align-items:flex-start;
            background:#fff; border:1px solid #e5e7eb; border-left:3px solid #f97316;
            border-radius:8px; padding:10px 14px; margin-bottom:8px;
        ">
            <span style="
                flex:0 0 auto; background:#1f2937; color:#f97316;
                font-size:10px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase;
                padding:3px 10px; border-radius:20px; white-space:nowrap;
            ">${frappe.utils.escape_html(c.heading)}</span>
            <div style="flex:1; font-size:12px; color:#1a1d21; line-height:1.6;">
                ${c.message}${c.count > 1 ? ` <span style="color:#9ca3af;">(${c.count}x)</span>` : ''}
            </div>
        </div>`).join('');

    if (!rows_html && !other_html) {
        return `<div class="bsiw-list" style="
            display:flex; gap:10px; align-items:center;
            background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px;
            padding:10px 14px; font-size:12px; color:#15803d;
        ">Semua kolom berhasil dipetakan otomatis - tidak ada yang perlu diperbaiki.</div>`;
    }

    return `<div class="bsiw-list" style="padding:4px 0;">${summary}${rows_html}${other_html}</div>`;
}
