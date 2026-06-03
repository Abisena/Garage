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

const mapFrappeStatusToRepairStatus = (serviceOrder) => {
  const mapped = mapRepairStatusFromServiceOrder(serviceOrder);
  if (mapped) return mapped;

  const status = normalizeStatusValue(serviceOrder?.status);
  if (status === 'estimate' || status === 'awaiting-approval') return 'approved';
  if (status === 'draft' || status === 'inspection') return 'approved';
  return 'approved';
};

const mapServiceOrderToWorkOrder = (serviceOrder, index = 0) => {
  const orderId = serviceOrder?.name || '';
  const branch = serviceOrder?.branch || '';
  const branchCode = (serviceOrder?.branch_code || branch.substring(0, 3) || 'GAR').toUpperCase();
  const createdAt = serviceOrder?.creation ? new Date(serviceOrder.creation) : new Date();

  return {
    id: `${branchCode}-${String(index + 1).padStart(3, '0')}`,
    orderId,
    customerName: serviceOrder?.customer_name || 'Customer',
    phone: serviceOrder?.customer_phone || '',
    email: serviceOrder?.customer_email || '',
    plateNumber: serviceOrder?.vehicle_plate || '',
    chassisNumber: serviceOrder?.vehicle_vin || '',
    engineNumber: serviceOrder?.vehicle_engine_number || '',
    vehicleBrand: serviceOrder?.vehicle_brand || '',
    vehicleModel: serviceOrder?.vehicle_model || serviceOrder?.vehicle_type_model || '',
    vehicleType: serviceOrder?.vehicle_type_model || '',
    vehicleYear: serviceOrder?.vehicle_year || '',
    vehicleInfo: `${serviceOrder?.vehicle_brand || ''} ${serviceOrder?.vehicle_model || ''}`.trim(),
    serviceType: serviceOrder?.service_order_type || '',
    branch,
    status: normalizeStatusValue(serviceOrder?.status) || 'inspection',
    repairStatus: mapFrappeStatusToRepairStatus(serviceOrder),
    paymentStatus:
      normalizeStatusValue(serviceOrder?.invoice_status) === 'paid' ||
      serviceOrder?.status === 'Completed'
        ? 'paid'
        : serviceOrder?.status === 'Waiting Payment'
          ? 'pending'
          : undefined,
    qcApproved: normalizeStatusValue(serviceOrder?.qc_status) === 'passed',
    createdAt: serviceOrder?.creation || createdAt.toISOString(),
    date: createdAt.toLocaleDateString('id-ID'),
    spareParts: [],
    laborCost: Number(serviceOrder?.total_approved_amount || serviceOrder?.total_estimated_amount || 0) || 0,
  };
};

const mergeWorkOrderRecords = (local, remote) => {
  if (!local) return remote;

  return {
    ...remote,
    ...local,
    orderId: remote.orderId || local.orderId,
    status: remote.status || local.status,
    repairStatus: remote.repairStatus || local.repairStatus,
    customerName: remote.customerName || local.customerName,
    phone: remote.phone || local.phone,
    email: remote.email || local.email,
    plateNumber: remote.plateNumber || local.plateNumber,
    vehicleBrand: remote.vehicleBrand || local.vehicleBrand,
    vehicleModel: remote.vehicleModel || local.vehicleModel,
    branch: remote.branch || local.branch,
    spareParts: Array.isArray(local.spareParts) && local.spareParts.length > 0 ? local.spareParts : remote.spareParts,
    laborCost: local.laborCost || remote.laborCost || 0,
    paymentStatus: local.paymentStatus || remote.paymentStatus,
    paymentMethod: local.paymentMethod || remote.paymentMethod,
    paidAmount: local.paidAmount || remote.paidAmount,
    paymentDate: local.paymentDate || remote.paymentDate,
    invoiceNumber: local.invoiceNumber || remote.invoiceNumber,
    receiptNumber: local.receiptNumber || remote.receiptNumber,
    notaFakturNumber: local.notaFakturNumber || remote.notaFakturNumber,
    notaNumber: local.notaNumber || remote.notaNumber,
    inspectionData: local.inspectionData || remote.inspectionData,
    mechanicName: local.mechanicName || remote.mechanicName,
  };
};

export const loadWorkOrdersFromBackend = async ({ branch } = {}) => {
  if (!hasStorage()) return [];

  try {
    const response = await frappeClient.listServiceOrders({ branch });
    const serviceOrders = Array.isArray(response?.orders) ? response.orders : [];

    if (serviceOrders.length === 0) {
      return getStoredWorkOrders();
    }

    const localOrders = getStoredWorkOrders();
    const localByOrderId = new Map(
      localOrders.map((order) => [(order.orderId || order.id || '').toString(), order])
    );

    const remoteOrders = serviceOrders.map((serviceOrder, index) => {
      const mapped = mapServiceOrderToWorkOrder(serviceOrder, index);
      const local = localByOrderId.get(mapped.orderId);
      return mergeWorkOrderRecords(local, mapped);
    });

    const remoteIds = new Set(remoteOrders.map((order) => order.orderId));
    const localOnly = localOrders.filter((order) => order.orderId && !remoteIds.has(order.orderId));
    const merged = sanitizeWorkOrders([...remoteOrders, ...localOnly]);

    await persistWorkOrders(merged, { skipSync: true });
    return merged;
  } catch (error) {
    console.error('Failed to load work orders from backend:', error);
    return getStoredWorkOrders();
  }
};

export const refreshWorkOrdersFromBackend = async ({ branch } = {}) => {
  const loaded = await loadWorkOrdersFromBackend({ branch });
  if (loaded.length === 0) {
    return [];
  }

  try {
    const bootstrap = await frappeClient.getPortalBootstrap({ branch });
    const sparePartRequests = Array.isArray(bootstrap?.spare_part_requests)
      ? bootstrap.spare_part_requests
      : [];

    if (sparePartRequests.length === 0) {
      return loaded;
    }

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
    const updatedOrders = loaded.map((order) => {
      const orderKey = order.orderId || order.id;
      const incomingSpareParts = sparePartsByOrder.get(orderKey) || [];
      if (incomingSpareParts.length === 0) {
        return order;
      }

      const mergedSpareParts = mergeSpareParts(order.spareParts, incomingSpareParts);
      if (mergedSpareParts === order.spareParts) {
        return order;
      }

      changed = true;
      return { ...order, spareParts: mergedSpareParts };
    });

    if (changed) {
      await persistWorkOrders(updatedOrders, { skipSync: true });
      return updatedOrders;
    }

    return loaded;
  } catch (error) {
    console.error('Failed to refresh spare parts on work orders:', error);
    return loaded;
  }
};
