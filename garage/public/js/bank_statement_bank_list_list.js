(() => {
    // Same card-list structure/technique as bank_account_list.js (see
    // that file's own comments for the full reasoning) - explicit user
    // request to match the rest of this app's own FORMAT. Bank Statement
    // Bank List is a plain master data doctype (config for CSV import
    // parsing rules per bank - not a tree, not submittable, no core
    // listview_settings of its own, no imogi_finance duplicate-
    // registration collision either). Column set: Bank/CSV Dialect/Date
    // Format, Status badge off its own `enabled` checkbox (Aktif/
    // Nonaktif, same wording/palette as bank_account_list.js).
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="bsb-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="bsb-c-id bsb-hdr">ID</span>
        <span class="bsb-c-bank bsb-hdr">BANK</span>
        <span class="bsb-c-dialect bsb-hdr">CSV DIALECT</span>
        <span class="bsb-c-format bsb-hdr">DATE FORMAT</span>
        <span class="bsb-c-badge bsb-hdr">STATUS</span>
        <span class="bsb-c-ago bsb-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = !cint(doc.enabled);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="bsb-card" style="
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
            <span class="bsb-c-id">${esc(doc.name)}</span>
            <span class="bsb-c-bank">${esc(doc.bank)}</span>
            <span class="bsb-c-dialect">${esc(doc.csv_dialect) || "-"}</span>
            <span class="bsb-c-format">${esc(doc.date_format) || "-"}</span>
            <span class="bsb-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="bsb-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("bsb-list")) $fl.addClass("bsb-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".bsb-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("bsb-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("bsb-ok");

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
                frappe.set_route("Form", "Bank Statement Bank List", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Bank Statement Bank List to
    // extend.
    frappe.listview_settings["Bank Statement Bank List"] = {
        hide_name_column: true,
        add_fields: ["bank", "csv_dialect", "date_format", "enabled"],
        refresh(lv) {
            render(lv);
        },
    };
})();
