(() => {
    // Same card-list structure/technique as employee_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match Employee's own FORMAT. Department is a tree doctype
    // (is_tree:1, same situation as Account/Item Group) with NO core
    // listview_settings of its own to extend (unlike Employee), so this is
    // plain assignment, same as account_list.js/item_group_list.js.
    // Column set is Department's own: Department Name/Parent Department/
    // Company, plus a Status badge off its own `disabled` checkbox (Aktif/
    // Nonaktif, same wording already used for this same concept on Price
    // List/Garage Branch elsewhere in this app) in the slot Status fills
    // on Employee's own list.
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="dp-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="dp-c-id dp-hdr">ID</span>
        <span class="dp-c-name dp-hdr">DEPARTMENT NAME</span>
        <span class="dp-c-parent dp-hdr">PARENT DEPARTMENT</span>
        <span class="dp-c-company dp-hdr">COMPANY</span>
        <span class="dp-c-badge dp-hdr">STATUS</span>
        <span class="dp-c-ago dp-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = cint(doc.disabled);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const isGroup = cint(doc.is_group);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="dp-card" style="
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
            <span class="dp-c-id">${esc(doc.name)}</span>
            <span class="dp-c-name" style="${isGroup ? 'font-weight:700;' : ''}">${esc(doc.department_name || doc.name)}</span>
            <span class="dp-c-parent">${esc(doc.parent_department || "-")}</span>
            <span class="dp-c-company">${esc(doc.company)}</span>
            <span class="dp-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="dp-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("dp-list")) $fl.addClass("dp-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".dp-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("dp-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("dp-ok");

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
                frappe.set_route("Form", "Department", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Department to extend (it's a
    // tree doctype - is_tree:1 - normally browsed via Tree View, same
    // situation as Account/Item Group's own list.js).
    frappe.listview_settings["Department"] = {
        hide_name_column: true,
        add_fields: ["department_name", "parent_department", "company", "is_group", "disabled"],
        refresh(lv) {
            render(lv);
        },
    };
})();
