(() => {
    const STATUS = {
        "Draft":       { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "In Review":   { bg: "#dbeafe", fg: "#1d4ed8", border: "#3b82f6" },
        "QC Complete": { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Fail":        { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
        "Reopened":    { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="qcl-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="qcl-c-customer qcl-hdr">CUSTOMER</span>
        <span class="qcl-c-plate qcl-hdr">NO. POLISI</span>
        <span class="qcl-c-date qcl-hdr">TANGGAL INSPEKSI</span>
        <span class="qcl-c-so qcl-hdr">SERVICE ORDER</span>
        <span class="qcl-c-inspector qcl-hdr">QC INSPECTOR</span>
        <span class="qcl-c-badge qcl-hdr">STATUS</span>
        <span class="qcl-c-ago qcl-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS.Draft;
        const customer = doc.customer_display || "";
        const plate = doc.vehicle_plate || "";
        const date = doc.inspection_date ? frappe.datetime.str_to_user(doc.inspection_date) : "";
        const so = doc.service_order || "";
        const inspector = doc.qc_inspector_name || doc.qc_inspector || "";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="qcl-card" style="
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
            <span class="qcl-c-customer">${esc(customer) || '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="qcl-c-plate">${esc(plate) || '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="qcl-c-date">${esc(date)}</span>
            <span class="qcl-c-so">${esc(so)}</span>
            <span class="qcl-c-inspector">${esc(inspector) || '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="qcl-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status)}</span>
            <span class="qcl-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("qcl-list")) $fl.addClass("qcl-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".qcl-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("qcl-ok")) return;

            const name = $row.find("input.list-row-checkbox").data("name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("qcl-ok");

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
                frappe.set_route("Form", "Repair QC", doc.name);
            });

            idx++;
        });
    }

    frappe.listview_settings["Repair QC"] = {
        hide_name_column: true,
        add_fields: [
            "service_order", "customer_display", "vehicle_plate",
            "inspection_date", "qc_inspector", "qc_inspector_name", "status",
        ],
        refresh(lv) {
            render(lv);
        },
    };
})();
