frappe.ui.form.on('Customer Registration', {
  setup(frm) {
    // Datetime controls always append the system timezone (e.g. "Asia/Jakarta")
    // to their description unless df.hide_timezone is set - it's not a real
    // synced DocField property, so this has to happen client-side.
    frm.set_df_property('registration_date', 'hide_timezone', 1);
    frm.set_df_property('service_booking_date', 'hide_timezone', 1);

    frm.set_query('model', () => {
      const filters = {};
      if (frm.doc.brand) {
        filters.brand = frm.doc.brand;
      }

      return { filters };
    });
  },

  onload(frm) {
    if (frm.doc.branch) {
      return;
    }

    frappe.call({
      method: 'garage.garage.doctype.customer_registration.customer_registration.get_default_branch',
      callback: ({ message }) => {
        if (message && !frm.doc.branch) {
          frm.set_value('branch', message);
        }
      },
    });
  },

  brand(frm) {
    if (frm.is_dirty() && frm.doc.model) {
      frm.set_value('model', null);
    }
  },

  refresh(frm) {
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
    if (frm.doc.service_order_type) {
      return;
    }

    frappe.db
      .get_list('Garage Service Type', {
        fields: ['name'],
        filters: { is_active: 1 },
        limit: 1,
        order_by: 'modified desc',
      })
      .then(([serviceType]) => {
        if (serviceType && !frm.doc.service_order_type) {
          frm.set_value('service_order_type', serviceType.name);
        }
      });
  },

  license_plate(frm) {
    const plate = (frm.doc.license_plate || '').trim();
    if (!plate) {
      return;
    }

    frappe.call({
      method: 'garage.garage.doctype.customer_registration.customer_registration.fetch_by_plate',
      args: {
        license_plate: plate,
        branch: frm.doc.branch,
      },
      callback: (r) => {
        const data = r.message || {};
        if (!data.vehicle && !data.customer) {
          return;
        }

        if (data.vehicle) {
          const vehicle = data.vehicle;
          const vehicleFields = [
            'vin',
            'engine_number',
            'brand',
            'model',
            'vehicle_type',
            'vehicle_year',
            'assembly_type',
            'transmission',
            'fuel_type',
            'mileage',
            'notes',
          ];

          if (vehicle.branch && !frm.doc.branch) {
            frm.set_value('branch', vehicle.branch);
          }
          if (vehicle.name) {
            frm.set_value('vehicle', vehicle.name);
          }

          vehicleFields.forEach((fieldname) => {
            if (vehicle[fieldname] && !frm.doc[fieldname]) {
              frm.set_value(fieldname, vehicle[fieldname]);
            }
          });
        }

        if (data.customer) {
          const customer = data.customer;
          const customerFields = [
            'customer_name',
            'customer_type',
            'phone',
            'email',
            'preferred_contact_method',
            'id_number',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'postal_code',
            'country',
            'marketing_source',
            'is_vip',
          ];

          if (customer.name) {
            frm.set_value('customer', customer.name);
          }

          customerFields.forEach((fieldname) => {
            if (customer[fieldname] && !frm.doc[fieldname]) {
              frm.set_value(fieldname, customer[fieldname]);
            }
          });
        }

        frappe.show_alert({
          message: __('Existing data loaded for plate {0}', [plate]),
          indicator: 'green',
        });
      },
    });
  },
});
