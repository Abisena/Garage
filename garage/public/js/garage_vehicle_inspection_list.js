(() => {
    const CONDITION = {
        "Excellent": { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Good":      { bg: "#d1fae5", fg: "#065f46", border: "#10b981" },
        "Fair":      { bg: "#fef3c7", fg: "#92400e", border: "#f59e0b" },
        "Poor":      { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Critical":  { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="gvi-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="gvi-c-so gvi-hdr">SERVICE ORDER</span>
        <span class="gvi-c-branch gvi-hdr">BRANCH</span>
        <span class="gvi-c-vehicle gvi-hdr">VEHICLE</span>
        <span class="gvi-c-date gvi-hdr">INSPECTION DATE</span>
        <span class="gvi-c-badge gvi-hdr">OVERALL CONDITION</span>
        <span class="gvi-c-ago gvi-hdr"></span>
    </div>`;

    function card(doc) {
        const c = CONDITION[doc.overall_condition] || CONDITION["Good"];

        const so      = doc.service_order || "";
        const branch  = doc.branch || "";
        const vehicle = doc.vehicle || "";
        const date    = doc.inspection_date ? frappe.datetime.str_to_user(doc.inspection_date) : "";
        const ago     = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="gvi-card" style="
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
            <span class="gvi-c-so">${esc(so)}</span>
            <span class="gvi-c-branch">${esc(branch)}</span>
            <span class="gvi-c-vehicle">${esc(vehicle)}</span>
            <span class="gvi-c-date">${esc(date)}</span>
            <span class="gvi-c-badge" style="background:${c.bg};color:${c.fg};">${esc(doc.overall_condition)}</span>
            <span class="gvi-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("gvi-list")) $fl.addClass("gvi-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".gvi-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("gvi-ok")) return;

            // .attr(), not .data() - jQuery's .data() type-coerces a
            // purely-numeric docname into a JS number, which then never
            // strictly-equals the string doc.name below.
            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("gvi-ok");

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
                frappe.set_route("Form", "Garage Vehicle Inspection", doc.name);
            });

            idx++;
        });
    }

    frappe.listview_settings["Garage Vehicle Inspection"] = {
        hide_name_column: true,
        add_fields: [
            "service_order", "branch", "vehicle", "inspection_date", "overall_condition",
        ],
        onload(lv) {
            // A realtime "list_update" rebuilds rows via render_list()
            // directly, bypassing this refresh hook - watch for that and
            // re-render so rows don't get stuck in the default Frappe layout.
            if (!lv.__gvi_observer) {
                lv.__gvi_observer = new MutationObserver(() => render(lv));
                lv.__gvi_observer.observe(lv.$result[0], { childList: true });
            }
        },
        refresh(lv) {
            render(lv);
        },
    };
})();
