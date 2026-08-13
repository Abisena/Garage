(() => {
    // Same card-list structure/technique as employee_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match Employee's own FORMAT. Core hrms DOES ship its own
    // listview_settings for Salary Slip (payroll/doctype/salary_slip/
    // salary_slip_list.js: just an onload adding an "Email Salary Slips"
    // bulk menu item, no get_indicator/add_fields of its own), so this
    // extends (not replaces) it the same way employee_list.js/payroll_
    // entry_list.js do, to keep that menu item working. Status badge is
    // off Salary Slip's own `status` Select field (Draft/Submitted/
    // Cancelled/Withheld - richer than plain docstatus, same reasoning as
    // Payroll Entry using its own `status` field instead). Column set is
    // its own: Employee Name/Net Pay/Posting Date.
    const STATUS = {
        Draft:     { bg: "#f3f4f6", fg: "#4b5563" },
        Submitted: { bg: "#dcfce7", fg: "#15803d" },
        Cancelled: { bg: "#fee2e2", fg: "#b91c1c" },
        Withheld:  { bg: "#fff7ed", fg: "#c2410c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="ssl-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="ssl-c-id ssl-hdr">ID</span>
        <span class="ssl-c-emp ssl-hdr">EMPLOYEE NAME</span>
        <span class="ssl-c-pay ssl-hdr">NET PAY</span>
        <span class="ssl-c-date ssl-hdr">POSTING DATE</span>
        <span class="ssl-c-badge ssl-hdr">STATUS</span>
        <span class="ssl-c-ago ssl-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS.Draft;
        const net_pay = doc.net_pay != null ? format_currency(doc.net_pay, doc.currency) : "-";
        const posting_date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="ssl-card" style="
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
            <span class="ssl-c-id">${esc(doc.name)}</span>
            <span class="ssl-c-emp">${esc(doc.employee_name)}</span>
            <span class="ssl-c-pay">${esc(net_pay)}</span>
            <span class="ssl-c-date">${esc(posting_date)}</span>
            <span class="ssl-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(doc.status || "Draft"))}</span>
            <span class="ssl-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("ssl-list")) $fl.addClass("ssl-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".ssl-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("ssl-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("ssl-ok");

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
                frappe.set_route("Form", "Salary Slip", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) hrms's own listview_settings for Salary Slip
    // (payroll/doctype/salary_slip/salary_slip_list.js, loaded first since
    // hrms precedes garage in apps.txt) so its own onload (the "Email
    // Salary Slips" bulk menu item) keeps working.
    const existing = frappe.listview_settings["Salary Slip"] || {};

    frappe.listview_settings["Salary Slip"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "employee_name", "net_pay", "currency", "posting_date", "status",
        ])),
        refresh(lv) {
            render(lv);
        },
    });
})();
