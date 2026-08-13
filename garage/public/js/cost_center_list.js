(() => {
    // Same card-list structure/technique as department_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match the rest of this app's own FORMAT. Cost Center is a tree
    // doctype (is_tree:1, same situation as Department/Account/Item
    // Group) with NO core listview_settings of its own to extend, so this
    // is plain assignment, same as department_list.js. Column set is Cost
    // Center's own: Cost Center Name/Cost Center Number/Parent Cost
    // Center/Company, plus a Status badge off its own `disabled` checkbox
    // (Aktif/Nonaktif, same wording used for this same concept elsewhere
    // in this app).
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="cc-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="cc-c-id cc-hdr">ID</span>
        <span class="cc-c-name cc-hdr">COST CENTER NAME</span>
        <span class="cc-c-number cc-hdr">NUMBER</span>
        <span class="cc-c-parent cc-hdr">PARENT COST CENTER</span>
        <span class="cc-c-company cc-hdr">COMPANY</span>
        <span class="cc-c-badge cc-hdr">STATUS</span>
        <span class="cc-c-ago cc-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = cint(doc.disabled);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const isGroup = cint(doc.is_group);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="cc-card" style="
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
            <span class="cc-c-id">${esc(doc.name)}</span>
            <span class="cc-c-name" style="${isGroup ? 'font-weight:700;' : ''}">${esc(doc.cost_center_name || doc.name)}</span>
            <span class="cc-c-number">${esc(doc.cost_center_number) || "-"}</span>
            <span class="cc-c-parent">${esc(doc.parent_cost_center || "-")}</span>
            <span class="cc-c-company">${esc(doc.company)}</span>
            <span class="cc-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="cc-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("cc-list")) $fl.addClass("cc-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".cc-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("cc-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("cc-ok");

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
                frappe.set_route("Form", "Cost Center", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Cost Center to extend (it's a
    // tree doctype - is_tree:1 - normally browsed via Tree View, same
    // situation as Department/Account/Item Group's own list.js).
    frappe.listview_settings["Cost Center"] = {
        hide_name_column: true,
        add_fields: ["cost_center_name", "cost_center_number", "parent_cost_center", "company", "is_group", "disabled"],
        refresh(lv) {
            render(lv);
        },
    };
})();
