// Friendly face for the Garage notification rules.
//
// Frappe's Notification form is a general-purpose console: it has to cover
// Slack, SMS, value-change triggers, Jinja conditions and attachment rules, so
// every knob is on display. For a rule that only ever does one thing - tell the
// approver a PO is waiting - that is mostly noise, and the people who maintain
// the recipient list are not the people who read Jinja.
//
// So the technical fields are *hidden, never removed*: the rule stays a plain
// Notification, this only changes what the form shows by default, and
// "Pengaturan Lanjutan" puts everything back. Nothing here stores a second copy
// of the configuration - every input edits the same field the engine reads.
(() => {
  const MANAGED = {
    'Purchase Order Butuh Approval': {
      title: 'Notifikasi Purchase Order',
      when: 'PO diajukan untuk approval',
      sample: { nomor: 'PUR-ORD-2026-00012', pembuat: 'Gilang Ramadhan' },
    },
  };

  // Subject has to be Jinja for the engine, but nobody maintaining a recipient
  // list should have to type `{{ frappe.db.get_value("User", doc.owner, ...) }}`.
  // These two tokens are swapped in and out around the field so the form shows
  // plain text; anything the user types that isn't a known token is passed
  // through untouched, and Pengaturan Lanjutan still exposes the real Jinja.
  const TOKENS = [
    { friendly: '{nomor PO}', jinja: '{{ doc.name }}' },
    {
      friendly: '{nama pembuat}',
      jinja: '{{ (frappe.db.get_value("User", doc.owner, "full_name") or doc.owner) | trim }}',
    },
  ];

  const toFriendly = (text) => {
    let out = text || '';
    TOKENS.forEach((t) => { out = out.split(t.jinja).join(t.friendly); });
    return out;
  };

  const toJinja = (text) => {
    let out = text || '';
    TOKENS.forEach((t) => { out = out.split(t.friendly).join(t.jinja); });
    return out;
  };

  const preview = (text, sample) => {
    let out = toFriendly(text);
    out = out.split('{nomor PO}').join(sample.nomor);
    out = out.split('{nama pembuat}').join(sample.pembuat);
    return out;
  };

  // Everything the simple view keeps out of the way. The trigger fields are in
  // here on purpose: this rule fires on a workflow_state change because the PO
  // workflow reaches "Pending Approval" while docstatus is still 0 - a
  // deliberate choice, not a dial to turn from the UI.
  const TECHNICAL = [
    'enabled', 'is_standard', 'module', 'channel', 'slack_webhook_url',
    'filters', 'subject', 'event', 'document_type', 'method', 'date_changed',
    'days_in_advance', 'value_changed', 'sender', 'sender_email',
    'send_system_notification', 'notification_type', 'notification_title',
    'notification_message',
    'section_break_9', 'condition', 'column_break_6', 'html_7',
    'property_section', 'set_property_after_alert', 'property_value',
    'column_break_5', 'send_to_all_assignees', 'recipients',
    'message_sb', 'message_type', 'message', 'message_examples',
    'view_properties', 'column_break_25', 'attach_print', 'print_format',
    'column_break_llcs', 'attach_files', 'from_attach_field',
  ];

  const esc = (v) => frappe.utils.escape_html(v || '');

  // Frappe's own indicator says "Enabled"/"Disabled"; keep the page speaking
  // the same language as the panel below it.
  const setIndicator = (frm, on) =>
    frm.page.set_indicator(on ? __('Aktif') : __('Nonaktif'), on ? 'green' : 'gray');
  const firstRow = (frm) => (frm.doc.recipients || [])[0];

  const ensureRow = (frm) => {
    let row = firstRow(frm);
    if (!row) {
      row = frm.add_child('recipients');
      frm.refresh_field('recipients');
    }
    return row;
  };

  const applyVisibility = (frm, advanced) => {
    TECHNICAL.forEach((fieldname) => {
      if (frm.fields_dict[fieldname]) {
        frm.set_df_property(fieldname, 'hidden', advanced ? 0 : 1);
      }
    });
    frm.set_df_property('subject', 'label', advanced ? 'Subject' : 'Judul Email');
    frm.set_df_property('message', 'label', advanced ? 'Message' : 'Isi Email');
    frm.refresh_fields();
  };

  const label = (text) => `
    <label style="display:block;font-size:11px;font-weight:700;color:#6b7280;
                  text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px;">
      ${text}
    </label>`;

  const render = (frm, config) => {
    const row = firstRow(frm) || {};
    const toOwner = (row.receiver_by_document_field || '') === 'owner';
    const on = !!frm.doc.enabled;

    const html = `
      <div class="garage-notif-panel" style="padding:2px 2px 6px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0 0 14px;">
          <input type="checkbox" class="garage-notif-enabled" ${on ? 'checked' : ''}>
          <span style="font-size:13px;color:#1f2937;">Aktifkan notifikasi ini</span>
        </label>

        <div style="display:flex;gap:8px;align-items:flex-start;padding:9px 12px;background:#f8fafc;
                    border-radius:6px;margin-bottom:18px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"
               stroke-linecap="round" style="flex-shrink:0;margin-top:1px;">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <div style="font-size:12px;color:#475569;line-height:1.5;">
            Email dikirim otomatis saat <strong>${esc(config.when)}</strong>.
          </div>
        </div>

        ${label('Kirim ke')}
        <textarea class="garage-notif-to form-control" rows="1"
                  placeholder="nama@perusahaan.co.id, nama2@perusahaan.co.id"
                  style="font-size:13px;min-height:38px;height:38px;resize:vertical;">${esc(row.cc)}</textarea>
        <div style="font-size:11px;color:#94a3b8;margin:5px 0 12px;">
          Pisahkan dengan koma untuk lebih dari satu alamat.
        </div>

        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#1f2937;
                      cursor:pointer;margin-bottom:18px;">
          <input type="checkbox" class="garage-notif-owner" ${toOwner ? 'checked' : ''}>
          Kirim juga ke pembuat PO
        </label>

        ${label('Judul email')}
        <input type="text" class="garage-notif-subject form-control"
               value="${esc(toFriendly(frm.doc.subject))}" style="font-size:13px;">
        <div style="margin:7px 0 0;">
          <span style="font-size:11px;color:#94a3b8;">Sisipkan:</span>
          <button type="button" class="garage-notif-token btn btn-xs btn-default"
                  data-token="{nomor PO}" style="font-size:11px;margin-left:4px;">{nomor PO}</button>
          <button type="button" class="garage-notif-token btn btn-xs btn-default"
                  data-token="{nama pembuat}" style="font-size:11px;">{nama pembuat}</button>
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:8px;padding:7px 10px;background:#f8fafc;border-radius:5px;">
          Contoh hasil: <span class="garage-notif-preview" style="color:#1f2937;font-weight:600;">
            ${esc(preview(frm.doc.subject, config.sample))}</span>
        </div>

        <div style="margin-top:16px;">
          <button type="button" class="garage-notif-body btn btn-default btn-sm" style="font-size:12px;">
            Ubah isi email
          </button>
          <span style="font-size:11px;color:#94a3b8;margin-left:8px;">
            Butuh pengetahuan HTML
          </span>
        </div>
      </div>`;

    const $panel = $(html);

    $panel.find('.garage-notif-enabled').on('change', function () {
      frm.set_value('enabled', this.checked ? 1 : 0);
      setIndicator(frm, this.checked);
    });

    $panel.find('.garage-notif-to').on('change', function () {
      const target = ensureRow(frm);
      frappe.model.set_value(target.doctype, target.name, 'cc', (this.value || '').trim());
    });

    $panel.find('.garage-notif-owner').on('change', function () {
      const target = ensureRow(frm);
      frappe.model.set_value(
        target.doctype, target.name, 'receiver_by_document_field',
        this.checked ? 'owner' : ''
      );
    });

    const $subject = $panel.find('.garage-notif-subject');
    const syncSubject = () => {
      frm.set_value('subject', toJinja($subject.val()));
      $panel.find('.garage-notif-preview').text(preview($subject.val(), config.sample));
    };
    $subject.on('change keyup', syncSubject);

    $panel.find('.garage-notif-token').on('click', function () {
      const token = $(this).data('token');
      const el = $subject.get(0);
      const at = el.selectionStart || $subject.val().length;
      $subject.val($subject.val().slice(0, at) + token + $subject.val().slice(at));
      el.focus();
      syncSubject();
    });

    $panel.find('.garage-notif-body').on('click', () => {
      ['message_sb', 'message_type', 'message'].forEach((f) => {
        if (frm.fields_dict[f]) frm.set_df_property(f, 'hidden', 0);
      });
      frm.refresh_fields();
      frm.scroll_to_field('message');
    });

    frm.dashboard.add_section($panel, null);
  };

  frappe.ui.form.on('Notification', {
    refresh(frm) {
      const config = MANAGED[frm.doc.name];
      if (!config || frm.is_new()) return;

      if (frm._garageAdvanced === undefined) frm._garageAdvanced = false;
      applyVisibility(frm, frm._garageAdvanced);

      if (!frm._garageAdvanced) {
        // Otherwise the page heading is the raw Jinja subject.
        frm.page.set_title(config.title);
        setIndicator(frm, !!frm.doc.enabled);
        render(frm, config);
      }

      frm.add_custom_button(
        frm._garageAdvanced ? __('Tampilan Sederhana') : __('Pengaturan Lanjutan'),
        () => {
          frm._garageAdvanced = !frm._garageAdvanced;
          frm.refresh();
        }
      );
    },
  });
})();
