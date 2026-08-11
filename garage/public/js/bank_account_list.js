(() => {
    // Same card-list structure/technique as item_list.js (see that file's
    // own comments for the full reasoning) - explicit user request to
    // match Item's own FORMAT. Bank Account's own 5 in_list_view fields
    // (Account Name/Company Account/Company/IBAN/Bank Account No) stay
    // unchanged in substance, PLUS a Status badge off its own `disabled`
    // checkbox (Aktif/Nonaktif, same wording/palette as salary_component_
    // list.js/department_list.js elsewhere in this app - added on
    // explicit follow-up request, not part of the original 5). No core
    // listview_settings exists for Bank Account to extend.
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="ba-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="ba-c-id ba-hdr">ID</span>
        <span class="ba-c-name ba-hdr">ACCOUNT NAME</span>
        <span class="ba-c-account ba-hdr">COMPANY ACCOUNT</span>
        <span class="ba-c-company ba-hdr">COMPANY</span>
        <span class="ba-c-iban ba-hdr">IBAN</span>
        <span class="ba-c-no ba-hdr">BANK ACCOUNT NO</span>
        <span class="ba-c-badge ba-hdr">STATUS</span>
        <span class="ba-c-ago ba-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = cint(doc.disabled);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="ba-card" style="
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
            <span class="ba-c-id">${esc(doc.name)}</span>
            <span class="ba-c-name">${esc(doc.account_name)}</span>
            <span class="ba-c-account">${esc(doc.account)}</span>
            <span class="ba-c-company">${esc(doc.company)}</span>
            <span class="ba-c-iban">${esc(doc.iban) || "-"}</span>
            <span class="ba-c-no">${esc(doc.bank_account_no) || "-"}</span>
            <span class="ba-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="ba-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("ba-list")) $fl.addClass("ba-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".ba-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("ba-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("ba-ok");

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
                frappe.set_route("Form", "Bank Account", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Bank Account to extend.
    frappe.listview_settings["Bank Account"] = {
        hide_name_column: true,
        add_fields: ["account_name", "account", "company", "iban", "bank_account_no", "disabled"],
        refresh(lv) {
            render(lv);
        },
    };
})();
