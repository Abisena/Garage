"""Create the Customer custom fields that garage.utils.customer_hooks and
garage/public/js/customer.js already assume exist.

These fields were declared in hooks.py's Custom Field fixture filter (and
referenced throughout customer_hooks.py: uppercase_customer_name,
set_customer_number, sync_primary_address) but the underlying Custom Field
records were never actually created on any site - fixtures/custom_field.json
never carried them either. In practice this meant every attempt to insert a
new Customer crashed in the `before_insert` hook with
`AttributeError: 'Customer' object has no attribute 'customer_number'`,
since Frappe only exposes attributes for fields that exist on the doctype.

Field choices mirror the old (now-deleted) Garage Customer doctype schema
- see [[project_garage_customer_consolidated]] - for is_vip,
preferred_contact_method, marketing_source, id_number, address_line1/2,
postal_code, country, notes, registration_date/time. `city`/`state` are
Select (not free Data, unlike the old doctype) because
garage/public/js/customer.js auto-fills Province from City via a fixed
lookup table - every option here is a valid key/value in that table, so the
dropdown can never point at a city province.js doesn't know.
"""

from __future__ import annotations

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

CITY_OPTIONS = (
	"Ambon\nBandar Lampung\nBandung\nBanda Aceh\nBanjar\nBanjarbaru\nBanjarmasin\nBatam\n"
	"Baubau\nBekasi\nBengkulu\nBima\nBinjai\nBitung\nBlitar\nBogor\nBontang\nBukittinggi\n"
	"Cilegon\nCimahi\nCirebon\nDenpasar\nDepok\nDumai\nGorontalo\nGunungsitoli\n"
	"Jakarta Barat\nJakarta Pusat\nJakarta Selatan\nJakarta Timur\nJakarta Utara\nJambi\n"
	"Jayapura\nKediri\nKendari\nKotamobagu\nKupang\nLangsa\nLhokseumawe\nLubuklinggau\n"
	"Madiun\nMagelang\nMakassar\nMalang\nManado\nMataram\nMedan\nMetro\nMojokerto\nPadang\n"
	"Padangpanjang\nPadangsidimpuan\nPagar Alam\nPalangkaraya\nPalembang\nPalopo\nPalu\n"
	"Pangkalpinang\nParepare\nPariaman\nPasuruan\nPayakumbuh\nPekalongan\nPekanbaru\n"
	"Pematangsiantar\nPontianak\nPrabumulih\nProbolinggo\nSabang\nSalatiga\nSamarinda\n"
	"Sawahlunto\nSemarang\nSerang\nSibolga\nSingkawang\nSolok\nSorong\nSubulussalam\n"
	"Sukabumi\nSungai Penuh\nSurabaya\nSurakarta\nTangerang\nTangerang Selatan\n"
	"Tanjungbalai\nTanjungpinang\nTarakan\nTasikmalaya\nTebing Tinggi\nTegal\nTernate\n"
	"Tidore Kepulauan\nTomohon\nTual\nYogyakarta"
)

PROVINCE_OPTIONS = (
	"Aceh\nBali\nBangka Belitung\nBanten\nBengkulu\nDI Yogyakarta\nDKI Jakarta\nGorontalo\n"
	"Jambi\nJawa Barat\nJawa Tengah\nJawa Timur\nKalimantan Barat\nKalimantan Selatan\n"
	"Kalimantan Tengah\nKalimantan Timur\nKalimantan Utara\nKepulauan Riau\nLampung\n"
	"Maluku\nMaluku Utara\nNusa Tenggara Barat\nNusa Tenggara Timur\nPapua\n"
	"Papua Barat Daya\nRiau\nSulawesi Selatan\nSulawesi Tengah\nSulawesi Tenggara\n"
	"Sulawesi Utara\nSumatera Barat\nSumatera Selatan\nSumatera Utara"
)

CUSTOMER_FIELDS = [
	{
		"fieldname": "garage_profile_section",
		"fieldtype": "Section Break",
		"label": "Profil Garage",
		"insert_after": "customer_group",
		"collapsible": 1,
	},
	{
		"fieldname": "branch",
		"fieldtype": "Link",
		"label": "Cabang",
		"options": "Garage Branch",
		"insert_after": "garage_profile_section",
	},
	{
		"fieldname": "customer_number",
		"fieldtype": "Data",
		"label": "Nomor Pelanggan",
		"read_only": 1,
		"unique": 1,
		"insert_after": "branch",
		"description": "",
	},
	{
		"fieldname": "registration_date",
		"fieldtype": "Date",
		"label": "Tanggal Registrasi",
		"read_only": 1,
		"default": "Today",
		"insert_after": "customer_number",
	},
	{
		"fieldname": "registration_time",
		"fieldtype": "Time",
		"label": "Jam Registrasi",
		"read_only": 1,
		"insert_after": "registration_date",
	},
	{
		"fieldname": "is_vip",
		"fieldtype": "Check",
		"label": "Pelanggan VIP",
		"default": "0",
		"insert_after": "registration_time",
		"allow_in_quick_entry": 1,
	},
	{
		"fieldname": "preferred_contact_method",
		"fieldtype": "Select",
		"label": "Metode Kontak Pilihan",
		"options": "Phone\nEmail\nWhatsApp",
		"default": "Phone",
		"insert_after": "is_vip",
		"allow_in_quick_entry": 1,
	},
	{
		"fieldname": "marketing_source",
		"fieldtype": "Select",
		"label": "Sumber Informasi",
		"options": "\nWalk In\nReferral\nOnline Search\nSocial Media\nAdvertisement\nOther",
		"insert_after": "preferred_contact_method",
	},
	{
		"fieldname": "id_number",
		"fieldtype": "Data",
		"label": "No. KTP/SIM",
		"insert_after": "marketing_source",
		"allow_in_quick_entry": 1,
	},
	{
		"fieldname": "address_line1",
		"fieldtype": "Data",
		"label": "Alamat Baris 1",
		"insert_after": "id_number",
		"allow_in_quick_entry": 1,
	},
	{
		"fieldname": "address_line2",
		"fieldtype": "Data",
		"label": "Alamat Baris 2",
		"insert_after": "address_line1",
		"allow_in_quick_entry": 1,
	},
	{
		"fieldname": "city",
		"fieldtype": "Select",
		"label": "Kota",
		"options": "\n" + CITY_OPTIONS,
		"insert_after": "address_line2",
		"allow_in_quick_entry": 1,
	},
	{
		"fieldname": "state",
		"fieldtype": "Select",
		"label": "Provinsi",
		"options": "\n" + PROVINCE_OPTIONS,
		"insert_after": "city",
		"allow_in_quick_entry": 1,
	},
	{
		"fieldname": "postal_code",
		"fieldtype": "Data",
		"label": "Kode Pos",
		"insert_after": "state",
		"allow_in_quick_entry": 1,
	},
	{
		"fieldname": "country",
		"fieldtype": "Data",
		"label": "Negara",
		"default": "Indonesia",
		"insert_after": "postal_code",
		"allow_in_quick_entry": 1,
	},
	{
		"fieldname": "notes",
		"fieldtype": "Small Text",
		"label": "Catatan",
		"insert_after": "country",
	},
]


def execute() -> None:
	"""Create (or re-sync, if already present) the Customer custom fields."""

	if not frappe.db.table_exists("Customer"):
		return

	create_custom_fields({"Customer": CUSTOMER_FIELDS}, ignore_validate=True, update=True)
	frappe.clear_cache(doctype="Customer")
