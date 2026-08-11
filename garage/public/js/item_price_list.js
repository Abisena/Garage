(() => {
    // Same card-list structure/technique as item_list.js (see that file's
    // own comments for the full reasoning) - explicit user request to
    // match Item's own FORMAT. Item Price's own `name` is a random hash
    // (autoname: "hash", confirmed live - not a human-readable ID the way
    // Item's own item_code is), so Item Code leads instead of doc.name
    // the way every other card list here leads with it. Column set is
    // Item Price's own: Item Code/Item Name/Price List/Rate, plus a
    // Buying/Selling badge (its own buying/selling checkboxes) in the
    // slot Status fills on Item's own list.
    const STATUS = {
        buying:  { bg: "#dbeafe", fg: "#1d4ed8" },
        selling: { bg: "#dcfce7", fg: "#15803d" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="ip-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="ip-c-code ip-hdr">ITEM CODE</span>
        <span class="ip-c-name ip-hdr">ITEM NAME</span>
        <span class="ip-c-list ip-hdr">PRICE LIST</span>
        <span class="ip-c-rate ip-hdr">RATE</span>
        <span class="ip-c-badge ip-hdr">STATUS</span>
        <span class="ip-c-ago ip-hdr"></span>
    </div>`;

    function card(doc) {
        const isBuying = cint(doc.buying);
        const s = isBuying ? STATUS.buying : STATUS.selling;
        const label = isBuying ? __("Buying") : __("Selling");
        const rate = format_currency(doc.price_list_rate || 0, doc.currency);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="ip-card" style="
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
            <span class="ip-c-code">${esc(doc.item_code)}</span>
            <span class="ip-c-name">${esc(doc.item_name)}</span>
            <span class="ip-c-list">${esc(doc.price_list)}</span>
            <span class="ip-c-rate">${rate}</span>
            <span class="ip-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="ip-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("ip-list")) $fl.addClass("ip-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".ip-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("ip-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("ip-ok");

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
                frappe.set_route("Form", "Item Price", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own listview_settings for Item Price
    // (stock/doctype/item_price/item_price_list.js, loaded first since
    // erpnext precedes garage in apps.txt) - just hide_name_column there
    // currently, nothing else to preserve, but following the same
    // extend-not-replace pattern as every other non-tree doctype's own
    // card list here regardless, in case that ever grows a get_indicator/
    // onload of its own later.
    const existing = frappe.listview_settings["Item Price"] || {};

    frappe.listview_settings["Item Price"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "item_code", "item_name", "price_list", "price_list_rate", "currency", "buying", "selling",
        ])),
        refresh(lv) {
            render(lv);
        },
    });
})();
