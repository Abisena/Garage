(() => {
    const STATUS = {
        "Draft":           { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "In Progress":     { bg: "#dbeafe", fg: "#1d4ed8", border: "#3b82f6" },
        "Waiting Parts":   { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Waiting Payment": { bg: "#fef3c7", fg: "#92400e", border: "#f59e0b" },
        "Ready for QC":    { bg: "#f3e8ff", fg: "#7c3aed", border: "#8b5cf6" },
        "QC Passed":       { bg: "#d1fae5", fg: "#065f46", border: "#10b981" },
        "Completed":       { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Delivered":       { bg: "#d1fae5", fg: "#065f46", border: "#10b981" },
        "Cancelled":       { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="gso-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="gso-c-customer gso-hdr">CUSTOMER</span>
        <span class="gso-c-plate gso-hdr">NO. POLISI</span>
        <span class="gso-c-date gso-hdr">TANGGAL</span>
        <span class="gso-c-stype gso-hdr">SERVICE TYPE</span>
        <span class="gso-c-pkg gso-hdr">PAKET</span>
        <span class="gso-c-amt gso-hdr">TOTAL</span>
        <span class="gso-c-badge gso-hdr">STATUS</span>
        <span class="gso-c-ago gso-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS.Draft;

        const customer = doc.customer_display || doc.customer || doc.name;
        const plate    = doc.vehicle || "";
        const date     = doc.order_date ? frappe.datetime.str_to_user(doc.order_date) : "";
        const stype    = doc.service_order_type || "";
        const pkg      = doc.service_package_display || doc.service_package || "";
        const amount   = format_currency(doc.total_amount || 0);
        const ago      = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="gso-card" style="
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
            <span class="gso-c-customer">${esc(customer)}</span>
            <span class="gso-c-plate">${esc(plate)}</span>
            <span class="gso-c-date">${esc(date)}</span>
            <span class="gso-c-stype">${esc(stype)}</span>
            <span class="gso-c-pkg">${esc(pkg)}</span>
            <span class="gso-c-amt">${amount}</span>
            <span class="gso-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status)}</span>
            <span class="gso-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("gso-list")) $fl.addClass("gso-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".gso-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("gso-ok")) return;

            const name = $row.find("input.list-row-checkbox").data("name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("gso-ok");

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
                frappe.set_route("Form", "Garage Service Order", doc.name);
            });

            idx++;
        });
    }

    frappe.listview_settings["Garage Service Order"] = {
        hide_name_column: true,
        add_fields: [
            "customer_display", "customer", "order_date",
            "service_package", "service_package_display", "total_amount",
        ],
        onload(lv) {
            const vf = lv.page.fields_dict.vehicle;
            if (vf) { vf.df.label = "No. Polisi"; vf.set_label("No. Polisi"); }
        },
        refresh(lv) {
            render(lv);
        },
    };
})();
