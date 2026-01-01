const isInvoicePaid = async (frm) => {
  if (!frm.doc.summary_invoice) {
    return false;
  }

  try {
    const response = await frappe.db.get_value('Sales Invoice', frm.doc.summary_invoice, [
      'status',
      'outstanding_amount'
    ]);
    const invoice = response?.message || {};
    const status = (invoice.status || '').toLowerCase();
    const outstanding = frappe.utils.flt(invoice.outstanding_amount || 0);
    return status === 'paid' || outstanding <= 0;
  } catch (error) {
    return false;
  }
};

const hasVehicleHandover = async (frm) => {
  if (!frm.doc.service_order) {
    return false;
  }

  try {
    const handovers = await frappe.db.get_list('Vehicle Handover', {
      filters: {
        service_order: frm.doc.service_order
      },
      fields: ['name'],
      limit: 1
    });
    return Boolean(handovers?.length);
  } catch (error) {
    return false;
  }
};

frappe.ui.form.on('Repair QC', {
  async refresh(frm) {
    frm.set_df_property('summary_total_amount', 'hidden', 1);
    frm.set_df_property('summary_outstanding_amount', 'hidden', 1);
    frm.set_df_property('status', 'hidden', 1);

    if (!frm.is_new()) {
      frm.clear_custom_buttons();
      if (frm.doc.status === 'Finished') {
        frm.disable_save();
        const [invoicePaid, vehicleHandoverExists] = await Promise.all([
          isInvoicePaid(frm),
          hasVehicleHandover(frm)
        ]);
        const canReopen = !(invoicePaid && vehicleHandoverExists);

        if (canReopen) {
          frm.page.set_primary_action(__('Reopen'), () => {
            frappe.confirm(__('Reopen this Repair QC to revise the checklist?'), () => {
              frm.enable_save();
              frm.set_value('status', 'Reopened');
              frm.save();
            });
          });
        } else if (frm.page.clear_primary_action) {
          frm.page.clear_primary_action();
        }
      } else {
        frm.enable_save();
        if (frm.page.clear_primary_action) {
          frm.page.clear_primary_action();
        }
        frm.add_custom_button(__('Finish QC'), () => {
          frappe.confirm(__('Mark this Repair QC as finished?'), () => {
            frm.set_value('status', 'Finished');
            frm.save();
          });
        });
      }
    }

    const partsGrid = frm.fields_dict.parts_used?.grid;
    if (partsGrid) {
      partsGrid.update_docfield_property('rate', 'hidden', 1);
      partsGrid.update_docfield_property('amount', 'hidden', 1);
      partsGrid.refresh();
    }
  },
  async service_order(frm) {
    if (!frm.doc.service_order) {
      frm.clear_table('spare_parts_verification');
      frm.refresh_field('spare_parts_verification');
      frm.clear_table('parts_used');
      frm.refresh_field('parts_used');
      return;
    }

    const existingRows = frm.doc.spare_parts_verification || [];
    const existingPartsUsed = frm.doc.parts_used || [];
    const shouldSyncSpareParts = frm.is_new() || !existingRows.length;
    const shouldSyncPartsUsed = frm.is_new() || !existingPartsUsed.length;
    if (!shouldSyncSpareParts && !shouldSyncPartsUsed) {
      return;
    }

    const serviceOrder = await frappe.db.get_doc('Garage Service Order', frm.doc.service_order);
    const requiredParts = serviceOrder.required_parts || [];

    if (shouldSyncSpareParts) {
      frm.clear_table('spare_parts_verification');
    }

    if (shouldSyncPartsUsed) {
      frm.clear_table('parts_used');
    }

    if (shouldSyncSpareParts) {
      requiredParts.forEach((part) => {
        const row = frm.add_child('spare_parts_verification');
        row.item_code = part.item_code;
        row.item_name = part.item_name;
        row.qty = part.qty;
        row.uom = part.uom;
      });

      frm.refresh_field('spare_parts_verification');
    }

    if (shouldSyncPartsUsed) {
      requiredParts.forEach((part) => {
        const row = frm.add_child('parts_used');
        row.item_code = part.item_code;
        row.item_name = part.item_name;
        row.description = part.description;
        row.qty = part.qty;
        row.uom = part.uom;
        row.source = part.source;
        row.stock_status = part.stock_status;
        row.linked_procurement = part.linked_procurement;
        row.warehouse = part.warehouse;
        row.rate = part.rate;
        row.amount = part.amount;
      });

      frm.refresh_field('parts_used');
    }
  }
});
