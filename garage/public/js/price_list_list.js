(() => {
    // Same card-list structure/technique as item_list.js (see that file's
    // own comments for the full reasoning) - explicit user request to
    // match Item's own FORMAT. Price List's own `name` IS price_list_name
    // (autoname: field, confirmed live - "Standard Buying"/"Standard
    // Selling" are both doc.name and price_list_name at once), so there's
    // no separate "name" column to show alongside ID the way Item/Item
    // Group/Item Price all have - Currency takes that second slot
    // instead. Type (Buying/Selling, its own two checkboxes) is a plain
    // text column here, Status (its own `enabled` checkbox) is the badge,
    // same slot Status fills on Item's own list.
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#f3f4f6", fg: "#4b5563" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="pl-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="pl-c-id pl-hdr">ID</span>
        <span class="pl-c-currency pl-hdr">CURRENCY</span>
        <span class="pl-c-type pl-hdr">TYPE</span>
        <span class="pl-c-badge pl-hdr">STATUS</span>
        <span class="pl-c-ago pl-hdr"></span>
    </div>`;

    function card(doc) {
        const enabled = cint(doc.enabled);
        const s = enabled ? STATUS.active : STATUS.disabled;
        const label = enabled ? __("Aktif") : __("Nonaktif");
        const types = [];
        if (cint(doc.buying)) types.push(__("Buying"));
        if (cint(doc.selling)) types.push(__("Selling"));
        const type = types.join(" & ") || "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="pl-card" style="
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
            <span class="pl-c-id">${esc(doc.name)}</span>
            <span class="pl-c-currency">${esc(doc.currency)}</span>
            <span class="pl-c-type">${esc(type)}</span>
            <span class="pl-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="pl-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("pl-list")) $fl.addClass("pl-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".pl-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("pl-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("pl-ok");

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
                frappe.set_route("Form", "Price List", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Price List to extend.
    frappe.listview_settings["Price List"] = {
        hide_name_column: true,
        add_fields: ["price_list_name", "currency", "buying", "selling", "enabled"],
        refresh(lv) {
            render(lv);
        },
    };
})();
