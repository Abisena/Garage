"""Migrate Garage Vehicle: set branch non-required, backfill color as empty."""

import frappe


def execute():
    if not frappe.db.has_column("Garage Vehicle", "color"):
        return

    frappe.db.sql(
        """UPDATE `tabGarage Vehicle`
           SET `color` = ''
           WHERE `color` IS NULL"""
    )
    frappe.db.commit()
