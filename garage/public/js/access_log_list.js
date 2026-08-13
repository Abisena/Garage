(() => {
    // Same card-list structure/technique as activity_log_list.js (see
    // that file's own comments for the full reasoning) - explicit user
    // request to match the rest of this app's own FORMAT. Core frappe
    // ships a listview_settings for Access Log too (core/doctype/
    // access_log/access_log_list.js) but it's onload-only (the same log-
    // retention banner as Activity Log) - no get_indicator, and this
    // doctype has no status-equivalent field of its own either, so no
    // Status badge column at all (same reasoning as designation_list.js/
    // branch_list.js elsewhere in this app). Column set: Export From/
    // User/Reference Document/Method.
    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="acl-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="acl-c-id acl-hdr">ID</span>
        <span class="acl-c-export acl-hdr">EXPORT FROM</span>
        <span class="acl-c-user acl-hdr">USER</span>
        <span class="acl-c-ref acl-hdr">REFERENCE DOCUMENT</span>
        <span class="acl-c-method acl-hdr">METHOD</span>
        <span class="acl-c-ago acl-hdr"></span>
    </div>`;

    function card(doc) {
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="acl-card" style="
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
            <span class="acl-c-id">${esc(doc.name)}</span>
            <span class="acl-c-export">${esc(doc.export_from) || "-"}</span>
            <span class="acl-c-user">${esc(doc.user) || "-"}</span>
            <span class="acl-c-ref">${esc(doc.reference_document) || "-"}</span>
            <span class="acl-c-method">${esc(doc.method) || "-"}</span>
            <span class="acl-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("acl-list")) $fl.addClass("acl-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".acl-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("acl-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("acl-ok");

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
                frappe.set_route("Form", "Access Log", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) core frappe's own listview_settings for Access
    // Log (core/doctype/access_log/access_log_list.js, loaded first since
    // frappe precedes garage in apps.txt) so its own onload (log-
    // retention banner) keeps working.
    const existing = frappe.listview_settings["Access Log"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Access Log"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "export_from", "user", "reference_document", "method",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });
})();
