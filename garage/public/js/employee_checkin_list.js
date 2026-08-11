(() => {
    // Same card-list structure/technique as activity_log_list.js (see
    // that file's own comments for the original reasoning) - explicit
    // user request to match the rest of this app's own FORMAT. Core hrms
    // ships its own listview_settings for Employee Checkin (hr/doctype/
    // employee_checkin/employee_checkin_list.js: get_indicator returns an
    // "Off-Shift" badge instead of the real log_type whenever `offshift`
    // is set) plus an onload bulk action "Fetch Shifts". This extends
    // (not replaces) it, preserving that onload, but does NOT use core's
    // get_indicator for the badge - the "LOG TYPE" column always shows
    // the real doc.log_type (IN/OUT), matching what the record's own form
    // shows, instead of silently swapping in an unrelated off-shift status
    // under a column that says "LOG TYPE" (reported directly by the user
    // against EMP-CKIN-...-000004). Off-shift status is still visible via
    // the SHIFT column ("-" whenever offshift is set), so nothing is lost.
    // Column set: Employee Name/Time/Shift.
    const LOG_TYPE = {
        "IN":  { bg: "#dcfce7", fg: "#15803d" },
        "OUT": { bg: "#dbeafe", fg: "#1d4ed8" },
    };
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

    const HEADER_HTML = `<div class="chk-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="chk-c-id chk-hdr">ID</span>
        <span class="chk-c-emp chk-hdr">EMPLOYEE NAME</span>
        <span class="chk-c-time chk-hdr">TIME</span>
        <span class="chk-c-shift chk-hdr">SHIFT</span>
        <span class="chk-c-badge chk-hdr">LOG TYPE</span>
        <span class="chk-c-ago chk-hdr"></span>
    </div>`;

    function card(doc) {
        // Always the real log_type (IN/OUT) - the column is literally
        // headed "LOG TYPE", so it has to match doc.log_type, same value
        // shown on the record's own form (see EMP-CKIN-...-000004: log_type
        // "IN" on the form, but this badge used to show core's "Off-Shift"
        // indicator instead whenever offshift was set, hiding the actual
        // IN/OUT - reported directly by the user). Off-shift status is
        // still visible via the SHIFT column next to it, which is already
        // "-" whenever offshift is set, so nothing is lost by dropping
        // core's get_indicator() override here.
        const label = __(doc.log_type || "-");
        const s = LOG_TYPE[doc.log_type] || COLOR_MAP.gray;
        const time = doc.time ? frappe.datetime.str_to_user(doc.time) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="chk-card" style="
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
            <span class="chk-c-id">${esc(doc.name)}</span>
            <span class="chk-c-emp">${esc(doc.employee_name) || "-"}</span>
            <span class="chk-c-time">${esc(time)}</span>
            <span class="chk-c-shift">${esc(doc.shift) || "-"}</span>
            <span class="chk-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="chk-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("chk-list")) $fl.addClass("chk-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".chk-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("chk-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("chk-ok");

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
                frappe.set_route("Form", "Employee Checkin", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) core hrms's own listview_settings for
    // Employee Checkin (hr/doctype/employee_checkin/employee_checkin_
    // list.js, loaded first since hrms precedes garage in apps.txt) so
    // its own onload ("Fetch Shifts" bulk action) keeps working.
    const existing = frappe.listview_settings["Employee Checkin"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Employee Checkin"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "employee_name", "time", "shift", "log_type",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });
})();
