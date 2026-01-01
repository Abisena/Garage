const DEFAULT_INSPECTION_ITEMS = [
  "Engine - Oil Level",
  "Engine - Coolant Level",
  "Engine - Battery Condition",
  "Engine - Belts & Hoses",
  "Brakes - Brake Pads Front",
  "Brakes - Brake Pads Rear",
  "Brakes - Brake Fluid Level",
  "Brakes - Brake Lines",
  "Tires - Tire Pressure FL",
  "Tires - Tire Pressure FR",
  "Tires - Tire Pressure RL",
  "Tires - Tire Pressure RR",
  "Tires - Tread Depth",
  "Tires - Wheel Alignment",
  "Electrical - Headlights",
  "Electrical - Tail Lights",
  "Electrical - Turn Signals",
  "Electrical - Wipers",
  "Electrical - Horn",
  "Electrical - AC System",
  "Exterior - Body Condition",
  "Exterior - Windshield",
  "Exterior - Mirrors",
];

frappe.ui.form.on("Garage Vehicle Inspection", {
  refresh(frm) {
    const grid = frm.fields_dict?.inspection_items?.grid;
    if (grid) {
      grid.update_docfield_property(
        "severity",
        "options",
        "OK\nNeed Attention\nReplace"
      );
      grid.update_docfield_property("severity", "default", "OK");
      grid.refresh();
    }

    if (!frm.is_new() || (frm.doc.inspection_items || []).length > 0) {
      return;
    }

    DEFAULT_INSPECTION_ITEMS.forEach((item) => {
      const row = frm.add_child("inspection_items");
      row.item = item;
      row.severity = "OK";
    });

    frm.refresh_field("inspection_items");
  },
});
