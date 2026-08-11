(() => {
    // Same card-list structure/technique as payroll_entry_list.js (see
    // that file's own comments for the full reasoning on the extend-not-
    // replace pattern) - explicit user request to match the rest of this
    // app's own FORMAT. Core frappe DOES ship its own listview_settings
    // for User (core/doctype/user/user_list.js: get_indicator off its own
    // `enabled` checkbox - Active/Disabled - plus a default filter
    // (enabled=1), an onload that populates the "Default App" field's
    // dynamic options, and prepare_data setting user_for_avatar), so this
    // extends (not replaces) it and reuses that same get_indicator for
    // the badge label/color rather than re-deriving the status logic a
    // second time here. No imogi_finance collision. Column set: Full
    // Name/User Type/Last Active.
    const COLOR_MAP = {
        red:    { bg: "#fee2e2", fg: "#b91c1c" },
        blue:   { bg: "#dbeafe", fg: "#1d4ed8" },
        orange: { bg: "#fff7ed", fg: "#c2410c" },
        green:  { bg: "#dcfce7", fg: "#15803d" },
        gray:   { bg: "#f3f4f6", fg: "#4b5563" },
        grey:   { bg: "#f3f4f6", fg: "#4b5563" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="usr-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="usr-c-id usr-hdr">ID</span>
        <span class="usr-c-name usr-hdr">FULL NAME</span>
        <span class="usr-c-type usr-hdr">USER TYPE</span>
        <span class="usr-c-active usr-hdr">LAST ACTIVE</span>
        <span class="usr-c-badge usr-hdr">STATUS</span>
        <span class="usr-c-ago usr-hdr"></span>
    </div>`;

    function card(doc) {
        // Reuses core's own get_indicator (extended onto listview_settings
        // below) rather than re-deriving Active/Disabled logic a second
        // time here - only the label/color are used, mapped to this
        // file's own badge colors via COLOR_MAP.
        const existing = frappe.listview_settings["User"];
        const indicator = existing && existing.get_indicator ? existing.get_indicator(doc) : null;
        const label = indicator ? indicator[0] : __(doc.enabled ? "Active" : "Disabled");
        const color = indicator ? indicator[1] : "gray";
        const s = COLOR_MAP[color] || COLOR_MAP.gray;
        const last_active = doc.last_active ? frappe.datetime.comment_when(doc.last_active, true) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="usr-card" style="
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
            <span class="usr-c-id">${esc(doc.name)}</span>
            <span class="usr-c-name">${esc(doc.full_name) || "-"}</span>
            <span class="usr-c-type">${esc(doc.user_type) || "-"}</span>
            <span class="usr-c-active">${last_active}</span>
            <span class="usr-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="usr-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("usr-list")) $fl.addClass("usr-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".usr-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("usr-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("usr-ok");

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
                frappe.set_route("Form", "User", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) core frappe's own listview_settings for User
    // (core/doctype/user/user_list.js, loaded first since frappe precedes
    // garage in apps.txt) so its own get_indicator, default filter
    // (enabled=1), onload (populates Default App field options) and
    // prepare_data (avatar rendering) all keep working.
    const existing = frappe.listview_settings["User"] || {};
    const existing_onload = existing.onload;
    const existing_prepare_data = existing.prepare_data;

    frappe.listview_settings["User"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "full_name", "user_type", "last_active",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload.call(frappe.listview_settings["User"], lv);
        },
        prepare_data(data) {
            if (existing_prepare_data) existing_prepare_data(data);
        },
        refresh(lv) {
            render(lv);
        },
    });
})();
