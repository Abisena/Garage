import { frappeClient } from './frappeClient';

const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

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
  const saved = window.localStorage.getItem('workOrders');
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to parse work orders from storage', error);
    window.localStorage.removeItem('workOrders');
    notifyWorkOrdersChange();
    return [];
  }
};

export const getStoredWorkOrders = () => {
  const orders = readWorkOrders();
  if (orders.length === 0) return [];
  const sanitized = sanitizeWorkOrders(orders);
  if (sanitized.length !== orders.length && hasStorage()) {
    window.localStorage.setItem('workOrders', JSON.stringify(sanitized));
    notifyWorkOrdersChange();
  }
  return sanitized;
};

export const purgeDemoWorkOrders = () => {
  if (!hasStorage()) return [];
  const sanitized = getStoredWorkOrders();
  return sanitized;
};

export const persistWorkOrders = async (orders, { skipSync = false } = {}) => {
  const sanitized = sanitizeWorkOrders(orders);

  if (hasStorage()) {
    window.localStorage.setItem('workOrders', JSON.stringify(sanitized));
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
