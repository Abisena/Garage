(() => {
    // Same card-list structure/technique as expense_request_list.js (see
    // that file's own comments for the full reasoning, including the
    // ListView.prototype.refresh monkeypatch below) - explicit user
    // request to match Expense Request's own FORMAT. Advanced Expense
    // Request is owned by imogi_finance (not garage) and shares the exact
    // same imogi_finance-registers-its-own-file-twice collision (see
    // imogi_finance/hooks.py's doctype_list_js entry for this doctype,
    // alongside Frappe's own module-path auto-detection of the same
    // file) - same fix applies. Its own get_indicator is the identical
    // 7-status logic as Expense Request's (no bulk-action onload here
    // though, unlike Expense Request's "Create PI" toggle - nothing to
    // preserve there). Explicit user constraint: column NAMES and COUNT
    // stay exactly as Advanced Expense Request's own in_list_view fields
    // (Type/Date/Supplier NPWP/Subtotal (DPP)), not copied from Expense
    // Request's own column set - only the VISUAL treatment is shared.
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

    const HEADER_HTML = `<div class="aer-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="aer-c-id aer-hdr">ID</span>
        <span class="aer-c-type aer-hdr">TYPE</span>
        <span class="aer-c-date aer-hdr">DATE</span>
        <span class="aer-c-npwp aer-hdr">SUPPLIER NPWP</span>
        <span class="aer-c-amount aer-hdr">SUBTOTAL (DPP)</span>
        <span class="aer-c-badge aer-hdr">STATUS</span>
        <span class="aer-c-ago aer-hdr"></span>
    </div>`;

    function card(doc) {
        // Reuses imogi_finance's own get_indicator (extended onto
        // listview_settings below) rather than re-deriving the 7-way
        // status logic a second time here.
        const existing = frappe.listview_settings["Advanced Expense Request"];
        const indicator = existing && existing.get_indicator ? existing.get_indicator(doc) : null;
        const label = indicator ? indicator[0] : __(doc.status || "Draft");
        const color = indicator ? indicator[1] : "gray";
        const s = COLOR_MAP[color] || COLOR_MAP.gray;
        const request_date = doc.request_date ? frappe.datetime.str_to_user(doc.request_date) : "-";
        const amount = doc.amount != null ? format_currency(doc.amount, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="aer-card" style="
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
            <span class="aer-c-id">${esc(doc.name)}</span>
            <span class="aer-c-type">${esc(doc.request_type)}</span>
            <span class="aer-c-date">${esc(request_date)}</span>
            <span class="aer-c-npwp">${esc(doc.supplier_tax_id) || "-"}</span>
            <span class="aer-c-amount">${esc(amount)}</span>
            <span class="aer-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="aer-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("aer-list")) $fl.addClass("aer-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".aer-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("aer-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("aer-ok");

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
                frappe.set_route("Form", "Advanced Expense Request", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) imogi_finance's own listview_settings for
    // Advanced Expense Request so its own get_indicator keeps working.
    // Best-effort only - see the ListView.prototype.refresh monkeypatch
    // below for why `refresh` itself can't rely on this surviving.
    const existing = frappe.listview_settings["Advanced Expense Request"] || {};

    frappe.listview_settings["Advanced Expense Request"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "request_type", "request_date", "supplier_tax_id", "amount", "currency", "status",
        ])),
        refresh(lv) {
            if (existing.refresh) existing.refresh(lv);
            render(lv);
        },
    });

    // imogi_finance registers its OWN advanced_expense_request_list.js a
    // SECOND time via its own hooks.py doctype_list_js entry - on top of
    // Frappe already auto-detecting that same file via the module-path
    // convention (identical situation to Expense Request). See garage.
    // registerListRenderOverride()'s own comment (garage_theme.js) for the
    // full root cause/mechanism - shared helper, one prototype patch
    // covers every affected doctype.
    garage.registerListRenderOverride("Advanced Expense Request", render, [
        "request_type", "request_date", "supplier_tax_id", "amount", "currency", "status",
    ]);
})();
