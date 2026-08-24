(() => {
    // Same structure/technique as purchase_order_list.js (see that file's
    // own comments for the full reasoning on header padding, hide_name_
    // column, the extend-not-replace pattern, etc.) - explicit user
    // request to match Purchase Order's card FORMAT, but Purchase
    // Receipt's own column names/count stay as-is (Supplier Name/Date/
    // Grand Total/Status, not PO's exact field set - posting_date instead
    // of transaction_date is the one genuine difference between the two
    // doctypes here).
    const STATUS = {
        "Draft":           { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "To Bill":         { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Partly Billed":   { bg: "#fef9c3", fg: "#a16207", border: "#eab308" },
        "Completed":       { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Return":          { bg: "#f3e8ff", fg: "#7c3aed", border: "#8b5cf6" },
        "Return Issued":   { bg: "#f3e8ff", fg: "#7c3aed", border: "#8b5cf6" },
        "Cancelled":       { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
        "Closed":          { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="pr-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="pr-c-id pr-hdr">ID</span>
        <span class="pr-c-date pr-hdr">DATE</span>
        <span class="pr-c-supplier pr-hdr">SUPPLIER NAME</span>
        <span class="pr-c-amount pr-hdr">GRAND TOTAL</span>
        <span class="pr-c-badge pr-hdr">STATUS</span>
        <span class="pr-c-ago pr-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS.Draft;
        const supplier = doc.supplier_name || doc.supplier || "";
        const date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "";
        const amount = format_currency(doc.grand_total || 0, doc.currency);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="pr-card" style="
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
            <span class="pr-c-id">${esc(doc.name)}</span>
            <span class="pr-c-date">${esc(date)}</span>
            <span class="pr-c-supplier">${esc(supplier)}</span>
            <span class="pr-c-amount">${amount}</span>
            <span class="pr-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status)}</span>
            <span class="pr-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("pr-list")) $fl.addClass("pr-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".pr-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("pr-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("pr-ok");

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
                frappe.set_route("Form", "Purchase Receipt", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own listview_settings for Purchase
    // Receipt (stock/doctype/purchase_receipt/purchase_receipt_list.js,
    // loaded first since erpnext precedes garage in apps.txt) so its
    // get_indicator and the "Purchase Invoice" bulk-action button in
    // onload keep working.
    const existing = frappe.listview_settings["Purchase Receipt"] || {};
    const existing_onload = existing.onload;
    const existing_get_indicator = existing.get_indicator;

    frappe.listview_settings["Purchase Receipt"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "supplier_name", "posting_date", "status", "grand_total", "currency",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
        get_indicator(doc) {
            return existing_get_indicator ? existing_get_indicator(doc) : undefined;
        },
    });

    // Same eval/settings race as purchase_order_list.js (confirmed live
    // for this doctype too) - see garage.registerListRenderOverride()'s
    // own comment (garage_theme.js) for the full root cause.
    garage.registerListRenderOverride("Purchase Receipt", render, [
        "supplier_name", "posting_date", "status", "grand_total", "currency",
    ]);
})();
