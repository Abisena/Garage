(() => {
    // Same card-list structure/technique as purchase_order_list.js (see
    // that file's own comments for the full reasoning on header padding,
    // hide_name_column, etc.) - explicit user request to match Purchase
    // Order's FORMAT. Account itself has none of PO's own fields though
    // (no date/amount/party - it's a Chart of Accounts tree doctype,
    // is_tree:1, no core listview_settings of its own to extend either),
    // so the column set is Account's own: Account Number/Company/Account
    // Type/Root Type as plain columns, plus a real Status badge (Aktif/
    // Nonaktif, off Account's own `disabled` checkbox) in the badge slot
    // Status fills on transaction doctypes - explicit user request, Root
    // Type alone in that slot read as "Status" to them but wasn't one.
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="acc-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="acc-c-name acc-hdr">ACCOUNT NAME</span>
        <span class="acc-c-number acc-hdr">ACCOUNT NUMBER</span>
        <span class="acc-c-company acc-hdr">COMPANY</span>
        <span class="acc-c-type acc-hdr">ACCOUNT TYPE</span>
        <span class="acc-c-roottype acc-hdr">ROOT TYPE</span>
        <span class="acc-c-badge acc-hdr">STATUS</span>
        <span class="acc-c-ago acc-hdr"></span>
    </div>`;

    function card(doc) {
        const disabled = cint(doc.disabled);
        const s = disabled ? STATUS.disabled : STATUS.active;
        const status_label = disabled ? __("Nonaktif") : __("Aktif");
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="acc-card" style="
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
            <span class="acc-c-name" style="${doc.is_group ? 'font-weight:700;' : ''}">${esc(doc.account_name || doc.name)}</span>
            <span class="acc-c-number">${esc(doc.account_number)}</span>
            <span class="acc-c-company">${esc(doc.company)}</span>
            <span class="acc-c-type">${esc(doc.account_type)}</span>
            <span class="acc-c-roottype">${esc(doc.root_type)}</span>
            <span class="acc-c-badge" style="background:${s.bg};color:${s.fg};">${esc(status_label)}</span>
            <span class="acc-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("acc-list")) $fl.addClass("acc-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".acc-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("acc-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("acc-ok");

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
                frappe.set_route("Form", "Account", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Account to extend (it's a tree
    // doctype - is_tree:1 - normally browsed via Tree View, List View is
    // just an alternate switcher option with no customization of its own
    // anywhere in erpnext/frappe core), so this is a plain assignment,
    // not the extend-not-replace pattern the other *_list.js files here
    // need.
    frappe.listview_settings["Account"] = {
        hide_name_column: true,
        add_fields: ["account_name", "account_number", "company", "account_type", "root_type", "is_group", "disabled"],
        refresh(lv) {
            render(lv);
        },
    };
})();
