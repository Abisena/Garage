(() => {
    const PRIORITY = {
        "Normal":   { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "High":     { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Urgent":   { bg: "#fef3c7", fg: "#92400e", border: "#f59e0b" },
        "Critical": { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="cr-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="cr-c-name cr-hdr">FULL NAME</span>
        <span class="cr-c-plate cr-hdr">LICENSE PLATE NUMBER</span>
        <span class="cr-c-phone cr-hdr">PHONE NUMBER</span>
        <span class="cr-c-branch cr-hdr">BRANCH</span>
        <span class="cr-c-visit cr-hdr">VISIT TYPE</span>
        <span class="cr-c-service cr-hdr">SERVICE TYPE</span>
        <span class="cr-c-date cr-hdr">REGISTRATION TIME</span>
        <span class="cr-c-badge cr-hdr">PRIORITY LEVEL</span>
        <span class="cr-c-ago cr-hdr"></span>
    </div>`;

    function card(doc) {
        const p = PRIORITY[doc.priority] || PRIORITY["Normal"];

        const name    = doc.customer_name || doc.name;
        const plate   = doc.license_plate || "";
        const phone   = doc.phone || "";
        const branch  = doc.branch || "";
        const visit   = doc.intake_type || "";
        const service = doc.service_order_type || "";
        const date    = doc.registration_date ? frappe.datetime.str_to_user(doc.registration_date) : "";
        const ago     = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="cr-card" style="
            display:flex !important;
            align-items:center;
            width:100%;
            padding:10px 14px 10px 0;
            gap:10px;
            cursor:pointer;
            border-left:3px solid ${p.border};
        ">
            <div style="flex:0 0 36px; display:flex; align-items:center; justify-content:center;">
                <input type="checkbox" class="list-row-checkbox" data-name="${esc(doc.name)}" style="cursor:pointer;">
            </div>
            <span class="cr-c-name">${esc(name)}</span>
            <span class="cr-c-plate">${esc(plate)}</span>
            <span class="cr-c-phone">${esc(phone)}</span>
            <span class="cr-c-branch">${esc(branch)}</span>
            <span class="cr-c-visit">${esc(visit)}</span>
            <span class="cr-c-service">${esc(service)}</span>
            <span class="cr-c-date">${esc(date)}</span>
            <span class="cr-c-badge" style="background:${p.bg};color:${p.fg};">${esc(doc.priority)}</span>
            <span class="cr-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("cr-list")) $fl.addClass("cr-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".cr-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("cr-ok")) return;

            // .attr(), not .data() - jQuery's .data() type-coerces a
            // purely-numeric docname into a JS number, which then never
            // strictly-equals the string doc.name below.
            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("cr-ok");

            // Force-hide ALL old Frappe children via inline !important
            $row.children().each(function () {
                this.style.setProperty("display", "none", "important");
            });

            // Force row to auto height, transparent bg
            row.style.setProperty("height", "auto", "important");
            row.style.setProperty("min-height", "0", "important");
            row.style.setProperty("padding", "0", "important");
            row.style.setProperty("overflow", "visible", "important");
            row.style.setProperty("background", "transparent", "important");

            // Append card with zebra bg
            const $card = $(card(doc));
            const bg = idx % 2 === 0 ? "#ffffff" : "#f0f1f3";
            $card[0].style.setProperty("background", bg, "important");
            $row.append($card);

            // Hover effect
            $card.on("mouseenter", function () {
                this.style.setProperty("background", "#e8edff", "important");
            }).on("mouseleave", function () {
                this.style.setProperty("background", bg, "important");
            });

            // Navigate on body click
            $card.on("click", function (e) {
                if ($(e.target).is("input[type=checkbox]")) return;
                frappe.set_route("Form", "Customer Registration", doc.name);
            });

            idx++;
        });
    }

    frappe.listview_settings["Customer Registration"] = {
        hide_name_column: true,
        add_fields: [
            "branch", "intake_type", "registration_date", "customer_name",
            "phone", "license_plate", "service_order_type", "priority",
        ],
        onload(lv) {
            // A realtime "list_update" rebuilds rows via render_list()
            // directly, bypassing this refresh hook - watch for that and
            // re-render so rows don't get stuck in the default Frappe layout.
            if (!lv.__cr_observer) {
                lv.__cr_observer = new MutationObserver(() => render(lv));
                lv.__cr_observer.observe(lv.$result[0], { childList: true });
            }
        },
        refresh(lv) {
            render(lv);
        },
    };
})();
