import frappe

no_cache = 1


def get_context(context):
	context.title = "Lacak Status Servis"
	# Populated from a printed SPK's QR code (?plate=...) so the customer
	# only has to type their phone number, not the plate too. Never trust
	# this for anything but a form pre-fill - the actual lookup is still
	# gated by the phone match in track_service().
	context.prefill_plate = frappe.form_dict.get("plate", "")
	return context
