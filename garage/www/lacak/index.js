frappe.ready(function () {
	var STEP_ORDER = ["queue", "in_progress", "payment", "ready", "done"];
	var STEP_LABELS = {
		queue: "Antrian",
		in_progress: "Diproses",
		payment: "Pembayaran",
		ready: "Siap Diambil",
		done: "Selesai",
	};

	var $ = function (id) {
		return document.getElementById(id);
	};

	var showOnly = function (id) {
		["lacak-search", "lacak-loading", "lacak-not-found", "lacak-error", "lacak-result"].forEach(function (sectionId) {
			$(sectionId).classList.toggle("is-hidden", sectionId !== id);
		});
	};

	var escapeHtml = function (value) {
		var div = document.createElement("div");
		div.textContent = value == null ? "" : String(value);
		return div.innerHTML;
	};

	var formatDate = function (value) {
		if (!value) return "-";
		try {
			return frappe.datetime.str_to_user(String(value).split(" ")[0]);
		} catch (e) {
			return String(value).split(" ")[0];
		}
	};

	var partsHtml = function (parts) {
		if (!parts || !parts.length) return "";
		var items = parts
			.map(function (p) {
				return "<li>" + escapeHtml(p.item_name) + " &times; " + escapeHtml(p.qty) + " " + escapeHtml(p.uom || "") + "</li>";
			})
			.join("");
		return '<div class="lacak-parts"><div class="lacak-field-label">Sparepart / Jasa</div><ul>' + items + "</ul></div>";
	};

	var formatStepTime = function (value) {
		if (!value) return null;
		var parts = String(value).split(" ");
		var datePart = parts[0];
		var timePart = parts[1] ? parts[1].slice(0, 5) : "";
		var dateLabel;
		try {
			dateLabel = frappe.datetime.str_to_user(datePart);
		} catch (e) {
			dateLabel = datePart;
		}
		return { date: dateLabel, time: timePart };
	};

	var stepperHtml = function (order) {
		if (order.step === "cancelled") {
			return '<div class="lacak-cancelled-badge">Dibatalkan</div>';
		}

		var currentIndex = STEP_ORDER.indexOf(order.step);
		var times = order.step_times || {};

		var rows = STEP_ORDER.map(function (step, idx) {
			var state = idx < currentIndex ? "is-complete" : idx === currentIndex ? "is-active" : "is-pending";
			var t = formatStepTime(times[step]);
			var whenHtml = t
				? '<div class="lacak-tl-date">' + t.date + '</div><div class="lacak-tl-time">' + t.time + "</div>"
				: '<div class="lacak-tl-time lacak-tl-time--empty">&mdash;</div>';
			var subLabel =
				idx === currentIndex && order.sub_label
					? '<div class="lacak-tl-sub">' + escapeHtml(order.sub_label) + "</div>"
					: "";

			return (
				'<div class="lacak-tl-row ' + state + '">' +
				'<div class="lacak-tl-when">' + whenHtml + "</div>" +
				'<div class="lacak-tl-node"><div class="lacak-tl-dot"></div><div class="lacak-tl-line"></div></div>' +
				'<div class="lacak-tl-content"><div class="lacak-tl-label">' + STEP_LABELS[step] + "</div>" + subLabel + "</div>" +
				"</div>"
			);
		}).join("");

		return '<div class="lacak-timeline">' + rows + "</div>";
	};

	var detailsHtml = function (order) {
		return (
			'<div class="lacak-order-details">' +
			'<div class="lacak-field"><div class="lacak-field-label">Keluhan</div><div>' + escapeHtml(order.complaint || "-") + "</div></div>" +
			'<div class="lacak-field"><div class="lacak-field-label">Jenis Servis</div><div>' + escapeHtml(order.service_order_type || "-") + "</div></div>" +
			'<div class="lacak-field"><div class="lacak-field-label">Mekanik</div><div>' + escapeHtml(order.assigned_mechanic_name || "-") + "</div></div>" +
			'<div class="lacak-field"><div class="lacak-field-label">Estimasi Selesai</div><div>' + formatDate(order.estimated_completion) + "</div></div>" +
			"</div>" +
			partsHtml(order.required_parts)
		);
	};

	var STATUS_BADGE_CLASS = {
		queue: "lacak-badge--queue",
		in_progress: "lacak-badge--in-progress",
		payment: "lacak-badge--payment",
		ready: "lacak-badge--ready",
		done: "lacak-badge--done",
		cancelled: "lacak-badge--cancelled",
	};

	var historyRowHtml = function (order) {
		var badgeClass = STATUS_BADGE_CLASS[order.step] || "lacak-badge--queue";
		return (
			'<div class="lacak-history-row">' +
			'<div><div class="lacak-history-type">' + escapeHtml(order.service_order_type || order.name) + "</div>" +
			'<div class="text-muted">' + formatDate(order.creation) + "</div></div>" +
			'<span class="lacak-badge ' + badgeClass + '">' + escapeHtml(STEP_LABELS[order.step] || order.status) + "</span>" +
			"</div>"
		);
	};

	var renderResult = function (data) {
		$("lacak-result-plate").textContent = data.vehicle.license_plate;
		$("lacak-result-vehicle").textContent = [data.vehicle.brand, data.vehicle.model, data.vehicle.vehicle_year, data.vehicle.color]
			.filter(Boolean)
			.join(" · ");

		var $timelineWrap = $("lacak-timeline-wrap");
		var $detailsWrap = $("lacak-details-wrap");

		if (!data.current) {
			$timelineWrap.innerHTML = '<div class="lacak-empty">Belum ada riwayat servis untuk kendaraan ini.</div>';
			$detailsWrap.classList.add("is-hidden");
		} else {
			$timelineWrap.innerHTML = stepperHtml(data.current);
			$detailsWrap.innerHTML = detailsHtml(data.current);
			$detailsWrap.classList.remove("is-hidden");
		}

		var $historyWrap = $("lacak-history-wrap");
		if (data.history && data.history.length) {
			$("lacak-history-list").innerHTML = data.history.map(historyRowHtml).join("");
			$historyWrap.classList.remove("is-hidden");
		} else {
			$historyWrap.classList.add("is-hidden");
		}

		showOnly("lacak-result");
	};

	$("lacak-form").addEventListener("submit", function (e) {
		e.preventDefault();
		showOnly("lacak-loading");

		frappe.call({
			type: "POST",
			method: "garage.api.public_tracking.track_service",
			args: {
				license_plate: $("lacak-plate").value,
				phone: $("lacak-phone").value,
			},
			// Frappe shows server _server_messages (e.g. the rate-limit notice)
			// via its own popup by default, regardless of the error callback
			// below - silent:true suppresses that so only our own friendly
			// #lacak-error state is shown.
			silent: true,
			callback: function (r) {
				if (r.message && r.message.found) {
					renderResult(r.message);
				} else {
					showOnly("lacak-not-found");
				}
			},
			error: function () {
				showOnly("lacak-error");
			},
		});
	});

	var resetToSearch = function (e) {
		if (e) e.preventDefault();
		showOnly("lacak-search");
	};

	$("lacak-retry").addEventListener("click", resetToSearch);
	$("lacak-retry-error").addEventListener("click", resetToSearch);
	$("lacak-search-again").addEventListener("click", resetToSearch);
});
