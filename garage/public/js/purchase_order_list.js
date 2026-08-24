(() => {
    // Same values Purchase Order's own `status` field already stores
    // (set by ERPNext's own controller, kept in sync with per_received/
    // per_billed) - colors mapped to match erpnext's own get_indicator
    // semantics (green for Closed/Delivered/Completed, orange for anything
    // still "in progress"), same style as sales_invoice_list.js.
    const STATUS = {
        "Draft":                  { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "On Hold":                { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "To Receive and Bill":    { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "To Bill":                { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "To Receive":             { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        // Distinct from the plain "To Receive*" orange - garage/__init__.py's
        // status_map patch adds this status for 0 < per_received < 100, so it
        // needs its own color to actually read as "partway there" rather than
        // "not started yet".
        "Partially Received":     { bg: "#fef9c3", fg: "#a16207", border: "#eab308" },
        "Completed":              { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Cancelled":              { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
        "Closed":                 { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Delivered":              { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    // ID, Date, Supplier Name, Grand Total, Status (left to right) - Grand
    // Total added on top of the standard 4 columns (was invisible before -
    // no way to see a PO's value at a glance), ID/Date moved to the front
    // and Status moved to the far right, per explicit request.
    // Left AND right padding both add var(--padding-xs) on top of the
    // 14px/0 this row style already had - Frappe wraps every actual data
    // row in a .list-row-container with padding: 0 var(--padding-xs) on
    // BOTH sides (list.scss), but this header is injected as a plain
    // sibling div outside that wrapper (lv.$result.before(...) below), so
    // without this it sits --padding-xs too far left AND has --padding-xs
    // less inset on the right than every real row - a small but real
    // mismatch on both edges that threw off every column's alignment
    // against its own header, most visibly on the right-aligned Grand
    // Total column.
    const HEADER_HTML = `<div class="po-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="po-c-id po-hdr">ID</span>
        <span class="po-c-date po-hdr">DATE</span>
        <span class="po-c-supplier po-hdr">SUPPLIER NAME</span>
        <span class="po-c-amount po-hdr">GRAND TOTAL</span>
        <span class="po-c-badge po-hdr">STATUS</span>
        <span class="po-c-ago po-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS.Draft;
        const supplier = doc.supplier_name || doc.supplier || "";
        const date = doc.transaction_date ? frappe.datetime.str_to_user(doc.transaction_date) : "";
        const amount = format_currency(doc.grand_total || 0, doc.currency);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="po-card" style="
            display:flex !important;
            align-items:center;
            width:100%;
            padding:10px 14px 10px 0;
            gap:10px;
            cursor:pointer;
            border-left:3px solid ${s.border};
        ">
            <div style="flex:0 0 36px; display:flex; align-items:center; justify-content:center;">
                <input type="checkbox" class="list-row-checkbox" data-name="${esc(doc.name)}" style="cursor:pointer;">
            </div>
            <span class="po-c-id">${esc(doc.name)}</span>
            <span class="po-c-date">${esc(date)}</span>
            <span class="po-c-supplier">${esc(supplier)}</span>
            <span class="po-c-amount">${amount}</span>
            <span class="po-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status)}</span>
            <span class="po-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("po-list")) $fl.addClass("po-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".po-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("po-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("po-ok");

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
                frappe.set_route("Form", "Purchase Order", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own listview_settings for Purchase
    // Order (buying/doctype/purchase_order/purchase_order_list.js, loaded
    // first since erpnext precedes garage in apps.txt) so its get_indicator
    // and the Close/Reopen menu items + "Purchase Invoice"/"Purchase
    // Receipt"/"Advance Payment" bulk-action buttons in onload keep working.
    const existing = frappe.listview_settings["Purchase Order"] || {};
    const existing_onload = existing.onload;
    const existing_get_indicator = existing.get_indicator;

    frappe.listview_settings["Purchase Order"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "supplier_name", "transaction_date", "status", "grand_total", "currency",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
        // Form view's own header badge calls frappe.get_indicator(doc,
        // doctype), which falls through to this exact function
        // (model/indicator.js) - core's own version re-derives "To
        // Receive and Bill"/"To Receive" straight from per_received/
        // per_billed, ignoring doc.status entirely for that branch, so
        // the form view kept showing the old label even though the list
        // view (via card()'s own STATUS map above, which reads doc.status
        // directly) already showed "Partially Received" correctly. Same
        // fix as the STATUS map: special-case it first, then defer to
        // core's function for every other status so Close/On Hold/etc.
        // still behave exactly as before.
        get_indicator(doc) {
            if (doc.status === "Partially Received") {
                return [__("Partially Received"), "yellow", "status,=,Partially Received"];
            }
            return existing_get_indicator ? existing_get_indicator(doc) : undefined;
        },
    });

    // erpnext's own convention-loaded buying/doctype/purchase_order/
    // purchase_order_list.js and this file both land in the SAME
    // concatenated __list_js blob (confirmed via bench console:
    // get_code_files_via_hooks + a live Playwright check), so the plain
    // Object.assign above normally wins outright since it runs last in
    // that eval - but ListView's constructor can capture `this.settings
    // = frappe.listview_settings[doctype] || {}` from BEFORE that blob
    // finishes evaluating (confirmed live: frappe.listview_settings
    // ["Purchase Order"] ends up with only `add_fields`/`onload`, both
    // `refresh` and `get_indicator` gone, card never renders). Same root
    // cause/fix as expense_request_list.js - see garage.
    // registerListRenderOverride()'s own comment (garage_theme.js).
    garage.registerListRenderOverride("Purchase Order", render, [
        "supplier_name", "transaction_date", "status", "grand_total", "currency",
    ]);
})();
