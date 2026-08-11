(() => {
    const STATUS = {
        "1": { label: "Aktif",    bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "0": { label: "Nonaktif", bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="gsb2-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="gsb2-c-name gsb2-hdr">NAMA PAKET</span>
        <span class="gsb2-c-type gsb2-hdr">JENIS SERVIS</span>
        <span class="gsb2-c-fee gsb2-hdr">BIAYA JASA</span>
        <span class="gsb2-c-spare gsb2-hdr">TOTAL SPARE PART</span>
        <span class="gsb2-c-badge gsb2-hdr">AKTIF</span>
        <span class="gsb2-c-ago gsb2-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[String(cint(doc.is_active))] || STATUS["0"];

        const name  = doc.bundle_name || doc.name;
        const type_ = doc.service_type || "";
        const fee   = format_currency(doc.service_fee || 0);
        const spare = format_currency(doc.total_spare_amount || 0);
        const ago   = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="gsb2-card" style="
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
            <span class="gsb2-c-name">${esc(name)}</span>
            <span class="gsb2-c-type">${esc(type_)}</span>
            <span class="gsb2-c-fee">${fee}</span>
            <span class="gsb2-c-spare">${spare}</span>
            <span class="gsb2-c-badge" style="background:${s.bg};color:${s.fg};">${s.label}</span>
            <span class="gsb2-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("gsb2-list")) $fl.addClass("gsb2-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".gsb2-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("gsb2-ok")) return;

            // .attr(), not .data() - jQuery's .data() type-coerces a
            // purely-numeric docname into a JS number, which then never
            // strictly-equals the string doc.name below.
            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("gsb2-ok");

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
                frappe.set_route("Form", "Garage Service Bundle", doc.name);
            });

            idx++;
        });
    }

    frappe.listview_settings["Garage Service Bundle"] = {
        hide_name_column: true,
        add_fields: [
            "bundle_name", "is_active", "service_type", "service_fee", "total_spare_amount",
        ],
        onload(lv) {
            // A realtime "list_update" rebuilds rows via render_list()
            // directly, bypassing this refresh hook - watch for that and
            // re-render so rows don't get stuck in the default Frappe layout.
            if (!lv.__gsb2_observer) {
                lv.__gsb2_observer = new MutationObserver(() => render(lv));
                lv.__gsb2_observer.observe(lv.$result[0], { childList: true });
            }
        },
        refresh(lv) {
            render(lv);
        },
    };
})();
