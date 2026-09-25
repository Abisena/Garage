// Item Series Prefix -> Item Group, immediate UI feedback for the choice
// item_hooks.py's own generate_item_code_from_prefix() already enforces
// server-side (the authoritative copy, also covers API/Data Import paths
// that never load this file at all) - this just mirrors it here so staff
// see Item Group update the instant they pick a prefix, instead of only
// finding out after Save. Keep this mapping in sync with PREFIX_ITEM_
// GROUP in garage/utils/item_hooks.py.
(() => {
    const PREFIX_ITEM_GROUP = {
        'SP-': 'Products',
        'JS-': 'Services',
        'CSM-': 'Consumable',
    };

    frappe.ui.form.on('Item', {
        item_series_prefix(frm) {
            const item_group = PREFIX_ITEM_GROUP[frm.doc.item_series_prefix];
            if (item_group) {
                frm.set_value('item_group', item_group);
            }
        },
    });
})();
