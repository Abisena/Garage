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
            this.vehicleOptionIndex = new Map();
            this.lastPrefilledPlate = null;
            this.customerSearchIndex = new Map();
            this.customerNameMap = new Map();
            this.sparePartIndex = new Map();
            this.sparePartCatalog = [];
            this.filteredSpareParts = [];
            this.currentSparePart = null;
            this.creatingSparePart = false;
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
                sparePartDetail: document.getElementById('spare-detail-form'),
            };

            this.inputs = {
                licensePlate: document.getElementById('license_plate'),
                existingCustomerSearch: document.getElementById('existing_customer_search'),
                spareSearch: document.querySelector('[data-role="spare-search"]'),
            };

            this.datalists = {
                existingCustomer: document.getElementById('existing_customer_options'),
                licensePlates: document.getElementById('license_plate_options'),
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
                spareRequests: document.querySelector('[data-role="spare-request-table"]'),
                spareInventory: document.querySelector('[data-role="spare-inventory-table"]'),
                pendingProcurement: document.querySelector('[data-role="pending-procurement-table"]'),
                openInvoices: document.querySelector('[data-role="open-invoice-table"]'),
                payments: document.querySelector('[data-role="payment-table"]'),
            };

            this.emptyStates = {
                customerVehicles: document.querySelector('[data-empty="customer-vehicle"]'),
                openService: document.querySelector('[data-empty="open-service"]'),
                spare: document.querySelector('[data-empty="spare"]'),
                spareRequests: document.querySelector('[data-empty="spare-requests"]'),
                spareInventory: document.querySelector('[data-empty="spare-inventory"]'),
                pendingProcurement: document.querySelector('[data-empty="pending-procurement"]'),
                openInvoice: document.querySelector('[data-empty="open-invoice"]'),
                payment: document.querySelector('[data-empty="payment"]'),
            };

            this.buttons = {
                createSparePart: document.querySelector('[data-action="create-spare-part"]'),
            };

            this.spareDetail = {
                panel: document.querySelector('[data-role="spare-detail-panel"]'),
                title: document.querySelector('[data-role="spare-detail-title"]'),
                image: document.querySelector('[data-role="spare-preview"]'),
                name: document.querySelector('[data-role="spare-preview-name"]'),
                meta: document.querySelector('[data-role="spare-preview-meta"]'),
                status: document.querySelector('[data-role="spare-status-badge"]'),
            };

            this.metrics = {
                serviceEstimate: document.querySelector('[data-metric="service-estimate"]'),
                serviceOpenCount: document.querySelector('[data-metric="service-open-count"]'),
                qcPending: document.querySelector('[data-metric="qc-pending"]'),
                spareCount: document.querySelector('[data-metric="spare-count"]'),
                spareRequestCount: document.querySelector('[data-metric="spare-request-count"]'),
                spareLowStock: document.querySelector('[data-metric="spare-low-stock"]'),
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

            if (this.forms.sparePartDetail) {
                this.forms.sparePartDetail.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.submitSparePartDetail();
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
                    if (!event.target.value && this.selects.existingCustomer) {
                        this.setSelectValue(this.selects.existingCustomer, '');
                        this.applyExistingCustomerSelection();
                    }
                });
            }

            if (this.inputs.spareSearch) {
                this.inputs.spareSearch.addEventListener('input', (event) => {
                    this.applySpareSearch(event.target.value || '');
                });
            }

            if (this.buttons.createSparePart) {
                this.buttons.createSparePart.addEventListener('click', () => {
                    this.startCreateSparePart();
                });
            }

            if (this.tables.spareInventory) {
                this.tables.spareInventory.addEventListener('click', (event) => {
                    const row = event.target.closest('tr[data-part-name]');
                    if (row) {
                        this.selectSparePart(row.getAttribute('data-part-name'));
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
                return;
            }
            const customer = this.customerIndex.get(value);
            if (customer && !this.isCustomerProfileIncomplete(customer)) {
                this.prefillCustomerFields(customer);
                this.updateCustomerSearchInput(customer);
            } else {
                this.fetchCustomerDetailsByName(value);
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
                            this.ensureLicensePlateOption(vehicle);
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

        registerVehicleData(vehicle) {
            if (!vehicle) {
                return;
            }
            const normalized = this.normalizeLicensePlate(vehicle.license_plate);
            if (!normalized) {
                return;
            }
            this.vehicleIndex.set(normalized, vehicle);
            this.ensureLicensePlateOption(vehicle);
        }

        ensureLicensePlateOption(vehicle) {
            const datalist = this.datalists?.licensePlates;
            if (!datalist || !vehicle || !vehicle.license_plate) {
                return;
            }
            const normalized = this.normalizeLicensePlate(vehicle.license_plate);
            if (!normalized) {
                return;
            }
            const label = this.formatVehicleOptionLabel(vehicle);
            let option = this.vehicleOptionIndex.get(normalized);
            if (!option) {
                option = document.createElement('option');
                option.dataset.plate = normalized;
                datalist.appendChild(option);
                this.vehicleOptionIndex.set(normalized, option);
            }
            option.value = vehicle.license_plate;
            option.label = label;
            option.textContent = label;
        }

        formatVehicleOptionLabel(vehicle) {
            if (!vehicle) {
                return '';
            }
            const plate = vehicle.license_plate || '';
            const explicitName = vehicle.customer_name || vehicle.customer_display_name;
            const customerName = explicitName || this.lookupCustomerDisplayName(vehicle.customer);
            if (customerName) {
                return `${plate} — ${customerName}`;
            }
            return plate;
        }

        lookupCustomerDisplayName(customerName) {
            if (!customerName) {
                return '';
            }
            const customer = this.customerIndex.get(customerName);
            if (!customer) {
                return customerName;
            }
            return customer.customer_name || customer.name || customerName;
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

        isCustomerProfileIncomplete(customer) {
            if (!customer) {
                return true;
            }
            const requiredKeys = [
                'customer_name',
                'customer_type',
                'phone',
                'email',
                'preferred_contact_method',
                'marketing_source',
                'is_vip',
            ];
            return requiredKeys.some((key) => !(key in customer));
        }

        fetchCustomerDetailsByName(name) {
            if (!name) {
                this.updateCustomerSearchInput(null);
                return;
            }
            if (!window.frappe || !frappe.call) {
                this.updateCustomerSearchInput(null);
                this.notifyCustomerNotFound();
                return;
            }
            frappe.call({
                method: 'garage.api.portal.lookup_customer',
                args: { name },
                callback: (response) => {
                    const data = response?.message || {};
                    const customer = data.customer;
                    if (!customer) {
                        this.notifyCustomerNotFound();
                        return;
                    }
                    this.registerCustomerData(customer);
                    if (Array.isArray(data.vehicles)) {
                        data.vehicles.forEach((vehicle) => this.registerVehicleData(vehicle));
                    }
                    this.prefillCustomerFields(customer);
                    this.updateCustomerSearchInput(customer);
                },
                error: () => {
                    this.notifyCustomerNotFound();
                },
            });
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
                    this.registerCustomerData(customer);
                    if (Array.isArray(data.vehicles)) {
                        data.vehicles.forEach((vehicle) => this.registerVehicleData(vehicle));
                    }
                    if (this.selects.existingCustomer) {
                        const set = this.setSelectValue(this.selects.existingCustomer, customer.name);
                        if (!set) {
                            this.ensureCustomerOptions(customer.name, customer.customer_name || customer.name);
                            this.setSelectValue(this.selects.existingCustomer, customer.name);
                        }
                        this.applyExistingCustomerSelection();
                    } else {
                        this.updateCustomerSearchInput(customer);
                    }
                    if (this.selects.vehicleCustomer) {
                        this.setSelectValue(this.selects.vehicleCustomer, customer.name);
                    }
                    if (window.frappe && frappe.show_alert) {
                        frappe.show_alert({
                            message: __('Data customer ditemukan dan terisi otomatis.'),
                            indicator: 'green',
                        });
                    }
                },
                error: () => {
                    this.notifyCustomerNotFound();
                },
            });
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

                    const payload = response?.message;
                    const message = (payload && typeof payload === 'object' && !Array.isArray(payload)
                        ? payload.message || payload
                        : {});

                    this.state = message && typeof message === 'object' && !Array.isArray(message) ? message : {};

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
            this.vehicleOptionIndex = new Map();
            if (this.datalists?.licensePlates) {
                this.datalists.licensePlates.innerHTML = '';
            }
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
                const contact = customer ? [customer.phone, customer.email].filter(Boolean).join(' / ') : '';
                const model = [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '-';
                const serviceTimestamp = vehicle.last_service_logged_at || vehicle.last_service_date || vehicle.creation;
                return [
                    this.renderLink(
                        'Garage Customer',
                        customer?.name || vehicle.customer,
                        customer?.customer_name || vehicle.customer || '-'
                    ),
                    customer?.customer_type || '-',
                    contact || '-',
                    customer?.is_vip ? 'Ya' : 'Tidak',
                    this.renderLink('Garage Vehicle', vehicle.name, vehicle.license_plate || vehicle.name),
                    model,
                    this.formatTimestamp(serviceTimestamp),
                ];
            });

            if (!combinedRows.length) {
                customers.slice(0, 8).forEach((customer) => {
                    const contact = [customer.phone, customer.email].filter(Boolean).join(' / ');
                    combinedRows.push([
                        this.renderLink('Garage Customer', customer.name, customer.customer_name || customer.name),
                        customer.customer_type || '-',
                        contact || '-',
                        customer.is_vip ? 'Ya' : 'Tidak',
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

        renderServiceSection() {
            const serviceOrders = this.asArray(this.state.service_orders);
            const openService = this.asArray(this.state.open_service_orders);
            this.cachedServiceOrders = serviceOrders;

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
                openService,
                (row) => {
                    const noteCell = document.createElement('div');
                    noteCell.className = 'table-note';
                    if (row.service_notes) {
                        noteCell.textContent = row.service_notes;
                        noteCell.title = row.service_notes;
                    } else {
                        noteCell.textContent = '-';
                    }
                    return [
                        this.renderLink('Garage Service Order', row.name),
                        row.customer || '-',
                        noteCell,
                        row.status || '-',
                        row.estimated_delivery_date || '-',
                    ];
                },
                this.emptyStates.openService,
            );

            const progressOptions = serviceOrders.map((row) => ({ value: row.name, label: `${row.name} – ${row.customer || '-'}` }));
            this.populateSelect(this.selects.progressServiceOrder, progressOptions, {
                blankLabel: '— Pilih service order —',
            });
        }

        updateSpareMetrics() {
            const totalParts = this.sparePartCatalog ? this.sparePartCatalog.length : 0;
            const requestTotal = this.asArray(this.state.spare_part_requests).length;
            const lowStockTotal = (this.sparePartCatalog || []).filter((part) => this.isLowStock(part)).length;

            if (this.metrics.spareCount) {
                this.metrics.spareCount.textContent = totalParts.toString();
            }
            if (this.metrics.spareRequestCount) {
                this.metrics.spareRequestCount.textContent = requestTotal.toString();
            }
            if (this.metrics.spareLowStock) {
                this.metrics.spareLowStock.textContent = lowStockTotal.toString();
            }
        }

        renderSpareOrders() {
            const spareOrders = this.asArray(this.state.spare_orders);
            if (this.tables.spareOrders) {
                this.renderTable(this.tables.spareOrders, spareOrders, (row) => [
                    this.renderLink('Garage Spare Part Order', row.name),
                    row.customer || '-',
                    row.status || '-',
                    row.delivery_date || '-',
                ], this.emptyStates.spare);
            }

            this.sparePartCatalog = this.asArray(this.state.spare_parts);
            this.sparePartIndex = new Map();
            this.sparePartCatalog.forEach((part) => {
                if (part?.name) {
                    this.sparePartIndex.set(part.name, part);
                }
                if (part?.part_code) {
                    this.sparePartIndex.set(part.part_code, part);
                }
            });

            const serviceOrders = this.asArray(this.state.service_orders);
            this.renderSpareRequestsTable(serviceOrders);

            this.updateSpareMetrics();

            const searchValue = this.inputs.spareSearch ? this.inputs.spareSearch.value || '' : '';
            this.applySpareSearch(searchValue, false);
        }

        renderSpareRequestsTable(serviceOrders) {
            const table = this.tables.spareRequests;
            if (!table) {
                return;
            }

            const requests = this.asArray(this.state.spare_part_requests);
            table.innerHTML = '';
            if (!requests.length) {
                if (this.emptyStates.spareRequests) {
                    this.emptyStates.spareRequests.style.display = 'block';
                }
                return;
            }
            if (this.emptyStates.spareRequests) {
                this.emptyStates.spareRequests.style.display = 'none';
            }

            const serviceIndex = new Map(serviceOrders.map((order) => [order.name, order]));

            requests.forEach((request) => {
                const order = serviceIndex.get(request.parent) || {};
                const part = this.lookupSparePart(request.item_code) || this.lookupSparePart(request.item_name) || {};

                const tr = document.createElement('tr');
                tr.className = 'spare-request-row';
                if (request?.name) {
                    tr.setAttribute('data-request-name', request.name);
                }

                const orderCell = document.createElement('td');
                orderCell.className = 'spare-request-cell spare-request-cell--order';
                orderCell.appendChild(this.renderLink('Garage Service Order', request.parent, request.parent || '-'));
                const orderMeta = document.createElement('div');
                orderMeta.className = 'table-meta';
                orderMeta.textContent = order.customer || '-';
                orderCell.appendChild(orderMeta);
                tr.appendChild(orderCell);

                const partCell = document.createElement('td');
                partCell.className = 'spare-request-cell spare-request-cell--part';
                const nameEl = document.createElement('div');
                nameEl.className = 'spare-part-name';
                nameEl.textContent = request.item_name || part.part_name || request.item_code || '-';
                partCell.appendChild(nameEl);
                const codeMeta = document.createElement('div');
                codeMeta.className = 'table-meta';
                codeMeta.textContent = request.item_code || part.part_code || __('Manual');
                partCell.appendChild(codeMeta);
                if (part.category) {
                    const categoryMeta = document.createElement('div');
                    categoryMeta.className = 'table-meta';
                    categoryMeta.textContent = part.category;
                    partCell.appendChild(categoryMeta);
                }
                if (request.description) {
                    const desc = document.createElement('div');
                    desc.className = 'table-note';
                    desc.textContent = request.description;
                    partCell.appendChild(desc);
                }
                tr.appendChild(partCell);

                const qtyCell = document.createElement('td');
                qtyCell.className = 'spare-request-cell spare-request-cell--qty';
                const qtyValue = document.createElement('div');
                qtyValue.className = 'metric-text';
                const qty = parseFloat(request.qty) || 0;
                const uom = request.uom || part.uom || '';
                qtyValue.textContent = `${qty} ${uom}`.trim();
                qtyCell.appendChild(qtyValue);
                const stockMeta = document.createElement('div');
                stockMeta.className = 'table-meta';
                const availableNumeric = parseFloat(part.stock_qty);
                const available = this.formatStockValue(part.stock_qty);
                stockMeta.textContent = available ? `${__('Stok')}: ${available}` : __('Stok tidak diketahui');
                qtyCell.appendChild(stockMeta);
                tr.appendChild(qtyCell);

                const statusCell = document.createElement('td');
                statusCell.className = 'spare-request-cell spare-request-cell--status';
                statusCell.appendChild(this.createStatusBadge(request.stock_status || part.status));
                const statusMeta = document.createElement('div');
                statusMeta.className = 'table-meta';
                const statusParts = [];
                if (request.source) {
                    statusParts.push(request.source);
                }
                if (request.warehouse || part.warehouse_location) {
                    statusParts.push(request.warehouse || part.warehouse_location);
                }
                if (order.priority) {
                    statusParts.push(`${__('Prioritas')}: ${order.priority}`);
                }
                if (this.isOutOfStock(part)) {
                    statusParts.push(__('Stok habis'));
                } else if (this.isLowStock(part)) {
                    statusParts.push(__('Stok menipis'));
                }
                statusMeta.textContent = statusParts.filter(Boolean).join(' • ') || __('-');
                statusCell.appendChild(statusMeta);
                tr.appendChild(statusCell);

                const managerCell = document.createElement('td');
                managerCell.className = 'spare-request-cell spare-request-cell--manager';
                const technicianRows = this.asArray(request.technicians);
                const technicianNames = technicianRows
                    .map((row) => (row && (row.technician_name || row.technician)) || '')
                    .filter(Boolean);

                if (technicianNames.length) {
                    const primary = document.createElement('div');
                    primary.className = 'metric-text';
                    primary.textContent = technicianNames.join(', ');
                    managerCell.appendChild(primary);

                    const assignmentDetails = technicianRows
                        .map((row) => {
                            if (!row) {
                                return '';
                            }
                            const details = [];
                            if (row.task) {
                                details.push(row.task);
                            }
                            if (row.status) {
                                details.push(row.status);
                            }
                            return details.join(' • ');
                        })
                        .filter(Boolean);

                    if (assignmentDetails.length) {
                        const taskMeta = document.createElement('div');
                        taskMeta.className = 'table-meta';
                        taskMeta.textContent = assignmentDetails.join(', ');
                        managerCell.appendChild(taskMeta);
                    }
                } else if (part.managed_by) {
                    managerCell.textContent = part.managed_by;
                } else {
                    managerCell.textContent = __('Belum ditetapkan');
                }
                tr.appendChild(managerCell);

                const actionsCell = document.createElement('td');
                actionsCell.className = 'spare-request-cell spare-request-cell--actions';
                const actionsWrapper = document.createElement('div');
                actionsWrapper.className = 'request-actions';

                const approveDisabled = !Number.isFinite(availableNumeric) || availableNumeric < qty;
                const actionConfigs = [
                    { action: 'approve', label: __('Approve'), className: 'primary small', disabled: approveDisabled },
                    { action: 'reject', label: __('Reject'), className: 'danger small' },
                    { action: 'cancel', label: __('Cancel'), className: 'ghost small' },
                ];

                actionConfigs.forEach((config) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = config.className;
                    button.textContent = config.label;
                    button.dataset.requestAction = config.action;
                    if (config.disabled) {
                        button.disabled = true;
                        button.title = __('Sparepart belum tersedia atau stok tidak mencukupi');
                    }
                    button.addEventListener('click', () => this.handleSpareRequestAction(request, config.action, button));
                    actionsWrapper.appendChild(button);
                });

                actionsCell.appendChild(actionsWrapper);
                tr.appendChild(actionsCell);

                table.appendChild(tr);
            });
        }

        handleSpareRequestAction(request, action, button) {
            const requestName = request?.name;
            if (!requestName) {
                frappe.show_alert({ message: __('Permintaan tidak valid.'), indicator: 'orange' }, 5);
                return;
            }

            const confirmMessages = {
                approve: __('Setujui permintaan ini? Stok gudang akan berkurang otomatis.'),
                reject: __('Tolak permintaan sparepart ini?'),
                cancel: __('Batalkan permintaan sparepart ini?'),
                default: __('Lanjutkan aksi ini?'),
            };

            const executeAction = async () => {
                try {
                    if (button) {
                        button.disabled = true;
                    }
                    const response = await frappe.call({
                        method: 'garage.api.portal.update_spare_part_request_status',
                        args: { name: requestName, action },
                        freeze: true,
                        freeze_message: __('Memproses permintaan...'),
                    });
                    const payload = response?.message || {};
                    const indicatorMap = { approve: 'green', reject: 'red', cancel: 'orange' };
                    frappe.show_alert(
                        {
                            message: payload.message || __('Permintaan diperbarui.'),
                            indicator: indicatorMap[action] || 'green',
                        },
                        5,
                    );
                    this.fetchBootstrap(false);
                } catch (error) {
                    frappe.show_alert({ message: __('Gagal memproses: {0}', [error.message || error]), indicator: 'red' }, 5);
                } finally {
                    if (button) {
                        button.disabled = false;
                        button.blur();
                    }
                }
            };

            const confirmation = confirmMessages[action] || confirmMessages.default;
            if (frappe.confirm) {
                frappe.confirm(confirmation, () => executeAction());
            } else if (window.confirm(confirmation)) {
                executeAction();
            }
        }

        applySpareSearch(query = '', preserveSelection = true) {
            const normalized = (query || '').toString().toLowerCase().trim();
            if (!normalized) {
                this.filteredSpareParts = [...this.sparePartCatalog];
            } else {
                this.filteredSpareParts = this.sparePartCatalog.filter((part) => {
                    const haystack = [
                        part.part_code,
                        part.part_name,
                        part.category,
                        part.brand,
                        part.warehouse_location,
                        part.managed_by,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    return haystack.includes(normalized);
                });
            }

            this.renderSpareInventoryTable();

            const currentName = this.currentSparePart?.name;
            const stillVisible = currentName && this.filteredSpareParts.some((part) => part.name === currentName);

            if (!preserveSelection || !stillVisible) {
                const first = this.filteredSpareParts[0];
                if (first) {
                    this.selectSparePart(first.name, { focusForm: false, silent: true });
                } else {
                    this.currentSparePart = null;
                    this.renderSpareDetail(null);
                    this.highlightSelectedSpare(null);
                }
            } else {
                this.highlightSelectedSpare(currentName);
            }
        }

        renderSpareInventoryTable() {
            const table = this.tables.spareInventory;
            if (!table) {
                return;
            }

            table.innerHTML = '';
            const parts = this.filteredSpareParts || [];
            if (!parts.length) {
                if (this.emptyStates.spareInventory) {
                    this.emptyStates.spareInventory.style.display = 'block';
                }
                return;
            }
            if (this.emptyStates.spareInventory) {
                this.emptyStates.spareInventory.style.display = 'none';
            }

            parts.forEach((part) => {
                const tr = document.createElement('tr');
                tr.className = 'inventory-row';
                if (part?.name) {
                    tr.setAttribute('data-part-name', part.name);
                }
                const outOfStock = this.isOutOfStock(part);
                const lowStock = this.isLowStock(part);
                if (outOfStock) {
                    tr.classList.add('inventory-row--critical');
                } else if (lowStock) {
                    tr.classList.add('inventory-row--low');
                }

                const infoCell = document.createElement('td');
                infoCell.className = 'inventory-cell inventory-cell--info';
                const infoWrapper = document.createElement('div');
                infoWrapper.className = 'inventory-info';
                if (part.image) {
                    const thumb = document.createElement('div');
                    thumb.className = 'inventory-thumb';
                    thumb.style.backgroundImage = `url('${encodeURI(part.image)}')`;
                    infoWrapper.appendChild(thumb);
                } else {
                    const thumb = document.createElement('div');
                    thumb.className = 'inventory-thumb is-empty';
                    thumb.textContent = '🧩';
                    infoWrapper.appendChild(thumb);
                }
                const textWrapper = document.createElement('div');
                textWrapper.className = 'inventory-info__text';
                const title = document.createElement('div');
                title.className = 'inventory-name';
                title.textContent = part.part_name || part.part_code || '-';
                textWrapper.appendChild(title);
                const metaLine = document.createElement('div');
                metaLine.className = 'table-meta';
                const metaParts = [part.part_code, part.category].filter(Boolean);
                metaLine.textContent = metaParts.length ? metaParts.join(' • ') : __('Tidak ada kategori');
                textWrapper.appendChild(metaLine);
                if (part.brand) {
                    const brandMeta = document.createElement('div');
                    brandMeta.className = 'table-meta';
                    brandMeta.textContent = part.brand;
                    textWrapper.appendChild(brandMeta);
                }
                infoWrapper.appendChild(textWrapper);
                infoCell.appendChild(infoWrapper);
                tr.appendChild(infoCell);

                const stockCell = document.createElement('td');
                stockCell.className = 'inventory-cell inventory-cell--stock';
                const available = document.createElement('div');
                available.className = 'metric-text';
                available.textContent = this.formatStockValue(part.stock_qty) || '0';
                stockCell.appendChild(available);
                const reserved = document.createElement('div');
                reserved.className = 'table-meta';
                reserved.textContent = `${__('Reservasi')}: ${this.formatStockValue(part.reserved_qty) || '0'}`;
                stockCell.appendChild(reserved);
                if (part.reorder_level) {
                    const reorderMeta = document.createElement('div');
                    reorderMeta.className = 'table-meta';
                    reorderMeta.textContent = `${__('Batas Reorder')}: ${this.formatStockValue(part.reorder_level)}`;
                    stockCell.appendChild(reorderMeta);
                }
                if (outOfStock) {
                    const alert = document.createElement('div');
                    alert.className = 'stock-alert stock-alert--critical';
                    alert.textContent = `⚠️ ${__('Stok habis – perlu restock')}`;
                    stockCell.appendChild(alert);
                } else if (lowStock) {
                    const alert = document.createElement('div');
                    alert.className = 'stock-alert stock-alert--low';
                    alert.textContent = `⚠️ ${__('Stok menipis')}`;
                    stockCell.appendChild(alert);
                }
                tr.appendChild(stockCell);

                const priceCell = document.createElement('td');
                priceCell.className = 'inventory-cell inventory-cell--price';
                const priceValue = document.createElement('div');
                priceValue.className = 'metric-text';
                priceValue.textContent = this.currencyFormatter.format(parseFloat(part.unit_price) || 0);
                priceCell.appendChild(priceValue);
                const priceMeta = document.createElement('div');
                priceMeta.className = 'table-meta';
                priceMeta.textContent = part.last_restocked_on
                    ? this.formatTimestamp(part.last_restocked_on)
                    : __('Belum pernah restock');
                priceCell.appendChild(priceMeta);
                tr.appendChild(priceCell);

                const metaCell = document.createElement('td');
                metaCell.className = 'inventory-cell inventory-cell--meta';
                metaCell.appendChild(this.createStatusBadge(part.status || 'Active'));
                const metaInfo = document.createElement('div');
                metaInfo.className = 'table-meta';
                const metaText = [part.warehouse_location, part.managed_by]
                    .filter(Boolean)
                    .join(' • ');
                metaInfo.textContent = metaText || __('Tidak ada info gudang');
                metaCell.appendChild(metaInfo);
                tr.appendChild(metaCell);

                table.appendChild(tr);
            });

            this.highlightSelectedSpare(this.currentSparePart?.name);
        }

        renderSpareDetail(part) {
            const form = this.forms.sparePartDetail;
            if (!form) {
                return;
            }

            if (!part) {
                this.resetSpareDetailForm();
                return;
            }

            this.populateSpareDetailForm(part);

            if (this.spareDetail.title) {
                this.spareDetail.title.textContent = __('Detail Sparepart');
            }
            if (this.spareDetail.name) {
                this.spareDetail.name.textContent = part.part_name || part.part_code || '-';
            }
            if (this.spareDetail.meta) {
                this.spareDetail.meta.textContent = [
                    part.category,
                    part.brand,
                    part.warehouse_location,
                ]
                    .filter(Boolean)
                    .join(' • ');
            }
            if (this.spareDetail.status) {
                this.spareDetail.status.innerHTML = '';
                this.spareDetail.status.appendChild(this.createStatusBadge(part.status || 'Active'));
                if (this.isOutOfStock(part)) {
                    const alert = document.createElement('div');
                    alert.className = 'stock-alert stock-alert--critical';
                    alert.textContent = `⚠️ ${__('Stok habis – perlu restock')}`;
                    this.spareDetail.status.appendChild(alert);
                } else if (this.isLowStock(part)) {
                    const alert = document.createElement('div');
                    alert.className = 'stock-alert stock-alert--low';
                    alert.textContent = `⚠️ ${__('Stok menipis')}`;
                    this.spareDetail.status.appendChild(alert);
                }
            }
            if (this.spareDetail.image) {
                if (part.image) {
                    this.spareDetail.image.style.backgroundImage = `url('${encodeURI(part.image)}')`;
                    this.spareDetail.image.classList.remove('is-empty');
                } else {
                    this.spareDetail.image.style.backgroundImage = '';
                    this.spareDetail.image.classList.add('is-empty');
                }
            }
        }

        populateSpareDetailForm(part) {
            const form = this.forms.sparePartDetail;
            if (!form) {
                return;
            }
            const fields = [
                'name',
                'part_code',
                'part_name',
                'category',
                'brand',
                'uom',
                'unit_price',
                'stock_qty',
                'reserved_qty',
                'reorder_level',
                'warehouse_location',
                'managed_by',
                'status',
                'last_restocked_on',
                'image',
                'notes',
            ];
            fields.forEach((field) => {
                const input = form.querySelector(`[name="${field}"]`);
                if (!input) {
                    return;
                }
                const value = part[field];
                if (value === undefined || value === null) {
                    input.value = '';
                } else {
                    input.value = value;
                }
            });
        }

        resetSpareDetailForm() {
            const form = this.forms.sparePartDetail;
            if (!form) {
                return;
            }
            form.reset();
            const nameInput = form.querySelector('[name="name"]');
            if (nameInput) {
                nameInput.value = '';
            }
            const statusInput = form.querySelector('[name="status"]');
            if (statusInput) {
                statusInput.value = 'Active';
            }
            const uomInput = form.querySelector('[name="uom"]');
            if (uomInput) {
                uomInput.value = 'Unit';
            }
            if (this.spareDetail.title) {
                this.spareDetail.title.textContent = __('Tambah Sparepart');
            }
            if (this.spareDetail.name) {
                this.spareDetail.name.textContent = __('Sparepart baru');
            }
            if (this.spareDetail.meta) {
                this.spareDetail.meta.textContent = __('Lengkapi detail di formulir.');
            }
            if (this.spareDetail.status) {
                this.spareDetail.status.innerHTML = '';
            }
            if (this.spareDetail.image) {
                this.spareDetail.image.style.backgroundImage = '';
                this.spareDetail.image.classList.add('is-empty');
            }
        }

        highlightSelectedSpare(name) {
            if (!this.tables.spareInventory) {
                return;
            }
            this.tables.spareInventory.querySelectorAll('tr').forEach((row) => {
                if (name && row.getAttribute('data-part-name') === name) {
                    row.classList.add('is-selected');
                } else {
                    row.classList.remove('is-selected');
                }
            });
        }

        lookupSparePart(key) {
            if (!key) {
                return null;
            }
            return this.sparePartIndex.get(key) || null;
        }

        startCreateSparePart() {
            this.creatingSparePart = true;
            this.currentSparePart = null;
            this.highlightSelectedSpare(null);
            this.resetSpareDetailForm();
            if (this.inputs.spareSearch) {
                this.inputs.spareSearch.value = '';
            }
            this.filteredSpareParts = [...this.sparePartCatalog];
            this.renderSpareInventoryTable();
        }

        selectSparePart(name, options = {}) {
            if (!name) {
                return;
            }
            const part = this.lookupSparePart(name);
            if (!part) {
                return;
            }
            this.creatingSparePart = false;
            this.currentSparePart = part;
            this.renderSpareDetail(part);
            this.highlightSelectedSpare(part.name);
            if (options.focusForm !== false && this.forms.sparePartDetail) {
                const focusField = this.forms.sparePartDetail.querySelector('[name="stock_qty"]');
                if (focusField) {
                    focusField.focus();
                }
            }
        }

        async submitSparePartDetail() {
            const form = this.forms.sparePartDetail;
            if (!form) {
                return;
            }
            const nameInput = form.querySelector('[name="name"]');
            const existingName = nameInput?.value?.trim();
            const fields = [
                'part_code',
                'part_name',
                'category',
                'brand',
                'uom',
                'unit_price',
                'stock_qty',
                'reserved_qty',
                'reorder_level',
                'warehouse_location',
                'managed_by',
                'status',
                'last_restocked_on',
                'image',
                'notes',
            ];
            const payload = this.collectFormData(form, fields);
            if (!existingName && !payload.part_code) {
                frappe.show_alert({ message: __('Masukkan kode sparepart terlebih dahulu.'), indicator: 'orange' });
                const codeField = form.querySelector('[name="part_code"]');
                codeField?.focus();
                return;
            }

            const primaryButton = form.querySelector('button.primary');
            if (primaryButton) {
                primaryButton.disabled = true;
            }

            const method = existingName ? 'garage.api.portal.update_spare_part' : 'garage.api.portal.create_spare_part';
            const args = existingName ? { name: existingName, updates: payload } : { part: payload };

            try {
                const response = await frappe.call({ method, args, freeze: true });
                const message = response?.message || {};
                frappe.show_alert({
                    message: existingName ? __('Sparepart diperbarui.') : __('Sparepart baru ditambahkan.'),
                    indicator: 'green',
                });
                this.updateSparePartState(existingName, payload, message);
            } catch (error) {
                frappe.show_alert({ message: __('Gagal menyimpan sparepart.'), indicator: 'red' });
                if (window.console) {
                    console.error('Spare part save failed', error);
                }
            } finally {
                if (primaryButton) {
                    primaryButton.disabled = false;
                }
            }
        }

        updateSparePartState(existingName, payload, responseMessage) {
            const docname = responseMessage?.name || existingName || payload.part_code;
            if (!docname) {
                return;
            }
            const partCode = responseMessage?.part_code || payload.part_code || existingName;
            const merged = { ...(this.lookupSparePart(existingName) || {}), ...payload };
            merged.name = docname;
            if (partCode) {
                merged.part_code = partCode;
            }
            if (Object.prototype.hasOwnProperty.call(responseMessage, 'stock_qty')) {
                merged.stock_qty = responseMessage.stock_qty;
            }
            if (Object.prototype.hasOwnProperty.call(responseMessage, 'unit_price')) {
                merged.unit_price = responseMessage.unit_price;
            }

            const index = this.sparePartCatalog.findIndex((part) => part.name === docname || part.name === existingName);
            if (index >= 0) {
                this.sparePartCatalog.splice(index, 1, merged);
            } else {
                this.sparePartCatalog.push(merged);
            }
            this.state.spare_parts = [...this.sparePartCatalog];
            this.sparePartIndex = new Map();
            this.sparePartCatalog.forEach((part) => {
                if (part?.name) {
                    this.sparePartIndex.set(part.name, part);
                }
                if (part?.part_code) {
                    this.sparePartIndex.set(part.part_code, part);
                }
            });

            const query = this.inputs.spareSearch ? this.inputs.spareSearch.value || '' : '';
            this.applySpareSearch(query, true);
            this.renderSpareRequestsTable(this.asArray(this.state.service_orders));
            this.updateSpareMetrics();
            this.selectSparePart(docname, { focusForm: false });
        }

        createStatusBadge(status) {
            const badge = document.createElement('span');
            badge.className = 'status-pill';
            const label = status || __('Tidak diketahui');
            badge.textContent = label;
            const normalized = label.toString().toLowerCase();
            if (
                normalized.includes('available') ||
                normalized.includes('received') ||
                normalized.includes('issued') ||
                normalized.includes('approve')
            ) {
                badge.classList.add('status-pill--success');
            } else if (
                normalized.includes('order') ||
                normalized.includes('pending') ||
                normalized.includes('transit')
            ) {
                badge.classList.add('status-pill--warning');
            } else if (
                normalized.includes('cancel') ||
                normalized.includes('stop') ||
                normalized.includes('reject') ||
                normalized.includes('backorder')
            ) {
                badge.classList.add('status-pill--danger');
            }
            return badge;
        }

        formatStockValue(value) {
            const numeric = parseFloat(value);
            if (Number.isNaN(numeric)) {
                return '';
            }
            if (Number.isInteger(numeric)) {
                return numeric.toLocaleString('id-ID');
            }
            return numeric.toLocaleString('id-ID', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
        }

        isOutOfStock(part) {
            if (!part) {
                return false;
            }
            const stock = parseFloat(part.stock_qty);
            if (!Number.isFinite(stock)) {
                return false;
            }
            return stock <= 0;
        }

        isLowStock(part) {
            if (!part) {
                return false;
            }
            const stock = parseFloat(part.stock_qty);
            if (!Number.isFinite(stock)) {
                return false;
            }
            if (stock <= 0) {
                return true;
            }
            const reorder = parseFloat(part.reorder_level);
            if (!Number.isFinite(reorder) || reorder <= 0) {
                return false;
            }
            return stock <= reorder;
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

        escapeHtml(value) {
            if (value === undefined || value === null) {
                return '';
            }
            return value
                .toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
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
