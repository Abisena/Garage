(() => {
    // Docstatus-based status, same palette as vehicle_handover_list.js
    const STATUS = {
        "0": { label: "Draft",     bg: "#f3f4f6", fg: "#4b5563" },
        "1": { label: "Submitted", bg: "#dcfce7", fg: "#15803d" },
        "2": { label: "Cancelled", bg: "#fee2e2", fg: "#b91c1c" },
    };

    function esc(v) { return frappe.utils.escape_html(v || ""); }

    const HEADER_HTML = `<div class="pe-header" style="
        display:flex !important;
        align-items:center;
        width:100%;
        padding:9px 14px 9px 0;
        gap:10px;
        background:#1f2937;
        border-radius:0 0 0 0;
    ">
        <div style="flex:0 0 36px;"></div>
        <span class="pe-c-id pe-hdr">ID</span>
        <span class="pe-c-party pe-hdr">PARTY</span>
        <span class="pe-c-plate pe-hdr">NO. POLISI</span>
        <span class="pe-c-type pe-hdr">TIPE PEMBAYARAN</span>
        <span class="pe-c-date pe-hdr">TANGGAL</span>
        <span class="pe-c-mode pe-hdr">METODE PEMBAYARAN</span>
        <span class="pe-c-badge pe-hdr">STATUS</span>
        <span class="pe-c-ago pe-hdr"></span>
    </div>`;

    function card(doc) {
        const s = STATUS[String(doc.docstatus)] || STATUS["0"];

        const party = doc.title || doc.party || doc.name;
        const plate = doc.no_polisi || "";
        const type  = doc.payment_type || "";
        const date  = doc.posting_date ? frappe.datetime.str_to_user(doc.posting_date) : "";
        const mode  = doc.mode_of_payment || "";
        const ago   = doc.modified ? frappe.datetime.comment_when(doc.modified, true) : "";

        return `<div class="pe-card" style="
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
            <span class="pe-c-id">${esc(doc.name)}</span>
            <span class="pe-c-party">${esc(party)}</span>
            <span class="pe-c-plate">${plate ? esc(plate) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="pe-c-type">${esc(type)}</span>
            <span class="pe-c-date">${esc(date)}</span>
            <span class="pe-c-mode">${mode ? esc(mode) : '<span style="color:#cbd5e1;">&mdash;</span>'}</span>
            <span class="pe-c-badge" style="background:${s.bg};color:${s.fg};">${s.label}</span>
            <span class="pe-c-ago">${ago}</span>
        </div>`;
    }

    function render(lv) {
        const $fl = lv.$result.closest(".frappe-list");
        if (!$fl.hasClass("pe-list")) $fl.addClass("pe-list");

        // Hide default column header via inline style
        lv.$result.find(".list-row-head").each(function () {
            this.style.setProperty("display", "none", "important");
        });

        // Inject custom header once
        if (!$fl.find(".pe-header").length) {
            lv.$result.before(HEADER_HTML);
        }

        let idx = 0;
        lv.$result.find(".list-row:not(.list-row-head)").each(function () {
            const row = this;
            const $row = $(row);
            if ($row.hasClass("pe-ok")) return;

            const name = $row.find("input.list-row-checkbox").data("name");
            const doc  = (lv.data || []).find((d) => d.name === name);
            if (!doc) return;

            $row.addClass("pe-ok");

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
                frappe.set_route("Form", "Payment Entry", doc.name);
            });

            idx++;
        });
    }

    // Extend (not replace) ERPNext's own payment_entry_list.js (sets the
    // party_type onload filter) so that behavior keeps working.
    const existing = frappe.listview_settings["Payment Entry"] || {};
    const existing_onload = existing.onload;

    frappe.listview_settings["Payment Entry"] = Object.assign({}, existing, {
        hide_name_column: true,
        add_fields: Array.from(new Set([
            ...(existing.add_fields || []),
            "title", "party", "no_polisi", "payment_type", "posting_date", "mode_of_payment", "docstatus",
        ])),
        onload(lv) {
            if (existing_onload) existing_onload(lv);
        },
        refresh(lv) {
            render(lv);
        },
    });

    // imogi_finance ALSO registers its own public/js/payment_entry_list.js
    // via its own hooks.py doctype_list_js entry (a plain, non-extending
    // `frappe.listview_settings['Payment Entry'] = {...}` overwrite) - and
    // since imogi_finance is installed AFTER garage
    // (frappe.get_installed_apps() order), that file's concatenated
    // position runs LAST and silently discards everything set up above,
    // confirmed live (native table view was showing instead of the card
    // list despite this file being otherwise correctly wired - same root
    // cause as expense_request_list.js, see garage.
    // registerListRenderOverride()'s own comment in garage_theme.js for
    // the full mechanism). Shared fix, one prototype patch covers every
    // doctype affected by this quirk.
    garage.registerListRenderOverride("Payment Entry", render, [
        "title", "party", "no_polisi", "payment_type", "posting_date", "mode_of_payment",
    ]);
})();
