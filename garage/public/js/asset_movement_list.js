(() => {
    // Same card-list structure/technique as asset_repair_list.js (see
    // that file's own comments for the full reasoning) - explicit user
    // request to match the rest of this app's own FORMAT. Asset Movement
    // is core erpnext (Assets module), submittable, no own status field
    // (plain docstatus badge, same palette as asset_value_adjustment_
    // list.js elsewhere in this app), no core listview_settings of its
    // own and no imogi_finance collision. Column set: its own 2
    // in_list_view fields (Company/Transaction Date) plus Purpose (plain
    // text column, not a badge - same treatment as administrative_
    // payment_voucher_list.js's Direction column, since Status already
    // covers the one badge this card needs).
    const STATUS = {
        "0": { label: "Draft",     bg: "#f3f4f6", fg: "#4b5563" },
        "1": { label: "Submitted", bg: "#dcfce7", fg: "#15803d" },
        "2": { label: "Cancelled", bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="amv-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="amv-c-id amv-hdr">ID</span>
        <span class="amv-c-purpose amv-hdr">PURPOSE</span>
        <span class="amv-c-date amv-hdr">TRANSACTION DATE</span>
        <span class="amv-c-company amv-hdr">COMPANY</span>
        <span class="amv-c-badge amv-hdr">STATUS</span>
        <span class="amv-c-ago amv-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[String(doc.docstatus)] || STATUS["0"];
        const date = doc.transaction_date ? frappe.datetime.str_to_user(doc.transaction_date) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="amv-card" style="
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
            <span class="amv-c-id">${esc(doc.name)}</span>
            <span class="amv-c-purpose">${esc(doc.purpose) || "-"}</span>
            <span class="amv-c-date">${esc(date)}</span>
            <span class="amv-c-company">${esc(doc.company) || "-"}</span>
            <span class="amv-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(s.label))}</span>
            <span class="amv-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("amv-list")) $fl.addClass("amv-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".amv-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("amv-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("amv-ok");

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
                frappe.set_route("Form", "Asset Movement", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Asset Movement to extend.
    frappe.listview_settings["Asset Movement"] = {
        hide_name_column: true,
        add_fields: ["purpose", "transaction_date", "company", "docstatus"],
        refresh(lv) {
            render(lv);
        },
    };
})();
