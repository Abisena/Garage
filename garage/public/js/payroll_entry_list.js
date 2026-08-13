(() => {
    // Same card-list structure/technique as item_list.js (see that file's
    // own comments for the full reasoning on the extend-not-replace
    // pattern) - explicit user request to match Employee's own FORMAT.
    // Core hrms DOES ship its own listview_settings for Payroll Entry
    // (payroll/doctype/payroll_entry/payroll_entry_list.js: get_indicator
    // off its own `status` Select field - Draft/Submitted/Queued/Failed/
    // Cancelled, not just docstatus), so this extends (not replaces) it
    // and reuses that same get_indicator for the badge label/color rather
    // than re-deriving the status logic a second time here. Column set is
    // its own: Company/Payroll Frequency/Posting Date.
    const COLOR_MAP = {
        red:    { bg: "#fee2e2", fg: "#b91c1c" },
        blue:   { bg: "#dbeafe", fg: "#1d4ed8" },
        orange: { bg: "#fff7ed", fg: "#c2410c" },
        green:  { bg: "#dcfce7", fg: "#15803d" },
        gray:   { bg: "#f3f4f6", fg: "#4b5563" },
        grey:   { bg: "#f3f4f6", fg: "#4b5563" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="pen-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="pen-c-id pen-hdr">ID</span>
        <span class="pen-c-company pen-hdr">COMPANY</span>
        <span class="pen-c-freq pen-hdr">PAYROLL FREQUENCY</span>
        <span class="pen-c-date pen-hdr">POSTING DATE</span>
        <span class="pen-c-badge pen-hdr">STATUS</span>
        <span class="pen-c-ago pen-hdr"></span>
    </div>`;

    function card(doc) {
        // Reuses core's own get_indicator (extended onto listview_settings
        // below) rather than re-deriving Draft/Submitted/Queued/Failed/
        // Cancelled logic a second time here - only the label/color are
        // used, mapped to this file's own badge colors via COLOR_MAP.
        const existing = frappe.listview_settings["Payroll Entry"];
        const indicator = existing && existing.get_indicator ? existing.get_indicator(doc) : null;
        const label = indicator ? indicator[0] : __(doc.status || "Draft");
        const color = indicator ? indicator[1] : "gray";
        const s = COLOR_MAP[color] || COLOR_MAP.gray;
        const posting_date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="pen-card" style="
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
            <span class="pen-c-id">${esc(doc.name)}</span>
            <span class="pen-c-company">${esc(doc.company)}</span>
            <span class="pen-c-freq">${esc(doc.payroll_frequency)}</span>
            <span class="pen-c-date">${esc(posting_date)}</span>
            <span class="pen-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="pen-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("pen-list")) $fl.addClass("pen-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".pen-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("pen-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("pen-ok");

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
                frappe.set_route("Form", "Payroll Entry", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) hrms's own listview_settings for Payroll Entry
    // (payroll/doctype/payroll_entry/payroll_entry_list.js, loaded first
    // since hrms precedes garage in apps.txt) so its own get_indicator
    // (and has_indicator_for_draft) keep working.
    const existing = frappe.listview_settings["Payroll Entry"] || {};

    frappe.listview_settings["Payroll Entry"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "company", "payroll_frequency", "posting_date", "status",
        ])),
        refresh(lv) {
            render(lv);
        },
    });
})();
