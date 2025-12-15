from __future__ import annotations

try:
    import frappe
except ModuleNotFoundError:
    frappe = None  # type: ignore[assignment]

__version__ = "0.1.0"


def _patch_errprint() -> None:
    """Wrap ``frappe.errprint`` to ignore BrokenPipeError when available.

    When the HTTP client disconnects while Frappe is logging an error,
    the underlying ``print`` call inside ``frappe.errprint`` may raise
    ``BrokenPipeError``. This wrapper preserves the original behaviour
    while suppressing that specific exception so the application can
    finish handling the request gracefully.
    """

    if frappe is None:
        return

    if getattr(frappe, "_garage_errprint_patched", False):
        return

    original_errprint = getattr(frappe, "errprint", None)

    def safe_errprint(*args, **kwargs):  # type: ignore[override]
        if original_errprint is None:
            return None

        try:
            return original_errprint(*args, **kwargs)
        except BrokenPipeError:
            frappe.logger().warning(
                "Ignored BrokenPipeError while writing error output; client disconnected.",
            )
            return None

    frappe.errprint = safe_errprint
    frappe._garage_errprint_patched = True


_patch_errprint()
