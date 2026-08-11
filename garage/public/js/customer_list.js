(() => {
    // Customer's own `customer_type` field (Company/Individual/Partnership) -
    // badge colors chosen to just be visually distinct, not tied to any
    // workflow meaning the way Purchase/Sales Order's status badges are.
    // VIP customers (is_vip) override this badge entirely with a gold "VIP"
    // pill instead, same idea as garage_service_bundle_list.js's own
    // priority-over-type badge handling.
    const TYPE_BADGE = {
        "Individual":   { bg: "#eff6ff", fg: "#1d4ed8", border: "#3b82f6" },
        "Company":      { bg: "#f5f3ff", fg: "#6d28d9", border: "#8b5cf6" },
        "Partnership":  { bg: "#ecfeff", fg: "#0e7490", border: "#22d3ee" },
    };
    const VIP_BADGE = { bg: "#fef9c3", fg: "#a16207", border: "#eab308" };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    // Same ID/Name/Phone/City/Badge card layout as purchase_order_list.js,
    // for visual consistency across the app's list views - see that file's
    // own header comment for why the header padding needs the extra
    // var(--padding-xs) on both sides.
    const HEADER_HTML = `<div class="cu-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px calc(14px + var(--padding-xs)) 9px var(--padding-xs);
        gap:10px;
        background:#1f2937;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="cu-c-number cu-hdr">NO. CUSTOMER</span>
        <span class="cu-c-name cu-hdr">NAMA</span>
        <span class="cu-c-phone cu-hdr">TELEPON</span>
        <span class="cu-c-city cu-hdr">KOTA</span>
        <span class="cu-c-badge cu-hdr">TIPE</span>
        <span class="cu-c-ago cu-hdr"></span>
    </div>`;

    function card(doc) {
        const isVip = cint(doc.is_vip);
        const badge = isVip ? VIP_BADGE : (TYPE_BADGE[doc.customer_type] || TYPE_BADGE.Individual);
        const badgeLabel = isVip ? "VIP" : (doc.customer_type || "-");
        const ago = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="cu-card" style="
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
            <span class="cu-c-number">${esc(doc.customer_number || "-")}</span>
            <span class="cu-c-name">${esc(doc.customer_name || doc.name)}</span>
            <span class="cu-c-phone">${esc(doc.mobile_no || "-")}</span>
            <span class="cu-c-city">${esc(doc.city || "-")}</span>
            <span class="cu-c-badge" style="background:${badge.bg};color:${badge.fg};">${esc(badgeLabel)}</span>
            <span class="cu-c-ago">${ago}</span>
        </div>`;
    }

    function cint(v) { return v === 1 || v === "1" || v === true; }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("cu-list")) $fl.addClass("cu-list");

        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        if (!$fl.find(".cu-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("cu-ok")) return;

            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("cu-ok");

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
                frappe.set_route("Form", "Customer", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own listview_settings for Customer
    // (selling/doctype/customer/customer_list.js, loaded first since
    // erpnext precedes garage in apps.txt) so its own onload/get_indicator
    // (disabled/all-customers filters etc.) keep working.
    const existing = frappe.listview_settings["Customer"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Customer"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "customer_name", "customer_number", "mobile_no", "city", "customer_type", "is_vip",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });
})();
