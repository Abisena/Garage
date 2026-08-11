(() => {
    // Same card-list structure/technique as cost_center_list.js (see
    // that file's own comments for the full reasoning) - explicit user
    // request to match the rest of this app's own FORMAT. Warehouse is
    // core erpnext (Stock module), a tree doctype (is_tree:1, same
    // situation as Department/Cost Center/Company) with NO core
    // listview_settings of its own to extend and no imogi_finance
    // collision. Column set: Warehouse Name/Parent Warehouse/Company,
    // plus a Status badge off `disabled` (Aktif/Nonaktif, same wording
    // used for this same concept elsewhere in this app).
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="whs-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="whs-c-id whs-hdr">ID</span>
        <span class="whs-c-name whs-hdr">WAREHOUSE NAME</span>
        <span class="whs-c-parent whs-hdr">PARENT WAREHOUSE</span>
        <span class="whs-c-company whs-hdr">COMPANY</span>
        <span class="whs-c-badge whs-hdr">STATUS</span>
        <span class="whs-c-ago whs-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = cint(doc.disabled);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const isGroup = cint(doc.is_group);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="whs-card" style="
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
            <span class="whs-c-id">${esc(doc.name)}</span>
            <span class="whs-c-name" style="${isGroup ? 'font-weight:700;' : ''}">${esc(doc.warehouse_name || doc.name)}</span>
            <span class="whs-c-parent">${esc(doc.parent_warehouse || "-")}</span>
            <span class="whs-c-company">${esc(doc.company) || "-"}</span>
            <span class="whs-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="whs-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("whs-list")) $fl.addClass("whs-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".whs-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("whs-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("whs-ok");

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
                frappe.set_route("Form", "Warehouse", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Warehouse to extend (it's a
    // tree doctype - is_tree:1 - normally browsed via Tree View, same
    // situation as Department/Cost Center's own list.js).
    frappe.listview_settings["Warehouse"] = {
        hide_name_column: true,
        add_fields: ["warehouse_name", "parent_warehouse", "company", "is_group", "disabled"],
        refresh(lv) {
            render(lv);
        },
    };
})();
