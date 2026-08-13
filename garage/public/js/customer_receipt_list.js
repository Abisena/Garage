(() => {
    // Same card-list structure/technique as tax_period_closing_list.js
    // (see that file's own comments for the full reasoning) - explicit
    // user request to match the rest of this app's own FORMAT. Customer
    // Receipt is owned by imogi_finance, submittable, own 5-state Status
    // field (Draft/Issued/Partially Paid/Paid/Cancelled), no core
    // listview_settings and no imogi_finance duplicate-registration
    // collision. Column set: Customer/Posting Date/Total Amount/Paid
    // Amount/Outstanding Amount - the three amount columns together are
    // what actually tells you the payment state of a receipt at a
    // glance, not just its total.
    const STATUS = {
        "Draft":           { bg: "#f3f4f6", fg: "#4b5563" },
        "Issued":          { bg: "#dbeafe", fg: "#1d4ed8" },
        "Partially Paid":  { bg: "#fff7ed", fg: "#c2410c" },
        "Paid":            { bg: "#dcfce7", fg: "#15803d" },
        "Cancelled":       { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="cre-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="cre-c-id cre-hdr">ID</span>
        <span class="cre-c-customer cre-hdr">CUSTOMER</span>
        <span class="cre-c-date cre-hdr">POSTING DATE</span>
        <span class="cre-c-total cre-hdr">TOTAL AMOUNT</span>
        <span class="cre-c-paid cre-hdr">PAID AMOUNT</span>
        <span class="cre-c-outstanding cre-hdr">OUTSTANDING</span>
        <span class="cre-c-badge cre-hdr">STATUS</span>
        <span class="cre-c-ago cre-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS["Draft"];
        const date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "-";
        const total = doc.total_amount != null ? format_currency(doc.total_amount, doc.currency) : "-";
        const paid = doc.paid_amount != null ? format_currency(doc.paid_amount, doc.currency) : "-";
        const outstanding = doc.outstanding_amount != null ? format_currency(doc.outstanding_amount, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="cre-card" style="
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
            <span class="cre-c-id">${esc(doc.name)}</span>
            <span class="cre-c-customer">${esc(doc.customer)}</span>
            <span class="cre-c-date">${esc(date)}</span>
            <span class="cre-c-total">${esc(total)}</span>
            <span class="cre-c-paid">${esc(paid)}</span>
            <span class="cre-c-outstanding">${esc(outstanding)}</span>
            <span class="cre-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(doc.status || "Draft"))}</span>
            <span class="cre-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("cre-list")) $fl.addClass("cre-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".cre-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("cre-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("cre-ok");

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
                frappe.set_route("Form", "Customer Receipt", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Customer Receipt to extend.
    frappe.listview_settings["Customer Receipt"] = {
        hide_name_column: true,
        add_fields: ["customer", "posting_date", "total_amount", "paid_amount", "outstanding_amount", "status"],
        refresh(lv) {
            render(lv);
        },
    };
})();
