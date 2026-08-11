(() => {
    // Same card-list structure/technique as expense_approval_setting_
    // list.js (see that file's own comments for the full reasoning) -
    // explicit user request to match the rest of this app's own FORMAT.
    // Budget Approval Setting is a plain master data doctype (not a tree,
    // not submittable, no core listview_settings of its own, no
    // imogi_finance duplicate-registration collision either) - same
    // shape as Expense Approval Setting but simpler: just Cost Center and
    // a single `is_active` Check (no second independent "Default" flag
    // this time), so just the usual Status badge (Aktif/Nonaktif, same
    // wording/palette as elsewhere in this app), no separate tag column.
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="bas-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="bas-c-id bas-hdr">ID</span>
        <span class="bas-c-cc bas-hdr">COST CENTER</span>
        <span class="bas-c-badge bas-hdr">STATUS</span>
        <span class="bas-c-ago bas-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = !cint(doc.is_active);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="bas-card" style="
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
            <span class="bas-c-id">${esc(doc.name)}</span>
            <span class="bas-c-cc">${esc(doc.cost_center) || __("System Default")}</span>
            <span class="bas-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="bas-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("bas-list")) $fl.addClass("bas-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".bas-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("bas-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("bas-ok");

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
                frappe.set_route("Form", "Budget Approval Setting", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Budget Approval Setting to
    // extend.
    frappe.listview_settings["Budget Approval Setting"] = {
        hide_name_column: true,
        add_fields: ["cost_center", "is_active"],
        refresh(lv) {
            render(lv);
        },
    };
})();
