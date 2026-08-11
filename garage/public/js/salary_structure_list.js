(() => {
    // Same card-list structure/technique as employee_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match Employee's own FORMAT. Core hrms DOES ship its own
    // listview_settings for Salary Structure (payroll/doctype/
    // salary_structure/salary_structure_list.js: just an onload adding a
    // "Bulk Salary Structure Assignment" button, no get_indicator/
    // add_fields of its own), so this extends (not replaces) it the same
    // way item_list.js/employee_list.js do, to keep that button working.
    // Column set is its own: Company/Payroll Frequency, plus a Status
    // badge off its own `is_active` Select field (Yes/No, not a Check -
    // same wording "Aktif"/"Nonaktif" already used elsewhere in this app
    // for the same concept).
    const STATUS = {
        Yes: { bg: "#dcfce7", fg: "#15803d" },
        No:  { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="ss-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="ss-c-id ss-hdr">ID</span>
        <span class="ss-c-company ss-hdr">COMPANY</span>
        <span class="ss-c-freq ss-hdr">PAYROLL FREQUENCY</span>
        <span class="ss-c-badge ss-hdr">STATUS</span>
        <span class="ss-c-ago ss-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.is_active] || STATUS.No;
        const label = doc.is_active === "Yes" ? __("Aktif") : __("Nonaktif");
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="ss-card" style="
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
            <span class="ss-c-id">${esc(doc.name)}</span>
            <span class="ss-c-company">${esc(doc.company)}</span>
            <span class="ss-c-freq">${esc(doc.payroll_frequency)}</span>
            <span class="ss-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="ss-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("ss-list")) $fl.addClass("ss-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".ss-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("ss-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("ss-ok");

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
                frappe.set_route("Form", "Salary Structure", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) hrms's own listview_settings for Salary
    // Structure (payroll/doctype/salary_structure/salary_structure_list.js,
    // loaded first since hrms precedes garage in apps.txt) so its own
    // onload (the "Bulk Salary Structure Assignment" button) keeps working.
    const existing = frappe.listview_settings["Salary Structure"] || {};

    frappe.listview_settings["Salary Structure"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "company", "payroll_frequency", "is_active",
        ])),
        refresh(lv) {
            render(lv);
        },
    });
})();
