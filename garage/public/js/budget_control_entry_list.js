(() => {
    // Same card-list structure/technique as budget_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match the rest of this app's own FORMAT. Budget Control Entry is
    // owned by imogi_finance, submittable, no own status field (plain
    // docstatus badge, same palette as budget_list.js), no core
    // listview_settings and no imogi_finance duplicate-registration
    // collision either (unlike Expense Request/Payment Entry). Column set
    // is its own 4 in_list_view fields (Entry Type/Direction/Posting
    // Date/Amount) plus Account, since knowing WHICH account a budget
    // entry hit is what actually identifies it at a glance.
    const STATUS = {
        "0": { label: "Draft",     bg: "#f3f4f6", fg: "#4b5563" },
        "1": { label: "Submitted", bg: "#dcfce7", fg: "#15803d" },
        "2": { label: "Cancelled", bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="bce-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="bce-c-id bce-hdr">ID</span>
        <span class="bce-c-type bce-hdr">TIPE ENTRY</span>
        <span class="bce-c-dir bce-hdr">ARAH</span>
        <span class="bce-c-date bce-hdr">TANGGAL POSTING</span>
        <span class="bce-c-account bce-hdr">AKUN</span>
        <span class="bce-c-amount bce-hdr">JUMLAH</span>
        <span class="bce-c-badge bce-hdr">STATUS</span>
        <span class="bce-c-ago bce-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[String(doc.docstatus)] || STATUS["0"];
        const date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "-";
        const amount = doc.amount != null ? format_currency(doc.amount, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="bce-card" style="
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
            <span class="bce-c-id">${esc(doc.name)}</span>
            <span class="bce-c-type">${esc(doc.entry_type)}</span>
            <span class="bce-c-dir">${esc(doc.direction)}</span>
            <span class="bce-c-date">${esc(date)}</span>
            <span class="bce-c-account">${esc(doc.account) || "-"}</span>
            <span class="bce-c-amount">${esc(amount)}</span>
            <span class="bce-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(s.label))}</span>
            <span class="bce-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("bce-list")) $fl.addClass("bce-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".bce-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("bce-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("bce-ok");

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
                frappe.set_route("Form", "Budget Control Entry", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Budget Control Entry to
    // extend.
    frappe.listview_settings["Budget Control Entry"] = {
        hide_name_column: true,
        add_fields: ["entry_type", "direction", "posting_date", "account", "amount", "docstatus"],
        refresh(lv) {
            render(lv);
        },
    };
})();
