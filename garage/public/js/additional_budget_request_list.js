(() => {
    // Same card-list structure/technique as budget_control_entry_list.js
    // (see that file's own comments for the full reasoning) - explicit
    // user request to match the rest of this app's own FORMAT. Additional
    // Budget Request is owned by imogi_finance, submittable, HAS its own
    // Status field this time (4-state Select: Draft/Pending Approval/
    // Approved/Rejected - unlike Budget Control Entry), no core
    // listview_settings and no imogi_finance duplicate-registration
    // collision. Column set: its own 4 in_list_view fields (Status/
    // Posting Date/Cost Center/Amount) plus Account, same reasoning as
    // Budget Control Entry - knowing which account the extra budget lands
    // on is what actually identifies the request.
    const STATUS = {
        "Draft":            { bg: "#f3f4f6", fg: "#4b5563" },
        "Pending Approval": { bg: "#fff7ed", fg: "#c2410c" },
        "Approved":         { bg: "#dcfce7", fg: "#15803d" },
        "Rejected":         { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="abr-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="abr-c-id abr-hdr">ID</span>
        <span class="abr-c-date abr-hdr">TANGGAL PENGAJUAN</span>
        <span class="abr-c-cc abr-hdr">COST CENTER</span>
        <span class="abr-c-account abr-hdr">ACCOUNT</span>
        <span class="abr-c-amount abr-hdr">JUMLAH TAMBAHAN</span>
        <span class="abr-c-badge abr-hdr">STATUS</span>
        <span class="abr-c-ago abr-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS["Draft"];
        const date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "-";
        const amount = doc.amount != null ? format_currency(doc.amount, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="abr-card" style="
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
            <span class="abr-c-id">${esc(doc.name)}</span>
            <span class="abr-c-date">${esc(date)}</span>
            <span class="abr-c-cc">${esc(doc.cost_center) || "-"}</span>
            <span class="abr-c-account">${esc(doc.account) || "-"}</span>
            <span class="abr-c-amount">${esc(amount)}</span>
            <span class="abr-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(doc.status || "Draft"))}</span>
            <span class="abr-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("abr-list")) $fl.addClass("abr-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".abr-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("abr-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("abr-ok");

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
                frappe.set_route("Form", "Additional Budget Request", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Additional Budget Request to
    // extend.
    frappe.listview_settings["Additional Budget Request"] = {
        hide_name_column: true,
        add_fields: ["status", "posting_date", "cost_center", "account", "amount"],
        refresh(lv) {
            render(lv);
        },
    };
})();
