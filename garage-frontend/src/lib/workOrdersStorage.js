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

const normalizeStatusValue = (value) => {
  if (!value) return '';
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const mapRepairStatusFromServiceOrder = (serviceOrder) => {
  const status = normalizeStatusValue(serviceOrder?.status);
  const qcStatus = normalizeStatusValue(serviceOrder?.qc_status);

  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'completed';
  if (status === 'waiting-payment') return 'final-inspection';
  if (status === 'awaiting-qc') {
    return qcStatus === 'passed' ? 'qc-finished' : 'quality-check';
  }
  if (status === 'work-in-progress') return 'in-progress';
  if (status === 'request-part') return 'request-part';
  if (status === 'approved') return 'approved';

  return '';
};

const dedupeWorkOrders = (orders) => {
  const seen = new Set();
  const deduped = [];

  for (const order of orders) {
    const key = (order.orderId || order.id || '').toString().toLowerCase();
    if (key && seen.has(key)) {
      continue;
    }
    if (key) {
      seen.add(key);
    }
    deduped.push(order);
  }

  return deduped;
};

export const sanitizeWorkOrders = (orders) => {
  if (!Array.isArray(orders)) return [];
  const nonDemoOrders = orders.filter(order => !isDemoOrder(order));
  return dedupeWorkOrders(nonDemoOrders);
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

export const refreshWorkOrdersFromBackend = async ({ branch } = {}) => {
  if (!hasStorage()) return [];

  const storedOrders = getStoredWorkOrders();
  if (storedOrders.length === 0) return [];

  try {
    const bootstrap = await frappeClient.getPortalBootstrap({ branch });
    const serviceOrders = Array.isArray(bootstrap?.service_orders) ? bootstrap.service_orders : [];
    if (serviceOrders.length === 0) return storedOrders;

    const serviceMap = new Map(
      serviceOrders
        .filter((order) => order?.name)
        .map((order) => [order.name, order])
    );

    let changed = false;
    const updatedOrders = storedOrders.map((order) => {
      const orderKey = order.orderId || order.id;
      if (!orderKey || !serviceMap.has(orderKey)) {
        return order;
      }

      const serviceOrder = serviceMap.get(orderKey);
      const normalizedStatus = normalizeStatusValue(serviceOrder?.status);
      const mappedRepairStatus = mapRepairStatusFromServiceOrder(serviceOrder);
      const qcStatus = normalizeStatusValue(serviceOrder?.qc_status);

      const updated = { ...order };
      let updatedRow = false;

      if (normalizedStatus && normalizedStatus !== order.status) {
        updated.status = normalizedStatus;
        updatedRow = true;
      }

      if (mappedRepairStatus && mappedRepairStatus !== order.repairStatus) {
        updated.repairStatus = mappedRepairStatus;
        updatedRow = true;
      }

      if (qcStatus === 'passed' && !order.qcApproved) {
        updated.qcApproved = true;
        updatedRow = true;
      }

      if (updatedRow) {
        changed = true;
        return updated;
      }

      return order;
    });

    if (changed) {
      await persistWorkOrders(updatedOrders, { skipSync: true });
      return updatedOrders;
    }

    return storedOrders;
  } catch (error) {
    console.error('Failed to refresh work orders from backend:', error);
    return storedOrders;
  }
};
