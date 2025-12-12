frappe.ui.form.on('Customer Registration', {
  refresh(frm) {
    if (!frm.doc.service_order_type) {
      frm.set_value('service_order_type', 'Service/Repair');
    }
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
