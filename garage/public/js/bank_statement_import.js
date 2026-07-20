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
        });
        frm.__bsip_observer.observe(node, { childList: true, subtree: true });
        frm.__bsip_node = node;
    }

    paint_preview_header(frm);
    resize_preview_columns(frm);
    simplify_date_header(frm);
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
// column. Uses the same datamanager/columnmanager sequence core's own
// column-resize-by-double-click handler uses (columnmanager.js
// bindPerfectColumnWidth()), so it behaves exactly like a user having
// manually resized each column.
function resize_preview_columns(frm) {
    const datatable = frm.import_preview && frm.import_preview.datatable;
    if (!datatable || !datatable.datamanager || !datatable.columnmanager) return false;
    if (frm.__bsip_resized === datatable) return true;

    const WIDTHS = {
        srno: 60,
        date: 140,
        description: 380,
        deposit: 110,
        withdrawal: 110,
        bank_account: 160,
    };

    let found_any = false;
    Object.keys(WIDTHS).forEach((id) => {
        const column = datatable.datamanager.getColumnById(id);
        if (!column) return;
        found_any = true;
        datatable.datamanager.updateColumn(column.colIndex, { width: WIDTHS[id] });
        datatable.columnmanager.setColumnHeaderWidth(column.colIndex);
        datatable.columnmanager.setColumnWidth(column.colIndex);
    });

    if (found_any) frm.__bsip_resized = datatable;
    return found_any;
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
