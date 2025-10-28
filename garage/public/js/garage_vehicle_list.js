(() => {
    function hideNameColumn(listview) {
        const $result = listview?.$result;
        if (!$result || !$result.length) {
            return false;
        }

        const $cells = $result.find('[data-fieldname="name"]');
        if (!$cells.length) {
            return false;
        }

        $cells.each((_, element) => {
            const $element = $(element);
            const $column = $element.closest(
                ".list-row-col, .list-header-col, .dt-cell, .dt-cell__content",
            );

            if ($column.length) {
                $column.hide();
            } else {
                $element.hide();
            }
        });

        return true;
    }

    function ensureNameColumnHidden(listview, attempts = 0) {
        if (!listview) {
            return;
        }

        if (hideNameColumn(listview)) {
            return;
        }

        if (attempts > 10) {
            return;
        }

        setTimeout(() => ensureNameColumnHidden(listview, attempts + 1), 100);
    }

    frappe.listview_settings["Garage Vehicle"] = {
        hide_name_column: true,
        formatters: {
            name(value) {
                if (!value) {
                    return value;
                }

                const text = String(value);
                if (/^\d+$/.test(text)) {
                    return text.padStart(5, "0");
                }

                return value;
            },
        },
        onload(listview) {
            ensureNameColumnHidden(listview);

            listview?.$result?.on("change", () => ensureNameColumnHidden(listview));
        },
        refresh(listview) {
            ensureNameColumnHidden(listview);
        },
    };
})();
