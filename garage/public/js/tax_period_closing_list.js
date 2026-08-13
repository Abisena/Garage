(() => {
    // Same card-list structure/technique as internal_charge_request_
    // list.js (see that file's own comments for the full reasoning) -
    // explicit user request to match the rest of this app's own FORMAT.
    // Tax Period Closing is owned by imogi_finance, submittable, own
    // 4-state Status field (Draft/Reviewed/Approved/Closed - a review
    // pipeline, not an approval one, different palette progression than
    // the Pending/Approved/Rejected pattern elsewhere in this app).
    // Column set: Period (period_month/period_year combined into one
    // MM/YYYY column, cleaner than two separate ones for what's really a
    // single concept)/Company/VAT Net (the headline reconciliation
    // figure)/Status.
    const STATUS = {
        "Draft":    { bg: "#f3f4f6", fg: "#4b5563" },
        "Reviewed": { bg: "#fff7ed", fg: "#c2410c" },
        "Approved": { bg: "#dbeafe", fg: "#1d4ed8" },
        "Closed":   { bg: "#dcfce7", fg: "#15803d" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="tpc-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="tpc-c-id tpc-hdr">ID</span>
        <span class="tpc-c-period tpc-hdr">PERIOD</span>
        <span class="tpc-c-company tpc-hdr">COMPANY</span>
        <span class="tpc-c-vat tpc-hdr">VAT NET</span>
        <span class="tpc-c-badge tpc-hdr">STATUS</span>
        <span class="tpc-c-ago tpc-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS["Draft"];
        const month = doc.period_month ? String(doc.period_month).padStart(2, "0") : "-";
        const period = doc.period_year ? `${month}/${doc.period_year}` : "-";
        const vat = doc.vat_net != null ? format_currency(doc.vat_net, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="tpc-card" style="
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
            <span class="tpc-c-id">${esc(doc.name)}</span>
            <span class="tpc-c-period">${esc(period)}</span>
            <span class="tpc-c-company">${esc(doc.company)}</span>
            <span class="tpc-c-vat">${esc(vat)}</span>
            <span class="tpc-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(doc.status || "Draft"))}</span>
            <span class="tpc-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("tpc-list")) $fl.addClass("tpc-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".tpc-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("tpc-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("tpc-ok");

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
                frappe.set_route("Form", "Tax Period Closing", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Tax Period Closing to extend.
    frappe.listview_settings["Tax Period Closing"] = {
        hide_name_column: true,
        add_fields: ["period_month", "period_year", "company", "vat_net", "status"],
        refresh(lv) {
            render(lv);
        },
    };
})();
