const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8008';

const CSRF_HEADER = 'X-Frappe-CSRF-Token';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function getCookie(name) {
  if (typeof document === 'undefined') return null;

  return document.cookie
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')[1];
}

class FrappeClient {
  constructor() {
    this.baseURL = FRAPPE_URL;
  }

  buildListURL(doctype, fields = [], filters = null, limit = 200) {
    const params = new URLSearchParams();

    if (fields.length > 0) {
      params.append('fields', JSON.stringify(fields));
    }

    if (filters) {
      params.append('filters', JSON.stringify(filters));
    }

    if (limit) {
      params.append('limit_page_length', String(limit));
    }

    return `/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`;
  }

  async request(endpoint, options = {}) {
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }

    const url = `${this.baseURL}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();

    const csrfToken = getCookie('csrf_token');
    const csrfHeaders =
      !SAFE_METHODS.includes(method) && csrfToken
        ? { [CSRF_HEADER]: decodeURIComponent(csrfToken) }
        : {};

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...csrfHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Frappe API Error:', error);
      throw error;
    }
  }

  async login(username, password) {
    try {
      const response = await this.request('/api/method/login', {
        method: 'POST',
        body: JSON.stringify({
          usr: username,
          pwd: password,
        }),
      });

      console.log('Login response:', response);
      
      if (response.message === 'Logged In') {
        const userInfo = await this.getCurrentUser();
        return {
          success: true,
          user: userInfo,
        };
      }

      return {
        success: false,
        error: 'Login failed',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.request('/api/method/frappe.auth.get_logged_user');
      return {
        username: response.message,
        full_name: response.full_name || response.message,
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  // ✅ FIXED: Handle Frappe's message wrapping
  async getUserRoles() {
    try {
      console.log('🔄 Fetching user roles from API...');
      const response = await this.request('/api/method/garage.api.auth.get_user_roles');
      console.log('📦 Raw API response:', response);
      
      // ✅ Frappe wraps response in "message"
      const data = response.message || response;
      console.log('📋 Extracted data:', data);
      
      const roles = Array.isArray(data.roles) ? data.roles : [];
      const user = data.user || null;
      
      console.log('✅ Final extracted roles:', roles);
      console.log('✅ Final extracted user:', user);
      
      return { user, roles };
    } catch (error) {
      console.error('❌ Failed to fetch user roles:', error);
      return { user: null, roles: [] };
    }
  }

  async logout() {
    try {
      await this.request('/api/method/logout', {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  async listGarageCustomers() {
    try {
      const response = await this.request(
        '/api/resource/Customer?fields=["name","customer_name","customer_type"]&limit_page_length=20'
      );
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      throw error;
    }
  }

  async registerCustomerVehicle(payload) {
    try {
      console.log('Calling register_customer_vehicle with payload:', payload);
      
      const response = await this.request(
        '/api/method/garage.api.portal.register_customer_vehicle',
        {
          method: 'POST',
          body: JSON.stringify({ payload }),
        },
      );

      console.log('API Response:', response);
      
      return response.message || response;
    } catch (error) {
      console.error('Failed to register customer/vehicle:', error);
      throw error;
    }
  }

  async getPortalBootstrap(params = {}) {
    try {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (typeof value === 'string' && value.trim() === '') return;
        searchParams.append(key, value);
      });

      const query = searchParams.toString();
      const endpoint = query
        ? `/api/method/garage.api.portal.portal_bootstrap?${query}`
        : '/api/method/garage.api.portal.portal_bootstrap';

      const response = await this.request(endpoint);
      return response.message || response;
    } catch (error) {
      console.error('Failed to fetch portal bootstrap:', error);
      throw error;
    }
  }

  async getServiceOrderDetails(orderId) {
    if (!orderId) {
      return null;
    }

    try {
      const response = await this.request(
        `/api/method/garage.api.portal.get_service_order_details?order_id=${encodeURIComponent(orderId)}`
      );

      return response.message || response;
    } catch (error) {
      console.error('Failed to fetch service order details:', error);
      throw error;
    }
  }

  async lookupVehicleByPlate(licensePlate) {
    if (!licensePlate) {
      return {};
    }

    try {
      const params = new URLSearchParams({
        license_plate: licensePlate,
      });

      const response = await this.request(
        `/api/method/garage.api.portal.lookup_vehicle_by_plate?${params.toString()}`
      );

      return response.message || response || {};
    } catch (error) {
      console.error('Failed to lookup vehicle by plate:', error);
      throw error;
    }
  }

  async cancelServiceOrder(orderId, reason = '') {
    if (!orderId) {
      throw new Error('Service Order ID is required to cancel an order');
    }

    try {
      const response = await this.request(
        '/api/method/garage.api.portal.cancel_service_order',
        {
          method: 'POST',
          body: JSON.stringify({ order_id: orderId, reason })
        }
      );

      return response.message || response;
    } catch (error) {
      console.error('Failed to cancel service order:', error);
      throw error;
    }
  }

  async updateServiceOrderInspection(orderId, inspectionData = {}) {
    if (!orderId) {
      throw new Error('Service Order ID is required to save inspection data');
    }

    try {
      const response = await this.request(
        '/api/method/garage.api.portal.update_service_order_inspection',
        {
          method: 'POST',
          body: JSON.stringify({
            order_id: orderId,
            inspection_data: inspectionData,
          }),
        },
      );

      return response.message || response;
    } catch (error) {
      console.error('Failed to update inspection on Frappe:', error);
      throw error;
    }
  }

  async listSpareParts(filters = {}, branch) {
    try {
      const payload = {};

      if (filters && Object.keys(filters).length > 0) {
        payload.filters = filters;
      }

      if (branch) {
        payload.branch = branch;
      }

      const response = await this.request('/api/method/garage.api.portal.list_spare_parts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = response.message || response || {};
      const parts = Array.isArray(data?.spare_parts) ? data.spare_parts : [];

      // Normalize response so the UI keeps working even if backend field names change
      const normalizedParts = parts.map((part) => ({
        ...part,
        item_code: part.item_code || part.part_code,
        item_name: part.item_name || part.part_name,
        item_group: part.item_group || part.category,
        standard_rate: part.standard_rate ?? part.unit_price,
        // Prefer the explicitly provided available quantity, but fall back to other
        // stock fields returned by the API to keep the UI resilient to schema tweaks.
        stock_qty: part.available_qty ?? part.stock_qty ?? part.actual_qty ?? 0,
        total_reserved_qty:
          part.total_reserved_qty ?? part.ordered_qty ?? part.reserved_qty ?? 0,
        safety_stock: part.safety_stock ?? part.reorder_level,
      }));

      return {
        spare_parts: normalizedParts,
        total_count: data.total_count ?? normalizedParts.length,
        low_stock_count: data.low_stock_count,
      };
    } catch (error) {
      console.error('Failed to list spare parts:', error);
      throw error;
    }
  }

  async getSparePartStats() {
    try {
      const response = await this.request('/api/method/garage.api.portal.get_spare_part_stats');
      return response.message || response;
    } catch (error) {
      console.error('Failed to fetch spare part stats:', error);
      throw error;
    }
  }

  async listServiceTypes() {
    try {
      const fields = [
        'name',
        'service_type',
        'service_code',
        'category',
        'service_fee',
        'flat_rate',
        'rate',
        'description',
      ];

      const url = this.buildListURL('Garage Service Type', fields, null, 200);
      const response = await this.request(url);
      return response.data || [];
    } catch (error) {
      console.error('Failed to list service types:', error);
      return [];
    }
  }

  async listServiceBundles(limit = 200) {
    try {
      const fields = [
        'name',
        'bundle_name',
        'service_fee',
        'total_spare_amount',
        'total_material_amount',
        'grand_total',
        'description',
        'is_active',
      ];

      const filters = [['is_active', '=', 1]];
      const url = this.buildListURL('Garage Service Bundle', fields, filters, limit);
      const response = await this.request(url);
      return response.data || [];
    } catch (error) {
      console.error('Failed to list service bundles:', error);
      return [];
    }
  }

  async listMechanics(branch = '') {
    try {
      const technicianFields = [
        'name',
        'employee',
        'employee_name',
        'user_id',
        'status',
        'skill_tags',
        'branch',
        'notes',
      ];

      const technicianFilters = branch ? [['branch', '=', branch]] : null;
      const technicianUrl = this.buildListURL(
        'Garage Technician',
        technicianFields,
        technicianFilters,
        200,
      );

      const employeeFields = [
        'name',
        'employee_name',
        'user_id',
        'status',
        'designation',
        'employment_type',
        'department',
        'branch',
      ];

      const employeeFilters = [['designation', 'like', '%Mechanic%']];
      if (branch) {
        employeeFilters.push(['branch', '=', branch]);
      }

      const employeeUrl = this.buildListURL(
        'Employee',
        employeeFields,
        employeeFilters,
        200,
      );

      const [technicianResponse, employeeResponse] = await Promise.all([
        this.request(technicianUrl),
        this.request(employeeUrl),
      ]);

      const technicians = technicianResponse.data || [];
      const employees = employeeResponse.data || [];

      return { technicians, employees };
    } catch (error) {
      console.error('Failed to list mechanics:', error);
      return { technicians: [], employees: [] };
    }
  }

  async syncWorkOrders(workOrders) {
    try {
      const response = await this.request(
        '/api/method/garage.api.portal.sync_frontend_work_orders',
        {
          method: 'POST',
          body: JSON.stringify({ work_orders: workOrders })
        }
      );

      return response.message || response;
    } catch (error) {
      console.error('Failed to sync work orders to Frappe:', error);
      throw error;
    }
  }

  async adjustSparePartStock(partCode, qty, action = 'issue') {
    if (!partCode) {
      throw new Error('Part code is required to adjust stock');
    }

    const payload = {
      part_code: partCode,
      qty,
      action,
    };

    const response = await this.request('/api/method/garage.api.portal.adjust_spare_part_stock', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.message || response;
  }
}

export const frappeClient = new FrappeClient();
export default frappeClient;