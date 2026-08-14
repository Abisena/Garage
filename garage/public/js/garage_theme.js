frappe.provide('garage');

// Shared escape hatch for doctypes whose OWNING app registers its own
// list.js TWICE - once auto-detected by Frappe's module-path convention
// (FormMeta.add_code()'s unconditional self._add_code(name + "_list.js")),
// once again via that same app's own doctype_list_js hooks.py entry
// pointing at the identical file. Both copies get concatenated into one
// script and eval'd together in frappe.get_installed_apps() order - if
// garage's own per-doctype extension (Object.assign-based, see e.g.
// expense_request_list.js) runs BEFORE that trailing duplicate in the
// concatenation, the duplicate's plain (non-extending) `frappe.
// listview_settings[doctype] = {...}` silently discards everything
// garage's file just set up, including its `refresh` callback - so the
// card list never renders (confirmed live for Expense Request/Advanced
// Expense Request, both owned by imogi_finance, both registered this
// way).
//
// Patches ListView.prototype.refresh ONCE (guarded, so multiple per-
// doctype list.js files calling this don't each wrap it again) to run
// every registered renderer after Frappe's own native refresh completes,
// keyed by doctype - independent of whichever listview_settings object
// won the eval race, since it only needs the doctype name and this file's
// own render() closure to still exist, both unaffected by that race.
//
// `extraFields` (optional) covers a second, separate fallout of the same
// race: `this.settings = frappe.listview_settings[doctype] || {}` is
// captured ONCE in ListView's constructor (base_list.js), and `set_fields()`
// reads `this.settings.add_fields` from that snapshot to decide what to
// fetch alongside every row - so even with the render patch above forcing
// the card markup to draw, any field this file's card() needs that ISN'T
// also a native in_list_view field (those get fetched unconditionally
// regardless of add_fields) silently comes back undefined, since the
// snapshot `this.settings` took was whichever object won the eval race,
// not this file's own Object.assign'd version (confirmed live for
// Administrative Payment Voucher: Direction/Amount/Status - all
// in_list_view - rendered fine, Posting Date/Party - not in_list_view,
// only ever added via THIS file's own add_fields - stayed blank).
// Patches ListView.prototype.set_fields (also guarded, once) to inject
// every registered doctype's extra fields into `this.settings.add_fields`
// right before the original method reads it, mutating that array in
// place rather than trying to replace `this.settings` itself - which
// works regardless of whose object `this.settings` ended up pointing to.
garage.registerListRenderOverride = function (doctype, renderFn, extraFields) {
  garage.__list_render_overrides = garage.__list_render_overrides || {};
  garage.__list_render_overrides[doctype] = renderFn;

  if (extraFields && extraFields.length) {
    garage.__list_extra_fields = garage.__list_extra_fields || {};
    garage.__list_extra_fields[doctype] = extraFields;
  }

  if (!frappe.views.ListView.prototype.__grs_refresh_patched) {
    frappe.views.ListView.prototype.__grs_refresh_patched = true;

    const original_refresh = frappe.views.ListView.prototype.refresh;
    frappe.views.ListView.prototype.refresh = function (...args) {
      const result = original_refresh.apply(this, args);
      const fn = garage.__list_render_overrides[this.doctype];
      if (fn) {
        if (result && typeof result.then === 'function') {
          result.then(() => fn(this));
        } else {
          fn(this);
        }
      }
      return result;
    };
  }

  if (!frappe.views.ListView.prototype.__grs_set_fields_patched) {
    frappe.views.ListView.prototype.__grs_set_fields_patched = true;

    const original_set_fields = frappe.views.ListView.prototype.set_fields;
    frappe.views.ListView.prototype.set_fields = function (...args) {
      const extra = (garage.__list_extra_fields || {})[this.doctype];
      if (extra && extra.length) {
        this.settings = this.settings || {};
        const current = this.settings.add_fields || [];
        this.settings.add_fields = Array.from(new Set([...current, ...extra]));
      }
      return original_set_fields.apply(this, args);
    };
  }
};

// Indonesian license plates are [huruf wilayah][angka][huruf seri], e.g.
// "B 1234 XYZ" or "BK 5678 AB" - auto-insert the spaces between those three
// groups as the user types, rather than making them type the spaces
// themselves. Permissive on purpose (no length caps / format validation):
// region codes are usually 1-2 letters but a few Java codes (AA, AB, AD, AE,
// AG) are 2 letters too, so this only handles spacing, not correctness.
//
// Lives here (not Garage Vehicle's own doctype_js) because it also has to
// run inside the Quick Entry dialog opened from *other* forms (e.g. Garage
// Service Order's "No. Polisi" field -> "+ Create New"), and Garage
// Vehicle's doctype_js only loads when Garage Vehicle's own form is open,
// not just because another form references it through a Link field.
const GARAGE_LICENSE_PLATE_GROUPS = /^([A-Z]*)([0-9]*)([A-Z]*)$/;

garage.formatLicensePlateInput = function (raw) {
  const clean = (raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const match = clean.match(GARAGE_LICENSE_PLATE_GROUPS);
  if (!match) return clean;
  return [match[1], match[2], match[3]].filter(Boolean).join(' ');
};

garage.attachLicensePlateAutoFormat = function (control) {
  const inputEl = control && control.$input && control.$input.get(0);
  if (!inputEl || inputEl.__garagePlateFormatterAttached) return;
  inputEl.__garagePlateFormatterAttached = true;

  // Capture phase, so this runs and reformats *before* Frappe's own
  // (bubble-phase) input listener reads the value - otherwise Frappe's
  // control would capture the raw unspaced text instead of the formatted one.
  inputEl.addEventListener(
    'input',
    (e) => {
      const input = e.target;
      const cursorPos = input.selectionStart;
      const rawBeforeCursor = input.value
        .slice(0, cursorPos)
        .replace(/[^A-Za-z0-9]/g, '').length;

      const formatted = garage.formatLicensePlateInput(input.value);
      if (formatted === input.value) return;
      input.value = formatted;

      let seen = 0;
      let pos = formatted.length;
      for (let i = 0; i < formatted.length; i++) {
        if (/[A-Za-z0-9]/.test(formatted[i])) seen++;
        if (seen === rawBeforeCursor) {
          pos = i + 1;
          break;
        }
      }
      input.setSelectionRange(pos, pos);
    },
    true,
  );
};

// Quick Entry dialog customization hook (frappe.ui.form.{Doctype}QuickEntryForm
// is core's documented mechanism for this - see
// frappe/public/js/frappe/form/quick_entry.js make_quick_entry()).
// Widens Garage Vehicle's own quick-entry dialog (called from
// GarageVehicleQuickEntryForm below) instead of popping up at the cramped
// default width.
//
// Widening alone isn't enough for one-line labels: labels and inputs share
// a fixed-width row (`.frappe-control[data-fieldtype] .form-group .clearfix`
// is the label column, sized 160px app-wide), so if only *some* fields' label
// columns are widened to fit their text, the widened rows' inputs end up
// visibly narrower than the rest - which is what made the first version of
// this look "not proper". Widening every field's label column by the same
// amount, uniformly, keeps every input in the dialog the same width as each
// other.
garage.widenQuickEntryDialog = function (dialog) {
  dialog.$wrapper.find('.modal-dialog').addClass('garage-quick-entry-wide');
};

// Core's QuickEntryForm renders `this.mandatory` as a flat single column
// (Column Break docfields are never reqd, so the filter in
// frappe/public/js/frappe/form/quick_entry.js set_meta_and_mandatory_fields()
// drops them along with every other layout-only field). Splits a mandatory
// field list into two columns by inserting a plain Column Break docfield
// right after `splitAfterField`, which frappe.ui.Dialog renders correctly
// even though it didn't come from the doctype's own field list.
garage.splitIntoTwoColumns = function (mandatory, splitAfterField) {
  const splitIndex = mandatory.findIndex((df) => df.fieldname === splitAfterField);
  if (splitIndex === -1) return mandatory;
  return [
    ...mandatory.slice(0, splitIndex + 1),
    { fieldtype: 'Column Break' },
    ...mandatory.slice(splitIndex + 1),
  ];
};

if (frappe.ui.form.QuickEntryForm && !frappe.ui.form.GarageVehicleQuickEntryForm) {
  frappe.ui.form.GarageVehicleQuickEntryForm = class GarageVehicleQuickEntryForm extends (
    frappe.ui.form.QuickEntryForm
  ) {
    is_quick_entry() {
      // Only pop the small dialog when triggered from another form's Link
      // field (e.g. Service Order's "No. Polisi" -> "+ Create New" - see
      // frappe/public/js/frappe/form/controls/link.js new_doc(), which sets
      // frappe._from_link right before opening this). That's the
      // stay-in-context case quick_entry=1 was turned on for. Direct
      // creation - the List View's "+ Add Garage Vehicle", or navigating to
      // the /new route straight - goes through frappe.new_doc() instead,
      // which never sets frappe._from_link, so this falls through to the
      // full form: a real new vehicle record needs more than the 4
      // mandatory-field dialog (type, color, transmission, fuel, mileage...).
      if (!frappe._from_link) return false;
      return super.is_quick_entry();
    }

    set_meta_and_mandatory_fields() {
      super.set_meta_and_mandatory_fields();
      // 12 fields are mandatory now (see garage_vehicle.json), so split
      // after the 6th to keep both columns even.
      this.mandatory = garage.splitIntoTwoColumns(this.mandatory, 'model');

      // Vehicle ownership is a one-time assignment - lock "No. Customer"
      // the moment it's set, even before the dialog is saved, same as the
      // full form (garage_vehicle.js lockCustomerIfSet) and backed up
      // server-side (garage_vehicle.py _lock_customer()). `onchange` has to
      // be set on the docfield *before* frappe.ui.Dialog builds the control
      // from it - it's what base_control.js's set() calls after any
      // successful value assignment, including the nested "+ Create New
      // Garage Customer" flow (that resolves through dialog.set_value() too,
      // see the update_calling_link patch below).
      const customerField = this.mandatory.find((df) => df.fieldname === 'customer');
      if (customerField) {
        customerField.onchange = function () {
          if (this.value) {
            this.df.read_only = 1;
            this.refresh();
          }
        };
      }

      // Same Brand -> Model relationship as the full form
      // (garage_vehicle.js: setup()'s frm.set_query('model', ...) plus the
      // brand(frm) handler that clears a stale Model) - doesn't apply here
      // on its own, since doctype_js only loads for Garage Vehicle's own
      // routed Form, never for this Quick Entry Dialog (see that file's own
      // top-of-file comment on exactly this limitation). Re-implemented
      // here so Model's search box stays scoped to whichever Brand is
      // already picked, instead of listing every model from every brand.
      const modelField = this.mandatory.find((df) => df.fieldname === 'model');
      if (modelField) {
        modelField.get_query = () => {
          const brand = this.dialog && this.dialog.get_value('brand');
          return { filters: brand ? { brand } : {} };
        };
      }

      const brandField = this.mandatory.find((df) => df.fieldname === 'brand');
      if (brandField) {
        brandField.onchange = function () {
          const dialog = window.cur_dialog;
          if (dialog && dialog.get_value('model')) {
            dialog.set_value('model', null);
          }
        };
      }
    }

    render_edit_in_full_page_link() {
      // Hide the "Edit Full Form" escape hatch - with every field on the
      // full form now mandatory (see garage_vehicle.json) and mirrored into
      // this dialog already, there's nothing left to gain by bouncing out
      // to the full page, and doing so would re-introduce the original
      // problem this whole quick_entry setup exists to avoid: losing the
      // in-progress Service Order underneath.
    }

    render_dialog() {
      super.render_dialog();
      garage.widenQuickEntryDialog(this.dialog);

      const control = this.dialog.fields_dict.license_plate;
      garage.attachLicensePlateAutoFormat(control);

      // The dialog can open pre-filled with whatever the user already typed
      // into the Vehicle Link field's search box before clicking "+ Create
      // New" (frappe/public/js/frappe/model/get_new_doc() copies
      // route_options.name_field straight into the autoname field). That
      // initial value is set programmatically, not typed, so it never fires
      // the 'input' event the live formatter listens for - reformat it once
      // here, through the dialog's own set_value() (not a raw DOM write) so
      // the control's internal value/doc stay in sync too.
      const current = control && control.get_value();
      const formatted = current && garage.formatLicensePlateInput(current);
      if (formatted && formatted !== current) {
        this.dialog.set_value('license_plate', formatted);
      }
    }
  };
}

// GarageCustomerQuickEntryForm used to live here - the same nested-dialog
// treatment as GarageVehicleQuickEntryForm above, for the "New Garage
// Customer" popup opened from Vehicle's "No. Customer" field. Removed along
// with the Garage Customer doctype itself (consolidated onto ERPNext's own
// Customer - see the customer-master migration this was built alongside).
// NOT replaced with an equivalent mandatory-field-heavy override: Customer's
// own quick-entry dialog is reached from many more places than just
// Vehicle's link field (Sales Order, Sales Invoice, Payment Entry, ...), so
// forcing every one of Garage Customer's old mandatory fields into it here
// would have made Customer creation heavier everywhere in the app, not just
// from Vehicle.
//
// CustomerQuickEntryForm below is a much narrower override, added later:
// forces every "Create New Customer" flow straight to the full form,
// never the compact quick-entry dialog - explicit user request, covering
// both the List View's own "+ Add Customer" button AND "+ Create New"
// triggered from any other form's own Customer link field (Sales Order's
// "Customer", etc.).
//
// One carve-out, added after the fact: when the calling Link field lives
// inside another *Dialog* rather than a routed Form - e.g. "No. Customer"
// on Garage Vehicle's own New quick-entry (itself opened from Service
// Order's vehicle field, see GarageVehicleQuickEntryForm above) - forcing
// the full form breaks the round trip back to the caller entirely, not
// just makes it heavier:
//   1. Going full-form is a real route change (quick_entry.js's own
//      fallback: `frappe.set_route("Form", doctype, doc.name)`).
//   2. Every route change runs frappe.router.js's set_history(), which
//      unconditionally calls frappe.ui.hide_open_dialog() - hiding
//      whatever dialog is currently open, including the parent Vehicle
//      quick-entry dialog the user was still filling in.
//   3. Core's update_calling_link() (frappe/public/js/frappe/form/save.js)
//      only knows how to navigate back to a *Form*
//      (`if (frappe._from_link.frm) frappe.set_route(...)`). The Customer
//      field's calling control lives in a Dialog, so `.frm` is undefined -
//      that branch never fires, and with the parent dialog already gone
//      (step 2) there's nothing left to return to. Net effect: after
//      saving the new Customer, the screen just sits on Customer's own
//      page instead of bouncing back to New Garage Vehicle.
// Falling back to the quick-entry dialog in this one case keeps both
// dialogs stacked instead of routing away, which is exactly what the
// patched_update_calling_link fix below already knows how to resolve
// (it restores the value onto window.cur_dialog, the live parent dialog).
// Every other "+ Create New Customer" trigger - a Link field on a real
// Form, or the List View's own button - still forces the full form,
// per the original request this override exists for.
if (frappe.ui.form.CustomerQuickEntryForm && !frappe.ui.form.CustomerQuickEntryForm.__garage_patched) {
  // ERPNext's own customer_quick_entry.js just aliases this to
  // frappe.ui.form.ContactAddressQuickEntryForm (the same base class
  // Supplier/Lead/etc.'s own dialogs use) - not a distinct class - so the
  // usual "only define if missing" guard (see GarageVehicleQuickEntryForm
  // above) doesn't apply here; it's always already set by the time this
  // runs (erpnext loads before garage). Extending whatever it currently
  // points to and reassigning is what actually overrides it, since
  // frappe.ui.form.make_quick_entry() (frappe/public/js/frappe/form/
  // quick_entry.js) looks this property up by name at the moment the user
  // clicks "Add Customer"/"+ Create New", not at page-load time.
  const BaseCustomerQuickEntryForm = frappe.ui.form.CustomerQuickEntryForm;
  frappe.ui.form.CustomerQuickEntryForm = class CustomerQuickEntryForm extends (
    BaseCustomerQuickEntryForm
  ) {
    is_quick_entry() {
      if (frappe._from_link && !frappe._from_link.frm) {
        return super.is_quick_entry();
      }
      return false;
    }

    // ContactAddressQuickEntryForm (the class this one extends -
    // erpnext/public/js/utils/contact_address_quick_entry.js) always
    // concatenates its own "Primary Contact/Address Details" fields onto
    // the dialog: city/state/country/pincode/email_address/mobile_number,
    // meant to create a separate linked Contact + Address behind the
    // scenes. Those collide fieldname-for-fieldname with this app's own
    // city/state/country (garage_profile_section's Select fields, already
    // in `mandatory` via allow_in_quick_entry - see
    // add_customer_profile_fields.py) and would render twice. Returning no
    // variant fields keeps the dialog to Customer's own real fields only,
    // which sync_primary_address (garage/utils/customer_hooks.py) already
    // turns into a proper Address on save - the variant fields' Contact/
    // Address creation would just be a second, disconnected copy of that.
    get_variant_fields() {
      return [];
    }

    // The base insert() renames map_to_first_name/map_to_last_name/
    // email_address/mobile_number (the variant fields above) onto
    // first_name/last_name/email_id/mobile_no before saving - needed there
    // because core Customer defines email_id/mobile_no as read-only, so a
    // field named exactly that would render disabled. This app's own
    // mobile_no/email_id Property Setters (reorder_customer_form_layout.py)
    // already switch them to a plain editable "Data" fieldtype, so they're
    // filled in directly under their real names - nothing left to rename,
    // and with get_variant_fields() empty above there's nothing at
    // map_to_first_name etc. to rename FROM. Skip straight to
    // QuickEntryForm's own insert().
    insert() {
      return frappe.ui.form.QuickEntryForm.prototype.insert.call(this);
    }

    set_meta_and_mandatory_fields() {
      super.set_meta_and_mandatory_fields();
      // Same two-column treatment as GarageVehicleQuickEntryForm above -
      // splits after address_line2 so the left column ends up
      // name/number/city/province/country/id/postal/address (matching the
      // reference layout's left side) and everything from
      // preferred_contact_method onward flows into the right column.
      this.mandatory = garage.splitIntoTwoColumns(this.mandatory, 'address_line2');
    }

    render_dialog() {
      super.render_dialog();
      garage.widenQuickEntryDialog(this.dialog);
    }
  };
  frappe.ui.form.CustomerQuickEntryForm.__garage_patched = true;
}

// Fix a Frappe core bug that breaks nested "+ Create New" chains inside a
// Quick Entry dialog (e.g. Service Order -> new Vehicle quick-entry -> new
// Customer quick-entry nested inside it). When the nested dialog resolves,
// core's frappe.ui.form.update_calling_link() (frappe/public/js/frappe/form/save.js)
// writes the new link value onto `frappe._from_link`, a *deep clone* of the
// calling Link control taken when "+ Create New" was clicked
// (frappe/public/js/frappe/form/controls/link.js new_doc()). For a field
// living on a Form that clone's set_value() still reaches the real doc via
// frappe.model.set_value(), so it's harmless there - but for a field living
// inside a Dialog (no `.frm`), set_model_value() falls back to writing
// straight onto the clone's own `this.doc`/`this.value`, which are separate
// objects from the live dialog's. Only the shared $input DOM node gets
// updated, so the field *looks* filled - until Dialog.get_values()
// (frappe/public/js/frappe/ui/field_group.js) does its mandatory-field pass,
// sees the live control's `.value` is still empty, calls refresh_input() on
// it, and wipes the input back to blank. Net effect: the "No. Customer"
// field shows a value right after the nested customer is created, then
// silently reports "missing" the moment you click Save on the vehicle
// dialog. Work around it by routing dialog-context updates through the
// *live* dialog (window.cur_dialog, which frappe/public/js/frappe/ui/dialog.js
// already restacks to the parent dialog the instant the nested one hides -
// before update_calling_link runs) and its own set_value(), which updates
// the real control instead of the clone.
if (frappe.ui.form && frappe.ui.form.update_calling_link && !frappe.ui.form.update_calling_link.__garage_nested_quick_entry_patched) {
  const original_update_calling_link = frappe.ui.form.update_calling_link;
  const patched_update_calling_link = function (newdoc) {
    const from_link = frappe._from_link;
    const dialog = window.cur_dialog;

    if (
      from_link &&
      !from_link.frm &&
      from_link.df &&
      from_link.df.fieldtype === 'Link' &&
      from_link.df.options === newdoc.doctype &&
      dialog &&
      dialog.fields_dict &&
      dialog.fields_dict[from_link.df.fieldname]
    ) {
      dialog.set_value(from_link.df.fieldname, newdoc.name);
      // Core's own update_calling_link() always clears this at the end (it's
      // a one-shot global) - do the same here. Otherwise it dangles pointing
      // at *this* nested field's clone, so the next level up in a nested
      // chain (e.g. the vehicle dialog's own "+ Create New" callback firing
      // after *it* saves) finds a stale, mismatched frappe._from_link,
      // silently fails its doctype check, and never propagates the value
      // back to the form that started the chain.
      frappe._from_link = null;
      return;
    }

    return original_update_calling_link(newdoc);
  };
  patched_update_calling_link.__garage_nested_quick_entry_patched = true;
  frappe.ui.form.update_calling_link = patched_update_calling_link;
}

// Collapse the form sidebar (tags/attachments/assign panel behind the ☰ toggle)
// by default whenever a doctype form is freshly opened. Users can still expand
// it manually for the document they're viewing - that choice is respected
// across re-refreshes of the SAME document (save, field triggers, etc. all
// call refresh() again) by keying the "already applied" flag off docname, not
// just off the page instance. Frappe reuses one Form/Page instance across every
// document of a doctype, so keying off the page instance alone (as an earlier
// version of this patch did) only auto-collapsed the very first document ever
// opened in a session - navigating to a second document left whatever sidebar
// state the first one ended up in, which is the opposite of "opening any
// document" should default to more screen room.
if (frappe.ui.form && frappe.ui.form.Form && !frappe.ui.form.Form.prototype.__garage_sidebar_patched) {
  frappe.ui.form.Form.prototype.__garage_sidebar_patched = true;
  const original_refresh = frappe.ui.form.Form.prototype.refresh;
  frappe.ui.form.Form.prototype.refresh = function () {
    const result = original_refresh.apply(this, arguments);
    if (this.page && this.page.__garage_sidebar_default_applied_docname !== this.docname) {
      this.page.__garage_sidebar_default_applied_docname = this.docname;
      const $sidebar = this.page.wrapper.find('.layout-side-section');
      if ($sidebar.length) {
        // Don't gate on `:visible` here: at this point in the render the page
        // container itself may not be attached/shown yet, so jQuery reports the
        // sidebar as not visible even though it will be once the route settles.
        $sidebar.hide();
        this.page.update_sidebar_icon && this.page.update_sidebar_icon();
      }
    }
    return result;
  };
}

// Same idea for List View's own sidebar (Filter By / Assigned To / Tags panel):
// collapse it by default the first time a list is opened.
//
// Tried hooking the documented `list_sidebar_setup` event first, but Frappe
// fires it *before* `cur_list` is assigned (list_factory.js constructs the
// ListView, which builds the sidebar synchronously, and only afterwards calls
// set_cur_list()) - so `cur_list` read inside the handler was always null on a
// list's first-ever load. Patching ListSidebar.make() directly sidesteps that
// ordering issue since `this.page` is available immediately.
if (frappe.views.ListSidebar && !frappe.views.ListSidebar.prototype.__garage_sidebar_patched) {
  frappe.views.ListSidebar.prototype.__garage_sidebar_patched = true;
  const original_make = frappe.views.ListSidebar.prototype.make;
  frappe.views.ListSidebar.prototype.make = function () {
    const result = original_make.apply(this, arguments);
    const page = this.page;
    if (page && !page.__garage_sidebar_default_applied) {
      page.__garage_sidebar_default_applied = true;
      const $sidebar = page.wrapper.find('.layout-side-section');
      if ($sidebar.length) {
        $sidebar.hide();
        page.update_sidebar_icon && page.update_sidebar_icon();
      }
    }
    return result;
  };
}

// Same idea again for the Print View's own sidebar (Print Format/Language/
// Letter Head selectors) - it's the exact same `.layout-side-section` DOM
// element the Form/List sidebars use, just populated by
// PrintView.setup_sidebar() instead.
//
// Can't use the Form/List patch pattern here: `frappe.ui.form.PrintView`
// is defined by a page-specific bundle (apps/frappe/frappe/printing/page/
// print/print.js) that Frappe lazy-loads only the first time the user
// navigates to a print route - it doesn't exist yet when garage_theme.js
// runs at page load, so `frappe.ui.form.PrintView.prototype` is undefined
// and the guard silently never fires. `frappe.router`, in contrast, is a
// core object that always exists - listening for route changes and
// checking route[0] === "print" sidesteps the load-order problem entirely.
// Not keyed per-docname like the Form sidebar: PrintView's sidebar DOM is
// built once per session (in its constructor) and reused across every
// print navigation, so re-hiding on every "print" route change (rather
// than gating on "already applied for this doc") is what actually gives
// "collapsed by default every time" - it still doesn't fight a manual
// expand, since nothing re-runs this until the route changes again.
if (frappe.router && !frappe.router.__garage_print_sidebar_patched) {
  frappe.router.__garage_print_sidebar_patched = true;
  frappe.router.on('change', () => {
    const route = frappe.get_route();
    if (!route || route[0] !== 'print') return;
    setTimeout(() => {
      const $sidebar = $('.layout-side-section');
      if (!$sidebar.length) return;
      $sidebar.hide();
      const page = frappe.pages.print && frappe.pages.print.page;
      page && page.update_sidebar_icon && page.update_sidebar_icon();
    }, 300);
  });
}

// "Create > Payment" on a Sales Invoice always builds a brand new mapped
// Payment Entry with no check for one already in progress - clicking it
// twice (e.g. the first draft was never saved/submitted, or the user just
// clicked it again out of uncertainty) silently leaves an orphaned draft
// behind and, if a second one gets submitted, makes it look like the
// invoice was paid twice. Before creating a new one, ask the server for an
// existing unsubmitted Payment Entry against this invoice and open that
// instead. Scoped to Sales Invoice only - other doctypes sharing this
// controller (Purchase Invoice, Sales/Purchase Order) keep default behavior.
if (
  window.erpnext &&
  erpnext.TransactionController &&
  !erpnext.TransactionController.prototype.__garage_payment_dedupe_patched
) {
  erpnext.TransactionController.prototype.__garage_payment_dedupe_patched = true;
  const original_make_mapped_payment_entry =
    erpnext.TransactionController.prototype.make_mapped_payment_entry;
  erpnext.TransactionController.prototype.make_mapped_payment_entry = function (args) {
    if (this.frm.doctype !== 'Sales Invoice') {
      return original_make_mapped_payment_entry.call(this, args);
    }
    const me = this;
    const proceed = () => frappe.call({
      method: 'garage.utils.payment_hooks.get_draft_payment_entry_for_reference',
      args: { reference_doctype: me.frm.doctype, reference_name: me.frm.docname },
    }).then((r) => {
      const existing = r.message;
      if (existing) {
        frappe.show_alert({
          message: __('Sudah ada draft Payment Entry ({0}) untuk invoice ini - membuka yang itu, bukan bikin baru.', [existing]),
          indicator: 'orange',
        });
        frappe.set_route('Form', 'Payment Entry', existing);
        return;
      }
      return original_make_mapped_payment_entry.call(me, args);
    });

    if (!this.frm.doc.service_order) {
      return proceed();
    }

    // Payment can't be taken until the customer's Nota Service has actually
    // been printed at least once - nota_service_printed is only ever set by
    // get_nota_service_context() (garage/utils/jinja.py) the first time that
    // print format is opened for this invoice. Check the DB directly rather
    // than trusting this.frm.doc.nota_service_printed: that field is set as
    // a side effect of a plain print-page navigation, which the in-memory
    // frm.doc doesn't reliably pick up on return, so the cached value can
    // still read blank even right after printing.
    return frappe.db.get_value('Sales Invoice', this.frm.docname, 'nota_service_printed').then((r) => {
      if (!r.message || !r.message.nota_service_printed) {
        const d = frappe.msgprint({
          title: __('Belum Bisa Diproses'),
          message: __('Nota Service untuk invoice ini belum pernah dicetak. Mengarahkan ke halaman cetak Nota Service...'),
          indicator: 'orange',
        });
        // frappe.msg_dialog is a singleton reused by every msgprint() call
        // app-wide - clear custom_onhide as soon as it fires so it can't
        // leak into some unrelated dialog close later.
        d.custom_onhide = () => {
          d.custom_onhide = null;
          const url = `/printview?doctype=${encodeURIComponent('Sales Invoice')}&name=${encodeURIComponent(me.frm.docname)}&format=${encodeURIComponent('Nota Service')}&no_letterhead=0`;
          window.open(url, '_blank');
        };
        return;
      }
      return proceed();
    });
  };
}

// Testing-only "Reset Test Data" button: wipes transactional documents
// (orders, invoices, payments, stock moves) and their GL/stock ledger
// fallout, leaving master data (customers, vehicles, service types,
// bundles, spare parts) untouched. System Manager only, and gated behind
// a confirm dialog since garage.api.dev_tools.reset_test_transactions is
// destructive - see that module for what it actually does.
if (frappe.user.has_role('System Manager') && !$('#garage-reset-test-data-btn').length) {
  const $btn = $(`
    <button id="garage-reset-test-data-btn" title="Hapus semua transaksi test (Sales Invoice, Payment, Stock Entry, Service Order, dst). Master data aman." style="
      position: fixed; bottom: 20px; right: 20px; z-index: 1100;
      background: #dc2626; color: #fff; border: none; border-radius: 999px;
      padding: 10px 18px; font-size: 12px; font-weight: 700;
      box-shadow: 0 4px 12px rgba(220,38,38,0.35); cursor: pointer;
      letter-spacing: 0.02em;
    ">Reset Data Testing</button>
  `).appendTo('body');

  $btn.on('click', () => {
    frappe.confirm(
      `Ini akan <strong>menghapus semua data transaksi</strong> (Sales Invoice, Payment Entry, Stock Entry, Garage Service Order, Repair QC, Spare Part Request) beserta GL Entry & Stock Ledger Entry turunannya.<br><br>` +
      `Master data (Customer, Vehicle, Service Type, Service Bundle, Spare Part) <strong>tidak</strong> akan disentuh.<br><br>` +
      `Tindakan ini <strong>tidak bisa dibatalkan</strong>. Lanjutkan?`,
      () => {
        frappe.dom.freeze('Menghapus data transaksi test...');
        frappe.call({
          method: 'garage.api.dev_tools.reset_test_transactions',
          args: { confirm: 1 },
          callback(r) {
            frappe.dom.unfreeze();
            if (r.message) {
              const lines = Object.entries(r.message)
                .map(([doctype, count]) => `${doctype}: ${count}`)
                .join('<br>');
              frappe.msgprint({
                title: __('Data Testing Direset'),
                indicator: 'green',
                message: lines,
              });
            }
          },
          error() {
            frappe.dom.unfreeze();
          },
        });
      }
    );
  });
}

// Sales Invoice: hide sections not relevant to this app's workflow

// Mirrors the "${totalItems} item" badge garage_service_order.js prepends
// above its required_parts table - moves Total Quantity from its default
// spot below the grid to a small badge above it instead.
const gsiRenderTotalQtyBadge = (frm) => {
  const itemsWrapper = frm.fields_dict.items?.$wrapper;
  if (!itemsWrapper) return;

  itemsWrapper.find('.gsi-total-qty-badge').remove();
  const totalQty = flt(frm.doc.total_qty);
  if (totalQty) {
    itemsWrapper.prepend(
      `<div class="gsi-total-qty-badge" style="display:inline-block;background:var(--g-accent);color:#fff;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;margin-bottom:6px;">Total Qty: ${totalQty}</div>`
    );
  }
};

// Same boxed-summary pattern as garage_service_order.js's Disc/PPN/Grand
// Total footer, extended with the two fields that only exist on Sales
// Invoice (Total Advance, Outstanding Amount) - hence "properly" here means
// a rounded card with 5 rows instead of GSO's flat 3, not a re-design.
const gsiRenderTotalsBox = (frm) => {
  // Anchor to the items grid, not grand_total's own section: once
  // total_taxes_and_charges/grand_total/total_advance/outstanding_amount are
  // all hidden, Frappe collapses the now-empty "Totals" section itself
  // (layout.js hides sections with no visible controls left), which would
  // take a box inserted inside it down too. The items grid always stays
  // visible, so it's a stable place to hang the box off instead.
  const itemsWrapper = frm.fields_dict.items?.$wrapper;
  if (!itemsWrapper) return;

  $(frm.wrapper).find('.gsi-totals-box').remove();

  const fmt = (v) => frappe.format(flt(v, 2), { fieldtype: 'Currency' });

  let totalDiscount = 0;
  (frm.doc.items || []).forEach((row) => {
    const priceListRate = flt(row.price_list_rate);
    const rate = flt(row.rate);
    const qty = flt(row.qty);
    if (priceListRate) {
      totalDiscount += (priceListRate - rate) * qty;
    }
  });
  // rate/amount are stored pre-tax (see portal.py's _apply_ppn_pricing,
  // which adds PPN as its own Sales Taxes and Charges line rather than
  // baking it into rate/amount) - total_taxes_and_charges is already the
  // real, per-line-aware PPN total, no need to re-derive it from amount.
  const totalPpn = flt(frm.doc.total_taxes_and_charges);

  const summaryRow = (label, value, variant) => {
    const bg = variant === 'grand' ? 'var(--g-accent, #4f46e5)' : '#2c3e50';
    const weight = variant === 'grand' ? '700' : '600';
    // flex:0 0 auto + min-width:0 on the label lets long labels ("Total
    // Taxes and Charges (PPN)") wrap onto a second line within the box
    // instead of forcing the row wider than the box and clipping the value.
    return `
      <div style="display:flex; align-items:center; background:${bg}; border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="flex:1 1 0; min-width:0; padding:8px 10px; text-align:left; font-weight:${weight}; color:#fff;">${label}</div>
        <div style="flex:0 0 auto; padding:8px 10px; text-align:right; font-weight:${weight}; white-space:nowrap; color:#fff;">${value}</div>
      </div>`;
  };

  const $box = $(`
    <div class="gsi-totals-box" style="display:flex; justify-content:flex-end; margin:8px 0;">
      <div style="width:340px; border-radius:var(--g-radius-sm, 8px); overflow:hidden; box-shadow:var(--g-shadow, 0 1px 3px rgba(0,0,0,0.15));">
        ${summaryRow('Total Diskon', fmt(totalDiscount))}
        ${summaryRow('Total Taxes and Charges (PPN)', fmt(totalPpn))}
        ${summaryRow('Grand Total', fmt(frm.doc.grand_total), 'grand')}
        ${summaryRow('Total Advance', fmt(frm.doc.total_advance))}
        ${summaryRow('Outstanding Amount', fmt(frm.doc.outstanding_amount))}
      </div>
    </div>
  `);

  itemsWrapper.closest('.form-group, .frappe-control').after($box);
};

frappe.ui.form.on('Sales Invoice', {
  refresh(frm) {
    frm.set_df_property('currency_and_price_list', 'hidden', 1);
    frm.set_df_property('accounting_dimensions_section', 'hidden', 1);
    frm.set_df_property('is_pos', 'hidden', 1);
    frm.set_df_property('is_return', 'hidden', 1);
    frm.set_df_property('is_debit_note', 'hidden', 1);
    frm.set_df_property('update_stock', 'hidden', 1);

    // Totals: rounding is applied automatically, no need to expose the
    // knobs - IDR has no cents, so Rounded Total is redundant with Grand
    // Total anyway. Keep Grand Total, Total Advance, Outstanding Amount.
    frm.set_df_property('rounding_adjustment', 'hidden', 1);
    frm.set_df_property('rounded_total', 'hidden', 1);
    frm.set_df_property('disable_rounded_total', 'hidden', 1);
    frm.set_df_property('total_qty', 'hidden', 1);
    frm.set_df_property('total', 'hidden', 1); // "Total (IDR)" - redundant with Grand Total when no taxes/discount apply
    frm.set_df_property('section_break_49', 'hidden', 1); // "Additional Discount" section
    gsiRenderTotalQtyBadge(frm);

    // "Download"/"Upload" grid footer buttons (bulk CSV edit of the items
    // table, from the items field's allow_bulk_edit) aren't a workflow this
    // app uses - hide them rather than expose a raw CSV import for a table
    // whose rows come from Service Order items.
    frm.fields_dict.items?.grid?.wrapper
      ?.find('.grid-download, .grid-upload')
      .addClass('hidden');

    // Deferred: ERPNext's own SalesInvoiceController calls
    // set_dynamic_labels() -> set_currency_labels() -> frm.refresh_fields()
    // as part of its own refresh handling, which re-derives each control's
    // hidden state from a fresh docfield lookup and silently un-hides
    // total_taxes_and_charges/grand_total/total_advance/outstanding_amount
    // if that runs after ours.
    setTimeout(() => {
      // Grand Total / Total Taxes and Charges / Total Advance / Outstanding
      // Amount are replaced by the single gsi-totals-box card below (built
      // alongside Total Diskon, which has no field of its own) - hide the
      // scattered originals instead of showing both.
      frm.set_df_property('total_taxes_and_charges', 'hidden', 1);
      frm.set_df_property('grand_total', 'hidden', 1);
      frm.set_df_property('total_advance', 'hidden', 1);
      frm.set_df_property('outstanding_amount', 'hidden', 1);
      gsiRenderTotalsBox(frm);
    }, 300);
  },
  total_qty(frm) {
    // Fires whenever ERPNext recalculates the total (e.g. row qty edited),
    // independent of the form's own refresh cycle - keeps the badge in sync.
    gsiRenderTotalQtyBadge(frm);
  },
  grand_total(frm) {
    gsiRenderTotalsBox(frm);
  },
  total_advance(frm) {
    gsiRenderTotalsBox(frm);
  },
  outstanding_amount(frm) {
    gsiRenderTotalsBox(frm);
  },
});

// Payment Entry: today every Payment Entry in this app is a Receive/Customer
// settlement auto-created against a Sales Invoice by the Service Order ->
// Repair QC flow (see repair_qc.py's _create_payment_entry_if_finished) -
// full ERPNext Payment Entry exposes a lot more than that one flow needs
// (multi-currency writeoff, tax withholding, accounting dimensions...).
// Gate the cleanup behind that shape instead of hiding unconditionally, so a
// future Pay/Supplier flow (parts purchasing) or an advance/DP payment isn't
// silently stripped of fields it actually needs.
const gpeIsServiceOrderSettlement = (frm) =>
  frm.doc.payment_type === 'Receive' && frm.doc.party_type === 'Customer';

const gpeApplyFieldVisibility = (frm) => {
  if (!gpeIsServiceOrderSettlement(frm)) return;

  frm.set_df_property('bank_account', 'hidden', 1); // Company Bank Account - garage takes cash/QRIS at the counter, no bank reconciliation
  frm.set_df_property('party_bank_account', 'hidden', 1);
  frm.set_df_property('get_outstanding_orders', 'hidden', 1); // Sales Order flow isn't used here, only Sales Invoice
  frm.set_df_property('get_outstanding_invoices', 'hidden', 1); // Payment References is always pre-filled by the source Sales Invoice, this bulk-fetch dialog is never needed
  frm.set_df_property('section_break_34', 'hidden', 1); // Writeoff - allocated amount already comes fixed from the source Sales Invoice
  // "Taxes and Charges" is actually 3 separate section breaks under one
  // collapsible header (template/withholding, the "taxes" table, and the
  // totals) - all 3 need hiding or the table/totals show up on their own.
  // PPN is baked into the Sales Invoice item rate, not applied again here.
  frm.set_df_property('taxes_and_charges_section', 'hidden', 1);
  frm.set_df_property('section_break_56', 'hidden', 1);
  frm.set_df_property('section_break_60', 'hidden', 1);
  frm.set_df_property('deductions_or_loss_section', 'hidden', 1);
  frm.set_df_property('accounting_dimensions_section', 'hidden', 1);
  frm.set_df_property('subscription_section', 'hidden', 1); // Auto Repeat - not a subscription business
  frm.set_df_property('clearance_date', 'hidden', 1); // bank-clearing field, not used
  frm.set_df_property('paid_to_account_currency', 'hidden', 1); // Account Currency (To) - always IDR, no multi-currency here
  frm.set_df_property('contact_person', 'hidden', 1); // Contact - Party (customer name) already covers this
  frm.set_df_property('contact_email', 'hidden', 1); // Email - not used for anything in this flow
  frm.set_df_property('payment_accounts_section', 'hidden', 1); // Accounts (paid_from/paid_to) - already auto-filled from party + Mode of Payment, no manual override needed
  frm.set_df_property('section_break_12', 'hidden', 1); // More Information - status is already shown as the doc's title badge, remarks/letter head/payment order aren't used here

  // Transaction ID (Cheque/Reference No + Date) - ERPNext makes these
  // mandatory whenever money moves through a Bank-type account (see
  // payment_entry.js's toggle_reqd on account_type == "Bank"), so hiding the
  // section outright needs a fallback value or Wire Transfer payments would
  // fail to submit with "mandatory" errors on a field nobody can see.
  // Default both to the posting date - not a real bank transaction
  // reference, just enough to satisfy the mandatory check.
  frm.set_df_property('transaction_references', 'hidden', 1);
  if (!frm.doc.reference_no) frm.set_value('reference_no', frm.doc.posting_date);
  if (!frm.doc.reference_date) frm.set_value('reference_date', frm.doc.posting_date);

  // "Payment From / To" is generic ERPNext wording for a section that, in
  // this flow, is always money coming IN from a customer - and it duplicated
  // itself (Party + Party Name showing the same "DEWI LESTARI" twice) while
  // giving no clue which Service Order the payment actually belongs to.
  frm.set_df_property('party_type', 'hidden', 1); // always "Customer" under this guard
  frm.set_df_property('party_name', 'hidden', 1); // duplicates the Party field's own label
  // Section.refresh() only toggles collapse state, it never re-renders the
  // header text from df.label (see frappe/public/js/frappe/form/section.js)
  // - the label is a plain text node baked into `.head` at construction
  // time, so it has to be edited directly instead.
  const partySection = frm.fields_dict.party_section;
  if (partySection && partySection.head) {
    partySection.df.label = 'Diterima Dari';
    const textNode = partySection.head
      .contents()
      .filter(function () {
        return this.nodeType === 3;
      })
      .first();
    if (textNode.length) textNode[0].nodeValue = 'Diterima Dari';
  }

  // Move Paid Amount up into "Diterima Dari"'s second column (previously
  // Contact/Email, both hidden above) instead of leaving it alone in its
  // own "Amount" section below - anchor on contact_person's wrapper since
  // column breaks don't get their own frm.fields_dict entry, only fields do.
  const paidAmountField = frm.get_field('paid_amount');
  const contactField = frm.get_field('contact_person');
  if (paidAmountField && contactField) {
    paidAmountField.$wrapper.appendTo(contactField.$wrapper.parent());
    frm.set_df_property('payment_amounts_section', 'hidden', 1); // now empty - Paid Amount moved above
  }

  // Account Paid To ("which bank did the money land in") is the one field
  // out of the whole "Accounts" section that's actually worth seeing - move
  // it next to Mode of Payment instead of un-hiding the entire section
  // (which would also bring back Party Balance, Paid From, account
  // currencies/balances - none of that is relevant with 1 bank account).
  const paidToField = frm.get_field('paid_to');
  const modeOfPaymentField = frm.get_field('mode_of_payment');
  if (paidToField && modeOfPaymentField) {
    paidToField.$wrapper.appendTo(modeOfPaymentField.$wrapper.parent());
  }

  // get_payment_entry() defaults paid_to to the company's default bank/cash
  // account server-side even before Mode of Payment is picked - since that
  // now happens to be the same BCA account we set up, it reads as "the bank
  // is already chosen" when nothing's actually been selected yet.
  if (!frm.doc.mode_of_payment && frm.doc.paid_to) {
    frm.set_value('paid_to', '');
  }

  // "Reference" (the Payment References table showing which Sales Invoice
  // this settles) natively depends_on paid_from && paid_to being set - which
  // now stays blank until Mode of Payment is picked, so the section would
  // stay hidden until then too. The table's own data comes from
  // get_payment_entry() and doesn't actually need paid_to, so drop that
  // gating and let it show from the start.
  frm.set_df_property('section_break_14', 'depends_on', '');
  frm.set_df_property('section_break_14', 'hidden', 0);
};

// Fetches the Sales Invoice this payment settles (via its first Sales
// Invoice reference) and, through that, the Service Order + vehicle it was
// raised for - then shows it as a line under "Diterima Dari" so it's
// obvious at a glance which job this payment belongs to, not just which
// customer.
const gpeRenderSourceInfo = (frm) => {
  const $section = frm.get_field('party')?.$wrapper?.closest('.form-section');
  if (!$section || !$section.length) return;

  $section.find('.gpe-source-info').remove();
  if (!gpeIsServiceOrderSettlement(frm)) return;

  const ref = (frm.doc.references || []).find((r) => r.reference_doctype === 'Sales Invoice');
  if (!ref) return;

  frappe.db.get_value('Sales Invoice', ref.reference_name, 'service_order').then(({ message }) => {
    const serviceOrder = message && message.service_order;
    if (!serviceOrder) return;

    frappe.db.get_value('Garage Service Order', serviceOrder, 'vehicle').then(({ message: gso }) => {
      $section.find('.gpe-source-info').remove();
      const plate = gso && gso.vehicle;
      const plateHtml = plate
        ? ` &middot; No. Polisi <strong>${frappe.utils.escape_html(plate)}</strong>`
        : '';
      $section.prepend(`
        <div class="gpe-source-info" style="
          background: var(--g-accent, #4f46e5); color: #fff;
          padding: 6px 12px; border-radius: var(--g-radius-sm, 8px);
          font-size: 12px; font-weight: 600; margin-bottom: 12px;
        ">
          Untuk Service Order
          <a href="/app/garage-service-order/${encodeURIComponent(serviceOrder)}" target="_blank" style="color: #fff; text-decoration: underline;">${frappe.utils.escape_html(serviceOrder)}</a>${plateHtml}
        </div>
      `);
    });
  });
};

// Paying a Supplier's Purchase Invoice (via the "Referensi Purchase Invoice"
// field) has the same "everything's already fixed by the source document"
// shape as the Service Order settlement flow above - Party Type is always
// Supplier, Contact/Bank Account details are noise, and the Accounts
// section's balance readouts don't help a cashier who isn't reconciling
// anything. Account Paid From stays in "Accounts" (which account the money
// leaves from), Account Paid To gets moved up next to Mode of Payment
// (confirmation it's landing in Creditors) - mirroring the Receive flow's
// own layout below.
const gpeIsSupplierPayment = (frm) =>
  frm.doc.payment_type === 'Pay' && frm.doc.party_type === 'Supplier';

const gpeApplySupplierPaymentVisibility = (frm) => {
  if (!gpeIsSupplierPayment(frm)) return;

  frm.set_df_property('party_type', 'hidden', 1); // always "Supplier" under this guard
  frm.set_df_property('contact_person', 'hidden', 1);
  frm.set_df_property('contact_email', 'hidden', 1);
  frm.set_df_property('bank_account', 'hidden', 1); // Company Bank Account - no bank reconciliation done here
  frm.set_df_property('party_bank_account', 'hidden', 1);
  frm.set_df_property('party_balance', 'hidden', 1);
  frm.set_df_property('paid_from_account_balance', 'hidden', 1);
  frm.set_df_property('paid_to_account_balance', 'hidden', 1);

  // Same reasoning as the Receive/Customer flow above: References is
  // always filled by "Referensi Purchase Invoice" (or picked by hand in
  // the table directly), so the bulk-fetch dialogs are just clutter, and
  // Writeoff/Deductions/More Information don't apply when the allocated
  // amount already comes fixed from the source invoice.
  frm.set_df_property('get_outstanding_invoices', 'hidden', 1);
  frm.set_df_property('get_outstanding_orders', 'hidden', 1);
  frm.set_df_property('section_break_34', 'hidden', 1); // Writeoff
  frm.set_df_property('deductions_or_loss_section', 'hidden', 1);
  frm.set_df_property('subscription_section', 'hidden', 1); // Auto Repeat - not a subscription business
  frm.set_df_property('section_break_12', 'hidden', 1); // More Information - status already shown as the doc's title badge

  // Transaction ID (Cheque/Reference No + Date) is mandatory for any
  // Bank-type account (see payment_entry.js's own toggle_reqd), so hiding
  // it outright needs the same fallback the Receive flow uses - default
  // both to the posting date, just enough to satisfy the mandatory check.
  frm.set_df_property('transaction_references', 'hidden', 1);
  if (!frm.doc.reference_no) frm.set_value('reference_no', frm.doc.posting_date);
  if (!frm.doc.reference_date) frm.set_value('reference_date', frm.doc.posting_date);

  frm.set_df_property('party_name', 'hidden', 1); // duplicates the Party field's own label

  // The same accidental Receive/Customer default described below also
  // means gpeApplyFieldVisibility's own party_section relabel ("Diterima
  // Dari" - Received From) always fires at least once before this
  // function ever gets a chance to run - and since it's a raw DOM text
  // node edit rather than a df property, nothing else corrects it
  // afterward. "Received From" read backwards on an outgoing Supplier
  // payment is genuinely confusing, so stomp it back to something correct
  // every time this runs, the same direct way.
  const paySection = frm.fields_dict.party_section;
  if (paySection && paySection.head) {
    const label = 'Dibayar Kepada';
    paySection.df.label = label;
    const textNode = paySection.head
      .contents()
      .filter(function () {
        return this.nodeType === 3;
      })
      .first();
    if (textNode.length) textNode[0].nodeValue = label;
  }

  // Every brand new Payment Entry briefly starts out as payment_type =
  // "Receive" / party_type = "Customer" (their own doctype defaults)
  // before the user picks anything else, which is exactly the shape
  // gpeIsServiceOrderSettlement() above matches - so gpeApplyFieldVisibility
  // already ran once against that accidental default and hid this whole
  // "Accounts" section (along with Get Outstanding Orders/Invoices,
  // Writeoff, etc.) via a plain hidden=1, with nothing to ever undo it
  // once payment_type changes away from Receive. paid_from/paid_to need to
  // stay visible for a Supplier payment, so force the section back open
  // the same direct way section_break_14 gets un-stuck above.
  frm.set_df_property('payment_accounts_section', 'hidden', 0);

  // Same broken-depends_on situation as section_break_14 in
  // gpeApplyFieldVisibility above (see payment_entry.js's own
  // applyPurchaseInvoiceReference, which forces this section open the same
  // way right after filling it) - repeated here too so it also shows up
  // for anyone who fills References by hand instead of via the "Referensi
  // Purchase Invoice" field.
  const referenceSection = frm.fields_dict.section_break_14;
  if (referenceSection) {
    referenceSection.df.hidden = 0;
    referenceSection.df.hidden_due_to_dependency = false;
    referenceSection.refresh();
  }

  // Whether gpeApplyFieldVisibility's own accidental firing (against the
  // doctype's momentary Receive/Customer default, described above) also
  // happens to move paid_amount/paid_to before this function ever runs
  // depends on exact trigger timing - a blank "New Payment Entry" form
  // hits it, a document mapped straight from a Purchase Invoice's own
  // "Create > Payment" button doesn't, so the two paths ended up with
  // different layouts for the exact same payment_type/party_type. Doing
  // the same two moves here directly (jQuery's appendTo is a no-op if an
  // element's already at its target) makes the result deterministic
  // regardless of how the document got created.
  const paidAmountField = frm.get_field('paid_amount');
  const contactField = frm.get_field('contact_person');
  if (paidAmountField && contactField) {
    paidAmountField.$wrapper.appendTo(contactField.$wrapper.parent());
    frm.set_df_property('payment_amounts_section', 'hidden', 1); // now empty - Paid Amount moved above
  }

  // Account Paid To belongs right next to Account Paid From, balanced side
  // by side in their native two-column "Accounts" layout - not off on its
  // own up in "Type of Payment". gpeApplyFieldVisibility's own accidental
  // firing (see above) can move paid_to away from that native column
  // before this function ever runs, so move it back deliberately rather
  // than assuming it's still there. paid_to_account_type is a plain,
  // always-hidden helper field that was never touched by that other
  // function - anchoring on its wrapper (rather than paid_to's own,
  // useless once it's the thing being moved) reaches its ORIGINAL column
  // regardless of where paid_to currently sits.
  const paidToField = frm.get_field('paid_to');
  const paidToAccountTypeField = frm.get_field('paid_to_account_type');
  if (paidToField && paidToAccountTypeField) {
    paidToField.$wrapper.appendTo(paidToAccountTypeField.$wrapper.parent());
  }

  // "Accounts" is natively collapsible=1 with no collapsible_depends_on,
  // which makes frappe/form/layout.js's own refresh_section_collapse()
  // force it shut on EVERY refresh (it runs unconditionally whenever
  // df.collapsible is true and no mandatory field inside is empty) - a
  // one-off collapse(false) call here just gets overridden the next time
  // that runs. Turning collapsible off entirely stops it from being
  // touched at all, so both Paid From and Paid To just stay visible like
  // any other section.
  const accountsSection = frm.fields_dict.payment_accounts_section;
  if (accountsSection) {
    accountsSection.df.collapsible = 0;
    accountsSection.collapse(false);
  }
};

frappe.ui.form.on('Payment Entry', {
  refresh(frm) {
    gpeApplyFieldVisibility(frm);
    gpeApplySupplierPaymentVisibility(frm);
    gpeRenderSourceInfo(frm);
    // Only Cash and Wire Transfer are valid payment methods for this
    // garage - other Mode of Payment masters (Cheque, Credit Card, Bank
    // Draft) exist in the system but shouldn't be selectable here.
    frm.set_query('mode_of_payment', () => ({
      filters: { name: ['in', ['Cash', 'Wire Transfer']] },
    }));
  },
  on_submit(frm) {
    // After Submit, jump straight to the print-ready view of the receipt
    // (Garage Payment Receipt, already the default print format for this
    // doctype) instead of leaving the cashier on the saved form - this is
    // the KUITANSI PEMBAYARAN the customer needs handed over/printed.
    frm.print_doc();
  },
  party_type(frm) {
    gpeApplyFieldVisibility(frm);
    gpeApplySupplierPaymentVisibility(frm);
  },
  payment_type(frm) {
    gpeApplyFieldVisibility(frm);
    gpeApplySupplierPaymentVisibility(frm);
  },
  mode_of_payment(frm) {
    if (!frm.doc.mode_of_payment && frm.doc.paid_to) frm.set_value('paid_to', '');
  },
});

// Product Bundle customizations
frappe.ui.form.on('Product Bundle', {
  before_load(frm) {
    const grid = frm.fields_dict.items?.grid;
    if (grid) grid.df.in_place_edit = 1;

    const sf = frappe.meta.get_docfield('Product Bundle', 'basic_section');
    if (sf) sf.label = 'Bundle Info';
  },
  refresh(frm) {
    const grid = frm.fields_dict.items?.grid;
    if (grid) grid.df.in_place_edit = 1;

    // Add "Bundle Info" label to top section
    const basicSection = frm.fields_dict.basic_section;
    if (basicSection && !basicSection.df.label) {
      basicSection.df.label = 'Bundle Info';
      basicSection.refresh();
    }

    // Hide About section
    frm.set_df_property('section_break_4', 'hidden', 1);
    frm.set_df_property('about', 'hidden', 1);
  },
});

// Trial Balance report: every Dr/Cr column (Opening Debit/Credit, Debit,
// Credit, Closing Debit/Credit) is hard-coded to width:120 in core
// (erpnext/accounts/report/trial_balance/trial_balance.py get_columns()) -
// too narrow for Rupiah amounts like "Rp 1.896.530,00" (15 chars), which
// render ellipsis-clipped and force a horizontal scrollbar inside the
// report table body. Can't edit that core .py file directly (next
// `bench update`/erpnext pull wipes it) - widen the same columns from the
// client side instead, after render, via frappe-datatable's own column
// resize API. Same two-step technique (datamanager.updateColumn() for the
// First attempt patched widths onto the ALREADY-BUILT DataTable afterward
// (datamanager.updateColumn() + injecting .dt-cell__content--col-N/header-N
// CSS widths directly, the same two-step technique proven for the Bank
// Reconciliation Tool's voucher table in bank_reconciliation_tool.js's
// apply_column_width()). That widened the HEADER correctly but broke the
// BODY: frappe-datatable computes each row's internal column layout once,
// at construction/refresh time, from `this.columns` - poking `column.width`
// afterward doesn't make it recompute that layout, so body cells kept
// clipping/overlapping at their OLD narrow positions even though their own
// `.dt-cell__content` div reported a correct (unused) width. Confirmed live
// via Playwright: cell text was present and correctly colored in the DOM,
// just visually covered by `.datatable`'s own background because an
// ancestor still clipped at the old width.
//
// Fixed the right way instead: mutate `frappe.query_report.columns` (the
// column definitions passed into `new DataTable()`/`datatable.refresh()`)
// BEFORE `render_datatable()` runs, not after. That way the DataTable is
// built from correct widths from the start - no post-hoc patching, no
// stale internal layout, every structure (scrollable width, row rendering)
// computed once with the right numbers.
//
// Reacting via monkey-patching `render_datatable()` itself (rather than
// `frappe.router.on('change', ...)`) is still what's needed regardless of
// which half of the fix this is: a Trial Balance date-range/company filter
// rerun rebuilds the datatable in place via this same method without any
// route change, so a route-change-only listener would miss every rerun
// after the first.
(() => {
  if (!frappe.views || !frappe.views.QueryReport || !frappe.views.QueryReport.prototype) return;
  if (frappe.views.QueryReport.prototype.__garage_trial_balance_patched) return;
  frappe.views.QueryReport.prototype.__garage_trial_balance_patched = true;

  const REPORT_NAME = 'Trial Balance';
  const WIDE_FIELDS = new Set([
    'opening_debit', 'opening_credit',
    'debit', 'credit',
    'closing_debit', 'closing_credit',
  ]);
  const BASE_COLUMN_WIDTH = 160; // fits "Rp 1.896.530.000,00" (19 chars) without clipping - each WIDE_FIELDS column's own floor before ACCOUNT_GIVEAWAY_RATIO tops it up

  // .page-body.container is freed to full width for this one report by the
  // matching CSS rule in garage_desk.css (data-route scoped, same route
  // string checked below) - without also widening columns to use that freed
  // space, the dead gray gap just moves further right instead of
  // disappearing. Account (account names) is the column whose content
  // genuinely varies, so it's the one that absorbs most of whatever's left
  // over - same reasoning as the Bank Reconciliation Tool's voucher table
  // giving its own leftover modal-width to Remaining/Party. Per explicit
  // request, a slice of Account's own share is redistributed BACK out
  // evenly across the 6 Dr/Cr columns on top of their BASE_COLUMN_WIDTH
  // floor, rather than all going to Account - this is a pure reallocation
  // (total table width is unchanged), so it stays exactly as compact as
  // before.
  const ACCOUNT_MIN_WIDTH = 300; // the width this column already had before any of this fix - never shrink below it
  // Requested twice now, each time "take 20% off Account's CURRENT width
  // and give it to the 6 columns" - since uncut_account_width below is
  // always freshly recomputed from the same baseline formula (not from
  // whatever Account happened to render last), two successive 20% cuts
  // compound multiplicatively rather than adding to 40%: retaining 80%
  // twice is 0.8*0.8 = 64% retained, i.e. giving away 1 - 0.64 = 36% total.
  const ACCOUNT_GIVEAWAY_RATIO = 0.36; // 2 rounds of "cut 20% off Account's current width, hand it to the 6 Dr/Cr columns" compounded: 1 - 0.8^2
  // .page-body.container (measured below) isn't quite the datatable's own
  // available width - .report-wrapper/.datatable sit inside it with their
  // own border/padding, ~37px narrower - plus the vertical scrollbar and
  // row borders. 80px covers both, confirmed live (scrollWidth ==
  // clientWidth on the table's own .dt-scrollable, no internal horizontal
  // scroll) rather than guessed.
  const RIGHT_EDGE_BUFFER_PX = 80;

  // Frappe keeps other pages' DOM around (hidden, not removed) for fast
  // back-navigation - caught live going from the Accounting workspace
  // straight into Trial Balance: `document.querySelectorAll('.page-body.
  // container')` found TWO matches, the workspace's own leftover one
  // (width 0, still in the DOM just hidden) AND Trial Balance's real one
  // (width 1889) - `document.querySelector()` (singular) returns whichever
  // comes FIRST in DOM order, which was the wrong, zero-width one here.
  // Account got permanently pinned at its floor width because of it - and
  // the recheck below never caught it either, since comparing a bad 0
  // reading against another bad 0 reading looks like "nothing changed".
  //
  // First attempt used `.closest()` (walk UP for an ancestor) from
  // `qr.page.wrapper`, on the assumption `.page-body.container` wraps it -
  // backwards. Traced the real chain live (`.datatable`'s own parentElement
  // walk-up): `.page-body.container` (`.container.page-body`) sits BELOW
  // `qr.page.wrapper` (`.content.page-container`) in the tree, not above
  // it - `.closest()` can only ever find ancestors, so it silently found
  // nothing every time, on every page, forever. `.querySelector()` (search
  // DOWN for a descendant) is what's actually needed, from that same
  // known-active wrapper element.
  function get_active_page_body_container(qr) {
    const wrapper_el = qr && qr.page && qr.page.wrapper
      ? (qr.page.wrapper.jquery ? qr.page.wrapper[0] : qr.page.wrapper)
      : null;
    return wrapper_el ? wrapper_el.querySelector('.page-body.container') : null;
  }

  function set_trial_balance_column_widths(qr) {
    const columns = qr.columns || [];
    const account_col = columns.find((col) => col.fieldname === 'account');
    const wide_cols = columns.filter((col) => WIDE_FIELDS.has(col.fieldname));
    if (!account_col || !wide_cols.length) return;

    const container = get_active_page_body_container(qr);
    const available = container ? container.clientWidth : 0;
    qr.__grs_tb_last_available = available; // read back by schedule_width_recheck() below

    // What Account would get with none of this column's width given away -
    // the same formula as before this request, kept as the baseline the 20%
    // cut is taken from.
    const base_wide_total = wide_cols.length * BASE_COLUMN_WIDTH;
    const uncut_account_width = available > 0
      ? Math.max(ACCOUNT_MIN_WIDTH, available - base_wide_total - RIGHT_EDGE_BUFFER_PX)
      : ACCOUNT_MIN_WIDTH;

    // Never cut into the floor - on a narrow screen where Account is
    // already pinned at ACCOUNT_MIN_WIDTH, there's nothing to give away.
    const giveaway = Math.max(0, uncut_account_width - ACCOUNT_MIN_WIDTH) * ACCOUNT_GIVEAWAY_RATIO;
    const per_wide_column_share = giveaway / wide_cols.length;

    // RIGHT_EDGE_BUFFER_PX approximates the gap between `.page-body.
    // container` and the datatable's own actually-paintable width (its own
    // border, the vertical scrollbar, ~8 column borders at 1px each) - a
    // fixed guess, close but not exact, so a few px of real horizontal
    // overflow still got through and forced a scrollbar. Subtracting a
    // measured correction (see the recheck below, which is what actually
    // discovers and stores this value) makes this self-correcting instead
    // of needing the guess to be perfect - shrinks Account by whatever
    // overflow was actually measured last time, not a fixed number that
    // has to be hand-tuned again every time something shifts it.
    const correction = qr.__grs_tb_overflow_correction || 0;

    account_col.width = Math.max(ACCOUNT_MIN_WIDTH, uncut_account_width - giveaway - correction);
    wide_cols.forEach((col) => {
      col.width = BASE_COLUMN_WIDTH + per_wide_column_share;
    });
  }

  // General Ledger's own table, requested to match once the filter bar
  // rework above made the two reports' filter areas identical but left the
  // TABLE looking nothing alike: still Bootstrap-narrow (dead space down
  // the right, same bug Trial Balance had before RIGHT_EDGE_BUFFER_PX
  // above), and a genuinely huge horizontal scrollbar (791px of overflow,
  // measured live) - General Ledger has 16 visible columns (Posting Date,
  // Account, Debit/Credit/Balance, Voucher Type/Subtype/No, Against
  // Account, Party Type/Party, Project, Cost Center, Against Voucher
  // Type/Against Voucher, Supplier Invoice No), whose server-set default
  // widths (erpnext/accounts/report/general_ledger.py) already sum to
  // ~1990px - wider than even a full-width page can fit, unlike Trial
  // Balance's clean 6-currency-column layout with one obvious text column
  // to absorb slack. No single column is the "everything else is fixed,
  // this one flexes" candidate here, so this scales EVERY column
  // proportionally to fit instead - each keeps its RELATIVE weight from
  // the server defaults (Account/Voucher No/Voucher Subtype, the widest
  // three, stay the widest three), while Debit/Credit/Balance (Currency
  // columns - the ones that actually clip/wrap badly when squeezed, since
  // Rupiah amounts don't abbreviate) are pinned to a fixed comfortable
  // width first and excluded from the proportional pool entirely.
  const GL_REPORT_NAME = 'General Ledger';
  const GL_CURRENCY_WIDTH = 160; // same figure Trial Balance's own BASE_COLUMN_WIDTH uses - proven live to fit "Rp 1.896.530.000,00" (19 chars) without clipping
  const GL_MIN_COLUMN_WIDTH = 80; // floor for the proportional pool - narrow but every column stays readable, no column vanishes to near-zero
  const GL_SERIAL_COLUMN_WIDTH = 38; // the leading row-number/checkbox column - not part of qr.columns, has to be reserved for separately
  const GL_RIGHT_EDGE_BUFFER_PX = 60; // border/scrollbar/column-border overhead between .page-body.container and what the datatable can actually paint - smaller than Trial Balance's 80 since there's no Account-giveaway math also eating into it here

  function set_general_ledger_column_widths(qr) {
    const columns = (qr.columns || []).filter((col) => !col.hidden);
    if (!columns.length) return;

    const container = get_active_page_body_container(qr);
    const available = container ? container.clientWidth : 0;
    qr.__grs_gl_last_available = available; // read back by schedule_width_recheck() below - separate key from Trial Balance's, same shared qr object

    if (available <= 0) return; // bad/unmeasurable snapshot (see get_active_page_body_container()'s comment) - leave columns at whatever they were, the recheck below will retry and correct once a real measurement lands

    const correction = qr.__grs_gl_overflow_correction || 0;
    const usable = Math.max(0, available - GL_SERIAL_COLUMN_WIDTH - GL_RIGHT_EDGE_BUFFER_PX - correction);

    const currency_cols = columns.filter((col) => col.fieldtype === 'Currency');
    const flex_cols = columns.filter((col) => col.fieldtype !== 'Currency');

    const currency_total = currency_cols.length * GL_CURRENCY_WIDTH;
    const flex_usable = Math.max(0, usable - currency_total);
    const flex_natural_total = flex_cols.reduce((sum, col) => sum + (parseInt(col.width) || 100), 0);
    const scale = flex_natural_total > 0 ? flex_usable / flex_natural_total : 1;

    currency_cols.forEach((col) => {
      col.width = GL_CURRENCY_WIDTH;
    });
    // Tracked so schedule_width_recheck() below can tell "columns already
    // as narrow as they'll go, remaining overflow is just unavoidable
    // horizontal scroll" apart from "still room to shrink further" - see
    // that function's own comment for why the distinction matters.
    let any_clamped = false;
    flex_cols.forEach((col) => {
      const natural = parseInt(col.width) || 100;
      const target = natural * scale;
      if (target < GL_MIN_COLUMN_WIDTH) any_clamped = true;
      col.width = Math.max(GL_MIN_COLUMN_WIDTH, target);
    });
    qr.__grs_gl_floor_pinned = any_clamped;
  }

  // Salary Register - same "many/dynamic columns, several Currency" shape
  // as General Ledger (see that function's own comment), so this reuses
  // the identical proportional-scaling approach rather than inventing a
  // third algorithm: fixed columns (Salary Slip ID/Employee/Employee
  // Name/Branch/Department/Designation/Company/Start Date/End Date/LWP/
  // Absent Days/Payment Days) PLUS a variable number of per-component
  // earning/deduction columns are all Link/Data/Date/Float except the
  // Currency ones (every earning/deduction component column, plus Gross
  // Pay/Total Deduction/Net Pay/Total Loan Repayment) - those get pinned
  // to a fixed comfortable width and excluded from the proportional pool,
  // exactly like General Ledger's Debit/Credit/Balance.
  const SR_REPORT_NAME = 'Salary Register';
  const SR_CURRENCY_WIDTH = 140; // slightly narrower than GL's 160 - Salary Register's amounts run smaller (per-component pay figures, not running ledger balances) and there are often many more currency columns at once, so this leaves more room for the proportional pool before things get cramped
  const SR_MIN_COLUMN_WIDTH = 80;
  const SR_SERIAL_COLUMN_WIDTH = 38;
  const SR_RIGHT_EDGE_BUFFER_PX = 60;

  function set_salary_register_column_widths(qr) {
    const columns = (qr.columns || []).filter((col) => !col.hidden);
    if (!columns.length) return;

    const container = get_active_page_body_container(qr);
    const available = container ? container.clientWidth : 0;
    qr.__grs_sr_last_available = available; // read back by schedule_width_recheck() below - separate key, same shared qr object

    if (available <= 0) return;

    const correction = qr.__grs_sr_overflow_correction || 0;
    const usable = Math.max(0, available - SR_SERIAL_COLUMN_WIDTH - SR_RIGHT_EDGE_BUFFER_PX - correction);

    const currency_cols = columns.filter((col) => col.fieldtype === 'Currency');
    const flex_cols = columns.filter((col) => col.fieldtype !== 'Currency');

    const currency_total = currency_cols.length * SR_CURRENCY_WIDTH;
    const flex_usable = Math.max(0, usable - currency_total);
    const flex_natural_total = flex_cols.reduce((sum, col) => sum + (parseInt(col.width) || 100), 0);
    const scale = flex_natural_total > 0 ? flex_usable / flex_natural_total : 1;

    currency_cols.forEach((col) => {
      col.width = SR_CURRENCY_WIDTH;
    });
    // Tracked so schedule_width_recheck() below can tell "columns already
    // as narrow as they'll go, remaining overflow is just unavoidable
    // horizontal scroll" apart from "still room to shrink further" - see
    // that function's own comment for why the distinction matters. Salary
    // Register hits this far more readily than General Ledger: a company
    // with a dozen+ active salary components (each its own Currency
    // column) simply cannot fit alongside the 13 fixed columns on any
    // realistic screen width, no matter how much correction is applied.
    let any_clamped = false;
    flex_cols.forEach((col) => {
      const natural = parseInt(col.width) || 100;
      const target = natural * scale;
      if (target < SR_MIN_COLUMN_WIDTH) any_clamped = true;
      col.width = Math.max(SR_MIN_COLUMN_WIDTH, target);
    });
    qr.__grs_sr_floor_pinned = any_clamped;
  }

  // Advance Payment Dashboard (imogi_finance) - a fixed, known 9-column
  // set (Voucher Type/No, Party Type/Party, Posting Date, Account, Amount/
  // Allocated Amount/Outstanding Amount - 3 Currency, Allocation Status),
  // server default widths sum to ~1360px total - closer to Trial
  // Balance's "known column set, may need to GROW to fill slack" shape
  // than General Ledger/Salary Register's "too many columns, may need to
  // shrink" one. Reuses the same proportional-scale algorithm regardless
  // (it already handles both directions - `scale` comes out above 1 and
  // grows flex columns when there's spare room, below 1 and shrinks them
  // when there isn't), same reasoning as Salary Register reusing General
  // Ledger's own function rather than inventing a fourth variant.
  const APD_REPORT_NAME = 'Advance Payment Dashboard';
  const APD_CURRENCY_WIDTH = 160; // same figure Trial Balance/General Ledger use - these are running ledger-style amounts (allocated/outstanding), not small per-line figures, so the wider GL figure fits better than Salary Register's narrower 140
  const APD_MIN_COLUMN_WIDTH = 80;
  const APD_SERIAL_COLUMN_WIDTH = 38;
  const APD_RIGHT_EDGE_BUFFER_PX = 60;

  function set_advance_payment_dashboard_column_widths(qr) {
    const columns = (qr.columns || []).filter((col) => !col.hidden);
    if (!columns.length) return;

    const container = get_active_page_body_container(qr);
    const available = container ? container.clientWidth : 0;
    qr.__grs_apd_last_available = available; // read back by schedule_width_recheck() below - separate key, same shared qr object

    if (available <= 0) return;

    const correction = qr.__grs_apd_overflow_correction || 0;
    const usable = Math.max(0, available - APD_SERIAL_COLUMN_WIDTH - APD_RIGHT_EDGE_BUFFER_PX - correction);

    const currency_cols = columns.filter((col) => col.fieldtype === 'Currency');
    const flex_cols = columns.filter((col) => col.fieldtype !== 'Currency');

    const currency_total = currency_cols.length * APD_CURRENCY_WIDTH;
    const flex_usable = Math.max(0, usable - currency_total);
    const flex_natural_total = flex_cols.reduce((sum, col) => sum + (parseInt(col.width) || 100), 0);
    const scale = flex_natural_total > 0 ? flex_usable / flex_natural_total : 1;

    currency_cols.forEach((col) => {
      col.width = APD_CURRENCY_WIDTH;
    });
    let any_clamped = false;
    flex_cols.forEach((col) => {
      const natural = parseInt(col.width) || 100;
      const target = natural * scale;
      if (target < APD_MIN_COLUMN_WIDTH) any_clamped = true;
      col.width = Math.max(APD_MIN_COLUMN_WIDTH, target);
    });
    qr.__grs_apd_floor_pinned = any_clamped;
  }

  // Outstanding Approvals Dashboard (imogi_finance) - another fixed, known
  // column set (12 columns: Doctype/Document/Creation/Owner/Workflow
  // State/Approval Level/Amount - the only Currency one/Cost Center/
  // Branch/Days Pending/Aging Category/Approver), server default widths
  // sum to ~1540px - same "known set, may need to grow OR shrink
  // depending on screen width" shape as Advance Payment Dashboard, same
  // shared algorithm reused again.
  const OAD_REPORT_NAME = 'Outstanding Approvals Dashboard';
  const OAD_CURRENCY_WIDTH = 160;
  const OAD_MIN_COLUMN_WIDTH = 80;
  const OAD_SERIAL_COLUMN_WIDTH = 38;
  const OAD_RIGHT_EDGE_BUFFER_PX = 60;

  function set_outstanding_approvals_dashboard_column_widths(qr) {
    const columns = (qr.columns || []).filter((col) => !col.hidden);
    if (!columns.length) return;

    const container = get_active_page_body_container(qr);
    const available = container ? container.clientWidth : 0;
    qr.__grs_oad_last_available = available; // read back by schedule_width_recheck() below - separate key, same shared qr object

    if (available <= 0) return;

    const correction = qr.__grs_oad_overflow_correction || 0;
    const usable = Math.max(0, available - OAD_SERIAL_COLUMN_WIDTH - OAD_RIGHT_EDGE_BUFFER_PX - correction);

    const currency_cols = columns.filter((col) => col.fieldtype === 'Currency');
    const flex_cols = columns.filter((col) => col.fieldtype !== 'Currency');

    const currency_total = currency_cols.length * OAD_CURRENCY_WIDTH;
    const flex_usable = Math.max(0, usable - currency_total);
    const flex_natural_total = flex_cols.reduce((sum, col) => sum + (parseInt(col.width) || 100), 0);
    const scale = flex_natural_total > 0 ? flex_usable / flex_natural_total : 1;

    currency_cols.forEach((col) => {
      col.width = OAD_CURRENCY_WIDTH;
    });
    let any_clamped = false;
    flex_cols.forEach((col) => {
      const natural = parseInt(col.width) || 100;
      const target = natural * scale;
      if (target < OAD_MIN_COLUMN_WIDTH) any_clamped = true;
      col.width = Math.max(OAD_MIN_COLUMN_WIDTH, target);
    });
    qr.__grs_oad_floor_pinned = any_clamped;
  }

  // Thin zebra striping, requested separately. frappe-datatable's own CSS
  // paints each `.dt-cell` with an OPAQUE white background
  // (`background-color: var(--dt-cell-bg, #fff)`) - the row wrapper
  // (`.dt-row`) itself is transparent, so tinting the row alone would be
  // invisible behind its cells. Has to be set on every `.dt-cell` inside
  // each odd row instead.
  //
  // Can't do this with a plain `:nth-child(even)` CSS rule: `.dt-row`
  // siblings inside `.dt-scrollable` include the header/filter rows AND -
  // once a report has enough rows to need it - virtualised body rows get
  // DOM-recycled and repositioned on scroll, so a row's DOM position stops
  // matching its logical position. `data-row-index` is the one thing that
  // stays correct through recycling (frappe-datatable updates it whenever
  // a recycled node is reassigned), so stripe off that instead, in JS.
  //
  // Selection highlight (`.dt-row--highlight .dt-cell`, set by frappe-
  // datatable's own stylesheet) would otherwise get permanently masked:
  // inline `style.backgroundColor` (what this sets) always wins over a
  // stylesheet class rule regardless of specificity. Skip/clear the stripe
  // on any row currently carrying that class so the highlight still shows.
  const ZEBRA_ODD_ROW_BG = '#f7f8fa'; // subtle - "tipis" per request, not a strong stripe

  // Frappe keeps other pages' DOM around, hidden, rather than removing it
  // (confirmed live for `.page-body.container`, see
  // get_active_page_body_container()'s comment above) - a plain
  // `document.querySelector()` for anything that might also exist on a
  // stale cached page risks grabbing the wrong one. `.dt-scrollable` is
  // unlikely to collide in practice (only report pages render one, and
  // report-to-report navigation reuses the same shared `.datatable`
  // rather than leaving a second one behind - see the filter-bar rework's
  // "every query-report shares one .page-form" finding), but scoping it
  // the same defensive way costs nothing and matches everything else here.
  function get_active_dt_scrollable() {
    const qr = frappe.query_report;
    const wrapper_el = qr && qr.page && qr.page.wrapper
      ? (qr.page.wrapper.jquery ? qr.page.wrapper[0] : qr.page.wrapper)
      : null;
    return wrapper_el ? wrapper_el.querySelector('.dt-scrollable') : null;
  }

  function apply_trial_balance_zebra() {
    const scrollable = get_active_dt_scrollable();
    if (!scrollable) return;
    scrollable.querySelectorAll('.dt-row[data-row-index]').forEach((row) => {
      const idx = parseInt(row.getAttribute('data-row-index'), 10);
      const stripe = !row.classList.contains('dt-row--highlight') && !Number.isNaN(idx) && idx % 2 === 1;
      row.querySelectorAll('.dt-cell').forEach((cell) => {
        cell.style.backgroundColor = stripe ? ZEBRA_ODD_ROW_BG : '';
      });
    });
  }

  // Covers every reason rows change after the initial paint: virtual-
  // scroll recycling (data-row-index changes on a reused node), row
  // highlight/unhighlight (class changes), tree expand/collapse and
  // add/remove of rows (childList) - all without needing separate scroll/
  // click listeners for each. attributeFilter deliberately excludes
  // 'style' - that's the attribute THIS function itself writes, including
  // it would have the observer re-fire on its own writes.
  let zebra_observer = null;
  function watch_trial_balance_zebra() {
    const scrollable = get_active_dt_scrollable();
    if (!scrollable) return;
    if (zebra_observer) zebra_observer.disconnect();
    zebra_observer = new MutationObserver(() => apply_trial_balance_zebra());
    zebra_observer.observe(scrollable, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-row-index'],
    });
    apply_trial_balance_zebra();
  }

  // `.page-body.container` is freed to full width by a CSS rule
  // (garage_desk.css) loaded in parallel with this script, not guaranteed
  // to have finished being applied by the browser at the exact moment the
  // VERY FIRST render_datatable() call of a fresh page load measures it -
  // caught live: Account/the 6 Dr/Cr columns got sized against the OLD,
  // Bootstrap-narrow width from that one race, and since nothing else
  // re-triggers a recompute (no filter change, no resize) the dead space
  // this was meant to fix just sat there unchanged until something
  // eventually forced a recalculation. Re-check shortly after every render
  // once layout has definitely settled, and only re-render if the
  // measurement actually moved - the recheck's own resulting
  // render_datatable() call schedules another recheck too, but that one
  // finds no further difference and stops there, so this can't loop.
  // Shared by both Trial Balance and General Ledger (state keys prefixed
  // per report on the same shared `qr` object - see the filter-bar
  // rework's "every query-report shares one .page-form/one qr instance"
  // finding - so the two reports' own recheck state never collides).
  function schedule_width_recheck(qr, report_name, state_prefix, retries_left) {
    if (retries_left === undefined) retries_left = 10; // ~3.5s total window for a slow cross-page-type transition to finish mounting
    const pending_key = state_prefix + '_recheck_pending';
    if (qr[pending_key]) return;
    qr[pending_key] = true;
    setTimeout(() => {
      qr[pending_key] = false;
      if (qr.report_name !== report_name) return;

      const last_available_key = state_prefix + '_last_available';
      const container = get_active_page_body_container(qr);
      const now_width = container ? container.clientWidth : 0;
      // Comparing two bad readings (0 vs 0, from `get_active_page_body_
      // container()` finding nothing both times) looks identical to "two
      // good readings that happen to match" under a plain `> 2px`
      // difference check - neither one triggers a re-render, permanently
      // freezing columns at their fallback width instead of the recheck
      // ever correcting it. Treat "we now have a real measurement where we
      // didn't before" as its own trigger, not just "the number changed".
      const now_valid = now_width > 0;
      const was_valid = (qr[last_available_key] || 0) > 0;
      const container_moved = now_valid && (!was_valid || Math.abs(now_width - qr[last_available_key]) > 2);

      // Still can't find it (a slower page-type transition than the usual
      // 350ms covers) - keep waiting rather than silently giving up with
      // columns stuck at their fallback width forever, same bounded-retry
      // pattern used for the filter-bar poll() elsewhere in this file.
      if (!now_valid && retries_left > 0) {
        schedule_width_recheck(qr, report_name, state_prefix, retries_left - 1);
        return;
      }

      // RIGHT_EDGE_BUFFER_PX/GL_RIGHT_EDGE_BUFFER_PX's fixed guess (border/
      // scrollbar/column-border overhead between `.page-body.container`
      // and what the datatable can actually paint) was a few px short in
      // practice, leaving genuine horizontal overflow - this is what
      // actually measures that overflow directly off the rendered table,
      // rather than trying to guess the exact right buffer number up
      // front. Grows the report's own *_overflow_correction (read back by
      // set_trial_balance_column_widths()/set_general_ledger_column_
      // widths() above) by whatever's left; re-rendering with the larger
      // correction applied then leaves zero (or negative, i.e. no-op)
      // overflow next time this checks, which is what stops it from
      // re-triggering forever. Scoped the same way as `.page-body.
      // container` above (a second, unrelated report's `.datatable` can
      // just as easily be sitting elsewhere in the DOM, hidden).
      const wrapper_el = qr.page && qr.page.wrapper
        ? (qr.page.wrapper.jquery ? qr.page.wrapper[0] : qr.page.wrapper)
        : null;
      const datatable_el = wrapper_el ? wrapper_el.querySelector('.datatable') : null;
      const overflow = datatable_el ? datatable_el.scrollWidth - datatable_el.clientWidth : 0;
      // Reports whose flex columns are already pinned at their MIN_COLUMN_
      // WIDTH floor (set_general_ledger_column_widths()/set_salary_
      // register_column_widths() above, via *_floor_pinned) genuinely
      // cannot shrink any further - too many Currency columns for the
      // available width, no matter how large *_overflow_correction grows.
      // Without this guard the "no further difference and stops there"
      // assumption above breaks for exactly that case: overflow never
      // reaches 0 (the rendered width is floor-clamped, not correction-
      // responsive), so overflow_grew stays true forever and *_overflow_
      // correction was observed growing unbounded (8000+px after a single
      // page load) while re-rendering every 350ms indefinitely. Once
      // floor-pinned, accept the remaining overflow as unavoidable
      // horizontal scroll (same as General Ledger's own doc-comment
      // already accepts for its 16-column case) instead of chasing it.
      const floor_pinned = qr[state_prefix + '_floor_pinned'];
      const overflow_grew = overflow > 1 && !floor_pinned;
      if (overflow_grew) {
        const correction_key = state_prefix + '_overflow_correction';
        qr[correction_key] = (qr[correction_key] || 0) + overflow + 2; // +2px safety margin
      }

      if (container_moved || overflow_grew) {
        qr.render_datatable();
      }
    }, 350);
  }

  const ZEBRA_REPORT_NAMES = new Set([REPORT_NAME, GL_REPORT_NAME, SR_REPORT_NAME, APD_REPORT_NAME, OAD_REPORT_NAME]);

  const original = frappe.views.QueryReport.prototype.render_datatable;
  frappe.views.QueryReport.prototype.render_datatable = function (...args) {
    if (this.report_name === REPORT_NAME) set_trial_balance_column_widths(this);
    if (this.report_name === GL_REPORT_NAME) set_general_ledger_column_widths(this);
    if (this.report_name === SR_REPORT_NAME) set_salary_register_column_widths(this);
    if (this.report_name === APD_REPORT_NAME) set_advance_payment_dashboard_column_widths(this);
    if (this.report_name === OAD_REPORT_NAME) set_outstanding_approvals_dashboard_column_widths(this);
    const result = original.apply(this, args);
    if (ZEBRA_REPORT_NAMES.has(this.report_name)) watch_trial_balance_zebra();
    if (this.report_name === REPORT_NAME) schedule_width_recheck(this, REPORT_NAME, '__grs_tb');
    if (this.report_name === GL_REPORT_NAME) schedule_width_recheck(this, GL_REPORT_NAME, '__grs_gl');
    if (this.report_name === SR_REPORT_NAME) schedule_width_recheck(this, SR_REPORT_NAME, '__grs_sr');
    if (this.report_name === APD_REPORT_NAME) schedule_width_recheck(this, APD_REPORT_NAME, '__grs_apd');
    if (this.report_name === OAD_REPORT_NAME) schedule_width_recheck(this, OAD_REPORT_NAME, '__grs_oad');
    return result;
  };

  // Window resize doesn't go through render_datatable() at all (the
  // datatable's own column widths are untouched by a resize - only the now
  // full-width .page-body.container's clientWidth changes), so columns
  // would otherwise stay sized for whatever width they were first drawn
  // at. Re-run the same render_datatable() call on resize too (rebuilding
  // the datatable is cheap and guarantees no stale internal layout, unlike
  // trying to patch column widths into an already-built table - see above),
  // debounced, only while still parked on one of these two reports.
  let resize_timer = null;
  window.addEventListener('resize', () => {
    const qr = frappe.query_report;
    if (!qr || !ZEBRA_REPORT_NAMES.has(qr.report_name)) return;
    clearTimeout(resize_timer);
    resize_timer = setTimeout(() => qr.render_datatable(), 200);
  });
})();

// Report filter bar redesign, requested for Trial Balance first, then
// General Ledger too. The default filters all render as identically-styled
// `col-md-2` boxes in one flat wrapping grid (Company/dates given the same
// visual weight as everything else, including checkboxes nobody touches
// day to day). Regrouped Odoo-style per explicit request: a primary row
// (Company/dates, +Account for General Ledger) always visible, a collapsed
// "Advanced Filters" panel for the rarely-used Link/Select/Data fields, and
// the Check fields restyled as toggle switches in their own row.
//
// One shared factory (setup_report_filter_regrouping()) rather than a
// separate copy-pasted IIFE per report - the mechanism (wait for filters to
// render, move them into 3 grouping containers, guard against re-render
// races) is identical for any report, only the field lists differ. Classes
// stay named `grs-tb-*` ("tb" from when this was Trial Balance-only, now
// shared) rather than renamed - renaming risked regressing what was
// already tested for zero functional gain, and the CSS (garage_desk.css)
// only ever applies these classes' styles on the routes this script
// itself restructures, so the name being report-specific-sounding doesn't
// leak anywhere else.
//
// Each filter is Frappe's own live `.frappe-control` wrapper
// (`[data-fieldname]`, a direct child of `.page-form`) - frappe.ui.Field
// keeps its reference to THAT element, not to its position in the tree, so
// moving the same node into a new grouping container (appendChild, not
// cloneNode) keeps every value binding/event handler intact. Nothing here
// touches field values or query behaviour, purely visual regrouping.
function setup_report_filter_regrouping(config) {
  const REPORT_NAME = config.reportName;
  const PRIMARY_FIELDS = config.primaryFields;
  const ADVANCED_FIELDS = config.advancedFields;
  const TOGGLE_FIELDS = config.toggleFields;
  // Total filter count as of writing - used only to know the filters have
  // all finished rendering before restructuring (see poll() below), not
  // hardcoded into the grouping logic itself (PRIMARY_FIELDS/
  // ADVANCED_FIELDS/TOGGLE_FIELDS list every fieldname explicitly, so a
  // filter this doesn't know about would just get left in `.page-form`
  // rather than silently mis-handled).
  const EXPECTED_FILTER_COUNT = PRIMARY_FIELDS.length + ADVANCED_FIELDS.length + TOGGLE_FIELDS.length;

  const ALL_FIELDS = [...PRIMARY_FIELDS, ...ADVANCED_FIELDS, ...TOGGLE_FIELDS];

  // Re-entering this report from another report in the SAME SPA session
  // (frappe.set_route(), no full page reload) rebuilds every filter
  // through what turned out to be a multi-step process, not an atomic
  // swap - caught live via logging, on Trial Balance:
  // `.page-form.children.length` passed through an intermediate count (26,
  // on one run) before settling at the real 15, because Frappe appends
  // freshly-created field elements before fully clearing whatever was
  // there from this same node's PREVIOUS visit (leftover raw fields, or -
  // after the first successful restructure - a stale duplicate along the
  // way). A `children.length >= EXPECTED_FILTER_COUNT` check treated that
  // transient overshoot as "ready" and restructured the wrong snapshot,
  // silently leaving `.page-form` in a broken half-state that nothing
  // afterward ever corrected.
  //
  // Ready now means EXACTLY the expected count AND every known fieldname
  // present as a direct child - both together rule out any duplicate
  // (a dupe eating one slot would leave some other required fieldname
  // missing among the rest, failing the `every()` half).
  function is_ready(page_form) {
    if (!page_form || page_form.children.length !== EXPECTED_FILTER_COUNT) return false;
    return ALL_FIELDS.every((fn) => page_form.querySelector(`:scope > [data-fieldname="${fn}"]`));
  }

  // Confirmed live: EVERY query-report shares the exact same `.page-form`
  // DOM node - `frappe.query_report.page.wrapper[0].id` reads
  // "page-query-report" regardless of which report is open, not a
  // per-report id. Trial Balance -> General Ledger (drill-through from a
  // TB row, which goes through `frappe.route_options` +
  // `frappe.set_route()`, exactly like a plain report switch) reuses TB's
  // OWN already-grouped `.page-form`, `.grs-tb-primary-row` and all -
  // General Ledger's `maybe_start()` found that leftover primary-row,
  // concluded regrouping was "already done", added `.grs-tb-ready`, and
  // stopped polling entirely, all before Frappe had even finished tearing
  // TB's fields out and rebuilding General Ledger's own. Every "is this
  // already grouped" check below now also confirms it was grouped FOR THIS
  // REPORT specifically (`data-grs-report`, stamped by restructure()) -
  // presence of `.grs-tb-primary-row` alone is not enough, since it might
  // belong to whichever report was open here last.
  function is_grouped_for_this_report(page_form) {
    return !!(page_form
      && page_form.querySelector(':scope > .grs-tb-primary-row')
      && page_form.getAttribute('data-grs-report') === REPORT_NAME);
  }

  function restructure(page_form) {
    if (is_grouped_for_this_report(page_form)) return;
    // is_ready() is also poll()'s own gate before calling this at all, but
    // check again here too: cheap, and keeps this function safe to call on
    // its own without relying on the caller having verified it first.
    if (!is_ready(page_form)) return;

    const get = (fieldname) => page_form.querySelector(`:scope > [data-fieldname="${fieldname}"]`);

    const primary_row = document.createElement('div');
    primary_row.className = 'grs-tb-primary-row';
    PRIMARY_FIELDS.forEach((fn) => primary_row.appendChild(get(fn)));
    page_form.appendChild(primary_row);

    // Salary Register (no checkboxes at all - Date/Link/Select filters
    // only) is the first report to reuse this factory with an empty
    // TOGGLE_FIELDS - appending an empty `.grs-tb-toggle-row`
    // unconditionally would still get its CSS margin/border-top, showing
    // as a bare horizontal line with nothing under it. Skip creating
    // either group's container when that group has nothing to hold, same
    // reasoning for ADVANCED_FIELDS even though every report so far has
    // had at least one.
    if (ADVANCED_FIELDS.length) {
      const advanced_wrap = document.createElement('div');
      advanced_wrap.className = 'grs-tb-advanced-wrap';
      const advanced_toggle = document.createElement('button');
      advanced_toggle.type = 'button';
      advanced_toggle.className = 'grs-tb-advanced-toggle';
      advanced_toggle.innerHTML =
        `<span class="grs-tb-chevron">▸</span> ${__('Advanced Filters')} (${ADVANCED_FIELDS.length})`;
      const advanced_panel = document.createElement('div');
      advanced_panel.className = 'grs-tb-advanced-panel';
      ADVANCED_FIELDS.forEach((fn) => advanced_panel.appendChild(get(fn)));
      advanced_toggle.addEventListener('click', () => {
        const open = advanced_wrap.classList.toggle('grs-tb-advanced-open');
        advanced_panel.style.display = open ? 'flex' : 'none';
      });
      advanced_panel.style.display = 'none';
      advanced_wrap.appendChild(advanced_toggle);
      advanced_wrap.appendChild(advanced_panel);
      page_form.appendChild(advanced_wrap);
    }

    if (TOGGLE_FIELDS.length) {
      const toggle_row = document.createElement('div');
      toggle_row.className = 'grs-tb-toggle-row';
      TOGGLE_FIELDS.forEach((fn) => toggle_row.appendChild(get(fn)));
      page_form.appendChild(toggle_row);
    }

    // Which report this grouping belongs to - checked by
    // is_grouped_for_this_report() above, from any report's own closure,
    // to tell "already grouped, for ME" apart from "grouped, but for
    // whichever report was open here before".
    page_form.setAttribute('data-grs-report', REPORT_NAME);

    // Lifts the CSS rule (garage_desk.css) that keeps `.page-form` hidden
    // until this point - the moves above are now done, so revealing it
    // shows the final grouped layout directly with nothing to flash past.
    page_form.classList.add('grs-tb-ready');
  }

  function get_page_form() {
    const qr = frappe.query_report;
    // `page.wrapper` is a jQuery-wrapped element here (has no
    // .querySelector of its own, .jquery is the standard duck-type check
    // for "this is a jQuery object") - unwrap to the raw DOM node first.
    const wrapper_el = qr && qr.page && qr.page.wrapper
      ? (qr.page.wrapper.jquery ? qr.page.wrapper[0] : qr.page.wrapper)
      : null;
    return wrapper_el ? wrapper_el.querySelector('.page-form') : null;
  }

  function maybe_start() {
    const route = frappe.get_route();
    if (!route || route[0] !== 'query-report' || route[1] !== REPORT_NAME) return;

    // Re-entering this report reuses the SAME shared `.page-form` node
    // (see is_grouped_for_this_report()'s comment above) from any earlier
    // visit this session - to THIS report, or to any other, since the node
    // is shared across every one of them - `.grs-tb-ready` class and all.
    // The CSS hide rule only re-engages once that class is gone. Without
    // this, the very first visit ever is flicker-free (nothing has the
    // class yet, so CSS hides it from frame one) but every visit after a
    // trip to any other regrouped report flickers again: Frappe rebuilds
    // the raw fields back into this already-`.grs-tb-ready` node, which
    // stays fully visible - flat layout and all - for the whole rebuild+
    // poll+restructure() window. Dropping the class synchronously,
    // immediately, the moment a return visit is detected (not from inside
    // poll(), which only starts firing 200ms+ later) re-engages the CSS
    // hide before that flat layout ever gets a frame to paint in.
    const existing = get_page_form();
    if (existing && !is_grouped_for_this_report(existing)) {
      existing.classList.remove('grs-tb-ready');
    }

    let retries_left = 25; // ~5s window for the report page + all its filters to finish rendering
    const poll = () => {
      if (retries_left-- <= 0) {
        // Give up trying to regroup, but still reveal whatever's there -
        // an unstyled flat filter row beats one hidden forever because
        // some extra filter got added to the report later and ALL_FIELDS/
        // EXPECTED_FILTER_COUNT above was never updated to match.
        const page_form = get_page_form();
        if (page_form) page_form.classList.add('grs-tb-ready');
        return;
      }
      const page_form = get_page_form();
      if (is_grouped_for_this_report(page_form)) {
        page_form.classList.add('grs-tb-ready'); // e.g. a resize/filter-rerun re-entering maybe_start() with regrouping already intact
        return;
      }
      if (is_ready(page_form)) {
        restructure(page_form);
      } else {
        setTimeout(poll, 200);
      }
    };
    poll();
  }

  if (!frappe.router) return;
  frappe.router.__garage_filter_bar_patched_reports = frappe.router.__garage_filter_bar_patched_reports || {};
  if (frappe.router.__garage_filter_bar_patched_reports[REPORT_NAME]) return;
  frappe.router.__garage_filter_bar_patched_reports[REPORT_NAME] = true;
  // `router.on('change', ...)` alone only fires on an in-app route
  // TRANSITION - it never fires for a URL the app was already sitting on
  // when this script first evaluated (a hard page load/refresh straight
  // into the report, not a click-through navigation). Check the current
  // route immediately too, once, in addition to listening for future
  // ones - covers both entry paths with the same maybe_start()/poll().
  frappe.router.on('change', maybe_start);
  maybe_start();
}

setup_report_filter_regrouping({
  reportName: 'Trial Balance',
  primaryFields: ['company', 'fiscal_year', 'from_date', 'to_date'],
  advancedFields: ['cost_center', 'project', 'finance_book', 'presentation_currency'],
  toggleFields: [
    'with_period_closing_entry_for_opening',
    'with_period_closing_entry_for_current_period',
    'show_zero_values',
    'show_unclosed_fy_pl_balances',
    'include_default_book_entries',
    'show_net_values',
    'show_group_accounts',
  ],
});

setup_report_filter_regrouping({
  reportName: 'General Ledger',
  // Account added to Trial Balance's own Company/dates trio - it's core to
  // reading a General Ledger (which account's ledger am I looking at),
  // unlike Trial Balance where Account is a row label, not a filter.
  primaryFields: ['company', 'from_date', 'to_date', 'account'],
  advancedFields: [
    'finance_book', 'voucher_no', 'against_voucher_no', 'party_type', 'party',
    'party_name', 'categorize_by', 'tax_id', 'presentation_currency', 'cost_center', 'project',
  ],
  toggleFields: [
    'include_dimensions',
    'disable_opening_balance_calculation',
    'show_opening_entries',
    'include_default_book_entries',
    'show_cancelled_entries',
    'show_net_values_in_party_account',
    'show_amount_in_company_currency',
    'add_values_in_transaction_currency',
    'show_remarks',
    'ignore_err',
    'ignore_cr_dr_notes',
  ],
});

setup_report_filter_regrouping({
  reportName: 'Salary Register',
  primaryFields: ['from_date', 'to_date', 'company'],
  // No Check-type filters on this report at all (Date/Link/Select only) -
  // toggleFields is deliberately empty; the factory (see its own comment)
  // skips creating that group's container entirely when there's nothing
  // for it to hold, rather than leaving a bare empty bordered strip.
  advancedFields: ['currency', 'employee', 'docstatus', 'department', 'designation', 'branch'],
  toggleFields: [],
});

setup_report_filter_regrouping({
  reportName: 'Advance Payment Dashboard',
  primaryFields: ['company', 'from_date', 'to_date'],
  // Also zero Check-type filters here (Link/Select/Dynamic Link/Date
  // only) - toggleFields deliberately empty, same as Salary Register.
  advancedFields: ['party_type', 'party', 'account', 'allocation_status'],
  toggleFields: [],
});

setup_report_filter_regrouping({
  reportName: 'Outstanding Approvals Dashboard',
  primaryFields: ['from_date', 'to_date'],
  // Zero Check-type filters again (Date/MultiSelectList/Select/Link only)
  // - toggleFields deliberately empty, same as Salary Register/Advance
  // Payment Dashboard. `doctype` is a MultiSelectList (not a Link/Select),
  // the factory doesn't care about fieldtype beyond distinguishing Check
  // for the toggle row, so it's grouped/moved exactly like any other
  // field here.
  advancedFields: ['doctype', 'approval_level', 'cost_center', 'branch'],
  toggleFields: [],
});
