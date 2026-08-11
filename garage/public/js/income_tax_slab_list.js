(() => {
    // Same card-list structure/technique as employee_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match Employee's own FORMAT. Income Tax Slab is a plain master
    // data doctype (not a tree, no core listview_settings of its own) but
    // IS submittable (docstatus/amended_from, unlike Salary Component) -
    // so the Status badge combines both signals a garage owner actually
    // cares about: a Disabled slab (its own `disabled` checkbox, same
    // "Aktif/Nonaktif" wording as salary_component_list.js elsewhere in
    // this app) always reads as inactive regardless of docstatus, since a
    // disabled slab plays no part in payroll either way; otherwise falls
    // back to plain docstatus (Draft/Submitted/Cancelled, same palette as
    // payroll_entry_list.js/salary_slip_list.js) - only a Submitted slab
    // is actually usable by Payroll. Column set is its own: Company/
    // Currency/Effective From/Standard Tax Exemption Amount.
    const STATUS = {
        disabled:  { label: "Nonaktif",  bg: "#fee2e2", fg: "#b91c1c" },
        draft:     { label: "Draft",     bg: "#f3f4f6", fg: "#4b5563" },
        submitted: { label: "Submitted", bg: "#dcfce7", fg: "#15803d" },
        cancelled: { label: "Cancelled", bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="its-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="its-c-id its-hdr">ID</span>
        <span class="its-c-company its-hdr">COMPANY</span>
        <span class="its-c-currency its-hdr">CURRENCY</span>
        <span class="its-c-eff its-hdr">EFFECTIVE FROM</span>
        <span class="its-c-exempt its-hdr">STD. TAX EXEMPTION</span>
        <span class="its-c-badge its-hdr">STATUS</span>
        <span class="its-c-ago its-hdr"></span>
    </div>`;

    function card(doc) {
        const s = cint(doc.disabled)
            ? STATUS.disabled
            : STATUS[["draft", "submitted", "cancelled"][doc.docstatus] || "draft"];
        const eff = doc.effective_from ? frappe.datetime.str_to_user(doc.effective_from) : "-";
        const exempt = doc.standard_tax_exemption_amount != null
            ? format_currency(doc.standard_tax_exemption_amount, doc.currency)
            : "-";
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="its-card" style="
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
            <span class="its-c-id">${esc(doc.name)}</span>
            <span class="its-c-company">${esc(doc.company) || "-"}</span>
            <span class="its-c-currency">${esc(doc.currency)}</span>
            <span class="its-c-eff">${esc(eff)}</span>
            <span class="its-c-exempt">${esc(exempt)}</span>
            <span class="its-c-badge" style="background:${s.bg};color:${s.fg};">${esc(__(s.label))}</span>
            <span class="its-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("its-list")) $fl.addClass("its-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".its-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("its-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("its-ok");

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
                frappe.set_route("Form", "Income Tax Slab", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Income Tax Slab to extend.
    frappe.listview_settings["Income Tax Slab"] = {
        hide_name_column: true,
        add_fields: ["company", "currency", "effective_from", "standard_tax_exemption_amount", "disabled", "docstatus"],
        refresh(lv) {
            render(lv);
        },
    };
})();
