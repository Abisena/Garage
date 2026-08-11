(() => {
    // Same card-list structure/technique as sales_taxes_and_charges_
    // template_list.js (see that file's own comments for the full
    // reasoning - identical field shape: Title/Company/Tax Category/
    // is_default/disabled) - explicit user request to match the rest of
    // this app's own FORMAT. Purchase Taxes and Charges Template is core
    // erpnext (Accounts module), plain master data, no core
    // listview_settings of its own, no imogi_finance collision.
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };
    const DEFAULT_TAG = { bg: "#dbeafe", fg: "#1d4ed8" };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="ptc-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="ptc-c-id ptc-hdr">ID</span>
        <span class="ptc-c-title ptc-hdr">TITLE</span>
        <span class="ptc-c-company ptc-hdr">COMPANY</span>
        <span class="ptc-c-category ptc-hdr">TAX CATEGORY</span>
        <span class="ptc-c-default ptc-hdr">DEFAULT</span>
        <span class="ptc-c-badge ptc-hdr">STATUS</span>
        <span class="ptc-c-ago ptc-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = cint(doc.disabled);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const isDefault = cint(doc.is_default);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="ptc-card" style="
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
            <span class="ptc-c-id">${esc(doc.name)}</span>
            <span class="ptc-c-title">${esc(doc.title)}</span>
            <span class="ptc-c-company">${esc(doc.company) || "-"}</span>
            <span class="ptc-c-category">${esc(doc.tax_category) || "-"}</span>
            <span class="ptc-c-default">${isDefault ? `<span class="ptc-tag" style="background:${DEFAULT_TAG.bg};color:${DEFAULT_TAG.fg};">${esc(__("Default"))}</span>` : ""}</span>
            <span class="ptc-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="ptc-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("ptc-list")) $fl.addClass("ptc-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".ptc-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("ptc-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("ptc-ok");

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
                frappe.set_route("Form", "Purchase Taxes and Charges Template", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Purchase Taxes and Charges
    // Template to extend.
    frappe.listview_settings["Purchase Taxes and Charges Template"] = {
        hide_name_column: true,
        add_fields: ["title", "company", "tax_category", "is_default", "disabled"],
        refresh(lv) {
            render(lv);
        },
    };
})();
