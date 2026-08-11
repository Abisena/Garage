(() => {
    // Same card-list structure/technique as employee_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match Employee's own FORMAT. Payroll Period is a plain master
    // data doctype (not a tree, not submittable, no core listview_settings
    // of its own) with no status-equivalent field of its own (unlike
    // Department/Salary Component etc.) - so no badge column, same
    // reasoning as designation_list.js/branch_list.js. Column set is its
    // own: Company/Start Date/End Date.
    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="pp-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="pp-c-id pp-hdr">ID</span>
        <span class="pp-c-company pp-hdr">COMPANY</span>
        <span class="pp-c-start pp-hdr">START DATE</span>
        <span class="pp-c-end pp-hdr">END DATE</span>
        <span class="pp-c-ago pp-hdr"></span>
    </div>`;

    function card(doc) {
        const start_date = doc.start_date ? frappe.datetime.str_to_user(doc.start_date) : "-";
        const end_date = doc.end_date ? frappe.datetime.str_to_user(doc.end_date) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="pp-card" style="
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
            <span class="pp-c-id">${esc(doc.name)}</span>
            <span class="pp-c-company">${esc(doc.company)}</span>
            <span class="pp-c-start">${esc(start_date)}</span>
            <span class="pp-c-end">${esc(end_date)}</span>
            <span class="pp-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("pp-list")) $fl.addClass("pp-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".pp-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("pp-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("pp-ok");

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
                frappe.set_route("Form", "Payroll Period", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Payroll Period to extend.
    frappe.listview_settings["Payroll Period"] = {
        hide_name_column: true,
        add_fields: ["company", "start_date", "end_date"],
        refresh(lv) {
            render(lv);
        },
    };
})();
