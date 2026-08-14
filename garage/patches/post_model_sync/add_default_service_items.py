"""Seed a baseline catalog of workshop service items (Item + Garage Service Type)."""

from __future__ import annotations

import frappe

SERVICE_ITEM_GROUP = "Services"

SERVICES = [
    {
        "item_code": "JASA-GANTI-OLI-MESIN",
        "item_name": "Ganti Oli Mesin",
        "service_fee": 100000,
        "description": "Jasa penggantian oli mesin (tidak termasuk harga oli).",
    },
    {
        "item_code": "JASA-GANTI-OLI-TRANSMISI",
        "item_name": "Ganti Oli Transmisi",
        "service_fee": 150000,
        "description": "Jasa penggantian oli transmisi/matic (tidak termasuk harga oli).",
    },
    {
        "item_code": "JASA-TUNE-UP",
        "item_name": "Tune Up",
        "service_fee": 250000,
        "description": "Jasa tune up mesin standar.",
    },
    {
        "item_code": "JASA-SERVIS-REM",
        "item_name": "Servis Rem",
        "service_fee": 200000,
        "description": "Jasa pemeriksaan dan servis sistem rem depan/belakang.",
    },
    {
        "item_code": "JASA-SPOORING",
        "item_name": "Spooring",
        "service_fee": 150000,
        "description": "Jasa spooring roda.",
    },
    {
        "item_code": "JASA-BALANCING",
        "item_name": "Balancing Ban",
        "service_fee": 100000,
        "description": "Jasa balancing roda.",
    },
    {
        "item_code": "JASA-SERVIS-AC",
        "item_name": "Servis AC Mobil",
        "service_fee": 300000,
        "description": "Jasa pemeriksaan dan servis sistem AC mobil.",
    },
    {
        "item_code": "JASA-CUCI-MOBIL",
        "item_name": "Cuci Mobil",
        "service_fee": 50000,
        "description": "Jasa cuci mobil standar.",
    },
    {
        "item_code": "JASA-GANTI-AKI",
        "item_name": "Ganti Aki",
        "service_fee": 75000,
        "description": "Jasa pemasangan aki (tidak termasuk harga aki).",
    },
    {
        "item_code": "JASA-SERVIS-KELISTRIKAN",
        "item_name": "Servis Kelistrikan",
        "service_fee": 200000,
        "description": "Jasa pemeriksaan dan perbaikan sistem kelistrikan.",
    },
    {
        "item_code": "JASA-GANTI-KAMPAS-KOPLING",
        "item_name": "Ganti Kampas Kopling",
        "service_fee": 350000,
        "description": "Jasa penggantian kampas kopling (tidak termasuk sparepart).",
    },
    {
        "item_code": "JASA-OVERHAUL-MESIN",
        "item_name": "Overhaul Mesin",
        "service_fee": 1500000,
        "description": "Jasa turun mesin/overhaul.",
    },
    {
        "item_code": "JASA-SERVIS-INJEKSI",
        "item_name": "Servis Injeksi",
        "service_fee": 250000,
        "description": "Jasa pembersihan dan servis sistem injeksi bahan bakar.",
    },
    {
        "item_code": "JASA-ISI-NITROGEN",
        "item_name": "Isi Angin Nitrogen",
        "service_fee": 30000,
        "description": "Jasa cek tekanan dan isi ulang nitrogen ban.",
    },
]


def _ensure_service_item_group() -> None:
    if frappe.db.exists("Item Group", SERVICE_ITEM_GROUP):
        return
    doc = frappe.new_doc("Item Group")
    doc.item_group_name = SERVICE_ITEM_GROUP
    doc.parent_item_group = "All Item Groups"
    doc.is_group = 0
    doc.insert(ignore_permissions=True)


def execute() -> None:
    """Insert a baseline service catalog so Garage Service Type has real Items to link."""

    if not frappe.db.table_exists("Item") or not frappe.db.table_exists("Garage Service Type"):
        return

    _ensure_service_item_group()

    for service in SERVICES:
        item_code = service["item_code"]
        if not frappe.db.exists("Item", item_code):
            item = frappe.new_doc("Item")
            item.item_code = item_code
            item.item_name = service["item_name"]
            item.item_group = SERVICE_ITEM_GROUP
            item.stock_uom = "Nos"
            item.is_stock_item = 0
            item.standard_rate = service["service_fee"]
            item.description = service["description"]
            item.insert(ignore_permissions=True)

        service_type_name = service["item_name"]
        if frappe.db.exists("Garage Service Type", service_type_name):
            continue

        service_type = frappe.new_doc("Garage Service Type")
        service_type.service_type = service_type_name
        service_type.item = item_code
        service_type.bundle_description = service["description"]
        service_type.is_active = 1
        service_type.insert(ignore_permissions=True)
