(() => {
    // Same card-list structure/technique as tax_invoice_type_list.js (see
    // that file's own comments for the full reasoning, including showing
    // the autoname-source field as its own column even though it
    // duplicates the ID today) - explicit user request to match the rest
    // of this app's own FORMAT. Role is core Frappe (Core module), plain
    // master data (not a tree, not submittable, no core listview_settings
    // of its own, no imogi_finance collision). Multiple independent Check
    // flags here (Desk Access/Is Custom, both shown as their own tags -
    // same reasoning as asset_category_list.js's CWIP tag) plus the usual
    // Status badge off `disabled`.
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };
    const TAG_ON = { bg: "#dbeafe", fg: "#1d4ed8" };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="rol-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="rol-c-id rol-hdr">ID</span>
        <span class="rol-c-name rol-hdr">ROLE NAME</span>
        <span class="rol-c-desk rol-hdr">DESK ACCESS</span>
        <span class="rol-c-custom rol-hdr">CUSTOM</span>
        <span class="rol-c-badge rol-hdr">STATUS</span>
        <span class="rol-c-ago rol-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = cint(doc.disabled);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const hasDeskAccess = cint(doc.desk_access);
        const isCustom = cint(doc.is_custom);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="rol-card" style="
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
            <span class="rol-c-id">${esc(doc.name)}</span>
            <span class="rol-c-name">${esc(doc.role_name)}</span>
            <span class="rol-c-desk">${hasDeskAccess ? `<span class="rol-tag" style="background:${TAG_ON.bg};color:${TAG_ON.fg};">${esc(__("Desk"))}</span>` : ""}</span>
            <span class="rol-c-custom">${isCustom ? `<span class="rol-tag" style="background:${TAG_ON.bg};color:${TAG_ON.fg};">${esc(__("Custom"))}</span>` : ""}</span>
            <span class="rol-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="rol-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("rol-list")) $fl.addClass("rol-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".rol-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("rol-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("rol-ok");

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
                frappe.set_route("Form", "Role", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Role to extend.
    frappe.listview_settings["Role"] = {
        hide_name_column: true,
        add_fields: ["role_name", "disabled", "is_custom", "desk_access"],
        refresh(lv) {
            render(lv);
        },
    };
})();
