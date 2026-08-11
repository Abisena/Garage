(() => {
    // Same bg/fg palette style as garage_service_order_list.js, mapped from
    // ERPNext's own sales_invoice_list.js status_colors so the semantics match.
    const STATUS = {
        "Draft":                       { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "Unpaid":                      { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Paid":                        { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Return":                      { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "Credit Note Issued":          { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "Unpaid and Discounted":       { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Partly Paid and Discounted":  { bg: "#fef9c3", fg: "#92400e", border: "#eab308" },
        "Overdue and Discounted":      { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
        "Overdue":                     { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
        "Partly Paid":                 { bg: "#fef9c3", fg: "#92400e", border: "#eab308" },
        "Internal Transfer":           { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="si-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="si-c-id si-hdr">ID</span>
        <span class="si-c-date si-hdr">TANGGAL</span>
        <span class="si-c-so si-hdr">SERVICE ORDER</span>
        <span class="si-c-plate si-hdr">NO. POLISI</span>
        <span class="si-c-customer si-hdr">CUSTOMER</span>
        <span class="si-c-outstanding si-hdr">OUTSTANDING</span>
        <span class="si-c-amt si-hdr">GRAND TOTAL</span>
        <span class="si-c-badge si-hdr">STATUS</span>
        <span class="si-c-ago si-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS.Draft;
        const customer = doc.customer_name || doc.customer || "";
        const so = doc.service_order || "";
        const plate = doc.no_polisi || "";
        const date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "";
        const outstanding = format_currency(doc.outstanding_amount || 0, doc.currency);
        const amount = format_currency(doc.grand_total || 0, doc.currency);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="si-card" style="
            display:flex !important;
            align-items:center;
            width:100%;
            padding:10px 14px 10px 0;
            gap:10px;
            cursor:pointer;
            border-left:3px solid ${s.border};
        ">
            <div style="flex:0 0 36px; display:flex; align-items:center; justify-content:center;">
                <input type="checkbox" class="list-row-checkbox" data-name="${esc(doc.name)}" style="cursor:pointer;">
            </div>
            <span class="si-c-id">${esc(doc.name)}</span>
            <span class="si-c-date">${esc(date)}</span>
            <span class="si-c-so" title="${esc(so)}">${so ? esc(so) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="si-c-plate">${plate ? esc(plate) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="si-c-customer">${esc(customer)}</span>
            <span class="si-c-outstanding">${flt(doc.outstanding_amount) > 0 ? outstanding : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="si-c-amt">${amount}</span>
            <span class="si-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status)}</span>
            <span class="si-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("si-list")) $fl.addClass("si-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".si-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("si-ok")) return;

            const name = $row.find("input.list-row-checkbox").data("name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("si-ok");

            // Force-hide ALL old Frappe children via inline !important
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
                frappe.set_route("Form", "Sales Invoice", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own listview_settings for Sales Invoice
    // (accounts/doctype/sales_invoice/sales_invoice_list.js, loaded first
    // since erpnext precedes garage in apps.txt) so its get_indicator and
    // the "Delivery Note"/"Payment" bulk-action buttons in onload keep working.
    const existing = frappe.listview_settings["Sales Invoice"] || {};
    const existing_refresh = existing.refresh;

    frappe.listview_settings["Sales Invoice"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "service_order", "no_polisi", "grand_total", "status", "currency",
            "posting_date", "outstanding_amount",
        ])),
        refresh(lv) {
            if (existing_refresh) existing_refresh(lv);
            render(lv);
        },
    });
})();
