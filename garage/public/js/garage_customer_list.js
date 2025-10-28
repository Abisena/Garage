frappe.listview_settings["Garage Customer"] = {
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
};
