(() => {
    // Same card-list structure/technique as item_list.js (see that file's
    // own comments for the full reasoning) - explicit user request to
    // match Item's own FORMAT. Employee is a tree doctype (is_tree:1, same
    // situation as Account/Item Group) but - unlike those two - core
    // erpnext DOES ship its own listview_settings for it
    // (erpnext/setup/doctype/employee/employee_list.js: get_indicator,
    // add_fields, a default "status = Active" filter), so this extends
    // (not replaces) it the same way item_list.js/purchase_receipt_list.js
    // do, to keep that indicator/filter/default view working. Column set
    // is Employee's own: Employee Name/Department/Designation, plus a
    // Status badge built from core's own get_indicator() so
    // Active/Inactive/Left/Suspended reads the same colors here as
    // anywhere else core already surfaces that same indicator.
    const STATUS = {
        Active:    { bg: "#dcfce7", fg: "#15803d" },
        Inactive:  { bg: "#fee2e2", fg: "#b91c1c" },
        Left:      { bg: "#f3f4f6", fg: "#4b5563" },
        Suspended: { bg: "#fff7ed", fg: "#c2410c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="em-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="em-c-id em-hdr">ID</span>
        <span class="em-c-name em-hdr">EMPLOYEE NAME</span>
        <span class="em-c-dept em-hdr">DEPARTMENT</span>
        <span class="em-c-desig em-hdr">DESIGNATION</span>
        <span class="em-c-badge em-hdr">STATUS</span>
        <span class="em-c-ago em-hdr"></span>
    </div>`;

    function card(doc) {
        // Reuses core's own get_indicator (extended onto listview_settings
        // below) rather than re-deriving Active/Inactive/Left/Suspended
        // logic a second time here - only the label is used, mapped to
        // this file's own badge colors via STATUS.
        const existing = frappe.listview_settings["Employee"];
        const indicator = existing && existing.get_indicator ? existing.get_indicator(doc) : null;
        const label = indicator ? indicator[0] : __(doc.status || "Active");
        const s = STATUS[doc.status] || STATUS.Active;
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="em-card" style="
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
            <span class="em-c-id">${esc(doc.name)}</span>
            <span class="em-c-name">${esc(doc.employee_name)}</span>
            <span class="em-c-dept">${esc(doc.department)}</span>
            <span class="em-c-desig">${esc(doc.designation)}</span>
            <span class="em-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="em-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("em-list")) $fl.addClass("em-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".em-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("em-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("em-ok");

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
                frappe.set_route("Form", "Employee", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own listview_settings for Employee
    // (setup/doctype/employee/employee_list.js, loaded first since erpnext
    // precedes garage in apps.txt) so its get_indicator and default
    // "status = Active" filter keep working.
    const existing = frappe.listview_settings["Employee"] || {};

    frappe.listview_settings["Employee"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "employee_name", "department", "designation", "status",
        ])),
        refresh(lv) {
            render(lv);
        },
    });
})();
