(() => {
    // Same card-list structure/technique as payroll_entry_list.js (see that
    // file's own comments for the full reasoning on the extend-not-replace
    // pattern) - explicit user request to match Employee's own FORMAT.
    // Expense Request is owned by imogi_finance (not garage), and its own
    // listview_settings (imogi_finance/.../expense_request/
    // expense_request_list.js) ships REAL business logic - a rich
    // get_indicator (7 statuses incl. emoji, mirrors the doctype's own
    // budget/approval workflow: Draft/Pending Review/Approved/Rejected/
    // PI Created/Paid/Return/Cancelled) plus an onload bulk-action toggle
    // that shows/hides a "Create PI" button depending on the current
    // checkbox selection. Both would be silently destroyed by a plain
    // overwrite, so this extends (Object.assign) rather than replaces,
    // and reuses get_indicator() for the badge label/color exactly like
    // payroll_entry_list.js does for hrms's own indicator - no status
    // logic re-derived a second time here. The bulk-action toggle keeps
    // working unmodified too: it delegates off `.list-row`/checkbox
    // selectors on listview.page.wrapper, which still exist (just moved
    // inside the card markup, not removed) after render() below runs.
    // Column set is its own: Type/Request Date/Supplier/Grand Total.
    const COLOR_MAP = {
        red:      { bg: "#fee2e2", fg: "#b91c1c" },
        blue:     { bg: "#dbeafe", fg: "#1d4ed8" },
        orange:   { bg: "#fff7ed", fg: "#c2410c" },
        green:    { bg: "#dcfce7", fg: "#15803d" },
        purple:   { bg: "#f3e8ff", fg: "#7e22ce" },
        darkgrey: { bg: "#f3f4f6", fg: "#4b5563" },
        gray:     { bg: "#f3f4f6", fg: "#4b5563" },
        grey:     { bg: "#f3f4f6", fg: "#4b5563" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="exr-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="exr-c-id exr-hdr">ID</span>
        <span class="exr-c-type exr-hdr">TYPE</span>
        <span class="exr-c-date exr-hdr">REQUEST DATE</span>
        <span class="exr-c-supplier exr-hdr">SUPPLIER</span>
        <span class="exr-c-amount exr-hdr">GRAND TOTAL</span>
        <span class="exr-c-badge exr-hdr">STATUS</span>
        <span class="exr-c-ago exr-hdr"></span>
    </div>`;

    function card(doc) {
        // Reuses imogi_finance's own get_indicator (extended onto
        // listview_settings below) rather than re-deriving the 7-way
        // status logic a second time here - only the label/color are
        // used, mapped to this file's own badge colors via COLOR_MAP.
        const existing = frappe.listview_settings["Expense Request"];
        const indicator = existing && existing.get_indicator ? existing.get_indicator(doc) : null;
        const label = indicator ? indicator[0] : __(doc.status || "Draft");
        const color = indicator ? indicator[1] : "gray";
        const s = COLOR_MAP[color] || COLOR_MAP.gray;
        const request_date = doc.request_date ? frappe.datetime.str_to_user(doc.request_date) : "-";
        const amount = doc.total_amount != null ? format_currency(doc.total_amount, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="exr-card" style="
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
            <span class="exr-c-id">${esc(doc.name)}</span>
            <span class="exr-c-type">${esc(doc.request_type)}</span>
            <span class="exr-c-date">${esc(request_date)}</span>
            <span class="exr-c-supplier">${esc(doc.supplier)}</span>
            <span class="exr-c-amount">${esc(amount)}</span>
            <span class="exr-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="exr-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("exr-list")) $fl.addClass("exr-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".exr-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("exr-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("exr-ok");

            $row.children().each(function () {
                this.style.setProperty("display", "none", "important");
            });

            row.style.setProperty("height", "auto", "important");
            row.style.setProperty("min-height", "0", "important");
            row.style.setProperty("padding", "0", "important");
            row.style.setProperty("overflow", "visible", "important");
            row.style.setProperty("background", "transparent", "important");

            const $card = $(card(doc));
            const bg = idx % 2 === 0 ? "#ffffff" : "#f0f1f3";
            $card[0].style.setProperty("background", bg, "important");
            $row.append($card);

            $card.on("mouseenter", function () {
                this.style.setProperty("background", "#e8edff", "important");
            }).on("mouseleave", function () {
                this.style.setProperty("background", bg, "important");
            });

            $card.on("click", function (e) {
                if ($(e.target).is("input[type=checkbox]")) return;
                frappe.set_route("Form", "Expense Request", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) imogi_finance's own listview_settings for
    // Expense Request so its own get_indicator and onload (bulk "Create
    // PI" action toggle) keep working. Best-effort only for add_fields/
    // hide_name_column below - see the ListView.prototype.refresh
    // monkeypatch further down for why `refresh` itself can't rely on
    // this surviving.
    const existing = frappe.listview_settings["Expense Request"] || {};

    frappe.listview_settings["Expense Request"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "request_type", "request_date", "supplier", "currency", "total_amount", "status",
        ])),
        refresh(lv) {
            if (existing.refresh) existing.refresh(lv);
            render(lv);
        },
    });

    // imogi_finance registers its OWN expense_request_list.js a SECOND
    // time via its own hooks.py doctype_list_js entry - on top of Frappe
    // already auto-detecting that same file via the module-path
    // convention. That trailing duplicate's plain (non-extending)
    // `frappe.listview_settings["Expense Request"] = {...}` silently
    // discards everything this file just set up above, confirmed live via
    // a fresh Playwright session (get_indicator/onload survived, `refresh`
    // vanished, card list never rendered). See garage.
    // registerListRenderOverride()'s own comment (garage_theme.js) for the
    // full root cause/mechanism - shared by every doctype affected by this
    // same quirk (also Advanced Expense Request).
    garage.registerListRenderOverride("Expense Request", render, [
        "request_type", "request_date", "supplier", "currency", "total_amount", "status",
    ]);
})();
