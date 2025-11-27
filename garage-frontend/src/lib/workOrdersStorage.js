import { frappeClient } from './frappeClient';
import { ensurePointer, loadCache, saveCache } from './serverCache';

const WORK_ORDERS_POINTER = 'workOrdersCacheKey';

let memoryOrders = [];
let hydrationPromise = null;

const getCacheKey = () =>
  ensurePointer(
    WORK_ORDERS_POINTER,
    () => `workorders:${(typeof window !== 'undefined' && window.frappe?.session?.user) || 'current'}`,
  );

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

const ensureHydrated = () => {
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      try {
        const cached = await loadCache(getCacheKey());
        memoryOrders = Array.isArray(cached) ? sanitizeWorkOrders(cached) : [];
        notifyWorkOrdersChange();
      } catch (error) {
        console.warn('Unable to hydrate work orders from server cache', error);
      }
      return memoryOrders;
    })();
  }

  return hydrationPromise;
};

export const getStoredWorkOrders = () => {
  ensureHydrated();
  const sanitized = sanitizeWorkOrders(memoryOrders);
  return sanitized;
};

export const purgeDemoWorkOrders = () => {
  ensureHydrated();
  return getStoredWorkOrders();
};

export const persistWorkOrders = async (orders, { skipSync = false } = {}) => {
  const sanitized = sanitizeWorkOrders(orders);

  memoryOrders = sanitized;
  await saveCache(getCacheKey(), sanitized);
  notifyWorkOrdersChange();

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

    memoryOrders = mapped;
    await saveCache(getCacheKey(), mapped);
    notifyWorkOrdersChange();

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
