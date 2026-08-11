import frappe


def drop_company_suffix_from_name(doc, method=None):
    """doc_event: Item Tax Template.autoname

    ERPNext's own Item Tax Template.autoname() (accounts/doctype/
    item_tax_template/item_tax_template.py) always names the record
    "{title} - {company abbr}" - needed when a site runs multiple
    companies that could otherwise define a same-titled template, but
    this app's site only ever operates as a single company, so every
    template ends up with a redundant, confusing " - <abbr>" suffix
    wherever it's picked from a Link field (e.g. Purchase Order's own
    Tax column dropdown). This hook runs straight after that core
    method (doc_events "autoname" hooks always run after the doctype's
    own autoname() - see Document.hook()'s compose() in frappe/model/
    document.py), so doc.name already holds the company-suffixed value
    here and can simply be overwritten with the bare title.

    Only overwrites when that bare title is actually free - if some
    other template already holds it (a genuine collision, e.g. a second
    company ever gets added to this site later), this leaves ERPNext's
    own company-suffixed name in place rather than erroring or silently
    colliding.
    """
    if not doc.title:
        return

    candidate = doc.title
    existing = frappe.db.exists("Item Tax Template", candidate)
    if existing and existing != doc.name:
        return

    doc.name = candidate
