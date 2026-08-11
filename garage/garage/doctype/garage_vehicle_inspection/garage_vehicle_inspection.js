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
    frm.$wrapper.find('input, select, textarea').css('background-color', '#eaeaea');
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
      update_overall_condition(frm);
      return;
    }

    DEFAULT_INSPECTION_ITEMS.forEach((item) => {
      const row = frm.add_child("inspection_items");
      row.item = item;
      row.severity = "OK";
    });

    frm.refresh_field("inspection_items");
    update_overall_condition(frm);
  },
  inspection_items_add(frm) {
    update_overall_condition(frm);
  },
  inspection_items_remove(frm) {
    update_overall_condition(frm);
  },
});

frappe.ui.form.on("Garage Service Order Inspection", {
  severity(frm) {
    update_overall_condition(frm);
  },
});

const SEVERITY_SCORES = {
  OK: 0,
  "Need Attention": 1,
  Replace: 2,
};

const CONDITION_THRESHOLDS = [
  { maxRatio: 0.1, condition: "Good" },
  { maxRatio: 0.3, condition: "Fair" },
  { maxRatio: 0.6, condition: "Poor" },
  { maxRatio: 1, condition: "Critical" },
];

function update_overall_condition(frm) {
  const items = frm.doc.inspection_items || [];
  if (items.length === 0) {
    return;
  }

  const totalScore = items.reduce((sum, item) => {
    const severity = item.severity || "OK";
    const score = SEVERITY_SCORES[severity] ?? 0;
    return sum + score;
  }, 0);
  const maxScore = items.length * SEVERITY_SCORES.Replace;
  const ratio = maxScore === 0 ? 0 : totalScore / maxScore;
  const nextCondition =
    CONDITION_THRESHOLDS.find((threshold) => ratio <= threshold.maxRatio)
      ?.condition || "Critical";

  if (frm.doc.overall_condition !== nextCondition) {
    frm.set_value("overall_condition", nextCondition);
  }
}
