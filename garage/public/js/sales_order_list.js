(() => {
    // Sales Order's own status options (selling/doctype/sales_order/
    // sales_order.json) - a different set from Purchase Order's own, so
    // this is its own map rather than reusing purchase_order_list.js's
    // one. Colors chosen to match core's own get_indicator (buying/
    // doctype/sales_order/sales_order_list.js) where the meaning lines up
    // (Completed/Closed=green, On Hold/To Deliver*/To Bill=orange,
    // Cancelled=red).
    const STATUS = {
        "Draft":               { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "On Hold":             { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "To Deliver and Bill": { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "To Bill":             { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "To Deliver":          { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Completed":           { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Closed":              { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Cancelled":           { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    // Same ID/Date/Customer Name/Grand Total/Status card layout as
    // purchase_order_list.js, for visual consistency across the app's
    // transaction list views - see that file's own header comment for why
    // the header padding needs the extra var(--padding-xs) on both sides.
    const HEADER_HTML = `<div class="so-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="so-c-id so-hdr">ID</span>
        <span class="so-c-date so-hdr">DATE</span>
        <span class="so-c-customer so-hdr">CUSTOMER NAME</span>
        <span class="so-c-amount so-hdr">GRAND TOTAL</span>
        <span class="so-c-badge so-hdr">STATUS</span>
        <span class="so-c-ago so-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS.Draft;
        const customer = doc.customer_name || doc.customer || "";
        const date = doc.transaction_date ? frappe.datetime.str_to_user(doc.transaction_date) : "";
        const amount = format_currency(doc.grand_total || 0, doc.currency);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="so-card" style="
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
            <span class="so-c-id">${esc(doc.name)}</span>
            <span class="so-c-date">${esc(date)}</span>
            <span class="so-c-customer">${esc(customer)}</span>
            <span class="so-c-amount">${amount}</span>
            <span class="so-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status)}</span>
            <span class="so-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("so-list")) $fl.addClass("so-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".so-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("so-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("so-ok");

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
                frappe.set_route("Form", "Sales Order", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own listview_settings for Sales Order
    // (selling/doctype/sales_order/sales_order_list.js, loaded first since
    // erpnext precedes garage in apps.txt) so its get_indicator and the
    // onload bulk-action buttons (Delivery Note/Sales Invoice/etc.) keep
    // working.
    const existing = frappe.listview_settings["Sales Order"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Sales Order"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "customer_name", "transaction_date", "status", "grand_total", "currency",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });

    // Same eval/settings race as purchase_order_list.js (confirmed live
    // for this doctype too) - see garage.registerListRenderOverride()'s
    // own comment (garage_theme.js) for the full root cause.
    garage.registerListRenderOverride("Sales Order", render, [
        "customer_name", "transaction_date", "status", "grand_total", "currency",
    ]);
})();
