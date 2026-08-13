(() => {
    // Same card-list structure/technique as payroll_entry_list.js (see
    // that file's own comments for the full reasoning on the extend-not-
    // replace pattern) - explicit user request to match Expense Request/
    // Payment Entry's own FORMAT. Core hrms ships its own listview_
    // settings for Expense Claim (hr/doctype/expense_claim/
    // expense_claim_list.js: just `add_fields: ["company"]`, no
    // get_indicator of its own - no imogi_finance duplicate-registration
    // collision for this one, unlike Expense Request/Payment Entry, so a
    // plain Object.assign extend is enough here, no ListView.prototype
    // patch needed). Status badge built fresh (6-state Select: Draft/
    // Paid/Unpaid/Rejected/Submitted/Cancelled, no colon-syntax colors on
    // the field itself for core to have drawn one automatically). Column
    // set: Employee Name/Posting Date/Company/Grand Total.
    const STATUS = {
        "Draft":     { bg: "#f3f4f6", fg: "#4b5563" },
        "Submitted": { bg: "#dbeafe", fg: "#1d4ed8" },
        "Unpaid":    { bg: "#fff7ed", fg: "#c2410c" },
        "Paid":      { bg: "#dcfce7", fg: "#15803d" },
        "Rejected":  { bg: "#fee2e2", fg: "#b91c1c" },
        "Cancelled": { bg: "#f3f4f6", fg: "#4b5563" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="ec-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="ec-c-id ec-hdr">ID</span>
        <span class="ec-c-emp ec-hdr">EMPLOYEE NAME</span>
        <span class="ec-c-date ec-hdr">POSTING DATE</span>
        <span class="ec-c-company ec-hdr">COMPANY</span>
        <span class="ec-c-amount ec-hdr">GRAND TOTAL</span>
        <span class="ec-c-badge ec-hdr">STATUS</span>
        <span class="ec-c-ago ec-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS["Draft"];
        const date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "-";
        const amount = doc.grand_total != null ? format_currency(doc.grand_total, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="ec-card" style="
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
            <span class="ec-c-id">${esc(doc.name)}</span>
            <span class="ec-c-emp">${esc(doc.employee_name)}</span>
            <span class="ec-c-date">${esc(date)}</span>
            <span class="ec-c-company">${esc(doc.company)}</span>
            <span class="ec-c-amount">${esc(amount)}</span>
            <span class="ec-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(doc.status || "Draft"))}</span>
            <span class="ec-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("ec-list")) $fl.addClass("ec-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".ec-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("ec-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("ec-ok");

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
                frappe.set_route("Form", "Expense Claim", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) hrms's own listview_settings for Expense Claim
    // so its own add_fields (company) keeps working.
    const existing = frappe.listview_settings["Expense Claim"] || {};

    frappe.listview_settings["Expense Claim"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "employee_name", "posting_date", "company", "grand_total", "currency", "status",
        ])),
        refresh(lv) {
            render(lv);
        },
    });
})();
