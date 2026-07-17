(() => {
    const TYPE = {
        "Individual": { label: "Individual", bg: "#dbeafe", fg: "#1d4ed8", border: "#3b82f6" },
        "Corporate":  { label: "Corporate",  bg: "#f3e8ff", fg: "#7c3aed", border: "#8b5cf6" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="gc-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="gc-c-number gc-hdr">NO. PELANGGAN</span>
        <span class="gc-c-name gc-hdr">NAMA PELANGGAN</span>
        <span class="gc-c-phone gc-hdr">TELEPON</span>
        <span class="gc-c-badge gc-hdr">TIPE</span>
        <span class="gc-c-ago gc-hdr"></span>
    </div>`;

    function card(doc) {
        const t = TYPE[doc.customer_type] || TYPE["Individual"];

        const number = doc.customer_number || "";
        const name   = doc.customer_name || doc.name;
        const phone  = doc.phone || "";
        const ago    = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="gc-card" style="
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
            <span class="gc-c-number">${esc(number)}</span>
            <span class="gc-c-name">${esc(name)}</span>
            <span class="gc-c-phone">${esc(phone)}</span>
            <span class="gc-c-badge" style="background:${t.bg};color:${t.fg};">${t.label}</span>
            <span class="gc-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("gc-list")) $fl.addClass("gc-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".gc-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("gc-ok")) return;

            const name = $row.find("input.list-row-checkbox").data("name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("gc-ok");

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
                frappe.set_route("Form", "Garage Customer", doc.name);
            });

            idx++;
        });
    }

    frappe.listview_settings["Garage Customer"] = {
        hide_name_column: true,
        add_fields: [
            "customer_number", "customer_name", "customer_type", "phone",
        ],
        refresh(lv) {
            render(lv);
        },
    };
})();
