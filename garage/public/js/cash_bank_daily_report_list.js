(() => {
    // Same card-list structure/technique as budget_control_entry_list.js
    // (see that file's own comments for the full reasoning) - explicit
    // user request to match the rest of this app's own FORMAT. Cash Bank
    // Daily Report is owned by imogi_finance, submittable, no core
    // listview_settings and no imogi_finance duplicate-registration
    // collision. Has two status-like fields - `status` (freeform Data,
    // e.g. "Generated") and `balance_status` (2-state Select: Balanced/
    // Mismatch) - the badge uses balance_status since that's the one
    // that actually flags a problem needing attention (a mismatched cash
    // reconciliation), `status` stays a plain text column alongside it.
    // Column set: Report Date/Bank Account/Report Type/Closing Balance/
    // Status/Balance Status.
    const BALANCE_STATUS = {
        "Balanced": { bg: "#dcfce7", fg: "#15803d" },
        "Mismatch": { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="cbd-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="cbd-c-id cbd-hdr">ID</span>
        <span class="cbd-c-date cbd-hdr">REPORT DATE</span>
        <span class="cbd-c-account cbd-hdr">BANK ACCOUNT</span>
        <span class="cbd-c-type cbd-hdr">REPORT TYPE</span>
        <span class="cbd-c-balance cbd-hdr">CLOSING BALANCE</span>
        <span class="cbd-c-status cbd-hdr">STATUS</span>
        <span class="cbd-c-badge cbd-hdr">BALANCE STATUS</span>
        <span class="cbd-c-ago cbd-hdr"></span>
    </div>`;

    function card(doc) {
        const s = BALANCE_STATUS[doc.balance_status] || BALANCE_STATUS["Balanced"];
        const date = doc.report_date ? frappe.datetime.str_to_user(doc.report_date) : "-";
        const closing = doc.closing_balance != null ? format_currency(doc.closing_balance, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="cbd-card" style="
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
            <span class="cbd-c-id">${esc(doc.name)}</span>
            <span class="cbd-c-date">${esc(date)}</span>
            <span class="cbd-c-account">${esc(doc.bank_account) || "-"}</span>
            <span class="cbd-c-type">${esc(doc.report_type) || "-"}</span>
            <span class="cbd-c-balance">${esc(closing)}</span>
            <span class="cbd-c-status">${esc(doc.status) || "-"}</span>
            <span class="cbd-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(doc.balance_status || "Balanced"))}</span>
            <span class="cbd-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("cbd-list")) $fl.addClass("cbd-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".cbd-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("cbd-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("cbd-ok");

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
                frappe.set_route("Form", "Cash Bank Daily Report", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Cash Bank Daily Report to
    // extend.
    frappe.listview_settings["Cash Bank Daily Report"] = {
        hide_name_column: true,
        add_fields: ["report_date", "bank_account", "report_type", "closing_balance", "status", "balance_status"],
        refresh(lv) {
            render(lv);
        },
    };
})();
