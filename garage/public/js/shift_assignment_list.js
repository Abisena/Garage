(() => {
    // Same card-list structure/technique as employee_checkin_list.js (see
    // that file's own comments for the full reasoning) - explicit user
    // request to match the rest of this app's own FORMAT. Core hrms ships
    // a listview_settings for Shift Assignment too (hr/doctype/shift_
    // assignment/shift_assignment_list.js) but it's onload-only (adds the
    // "Shift Tools" button to the list toolbar) - no get_indicator, so
    // the Status badge here is built fresh off the doctype's own 2-state
    // Status Select (Active/Inactive). Column set: Employee Name/Shift
    // Type/Start Date/End Date.
    const STATUS = {
        "Active":   { bg: "#dcfce7", fg: "#15803d" },
        "Inactive": { bg: "#f3f4f6", fg: "#4b5563" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="sfa-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="sfa-c-id sfa-hdr">ID</span>
        <span class="sfa-c-emp sfa-hdr">EMPLOYEE NAME</span>
        <span class="sfa-c-shift sfa-hdr">SHIFT TYPE</span>
        <span class="sfa-c-start sfa-hdr">START DATE</span>
        <span class="sfa-c-end sfa-hdr">END DATE</span>
        <span class="sfa-c-badge sfa-hdr">STATUS</span>
        <span class="sfa-c-ago sfa-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS["Active"];
        const start = doc.start_date ? frappe.datetime.str_to_user(doc.start_date) : "-";
        const end = doc.end_date ? frappe.datetime.str_to_user(doc.end_date) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="sfa-card" style="
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
            <span class="sfa-c-id">${esc(doc.name)}</span>
            <span class="sfa-c-emp">${esc(doc.employee_name) || "-"}</span>
            <span class="sfa-c-shift">${esc(doc.shift_type) || "-"}</span>
            <span class="sfa-c-start">${esc(start)}</span>
            <span class="sfa-c-end">${esc(end)}</span>
            <span class="sfa-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(doc.status || "Active"))}</span>
            <span class="sfa-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("sfa-list")) $fl.addClass("sfa-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".sfa-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("sfa-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("sfa-ok");

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
                frappe.set_route("Form", "Shift Assignment", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) core hrms's own listview_settings for Shift
    // Assignment (hr/doctype/shift_assignment/shift_assignment_list.js,
    // loaded first since hrms precedes garage in apps.txt) so its own
    // onload (adds the "Shift Tools" button) keeps working.
    const existing = frappe.listview_settings["Shift Assignment"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Shift Assignment"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "employee_name", "shift_type", "start_date", "end_date", "status",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });
})();
