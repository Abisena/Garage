(() => {
    const STATUS = {
        "Pending":         { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "Success":         { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Partial Success": { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Error":           { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
    };

    const MONTHS_ID = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    function no_date_label() { return __("Tanpa Tanggal"); }

    // Grouped by upload date (doc.creation) rather than the transaction
    // date shown in the "Tanggal Transaksi" column - that column reads a
    // RANGE from inside the file (get_transaction_date_ranges) that can
    // itself span several months or even years on its own, which would
    // make an ambiguous group key. creation is the one clean, single,
    // unambiguous date every Bank Statement Import record actually has.
    function year_of(datetime_str) {
        if (!datetime_str) return no_date_label();
        return String(frappe.datetime.str_to_obj(datetime_str.split(" ")[0]).getFullYear());
    }

    function month_of(datetime_str) {
        if (!datetime_str) return no_date_label();
        return MONTHS_ID[frappe.datetime.str_to_obj(datetime_str.split(" ")[0]).getMonth()];
    }

    // Bank Statement Import has no transaction-date field of its own -
    // only `creation` (when the import RECORD was made). The actual
    // transaction date(s) only exist inside the file, in the cleaned
    // "Tanggal Transaksi" column (garage.utils.bca_bank_statement_import.
    // get_transaction_date_ranges reads it server-side, same cleaned
    // shape for every bank). Fetched once per render pass for every row
    // currently on screen instead of one call per row.
    let txn_date_by_name = {};
    function load_txn_dates(names, on_ready) {
        const missing = names.filter((n) => !(n in txn_date_by_name));
        if (!missing.length) return on_ready();
        frappe.call({
            method: 'garage.utils.bca_bank_statement_import.get_transaction_date_ranges',
            args: { names: missing },
            callback: (r) => {
                Object.assign(txn_date_by_name, r.message || {});
                on_ready();
            },
        });
    }

    const HEADER_HTML = `<div class="bsi-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="bsi-c-date bsi-hdr">TANGGAL UPLOAD</span>
        <span class="bsi-c-txndate bsi-hdr">TANGGAL TRANSAKSI</span>
        <span class="bsi-c-account bsi-hdr">BANK ACCOUNT</span>
        <span class="bsi-c-file bsi-hdr">IMPORT FILE</span>
        <span class="bsi-c-doctype bsi-hdr">DOCUMENT TYPE</span>
        <span class="bsi-c-badge bsi-hdr">STATUS</span>
        <span class="bsi-c-ago bsi-hdr"></span>
    </div>`;

    function card(doc) {
        const s       = STATUS[doc.status] || STATUS.Pending;
        const date    = doc.creation ? frappe.datetime.str_to_user(doc.creation.split(" ")[0]) : "";
        const txndate = txn_date_by_name[doc.name] || "";
        const account = doc.bank_account || "";
        const file    = doc.import_file ? doc.import_file.split("/").pop() : "";
        const doctype = doc.reference_doctype || "";
        const ago     = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="bsi-card" style="
            display:flex !important;
            align-items:center;
            width:100%;
            padding:10px 14px 10px 0;
            gap:10px;
            cursor:pointer;
        ">
            <div style="flex:0 0 36px; display:flex; align-items:center; justify-content:center;">
                <input type="checkbox" class="list-row-checkbox" data-name="${esc(doc.name)}" style="cursor:pointer;">
            </div>
            <span class="bsi-c-date">${date ? esc(date) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bsi-c-txndate">${txndate ? esc(txndate) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bsi-c-account">${account ? esc(account) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bsi-c-file">${file ? esc(file) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bsi-c-doctype">${doctype ? esc(doctype) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bsi-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status || "Pending")}</span>
            <span class="bsi-c-ago">${ago}</span>
        </div>`;
    }

    // Three collapsible levels - Bank (1) > Year (2) > Month (3), same
    // architecture as bank_transaction_list.js's treeview (regroup()/
    // apply_group_visibility()/collapsed_groups below are near-identical
    // to that file on purpose - same UX, same grouping mechanics, just a
    // different doctype's fields feeding it).
    function group_header_html(level, key, label) {
        return `<div class="bsi-group-header bsi-group-header--${level}" data-level="${level}" data-group-key="${esc(key)}">
            <span class="bsi-group-toggle">&#9662;</span>
            <span class="bsi-group-label">${esc(label)}</span>
        </div>`;
    }

    // Which group keys (bank names, "Bank|Year", or "Bank|Year|Month") the
    // user has explicitly clicked closed - every level tracks its own
    // collapsed state independently, so collapsing a bank and re-expanding
    // it restores each year/month underneath to whatever state it was
    // already in, instead of forcing everything back open.
    const collapsed_groups = new Set();

    // Every group key this session has ever seen a header created for -
    // separate from collapsed_groups because "start collapsed by default"
    // (see default_collapsed() below) must only apply the FIRST time a key
    // is ever encountered, not on every regroup() pass (e.g. infinite
    // scroll appending more rows), or a group the user deliberately opened
    // would keep getting forced shut again.
    const known_groups = new Set();

    function toggle_group(key) {
        if (collapsed_groups.has(key)) {
            collapsed_groups.delete(key);
        } else {
            collapsed_groups.add(key);
        }
    }

    // Bank/Year/Month all start collapsed - landing on a page already
    // showing every import across every bank/year/month at once is exactly
    // the "kelihatan rame banget" wall of data grouping is meant to avoid.
    function default_collapsed(key) {
        if (known_groups.has(key)) return;
        known_groups.add(key);
        collapsed_groups.add(key);
    }

    // .bsi-group-header's own CSS sets "display: flex !important" (garage_
    // desk.css) - a plain, non-important inline style.display can never
    // beat that, so hiding goes through setProperty(..., 'important') to
    // actually win, and showing again means fully removing the inline
    // override (not re-setting it to 'flex') so the !important class rule
    // is what's driving visibility once more.
    function set_hidden(el, hidden) {
        if (hidden) {
            el.style.setProperty('display', 'none', 'important');
        } else {
            el.style.removeProperty('display');
        }
    }

    // A row's real visibility depends on its bank's, year's AND month's
    // collapsed state (any one of them being closed hides it); a year
    // header's visibility depends only on its bank; a month header's on
    // its bank or year. Recomputed for every row/header from the tracked
    // set on every call - rather than only ever flipping whichever single
    // header was just clicked - is what makes clicking a bank correctly
    // cascade all the way down through every year and month underneath it.
    function apply_group_visibility($fl) {
        $fl.find('.bsi-group-header--1').each(function () {
            this.classList.toggle('bsi-collapsed', collapsed_groups.has(this.dataset.groupKey));
        });

        $fl.find('.bsi-group-header--2').each(function () {
            const key = this.dataset.groupKey; // "Bank|Year"
            const bank_key = key.slice(0, key.indexOf('|'));
            set_hidden(this, collapsed_groups.has(bank_key));
            this.classList.toggle('bsi-collapsed', collapsed_groups.has(key));
        });

        $fl.find('.bsi-group-header--3').each(function () {
            const key = this.dataset.groupKey; // "Bank|Year|Month"
            const first_sep = key.indexOf('|');
            const bank_key = key.slice(0, first_sep);
            const year_key = key.slice(0, key.indexOf('|', first_sep + 1));
            set_hidden(this, collapsed_groups.has(bank_key) || collapsed_groups.has(year_key));
            this.classList.toggle('bsi-collapsed', collapsed_groups.has(key));
        });

        $fl.find('.list-row[data-bank-group]').each(function () {
            const hidden = collapsed_groups.has(this.dataset.bankGroup)
                || collapsed_groups.has(this.dataset.yearGroup)
                || collapsed_groups.has(this.dataset.monthGroup);
            set_hidden(this, hidden);
        });
    }

    // Physically reorders the DOM (not just a stable-sort assumption from
    // order_by) so every bank's rows always end up as one contiguous
    // block, exactly like bank_transaction_list.js's regroup(). Unlike
    // that file, "bank" here is already the exact field being grouped by
    // (Bank Statement Import has a direct `bank` Link field, no separate
    // bank_account -> bank resolution needed), so there's no equivalent
    // "two accounts, same bank" scattering risk - this still reorders
    // unconditionally anyway, since regroup() is also what assigns zebra
    // striping and the collapsed-by-default state for freshly-seen groups.
    function regroup(lv) {
        const $all_rows = lv.$result.find('.list-row:not(.list-row-head)');
        if (!$all_rows.length) return;

        const container = $all_rows[0].parentElement;
        const entries = [];

        $all_rows.each(function () {
            const row = this;
            const name = $(row).find('input.list-row-checkbox').attr('data-name');
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;
            entries.push({
                row,
                bank: doc.bank || __('Unknown Bank'),
                year: year_of(doc.creation),
                month: month_of(doc.creation),
            });
        });

        // Bank A-Z, then newest year first, then newest month first -
        // rows with no creation date (shouldn't happen in practice, but
        // matches the same defensive fallback bank_transaction_list.js
        // uses) sort last within their bank.
        const no_date = no_date_label();
        entries.sort((a, b) => {
            if (a.bank !== b.bank) return a.bank.localeCompare(b.bank);
            if (a.year !== b.year) {
                if (a.year === no_date) return 1;
                if (b.year === no_date) return -1;
                return b.year.localeCompare(a.year);
            }
            if (a.month !== b.month) {
                if (a.month === no_date) return 1;
                if (b.month === no_date) return -1;
                return MONTHS_ID.indexOf(b.month) - MONTHS_ID.indexOf(a.month);
            }
            return 0; // keep the server's own creation-desc order within the same bank/year/month
        });

        // Reordering below fires the very MutationObserver that calls
        // render()/regroup() in the first place - disconnected for the
        // duration so moving nodes into place doesn't re-enter this
        // function mid-reorder (disconnect() also drops any records
        // already queued from the moves made here, so reconnecting after
        // leaves nothing pending to fire on).
        if (lv.__bsi_observer) lv.__bsi_observer.disconnect();

        container.querySelectorAll('.bsi-group-header').forEach((el) => el.remove());

        const frag = document.createDocumentFragment();
        let last_bank = null, last_year = null, last_month = null;

        entries.forEach(({ row, bank, year, month }, i) => {
            const year_key = `${bank}|${year}`;
            const month_key = `${year_key}|${month}`;
            row.dataset.bankGroup = bank;
            row.dataset.yearGroup = year_key;
            row.dataset.monthGroup = month_key;

            if (bank !== last_bank) {
                default_collapsed(bank);
                frag.appendChild($(group_header_html(1, bank, bank))[0]);
                last_bank = bank; last_year = null; last_month = null;
            }
            if (year !== last_year) {
                default_collapsed(year_key);
                frag.appendChild($(group_header_html(2, year_key, year))[0]);
                last_year = year; last_month = null;
            }
            if (month !== last_month) {
                default_collapsed(month_key);
                frag.appendChild($(group_header_html(3, month_key, month))[0]);
                last_month = month;
            }

            frag.appendChild(row); // moves the existing node - keeps its .bsi-card/handlers if already built

            // Zebra striping has to follow this FINAL sorted position, not
            // whatever order the rows happened to arrive/get built in -
            // .dataset.zebraBg is what the card's own mouseleave handler
            // (see render() below) reads, so a re-stripe here also fixes
            // up the hover-restore color, not just the resting one.
            const card_el = row.querySelector('.bsi-card');
            if (card_el) {
                const bg = i % 2 === 0 ? '#ffffff' : '#f0f1f3';
                card_el.style.setProperty('background', bg, 'important');
                card_el.dataset.zebraBg = bg;
            }
        });

        container.appendChild(frag);

        if (lv.__bsi_observer) lv.__bsi_observer.observe(lv.$result[0], { childList: true });
    }

    function render(lv) {
        const names = (lv.data || []).map((d) => d.name);
        if (names.some((n) => !(n in txn_date_by_name))) {
            load_txn_dates(names, () => render(lv));
            return;
        }

        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("bsi-list")) $fl.addClass("bsi-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".bsi-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("bsi-ok")) return;

            // .attr(), not .data() - jQuery's .data() type-coerces a
            // purely-numeric docname into a JS number, which then never
            // strictly-equals the string doc.name below.
            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("bsi-ok");

            // Force-hide ALL old Frappe children via inline !important
            $row.children().each(function () {
                this.style.setProperty("display", "none", "important");
            });

            // Force row to auto height, transparent bg
            row.style.setProperty("height", "auto", "important");
            row.style.setProperty("min-height", "0", "important");
            row.style.setProperty("padding", "0", "important");
            row.style.setProperty("overflow", "visible", "important");
            row.style.setProperty("background", "transparent", "important");

            // Append card - actual zebra background gets assigned by
            // regroup() below, once the final sorted position is known.
            const $card = $(card(doc));
            $row.append($card);

            // Hover effect - restores whatever zebra color regroup() most
            // recently assigned, not a color captured at build time.
            $card.on("mouseenter", function () {
                this.style.setProperty("background", "#e8edff", "important");
            }).on("mouseleave", function () {
                this.style.setProperty("background", this.dataset.zebraBg || "#ffffff", "important");
            });

            // Navigate on body click
            $card.on("click", function (e) {
                if ($(e.target).is("input[type=checkbox]")) return;
                frappe.set_route("Form", "Bank Statement Import", doc.name);
            });
        });

        regroup(lv);
        apply_group_visibility($fl);

        if (!$fl.data("bsi-group-toggle-bound")) {
            $fl.data("bsi-group-toggle-bound", true);
            $fl.on("click", ".bsi-group-header", function () {
                toggle_group(this.dataset.groupKey);
                apply_group_visibility($fl);
            });
        }
    }

    function watch(lv) {
        // Same realtime/observer-node-swap guard used for Spare Part
        // Request's list - see spare_part_request_list.js for the full
        // explanation of why this reattaches every call instead of only
        // once.
        const node = lv.$result && lv.$result[0];
        if (!node || lv.__bsi_observer_node === node) return;
        if (lv.__bsi_observer) lv.__bsi_observer.disconnect();
        lv.__bsi_observer = new MutationObserver(() => render(lv));
        lv.__bsi_observer.observe(node, { childList: true });
        lv.__bsi_observer_node = node;
    }

    let lastLv = null;
    frappe.router.on("change", () => {
        if (!lastLv) return;
        const route = frappe.get_route();
        if (route[0] === "List" && route[1] === "Bank Statement Import") {
            setTimeout(() => render(lastLv), 0);
        }
    });

    frappe.listview_settings["Bank Statement Import"] = {
        hide_name_column: true,
        add_fields: [
            "import_file", "reference_doctype", "bank_account", "bank", "status",
        ],
        // Bank is grouped by directly (no bank_account -> bank resolution
        // needed here, unlike Bank Transaction), so sorting by it server-
        // side already lines up with regroup()'s own grouping below.
        order_by: "bank asc, creation desc",
        onload(lv) {
            lastLv = lv;
            watch(lv);
            render(lv);
        },
        refresh(lv) {
            lastLv = lv;
            watch(lv);
            render(lv);
        },
    };
})();
