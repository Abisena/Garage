/**
 * Export Template - save and reload a field selection in the Export Data dialog.
 *
 * frappe's Export Data dialog starts from scratch every time: for a doctype
 * like Sales Order that is a hundred-odd checkboxes to re-tick for the same
 * monthly export (explicit request). This adds an "Export Template" section
 * above "Select Fields To Insert/Update" that saves the current selection -
 * fields, filters, file type and export type - as a named Garage Export
 * Template, and loads one back in a click.
 *
 * Done by patching frappe.data_import.DataExporter's prototype rather than
 * forking data_exporter.js, so frappe keeps owning the dialog. The class
 * lives in a lazily-required bundle (data_import_tools.bundle.js) that loads
 * long after this file, so we install an accessor on frappe.data_import and
 * patch the class at the moment the bundle assigns it - see install_patch().
 *
 * All reads and writes go through garage.api.export_template, which owns the
 * who-may-see-what rules; nothing here is a permission check.
 */

frappe.provide("frappe.data_import");
frappe.provide("garage.export_template");

(() => {
	const API = "garage.api.export_template";
	const EXPORTING_FOR_OPTIONS = ["Insert New Records", "Update Existing Records"];

	// Template names are free text typed by a user and every place we show one
	// - select options, alerts, confirm dialogs - renders HTML, so a name goes
	// through here before it is interpolated into any of them.
	const esc = (value) => frappe.utils.escape_html(cstr(value));

	function patch_class(DataExporter) {
		if (!DataExporter || DataExporter.__garage_export_template) return DataExporter;
		DataExporter.__garage_export_template = true;

		const proto = DataExporter.prototype;
		const original_make_dialog = proto.make_dialog;
		const original_make_select_all_buttons = proto.make_select_all_buttons;
		const original_get_multicheck_options = proto.get_multicheck_options;

		// Three core methods wrapped, each running once per dialog:
		// make_dialog() builds and shows it, make_select_all_buttons() renders
		// the block our template section sits on top of, and
		// get_multicheck_options() produces the field checkboxes.
		proto.make_dialog = function () {
			original_make_dialog.call(this);
			this.garage_setup_dialog_look();
		};

		// A docfield may carry a deliberately blank label - Garage Service
		// Order's "complaint" is one, blanked so its form section shows the
		// textarea with no label above it. The picker has no such context: an
		// empty label renders as a checkbox with nothing beside it, which
		// cannot be read or guessed. Fall back to the fieldname, prettified.
		proto.get_multicheck_options = function (doctype, child_fieldname = null) {
			const options = original_get_multicheck_options.call(this, doctype, child_fieldname);
			return (options || []).map((option) =>
				cstr(option.label).trim()
					? option
					: Object.assign({}, option, { label: frappe.unscrub(option.value) })
			);
		};

		proto.make_select_all_buttons = function () {
			original_make_select_all_buttons.call(this);
			// Core's own block, tagged before ours is prepended so it is still
			// the only .mb-3 child in here.
			this.dialog
				.get_field("select_all_buttons")
				.$wrapper.children(".mb-3")
				.addClass("garage-export-fields-toolbar");
			this.garage_make_template_area();
		};

		Object.assign(proto, {
			/**
			 * Hooks for export_dialog.css, plus the Excel default.
			 *
			 * The styling is all in CSS scoped under .garage-export-dialog;
			 * this only hands it the class names it needs, because the dialog
			 * is frappe's and its markup has no handle of its own.
			 */
			garage_setup_dialog_look() {
				this.dialog.$wrapper.addClass("garage-export-dialog");

				// Wider than the default modal: the field picker is a
				// two-column checkbox list and the filter rows are three
				// controls across.
				this.dialog.$wrapper.find(".modal-dialog").addClass("modal-lg");

				// Excel first (explicit request). CSV stays selectable.
				this.dialog.set_value("file_type", "Excel");

				// File Type and Export Type share one grid row instead of
				// stacking as two near-empty ones; the filter area below them
				// spans the full width.
				this.dialog
					.get_field("file_type")
					.$wrapper.closest(".form-column")
					.addClass("garage-export-options");
			},

			garage_exporting_for() {
				return EXPORTING_FOR_OPTIONS.includes(this.exporting_for)
					? this.exporting_for
					: EXPORTING_FOR_OPTIONS[0];
			},

			garage_multicheck_fieldnames() {
				return this.dialog.fields
					.filter((df) => df.fieldtype === "MultiCheck")
					.map((df) => df.fieldname);
			},

			garage_make_template_area() {
				const $parent = this.dialog.get_field("select_all_buttons").$wrapper;
				if (!$parent || !$parent.length) return;

				$parent.find(".garage-export-template").remove();

				this.$garage_template_area = $(`
					<div class="garage-export-template">
						<div class="garage-export-block-head">
							<h6 class="form-section-heading uppercase">${__("Export Template")}</h6>
							<span class="garage-export-block-hint">
								${__("Reuse a saved set of fields, filters and file type")}
							</span>
						</div>
						<div class="garage-export-template-row">
							<div class="garage-export-template-select"></div>
							<div class="garage-export-template-actions">
								<button class="btn btn-default btn-xs garage-load-template" disabled>
									${__("Load")}
								</button>
								<button class="btn btn-default btn-xs garage-delete-template" disabled>
									${__("Delete")}
								</button>
								<button class="btn btn-default btn-xs garage-save-template">
									${__("Save as Template")}
								</button>
							</div>
						</div>
					</div>
				`).prependTo($parent);

				this.garage_template_select = frappe.ui.form.make_control({
					parent: this.$garage_template_area.find(".garage-export-template-select"),
					df: {
						fieldtype: "Select",
						fieldname: "garage_export_template",
						options: [{ label: __("Load Template..."), value: "" }],
					},
					render_input: true,
					only_input: true,
				});
				this.garage_template_select.$input.on("change", () =>
					this.garage_toggle_template_buttons()
				);

				this.$garage_template_area
					.find(".garage-load-template")
					.on("click", () => this.garage_load_template());
				this.$garage_template_area
					.find(".garage-delete-template")
					.on("click", () => this.garage_delete_template());
				this.$garage_template_area
					.find(".garage-save-template")
					.on("click", () => this.garage_save_template());

				this.garage_refresh_templates();
			},

			garage_selected_template_name() {
				if (!this.garage_template_select) return "";
				return this.garage_template_select.$input.val() || "";
			},

			garage_selected_template() {
				const name = this.garage_selected_template_name();
				return (this.garage_templates || []).find((t) => t.name === name);
			},

			garage_refresh_templates(select_name) {
				return frappe
					.call({
						method: `${API}.get_templates`,
						args: {
							reference_doctype: this.doctype,
							exporting_for: this.garage_exporting_for(),
						},
					})
					.then((r) => {
						this.garage_templates = r.message || [];

						// add_options() drops labels in with .html(), and a
						// template name is whatever a user typed - escape both
						// halves of the label rather than the joined string, so
						// the translated "shared by" wrapper stays markup.
						const options = [{ label: __("Load Template..."), value: "" }].concat(
							this.garage_templates.map((t) => ({
								label: t.is_own
									? esc(t.template_name)
									: __("{0} (shared by {1})", [
											esc(t.template_name),
											esc(t.owner),
									  ]),
								value: t.name,
							}))
						);

						const select = this.garage_template_select;
						select.df.options = options;
						select.set_options();

						const keep = this.garage_templates.some((t) => t.name === select_name)
							? select_name
							: "";
						select.$input.val(keep);
						this.garage_toggle_template_buttons();
					});
			},

			garage_toggle_template_buttons() {
				if (!this.$garage_template_area) return;
				const name = this.garage_selected_template_name();
				const template = this.garage_selected_template();
				this.$garage_template_area.find(".garage-load-template").prop("disabled", !name);
				this.$garage_template_area
					.find(".garage-delete-template")
					.prop("disabled", !template || !template.is_own);
			},

			garage_get_selected_fields() {
				const out = {};
				this.garage_multicheck_fieldnames().forEach((fieldname) => {
					const selected = this.dialog.get_value(fieldname) || [];
					if (selected.length) out[fieldname] = selected;
				});
				return out;
			},

			garage_count_selected_fields(fields_map) {
				return Object.keys(fields_map).reduce(
					(total, key) => total + fields_map[key].length,
					0
				);
			},

			/**
			 * Tick exactly the saved fields and untick everything else.
			 *
			 * Goes through the checkbox inputs with a change event instead of
			 * poking MultiCheck.selected_options, because that array is only
			 * kept in sync by the control's own change handler - and the same
			 * event is what re-enables the dialog's Export button.
			 */
			garage_apply_field_selection(fields_map) {
				const missing = [];
				const parent_key = this.doctype;
				const update_mode = this.garage_exporting_for() === "Update Existing Records";

				this.garage_multicheck_fieldnames().forEach((fieldname) => {
					const field = this.dialog.get_field(fieldname);
					if (!field || !field.options) return;

					let wanted = Array.isArray(fields_map[fieldname])
						? fields_map[fieldname].slice()
						: [];

					// Updating existing records is keyed on ID; a template that
					// predates that rule must not be able to drop the column.
					if (update_mode && fieldname === parent_key && !wanted.includes("name")) {
						wanted.push("name");
					}

					const available = field.options.map((option) => option.value);
					wanted.forEach((value) => {
						if (!available.includes(value)) missing.push(`${fieldname}.${value}`);
					});

					field.options.forEach((option) => {
						const $input = option.$checkbox ? option.$checkbox.find("input") : $();
						if (!$input.length) return;

						const should_check = wanted.includes(option.value);
						if ($input.prop("checked") !== should_check) {
							$input.prop("checked", should_check).trigger("change");
						}
					});
				});

				return { missing };
			},

			garage_load_template() {
				const name = this.garage_selected_template_name();
				if (!name) return;

				return frappe
					.call({
						method: `${API}.get_template`,
						args: { name },
						freeze: true,
						freeze_message: __("Loading template..."),
					})
					.then((r) => r.message && this.garage_apply_template(r.message));
			},

			garage_apply_template(template) {
				if (template.file_type) {
					this.dialog.set_value("file_type", template.file_type);
				}
				if (template.export_records) {
					this.dialog.set_value("export_records", template.export_records);
				}

				if (this.filter_group) {
					this.filter_group.clear_filters();
					this.filter_group.add_filters_to_filter_group(template.export_filters || []);
				}

				const { missing } = this.garage_apply_field_selection(
					template.export_fields || {}
				);

				this.update_record_count_message();

				frappe.show_alert({
					message: __("Loaded template {0}", [esc(template.template_name)]),
					indicator: "green",
				});
				if (missing.length) {
					frappe.show_alert(
						{
							message: __("{0} saved field(s) no longer exist and were skipped", [
								missing.length,
							]),
							indicator: "orange",
						},
						7
					);
				}
			},

			garage_save_template() {
				const fields_map = this.garage_get_selected_fields();
				const field_count = this.garage_count_selected_fields(fields_map);
				if (!field_count) {
					frappe.msgprint({
						title: __("Nothing to Save"),
						message: __("Select at least one field before saving a template."),
						indicator: "orange",
					});
					return;
				}

				const current = this.garage_selected_template();
				const prefill = current && current.is_own ? current : null;
				const filters = this.get_filters();

				const dialog = new frappe.ui.Dialog({
					title: __("Save as Export Template"),
					fields: [
						{
							fieldtype: "Data",
							fieldname: "template_name",
							label: __("Template Name"),
							reqd: 1,
							default: prefill ? prefill.template_name : "",
						},
						{
							fieldtype: "Check",
							fieldname: "is_shared",
							label: __("Share with All Users"),
							default: prefill ? prefill.is_shared : 0,
							description: __(
								"Anyone who can read {0} will be able to load this template. Only you can change or delete it.",
								[__(this.doctype)]
							),
						},
						{ fieldtype: "HTML", fieldname: "summary" },
					],
					primary_action_label: __("Save"),
					primary_action: (values) =>
						this.garage_commit_template(dialog, values, fields_map, filters),
				});

				dialog.get_field("summary").$wrapper.html(`
					<div class="text-muted small">
						${__("Saving {0} field(s), {1} filter(s), file type {2} and export type {3}.", [
							field_count,
							filters.length,
							esc(this.dialog.get_value("file_type") || "CSV"),
							esc(this.dialog.get_value("export_records") || "all"),
						])}
					</div>
				`);

				dialog.show();
			},

			garage_commit_template(dialog, values, fields_map, filters) {
				const template_name = (values.template_name || "").trim();
				if (!template_name) return;

				const existing = (this.garage_templates || []).find(
					(t) => t.is_own && t.template_name === template_name
				);

				const save = (overwrite) =>
					frappe
						.call({
							method: `${API}.save_template`,
							args: {
								reference_doctype: this.doctype,
								exporting_for: this.garage_exporting_for(),
								template_name: template_name,
								export_fields: fields_map,
								export_filters: filters,
								file_type: this.dialog.get_value("file_type"),
								export_records: this.dialog.get_value("export_records"),
								is_shared: values.is_shared ? 1 : 0,
								overwrite: overwrite ? 1 : 0,
							},
							freeze: true,
							freeze_message: __("Saving template..."),
						})
						.then((r) => {
							if (!r.message) return;
							dialog.hide();
							frappe.show_alert({
								message: r.message.updated
									? __("Template {0} updated", [esc(r.message.template_name)])
									: __("Template {0} saved", [esc(r.message.template_name)]),
								indicator: "green",
							});
							return this.garage_refresh_templates(r.message.name);
						});

				if (existing) {
					frappe.confirm(
						__("An export template named {0} already exists. Replace it?", [
							esc(template_name),
						]),
						() => save(true)
					);
					return;
				}

				return save(false);
			},

			garage_delete_template() {
				const template = this.garage_selected_template();
				if (!template || !template.is_own) return;

				frappe.confirm(
					__("Delete export template {0}?", [esc(template.template_name)]),
					() =>
						frappe
							.call({
								method: `${API}.delete_template`,
								args: { name: template.name },
								freeze: true,
								freeze_message: __("Deleting template..."),
							})
							.then(() => {
								frappe.show_alert({
									message: __("Template {0} deleted", [
										esc(template.template_name),
									]),
									indicator: "green",
								});
								return this.garage_refresh_templates();
							})
				);
			},
		});

		return DataExporter;
	}

	function install_patch() {
		if (frappe.data_import.DataExporter) {
			patch_class(frappe.data_import.DataExporter);
			return;
		}

		// Bundle not loaded yet: catch the assignment instead of polling for it.
		let stored;
		Object.defineProperty(frappe.data_import, "DataExporter", {
			configurable: true,
			enumerable: true,
			get: () => stored,
			set: (cls) => {
				stored = patch_class(cls);
			},
		});
	}

	garage.export_template.patch_class = patch_class;
	install_patch();
})();
