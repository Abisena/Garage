(() => {
    const STATUS = {
        "1": { label: "Active",   bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "0": { label: "Inactive", bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="gst-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="gst-c-name gst-hdr">SERVICE TYPE</span>
        <span class="gst-c-desc gst-hdr">DESCRIPTION</span>
        <span class="gst-c-fee gst-hdr">BIAYA JASA</span>
        <span class="gst-c-badge gst-hdr">STATUS</span>
        <span class="gst-c-ago gst-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[String(cint(doc.is_active))] || STATUS["0"];

        const name = doc.service_type || doc.name;
        const desc = doc.bundle_description || "";
        const fee  = format_currency(doc.service_fee || 0);
        const ago  = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="gst-card" style="
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
            <span class="gst-c-name">${esc(name)}</span>
            <span class="gst-c-desc">${esc(desc)}</span>
            <span class="gst-c-fee">${fee}</span>
            <span class="gst-c-badge" style="background:${s.bg};color:${s.fg};">${s.label}</span>
            <span class="gst-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("gst-list")) $fl.addClass("gst-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".gst-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("gst-ok")) return;

            // .attr(), not .data() - jQuery's .data() type-coerces a
            // purely-numeric docname into a JS number, which then never
            // strictly-equals the string doc.name below.
            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("gst-ok");

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
                frappe.set_route("Form", "Garage Service Type", doc.name);
            });

            idx++;
        });
    }

    frappe.listview_settings["Garage Service Type"] = {
        hide_name_column: true,
        add_fields: [
            "service_type", "bundle_description", "service_fee", "is_active",
        ],
        onload(lv) {
            // A realtime "list_update" rebuilds rows via render_list()
            // directly, bypassing this refresh hook - watch for that and
            // re-render so rows don't get stuck in the default Frappe layout.
            if (!lv.__gst_observer) {
                lv.__gst_observer = new MutationObserver(() => render(lv));
                lv.__gst_observer.observe(lv.$result[0], { childList: true });
            }
        },
        refresh(lv) {
            render(lv);
        },
    };
})();
