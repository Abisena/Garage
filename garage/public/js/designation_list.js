(() => {
    // Same card-list structure/technique as employee_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match Employee's own FORMAT. Designation is a plain master data
    // doctype (not a tree, no core listview_settings of its own) with only
    // two real fields of its own (designation_name, description) - no
    // status/company/department-equivalent field exists to badge, unlike
    // Employee/Department, so this keeps the same visual style (dark
    // header, zebra rows, checkbox, ago timestamp) without forcing a badge
    // column that has nothing real to show.
    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="dsg-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="dsg-c-id dsg-hdr">ID</span>
        <span class="dsg-c-desc dsg-hdr">DESCRIPTION</span>
        <span class="dsg-c-ago dsg-hdr"></span>
    </div>`;

    function card(doc) {
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="dsg-card" style="
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
            <span class="dsg-c-id">${esc(doc.designation_name || doc.name)}</span>
            <span class="dsg-c-desc">${esc((doc.description || "").replace(/<[^>]*>/g, " ").trim() || "-")}</span>
            <span class="dsg-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("dsg-list")) $fl.addClass("dsg-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".dsg-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("dsg-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("dsg-ok");

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
                frappe.set_route("Form", "Designation", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Designation to extend.
    frappe.listview_settings["Designation"] = {
        hide_name_column: true,
        add_fields: ["designation_name", "description"],
        refresh(lv) {
            render(lv);
        },
    };
})();
