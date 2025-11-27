import { readCache, writeCache, migrateLocalCache, getDefaultTtl } from './secureCache'

export const PURCHASE_ORDERS_KEY = 'purchaseOrders'
const PURCHASE_ORDER_TTL = getDefaultTtl()

export const sanitizePurchaseOrders = (orders = []) => {
  if (!Array.isArray(orders)) return []
  return orders.map((order) => ({
    ...order,
    id: order.id || `po-${Date.now()}`,
    poNumber: order.poNumber || '',
    vendor: order.vendor || '',
    branch: order.branch || '',
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          ...item,
          partName: item.partName || '',
          partNumber: item.partNumber || '',
          unitPrice: Number(item.unitPrice) || 0,
          quantity: Number(item.quantity) || 0,
          totalPrice: Number(item.totalPrice || item.unitPrice * item.quantity) || 0
        }))
      : [],
    totalAmount: Number(order.totalAmount) || 0,
    status: order.status || 'DRAFT',
    isPrinted: Boolean(order.isPrinted)
  }))
}

export const loadPurchaseOrdersCache = (fallback = []) => {
  const migrated = migrateLocalCache(PURCHASE_ORDERS_KEY, { sanitize: sanitizePurchaseOrders })
  if (migrated) {
    writeCache(PURCHASE_ORDERS_KEY, migrated, { ttl: PURCHASE_ORDER_TTL, sanitize: sanitizePurchaseOrders })
    return migrated
  }
  return readCache(PURCHASE_ORDERS_KEY, fallback)
}

export const savePurchaseOrdersCache = (orders) => {
  const sanitized = sanitizePurchaseOrders(orders)
  writeCache(PURCHASE_ORDERS_KEY, sanitized, { ttl: PURCHASE_ORDER_TTL, sanitize: sanitizePurchaseOrders })
  return sanitized
}
