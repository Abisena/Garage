(() => {
    // Same card-list structure/technique as shift_assignment_list.js (see
    // that file's own comments for the full reasoning) - explicit user
    // request to match the rest of this app's own FORMAT. Core hrms ships
    // a listview_settings for Leave Allocation too (hr/doctype/leave_
    // allocation/leave_allocation_list.js) with a get_indicator that
    // checks `doc.status === "Expired"` - but Leave Allocation has no
    // `status` field at all (confirmed against its own doctype schema),
    // so that check can never be true and core's own indicator never
    // actually fires. This tries it first anyway (harmless no-op) and
    // falls back to a badge built from what the doctype DOES have - the
    // `expired` Check plus plain docstatus - rather than leaving every
    // row with no badge at all. Column set: Employee Name/Leave Type/
    // From Date/To Date/Total Leaves Allocated.
    const STATUS = {
        expired:   { label: "Expired",   bg: "#f3f4f6", fg: "#4b5563" },
        "0": { label: "Draft",     bg: "#f3f4f6", fg: "#4b5563" },
        "1": { label: "Submitted", bg: "#dcfce7", fg: "#15803d" },
        "2": { label: "Cancelled", bg: "#fee2e2", fg: "#b91c1c" },
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

    const HEADER_HTML = `<div class="lva-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="lva-c-id lva-hdr">ID</span>
        <span class="lva-c-emp lva-hdr">EMPLOYEE NAME</span>
        <span class="lva-c-type lva-hdr">LEAVE TYPE</span>
        <span class="lva-c-from lva-hdr">FROM DATE</span>
        <span class="lva-c-to lva-hdr">TO DATE</span>
        <span class="lva-c-total lva-hdr">TOTAL ALLOCATED</span>
        <span class="lva-c-badge lva-hdr">STATUS</span>
        <span class="lva-c-ago lva-hdr"></span>
    </div>`;

    function card(doc) {
        const existing = frappe.listview_settings["Leave Allocation"];
        const indicator = existing && existing.get_indicator ? existing.get_indicator(doc) : null;
        let s, label;
        if (indicator) {
            label = indicator[0];
            s = COLOR_MAP[indicator[1]] || COLOR_MAP.gray;
        } else if (cint(doc.expired)) {
            label = __(STATUS.expired.label);
            s = STATUS.expired;
        } else {
            const st = STATUS[String(doc.docstatus)] || STATUS["0"];
            label = __(st.label);
            s = st;
        }
        const from_date = doc.from_date ? frappe.datetime.str_to_user(doc.from_date) : "-";
        const to_date = doc.to_date ? frappe.datetime.str_to_user(doc.to_date) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="lva-card" style="
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
            <span class="lva-c-id">${esc(doc.name)}</span>
            <span class="lva-c-emp">${esc(doc.employee_name) || "-"}</span>
            <span class="lva-c-type">${esc(doc.leave_type) || "-"}</span>
            <span class="lva-c-from">${esc(from_date)}</span>
            <span class="lva-c-to">${esc(to_date)}</span>
            <span class="lva-c-total">${esc(doc.total_leaves_allocated) || "-"}</span>
            <span class="lva-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="lva-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("lva-list")) $fl.addClass("lva-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".lva-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("lva-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("lva-ok");

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
                frappe.set_route("Form", "Leave Allocation", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) core hrms's own listview_settings for Leave
    // Allocation (hr/doctype/leave_allocation/leave_allocation_list.js,
    // loaded first since hrms precedes garage in apps.txt) - see the
    // top-of-file comment for why its own get_indicator never actually
    // fires, kept here anyway for forward-compatibility if core ever
    // adds a real `status` field.
    const existing = frappe.listview_settings["Leave Allocation"] || {};

    frappe.listview_settings["Leave Allocation"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "employee_name", "leave_type", "from_date", "to_date",
            "total_leaves_allocated", "expired", "docstatus",
        ])),
        refresh(lv) {
            render(lv);
        },
    });
})();
