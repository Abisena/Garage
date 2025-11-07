frappe.ui.form.on('Garage Service Order', {
    onload(frm) {
        frm.trigger('toggle_required_part_controls');
    },
    refresh(frm) {
        frm.trigger('toggle_required_part_controls');
    },
    part_charge_status(frm) {
        frm.trigger('toggle_required_part_controls');
    },
    required_parts_on_form_rendered(frm) {
        frm.trigger('toggle_required_part_controls');
    },
    toggle_required_part_controls(frm) {
        const gridField = frm.get_field('required_parts');
        if (!gridField || !gridField.grid) {
            return;
        }

        const allowedStatuses = new Set(['Partial Reject', 'Rejected']);
        const currentStatus = (frm.doc.part_charge_status || '').trim();
        const allowDeletion = allowedStatuses.has(currentStatus);
        const grid = gridField.grid;
        const shouldDisallow = !allowDeletion;

        if (grid.cannot_delete_rows !== shouldDisallow) {
            grid.cannot_delete_rows = shouldDisallow;
            grid.refresh();
        }

        const bulkRemoveButton = grid.wrapper.find('.grid-remove-rows');
        if (bulkRemoveButton?.length) {
            bulkRemoveButton.prop('disabled', shouldDisallow);
            bulkRemoveButton.toggleClass('disabled', shouldDisallow);
            if (shouldDisallow) {
                bulkRemoveButton.attr('title', __('Tidak dapat menghapus sparepart saat status masih menunggu.'));
            } else {
                bulkRemoveButton.removeAttr('title');
            }
        }

        grid.wrapper.find('.grid-delete-row').each((_, button) => {
            const $button = $(button);
            if (shouldDisallow) {
                $button.prop('disabled', true);
                $button.addClass('disabled');
                $button.attr('title', __('Tidak dapat menghapus sparepart saat status masih menunggu.'));
            } else {
                $button.prop('disabled', false);
                $button.removeClass('disabled');
                $button.removeAttr('title');
            }
        });
    },
});
