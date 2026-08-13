(() => {
    // Same card-list structure/technique as employee_checkin_list.js (see
    // that file's own comments for the full reasoning on trying core's
    // get_indicator first) - explicit user request to match the rest of
    // this app's own FORMAT. Core erpnext ships its own listview_
    // settings for Supplier (buying/doctype/supplier/supplier_list.js:
    // get_indicator returns a badge ONLY when `on_hold` is set - a
    // regular active supplier gets no badge at all from core). This
    // extends (not replaces) it, trying core's own indicator first (On
    // Hold takes priority when set), falling back to the usual Aktif/
    // Nonaktif badge off `disabled` otherwise. Column set: Supplier
    // Name/Supplier Group/Supplier Type.
    const STATUS = {
        active:   { bg: "#dcfce7", fg: "#15803d" },
        disabled: { bg: "#fee2e2", fg: "#b91c1c" },
    };
    const COLOR_MAP = {
        red:    { bg: "#fee2e2", fg: "#b91c1c" },
        blue:   { bg: "#dbeafe", fg: "#1d4ed8" },
        orange: { bg: "#fff7ed", fg: "#c2410c" },
        green:  { bg: "#dcfce7", fg: "#15803d" },
        gray:   { bg: "#f3f4f6", fg: "#4b5563" },
        grey:   { bg: "#f3f4f6", fg: "#4b5563" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="sup-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="sup-c-id sup-hdr">ID</span>
        <span class="sup-c-name sup-hdr">SUPPLIER NAME</span>
        <span class="sup-c-group sup-hdr">SUPPLIER GROUP</span>
        <span class="sup-c-type sup-hdr">SUPPLIER TYPE</span>
        <span class="sup-c-badge sup-hdr">STATUS</span>
        <span class="sup-c-ago sup-hdr"></span>
    </div>`;

    function card(doc) {
        // Tries core's own get_indicator first (On Hold takes priority),
        // falls back to the usual Aktif/Nonaktif badge off `disabled`.
        const existing = frappe.listview_settings["Supplier"];
        const indicator = existing && existing.get_indicator ? existing.get_indicator(doc) : null;
        let s, label;
        if (indicator) {
            label = indicator[0];
            s = COLOR_MAP[indicator[1]] || COLOR_MAP.gray;
        } else {
            const isDisabled = cint(doc.disabled);
            s = isDisabled ? STATUS.disabled : STATUS.active;
            label = isDisabled ? __("Nonaktif") : __("Aktif");
        }
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="sup-card" style="
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
            <span class="sup-c-id">${esc(doc.name)}</span>
            <span class="sup-c-name">${esc(doc.supplier_name) || "-"}</span>
            <span class="sup-c-group">${esc(doc.supplier_group) || "-"}</span>
            <span class="sup-c-type">${esc(doc.supplier_type) || "-"}</span>
            <span class="sup-c-badge" style="background:${s.bg};color:${s.fg};">${esc(label)}</span>
            <span class="sup-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("sup-list")) $fl.addClass("sup-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".sup-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("sup-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("sup-ok");

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
                frappe.set_route("Form", "Supplier", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) core erpnext's own listview_settings for
    // Supplier (buying/doctype/supplier/supplier_list.js, loaded first
    // since erpnext precedes garage in apps.txt) so its own get_indicator
    // (On Hold) keeps working.
    const existing = frappe.listview_settings["Supplier"] || {};

    frappe.listview_settings["Supplier"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "supplier_name", "supplier_group", "supplier_type", "disabled",
        ])),
        refresh(lv) {
            render(lv);
        },
    });
})();
