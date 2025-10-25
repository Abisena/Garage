(() => {
    class GaragePortal {
        constructor() {
            this.state = {};
            this.currencyFormatter = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            });
            this.customerIndex = new Map();
            this.vehicleIndex = new Map();
            this.vehicleByName = new Map();
            this.serviceOrderIndex = new Map();
            this.lastPrefilledPlate = null;
            this.customerSearchIndex = new Map();
            this.customerNameMap = new Map();
            this.pendingCustomerLookups = new Set();
        }

        init() {
            this.cacheDom();
            this.bindEvents();
            this.initRepeaters();
            this.fetchBootstrap(false);
        }

        cacheDom() {
            this.forms = {
                intake: document.getElementById('customer-vehicle-form'),
                serviceOrder: document.getElementById('service-order-form'),
                progress: document.getElementById('progress-form'),
                spareOrder: document.getElementById('spare-order-form'),
                procurement: document.getElementById('procurement-form'),
                stockMovement: document.getElementById('stock-movement-form'),
                invoice: document.getElementById('invoice-form'),
                payment: document.getElementById('payment-form'),
                receipt: document.getElementById('receipt-form'),
            };

            this.inputs = {
                licensePlate: document.getElementById('license_plate'),
                existingCustomerSearch: document.getElementById('existing_customer_search'),
            };

            this.datalists = {
                existingCustomer: document.getElementById('existing_customer_options'),
            };

            this.selects = {
                existingCustomer: document.getElementById('existing_customer'),
                vehicleCustomer: document.getElementById('vehicle_customer'),
                serviceCustomer: document.getElementById('service_customer'),
                serviceVehicle: document.getElementById('service_vehicle'),
                progressServiceOrder: document.getElementById('progress_service_order'),
                spareCustomer: document.getElementById('spare_customer'),
                invoiceCustomer: document.getElementById('invoice_customer'),
                paymentCustomer: document.getElementById('payment_customer'),
                receiptPaymentEntry: document.getElementById('receipt_payment_entry'),
            };

            this.tables = {
                customerVehicles: document.querySelector('[data-role="customer-vehicle-table"]'),
                openService: document.querySelector('[data-role="open-service-table"]'),
                spareOrders: document.querySelector('[data-role="spare-table"]'),
                pendingProcurement: document.querySelector('[data-role="pending-procurement-table"]'),
                openInvoices: document.querySelector('[data-role="open-invoice-table"]'),
                payments: document.querySelector('[data-role="payment-table"]'),
            };

            this.lists = {
                serviceNotes: document.querySelector('[data-role="service-note-list"]'),
            };

            this.emptyStates = {
                customerVehicles: document.querySelector('[data-empty="customer-vehicle"]'),
                openService: document.querySelector('[data-empty="open-service"]'),
                spare: document.querySelector('[data-empty="spare"]'),
                pendingProcurement: document.querySelector('[data-empty="pending-procurement"]'),
                openInvoice: document.querySelector('[data-empty="open-invoice"]'),
                payment: document.querySelector('[data-empty="payment"]'),
                serviceNotes: document.querySelector('[data-empty="service-notes"]'),
            };

            this.metrics = {
                serviceEstimate: document.querySelector('[data-metric="service-estimate"]'),
                serviceOpenCount: document.querySelector('[data-metric="service-open-count"]'),
                qcPending: document.querySelector('[data-metric="qc-pending"]'),
                invoiceTotal: document.querySelector('[data-metric="invoice-total"]'),
                outstandingTotal: document.querySelector('[data-metric="outstanding-total"]'),
                paymentsTotal: document.querySelector('[data-metric="payments-total"]'),
            };

            this.statusLists = {};
            document.querySelectorAll('[data-status]').forEach((node) => {
                const key = node.getAttribute('data-status');
                if (!this.statusLists[key]) {
                    this.statusLists[key] = [];
                }
                this.statusLists[key].push(node);
            });

            this.refreshButtons = document.querySelectorAll('[data-action="refresh-portal"]');
            this.refreshedAtLabel = document.querySelector('[data-role="refreshed-at"]');
            this.deskLinks = document.querySelectorAll('[data-desk-link]');

            this.modals = {
                status: document.getElementById('service-status-modal'),
            };

            this.statusModal = {
                container: document.getElementById('service-status-modal'),
                title: document.querySelector('[data-role="status-modal-title"]'),
                summary: document.querySelector('[data-role="status-modal-summary"]'),
                tableBody: document.querySelector('[data-role="status-modal-table"]'),
                tableWrapper: document.querySelector('[data-role="status-modal-table-wrapper"]'),
                emptyState: document.querySelector('[data-role="status-modal-empty"]'),
                closeButtons: document.querySelectorAll('[data-role="status-modal-close"]'),
            };

            const detailModalContainer = document.getElementById('service-detail-modal');
            this.modals.detail = detailModalContainer;
            this.serviceDetailModal = {
                container: detailModalContainer,
                closeButtons: detailModalContainer
                    ? detailModalContainer.querySelectorAll('[data-role="service-detail-close"]')
                    : [],
                summary: detailModalContainer
                    ? detailModalContainer.querySelector('[data-role="service-detail-summary"]')
                    : null,
                fields: detailModalContainer
                    ? {
                          orderName: detailModalContainer.querySelector('[data-detail="order-name"]'),
                          status: detailModalContainer.querySelector('[data-detail="status"]'),
                          priority: detailModalContainer.querySelector('[data-detail="priority"]'),
                          bookingDate: detailModalContainer.querySelector('[data-detail="booking-date"]'),
                          targetDate: detailModalContainer.querySelector('[data-detail="target-date"]'),
                          completionDate: detailModalContainer.querySelector('[data-detail="completion-date"]'),
                          jobCardStatus: detailModalContainer.querySelector('[data-detail="job-card-status"]'),
                          workOrderStatus: detailModalContainer.querySelector('[data-detail="work-order-status"]'),
                          qcStatus: detailModalContainer.querySelector('[data-detail="qc-status"]'),
                          totalEstimate: detailModalContainer.querySelector('[data-detail="total-estimate"]'),
                          totalApproved: detailModalContainer.querySelector('[data-detail="total-approved"]'),
                          customerName: detailModalContainer.querySelector('[data-detail="customer-name"]'),
                          customerType: detailModalContainer.querySelector('[data-detail="customer-type"]'),
                          customerContact: detailModalContainer.querySelector('[data-detail="customer-contact"]'),
                          vehiclePlate: detailModalContainer.querySelector('[data-detail="vehicle-plate"]'),
                          vehicleModel: detailModalContainer.querySelector('[data-detail="vehicle-model"]'),
                          vehicleColor: detailModalContainer.querySelector('[data-detail="vehicle-color"]'),
                          vehicleTransmission: detailModalContainer.querySelector('[data-detail="vehicle-transmission"]'),
                          vehicleFuel: detailModalContainer.querySelector('[data-detail="vehicle-fuel"]'),
                          vehicleMileage: detailModalContainer.querySelector('[data-detail="vehicle-mileage"]'),
                          notes: detailModalContainer.querySelector('[data-detail="notes"]'),
                      }
                    : {},
                actionForm: detailModalContainer
                    ? detailModalContainer.querySelector('[data-role="service-action-form"]')
                    : null,
                actionButton: detailModalContainer
                    ? detailModalContainer.querySelector('[data-role="service-action-submit"]')
                    : null,
            };
        }

        bindEvents() {
            if (this.forms.intake) {
                this.forms.intake.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.intake, [
                        'existing_customer',
                        'customer_type',
                        'customer_name',
                        'phone',
                        'email',
                        'preferred_contact_method',
                        'is_vip',
                        'marketing_source',
                        'vehicle_customer',
                        'license_plate',
                        'brand',
                        'model',
                        'vehicle_year',
                        'color',
                        'transmission',
                        'fuel_type',
                        'mileage',
                        'notes',
                    ]);
                    this.submitForm(this.forms.intake, 'garage.api.portal.register_customer_vehicle', { payload }, 'Data intake tersimpan.');
                });
            }

            if (this.forms.serviceOrder) {
                this.forms.serviceOrder.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.serviceOrder, [
                        'service_order_type',
                        'order_category',
                        'priority',
                        'customer',
                        'vehicle',
                        'service_advisor',
                        'estimated_delivery_date',
                        'total_estimated_amount',
                        'inspection_summary',
                        'service_notes',
                    ]);
                    this.submitForm(this.forms.serviceOrder, 'garage.api.portal.create_service_order', { order: payload }, 'Service order berhasil dibuat.');
                });
            }

            if (this.forms.progress) {
                this.forms.progress.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const name = this.forms.progress.querySelector('[name="name"]').value;
                    if (!name) {
                        frappe.msgprint(__('Pilih service order terlebih dahulu.'));
                        return;
                    }
                    const payload = this.collectFormData(this.forms.progress, [
                        'log_date',
                        'status',
                        'technician',
                        'percent_complete',
                        'progress_notes',
                    ]);
                    this.submitForm(
                        this.forms.progress,
                        'garage.api.portal.append_service_progress',
                        { name, log_entry: payload },
                        'Progres servis ditambahkan.'
                    );
                });
            }

            if (this.forms.spareOrder) {
                this.forms.spareOrder.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.spareOrder, [
                        'customer',
                        'order_date',
                        'pickup_method',
                        'delivery_date',
                        'warehouse',
                        'total_amount',
                        'notes',
                    ]);
                    this.submitForm(this.forms.spareOrder, 'garage.api.portal.create_spare_part_order', { order: payload }, 'Order sparepart dibuat.');
                });
            }

            if (this.forms.procurement) {
                this.forms.procurement.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.procurement, [
                        'reference_type',
                        'reference_name',
                        'supplier',
                        'order_date',
                        'expected_date',
                        'total_qty',
                        'total_amount',
                        'remarks',
                    ]);
                    this.submitForm(this.forms.procurement, 'garage.api.portal.create_procurement_order', { order: payload }, 'Procurement order disimpan.');
                });
            }

            if (this.forms.stockMovement) {
                this.forms.stockMovement.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.stockMovement, [
                        'movement_type',
                        'reference_type',
                        'reference_name',
                        'posting_date',
                        'posting_time',
                        'warehouse',
                        'remarks',
                    ]);
                    this.submitForm(this.forms.stockMovement, 'garage.api.portal.create_stock_movement', { movement: payload }, 'Mutasi stok tersimpan.');
                });
            }

            if (this.forms.invoice) {
                this.forms.invoice.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.invoice, [
                        'customer',
                        'invoice_date',
                        'source_type',
                        'source_name',
                        'due_date',
                        'total_amount',
                        'notes',
                    ]);
                    this.submitForm(this.forms.invoice, 'garage.api.portal.create_sales_invoice', { invoice: payload }, 'Invoice berhasil dibuat.');
                });
            }

            if (this.forms.payment) {
                this.forms.payment.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.payment, [
                        'customer',
                        'payment_date',
                        'mode_of_payment',
                        'reference_no',
                        'reference_date',
                        'paid_amount',
                        'received_amount',
                        'notes',
                    ]);
                    this.submitForm(this.forms.payment, 'garage.api.portal.create_payment_entry', { entry: payload }, 'Payment entry tersimpan.');
                });
            }

            if (this.forms.receipt) {
                this.forms.receipt.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.receipt, [
                        'payment_entry',
                        'receipt_date',
                        'receipt_number',
                        'delivery_method',
                        'issued_by',
                        'notes',
                    ]);
                    this.submitForm(this.forms.receipt, 'garage.api.portal.create_receipt_document', { receipt: payload }, 'Receipt berhasil dibuat.');
                });
            }

            if (this.selects.existingCustomer) {
                this.selects.existingCustomer.addEventListener('change', () => {
                    this.applyExistingCustomerSelection();
                });
            }

            if (this.inputs.existingCustomerSearch) {
                this.inputs.existingCustomerSearch.addEventListener('change', () => {
                    this.handleExistingCustomerSearch();
                });
                this.inputs.existingCustomerSearch.addEventListener('input', (event) => {
                    const value = event.target.value || '';
                    if (!value) {
                        if (this.selects.existingCustomer) {
                            this.setSelectValue(this.selects.existingCustomer, '');
                            this.applyExistingCustomerSelection();
                        }
                        return;
                    }
                    const normalized = value.trim().toLowerCase();
                    const hasExactMatch = this.customerSearchIndex.has(value);
                    const hasNameMatch = this.customerNameMap.has(normalized);
                    if (hasExactMatch || hasNameMatch) {
                        this.handleExistingCustomerSearch();
                    }
                });
            }

            if (this.inputs.licensePlate) {
                this.inputs.licensePlate.addEventListener('change', () => {
                    this.handleLicensePlateChange();
                });
            }

            if (this.selects.serviceCustomer) {
                this.selects.serviceCustomer.addEventListener('change', () => {
                    this.updateServiceVehicleOptions();
                });
            }

            this.refreshButtons.forEach((button) => {
                button.addEventListener('click', () => this.fetchBootstrap());
            });

            if (this.statusModal?.closeButtons) {
                this.statusModal.closeButtons.forEach((button) => {
                    button.addEventListener('click', () => this.closeStatusModal());
                });
            }

            if (this.statusModal?.container) {
                this.statusModal.container.addEventListener('click', (event) => {
                    if (event.target === this.statusModal.container) {
                        this.closeStatusModal();
                    }
                });
            }

            if (this.serviceDetailModal?.closeButtons) {
                this.serviceDetailModal.closeButtons.forEach((button) => {
                    button.addEventListener('click', () => this.closeServiceDetail());
                });
            }

            if (this.serviceDetailModal?.container) {
                this.serviceDetailModal.container.addEventListener('click', (event) => {
                    if (event.target === this.serviceDetailModal.container) {
                        this.closeServiceDetail();
                    }
                });
            }

            if (this.serviceDetailModal?.actionForm) {
                this.serviceDetailModal.actionForm.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.handleServiceAction();
                });
            }
        }

        applyExistingCustomerSelection() {
            const select = this.selects.existingCustomer;
            if (!select) {
                return;
            }
            const value = select.value;
            if (!value) {
                this.updateCustomerSearchInput(null);
                if (this.selects.vehicleCustomer) {
                    this.setSelectValue(this.selects.vehicleCustomer, '');
                }
                this.clearCustomerFields();
                return;
            }
            const customer = this.customerIndex.get(value);
            if (customer) {
                this.prefillCustomerFields(customer);
                this.updateCustomerSearchInput(customer);
            } else {
                const option = select.options[select.selectedIndex];
                if (option && this.inputs.existingCustomerSearch) {
                    this.inputs.existingCustomerSearch.value = option.textContent || option.value;
                } else {
                    this.updateCustomerSearchInput(null);
                }
                this.lookupCustomerByDocname(value);
            }
            if (this.selects.vehicleCustomer) {
                this.setSelectValue(this.selects.vehicleCustomer, value);
            }
        }

        handleLicensePlateChange() {
            if (!this.inputs.licensePlate) {
                return;
            }
            const rawValue = this.inputs.licensePlate.value || '';
            const normalized = this.normalizeLicensePlate(rawValue);
            if (!normalized) {
                this.lastPrefilledPlate = null;
                this.clearVehicleCustomerSelection();
                return;
            }
            const vehicle = this.vehicleIndex.get(normalized);
            if (!vehicle) {
                this.fetchVehicleByPlate(normalized, rawValue);
                return;
            }
            const previousPrefilled = this.lastPrefilledPlate;
            this.lastPrefilledPlate = normalized;
            this.prefillVehicleFields(vehicle);
            if (vehicle.customer && this.selects.existingCustomer) {
                const set = this.setSelectValue(this.selects.existingCustomer, vehicle.customer);
                if (set) {
                    this.applyExistingCustomerSelection();
                } else {
                    const existing = this.customerIndex.get(vehicle.customer);
                    if (existing) {
                        this.ensureCustomerOptions(vehicle.customer, existing.customer_name || vehicle.customer);
                        this.setSelectValue(this.selects.existingCustomer, vehicle.customer);
                        this.prefillCustomerFields(existing);
                    }
                }
            } else if (this.selects.existingCustomer) {
                this.setSelectValue(this.selects.existingCustomer, '');
            }
            if (this.selects.vehicleCustomer) {
                this.setSelectValue(this.selects.vehicleCustomer, vehicle.customer || '');
            }
            if (window.frappe && frappe.show_alert && previousPrefilled !== normalized) {
                frappe.show_alert({
                    message: __('Data kendaraan ditemukan dan terisi otomatis.'),
                    indicator: 'green',
                });
            }
        }

        fetchVehicleByPlate(normalized, rawValue) {
            if (!normalized) {
                return;
            }
            if (!window.frappe || !frappe.call) {
                this.lastPrefilledPlate = null;
                this.clearVehicleCustomerSelection();
                this.notifyPlateNotFound();
                return;
            }
            frappe.call({
                method: 'garage.api.portal.lookup_vehicle_by_plate',
                args: { license_plate: rawValue },
                callback: (response) => {
                    const data = response?.message || {};
                    const vehicle = data.vehicle;
                    if (!vehicle) {
                        this.lastPrefilledPlate = null;
                        this.clearVehicleCustomerSelection();
                        this.notifyPlateNotFound();
                        return;
                    }
                    const previousPrefilled = this.lastPrefilledPlate;
                    this.registerVehicleData(vehicle);
                    this.lastPrefilledPlate = normalized;
                    this.prefillVehicleFields(vehicle);
                    const customerName = vehicle.customer;
                    const customer = data.customer || (customerName ? this.customerIndex.get(customerName) : null);
                    if (customerName) {
                        if (customer) {
                            this.registerCustomerData(customer);
                            this.prefillCustomerFields(customer);
                        } else {
                            this.ensureCustomerOptions(customerName, customerName);
                        }
                        if (this.selects.existingCustomer) {
                            const didSet = this.setSelectValue(this.selects.existingCustomer, customerName);
                            if (didSet) {
                                this.applyExistingCustomerSelection();
                            }
                        }
                        if (this.selects.vehicleCustomer) {
                            this.setSelectValue(this.selects.vehicleCustomer, customerName);
                        }
                    } else {
                        if (this.selects.existingCustomer) {
                            this.setSelectValue(this.selects.existingCustomer, '');
                        }
                        this.clearVehicleCustomerSelection();
                    }
                    if (window.frappe && frappe.show_alert && previousPrefilled !== normalized) {
                        frappe.show_alert({
                            message: __('Data kendaraan ditemukan dan terisi otomatis.'),
                            indicator: 'green',
                        });
                    }
                },
                error: () => {
                    this.lastPrefilledPlate = null;
                    this.clearVehicleCustomerSelection();
                    this.notifyPlateNotFound();
                },
            });
        }

        clearVehicleCustomerSelection() {
            if (this.selects.vehicleCustomer) {
                this.setSelectValue(this.selects.vehicleCustomer, '');
            }
        }

        prefillVehicleFields(vehicle) {
            const form = this.forms.intake;
            if (!form) {
                return;
            }
            if (this.inputs.licensePlate && vehicle.license_plate) {
                this.inputs.licensePlate.value = vehicle.license_plate;
            }
            const mapping = {
                brand: 'brand',
                model: 'model',
                vehicle_year: 'vehicle_year',
                color: 'color',
                transmission: 'transmission',
                fuel_type: 'fuel_type',
                mileage: 'mileage',
            };
            Object.entries(mapping).forEach(([fieldName, sourceKey]) => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (!field) {
                    return;
                }
                const value = vehicle[sourceKey];
                if (field.tagName === 'SELECT') {
                    this.setSelectValue(field, value);
                } else {
                    field.value = value !== undefined && value !== null ? value : '';
                }
            });
        }

        prefillCustomerFields(customer) {
            const form = this.forms.intake;
            if (!form) {
                return;
            }
            const mapping = {
                customer_name: 'customer_name',
                customer_type: 'customer_type',
                phone: 'phone',
                email: 'email',
                preferred_contact_method: 'preferred_contact_method',
                marketing_source: 'marketing_source',
            };
            Object.entries(mapping).forEach(([fieldName, sourceKey]) => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (!field) {
                    return;
                }
                const value = customer[sourceKey];
                if (field.tagName === 'SELECT') {
                    if (!this.setSelectValue(field, value)) {
                        if (field.options && field.options.length) {
                            field.value = field.options[0].value;
                        }
                    }
                } else {
                    field.value = value ?? '';
                }
            });
            const vipField = form.querySelector('[name="is_vip"]');
            if (vipField) {
                const vipValue = customer.is_vip ? '1' : '0';
                this.setSelectValue(vipField, vipValue);
            }
        }

        clearCustomerFields() {
            const form = this.forms.intake;
            if (!form) {
                return;
            }
            const fieldNames = [
                'customer_name',
                'customer_type',
                'phone',
                'email',
                'preferred_contact_method',
                'marketing_source',
            ];
            fieldNames.forEach((fieldName) => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (!field) {
                    return;
                }
                if (field.tagName === 'SELECT') {
                    if (!this.setSelectValue(field, '')) {
                        field.selectedIndex = 0;
                    }
                } else {
                    field.value = '';
                }
            });
            const vipField = form.querySelector('[name="is_vip"]');
            if (vipField) {
                this.setSelectValue(vipField, '0');
            }
        }

        registerVehicleData(vehicle) {
            if (!vehicle) {
                return;
            }
            const normalized = this.normalizeLicensePlate(vehicle.license_plate);
            if (normalized) {
                this.vehicleIndex.set(normalized, vehicle);
            }
        }

        registerCustomerData(customer, { updateSelect = true } = {}) {
            if (!customer || !customer.name) {
                return;
            }
            this.customerIndex.set(customer.name, customer);
            const nameKey = (customer.customer_name || '').trim().toLowerCase();
            if (nameKey) {
                this.customerNameMap.set(nameKey, customer.name);
            }
            const label = this.formatCustomerSearchLabel(customer);
            if (label) {
                this.customerSearchIndex.set(label, customer.name);
                const datalist = this.datalists?.existingCustomer;
                if (datalist) {
                    const hasOption = Array.from(datalist.querySelectorAll('option')).some(
                        (option) => option.value === label
                    );
                    if (!hasOption) {
                        const option = document.createElement('option');
                        option.value = label;
                        datalist.appendChild(option);
                    }
                }
            }
            if (updateSelect) {
                this.ensureCustomerOptions(customer.name, customer.customer_name || customer.name);
            }
        }

        rebuildCustomerSearch(customers) {
            this.customerNameMap = new Map();
            this.customerSearchIndex = new Map();
            const datalist = this.datalists?.existingCustomer;
            if (datalist) {
                datalist.innerHTML = '';
            }
            (customers || []).forEach((customer) => {
                if (!customer) {
                    return;
                }
                const nameKey = (customer.customer_name || '').trim().toLowerCase();
                if (nameKey) {
                    this.customerNameMap.set(nameKey, customer.name);
                }
                const label = this.formatCustomerSearchLabel(customer);
                if (label) {
                    this.customerSearchIndex.set(label, customer.name);
                    if (datalist) {
                        const option = document.createElement('option');
                        option.value = label;
                        datalist.appendChild(option);
                    }
                }
            });
        }

        formatCustomerSearchLabel(customer) {
            if (!customer) {
                return '';
            }
            const name = customer.customer_name || customer.name || '';
            const contact = [customer.phone, customer.email].filter(Boolean).join(' / ');
            return contact ? `${name} · ${contact}` : name;
        }

        updateCustomerSearchInput(customer) {
            if (!this.inputs.existingCustomerSearch) {
                return;
            }
            if (customer) {
                this.inputs.existingCustomerSearch.value = this.formatCustomerSearchLabel(customer);
            } else {
                this.inputs.existingCustomerSearch.value = '';
            }
        }

        handleExistingCustomerSearch() {
            const input = this.inputs.existingCustomerSearch;
            if (!input) {
                return;
            }
            const raw = input.value || '';
            const query = raw.trim();
            if (!query) {
                if (this.selects.existingCustomer) {
                    this.setSelectValue(this.selects.existingCustomer, '');
                    this.applyExistingCustomerSelection();
                }
                return;
            }
            const exactMatch = this.customerSearchIndex.get(raw);
            const normalizedMatch = this.customerNameMap.get(query.toLowerCase());
            const docname = exactMatch || normalizedMatch;
            if (docname) {
                if (this.selects.existingCustomer) {
                    const set = this.setSelectValue(this.selects.existingCustomer, docname);
                    if (!set) {
                        const customer = this.customerIndex.get(docname);
                        const label = customer ? customer.customer_name || customer.name : query;
                        this.ensureCustomerOptions(docname, label);
                        this.setSelectValue(this.selects.existingCustomer, docname);
                    }
                    this.applyExistingCustomerSelection();
                }
                if (this.selects.vehicleCustomer) {
                    this.setSelectValue(this.selects.vehicleCustomer, docname);
                }
                return;
            }
            this.lookupCustomerByName(query);
        }

        lookupCustomerByName(query) {
            if (!query) {
                return;
            }
            if (!window.frappe || !frappe.call) {
                this.notifyCustomerNotFound();
                return;
            }
            frappe.call({
                method: 'garage.api.portal.lookup_customer',
                args: { query },
                callback: (response) => {
                    const data = response?.message || {};
                    const customer = data.customer;
                    if (!customer) {
                        this.notifyCustomerNotFound();
                        return;
                    }
                    this.handleCustomerLookupResult(customer, data.vehicles, { alert: true });
                },
                error: () => {
                    this.notifyCustomerNotFound();
                },
            });
        }

        lookupCustomerByDocname(name) {
            const identifier = (name || '').trim();
            if (!identifier || this.pendingCustomerLookups.has(identifier)) {
                return;
            }
            if (!window.frappe || !frappe.call) {
                return;
            }
            this.pendingCustomerLookups.add(identifier);
            frappe.call({
                method: 'garage.api.portal.lookup_customer',
                args: { name: identifier },
                callback: (response) => {
                    this.pendingCustomerLookups.delete(identifier);
                    const data = response?.message || {};
                    const customer = data.customer;
                    if (!customer) {
                        this.notifyCustomerNotFound();
                        this.clearCustomerFields();
                        return;
                    }
                    this.handleCustomerLookupResult(customer, data.vehicles, { alert: false });
                },
                error: () => {
                    this.pendingCustomerLookups.delete(identifier);
                    this.notifyCustomerNotFound();
                    this.clearCustomerFields();
                },
            });
        }

        handleCustomerLookupResult(customer, vehicles, { alert = false } = {}) {
            if (!customer) {
                this.notifyCustomerNotFound();
                return;
            }
            this.registerCustomerData(customer);
            if (Array.isArray(vehicles)) {
                vehicles.forEach((vehicle) => this.registerVehicleData(vehicle));
            }
            const label = customer.customer_name || customer.name;
            if (this.selects.existingCustomer) {
                this.ensureCustomerOptions(customer.name, label);
                this.setSelectValue(this.selects.existingCustomer, customer.name);
            }
            if (this.selects.vehicleCustomer) {
                this.setSelectValue(this.selects.vehicleCustomer, customer.name);
            }
            this.prefillCustomerFields(customer);
            this.updateCustomerSearchInput(customer);
            if (alert && window.frappe && frappe.show_alert) {
                frappe.show_alert({
                    message: __('Data customer ditemukan dan terisi otomatis.'),
                    indicator: 'green',
                });
            }
        }

        notifyCustomerNotFound() {
            if (window.frappe && frappe.show_alert) {
                frappe.show_alert({
                    message: __('Customer tidak ditemukan. Periksa kembali nama yang dimasukkan.'),
                    indicator: 'yellow',
                });
            }
        }

        normalizeLicensePlate(value) {
            return (value || '')
                .toString()
                .trim()
                .replace(/[^0-9A-Za-z]/g, '')
                .toUpperCase();
        }

        initRepeaters() {
            Object.values(this.forms).forEach((form) => {
                if (!form) {
                    return;
                }
                form.querySelectorAll('[data-repeat]').forEach((group) => {
                    const addButton = group.querySelector('[data-action="add-row"]');
                    const rowsContainer = group.querySelector('[data-role="rows"]');
                    const template = group.querySelector('template[data-role="row-template"]');
                    if (!rowsContainer || !template) {
                        return;
                    }
                    if (addButton) {
                        addButton.addEventListener('click', () => {
                            const fragment = template.content.cloneNode(true);
                            rowsContainer.appendChild(fragment);
                        });
                    }
                    rowsContainer.addEventListener('click', (event) => {
                        const target = event.target;
                        if (target && target.matches('[data-action="remove-row"]')) {
                            const row = target.closest('.repeat-row');
                            if (row) {
                                row.remove();
                            }
                        }
                    });
                });
            });
        }

        fetchBootstrap(showNotification = true) {
            frappe.call({
                method: 'garage.api.portal.portal_bootstrap',
                freeze: true,
                callback: (response) => {
                    if (response?.exc || response?.exception) {
                        this.handleBootstrapFailure(response);
                        return;
                    }
                    this.state = response.message || {};
                    this.render();
                    if (showNotification) {
                        frappe.show_alert({ message: __('Data portal diperbarui.'), indicator: 'green' });
                    }
                },
                error: (error) => {
                    this.handleBootstrapFailure(error);
                },
            });
        }

        render() {
            this.updateDeskLinks();
            this.renderIntakeSection();
            this.renderServiceSection();
            this.renderSpareOrders();
            this.renderProcurement();
            this.renderFinance();
            this.renderStatusSummary();
            this.renderRefreshedAt();
        }

        renderIntakeSection() {
            const customers = this.asArray(this.state.customers);
            const vehicles = this.asArray(this.state.vehicles);

            this.customerIndex = new Map(customers.map((customer) => [customer.name, customer]));
            this.rebuildCustomerSearch(customers);
            this.vehicleIndex = new Map();
            this.vehicleByName = new Map(vehicles.map((vehicle) => [vehicle.name, vehicle]));
            vehicles.forEach((vehicle) => {
                this.registerVehicleData(vehicle);
            });

            this.populateSelect(this.selects.existingCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: '— Customer Baru —',
            });
            this.populateSelect(this.selects.vehicleCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: 'Otomatis sesuai customer di atas',
            });

            this.populateSelect(this.selects.serviceCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: '— Pilih customer —',
            });
            this.populateSelect(this.selects.spareCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: '— Pilih customer —',
            });
            this.populateSelect(this.selects.invoiceCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: '— Pilih customer —',
            });
            this.populateSelect(this.selects.paymentCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: '— Pilih customer —',
            });

            if (this.selects.existingCustomer) {
                const selected = this.selects.existingCustomer.value;
                if (selected) {
                    const selectedCustomer = this.customerIndex.get(selected);
                    this.updateCustomerSearchInput(selectedCustomer || null);
                } else {
                    this.updateCustomerSearchInput(null);
                }
            } else {
                this.updateCustomerSearchInput(null);
            }

            this.updateServiceVehicleOptions();

            const customerMap = this.customerIndex;
            const combinedRows = vehicles.slice(0, 8).map((vehicle) => {
                const customer = customerMap.get(vehicle.customer);
                const customerLink = this.renderLink(
                    'Garage Customer',
                    customer?.name || vehicle.customer,
                    this.getCustomerDisplayName(customer, vehicle)
                );
                const model = [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '-';
                const serviceTimestamp = vehicle.last_service_logged_at || vehicle.last_service_date || vehicle.creation;
                return [
                    customerLink,
                    this.getVipTypeLabel(customer),
                    this.createContactCell(customer),
                    this.getVipStatusLabel(customer),
                    this.renderLink('Garage Vehicle', vehicle.name, vehicle.license_plate || vehicle.name),
                    model,
                    this.formatTimestamp(serviceTimestamp),
                ];
            });

            if (!combinedRows.length) {
                customers.slice(0, 8).forEach((customer) => {
                    combinedRows.push([
                        this.renderLink(
                            'Garage Customer',
                            customer.name,
                            this.getCustomerDisplayName(customer)
                        ),
                        this.getVipTypeLabel(customer),
                        this.createContactCell(customer),
                        this.getVipStatusLabel(customer),
                        '—',
                        '—',
                        '—',
                    ]);
                });
            }

            this.renderTable(
                this.tables.customerVehicles,
                combinedRows,
                (row) => row,
                this.emptyStates.customerVehicles
            );
        }

        getCustomerDisplayName(customer, vehicle) {
            if (customer?.customer_name) {
                return customer.customer_name;
            }
            if (customer?.customer_full_name) {
                return customer.customer_full_name;
            }
            if (customer?.full_name) {
                return customer.full_name;
            }
            if (customer?.display_name) {
                return customer.display_name;
            }
            if (vehicle?.customer_name) {
                return vehicle.customer_name;
            }
            if (vehicle?.customer_display_name) {
                return vehicle.customer_display_name;
            }
            if (vehicle?.customer_title) {
                return vehicle.customer_title;
            }
            if (customer?.name && customer?.name !== vehicle?.customer) {
                return customer.name;
            }
            return vehicle?.customer || customer?.name || '-';
        }

        getVipTypeLabel(customer) {
            if (!customer) {
                return '-';
            }
            return customer.is_vip ? 'VIP' : 'Reguler';
        }

        getVipStatusLabel(customer) {
            if (!customer) {
                return '-';
            }
            return customer.is_vip ? 'Iya' : 'Tidak';
        }

        createContactCell(customer) {
            const container = document.createElement('div');
            container.className = 'table-contact';
            const phone = (customer?.phone || '').trim();
            const email = (customer?.email || '').trim();
            if (phone) {
                const phoneLine = document.createElement('div');
                phoneLine.textContent = phone;
                container.appendChild(phoneLine);
            }
            if (email) {
                const emailLine = document.createElement('div');
                emailLine.textContent = email;
                container.appendChild(emailLine);
            }
            if (!container.childNodes.length) {
                container.textContent = '-';
            }
            return container;
        }

        renderServiceSection() {
            const serviceOrders = this.asArray(this.state.service_orders);
            const openService = this.asArray(this.state.open_service_orders);
            this.cachedServiceOrders = serviceOrders;
            this.serviceOrderIndex = new Map(serviceOrders.map((order) => [order.name, order]));

            const totalEstimate = serviceOrders.reduce((acc, row) => acc + (parseFloat(row.total_estimated_amount) || 0), 0);
            const qcPending = serviceOrders.filter((row) => (row.qc_status || '').toLowerCase() === 'pending').length;

            this.updateMetric(this.metrics.serviceEstimate, totalEstimate);
            if (this.metrics.serviceOpenCount) {
                this.metrics.serviceOpenCount.textContent = openService.length.toString();
            }
            if (this.metrics.qcPending) {
                this.metrics.qcPending.textContent = qcPending.toString();
            }

            this.renderTable(
                this.tables.openService,
                serviceOrders,
                (order) => {
                    const customer = this.customerIndex.get(order.customer) || {};
                    const statusPill = this.createStatusPill(order.status);
                    const priorityPill = this.createPriorityPill(order.priority);
                    const actionButton = this.createDetailButton(order.name);
                    return [
                        this.renderLink('Garage Service Order', order.name),
                        customer.customer_name || order.customer || '-',
                        this.getVehicleLabel(order.vehicle),
                        statusPill,
                        priorityPill,
                        this.formatTimestamp(order.estimated_delivery_date),
                        actionButton,
                    ];
                },
                this.emptyStates.openService,
            );

            this.renderServiceNotes(serviceOrders);
        }

        renderServiceNotes(serviceOrders) {
            const list = this.lists?.serviceNotes;
            if (!list) {
                return;
            }
            const notes = serviceOrders.filter((order) => order.service_notes).slice(0, 5);
            list.innerHTML = '';
            list.style.display = notes.length ? 'flex' : 'none';
            if (!notes.length) {
                if (this.emptyStates?.serviceNotes) {
                    this.emptyStates.serviceNotes.style.display = 'block';
                }
                return;
            }
            if (this.emptyStates?.serviceNotes) {
                this.emptyStates.serviceNotes.style.display = 'none';
            }
            notes.forEach((order) => {
                const item = document.createElement('li');
                item.className = 'note-list__item';

                const header = document.createElement('div');
                header.className = 'note-list__header';
                const orderLabel = document.createElement('span');
                orderLabel.className = 'note-list__order';
                orderLabel.textContent = order.name;
                const timestamp = document.createElement('span');
                timestamp.className = 'note-list__timestamp';
                timestamp.textContent = this.formatTimestamp(order.service_booking_date);
                header.append(orderLabel, timestamp);

                const body = document.createElement('p');
                body.className = 'note-list__body';
                body.textContent = order.service_notes;

                const meta = document.createElement('div');
                meta.className = 'note-list__meta';
                const customer = this.customerIndex.get(order.customer);
                const customerSpan = document.createElement('span');
                customerSpan.textContent = customer?.customer_name || order.customer || '-';
                const vehicleSpan = document.createElement('span');
                vehicleSpan.textContent = this.getVehicleLabel(order.vehicle);
                meta.append(customerSpan, vehicleSpan);

                item.append(header, body, meta);
                list.appendChild(item);
            });
        }

        createDetailButton(orderName) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'table-action';
            button.textContent = 'Detail';
            button.addEventListener('click', () => this.openServiceDetail(orderName));
            return button;
        }

        createStatusPill(status) {
            const variant = this.getStatusVariant(status);
            return this.buildPill(status || '-', variant);
        }

        createPriorityPill(priority) {
            const variant = this.getPriorityVariant(priority);
            return this.buildPill(priority || '-', variant);
        }

        buildPill(label, variant = 'neutral') {
            const pill = document.createElement('span');
            const normalized = variant || 'neutral';
            pill.className = 'status-pill';
            pill.textContent = label || '-';
            pill.classList.add(normalized && normalized !== 'neutral' ? `status-pill--${normalized}` : 'status-pill--neutral');
            return pill;
        }

        getStatusVariant(status) {
            const normalized = (status || '').toLowerCase();
            if (!normalized) {
                return 'neutral';
            }
            if (normalized.includes('complete') || normalized.includes('done') || normalized.includes('finish')) {
                return 'success';
            }
            if (normalized.includes('cancel') || normalized.includes('reject')) {
                return 'danger';
            }
            if (normalized.includes('pending') || normalized.includes('await') || normalized.includes('hold')) {
                return 'warning';
            }
            if (normalized.includes('progress') || normalized.includes('active') || normalized.includes('open')) {
                return 'info';
            }
            return 'neutral';
        }

        getPriorityVariant(priority) {
            const normalized = (priority || '').toLowerCase();
            if (normalized === 'critical') {
                return 'danger';
            }
            if (normalized === 'high') {
                return 'warning';
            }
            if (normalized === 'low') {
                return 'info';
            }
            return 'neutral';
        }

        renderSpareOrders() {
            const spareOrders = this.asArray(this.state.spare_orders);
            this.renderTable(this.tables.spareOrders, spareOrders, (row) => [
                this.renderLink('Garage Spare Part Order', row.name),
                row.customer || '-',
                row.status || '-',
                row.delivery_date || '-',
            ], this.emptyStates.spare);
        }

        renderProcurement() {
            const pending = this.asArray(this.state.pending_procurement);
            this.renderTable(this.tables.pendingProcurement, pending, (row) => [
                this.renderLink('Garage Procurement Order', row.name),
                row.supplier || '-',
                row.status || '-',
                row.expected_date || '-',
            ], this.emptyStates.pendingProcurement);
        }

        renderFinance() {
            const invoices = this.asArray(this.state.open_invoices);
            const payments = this.asArray(this.state.payment_entries);

            const totals = this.state.totals || {};
            this.updateMetric(this.metrics.invoiceTotal, totals.invoice_total || 0);
            this.updateMetric(this.metrics.outstandingTotal, totals.outstanding_total || 0);
            this.updateMetric(this.metrics.paymentsTotal, totals.payments_total || 0);

            this.renderTable(this.tables.openInvoices, invoices, (row) => [
                this.renderLink('Garage Sales Invoice', row.name),
                row.customer || '-',
                row.due_date || '-',
                this.currencyFormatter.format(parseFloat(row.outstanding_amount) || 0),
            ], this.emptyStates.openInvoice);

            this.renderTable(this.tables.payments, payments, (row) => [
                this.renderLink('Garage Payment Entry', row.name),
                row.customer || '-',
                row.payment_date || '-',
                row.mode_of_payment || '-',
            ], this.emptyStates.payment);

            const receiptOptions = payments.map((row) => ({
                value: row.name,
                label: `${row.name} – ${row.customer || '-'}`,
            }));
            this.populateSelect(this.selects.receiptPaymentEntry, receiptOptions, {
                blankLabel: '— Pilih payment entry —',
            });
        }

        renderStatusSummary() {
            const summary = this.state.status_summary || {};
            Object.entries(summary).forEach(([key, data]) => {
                this.renderStatusList(key.replace(/_/g, '-'), data);
            });
        }

        renderStatusList(key, summary) {
            const lists = this.statusLists[key];
            if (!lists) {
                return;
            }
            lists.forEach((list) => {
                list.innerHTML = '';
                const entries = Object.entries(summary || {});
                if (!entries.length) {
                    const item = document.createElement('li');
                    item.textContent = __('Tidak ada data');
                    list.appendChild(item);
                    return;
                }
                entries.forEach(([status, total]) => {
                    const item = document.createElement('li');
                    const label = document.createElement('span');
                    label.textContent = status || __('Tidak diketahui');
                    const value = document.createElement('span');
                    value.className = 'badge';
                    value.textContent = total;
                    item.appendChild(label);
                    item.appendChild(value);
                    if (key === 'service-orders') {
                        item.classList.add('status-list__item--interactive');
                        item.setAttribute('role', 'button');
                        item.setAttribute('tabindex', '0');
                        const openModal = () => this.openServiceStatusModal(status);
                        item.addEventListener('click', openModal);
                        item.addEventListener('keydown', (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openModal();
                            }
                        });
                    }
                    list.appendChild(item);
                });
            });
        }

        renderTable(table, rows, rowRenderer, emptyState) {
            if (!table) {
                return;
            }
            table.innerHTML = '';
            if (!rows.length) {
                if (emptyState) {
                    emptyState.style.display = 'block';
                }
                return;
            }
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            rows.forEach((row) => {
                const tr = document.createElement('tr');
                rowRenderer(row).forEach((cellValue) => {
                    const td = document.createElement('td');
                    if (cellValue instanceof HTMLElement) {
                        td.appendChild(cellValue);
                    } else {
                        td.innerHTML = cellValue ?? '-';
                    }
                    tr.appendChild(td);
                });
                table.appendChild(tr);
            });
        }

        handleBootstrapFailure(error) {
            if (window.frappe && frappe.show_alert) {
                frappe.show_alert({
                    message: __('Gagal memuat data portal. Pastikan Anda sudah login lalu coba lagi.'),
                    indicator: 'red',
                });
            }
            if (window.console && console.error) {
                console.error('Garage portal bootstrap failed', error);
            }
            this.state = {};
            this.render();
            this.showTableStatus(
                this.tables.customerVehicles,
                __('Tidak dapat memuat data master. Silakan refresh halaman.'),
                this.emptyStates.customerVehicles
            );
        }

        showTableStatus(table, message, emptyState) {
            if (!table) {
                return;
            }
            const columns = this.getColumnCount(table);
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = columns;
            cell.textContent = message;
            cell.style.textAlign = 'center';
            cell.style.padding = '2rem';
            cell.style.color = 'var(--text-muted)';
            row.appendChild(cell);
            table.innerHTML = '';
            table.appendChild(row);
            if (emptyState) {
                emptyState.style.display = 'none';
            }
        }

        getColumnCount(tableBody) {
            const table = tableBody ? tableBody.closest('table') : null;
            if (table) {
                const headers = table.querySelectorAll('thead th');
                if (headers.length) {
                    return headers.length;
                }
            }
            const sampleRow = tableBody ? tableBody.querySelector('tr') : null;
            if (sampleRow) {
                return sampleRow.children.length || 1;
            }
            return 1;
        }

        asArray(value) {
            if (Array.isArray(value)) {
                return value;
            }
            if (!value) {
                return [];
            }
            if (typeof value === 'object') {
                return Object.values(value);
            }
            return [];
        }

        openServiceStatusModal(status) {
            if (!this.statusModal?.container) {
                return;
            }

            const safeStatus = status || __('Tidak diketahui');
            const normalizedStatus = (status || '').toLowerCase();
            const matching = this.cachedServiceOrders.filter(
                (order) => (order.status || '').toLowerCase() === normalizedStatus
            );

            if (this.statusModal.title) {
                this.statusModal.title.textContent = `Detail Status Servis – ${safeStatus}`;
            }

            if (this.statusModal.summary) {
                if (matching.length) {
                    const totalEstimate = matching.reduce(
                        (sum, order) => sum + (parseFloat(order.total_estimated_amount) || 0),
                        0
                    );
                    this.statusModal.summary.textContent = `${matching.length} service order dengan status ${safeStatus}. Total estimasi pekerjaan ${this.currencyFormatter.format(totalEstimate)}.`;
                } else {
                    this.statusModal.summary.textContent = `Tidak ada service order dengan status ${safeStatus}.`;
                }
            }

            if (this.statusModal.tableBody) {
                this.statusModal.tableBody.innerHTML = '';
            }

            if (matching.length && this.statusModal.tableBody) {
                matching.forEach((order) => {
                    const row = document.createElement('tr');
                    const cells = [
                        this.renderLink('Garage Service Order', order.name),
                        order.customer || '-',
                        order.vehicle || '-',
                        order.priority || '-',
                        order.status || '-',
                        this.formatTimestamp(order.service_booking_date),
                        this.formatTimestamp(order.estimated_delivery_date),
                        this.formatTimestamp(order.actual_delivery_date),
                        order.qc_status || '-',
                    ];
                    cells.forEach((cellValue) => {
                        const cell = document.createElement('td');
                        if (cellValue instanceof HTMLElement) {
                            cell.appendChild(cellValue);
                        } else {
                            cell.textContent = cellValue;
                        }
                        row.appendChild(cell);
                    });
                    this.statusModal.tableBody.appendChild(row);
                });
            }

            if (this.statusModal.tableWrapper) {
                this.statusModal.tableWrapper.style.display = matching.length ? 'block' : 'none';
            }
            if (this.statusModal.emptyState) {
                this.statusModal.emptyState.classList.toggle('is-visible', !matching.length);
            }

            this.previousFocus = document.activeElement;
            this.statusModal.container.classList.add('is-open');
            this.statusModal.container.setAttribute('aria-hidden', 'false');
            this.bodyOverflowCache = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', this.handleStatusModalKeydown);

            const closeButton = this.statusModal.container.querySelector('.portal-modal__close');
            if (closeButton) {
                closeButton.focus();
            }
        }

        closeStatusModal() {
            if (!this.statusModal?.container) {
                return;
            }
            this.statusModal.container.classList.remove('is-open');
            this.statusModal.container.setAttribute('aria-hidden', 'true');
            document.removeEventListener('keydown', this.handleStatusModalKeydown);
            if (typeof this.bodyOverflowCache === 'string') {
                document.body.style.overflow = this.bodyOverflowCache;
            } else {
                document.body.style.removeProperty('overflow');
            }
            if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
                this.previousFocus.focus();
            }
        }

        handleStatusModalKeydown(event) {
            if (event.key === 'Escape') {
                this.closeStatusModal();
            }
        }

        openServiceDetail(orderName) {
            if (!this.serviceDetailModal?.container) {
                return;
            }
            const order = this.serviceOrderIndex.get(orderName);
            if (!order) {
                if (window.frappe && frappe.msgprint) {
                    frappe.msgprint(__('Data service order tidak ditemukan.'));
                }
                return;
            }
            this.populateServiceDetail(order);
            this.serviceDetailModal.currentOrder = order.name;
            if (this.serviceDetailModal.actionForm) {
                this.serviceDetailModal.actionForm.dataset.order = order.name;
            }
            this.previousFocus = document.activeElement;
            this.bodyOverflowCache = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', this.boundDetailKeydown);
            this.serviceDetailModal.container.classList.add('is-open');
            this.serviceDetailModal.container.setAttribute('aria-hidden', 'false');
            const focusTarget = this.serviceDetailModal.actionButton || this.serviceDetailModal.container.querySelector('.portal-modal__close');
            if (focusTarget) {
                focusTarget.focus();
            }
        }

        closeServiceDetail() {
            if (!this.serviceDetailModal?.container) {
                return;
            }
            this.serviceDetailModal.container.classList.remove('is-open');
            this.serviceDetailModal.container.setAttribute('aria-hidden', 'true');
            document.removeEventListener('keydown', this.boundDetailKeydown);
            if (typeof this.bodyOverflowCache === 'string') {
                document.body.style.overflow = this.bodyOverflowCache;
            } else {
                document.body.style.removeProperty('overflow');
            }
            if (this.serviceDetailModal.actionForm) {
                this.serviceDetailModal.actionForm.dataset.order = '';
            }
            this.serviceDetailModal.currentOrder = null;
            if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
                this.previousFocus.focus();
            }
        }

        handleDetailModalKeydown(event) {
            if (event.key === 'Escape') {
                this.closeServiceDetail();
            }
        }

        populateServiceDetail(order) {
            const fields = this.serviceDetailModal?.fields || {};
            const customer = this.customerIndex.get(order.customer) || {};
            const vehicle = this.getVehicleByName(order.vehicle);
            const customerName = customer.customer_name || order.customer || '-';
            const vehicleLabel = this.getVehicleLabel(order.vehicle);

            this.setPillState(fields.status, order.status || '-', this.getStatusVariant(order.status));
            this.setPillState(fields.priority, order.priority || '-', this.getPriorityVariant(order.priority));
            this.setFieldValue(fields.orderName, order.name);
            this.setFieldValue(fields.bookingDate, this.formatTimestamp(order.service_booking_date));
            this.setFieldValue(fields.targetDate, this.formatTimestamp(order.estimated_delivery_date));
            this.setFieldValue(fields.completionDate, this.formatTimestamp(order.actual_delivery_date));
            this.setFieldValue(fields.jobCardStatus, order.job_card_status || '-');
            this.setFieldValue(fields.workOrderStatus, order.work_order_status || '-');
            this.setFieldValue(fields.qcStatus, order.qc_status || '-');
            this.setFieldValue(fields.totalEstimate, this.currencyFormatter.format(parseFloat(order.total_estimated_amount) || 0));
            this.setFieldValue(fields.totalApproved, this.currencyFormatter.format(parseFloat(order.total_approved_amount) || 0));
            this.setFieldValue(fields.customerName, customerName);
            this.setFieldValue(fields.customerType, customer.customer_type || '-');
            const contactInfo = [customer.phone, customer.email].filter(Boolean).join(' • ');
            this.setFieldValue(fields.customerContact, contactInfo || '-');
            this.setFieldValue(fields.vehiclePlate, vehicle?.license_plate || vehicleLabel || '-');
            const modelInfo = [vehicle?.brand, vehicle?.model, vehicle?.vehicle_year].filter(Boolean).join(' ');
            this.setFieldValue(fields.vehicleModel, modelInfo || vehicleLabel || '-');
            this.setFieldValue(fields.vehicleColor, vehicle?.color || '-');
            this.setFieldValue(fields.vehicleTransmission, vehicle?.transmission || '-');
            this.setFieldValue(fields.vehicleFuel, vehicle?.fuel_type || '-');
            const mileage = vehicle?.mileage ? `${vehicle.mileage} km` : '-';
            this.setFieldValue(fields.vehicleMileage, mileage);
            this.setFieldValue(fields.notes, order.service_notes || 'Tidak ada catatan registrasi.');

            if (this.serviceDetailModal?.summary) {
                this.serviceDetailModal.summary.textContent = `Service order ${order.name} milik ${customerName} – ${vehicleLabel}`;
            }

            this.prefillServiceActionForm(order.name);
        }

        setPillState(element, label, variant = 'neutral') {
            if (!element) {
                return;
            }
            element.textContent = label || '-';
            element.className = 'status-pill';
            const normalized = variant || 'neutral';
            element.classList.add(normalized !== 'neutral' ? `status-pill--${normalized}` : 'status-pill--neutral');
        }

        setFieldValue(element, value) {
            if (!element) {
                return;
            }
            element.textContent = value ?? '-';
        }

        getVehicleLabel(vehicleName) {
            const vehicle = this.getVehicleByName(vehicleName);
            if (!vehicle) {
                return vehicleName || '-';
            }
            const parts = [vehicle.license_plate, vehicle.brand, vehicle.model, vehicle.vehicle_year]
                .filter(Boolean)
                .map((part) => String(part).trim());
            return parts.length ? parts.join(' – ') : vehicleName || '-';
        }

        getVehicleByName(vehicleName) {
            if (!vehicleName) {
                return null;
            }
            const byName = this.vehicleByName?.get(vehicleName);
            if (byName) {
                return byName;
            }
            const vehicles = this.asArray(this.state.vehicles);
            return vehicles.find((vehicle) => vehicle.name === vehicleName) || null;
        }

        prefillServiceActionForm(orderName) {
            const form = this.serviceDetailModal?.actionForm;
            if (!form) {
                return;
            }
            const draft = this.serviceActionDrafts.get(orderName) || {};
            const fields = ['service_type', 'problem_category', 'purchase_type', 'payment_method', 'action_notes'];
            fields.forEach((fieldname) => {
                const input = form.querySelector(`[name="${fieldname}"]`);
                if (!input) {
                    return;
                }
                const value = draft[fieldname] ?? '';
                if (input.tagName === 'SELECT') {
                    this.setSelectValue(input, value);
                } else {
                    input.value = value;
                }
            });
        }

        handleServiceAction() {
            const form = this.serviceDetailModal?.actionForm;
            if (!form) {
                return;
            }
            const orderName = this.serviceDetailModal?.currentOrder;
            if (!orderName) {
                if (window.frappe && frappe.msgprint) {
                    frappe.msgprint(__('Pilih registrasi servis terlebih dahulu.'));
                }
                return;
            }
            const payload = {};
            ['service_type', 'problem_category', 'purchase_type', 'payment_method', 'action_notes'].forEach((fieldname) => {
                const input = form.querySelector(`[name="${fieldname}"]`);
                if (!input) {
                    return;
                }
                if (input.tagName === 'SELECT') {
                    payload[fieldname] = input.value || '';
                } else {
                    payload[fieldname] = input.value || '';
                }
            });
            this.serviceActionDrafts.set(orderName, payload);
            if (window.frappe && frappe.show_alert) {
                frappe.show_alert({ message: __('Draft aksi servis tersimpan.'), indicator: 'green' });
            }
        }

        renderLink(doctype, name, label) {
            const link = document.createElement('a');
            link.href = this.getFormRoute(doctype, name);
            link.target = '_blank';
            link.textContent = label || name;
            return link;
        }

        formatTimestamp(value) {
            if (!value) {
                return '-';
            }
            try {
                return frappe.datetime.str_to_user(value);
            } catch (error) {
                return value;
            }
        }

        updateMetric(node, value) {
            if (!node) {
                return;
            }
            const numeric = parseFloat(value) || 0;
            node.textContent = this.currencyFormatter.format(numeric);
        }

        collectFormData(form, fields) {
            const data = {};
            fields.forEach((fieldname) => {
                const input = form.querySelector(`[name="${fieldname}"]`);
                if (!input) {
                    return;
                }
                const value = this.readInputValue(input);
                if (value !== null && value !== '') {
                    data[fieldname] = value;
                }
            });

            form.querySelectorAll('[data-repeat]').forEach((group) => {
                const key = group.getAttribute('data-repeat');
                const rows = [];
                group.querySelectorAll('.repeat-row').forEach((row) => {
                    const payload = {};
                    row.querySelectorAll('[data-field]').forEach((input) => {
                        const fieldname = input.getAttribute('data-field');
                        const value = this.readInputValue(input);
                        if (value !== null && value !== '') {
                            payload[fieldname] = value;
                        }
                    });
                    if (Object.keys(payload).length) {
                        rows.push(payload);
                    }
                });
                if (rows.length) {
                    data[key] = rows;
                }
            });

            return data;
        }

        readInputValue(input) {
            if (input.type === 'checkbox') {
                return input.checked;
            }
            const raw = input.value;
            if (raw === '') {
                return null;
            }
            const cast = input.dataset.cast;
            if (cast === 'float') {
                return parseFloat(raw);
            }
            if (cast === 'int') {
                return parseInt(raw, 10);
            }
            return raw;
        }

        submitForm(form, method, args, successMessage) {
            const primaryButton = form.querySelector('button.primary');
            if (primaryButton) {
                primaryButton.disabled = true;
            }
            frappe.call({
                method,
                args,
                freeze: true,
                callback: () => {
                    frappe.show_alert({ message: __(successMessage), indicator: 'green' });
                    this.resetForm(form);
                    this.fetchBootstrap(false);
                },
                always: () => {
                    if (primaryButton) {
                        primaryButton.disabled = false;
                    }
                },
            });
        }

        resetForm(form) {
            form.reset();
            form.querySelectorAll('[data-repeat]').forEach((group) => {
                const rowsContainer = group.querySelector('[data-role="rows"]');
                if (rowsContainer) {
                    rowsContainer.innerHTML = '';
                }
            });
            if (form === this.forms.intake) {
                this.updateCustomerSearchInput(null);
            }
        }

        updateServiceVehicleOptions() {
            const select = this.selects.serviceVehicle;
            if (!select) {
                return;
            }
            const vehicles = this.asArray(this.state.vehicles);
            const selectedCustomer = this.selects.serviceCustomer ? this.selects.serviceCustomer.value : '';
            const options = vehicles
                .filter((vehicle) => !selectedCustomer || vehicle.customer === selectedCustomer)
                .map((vehicle) => ({
                    value: vehicle.name,
                    label: [vehicle.license_plate, vehicle.brand, vehicle.model].filter(Boolean).join(' – '),
                }));
            this.populateSelect(select, options, { blankLabel: '— Pilih kendaraan —' });
        }

        setSelectValue(select, value) {
            if (!select) {
                return false;
            }
            const normalizedValue = value === undefined || value === null ? '' : String(value);
            const options = Array.from(select.options || []);
            const match = options.find((option) => option.value === normalizedValue);
            if (match) {
                select.value = normalizedValue;
                return true;
            }
            if (!normalizedValue) {
                select.value = '';
                return true;
            }
            return false;
        }

        addOptionIfMissing(select, value, label) {
            if (!select) {
                return;
            }
            const normalizedValue = value === undefined || value === null ? '' : String(value);
            if (!normalizedValue) {
                return;
            }
            const options = Array.from(select.options || []);
            if (options.some((option) => option.value === normalizedValue)) {
                return;
            }
            const option = document.createElement('option');
            option.value = normalizedValue;
            option.textContent = label || normalizedValue;
            select.appendChild(option);
        }

        ensureCustomerOptions(value, label) {
            if (!value) {
                return;
            }
            const normalizedValue = String(value);
            const displayLabel = label || normalizedValue;
            this.addOptionIfMissing(this.selects.existingCustomer, normalizedValue, displayLabel);
            this.addOptionIfMissing(this.selects.vehicleCustomer, normalizedValue, displayLabel);
        }

        notifyPlateNotFound() {
            if (window.frappe && frappe.show_alert) {
                frappe.show_alert({
                    message: __('Nomor polisi belum terdaftar. Lengkapi data kendaraan secara manual.'),
                    indicator: 'yellow',
                });
            }
        }

        populateSelect(select, rows, { valueKey = 'value', labelKey = 'label', blankLabel = '—' } = {}) {
            if (!select) {
                return;
            }
            const previous = select.value;
            select.innerHTML = '';
            const blank = document.createElement('option');
            blank.value = '';
            blank.textContent = blankLabel;
            select.appendChild(blank);
            (rows || []).forEach((row) => {
                const option = document.createElement('option');
                const value = row[valueKey];
                option.value = value;
                option.textContent = row[labelKey] || value;
                select.appendChild(option);
            });
            if (previous && select.querySelector(`option[value="${previous}"]`)) {
                select.value = previous;
            }
        }

        renderRefreshedAt() {
            if (!this.refreshedAtLabel || !this.state.refreshed_at) {
                return;
            }
            try {
                this.refreshedAtLabel.textContent = frappe.datetime.str_to_user(this.state.refreshed_at);
            } catch (error) {
                this.refreshedAtLabel.textContent = this.state.refreshed_at;
            }
        }

        updateDeskLinks() {
            const routes = this.state.desk_routes || {};
            this.deskLinks.forEach((link) => {
                const doctype = link.getAttribute('data-desk-link');
                const route = routes[doctype];
                if (route) {
                    link.href = route.list;
                }
            });
        }

        getFormRoute(doctype, name) {
            const routes = this.state.desk_routes || {};
            const route = routes[doctype];
            if (route && route.form) {
                return route.form.replace('{name}', encodeURIComponent(name));
            }
            return `/app/${frappe.scrub(doctype)}/${encodeURIComponent(name)}`;
        }
    }

    frappe.ready(() => {
        const portal = new GaragePortal();
        portal.init();
    });
})();
