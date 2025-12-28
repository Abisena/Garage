"""Ensure Garage Vehicle Inspection name column supports formatted naming."""

from __future__ import annotations

import frappe


def execute() -> None:
    """Alter the Garage Vehicle Inspection name column to VARCHAR when needed."""

    if frappe.db.db_type != "mariadb":
        return

    db_name = getattr(frappe.conf, "db_name", None)
    if not db_name:
        return

    table_name = "tabGarage Vehicle Inspection"

    column_info = frappe.db.sql(
        """
        SELECT column_type
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s AND column_name = 'name'
        """,
        (db_name, table_name),
        as_dict=True,
    )

    if not column_info:
        return

    column_type = column_info[0].get("column_type", "").lower()

    if "int" not in column_type:
        return

    frappe.db.sql(
        f"ALTER TABLE `{table_name}` MODIFY COLUMN `name` VARCHAR(140) NOT NULL"
    )
