(() => {
    // Same card-list structure/technique as tax_invoice_type_list.js (see
    // that file's own comments for the full reasoning) - explicit user
    // request to match the rest of this app's own FORMAT. Tax Withholding
    // Category is core erpnext (Accounts module), plain master data (not
    // a tree, not submittable, no core listview_settings of its own, no
    // imogi_finance collision). Autoname is "Prompt" here (not
    // field-derived), so `name` and `category_name` genuinely differ
    // (e.g. "PPh 23" vs "PPh 23 - Jasa (2%)") - both shown. The doctype's
    // few Check flags (round-off/consider party ledger/excess-amount-
    // only) are tax CALCULATION config details, not a meaningful at-a-
    // glance state, so no Status badge or tags here (same reasoning as
    // access_log_list.js elsewhere in this app).
    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="twc-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="twc-c-id twc-hdr">ID</span>
        <span class="twc-c-name twc-hdr">CATEGORY NAME</span>
        <span class="twc-c-ago twc-hdr"></span>
    </div>`;

    function card(doc) {
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="twc-card" style="
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
            <span class="twc-c-id">${esc(doc.name)}</span>
            <span class="twc-c-name">${esc(doc.category_name) || "-"}</span>
            <span class="twc-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("twc-list")) $fl.addClass("twc-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".twc-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("twc-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("twc-ok");

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
                frappe.set_route("Form", "Tax Withholding Category", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Tax Withholding Category to
    // extend.
    frappe.listview_settings["Tax Withholding Category"] = {
        hide_name_column: true,
        add_fields: ["category_name"],
        refresh(lv) {
            render(lv);
        },
    };
})();
