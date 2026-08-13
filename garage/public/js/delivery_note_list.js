(() => {
    // Delivery Note's own status options (stock/doctype/delivery_note/
    // delivery_note.json: Draft/To Bill/Partially Billed/Completed/Return/
    // Return Issued/Cancelled/Closed) - its own map since the option set
    // differs from Sales Order's. Colors follow the same convention as
    // sales_order_list.js/purchase_order_list.js (Completed/Closed=green,
    // To Bill/Partially Billed=orange-ish, Cancelled=red).
    const STATUS = {
        "Draft":            { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "To Bill":          { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Partially Billed": { bg: "#fef3c7", fg: "#92400e", border: "#f59e0b" },
        "Completed":        { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Return":           { bg: "#f3e8ff", fg: "#7c3aed", border: "#8b5cf6" },
        "Return Issued":    { bg: "#f3e8ff", fg: "#7c3aed", border: "#8b5cf6" },
        "Cancelled":        { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
        "Closed":           { bg: "#e5e7eb", fg: "#374151", border: "#6b7280" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    // Same ID/Date/Customer Name/Grand Total/Status card layout as
    // sales_order_list.js/purchase_order_list.js, for visual consistency
    // across the app's transaction list views.
    const HEADER_HTML = `<div class="dn-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="dn-c-id dn-hdr">ID</span>
        <span class="dn-c-date dn-hdr">DATE</span>
        <span class="dn-c-customer dn-hdr">CUSTOMER NAME</span>
        <span class="dn-c-amount dn-hdr">GRAND TOTAL</span>
        <span class="dn-c-badge dn-hdr">STATUS</span>
        <span class="dn-c-ago dn-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS.Draft;
        const customer = doc.customer_name || doc.customer || "";
        const date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "";
        const amount = format_currency(doc.grand_total || 0, doc.currency);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="dn-card" style="
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
            <span class="dn-c-id">${esc(doc.name)}</span>
            <span class="dn-c-date">${esc(date)}</span>
            <span class="dn-c-customer">${esc(customer)}</span>
            <span class="dn-c-amount">${amount}</span>
            <span class="dn-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status)}</span>
            <span class="dn-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("dn-list")) $fl.addClass("dn-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".dn-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("dn-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("dn-ok");

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
                frappe.set_route("Form", "Delivery Note", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own listview_settings for Delivery
    // Note (stock/doctype/delivery_note/delivery_note_list.js, loaded
    // first since erpnext precedes garage in apps.txt) so its
    // get_indicator and the onload bulk-action buttons (Delivery Trip/
    // Sales Invoice/Packing Slip) keep working.
    const existing = frappe.listview_settings["Delivery Note"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Delivery Note"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "customer_name", "posting_date", "status", "grand_total", "currency",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });
})();
