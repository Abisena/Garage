(() => {
    // Same card-list structure/technique as role_list.js (see that file's
    // own comments for the full reasoning) - explicit user request to
    // match the rest of this app's own FORMAT. Core frappe DOES ship its
    // own listview_settings for Activity Log (core/doctype/activity_log/
    // activity_log_list.js: get_indicator, but only narrowly - it only
    // returns a badge for operation=="Login" (Success/Failed), leaving
    // every other status/operation combination with no badge at all) plus
    // an onload showing the log-retention banner (frappe.utils.logtypes,
    // "these logs auto-delete after N days"). This extends (not
    // replaces) it, preserving that onload, and tries core's own
    // get_indicator FIRST - falling back to this file's own full 4-state
    // Status mapping (Success/Failed/Linked/Closed) only when core
    // returns nothing, so the Login-specific styling core already has
    // still wins where it applies. Column set: Subject/Full Name/
    // Operation.
    const STATUS = {
        "Success": { bg: "#dcfce7", fg: "#15803d" },
        "Failed":  { bg: "#fee2e2", fg: "#b91c1c" },
        "Linked":  { bg: "#dbeafe", fg: "#1d4ed8" },
        "Closed":  { bg: "#f3f4f6", fg: "#4b5563" },
    };
    const COLOR_MAP = {
        red:    { bg: "#fee2e2", fg: "#b91c1c" },
        blue:   { bg: "#dbeafe", fg: "#1d4ed8" },
        orange: { bg: "#fff7ed", fg: "#c2410c" },
        green:  { bg: "#dcfce7", fg: "#15803d" },
        gray:   { bg: "#f3f4f6", fg: "#4b5563" },
        grey:   { bg: "#f3f4f6", fg: "#4b5563" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="alg-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="alg-c-id alg-hdr">ID</span>
        <span class="alg-c-subject alg-hdr">SUBJECT</span>
        <span class="alg-c-name alg-hdr">FULL NAME</span>
        <span class="alg-c-op alg-hdr">OPERATION</span>
        <span class="alg-c-badge alg-hdr">STATUS</span>
        <span class="alg-c-ago alg-hdr"></span>
    </div>`;

    function card(doc) {
        // Tries core's own get_indicator first (Login-specific styling),
        // falls back to this file's own full Status mapping when core
        // returns nothing for this row - see the top-of-file comment.
        const existing = frappe.listview_settings["Activity Log"];
        const indicator = existing && existing.get_indicator ? existing.get_indicator(doc) : null;
        let s, label;
        if (indicator) {
            label = indicator[0];
            s = COLOR_MAP[indicator[1]] || COLOR_MAP.gray;
        } else {
            label = __(doc.status || "Linked");
            s = STATUS[doc.status] || STATUS["Linked"];
        }
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="alg-card" style="
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
            <span class="alg-c-id">${esc(doc.name)}</span>
            <span class="alg-c-subject">${esc(doc.subject) || "-"}</span>
            <span class="alg-c-name">${esc(doc.full_name) || "-"}</span>
            <span class="alg-c-op">${esc(doc.operation) || "-"}</span>
            <span class="alg-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="alg-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("alg-list")) $fl.addClass("alg-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".alg-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("alg-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("alg-ok");

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
                frappe.set_route("Form", "Activity Log", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) core frappe's own listview_settings for
    // Activity Log (core/doctype/activity_log/activity_log_list.js,
    // loaded first since frappe precedes garage in apps.txt) so its own
    // onload (log-retention banner) keeps working.
    const existing = frappe.listview_settings["Activity Log"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Activity Log"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "subject", "full_name", "operation", "status",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });
})();
