(() => {
    // Same card-list structure/technique as item_list.js (see that file's
    // own comments for the full reasoning) - explicit user request to
    // match Item's own FORMAT. Item Group has none of Item's own fields
    // though (no Item Group/UOM/get_indicator - it's a tree doctype,
    // is_tree:1, no core listview_settings of its own to extend either,
    // same situation as Account), so the column set is Item Group's own:
    // Item Group Name/Parent Item Group, plus a Status badge off its own
    // `is_group` checkbox (Grup = a folder/category node with children,
    // Kategori = a real leaf item groups actually get assigned to) in the
    // slot Status fills on Item's own list.
    const STATUS = {
        group: { bg: "#dbeafe", fg: "#1d4ed8" },
        leaf:  { bg: "#dcfce7", fg: "#15803d" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="ig-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="ig-c-id ig-hdr">ID</span>
        <span class="ig-c-name ig-hdr">ITEM GROUP NAME</span>
        <span class="ig-c-parent ig-hdr">PARENT ITEM GROUP</span>
        <span class="ig-c-badge ig-hdr">STATUS</span>
        <span class="ig-c-ago ig-hdr"></span>
    </div>`;

    function card(doc) {
        const isGroup = cint(doc.is_group);
        const s = isGroup ? STATUS.group : STATUS.leaf;
        const label = isGroup ? __("Grup") : __("Kategori");
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="ig-card" style="
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
            <span class="ig-c-id">${esc(doc.name)}</span>
            <span class="ig-c-name" style="${isGroup ? 'font-weight:700;' : ''}">${esc(doc.item_group_name || doc.name)}</span>
            <span class="ig-c-parent">${esc(doc.parent_item_group || "-")}</span>
            <span class="ig-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="ig-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("ig-list")) $fl.addClass("ig-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".ig-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("ig-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("ig-ok");

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
                frappe.set_route("Form", "Item Group", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Item Group to extend (it's a
    // tree doctype - is_tree:1 - normally browsed via Tree View, same
    // situation as Account's own item_list.js).
    frappe.listview_settings["Item Group"] = {
        hide_name_column: true,
        add_fields: ["item_group_name", "parent_item_group", "is_group"],
        refresh(lv) {
            render(lv);
        },
    };
})();
