(() => {
    // Same card-list structure/technique as employee_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match Expense Request/Payment Entry's own FORMAT. Expense
    // Approval Setting is a plain master data doctype (not a tree, not
    // submittable, no core listview_settings of its own, no imogi_finance
    // duplicate-registration collision either). Column set is its own:
    // Cost Center, plus two Check fields - `is_active` becomes the usual
    // Status badge (Aktif/Nonaktif, same wording/palette as
    // salary_component_list.js elsewhere in this app), `is_default_for_
    // multi_cc` gets its own small "Default" tag next to it since it's a
    // second, independent boolean (a setting can be inactive AND still
    // flagged default, or active and not default - collapsing both into
    // one badge would lose one of the two states).
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };
    const DEFAULT_TAG = { bg: "#dbeafe", fg: "#1d4ed8" };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="eas-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="eas-c-id eas-hdr">ID</span>
        <span class="eas-c-cc eas-hdr">COST CENTER</span>
        <span class="eas-c-default eas-hdr">DEFAULT</span>
        <span class="eas-c-badge eas-hdr">STATUS</span>
        <span class="eas-c-ago eas-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = !cint(doc.is_active);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const isDefault = cint(doc.is_default_for_multi_cc);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="eas-card" style="
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
            <span class="eas-c-id">${esc(doc.name)}</span>
            <span class="eas-c-cc">${esc(doc.cost_center) || "-"}</span>
            <span class="eas-c-default">${isDefault ? `<span class="eas-tag" style="background:${DEFAULT_TAG.bg};color:${DEFAULT_TAG.fg};">${esc(__("Default"))}</span>` : ""}</span>
            <span class="eas-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="eas-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("eas-list")) $fl.addClass("eas-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".eas-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("eas-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("eas-ok");

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
                frappe.set_route("Form", "Expense Approval Setting", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Expense Approval Setting to
    // extend.
    frappe.listview_settings["Expense Approval Setting"] = {
        hide_name_column: true,
        add_fields: ["cost_center", "is_active", "is_default_for_multi_cc"],
        refresh(lv) {
            render(lv);
        },
    };
})();
