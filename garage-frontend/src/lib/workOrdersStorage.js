import { frappeClient } from './frappeClient';
import { readCache, writeCache, migrateLocalCache } from './secureCache';

const WORK_ORDERS_KEY = 'workOrders';
const WORK_ORDER_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

const hasStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const mapBackendOrder = (order) => ({
  id: order.name,
  orderId: order.name,
  customerName: order.customer_name || order.customer || 'Customer',
  phone: order.customer_phone || '',
  email: order.customer_email || '',
  plateNumber: order.vehicle_plate || '',
  chassisNumber: order.vehicle_vin || '',
  engineNumber: order.vehicle_engine_number || '',
  vehicleBrand: order.vehicle_brand || '',
  vehicleModel: order.vehicle_model || order.vehicle_type_model || '',
  vehicleType: order.vehicle_type_model || order.vehicle_type || '',
  vehicleYear: order.vehicle_year || '',
  serviceType: order.service_order_type || order.order_category || '',
  serviceBundleId: order.service_bundle,
  serviceBundleName: order.service_bundle_name || order.service_notes || '',
  customerComplaint: order.inspection_summary || order.service_notes || '',
  date: order.creation,
  branch: order.branch || '',
  estimatedCost: order.total_estimated_amount,
  approvedAmount: order.total_approved_amount,
  status: order.status || 'Inspection',
  repairStatus: order.status || 'Inspection',
  inspectionStatus: order.status || 'Inspection',
  progressHistory: order.progress_logs || [],
  spareParts: [],
});

const inflightFetches = new Map();

const notifyWorkOrdersChange = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('workOrdersUpdated'));
};

const isDemoOrder = (order) => {
  if (!order) return false;
  const id = (order.id ?? '').toString().toLowerCase();
  const orderId = (order.orderId ?? '').toString().toLowerCase();
  return id.startsWith('demo') || orderId.startsWith('demo');
};

export const sanitizeWorkOrders = (orders) => {
  if (!Array.isArray(orders)) return [];
  return orders.filter(order => !isDemoOrder(order));
};

const readWorkOrders = () => {
  if (!hasStorage()) return [];

  // migrate legacy localStorage data once
  const migrated = migrateLocalCache(WORK_ORDERS_KEY, { sanitize: sanitizeWorkOrders });
  if (migrated) {
    writeCache(WORK_ORDERS_KEY, migrated, { ttl: WORK_ORDER_TTL_MS, sanitize: sanitizeWorkOrders });
    notifyWorkOrdersChange();
    return migrated;
  }

  return readCache(WORK_ORDERS_KEY, []);
};

export const getStoredWorkOrders = () => {
  const orders = readWorkOrders();
  if (orders.length === 0) return [];
  const sanitized = sanitizeWorkOrders(orders);
  if (hasStorage()) {
    writeCache(WORK_ORDERS_KEY, sanitized, { ttl: WORK_ORDER_TTL_MS, sanitize: sanitizeWorkOrders });
  }
  return sanitized;
};

export const purgeDemoWorkOrders = () => {
  if (!hasStorage()) return [];
  return getStoredWorkOrders();
};

export const persistWorkOrders = async (orders, { skipSync = false } = {}) => {
  const sanitized = sanitizeWorkOrders(orders);

  if (hasStorage()) {
    writeCache(WORK_ORDERS_KEY, sanitized, { ttl: WORK_ORDER_TTL_MS, sanitize: sanitizeWorkOrders });
    notifyWorkOrdersChange();
  }

  if (!skipSync && sanitized.length > 0) {
    try {
      await frappeClient.syncWorkOrders(sanitized);
    } catch (error) {
      console.error('Unable to sync work orders to Frappe backend:', error);
    }
  }

  return sanitized;
};

const fetchFromBackend = async (options = {}) => {
  const filters = { ...options };

  if (options.branch) {
    filters.branch = options.branch;
  }

  try {
    const response = await frappeClient.listServiceOrders(filters);
    const backendOrders = Array.isArray(response?.orders) ? response.orders : [];
    const mapped = sanitizeWorkOrders(backendOrders.map(mapBackendOrder));

    if (hasStorage()) {
      writeCache(WORK_ORDERS_KEY, mapped, { ttl: WORK_ORDER_TTL_MS, sanitize: sanitizeWorkOrders });
      notifyWorkOrdersChange();
    }

    return mapped;
  } catch (error) {
    console.error('Failed to fetch work orders from backend:', error);
    return getStoredWorkOrders();
  }
};

export const refreshWorkOrdersFromBackend = async (options = {}) => {
  const key = JSON.stringify(options || {});
  if (inflightFetches.has(key)) return inflightFetches.get(key);

  const fetchPromise = fetchFromBackend(options).finally(() => {
    inflightFetches.delete(key);
  });

  inflightFetches.set(key, fetchPromise);
  return fetchPromise;
};
