(() => {
    // Same card-list structure/technique as tax_category_list.js (see
    // that file's own comments for the full reasoning, including showing
    // the autoname-source field as its own column even though it
    // duplicates the ID today) - explicit user request to match the rest
    // of this app's own FORMAT. Tax Invoice Type is owned by imogi_finance
    // - a lookup/reference table of Indonesian e-Faktur (CoreTax) invoice
    // codes, not a tree, not submittable, no core listview_settings of
    // its own, no imogi_finance duplicate-registration collision (only
    // one file, no cross-registration). No `disabled`-style status field
    // here - instead a single `is_replacement` Check, shown as its own
    // tag (same reasoning as asset_category_list.js's CWIP tag) rather
    // than forced into a Status badge. Column set: Prefix/Transaction
    // Code/Transaction Description/Replacement.
    const TAG_ON = { bg: "#dbeafe", fg: "#1d4ed8" };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="tit-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="tit-c-id tit-hdr">ID</span>
        <span class="tit-c-prefix tit-hdr">PREFIX</span>
        <span class="tit-c-code tit-hdr">TRANSACTION CODE</span>
        <span class="tit-c-desc tit-hdr">TRANSACTION DESCRIPTION</span>
        <span class="tit-c-replacement tit-hdr">REPLACEMENT</span>
        <span class="tit-c-ago tit-hdr"></span>
    </div>`;

    function card(doc) {
        const isReplacement = cint(doc.is_replacement);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="tit-card" style="
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
            <span class="tit-c-id">${esc(doc.name)}</span>
            <span class="tit-c-prefix">${esc(doc.fp_prefix)}</span>
            <span class="tit-c-code">${esc(doc.transaction_code) || "-"}</span>
            <span class="tit-c-desc">${esc(doc.transaction_description) || "-"}</span>
            <span class="tit-c-replacement">${isReplacement ? `<span class="tit-tag" style="background:${TAG_ON.bg};color:${TAG_ON.fg};">${esc(__("Replacement"))}</span>` : ""}</span>
            <span class="tit-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("tit-list")) $fl.addClass("tit-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".tit-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("tit-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("tit-ok");

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
                frappe.set_route("Form", "Tax Invoice Type", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Tax Invoice Type to extend.
    frappe.listview_settings["Tax Invoice Type"] = {
        hide_name_column: true,
        add_fields: ["fp_prefix", "transaction_code", "transaction_description", "is_replacement"],
        refresh(lv) {
            render(lv);
        },
    };
})();
