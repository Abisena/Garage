(() => {
    const STATUS = {
        "0": { label: "Draft",     bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "1": { label: "Submitted", bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "2": { label: "Cancelled", bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="vhl-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="vhl-c-sikk vhl-hdr">SIKK NUMBER</span>
        <span class="vhl-c-plate vhl-hdr">NO. POLISI</span>
        <span class="vhl-c-owner vhl-hdr">PEMILIK</span>
        <span class="vhl-c-date vhl-hdr">TANGGAL</span>
        <span class="vhl-c-badge vhl-hdr">STATUS</span>
        <span class="vhl-c-ago vhl-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[String(doc.docstatus)] || STATUS["0"];

        const sikk   = doc.sikk_number || doc.name;
        const plate  = doc.vehicle || "";
        const owner  = doc.owner_name || "";
        const date   = doc.submission_date ? frappe.datetime.str_to_user(doc.submission_date) : "";
        const ago    = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="vhl-card" style="
            display:flex !important;
            align-items:center;
            width:100%;
            padding:10px 14px 10px 0;
            gap:10px;
            cursor:pointer;
            border-left:3px solid ${s.border};
        ">
            <div style="flex:0 0 36px; display:flex; align-items:center; justify-content:center;">
                <input type="checkbox" class="list-row-checkbox" data-name="${esc(doc.name)}" style="cursor:pointer;">
            </div>
            <span class="vhl-c-sikk">${esc(sikk)}</span>
            <span class="vhl-c-plate">${esc(plate)}</span>
            <span class="vhl-c-owner">${esc(owner)}</span>
            <span class="vhl-c-date">${esc(date)}</span>
            <span class="vhl-c-badge" style="background:${s.bg};color:${s.fg};">${s.label}</span>
            <span class="vhl-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("vh-list")) $fl.addClass("vh-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".vhl-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("vhl-ok")) return;

            const name = $row.find("input.list-row-checkbox").data("name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("vhl-ok");

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
                frappe.set_route("Form", "Vehicle Handover", doc.name);
            });

            idx++;
        });
    }

    frappe.listview_settings["Vehicle Handover"] = {
        hide_name_column: true,
        add_fields: [
            "sikk_number", "vehicle", "owner_name", "submission_date", "docstatus",
        ],
        refresh(lv) {
            render(lv);
        },
    };
})();
