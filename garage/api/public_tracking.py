"""Public, no-login service-status lookup for customers ("/lacak").

Security notes:
- This is a genuinely public, unauthenticated endpoint. A lookup must never
  reveal *why* it failed - an unknown plate and a plate with the wrong phone
  both return the exact same {"found": False} shape, so the endpoint can't
  be used to enumerate valid license plates.
- Phone matching is normalized (digits only, country/trunk prefix stripped)
  so real-world formats (081..., 6281..., +6281...) all compare equal.
"""

from __future__ import annotations

import re
from typing import Any

import frappe
from frappe.rate_limiter import rate_limit

STEP_ORDER = ["queue", "in_progress", "payment", "ready", "done"]

STATUS_BUCKETS = {
	"Open": ("queue", None),
	"Waiting Part": ("in_progress", "menunggu sparepart"),
	"Prepared": ("in_progress", "sedang dikerjakan mekanik"),
	"In Progress": ("in_progress", "sedang dikerjakan mekanik"),
	"Finished": ("in_progress", "servis selesai, menunggu pemeriksaan akhir"),
	"QC Review": ("in_progress", "pemeriksaan akhir"),
	"Waiting Payment": ("payment", None),
	"Completed": ("done", None),
	"Cancelled": ("cancelled", None),
}

# Which raw status values count as "reached" for each step - used to look up
# when a step was first entered. "ready" (Siap Diambil) has no status of its
# own in this doctype: paying (Waiting Payment) and picking up both resolve
# straight to "Completed" here, so it's only ever shown as passed-through
# alongside "done", never as its own timestamped event.
STEP_STATUS_GROUPS = {
	"queue": ["Open"],
	"in_progress": ["Waiting Part", "Prepared", "In Progress", "Finished", "QC Review"],
	"payment": ["Waiting Payment"],
	"ready": [],
	"done": ["Completed"],
}


def _normalize_plate(raw: str) -> str:
	return (raw or "").strip().upper()


def _normalize_phone(raw: str) -> str:
	digits = re.sub(r"\D", "", raw or "")
	if digits.startswith("62") and len(digits) > 9:
		digits = digits[2:]
	elif digits.startswith("0"):
		digits = digits[1:]
	return digits


def _find_vehicle(plate: str) -> str | None:
	return frappe.db.get_value("Garage Vehicle", {"license_plate": _normalize_plate(plate)}, "name")


def _phone_matches(vehicle_name: str, phone: str) -> bool:
	stored = frappe.db.get_value("Garage Vehicle", vehicle_name, "customer_phone")
	if not stored or not phone:
		return False
	return _normalize_phone(stored) == _normalize_phone(phone)


def _bucket_for_status(status: str) -> dict[str, Any]:
	step, sub_label = STATUS_BUCKETS.get(status, ("queue", None))
	return {"step": step, "sub_label": sub_label}


def _status_first_reached(order_name: str, created_on) -> dict[str, Any]:
	"""When each raw status value was first reached, from the Version log
	(this doctype has track_changes=1). "Open" is never itself a version
	entry - it's the value at creation - so it's seeded from `creation`."""
	timestamps: dict[str, Any] = {"Open": created_on}

	versions = frappe.get_all(
		"Version",
		filters={"ref_doctype": "Garage Service Order", "docname": order_name},
		fields=["creation", "data"],
		order_by="creation asc",
	)
	for version in versions:
		try:
			data = frappe.parse_json(version.data) or {}
		except Exception:
			continue
		for change in data.get("changed") or []:
			if isinstance(change, (list, tuple)) and len(change) >= 3 and change[0] == "status":
				new_status = change[2]
				if new_status and new_status not in timestamps:
					timestamps[new_status] = version.creation

	return timestamps


def _step_times(order_name: str, created_on) -> dict[str, Any]:
	status_reached = _status_first_reached(order_name, created_on)
	times: dict[str, Any] = {}
	for step, statuses in STEP_STATUS_GROUPS.items():
		candidates = [status_reached[s] for s in statuses if s in status_reached]
		times[step] = min(candidates) if candidates else None
	return times


def _serialize_order(row: dict, parts: list[dict]) -> dict[str, Any]:
	bucket = _bucket_for_status(row.status)
	return {
		"name": row.name,
		"status": row.status,
		"step": bucket["step"],
		"sub_label": bucket["sub_label"],
		"complaint": row.complaint,
		"assigned_mechanic_name": row.assigned_mechanic_name,
		"service_order_type": row.service_order_type,
		"estimated_completion": row.estimated_completion,
		"creation": row.creation,
		"step_times": _step_times(row.name, row.creation),
		"required_parts": parts,
	}


def _get_service_orders(vehicle_name: str) -> list[dict[str, Any]]:
	rows = frappe.get_all(
		"Garage Service Order",
		filters={"vehicle": vehicle_name},
		fields=[
			"name",
			"status",
			"complaint",
			"assigned_mechanic_name",
			"service_order_type",
			"estimated_completion",
			"creation",
		],
		order_by="creation desc",
	)

	orders = []
	for row in rows:
		# Explicit field projection only - Garage Service Order Part has no
		# hidden-flagged fields, so rate/discount/tax/amount/warehouse would
		# leak to an unauthenticated visitor if the child table were returned as-is.
		parts = frappe.get_all(
			"Garage Service Order Part",
			filters={"parent": row.name},
			fields=["item_name", "qty", "uom"],
		)
		orders.append(_serialize_order(row, parts))

	return orders


@frappe.whitelist(allow_guest=True)
@rate_limit(key="license_plate", limit=10, seconds=60 * 60)
def track_service(license_plate: str, phone: str) -> dict[str, Any]:
	vehicle_name = _find_vehicle(license_plate)
	if not vehicle_name or not _phone_matches(vehicle_name, phone):
		return {"found": False}

	vehicle = frappe.db.get_value(
		"Garage Vehicle",
		vehicle_name,
		["license_plate", "brand", "model", "vehicle_year", "color"],
		as_dict=True,
	)

	orders = _get_service_orders(vehicle_name)
	current = orders[0] if orders else None
	history = orders[1:] if len(orders) > 1 else []

	return {
		"found": True,
		"vehicle": vehicle,
		"current": current,
		"history": history,
	}
