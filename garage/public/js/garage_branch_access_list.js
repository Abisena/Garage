(() => {
    const STATUS = {
        "1": { label: "Default",     bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "0": { label: "Not Default", bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="gba-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="gba-c-branch gba-hdr">BRANCH</span>
        <span class="gba-c-user gba-hdr">USER</span>
        <span class="gba-c-badge gba-hdr">DEFAULT</span>
        <span class="gba-c-ago gba-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[String(cint(doc.is_default))] || STATUS["0"];

        const branch = doc.branch || "";
        const user   = doc.user || "";
        const ago    = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="gba-card" style="
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
            <span class="gba-c-branch">${esc(branch)}</span>
            <span class="gba-c-user">${esc(user)}</span>
            <span class="gba-c-badge" style="background:${s.bg};color:${s.fg};">${s.label}</span>
            <span class="gba-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("gba-list")) $fl.addClass("gba-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".gba-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("gba-ok")) return;

            // .attr(), not .data() - jQuery's .data() type-coerces a
            // purely-numeric docname into a JS number, which then never
            // strictly-equals the string doc.name below.
            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("gba-ok");

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
                frappe.set_route("Form", "Garage Branch Access", doc.name);
            });

            idx++;
        });
    }

    frappe.listview_settings["Garage Branch Access"] = {
        hide_name_column: true,
        add_fields: [
            "branch", "user", "is_default",
        ],
        onload(lv) {
            // A realtime "list_update" rebuilds rows via render_list()
            // directly, bypassing this refresh hook - watch for that and
            // re-render so rows don't get stuck in the default Frappe layout.
            if (!lv.__gba_observer) {
                lv.__gba_observer = new MutationObserver(() => render(lv));
                lv.__gba_observer.observe(lv.$result[0], { childList: true });
            }
        },
        refresh(lv) {
            render(lv);
        },
    };
})();
