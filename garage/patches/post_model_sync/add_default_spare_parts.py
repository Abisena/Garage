"""Seed a baseline catalog of stock spare-part Items with opening stock, so
Garage Service Order's Required Parts / Request Spare Part flow has real
stock items to pick and send."""

from __future__ import annotations

import frappe

SPARE_PART_ITEM_GROUP = "Products"
OPENING_QTY = 20

SPARE_PARTS = [
    {
        "item_code": "SP-OLI-MESIN",
        "item_name": "Oli Mesin",
        "uom": "Litre",
        "rate": 60000,
        "description": "Oli mesin mobil (per liter).",
    },
    {
        "item_code": "SP-FILTER-OLI",
        "item_name": "Filter Oli",
        "uom": "Nos",
        "rate": 45000,
        "description": "Filter oli mesin.",
    },
    {
        "item_code": "SP-FILTER-UDARA",
        "item_name": "Filter Udara",
        "uom": "Nos",
        "rate": 65000,
        "description": "Filter udara mesin.",
    },
    {
        "item_code": "SP-BUSI",
        "item_name": "Busi",
        "uom": "Nos",
        "rate": 35000,
        "description": "Busi mesin (per pcs).",
    },
    {
        "item_code": "SP-KAMPAS-REM-DEPAN",
        "item_name": "Kampas Rem Depan",
        "uom": "Set",
        "rate": 250000,
        "description": "Kampas rem depan (per set).",
    },
    {
        "item_code": "SP-KAMPAS-REM-BELAKANG",
        "item_name": "Kampas Rem Belakang",
        "uom": "Set",
        "rate": 220000,
        "description": "Kampas rem belakang (per set).",
    },
    {
        "item_code": "SP-AKI-MOBIL",
        "item_name": "Aki Mobil",
        "uom": "Nos",
        "rate": 850000,
        "description": "Aki mobil standar.",
    },
    {
        "item_code": "SP-WIPER-BLADE",
        "item_name": "Wiper Blade",
        "uom": "Set",
        "rate": 120000,
        "description": "Sepasang wiper blade.",
    },
    {
        "item_code": "SP-LAMPU-DEPAN",
        "item_name": "Lampu Depan (Bohlam)",
        "uom": "Nos",
        "rate": 75000,
        "description": "Bohlam lampu depan.",
    },
    {
        "item_code": "SP-BAN-MOBIL",
        "item_name": "Ban Mobil",
        "uom": "Nos",
        "rate": 950000,
        "description": "Ban mobil standar (per pcs).",
    },
]


def _get_opening_warehouse(company: str) -> str | None:
    return frappe.db.get_value(
        "Warehouse",
        {"company": company, "warehouse_name": "Stores"},
        "name",
    ) or frappe.db.get_value(
        "Warehouse",
        {"company": company, "is_group": 0},
        "name",
    )


def execute() -> None:
    """Insert baseline stock spare-part Items and give them opening stock."""

    if not frappe.db.table_exists("Item"):
        return

    company = frappe.db.get_single_value("Global Defaults", "default_company") or (
        frappe.get_all("Company", limit=1, pluck="name") or [None]
    )[0]

    warehouse = _get_opening_warehouse(company) if company else None

    new_item_codes = []
    for part in SPARE_PARTS:
        item_code = part["item_code"]
        if frappe.db.exists("Item", item_code):
            continue

        item = frappe.new_doc("Item")
        item.item_code = item_code
        item.item_name = part["item_name"]
        item.item_group = SPARE_PART_ITEM_GROUP
        item.stock_uom = part["uom"]
        item.is_stock_item = 1
        item.standard_rate = part["rate"]
        item.description = part["description"]
        item.insert(ignore_permissions=True)
        new_item_codes.append(item_code)

    if not new_item_codes or not warehouse or not company:
        return

    stock_entry = frappe.new_doc("Stock Entry")
    stock_entry.stock_entry_type = "Material Receipt"
    stock_entry.company = company
    stock_entry.to_warehouse = warehouse
    for item_code in new_item_codes:
        rate = next(p["rate"] for p in SPARE_PARTS if p["item_code"] == item_code)
        stock_entry.append(
            "items",
            {
                "item_code": item_code,
                "qty": OPENING_QTY,
                "t_warehouse": warehouse,
                "basic_rate": rate,
            },
        )
    stock_entry.insert(ignore_permissions=True)
    stock_entry.submit()
