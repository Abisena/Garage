import { readCache, writeCache, migrateLocalCache, getDefaultTtl } from './secureCache'

export const SPARE_PART_REQUESTS_KEY = 'sparePartsRequests'
const REQUEST_TTL = getDefaultTtl()

export const sanitizeSparePartRequests = (data = []) => {
  if (!Array.isArray(data)) return []
  return data.map((req) => ({
    ...req,
    orderId: req.orderId || '',
    customerName: req.customerName || '',
    plateNumber: req.plateNumber || '',
    branch: req.branch || '',
    status: req.status || 'PENDING',
    mechanicName: req.mechanicName || '',
    requestDate: req.requestDate || req.date || '',
    requestTime: req.requestTime || req.time || '',
    parts: Array.isArray(req.parts)
      ? req.parts.map((part) => ({
          ...part,
          partCode: part.partCode || part.partNumber || '',
          partName: part.partName || '',
          requestedQty: Number(part.requestedQty || part.quantity) || 0,
          stockAvailable: Number(part.stockAvailable ?? part.stock) || 0,
          status: part.status || 'PENDING'
        }))
      : []
  }))
}

export const loadSparePartRequests = (fallback = []) => {
  const migrated = migrateLocalCache(SPARE_PART_REQUESTS_KEY, { sanitize: sanitizeSparePartRequests })
  if (migrated) {
    writeCache(SPARE_PART_REQUESTS_KEY, migrated, { ttl: REQUEST_TTL, sanitize: sanitizeSparePartRequests })
    return migrated
  }
  return readCache(SPARE_PART_REQUESTS_KEY, fallback)
}

export const saveSparePartRequests = (requests) => {
  const sanitized = sanitizeSparePartRequests(requests)
  writeCache(SPARE_PART_REQUESTS_KEY, sanitized, { ttl: REQUEST_TTL, sanitize: sanitizeSparePartRequests })
  return sanitized
}
