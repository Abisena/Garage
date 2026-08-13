(() => {
    // Same card-list structure/technique as employee_checkin_list.js -
    // explicit user request to match that doctype's listview format.
    // Core hrms ships its own listview_settings for Attendance
    // (hr/doctype/attendance/attendance_list.js: get_indicator maps
    // status -> green/red/orange, plus an onload "Mark Attendance" bulk
    // dialog). This extends (not replaces) it, preserving that onload,
    // and DOES use core's get_indicator for the STATUS badge - unlike
    // Employee Checkin's "LOG TYPE" column, this column is actually
    // labeled "STATUS", so showing the status indicator here is correct,
    // not a mismatch. Column set: Employee Name/Date/Shift/Status.
    const COLOR_MAP = {
        red:    { bg: "#fee2e2", fg: "#b91c1c" },
        blue:   { bg: "#dbeafe", fg: "#1d4ed8" },
        orange: { bg: "#fff7ed", fg: "#c2410c" },
        yellow: { bg: "#fef9c3", fg: "#a16207" },
        green:  { bg: "#dcfce7", fg: "#15803d" },
        gray:   { bg: "#f3f4f6", fg: "#4b5563" },
        grey:   { bg: "#f3f4f6", fg: "#4b5563" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="att-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="att-c-id att-hdr">ID</span>
        <span class="att-c-emp att-hdr">EMPLOYEE NAME</span>
        <span class="att-c-date att-hdr">DATE</span>
        <span class="att-c-shift att-hdr">SHIFT</span>
        <span class="att-c-badge att-hdr">STATUS</span>
        <span class="att-c-ago att-hdr"></span>
    </div>`;

    function card(doc) {
        const existing = frappe.listview_settings["Attendance"];
        const indicator = existing && existing.get_indicator ? existing.get_indicator(doc) : null;
        const label = indicator ? indicator[0] : __(doc.status || "-");
        const s = indicator ? (COLOR_MAP[indicator[1]] || COLOR_MAP.gray) : COLOR_MAP.gray;

        const date = doc.attendance_date ? frappe.datetime.str_to_user(doc.attendance_date) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="att-card" style="
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
            <span class="att-c-id">${esc(doc.name)}</span>
            <span class="att-c-emp">${esc(doc.employee_name) || "-"}</span>
            <span class="att-c-date">${esc(date)}</span>
            <span class="att-c-shift">${esc(doc.shift) || __("Non Shift")}</span>
            <span class="att-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="att-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("att-list")) $fl.addClass("att-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".att-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("att-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("att-ok");

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
                frappe.set_route("Form", "Attendance", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) core hrms's own listview_settings for
    // Attendance (hr/doctype/attendance/attendance_list.js) so its own
    // onload ("Mark Attendance" bulk-marking dialog) keeps working.
    const existing = frappe.listview_settings["Attendance"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Attendance"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "employee_name", "attendance_date", "shift", "status",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });
})();
