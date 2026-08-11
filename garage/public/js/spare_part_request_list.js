(() => {
    const STATUS = {
        "Request Part":     { bg: "#f3f4f6", fg: "#4b5563", border: "#9ca3af" },
        "Partial Prepared": { bg: "#dbeafe", fg: "#1d4ed8", border: "#3b82f6" },
        "Partial Reject":   { bg: "#fff7ed", fg: "#c2410c", border: "#f97316" },
        "Prepared":         { bg: "#dcfce7", fg: "#15803d", border: "#22c55e" },
        "Rejected":         { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="spr-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="spr-c-date spr-hdr">TANGGAL</span>
        <span class="spr-c-so spr-hdr">SERVICE ORDER</span>
        <span class="spr-c-customer spr-hdr">CUSTOMER NAME</span>
        <span class="spr-c-plate spr-hdr">NO. POLISI</span>
        <span class="spr-c-badge spr-hdr">STATUS</span>
        <span class="spr-c-ago spr-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[doc.status] || STATUS["Request Part"];

        const date     = doc.request_date ? frappe.datetime.str_to_user(doc.request_date) : "";
        const so       = doc.service_order || "";
        const customer = doc.customer_name || "";
        const plate    = doc.vehicle || "";
        const ago      = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="spr-card" style="
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
            <span class="spr-c-date">${esc(date)}</span>
            <span class="spr-c-so">${so ? esc(so) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="spr-c-customer">${customer ? esc(customer) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="spr-c-plate">${plate ? esc(plate) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="spr-c-badge" style="background:${s.bg};color:${s.fg};">${esc(doc.status)}</span>
            <span class="spr-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("spr-list")) $fl.addClass("spr-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".spr-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("spr-ok")) return;

            // .attr(), not .data() - jQuery's .data() type-coerces a
            // purely-numeric docname into a JS number, which then never
            // strictly-equals the string doc.name below.
            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("spr-ok");

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
                frappe.set_route("Form", "Spare Part Request", doc.name);
            });

            idx++;
        });
    }

    function watch(lv) {
        // A realtime "list_update" rebuilds rows via render_list() directly,
        // bypassing the refresh hook below - watch for that and re-render so
        // rows don't get stuck in the default Frappe layout. Frappe can also
        // swap out $result[0] for a fresh node when the List View page
        // instance is reused across navigations (e.g. opening the same
        // filtered list via a Connections widget link right after it was
        // just shown) - reattaching every time, rather than only once via a
        // "do I already have an observer" flag, keeps the observer pointed
        // at whichever node is actually live.
        const node = lv.$result && lv.$result[0];
        if (!node || lv.__spr_observer_node === node) return;
        if (lv.__spr_observer) lv.__spr_observer.disconnect();
        lv.__spr_observer = new MutationObserver(() => render(lv));
        lv.__spr_observer.observe(node, { childList: true });
        lv.__spr_observer_node = node;
    }

    // Frappe's BaseList.refresh() throttles duplicate refresh() calls that
    // share identical filter args within a 3s window (base_list.js
    // no_change()) - if this list is opened again (e.g. via a link inside
    // the Connections widget) right after an equivalent fetch already ran,
    // that second refresh is silently dropped, which skips
    // listview_settings.refresh() entirely and leaves Frappe's plain
    // skeleton markup on screen instead of our card layout. Route changes
    // still fire regardless of that throttle, so re-render from here too,
    // using whatever lv.data is currently holding (still correct - the
    // throttle only fires when the args, and therefore the data, haven't
    // actually changed).
    let lastLv = null;
    frappe.router.on("change", () => {
        if (!lastLv) return;
        const route = frappe.get_route();
        if (route[0] === "List" && route[1] === "Spare Part Request") {
            setTimeout(() => render(lastLv), 0);
        }
    });

    frappe.listview_settings["Spare Part Request"] = {
        hide_name_column: true,
        add_fields: [
            "request_date", "service_order", "status", "customer_name", "vehicle",
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
