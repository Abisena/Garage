(() => {
    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="gv-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="gv-c-plate gv-hdr">LICENSE PLATE (NO. POLISI)</span>
        <span class="gv-c-vin gv-hdr">CHASSIS NUMBER (NO. RANGKA)</span>
        <span class="gv-c-customer gv-hdr">NO. CUSTOMER</span>
        <span class="gv-c-brand gv-hdr">BRAND (MERK)</span>
        <span class="gv-c-model gv-hdr">MODEL</span>
        <span class="gv-c-ago gv-hdr"></span>
    </div>`;

    function card(doc) {
        const plate    = doc.license_plate || doc.name;
        const vin      = doc.vin || "";
        const customer = doc.customer_name || doc.customer || "";
        const brand    = doc.brand || "";
        const model    = doc.model || "";
        const ago      = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="gv-card" style="
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
            <span class="gv-c-plate">${esc(plate)}</span>
            <span class="gv-c-vin">${esc(vin)}</span>
            <span class="gv-c-customer">${esc(customer)}</span>
            <span class="gv-c-brand">${esc(brand)}</span>
            <span class="gv-c-model">${esc(model)}</span>
            <span class="gv-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("gv-list")) $fl.addClass("gv-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".gv-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("gv-ok")) return;

            // .attr(), not .data() - jQuery's .data() type-coerces a
            // purely-numeric docname into a JS number, which then never
            // strictly-equals the string doc.name below.
            const name = $row.find("input.list-row-checkbox").attr("data-name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("gv-ok");

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
                frappe.set_route("Form", "Garage Vehicle", doc.name);
            });

            idx++;
        });
    }

    frappe.listview_settings["Garage Vehicle"] = {
        hide_name_column: true,
        add_fields: [
            "license_plate", "vin", "customer", "customer_name", "brand", "model",
        ],
        onload(lv) {
            // A realtime "list_update" rebuilds rows via render_list()
            // directly, bypassing this refresh hook - watch for that and
            // re-render so rows don't get stuck in the default Frappe layout.
            if (!lv.__gv_observer) {
                lv.__gv_observer = new MutationObserver(() => render(lv));
                lv.__gv_observer.observe(lv.$result[0], { childList: true });
            }
        },
        refresh(lv) {
            render(lv);
        },
    };
})();
