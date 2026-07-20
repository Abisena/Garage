(() => {
    const STATUS = {
        "Pending":      { bg: "#f3f4f6", fg: "#4b5563" },
        "Unreconciled": { bg: "#fef3c7", fg: "#b45309" },
        "Reconciled":   { bg: "#dcfce7", fg: "#15803d" },
        "Settled":      { bg: "#dbeafe", fg: "#1d4ed8" },
        "Cancelled":    { bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="bt-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="bt-c-deposit bt-hdr">DEPOSIT</span>
        <span class="bt-c-withdrawal bt-hdr">WITHDRAWAL</span>
        <span class="bt-c-desc bt-hdr">DESCRIPTION</span>
        <span class="bt-c-badge bt-hdr">STATUS</span>
        <span class="bt-c-ago bt-hdr"></span>
    </div>`;

    function card(doc) {
        const deposit    = flt(doc.deposit) ? format_currency(doc.deposit, doc.currency) : "";
        const withdrawal = flt(doc.withdrawal) ? format_currency(doc.withdrawal, doc.currency) : "";
        const desc       = doc.description || "";
        const ago        = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";
        const s          = STATUS[doc.status] || STATUS["Pending"];

        return `<div class="bt-card" style="
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
            <span class="bt-c-deposit">${deposit ? esc(deposit) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bt-c-withdrawal">${withdrawal ? esc(withdrawal) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bt-c-desc">${desc ? esc(desc) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="bt-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status || "Pending")}</span>
            <span class="bt-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("bt-list")) $fl.addClass("bt-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".bt-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("bt-ok")) return;

            // .attr(), not .data() - jQuery's .data() type-coerces a
            // purely-numeric docname into a JS number, which then never
            // strictly-equals the string doc.name below.
            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("bt-ok");

            // Force-hide ALL old Frappe children via inline !important
            $row.children().each(function () {
                this.style.setProperty("display", "none", "important");
            });

            // Force row to auto height, transparent bg
            row.style.setProperty("height", "auto", "important");
            row.style.setProperty("min-height", "0", "important");
            row.style.setProperty("padding", "0", "important");
            row.style.setProperty("overflow", "visible", "important");
            row.style.setProperty("background", "transparent", "important");

            // Append card with zebra bg
            const $card = $(card(doc));
            const bg = idx % 2 === 0 ? "#ffffff" : "#f0f1f3";
            $card[0].style.setProperty("background", bg, "important");
            $row.append($card);

            // Hover effect
            $card.on("mouseenter", function () {
                this.style.setProperty("background", "#e8edff", "important");
            }).on("mouseleave", function () {
                this.style.setProperty("background", bg, "important");
            });

            // Navigate on body click
            $card.on("click", function (e) {
                if ($(e.target).is("input[type=checkbox]")) return;
                frappe.set_route("Form", "Bank Transaction", doc.name);
            });

            idx++;
        });
    }

    function watch(lv) {
        // Same realtime/observer-node-swap guard used for Spare Part
        // Request's list - see spare_part_request_list.js for the full
        // explanation of why this reattaches every call instead of only
        // once.
        const node = lv.$result && lv.$result[0];
        if (!node || lv.__bt_observer_node === node) return;
        if (lv.__bt_observer) lv.__bt_observer.disconnect();
        lv.__bt_observer = new MutationObserver(() => render(lv));
        lv.__bt_observer.observe(node, { childList: true });
        lv.__bt_observer_node = node;
    }

    let lastLv = null;
    frappe.router.on("change", () => {
        if (!lastLv) return;
        const route = frappe.get_route();
        if (route[0] === "List" && route[1] === "Bank Transaction") {
            setTimeout(() => render(lastLv), 0);
        }
    });

    frappe.listview_settings["Bank Transaction"] = {
        hide_name_column: true,
        add_fields: [
            "deposit", "withdrawal", "description", "currency", "status",
        ],
        onload(lv) {
            lastLv = lv;
            watch(lv);
            render(lv);
        },
        refresh(lv) {
            lastLv = lv;
            watch(lv);
            render(lv);
        },
    };
})();
