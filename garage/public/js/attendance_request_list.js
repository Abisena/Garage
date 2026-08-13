(() => {
    // Same card-list structure/technique as access_log_list.js (see that
    // file's own comments for the full reasoning) - explicit user
    // request to match the rest of this app's own FORMAT. Attendance
    // Request is core hrms (HR module), submittable, no own status field
    // (plain docstatus badge, same palette as budget_list.js elsewhere
    // in this app), no core listview_settings of its own and no
    // imogi_finance collision. Column set: its own 4 in_list_view fields
    // (Employee/From Date/To Date/Reason), using Employee Name instead of
    // the raw Employee link for readability.
    const STATUS = {
        "0": { label: "Draft",     bg: "#f3f4f6", fg: "#4b5563" },
        "1": { label: "Submitted", bg: "#dcfce7", fg: "#15803d" },
        "2": { label: "Cancelled", bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="atr-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="atr-c-id atr-hdr">ID</span>
        <span class="atr-c-emp atr-hdr">EMPLOYEE NAME</span>
        <span class="atr-c-from atr-hdr">FROM DATE</span>
        <span class="atr-c-to atr-hdr">TO DATE</span>
        <span class="atr-c-reason atr-hdr">REASON</span>
        <span class="atr-c-badge atr-hdr">STATUS</span>
        <span class="atr-c-ago atr-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[String(doc.docstatus)] || STATUS["0"];
        const from_date = doc.from_date ? frappe.datetime.str_to_user(doc.from_date) : "-";
        const to_date = doc.to_date ? frappe.datetime.str_to_user(doc.to_date) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="atr-card" style="
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
            <span class="atr-c-id">${esc(doc.name)}</span>
            <span class="atr-c-emp">${esc(doc.employee_name) || "-"}</span>
            <span class="atr-c-from">${esc(from_date)}</span>
            <span class="atr-c-to">${esc(to_date)}</span>
            <span class="atr-c-reason">${esc(doc.reason) || "-"}</span>
            <span class="atr-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(s.label))}</span>
            <span class="atr-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("atr-list")) $fl.addClass("atr-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".atr-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("atr-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("atr-ok");

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
                frappe.set_route("Form", "Attendance Request", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Attendance Request to extend.
    frappe.listview_settings["Attendance Request"] = {
        hide_name_column: true,
        add_fields: ["employee_name", "from_date", "to_date", "reason", "docstatus"],
        refresh(lv) {
            render(lv);
        },
    };
})();
