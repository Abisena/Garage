(() => {
    // Purchase Invoice's own status options (accounts/doctype/purchase_
    // invoice/purchase_invoice.json) - a different set from Purchase
    // Order's, so this is its own map rather than reusing purchase_order_
    // list.js's one. Colors chosen to match the same bg/fg/border style
    // and, where the underlying meaning lines up, the same palette core's
    // own get_indicator already uses (Paid=green, Unpaid=orange,
    // Overdue=red, Partly Paid=yellow).
    const STATUS = {
        "Draft":              { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "Submitted":          { bg: "#eff6ff", fg: "#1d4ed8", border: "#3b82f6" },
        "Unpaid":             { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Partly Paid":        { bg: "#fef9c3", fg: "#a16207", border: "#eab308" },
        "Paid":               { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Overdue":            { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
        "Return":             { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "Debit Note Issued":  { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "Internal Transfer":  { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "Cancelled":          { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    // ID/Date/Supplier Name/Grand Total/Status - same card layout as
    // purchase_order_list.js for visual consistency across the buying
    // documents (see that file's own header comment for why the header
    // padding needs the extra var(--padding-xs) on both sides) - plus two
    // columns Purchase Order's own card has no equivalent for: Outstanding
    // Amount and Due Date. Status alone ("Unpaid"/"Overdue") says WHETHER
    // money is still owed, not HOW MUCH or BY WHEN - the two numbers that
    // actually matter when deciding which invoice to pay next.
    const HEADER_HTML = `<div class="pi-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="pi-c-id pi-hdr">ID</span>
        <span class="pi-c-date pi-hdr">DATE</span>
        <span class="pi-c-supplier pi-hdr">SUPPLIER NAME</span>
        <span class="pi-c-amount pi-hdr">GRAND TOTAL</span>
        <span class="pi-c-outstanding pi-hdr">OUTSTANDING</span>
        <span class="pi-c-due pi-hdr">JATUH TEMPO</span>
        <span class="pi-c-badge pi-hdr">STATUS</span>
        <span class="pi-c-ago pi-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS.Draft;
        const supplier = doc.supplier_name || doc.supplier || "";
        const date = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "";
        const amount = format_currency(doc.grand_total || 0, doc.currency);
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        const outstanding = flt(doc.outstanding_amount);
        // Fully settled (0) reads as "nothing left to track" - muted, same
        // treatment as an empty cell - rather than a bold "Rp 0" that draws
        // the eye as much as an invoice that still needs paying.
        const outstandingHtml = outstanding > 0
            ? `<span class="pi-c-outstanding" style="color:#b91c1c;font-weight:700;">${format_currency(outstanding, doc.currency)}</span>`
            : `<span class="pi-c-outstanding" style="color:var(--g-text-muted);">${format_currency(0, doc.currency)}</span>`;

        // Overdue is already its own status/badge, but that's a coarse
        // signal (crosses over at midnight) - highlighting the actual date
        // in the same red once it's past shows HOW overdue at a glance,
        // and stays useful even before the status field itself flips.
        const today = frappe.datetime.get_today();
        const isOverdue = doc.due_date && outstanding > 0 && doc.due_date < today;
        const dueDate = doc.due_date ? frappe.datetime.str_to_user(doc.due_date) : "-";
        const dueHtml = isOverdue
            ? `<span class="pi-c-due" style="color:#b91c1c;font-weight:700;">${esc(dueDate)}</span>`
            : `<span class="pi-c-due">${esc(dueDate)}</span>`;

        return `<div class="pi-card" style="
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
            <span class="pi-c-id">${esc(doc.name)}</span>
            <span class="pi-c-date">${esc(date)}</span>
            <span class="pi-c-supplier">${esc(supplier)}</span>
            <span class="pi-c-amount">${amount}</span>
            ${outstandingHtml}
            ${dueHtml}
            <span class="pi-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status)}</span>
            <span class="pi-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("pi-list")) $fl.addClass("pi-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".pi-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("pi-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("pi-ok");

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
                frappe.set_route("Form", "Purchase Invoice", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own listview_settings for Purchase
    // Invoice (accounts/doctype/purchase_invoice/purchase_invoice_list.js,
    // loaded first since erpnext precedes garage in apps.txt) so its
    // get_indicator (On Hold handling, status colors) and the onload
    // "Purchase Receipt"/"Payment" bulk-action buttons keep working.
    const existing = frappe.listview_settings["Purchase Invoice"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Purchase Invoice"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "supplier_name", "posting_date", "status", "grand_total", "currency",
            "outstanding_amount", "due_date",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });
})();
