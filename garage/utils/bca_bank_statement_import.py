import csv
import io
import json

import frappe
from frappe.model.naming import make_autoname

# BCA's raw CSV export wraps the actual transaction table in an account-info
# header block ("No. rekening : ...", "Nama : ...", ...) and a saldo/mutasi
# footer block, both with far fewer columns than the transaction rows.
# Frappe's generic Data Import treats row 1 as the column-count baseline and
# flags every one of those non-transaction rows as "Row has less values
# than columns". This is the real transaction table's header row - once we
# find it, everything before it and every row after it that doesn't match
# its column count is noise, not data to import.
BCA_TRANSACTION_HEADER = ["Tanggal Transaksi", "Keterangan", "Cabang", "Jumlah", "Saldo"]

# Column headers of the cleaned-up file. Cabang is dropped (Bank Transaction
# has no matching field for it) and Jumlah is split into Deposit/Withdrawal
# (Bank Transaction keeps those as two separate Currency fields, but BCA
# puts one combined "<amount> DB"/"<amount> CR" value in a single column).
# "Bank Account" is added (not present in BCA's export at all) because
# BankStatementImport.start_import() hard-throws "Please add the Bank
# Account column" unless the file's own columns already include one - core
# only auto-fills that column later, inside the background import job, by
# which point this check has already run. "Balance" (BCA's Saldo, running
# balance after each transaction) is kept - not for the Bank Transaction
# import itself (nothing on that doctype cares), but so the Bank
# Reconciliation Tool can auto-fill Closing Balance from it instead of
# forcing the user to retype it from the paper statement every time - see
# bank_reconciliation_tool.js's fill_closing_balance().
CLEANED_HEADER = ["Tanggal Transaksi", "Keterangan", "Deposit", "Withdrawal", "Bank Account", "Balance"]

# Column INDEX (as a string, 0-based - NOT the header text, despite "Column
# in Bank File" suggesting otherwise) -> Bank Transaction fieldname. Frappe's
# Importer looks this map up by str(column_index) (importer.py Header.
# __init__: `column_to_field_map.get(str(j))`), so it only ever works keyed
# by position - a header-text key silently never matches anything. Seeded
# onto the "BCA" Bank record so Frappe's Data Import auto-maps these instead
# of flagging "Cannot match column ... with any field" (which silently skips
# the column on import - with all 4 columns unmapped, every imported row
# would come in completely empty).
BCA_FIELD_MAP = {
    "0": "date",  # Tanggal Transaksi
    "1": "description",  # Keterangan
    "2": "deposit",  # Deposit
    "3": "withdrawal",  # Withdrawal
    "4": "bank_account",  # Bank Account
    "5": "balance",  # Balance (custom field - see hooks.py fixtures)
}


def _parse_bca_date(value: str) -> str:
    """"03/06/2026" (DD/MM/YYYY) -> "2026-06-03" (ISO) - left as-is if it
    doesn't look like that format, rather than guessing wrong."""
    value = (value or "").strip()
    parts = value.split("/")
    if len(parts) != 3:
        return value
    day, month, year = parts
    if not (day.isdigit() and month.isdigit() and year.isdigit() and len(year) == 4):
        return value
    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"


def _split_bca_amount(value: str) -> tuple[str, str]:
    """"1,127,500.00 DB" -> ("", "1,127,500.00") (withdrawal)
    "51,400.00 CR" -> ("51,400.00", "") (deposit)"""
    value = (value or "").strip()
    upper = value.upper()
    if upper.endswith("DB"):
        return "", value[:-2].strip()
    if upper.endswith("CR"):
        return value[:-2].strip(), ""
    return "", ""


def set_import_naming(doc, method=None):
    current_name = doc.get("name")

    if current_name:
        if current_name.startswith("BCA-IMPORT-"):
            return
        if not current_name.startswith("New "):
            return

    doc.name = make_autoname("BCA-IMPORT-.#####")


def clean_import_file(doc, method=None):
    """doc_event: Bank Statement Import.validate"""
    if getattr(doc, "import_file", None):
        _clean_csv_file(doc.import_file, doc.get("bank_account"))
        if getattr(doc, "bank", None) == "BCA":
            ensure_bca_field_mapping()
            # Core (BankStatementImport.validate, which runs before this
            # doc_event) only rebuilds template_options from the Bank's
            # mapping table when import_file *changes* relative to the
            # previous save - a brand new document that already has
            # import_file set at insert time has no "previous save" to
            # compare against, so that condition never fires and
            # template_options is left None. Set it directly instead of
            # depending on that condition.
            doc.template_options = json.dumps({"column_to_field_map": dict(BCA_FIELD_MAP)})


def clean_attached_file(doc, method=None):
    """doc_event: File.validate - catches the file at upload time, in case
    it's linked to its parent Bank Statement Import before that parent doc
    itself is ever saved (and so before Bank Statement Import.validate would
    otherwise run)."""
    if doc.attached_to_doctype == "Bank Statement Import" and doc.file_url:
        bank_account = frappe.db.get_value(
            "Bank Statement Import", doc.attached_to_name, "bank_account"
        )
        _clean_csv_file(doc.file_url, bank_account)


def _clean_csv_file(file_url: str, bank_account: str | None = None) -> None:
    if not file_url or not file_url.lower().endswith(".csv"):
        return

    try:
        file_doc = frappe.get_doc("File", {"file_url": file_url})
    except frappe.DoesNotExistError:
        return

    file_path = file_doc.get_full_path()

    try:
        with open(file_path, "rb") as f:
            raw = f.read()
    except OSError:
        return

    content = raw.decode("utf-8-sig", errors="replace")
    rows = list(csv.reader(io.StringIO(content)))
    if not rows:
        return

    header_idx = None
    for i, row in enumerate(rows):
        if [c.strip() for c in row] == BCA_TRANSACTION_HEADER:
            header_idx = i
            break

    if header_idx is not None:
        col_count = len(BCA_TRANSACTION_HEADER)
        data_rows = [r for r in rows[header_idx + 1 :] if len(r) == col_count]

        cleaned_rows = [CLEANED_HEADER]
        for row in data_rows:
            date_val = _parse_bca_date(row[0])
            description = row[1].strip()
            deposit, withdrawal = _split_bca_amount(row[3])
            balance = row[4].strip()
            cleaned_rows.append([date_val, description, deposit, withdrawal, bank_account or "", balance])

        _write_csv(file_path, cleaned_rows)
        return

    # Already went through the transform above in an earlier save - the
    # Bank Account value can still be stale (e.g. picked/changed only after
    # the file was first uploaded), so keep that one column in sync without
    # re-running the whole strip/split transform.
    if rows and [c.strip() for c in rows[0]] == CLEANED_HEADER:
        changed = False
        for row in rows[1:]:
            while len(row) < len(CLEANED_HEADER):
                row.append("")
            if row[4] != (bank_account or ""):
                row[4] = bank_account or ""
                changed = True
        if changed:
            _write_csv(file_path, rows)


def _write_csv(file_path: str, rows: list) -> None:
    buf = io.StringIO()
    csv.writer(buf).writerows(rows)
    with open(file_path, "w", encoding="utf-8", newline="") as f:
        f.write(buf.getvalue())


def ensure_bca_field_mapping() -> None:
    """Seed the "BCA" Bank record's column-to-field mapping so Frappe's
    Data Import auto-maps our cleaned header (see CLEANED_HEADER) instead of
    flagging every column as unmatched - core reads this mapping in
    BankStatementImport.validate() to build template_options."""
    if not frappe.db.exists("Bank", "BCA"):
        return

    bank = frappe.get_doc("Bank", "BCA")
    existing = {(d.file_field, d.bank_transaction_field) for d in bank.bank_transaction_mapping}
    wanted = set(BCA_FIELD_MAP.items())
    if existing == wanted:
        return

    bank.set("bank_transaction_mapping", [])
    for file_field, bank_transaction_field in BCA_FIELD_MAP.items():
        bank.append(
            "bank_transaction_mapping",
            {"file_field": file_field, "bank_transaction_field": bank_transaction_field},
        )
    bank.save(ignore_permissions=True)
