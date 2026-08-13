(() => {
    // Same card-list structure/technique as asset_category_list.js (see
    // that file's own comments for the full reasoning) - explicit user
    // request to match the rest of this app's own FORMAT. Asset
    // Depreciation Schedule is core erpnext (Assets module), submittable,
    // own 3-state Status field (Draft/Active/Cancelled), no core
    // listview_settings of its own and no imogi_finance collision.
    // Column set: Asset/Company/Depreciation Method/Gross Purchase
    // Amount.
    const STATUS = {
        "Draft":     { bg: "#f3f4f6", fg: "#4b5563" },
        "Active":    { bg: "#dcfce7", fg: "#15803d" },
        "Cancelled": { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="ads-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="ads-c-id ads-hdr">ID</span>
        <span class="ads-c-asset ads-hdr">ASSET</span>
        <span class="ads-c-company ads-hdr">COMPANY</span>
        <span class="ads-c-method ads-hdr">DEPRECIATION METHOD</span>
        <span class="ads-c-amount ads-hdr">GROSS PURCHASE AMOUNT</span>
        <span class="ads-c-badge ads-hdr">STATUS</span>
        <span class="ads-c-ago ads-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS["Draft"];
        const amount = doc.gross_purchase_amount != null ? format_currency(doc.gross_purchase_amount, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="ads-card" style="
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
            <span class="ads-c-id">${esc(doc.name)}</span>
            <span class="ads-c-asset">${esc(doc.asset)}</span>
            <span class="ads-c-company">${esc(doc.company) || "-"}</span>
            <span class="ads-c-method">${esc(doc.depreciation_method) || "-"}</span>
            <span class="ads-c-amount">${esc(amount)}</span>
            <span class="ads-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(doc.status || "Draft"))}</span>
            <span class="ads-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("ads-list")) $fl.addClass("ads-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".ads-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("ads-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("ads-ok");

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
                frappe.set_route("Form", "Asset Depreciation Schedule", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Asset Depreciation Schedule to
    // extend.
    frappe.listview_settings["Asset Depreciation Schedule"] = {
        hide_name_column: true,
        add_fields: ["asset", "company", "depreciation_method", "gross_purchase_amount", "status"],
        refresh(lv) {
            render(lv);
        },
    };
})();
