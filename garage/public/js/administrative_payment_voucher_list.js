(() => {
    // Same card-list structure/technique as payment_entry_list.js (see
    // that file's own comments for the full reasoning, including the
    // shared garage.registerListRenderOverride() fix below) - explicit
    // user request to match Expense Request/Payment Entry's own FORMAT.
    // Administrative Payment Voucher is owned by imogi_finance and shares
    // the same imogi_finance-registers-its-own-file-twice collision (see
    // imogi_finance/hooks.py's doctype_list_js entry for this doctype).
    // Its own native listview_settings has no get_indicator of its own
    // (status is a plain 6-state Select with no colon-syntax colors, so
    // core draws no badge for it at all today) - built fresh here instead
    // of reusing something that doesn't exist. Column set: Posting Date/
    // Direction/Party/Amount, plus Status badge - broader than the
    // doctype's own in_list_view (Status/Direction/Amount only), since
    // Posting Date and Party are what actually identifies a voucher at a
    // glance (same reasoning as Expense Request's own card adding
    // Supplier/Grand Total beyond its raw in_list_view set).
    const STATUS = {
        "Draft":            { bg: "#f3f4f6", fg: "#4b5563" },
        "Pending Approval": { bg: "#fff7ed", fg: "#c2410c" },
        "Approved":         { bg: "#dbeafe", fg: "#1d4ed8" },
        "Posted":           { bg: "#dcfce7", fg: "#15803d" },
        "Rejected":         { bg: "#fee2e2", fg: "#b91c1c" },
        "Cancelled":        { bg: "#f3f4f6", fg: "#4b5563" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="apv-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="apv-c-id apv-hdr">ID</span>
        <span class="apv-c-date apv-hdr">POSTING DATE</span>
        <span class="apv-c-dir apv-hdr">DIRECTION</span>
        <span class="apv-c-party apv-hdr">PARTY</span>
        <span class="apv-c-amount apv-hdr">AMOUNT</span>
        <span class="apv-c-badge apv-hdr">STATUS</span>
        <span class="apv-c-ago apv-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS["Draft"];
        const date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "-";
        const amount = doc.amount != null ? format_currency(doc.amount, doc.currency) : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="apv-card" style="
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
            <span class="apv-c-id">${esc(doc.name)}</span>
            <span class="apv-c-date">${esc(date)}</span>
            <span class="apv-c-dir">${esc(doc.direction)}</span>
            <span class="apv-c-party">${esc(doc.party) || "-"}</span>
            <span class="apv-c-amount">${esc(amount)}</span>
            <span class="apv-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(doc.status || "Draft"))}</span>
            <span class="apv-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("apv-list")) $fl.addClass("apv-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".apv-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("apv-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("apv-ok");

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
                frappe.set_route("Form", "Administrative Payment Voucher", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) imogi_finance's own listview_settings for
    // Administrative Payment Voucher so its own onload (adds a Branch
    // filter field to the list toolbar, defaulted from the user's own
    // default Branch) keeps working.
    const existing = frappe.listview_settings["Administrative Payment Voucher"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Administrative Payment Voucher"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "posting_date", "direction", "party", "amount", "currency", "status",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });

    // imogi_finance registers its OWN administrative_payment_voucher_
    // list.js a SECOND time via its own hooks.py doctype_list_js entry -
    // same collision as Expense Request/Payment Entry. See garage.
    // registerListRenderOverride()'s own comment in garage_theme.js for
    // the full root cause/mechanism.
    garage.registerListRenderOverride("Administrative Payment Voucher", render, [
        "posting_date", "direction", "party", "amount", "currency", "status",
    ]);
})();
