(() => {
    // Same card-list structure/technique as fiscal_year_list.js (see that
    // file's own comments for the full reasoning, including showing the
    // autoname-source field as its own column even though it duplicates
    // the ID today - explicit user follow-up request on Fiscal Year,
    // applied proactively here too) - explicit user request to match the
    // rest of this app's own FORMAT. Asset Category is core erpnext
    // (Assets module), plain master data (not a tree, not submittable, no
    // core listview_settings of its own, no imogi_finance collision
    // either). No single "disabled"-style status field exists here -
    // instead there are two independent Check flags (Enable CWIP
    // Accounting/Non Depreciable Category), each shown as its own small
    // tag rather than forced into one badge (same reasoning as
    // expense_approval_setting_list.js's separate "Default" tag).
    const TAG_ON = { bg: "#dbeafe", fg: "#1d4ed8" };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="asc-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="asc-c-id asc-hdr">ID</span>
        <span class="asc-c-name asc-hdr">ASSET CATEGORY NAME</span>
        <span class="asc-c-cwip asc-hdr">CWIP</span>
        <span class="asc-c-nondepr asc-hdr">NON DEPRECIABLE</span>
        <span class="asc-c-ago asc-hdr"></span>
    </div>`;

    function card(doc) {
        const cwip = cint(doc.enable_cwip_accounting);
        const nondepr = cint(doc.non_depreciable_category);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="asc-card" style="
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
            <span class="asc-c-id">${esc(doc.name)}</span>
            <span class="asc-c-name">${esc(doc.asset_category_name)}</span>
            <span class="asc-c-cwip">${cwip ? `<span class="asc-tag" style="background:${TAG_ON.bg};color:${TAG_ON.fg};">${esc(__("CWIP"))}</span>` : ""}</span>
            <span class="asc-c-nondepr">${nondepr ? `<span class="asc-tag" style="background:${TAG_ON.bg};color:${TAG_ON.fg};">${esc(__("Non Depreciable"))}</span>` : ""}</span>
            <span class="asc-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("asc-list")) $fl.addClass("asc-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".asc-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("asc-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("asc-ok");

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
                frappe.set_route("Form", "Asset Category", doc.name);
            });

            idx++;
        });
    }

    // No core listview_settings exists for Asset Category to extend.
    frappe.listview_settings["Asset Category"] = {
        hide_name_column: true,
        add_fields: ["asset_category_name", "enable_cwip_accounting", "non_depreciable_category"],
        refresh(lv) {
            render(lv);
        },
    };
})();
