const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8005';
const API_KEY = import.meta.env.VITE_API_KEY || '';
const API_SECRET = import.meta.env.VITE_API_SECRET || '';

class FrappeClient {
  constructor() {
    this.baseURL = FRAPPE_URL;
    this.apiKey = API_KEY;
    this.apiSecret = API_SECRET;
    
    console.log('🔧 Frappe Client initialized');
    console.log('📍 Base URL:', this.baseURL);
    console.log('🔑 API Key:', this.apiKey ? '✅ Set' : '❌ Not set');
  }

  async request(endpoint, options = {}) {
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    console.log('🌐 Fetching:', url);
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    // Add API key if available
    if (this.apiKey && this.apiSecret) {
      headers['Authorization'] = `token ${this.apiKey}:${this.apiSecret}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Frappe API Error:', error);
      throw error;
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

  // Test connection
  async testConnection() {
    try {
      const response = await this.request('/api/method/ping');
      console.log('✅ Connection test successful:', response);
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }
}

export const frappeClient = new FrappeClient();
export default frappeClient;