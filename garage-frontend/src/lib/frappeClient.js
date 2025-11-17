const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8005';

class FrappeClient {
  constructor() {
    this.baseURL = FRAPPE_URL;
  }

  async request(endpoint, options = {}) {
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // PENTING: untuk session cookies
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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

  // ✅ LOGIN API - CONSUME DI SINI
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
      
      // Frappe login success response
      if (response.message === 'Logged In') {
        // Get user info
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

  // Get current logged in user
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

  // Logout
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

  // List customers (existing method)
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
}

export const frappeClient = new FrappeClient();
export default frappeClient;