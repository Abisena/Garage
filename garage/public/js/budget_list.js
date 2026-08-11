(() => {
    // Same card-list structure/technique as employee_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match the rest of this app's own FORMAT. Budget is submittable
    // but has no own `status` field (unlike Payroll Entry/Salary Slip) and
    // no core listview_settings of its own (erpnext ships no
    // budget_list.js) - so the Status badge is plain docstatus-based
    // (Draft/Submitted/Cancelled, same palette as salary_structure_
    // assignment_list.js elsewhere in this app). Column set is its own:
    // Fiscal Year/Budget Against/Cost Center or Project (whichever
    // budget_against points at - only one of the two is ever set)/
    // Company.
    const STATUS = {
        "0": { label: "Draft",     bg: "#f3f4f6", fg: "#4b5563" },
        "1": { label: "Submitted", bg: "#dcfce7", fg: "#15803d" },
        "2": { label: "Cancelled", bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="bud-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="bud-c-id bud-hdr">ID</span>
        <span class="bud-c-year bud-hdr">FISCAL YEAR</span>
        <span class="bud-c-against bud-hdr">BUDGET AGAINST</span>
        <span class="bud-c-target bud-hdr">COST CENTER / PROJECT</span>
        <span class="bud-c-company bud-hdr">COMPANY</span>
        <span class="bud-c-badge bud-hdr">STATUS</span>
        <span class="bud-c-ago bud-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[String(doc.docstatus)] || STATUS["0"];
        const target = doc.budget_against === "Project" ? doc.project : doc.cost_center;
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="bud-card" style="
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
            <span class="bud-c-id">${esc(doc.name)}</span>
            <span class="bud-c-year">${esc(doc.fiscal_year)}</span>
            <span class="bud-c-against">${esc(doc.budget_against)}</span>
            <span class="bud-c-target">${esc(target) || "-"}</span>
            <span class="bud-c-company">${esc(doc.company)}</span>
            <span class="bud-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(s.label))}</span>
            <span class="bud-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("bud-list")) $fl.addClass("bud-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".bud-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("bud-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("bud-ok");

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
                frappe.set_route("Form", "Budget", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Budget to extend.
    frappe.listview_settings["Budget"] = {
        hide_name_column: true,
        add_fields: ["fiscal_year", "budget_against", "cost_center", "project", "company"],
        refresh(lv) {
            render(lv);
        },
    };
})();
