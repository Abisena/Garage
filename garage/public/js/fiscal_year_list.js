(() => {
    // Same card-list structure/technique as bank_statement_bank_list_
    // list.js (see that file's own comments for the full reasoning) -
    // explicit user request to match the rest of this app's own FORMAT.
    // Fiscal Year is core Frappe (Accounts module), plain master data (not
    // a tree, not submittable, no core listview_settings of its own, no
    // imogi_finance collision either). `year` DOES get its own column per
    // explicit follow-up request, even though autoname "field:year" makes
    // its value identical to ID today - shown anyway since the user wants
    // it visible as its own labeled column. Column set: Year Name/Year
    // Start Date/Year End Date, Status badge off `disabled` (Aktif/
    // Nonaktif, same wording/palette as bank_account_list.js elsewhere in
    // this app).
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="fy-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="fy-c-id fy-hdr">ID</span>
        <span class="fy-c-year fy-hdr">YEAR NAME</span>
        <span class="fy-c-start fy-hdr">YEAR START DATE</span>
        <span class="fy-c-end fy-hdr">YEAR END DATE</span>
        <span class="fy-c-badge fy-hdr">STATUS</span>
        <span class="fy-c-ago fy-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = cint(doc.disabled);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const start = doc.year_start_date ? frappe.datetime.str_to_user(doc.year_start_date) : "-";
        const end = doc.year_end_date ? frappe.datetime.str_to_user(doc.year_end_date) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="fy-card" style="
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
            <span class="fy-c-id">${esc(doc.name)}</span>
            <span class="fy-c-year">${esc(doc.year)}</span>
            <span class="fy-c-start">${esc(start)}</span>
            <span class="fy-c-end">${esc(end)}</span>
            <span class="fy-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="fy-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("fy-list")) $fl.addClass("fy-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".fy-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("fy-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("fy-ok");

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
                frappe.set_route("Form", "Fiscal Year", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Fiscal Year to extend.
    frappe.listview_settings["Fiscal Year"] = {
        hide_name_column: true,
        add_fields: ["year", "year_start_date", "year_end_date", "disabled"],
        refresh(lv) {
            render(lv);
        },
    };
})();
