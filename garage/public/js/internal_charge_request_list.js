(() => {
    // Same card-list structure/technique as additional_budget_request_
    // list.js (see that file's own comments for the full reasoning) -
    // explicit user request to match the rest of this app's own FORMAT.
    // Internal Charge Request is owned by imogi_finance, submittable, no
    // core listview_settings and no imogi_finance duplicate-registration
    // collision. Own 8-state Status field (multi-level approval routing -
    // Pending L1/L2/L3 Approval are distinct states, not just one
    // generic "Pending"). Column set: its own 4 in_list_view fields
    // (Expense Request/Source Cost Center/Total Amount/Status) plus
    // Posting Date.
    const STATUS = {
        "Draft":                   { bg: "#f3f4f6", fg: "#4b5563" },
        "Pending Approval":        { bg: "#fff7ed", fg: "#c2410c" },
        "Pending L1 Approval":     { bg: "#fff7ed", fg: "#c2410c" },
        "Pending L2 Approval":     { bg: "#fff7ed", fg: "#c2410c" },
        "Pending L3 Approval":     { bg: "#fff7ed", fg: "#c2410c" },
        "Partially Approved":      { bg: "#dbeafe", fg: "#1d4ed8" },
        "Approved":                { bg: "#dcfce7", fg: "#15803d" },
        "Rejected":                { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="icr-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="icr-c-id icr-hdr">ID</span>
        <span class="icr-c-er icr-hdr">EXPENSE REQUEST</span>
        <span class="icr-c-cc icr-hdr">SOURCE COST CENTER</span>
        <span class="icr-c-date icr-hdr">POSTING DATE</span>
        <span class="icr-c-amount icr-hdr">TOTAL AMOUNT</span>
        <span class="icr-c-badge icr-hdr">STATUS</span>
        <span class="icr-c-ago icr-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS["Draft"];
        const date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "-";
        const amount = doc.total_amount != null ? format_currency(doc.total_amount, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="icr-card" style="
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
            <span class="icr-c-id">${esc(doc.name)}</span>
            <span class="icr-c-er">${esc(doc.expense_request) || "-"}</span>
            <span class="icr-c-cc">${esc(doc.source_cost_center) || "-"}</span>
            <span class="icr-c-date">${esc(date)}</span>
            <span class="icr-c-amount">${esc(amount)}</span>
            <span class="icr-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(doc.status || "Draft"))}</span>
            <span class="icr-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("icr-list")) $fl.addClass("icr-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".icr-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("icr-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("icr-ok");

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
                frappe.set_route("Form", "Internal Charge Request", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Internal Charge Request to
    // extend.
    frappe.listview_settings["Internal Charge Request"] = {
        hide_name_column: true,
        add_fields: ["expense_request", "source_cost_center", "posting_date", "total_amount", "status"],
        refresh(lv) {
            render(lv);
        },
    };
})();
