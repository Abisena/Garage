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

        const allowedStatuses = new Set(['Partial Reject', 'Rejected', 'Reject All']);
        const currentStatus = (frm.doc.part_charge_status || '').trim();
        const allowDeletion = allowedStatuses.has(currentStatus);
        const grid = gridField.grid;
        const shouldDisallow = !allowDeletion;

        if (!grid._bound_toggle_required_part_controls && typeof grid.on === 'function') {
            grid._bound_toggle_required_part_controls = true;
            grid.on('grid-row-open', () => frm.trigger('toggle_required_part_controls'));
        }

        if (grid.cannot_delete_rows !== shouldDisallow) {
            grid.cannot_delete_rows = shouldDisallow;
            grid.refresh();
        }

        const tooltip = __('Tidak dapat menghapus sparepart saat status masih menunggu.');

        const bulkRemoveButton = grid.wrapper.find('.grid-remove-rows');
        if (bulkRemoveButton?.length) {
            bulkRemoveButton.prop('disabled', shouldDisallow);
            bulkRemoveButton.toggleClass('disabled', shouldDisallow);
            if (shouldDisallow) {
                bulkRemoveButton.attr('aria-disabled', 'true');
                bulkRemoveButton.attr('title', tooltip);
            } else {
                bulkRemoveButton.removeAttr('aria-disabled');
                bulkRemoveButton.removeAttr('title');
            }
        }

        const disableButton = ($button) => {
            if (!$button || !$button.length) {
                return;
            }
            if (shouldDisallow) {
                $button.prop('disabled', true);
                $button.addClass('disabled');
                $button.attr('aria-disabled', 'true');
                $button.attr('title', tooltip);
            } else {
                $button.prop('disabled', false);
                $button.removeClass('disabled');
                $button.removeAttr('aria-disabled');
                $button.removeAttr('title');
            }
        };

        grid.wrapper.find('.grid-delete-row').each((_, button) => {
            disableButton($(button));
        });

        if (grid.grid_form && grid.grid_form.wrapper) {
            disableButton(grid.grid_form.wrapper.find('.grid-delete-row'));
        }
    },
});
