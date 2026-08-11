(() => {
    // Same card-list structure/technique as employee_list.js (see that
    // file's own comments for the full reasoning) - explicit user request
    // to match Employee's own FORMAT. Salary Component is a plain master
    // data doctype (not a tree, no core listview_settings of its own).
    // Column set is its own: Name/Abbr/Type, plus a Status badge off its
    // own `disabled` checkbox (Aktif/Nonaktif, same wording already used
    // for this same concept on Department/Price List/Garage Branch
    // elsewhere in this app) in the slot Status fills on Employee's own
    // list.
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="sc-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="sc-c-id sc-hdr">ID</span>
        <span class="sc-c-abbr sc-hdr">ABBR</span>
        <span class="sc-c-type sc-hdr">TYPE</span>
        <span class="sc-c-badge sc-hdr">STATUS</span>
        <span class="sc-c-ago sc-hdr"></span>
    </div>`;

    function card(doc) {
        const isDisabled = cint(doc.disabled);
        const s = isDisabled ? STATUS.disabled : STATUS.active;
        const label = isDisabled ? __("Nonaktif") : __("Aktif");
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="sc-card" style="
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
            <span class="sc-c-id">${esc(doc.salary_component || doc.name)}</span>
            <span class="sc-c-abbr">${esc(doc.salary_component_abbr)}</span>
            <span class="sc-c-type">${esc(doc.type)}</span>
            <span class="sc-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="sc-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("sc-list")) $fl.addClass("sc-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".sc-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("sc-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("sc-ok");

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
                frappe.set_route("Form", "Salary Component", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Salary Component to extend.
    frappe.listview_settings["Salary Component"] = {
        hide_name_column: true,
        add_fields: ["salary_component", "salary_component_abbr", "type", "disabled"],
        refresh(lv) {
            render(lv);
        },
    };
})();
