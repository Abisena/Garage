import csv
import io
import json
from datetime import date

import frappe
from frappe import _
from frappe.model.naming import make_autoname
from frappe.utils import cint

# BCA's raw CSV export wraps the actual transaction table in an account-info
# header block ("No. rekening : ...", "Nama : ...", ...) and a saldo/mutasi
# footer block, both with far fewer columns than the transaction rows.
# Frappe's generic Data Import treats row 1 as the column-count baseline and
# flags every one of those non-transaction rows as "Row has less values
# than columns". This is the real transaction table's header row - once we
# find it, everything before it and every row after it that doesn't match
# its column count is noise, not data to import.
BCA_TRANSACTION_HEADER = ["Tanggal Transaksi", "Keterangan", "Cabang", "Jumlah", "Saldo"]

# Mandiri's raw CSV export (BSI corporate account statement format) is
# semicolon-delimited, not comma - Frappe's default CSV reader treats the
# whole header line as one giant unmatched column when it hits this
# ("Cannot match column AccountNo;Ccy;PostDate;... with any field"). Unlike
# BCA it has no noisy header/footer block around the transaction table
# (nothing to strip), but it needs its own delimiter, date format ("15 May
# 2026 04:13:08", not DD/MM/YYYY), and Credit Amount/Debit Amount are
# already two separate columns (no combined "<amount> DB/CR" value to
# split the way BCA's Jumlah is).
MANDIRI_TRANSACTION_HEADER = [
    "AccountNo", "Ccy", "PostDate", "Remarks", "AdditionalDesc",
    "Credit Amount", "Debit Amount", "Close Balance",
]

# Column headers of the cleaned-up file - the common target shape every
# bank's raw export gets transformed into, regardless of its own original
# columns/delimiter/date format. Cabang/AccountNo/Ccy/AdditionalDesc are
# dropped (Bank Transaction has no matching field for them) and each
# bank's own amount column(s) collapse to Deposit/Withdrawal (Bank
# Transaction keeps those as two separate Currency fields). "Bank Account"
# is added (present in neither bank's own export) because BankStatement
# Import.start_import() hard-throws "Please add the Bank Account column"
# unless the file's own columns already include one - core only auto-fills
# that column later, inside the background import job, by which point this
# check has already run. "Balance" (running balance after each
# transaction) is kept - not for the Bank Transaction import itself
# (nothing on that doctype cares), but so the Bank Reconciliation Tool can
# auto-fill Closing Balance from it instead of forcing the user to retype
# it from the paper statement every time - see bank_reconciliation_tool.js's
# fill_closing_balance().
CLEANED_HEADER = ["Tanggal Transaksi", "Keterangan", "Deposit", "Withdrawal", "Bank Account", "Balance"]

# Column INDEX (as a string, 0-based - NOT the header text, despite "Column
# in Bank File" suggesting otherwise) -> Bank Transaction fieldname. Frappe's
# Importer looks this map up by str(column_index) (importer.py Header.
# __init__: `column_to_field_map.get(str(j))`), so it only ever works keyed
# by position - a header-text key silently never matches anything. Every
# bank converges on the same CLEANED_HEADER shape, so this one mapping is
# seeded onto every recognized Bank record (see ensure_bank_field_mapping)
# instead of needing a separate map per bank.
CLEANED_FIELD_MAP = {
    "0": "date",  # Tanggal Transaksi
    "1": "description",  # Keterangan
    "2": "deposit",  # Deposit
    "3": "withdrawal",  # Withdrawal
    "4": "bank_account",  # Bank Account
    "5": "balance",  # Balance (custom field - see hooks.py fixtures)
}

_MONTH_NAMES = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12",
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


def _parse_mandiri_date(value: str) -> str:
    """"15 May 2026 04:13:08" -> "2026-05-15" (ISO, time dropped - Bank
    Transaction.date is a Date field, not Datetime). Left as-is if it
    doesn't look like that format. Month name matched manually rather than
    via strptime's locale-dependent %b, so this doesn't silently break on a
    server whose locale isn't English."""
    value = (value or "").strip()
    parts = value.split()
    if len(parts) < 3:
        return value
    day, month_name, year = parts[0], parts[1], parts[2]
    month = _MONTH_NAMES.get(month_name.strip().lower()[:3])
    if not (month and day.isdigit() and year.isdigit() and len(year) == 4):
        return value
    return f"{year}-{month}-{day.zfill(2)}"


def _is_valid_iso_date(value: str) -> bool:
    """A row whose date column doesn't parse to a real ISO date - e.g. BCA
    showing "PEND" instead of a date for a transaction that's still
    pending settlement, not yet assigned a final posting date - has
    nothing to reconcile against yet. _parse_bca_date/_parse_mandiri_date
    both leave a value they don't recognize untouched rather than guessing,
    so this is what actually catches "PEND" (or anything else unparseable)
    before it reaches Frappe's Date field and throws "must be in
    yyyy-mm-dd format"."""
    try:
        date.fromisoformat(value)
        return True
    except (ValueError, TypeError):
        return False


def _zero_to_blank(value: str) -> str:
    """Mandiri's Credit Amount/Debit Amount are already two separate
    columns (unlike BCA's combined Jumlah), but the inapplicable side is an
    explicit "0.00" rather than blank - normalized to blank so an imported
    row doesn't end up with both Deposit and Withdrawal populated, matching
    what _split_bca_amount already produces for BCA."""
    value = (value or "").strip()
    try:
        if float(value.replace(",", "")) == 0:
            return ""
    except ValueError:
        pass
    return _format_amount(value)


def _format_amount(value: str) -> str:
    """"43560.00" -> "43,560.00" - Mandiri's own export has no thousands
    separator at all, unlike BCA's ("1,127,500.00"), which left the
    Preview table showing BCA and Mandiri amounts in two visibly different
    styles side by side. Left as-is if it doesn't parse as a plain
    number (already-comma-formatted input round-trips fine too, since the
    commas are stripped before re-parsing)."""
    value = (value or "").strip()
    if not value:
        return value
    try:
        number = float(value.replace(",", ""))
    except ValueError:
        return value
    return f"{number:,.2f}"


def set_import_naming(doc, method=None):
    current_name = doc.get("name")
    bank = "".join((doc.get("bank") or "BANK").upper().split())
    prefix = f"{bank}-IMPORT-"

    if current_name:
        if current_name.startswith(prefix):
            return
        if not current_name.startswith("New "):
            return

    doc.name = make_autoname(f"{prefix}.#####")


def clean_import_file(doc, method=None):
    """doc_event: Bank Statement Import.validate"""
    if getattr(doc, "import_file", None):
        stats = _clean_csv_file(doc.import_file, doc.get("bank_account"))

        # Rows dropped during cleaning (e.g. still "PEND", no settled date)
        # never make it into the cleaned file, so there's no way to recover
        # this count later just by re-reading it - persisted here (custom
        # field, see hooks.py fixtures) so the print format's "Dilewati"
        # stat has real data instead of a fabricated "Duplikat" figure
        # Frappe's importer never actually tracks. Overwritten fresh on
        # every validate() rather than accumulated, since _clean_csv_file
        # re-scans whatever the CURRENT file's rows are each time (see its
        # own "already cleaned" branch) - that's always the up to date
        # total, not a delta to add to the last one.
        doc.skipped_row_count = stats["skipped"]

        # Left unchecked, this file's cleaned output has a header and zero
        # data rows - core's own Importer (frappe/core/doctype/data_import/
        # importer.py) throws on exactly that shape ("Import template
        # should contain a Header and atleast one row" / "Template Error"),
        # but not until *later*, whenever get_data_for_import_preview() or
        # start_import() next parses the file - by then there's no context
        # left to explain *why* it's empty, just a generic template
        # complaint. Caught right here instead, where the actual reason
        # (every transaction skipped for having no settled date) is still
        # known.
        if stats["kept"] == 0 and stats["skipped"] > 0:
            # frappe.throw() aborts the save before db_insert()/db_update()
            # ever runs, so a brand new doc (this validate firing during its
            # very first insert) never actually lands in the database - only
            # doc.name gets assigned early (set_import_naming runs before
            # validate), the row itself doesn't exist yet. But a re-save of
            # an ALREADY-persisted doc (e.g. swapping in a new, all-pending
            # file on a Bank Statement Import that saved fine earlier) still
            # has that earlier row sitting in the table - this throw alone
            # wouldn't touch it, leaving a stuck "Pending" ghost record
            # behind in the list/tree view forever, since on_change (see
            # delete_if_not_success) never even fires for a save that
            # aborts here. Deleted explicitly (and committed, since the rest
            # of this request is about to roll back once frappe.throw()
            # below propagates) before surfacing the same error message.
            if frappe.db.exists("Bank Statement Import", doc.name):
                frappe.delete_doc(
                    "Bank Statement Import",
                    doc.name,
                    ignore_permissions=True,
                    delete_permanently=True,
                    ignore_missing=True,
                )
                frappe.db.commit()

            frappe.throw(
                _(
                    "Semua {0} transaksi di file ini masih berstatus PENDING di bank "
                    "(belum settle, belum ada tanggal transaksi final), jadi belum ada "
                    "yang bisa direkonsiliasi. Tunggu sampai transaksinya settle, lalu "
                    "download ulang statement dari bank dan upload lagi."
                ).format(stats["skipped"]),
                title=_("Semua Transaksi Masih Pending"),
            )

        bank = getattr(doc, "bank", None)
        if bank and frappe.db.exists("Bank", bank):
            ensure_bank_field_mapping(bank)
            # Core (BankStatementImport.validate, which runs before this
            # doc_event) only rebuilds template_options from the Bank's
            # mapping table when import_file *changes* relative to the
            # previous save - a brand new document that already has
            # import_file set at insert time has no "previous save" to
            # compare against, so that condition never fires and
            # template_options is left None. Set it directly instead of
            # depending on that condition.
            doc.template_options = json.dumps({"column_to_field_map": dict(CLEANED_FIELD_MAP)})


def delete_if_not_success(doc, method=None):
    """doc_event: Bank Statement Import.on_change - the only doc_event that
    fires for this: the background import job (erpnext core, bank_statement_
    import.py start_import()) reports its outcome purely through
    data_import.db_set("status", ...), and Document.db_set() always runs
    on_change (see frappe/model/document.py), whether or not the doc is ever
    .save()'d normally. Deletes the whole record once the outcome is
    anything other than "Success", so a failed/partial run doesn't linger in
    the Bank Statement Import list/tree view - only fully-successful imports
    stay visible.

    Importer.import_data() (frappe core, importer.py) sets status to the
    hardcoded string "Partial Success" the moment the FIRST row succeeds,
    mid-loop, well before the run is actually done - a fully successful
    import (all rows import fine) passes through that same interim value
    before the real final db_set overwrites it to "Success" moments later.
    Acting on that interim value would wrongly delete what's actually a
    fully successful import. "Error" and "Success" are never used as that
    kind of interim placeholder (only ever set once, as the true final
    outcome), so those are safe to act on immediately - only "Partial
    Success" needs the extra check below, gated on whether every payload row
    has actually been logged yet (mirrors the exact total-vs-logged
    comparison importer.py itself uses to compute the final status)."""
    if doc.flags.in_delete:
        return
    if doc.status in (None, "", "Pending", "Success"):
        return
    if doc.status == "Partial Success":
        total = doc.get("payload_count")
        if not total:
            return
        logged = frappe.db.count("Data Import Log", {"data_import": doc.name})
        if logged < total:
            return

    frappe.delete_doc(
        "Bank Statement Import",
        doc.name,
        ignore_permissions=True,
        delete_permanently=True,
        ignore_missing=True,
    )


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


def _read_rows(content: str, delimiter: str) -> list[list[str]]:
    return list(csv.reader(io.StringIO(content), delimiter=delimiter))


def _clean_csv_file(file_url: str, bank_account: str | None = None) -> dict:
    """Returns {"kept": N, "skipped": N} - rows written to the cleaned file
    vs. rows dropped for having no valid date (e.g. still pending
    settlement, see _is_valid_iso_date). Both 0 if the file wasn't
    recognized/touched at all (wrong extension, missing, not a format this
    module knows)."""
    stats = {"kept": 0, "skipped": 0}

    if not file_url or not file_url.lower().endswith(".csv"):
        return stats

    try:
        file_doc = frappe.get_doc("File", {"file_url": file_url})
    except frappe.DoesNotExistError:
        return stats

    file_path = file_doc.get_full_path()

    try:
        with open(file_path, "rb") as f:
            raw = f.read()
    except OSError:
        return stats

    content = raw.decode("utf-8-sig", errors="replace")

    comma_rows = _read_rows(content, ",")
    header_idx = None
    for i, row in enumerate(comma_rows):
        if [c.strip() for c in row] == BCA_TRANSACTION_HEADER:
            header_idx = i
            break

    if header_idx is not None:
        col_count = len(BCA_TRANSACTION_HEADER)
        data_rows = [r for r in comma_rows[header_idx + 1 :] if len(r) == col_count]

        cleaned_rows = [CLEANED_HEADER]
        for row in data_rows:
            date_val = _parse_bca_date(row[0])
            if not _is_valid_iso_date(date_val):
                stats["skipped"] += 1  # e.g. "PEND" - not yet settled, no real date to import
                continue
            description = row[1].strip()
            deposit, withdrawal = _split_bca_amount(row[3])
            balance = row[4].strip()
            cleaned_rows.append([date_val, description, deposit, withdrawal, bank_account or "", balance])
            stats["kept"] += 1

        _write_csv(file_path, cleaned_rows)
        return stats

    semicolon_rows = _read_rows(content, ";")
    if semicolon_rows and [c.strip() for c in semicolon_rows[0]] == MANDIRI_TRANSACTION_HEADER:
        col_count = len(MANDIRI_TRANSACTION_HEADER)
        data_rows = [r for r in semicolon_rows[1:] if len(r) == col_count]

        cleaned_rows = [CLEANED_HEADER]
        for row in data_rows:
            date_val = _parse_mandiri_date(row[2])
            if not _is_valid_iso_date(date_val):
                stats["skipped"] += 1  # not yet settled - no real date to import
                continue
            description = row[3].strip()
            deposit = _zero_to_blank(row[5])
            withdrawal = _zero_to_blank(row[6])
            balance = _format_amount(row[7])
            cleaned_rows.append([date_val, description, deposit, withdrawal, bank_account or "", balance])
            stats["kept"] += 1

        _write_csv(file_path, cleaned_rows)
        return stats

    # Already went through one of the transforms above in an earlier save -
    # the Bank Account value can still be stale (e.g. picked/changed only
    # after the file was first uploaded), so keep that one column in sync
    # without re-running the whole strip/split transform. Cleaned rows are
    # always comma-delimited (csv.writer's own default), regardless of
    # which bank's raw delimiter they started from. Deposit/Withdrawal/
    # Balance are also re-passed through _format_amount() here - harmless
    # on a value that's already comma-formatted (commas get stripped
    # before re-parsing), but this is what actually applies the fix on a
    # document whose file was cleaned by an older version of this function,
    # before _format_amount existed, without needing the user to re-upload.
    if comma_rows and [c.strip() for c in comma_rows[0]] == CLEANED_HEADER:
        changed = False
        kept_rows = [CLEANED_HEADER]
        for row in comma_rows[1:]:
            while len(row) < len(CLEANED_HEADER):
                row.append("")
            if not _is_valid_iso_date(row[0].strip()):
                # e.g. "PEND" left over from a save made before this check
                # existed - drop it now instead of leaving it to break
                # start_import() with "must be in yyyy-mm-dd format".
                changed = True
                stats["skipped"] += 1
                continue
            if row[4] != (bank_account or ""):
                row[4] = bank_account or ""
                changed = True
            for col in (2, 3, 5):  # Deposit, Withdrawal, Balance
                formatted = _format_amount(row[col])
                if row[col] != formatted:
                    row[col] = formatted
                    changed = True
            kept_rows.append(row)
            stats["kept"] += 1
        if changed:
            _write_csv(file_path, kept_rows)

    return stats


def _write_csv(file_path: str, rows: list) -> None:
    buf = io.StringIO()
    csv.writer(buf).writerows(rows)
    with open(file_path, "w", encoding="utf-8", newline="") as f:
        f.write(buf.getvalue())


def ensure_bank_field_mapping(bank_name: str) -> None:
    """Seed a Bank record's column-to-field mapping so Frappe's Data Import
    auto-maps our cleaned header (see CLEANED_HEADER) instead of flagging
    every column as unmatched - core reads this mapping in BankStatement
    Import.validate() to build template_options. Same mapping for every
    bank, since they all get transformed into the same CLEANED_HEADER shape
    before Frappe ever sees the file."""
    bank = frappe.get_doc("Bank", bank_name)
    existing = {(d.file_field, d.bank_transaction_field) for d in bank.bank_transaction_mapping}
    wanted = set(CLEANED_FIELD_MAP.items())
    if existing == wanted:
        return

    bank.set("bank_transaction_mapping", [])
    for file_field, bank_transaction_field in CLEANED_FIELD_MAP.items():
        bank.append(
            "bank_transaction_mapping",
            {"file_field": file_field, "bank_transaction_field": bank_transaction_field},
        )
    bank.save(ignore_permissions=True)


@frappe.whitelist()
def get_transaction_date_ranges(names) -> dict[str, str]:
    """Bank Statement Import has no transaction-date field of its own (see
    bank_statement_import.json - nothing dated except `creation`, the
    import record's own timestamp, not the statement's). The only place a
    transaction date exists is inside the file itself, in the cleaned
    "Tanggal Transaksi" column (same for every bank, both converge on
    CLEANED_HEADER) - read once per name here and batched from the list
    view's JS instead of one call per row."""
    if isinstance(names, str):
        names = frappe.parse_json(names)

    result: dict[str, str] = {}
    for name in names:
        file_url = frappe.db.get_value("Bank Statement Import", name, "import_file")
        result[name] = _read_transaction_date_range(file_url)
    return result


def _read_transaction_date_range(file_url: str | None) -> str:
    if not file_url:
        return ""
    try:
        file_doc = frappe.get_doc("File", {"file_url": file_url})
    except frappe.DoesNotExistError:
        return ""

    try:
        with open(file_doc.get_full_path(), "r", encoding="utf-8", errors="replace") as f:
            rows = list(csv.reader(f))
    except OSError:
        return ""

    if not rows or [c.strip() for c in rows[0]] != CLEANED_HEADER:
        return ""

    dates = sorted({row[0].strip() for row in rows[1:] if row and row[0].strip()})
    if not dates:
        return ""
    if dates[0] == dates[-1]:
        return dates[0]
    return f"{dates[0]} s/d {dates[-1]}"


def get_imported_rows(bank_statement_import_name: str) -> list[dict]:
    """The rows this document actually imported, read straight from its own
    cleaned file - same file _read_transaction_date_range/get_cleaned_
    preview_page above already read. Used by the print format (garage.
    utils.jinja.get_bank_statement_import_print_context) instead of
    querying Bank Transaction, since that doctype has no field linking a
    row back to which import created it - the cleaned file is the only
    reliable record of "what this specific document imported", row for
    row, in CLEANED_HEADER order (date, description, deposit, withdrawal,
    bank_account, balance)."""
    file_url = frappe.db.get_value("Bank Statement Import", bank_statement_import_name, "import_file")
    if not file_url:
        return []

    try:
        file_doc = frappe.get_doc("File", {"file_url": file_url})
    except frappe.DoesNotExistError:
        return []

    try:
        with open(file_doc.get_full_path(), "r", encoding="utf-8", errors="replace") as f:
            rows = list(csv.reader(f))
    except OSError:
        return []

    if not rows or [c.strip() for c in rows[0]] != CLEANED_HEADER:
        return []

    return [
        {
            "date": row[0].strip(),
            "description": row[1].strip(),
            "deposit": row[2].strip(),
            "withdrawal": row[3].strip(),
            "balance": row[5].strip(),
        }
        for row in rows[1:] if row
    ]


# Core's own Preview section (import_preview.js) is hard-capped at 10 rows
# server-side (frappe/core/doctype/data_import/importer.py -
# MAX_ROWS_IN_PREVIEW = 10, out.data = out.data[:MAX_ROWS_IN_PREVIEW]) -
# the extra rows are never even sent to the browser, so there's no client-
# side "show more" possible against that endpoint at all. Paginating our
# own cleaned file directly instead, independent of that limit.
PREVIEW_PAGE_SIZE = 10


@frappe.whitelist()
def get_cleaned_preview_page(bank_statement_import_name: str, page=1) -> dict:
    page = cint(page) or 1
    empty = {"rows": [], "total": 0, "page": page, "page_size": PREVIEW_PAGE_SIZE}

    file_url = frappe.db.get_value("Bank Statement Import", bank_statement_import_name, "import_file")
    if not file_url:
        return empty

    try:
        file_doc = frappe.get_doc("File", {"file_url": file_url})
    except frappe.DoesNotExistError:
        return empty

    try:
        with open(file_doc.get_full_path(), "r", encoding="utf-8", errors="replace") as f:
            rows = list(csv.reader(f))
    except OSError:
        return empty

    if not rows or [c.strip() for c in rows[0]] != CLEANED_HEADER:
        return empty

    data_rows = rows[1:]
    total = len(data_rows)
    start = (page - 1) * PREVIEW_PAGE_SIZE
    return {
        "rows": data_rows[start : start + PREVIEW_PAGE_SIZE],
        "total": total,
        "page": page,
        "page_size": PREVIEW_PAGE_SIZE,
    }
