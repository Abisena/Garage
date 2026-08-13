(() => {
    // Same card-list structure/technique as fiscal_year_list.js (see that
    // file's own comments for the full reasoning, including showing the
    // autoname-source field as its own column even though it duplicates
    // the ID today) - explicit user request to match the rest of this
    // app's own FORMAT. Company is core erpnext (Setup module), a tree
    // doctype (is_tree:1, same situation as Department/Cost Center) with
    // a listview_settings of its own that's onload-only (adds an
    // "Accounts" breadcrumb) - no get_indicator, and Company has no
    // `disabled`-style field at all, so no Status badge column (same
    // reasoning as access_log_list.js elsewhere in this app). Column
    // set: Company Name/Abbr/Default Currency/Country/Parent Company.
    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="cmp-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="cmp-c-id cmp-hdr">ID</span>
        <span class="cmp-c-name cmp-hdr">COMPANY NAME</span>
        <span class="cmp-c-abbr cmp-hdr">ABBR</span>
        <span class="cmp-c-currency cmp-hdr">DEFAULT CURRENCY</span>
        <span class="cmp-c-country cmp-hdr">COUNTRY</span>
        <span class="cmp-c-parent cmp-hdr">PARENT COMPANY</span>
        <span class="cmp-c-ago cmp-hdr"></span>
    </div>`;

    function card(doc) {
        const isGroup = cint(doc.is_group);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="cmp-card" style="
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
            <span class="cmp-c-id">${esc(doc.name)}</span>
            <span class="cmp-c-name" style="${isGroup ? 'font-weight:700;' : ''}">${esc(doc.company_name || doc.name)}</span>
            <span class="cmp-c-abbr">${esc(doc.abbr) || "-"}</span>
            <span class="cmp-c-currency">${esc(doc.default_currency) || "-"}</span>
            <span class="cmp-c-country">${esc(doc.country) || "-"}</span>
            <span class="cmp-c-parent">${esc(doc.parent_company || "-")}</span>
            <span class="cmp-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("cmp-list")) $fl.addClass("cmp-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".cmp-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("cmp-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("cmp-ok");

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
                frappe.set_route("Form", "Company", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) core erpnext's own listview_settings for
    // Company (setup/doctype/company/company_list.js, loaded first since
    // erpnext precedes garage in apps.txt) so its own onload (adds the
    // "Accounts" breadcrumb) keeps working.
    const existing = frappe.listview_settings["Company"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Company"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "company_name", "abbr", "default_currency", "country", "parent_company", "is_group",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });
})();
