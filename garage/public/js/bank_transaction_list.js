(() => {
    const STATUS = {
        "Pending":           { bg: "#f3f4f6", fg: "#4b5563" },
        "Unreconciled":      { bg: "#fef3c7", fg: "#b45309" },
        "Partial Reconcile": { bg: "#fff7ed", fg: "#c2410c" },
        "Reconciled":        { bg: "#dcfce7", fg: "#15803d" },
        "Settled":           { bg: "#dbeafe", fg: "#1d4ed8" },
        "Cancelled":         { bg: "#fee2e2", fg: "#b91c1c" },
    };

    const MONTHS_ID = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    function no_date_label() { return __("Tanpa Tanggal"); }

    function year_of(date_str) {
        if (!date_str) return no_date_label();
        return String(frappe.datetime.str_to_obj(date_str).getFullYear());
    }

    function month_of(date_str) {
        if (!date_str) return no_date_label();
        return MONTHS_ID[frappe.datetime.str_to_obj(date_str).getMonth()];
    }

    // Bank Transaction only carries bank_account (Link), not the bank name
    // itself - now that BCA and Mandiri both exist, telling rows apart
    // meant opening each one. Bank Account -> Bank is a small, rarely-
    // changing table, so it's fetched once and cached here rather than
    // re-fetched (or joined server-side) on every list render.
    let bank_by_account = null;
    function load_bank_lookup(on_ready) {
        if (bank_by_account) return on_ready();
        frappe.db.get_list("Bank Account", { fields: ["name", "bank"], limit: 0 }).then((rows) => {
            bank_by_account = {};
            rows.forEach((r) => { bank_by_account[r.name] = r.bank; });
            on_ready();
        });
    }

    const HEADER_HTML = `<div class="bt-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="bt-c-date bt-hdr">TANGGAL</span>
        <span class="bt-c-bank bt-hdr">BANK</span>
        <span class="bt-c-deposit bt-hdr">DEPOSIT</span>
        <span class="bt-c-withdrawal bt-hdr">WITHDRAWAL</span>
        <span class="bt-c-desc bt-hdr">DESCRIPTION</span>
        <span class="bt-c-badge bt-hdr">STATUS</span>
        <span class="bt-c-ago bt-hdr"></span>
    </div>`;

    function card(doc) {
        const date       = doc.date ? frappe.datetime.str_to_user(doc.date) : "";
        const bank_name  = (bank_by_account && bank_by_account[doc.bank_account]) || "";
        const deposit    = flt(doc.deposit) ? format_currency(doc.deposit, doc.currency) : "";
        const withdrawal = flt(doc.withdrawal) ? format_currency(doc.withdrawal, doc.currency) : "";
        const desc       = doc.description || "";
        const ago        = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";
        const s          = STATUS[doc.status] || STATUS["Pending"];

        return `<div class="bt-card" style="
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
            <span class="bt-c-date">${date ? esc(date) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bt-c-bank">${bank_name ? esc(bank_name) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bt-c-deposit">${deposit ? esc(deposit) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bt-c-withdrawal">${withdrawal ? esc(withdrawal) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bt-c-desc">${desc ? esc(desc) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bt-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status || "Pending")}</span>
            <span class="bt-c-ago">${ago}</span>
        </div>`;
    }

    // Three collapsible levels - Bank (1) > Year (2) > Month (3). Headers
    // and rows all sit as plain flat siblings in document order (Frappe's
    // own list markup, not a nested tree we control) - group_header_html()'s
    // data-level/data-group-key are what regroup() and apply_group_
    // visibility() below key off of.
    function group_header_html(level, key, label) {
        return `<div class="bt-group-header bt-group-header--${level}" data-level="${level}" data-group-key="${esc(key)}">
            <span class="bt-group-toggle">&#9662;</span>
            <span class="bt-group-label">${esc(label)}</span>
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
    // must only apply the FIRST time a key is ever encountered (see
    // default_collapsed() below, called from regroup()). Without this,
    // there'd be no way to tell "the user hasn't touched this group yet,
    // default it closed" apart from "the user already opened this group",
    // and every later regroup() pass (e.g. infinite scroll appending more
    // rows) would re-collapse groups the user had deliberately opened.
    const known_groups = new Set();

    function toggle_group(key) {
        if (collapsed_groups.has(key)) {
            collapsed_groups.delete(key);
        } else {
            collapsed_groups.add(key);
        }
    }

    // Bank/Year/Month all start collapsed - a first-time visitor otherwise
    // landed on a page already showing every single transaction across
    // every bank/year/month at once, exactly the "kelihatan rame banget"
    // wall of data grouping was introduced to avoid in the first place.
    // Drilling down (Bank -> Year -> Month -> rows) one click at a time is
    // the whole point of calling this a treeview.
    function default_collapsed(key) {
        if (known_groups.has(key)) return;
        known_groups.add(key);
        collapsed_groups.add(key);
    }

    // A row's real visibility depends on its bank's, year's AND month's
    // collapsed state (any one of them being closed hides it); a year
    // header's visibility depends only on its bank; a month header's on
    // its bank or year. Recomputed for every row/header from the tracked
    // set on every call - rather than only ever flipping whichever single
    // header was just clicked - is what makes clicking a bank correctly
    // cascade all the way down through every year and month underneath it,
    // with nothing left visible.
    // .bt-group-header's own CSS sets "display: flex !important" (garage_
    // desk.css) - a plain, non-important inline style.display can never
    // beat that, so it was silently swallowed and the header just sat
    // there ignoring collapsed_groups entirely, no matter what the Set
    // said. Only the Bank header's own chevron rotation (a class toggle,
    // unaffected by this) ever reflected reality, which is exactly the
    // "BCA looks collapsed but its Year/Month headers are still sitting
    // there" bug. Hiding now goes through setProperty(..., 'important')
    // to actually win, and showing again means fully removing the inline
    // override (not re-setting it to 'flex') so the !important class rule
    // is what's driving visibility once more - not a second inline value
    // that would need to keep tracking whatever the class rule happens to
    // say.
    function set_hidden(el, hidden) {
        if (hidden) {
            el.style.setProperty('display', 'none', 'important');
        } else {
            el.style.removeProperty('display');
        }
    }

    function apply_group_visibility($fl) {
        $fl.find('.bt-group-header--1').each(function () {
            this.classList.toggle('bt-collapsed', collapsed_groups.has(this.dataset.groupKey));
        });

        $fl.find('.bt-group-header--2').each(function () {
            const key = this.dataset.groupKey; // "Bank|Year"
            const bank_key = key.slice(0, key.indexOf('|'));
            set_hidden(this, collapsed_groups.has(bank_key));
            this.classList.toggle('bt-collapsed', collapsed_groups.has(key));
        });

        $fl.find('.bt-group-header--3').each(function () {
            const key = this.dataset.groupKey; // "Bank|Year|Month"
            const first_sep = key.indexOf('|');
            const bank_key = key.slice(0, first_sep);
            const year_key = key.slice(0, key.indexOf('|', first_sep + 1));
            set_hidden(this, collapsed_groups.has(bank_key) || collapsed_groups.has(year_key));
            this.classList.toggle('bt-collapsed', collapsed_groups.has(key));
        });

        $fl.find('.list-row[data-bank-group]').each(function () {
            const hidden = collapsed_groups.has(this.dataset.bankGroup)
                || collapsed_groups.has(this.dataset.yearGroup)
                || collapsed_groups.has(this.dataset.monthGroup);
            set_hidden(this, hidden);
        });
    }

    // order_by (see listview_settings below) only sorts by bank_account,
    // and two different bank_account values can resolve to the very same
    // bank (e.g. two separate BCA accounts) - left in server order, that
    // scatters one bank's rows into multiple non-contiguous runs, each
    // showing up without (or under the wrong) group header: collapsing
    // "BCA" would then only ever hide whichever run happened to carry a
    // header, leaving the rest sitting there looking like a pile of
    // leftover rows. Rebuilt and physically reordered here instead, keyed
    // by the RESOLVED bank name rather than the raw account, so every
    // bank's rows always end up as one contiguous block regardless of how
    // the server sorted them - which is what makes "collapse this bank"
    // reliably hide everything under it, nothing left stray.
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
                bank: (bank_by_account && bank_by_account[doc.bank_account]) || __('Unknown Bank'),
                year: year_of(doc.date),
                month: month_of(doc.date),
            });
        });

        // Bank A-Z, then newest year first, then newest month first
        // (matches the transaction-level "date desc" already used for
        // ordering within a month) - rows with no date at all sort last
        // within their bank, they're not a real period to file next to
        // real ones.
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
            return 0; // keep the server's own date-desc order within the same bank/year/month
        });

        // Reordering below fires the very MutationObserver that calls
        // render()/regroup() in the first place - disconnected for the
        // duration so moving nodes into place doesn't re-enter this
        // function mid-reorder (disconnect() also drops any records
        // already queued from the moves made here, so reconnecting after
        // leaves nothing pending to fire on).
        if (lv.__bt_observer) lv.__bt_observer.disconnect();

        container.querySelectorAll('.bt-group-header').forEach((el) => el.remove());

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

            frag.appendChild(row); // moves the existing node - keeps its .bt-card/handlers if already built

            // Zebra striping has to follow this FINAL sorted position, not
            // whatever order the rows happened to arrive/get built in -
            // .dataset.zebraBg is what the card's own mouseleave handler
            // (see render() below) reads, so a re-stripe here also fixes
            // up the hover-restore color, not just the resting one.
            const card_el = row.querySelector('.bt-card');
            if (card_el) {
                const bg = i % 2 === 0 ? '#ffffff' : '#f0f1f3';
                card_el.style.setProperty('background', bg, 'important');
                card_el.dataset.zebraBg = bg;
            }
        });

        container.appendChild(frag);

        if (lv.__bt_observer) lv.__bt_observer.observe(lv.$result[0], { childList: true });
    }

    function render(lv) {
        if (!bank_by_account) {
            load_bank_lookup(() => render(lv));
            return;
        }

        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("bt-list")) $fl.addClass("bt-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".bt-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);

            // .attr(), not .data() - jQuery's .data() type-coerces a
            // purely-numeric docname into a JS number, which then never
            // strictly-equals the string doc.name below.
            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            if ($row.hasClass("bt-ok")) return;
            $row.addClass("bt-ok");

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
                frappe.set_route("Form", "Bank Transaction", doc.name);
            });
        });

        regroup(lv);
        apply_group_visibility($fl);

        if (!$fl.data("bt-group-toggle-bound")) {
            $fl.data("bt-group-toggle-bound", true);
            $fl.on("click", ".bt-group-header", function () {
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
        if (!node || lv.__bt_observer_node === node) return;
        if (lv.__bt_observer) lv.__bt_observer.disconnect();
        lv.__bt_observer = new MutationObserver(() => render(lv));
        lv.__bt_observer.observe(node, { childList: true });
        lv.__bt_observer_node = node;
    }

    let lastLv = null;
    frappe.router.on("change", () => {
        if (!lastLv) return;
        const route = frappe.get_route();
        if (route[0] === "List" && route[1] === "Bank Transaction") {
            setTimeout(() => render(lastLv), 0);
        }
    });

    frappe.listview_settings["Bank Transaction"] = {
        hide_name_column: true,
        add_fields: [
            "deposit", "withdrawal", "description", "currency", "status", "bank_account", "date",
        ],
        // Just gets a mostly-grouped starting order from the server -
        // regroup() above does the real, bank-NAME-based grouping and
        // reordering client-side, since two different bank_account values
        // can resolve to the same bank.
        order_by: "bank_account asc, date desc",
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
