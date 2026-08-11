(() => {
    // Same card-list structure/technique as employee_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match Employee's own FORMAT. Salary Structure Assignment is
    // submittable (is_submittable:1, amended_from present, no core
    // listview_settings of its own), so the Status badge is docstatus-
    // based (Draft/Submitted/Cancelled) - same palette as payment_entry_
    // list.js/vehicle_handover_list.js elsewhere in this app - rather than
    // a disabled/is_active checkbox like the other master-data doctypes in
    // this same HR batch (Department/Salary Component/Salary Structure).
    // Column set is its own: Employee Name/Salary Structure/From Date.
    const STATUS = {
        "0": { label: "Draft",     bg: "#f3f4f6", fg: "#4b5563" },
        "1": { label: "Submitted", bg: "#dcfce7", fg: "#15803d" },
        "2": { label: "Cancelled", bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="ssa-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="ssa-c-id ssa-hdr">ID</span>
        <span class="ssa-c-emp ssa-hdr">EMPLOYEE NAME</span>
        <span class="ssa-c-struct ssa-hdr">SALARY STRUCTURE</span>
        <span class="ssa-c-date ssa-hdr">FROM DATE</span>
        <span class="ssa-c-badge ssa-hdr">STATUS</span>
        <span class="ssa-c-ago ssa-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[String(doc.docstatus)] || STATUS["0"];
        const from_date = doc.from_date ? frappe.datetime.str_to_user(doc.from_date) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="ssa-card" style="
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
            <span class="ssa-c-id">${esc(doc.name)}</span>
            <span class="ssa-c-emp">${esc(doc.employee_name)}</span>
            <span class="ssa-c-struct">${esc(doc.salary_structure)}</span>
            <span class="ssa-c-date">${esc(from_date)}</span>
            <span class="ssa-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(s.label))}</span>
            <span class="ssa-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("ssa-list")) $fl.addClass("ssa-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".ssa-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("ssa-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("ssa-ok");

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
                frappe.set_route("Form", "Salary Structure Assignment", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Salary Structure Assignment to
    // extend.
    frappe.listview_settings["Salary Structure Assignment"] = {
        hide_name_column: true,
        add_fields: ["employee_name", "salary_structure", "from_date", "docstatus"],
        refresh(lv) {
            render(lv);
        },
    };
})();
