(() => {
    // Same card-list structure/technique as sales_order_list.js (see that
    // file's own comments for the full reasoning on header padding,
    // hide_name_column, the extend-not-replace pattern, etc.) - explicit
    // user request to match Sales Order's FORMAT. Item has none of Sales
    // Order's own fields though (no date/party/amount - it's a master
    // data doctype, not a transaction), so the column set is Item's own:
    // Item Name/Item Group/UOM, plus a Status badge built from core's own
    // get_indicator() (item_list.js, erpnext/stock/doctype/item) so
    // Disabled/Expired/Template/Variant/Active reads the same way here as
    // it does anywhere else core already surfaces that same indicator.
    const STATUS = {
        Aktif:    { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        Disabled: { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        Expired:  { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        Template: { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        Variant:  { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="it-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="it-c-id it-hdr">ID</span>
        <span class="it-c-name it-hdr">ITEM NAME</span>
        <span class="it-c-group it-hdr">ITEM GROUP</span>
        <span class="it-c-uom it-hdr">UOM</span>
        <span class="it-c-badge it-hdr">STATUS</span>
        <span class="it-c-ago it-hdr"></span>
    </div>`;

    function card(doc) {
        // Reuses core's own get_indicator (extended onto listview_settings
        // below) rather than re-deriving Disabled/Expired/Template/Variant
        // logic a second time here - only the label is used, mapped to
        // this file's own badge colors via STATUS.
        const existing = frappe.listview_settings["Item"];
        const indicator = existing && existing.get_indicator ? existing.get_indicator(doc) : null;
        const label = indicator ? indicator[0] : __("Aktif");
        const s = STATUS[label] || STATUS.Aktif;
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="it-card" style="
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
            <span class="it-c-id">${esc(doc.name)}</span>
            <span class="it-c-name">${esc(doc.item_name)}</span>
            <span class="it-c-group">${esc(doc.item_group)}</span>
            <span class="it-c-uom">${esc(doc.stock_uom)}</span>
            <span class="it-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="it-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("it-list")) $fl.addClass("it-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".it-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("it-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("it-ok");

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
                frappe.set_route("Form", "Item", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own listview_settings for Item
    // (stock/doctype/item/item_list.js, loaded first since erpnext
    // precedes garage in apps.txt) so its get_indicator, default
    // "disabled = 0" filter, and Stock Summary/Ledger/Balance/Projected
    // Qty report shortcuts all keep working.
    const existing = frappe.listview_settings["Item"] || {};

    frappe.listview_settings["Item"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "item_name", "item_group", "stock_uom",
        ])),
        refresh(lv) {
            render(lv);
        },
    });
})();
