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

const mapFrappePartStatus = (status) => {
  const normalized = normalizeStatusValue(status);
  if (['prepared', 'ready', 'available', 'approved'].includes(normalized)) {
    return 'prepared';
  }
  if (['installed', 'issued', 'received'].includes(normalized)) {
    return 'installed';
  }
  if (['rejected', 'cancelled'].includes(normalized)) {
    return 'rejected';
  }
  return 'requested';
};

const normalizeFrappeSparePartRow = (row, index) => {
  if (!row) return null;

  const partNumber = row.item_code || row.part_code || row.partNumber || row.item_name || '';
  const name = row.item_name || row.part_name || row.partName || row.description || partNumber;

  if (!partNumber && !name) {
    return null;
  }

  const quantity = Number(row.qty ?? row.quantity ?? 0);
  const unitPrice = Number(row.rate ?? row.unit_price ?? row.unitPrice ?? 0);
  const totalPrice = Number(row.amount ?? quantity * unitPrice);

  return {
    id: row.name || `PART-${Date.now()}-${index}`,
    name,
    partNumber: partNumber || name,
    quantity,
    unitPrice,
    discount: Number(row.discount_amount ?? row.discount ?? 0),
    discountType: row.discount_type || row.discountType || 'percent',
    totalPrice: Number.isFinite(totalPrice) ? totalPrice : 0,
    requested: true,
    status: mapFrappePartStatus(row.stock_status || row.status),
  };
};

const mergeSpareParts = (existingParts, incomingParts) => {
  const normalizedExisting = Array.isArray(existingParts) ? [...existingParts] : [];
  const incoming = Array.isArray(incomingParts) ? incomingParts : [];

  if (incoming.length === 0) {
    return normalizedExisting;
  }

  const lookup = new Map(
    normalizedExisting.map((part, index) => {
      const key = normalizeStatusValue(part.partNumber || part.name || String(index));
      return [key, index];
    })
  );

  incoming.forEach((incomingPart) => {
    if (!incomingPart) return;

    const key = normalizeStatusValue(incomingPart.partNumber || incomingPart.name || '');
    const existingIndex = key ? lookup.get(key) : undefined;

    if (existingIndex === undefined) {
      normalizedExisting.push(incomingPart);
      if (key) {
        lookup.set(key, normalizedExisting.length - 1);
      }
      return;
    }

    const existing = normalizedExisting[existingIndex];
    const keepStatus = ['installed', 'rejected'].includes(existing.status);

    normalizedExisting[existingIndex] = {
      ...existing,
      ...incomingPart,
      status: keepStatus ? existing.status : incomingPart.status || existing.status,
      approved: existing.approved,
    };
  });

  return normalizedExisting;
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
    const sparePartRequests = Array.isArray(bootstrap?.spare_part_requests)
      ? bootstrap.spare_part_requests
      : [];
    if (serviceOrders.length === 0) return storedOrders;

    const serviceMap = new Map(
      serviceOrders
        .filter((order) => order?.name)
        .map((order) => [order.name, order])
    );

    const sparePartsByOrder = new Map();
    sparePartRequests.forEach((row, index) => {
      const orderId = row?.parent;
      if (!orderId) return;

      const normalized = normalizeFrappeSparePartRow(row, index);
      if (!normalized) return;

      const existing = sparePartsByOrder.get(orderId) || [];
      existing.push(normalized);
      sparePartsByOrder.set(orderId, existing);
    });

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

      const incomingSpareParts = sparePartsByOrder.get(orderKey) || [];
      if (incomingSpareParts.length > 0) {
        const mergedSpareParts = mergeSpareParts(order.spareParts, incomingSpareParts);

        if (mergedSpareParts.length > 0 && mergedSpareParts !== order.spareParts) {
          updated.spareParts = mergedSpareParts;
          updatedRow = true;
        }
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
