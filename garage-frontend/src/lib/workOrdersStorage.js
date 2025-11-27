import { frappeClient } from './frappeClient';
import { readCache, writeCache, migrateLocalCache } from './secureCache';

const WORK_ORDERS_KEY = 'workOrders';
const WORK_ORDER_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

const hasStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

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
