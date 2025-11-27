import { readCache, writeCache, migrateLocalCache, getDefaultTtl } from './secureCache'

export const MASTER_PARTS_KEY = 'masterSpareParts'
export const CUSTOM_MASTER_PARTS_KEY = 'customMasterSpareParts'
const MASTER_PARTS_TTL = getDefaultTtl()

export const sanitizeMasterParts = (parts = []) => {
  if (!Array.isArray(parts)) return []
  return parts.map((part) => ({
    id: String(part.id ?? ''),
    partName: part.partName || '',
    partNumber: part.partNumber || '',
    compatibleModels: Array.isArray(part.compatibleModels) ? part.compatibleModels : [],
    category: part.category || '',
    unitPrice: Number(part.unitPrice) || 0,
    stock: Number(part.stock) || 0,
    minStock: Number(part.minStock ?? part.safety_stock ?? part.reorder_level) || 0,
    isCustom: Boolean(part.isCustom)
  }))
}

export const loadMasterParts = (fallback = []) => {
  const migrated = migrateLocalCache(MASTER_PARTS_KEY, { sanitize: sanitizeMasterParts })
  if (migrated) {
    writeCache(MASTER_PARTS_KEY, migrated, { ttl: MASTER_PARTS_TTL, sanitize: sanitizeMasterParts })
    return migrated
  }
  return readCache(MASTER_PARTS_KEY, fallback)
}

export const saveMasterParts = (parts) => {
  const sanitized = sanitizeMasterParts(parts)
  writeCache(MASTER_PARTS_KEY, sanitized, { ttl: MASTER_PARTS_TTL, sanitize: sanitizeMasterParts })
  return sanitized
}

export const loadCustomMasterParts = (fallback = []) => {
  const migrated = migrateLocalCache(CUSTOM_MASTER_PARTS_KEY, { sanitize: sanitizeMasterParts })
  if (migrated) {
    writeCache(CUSTOM_MASTER_PARTS_KEY, migrated, { ttl: MASTER_PARTS_TTL, sanitize: sanitizeMasterParts })
    return migrated
  }
  return readCache(CUSTOM_MASTER_PARTS_KEY, fallback)
}

export const saveCustomMasterParts = (parts) => {
  const sanitized = sanitizeMasterParts(parts).map((part) => ({ ...part, isCustom: true }))
  writeCache(CUSTOM_MASTER_PARTS_KEY, sanitized, { ttl: MASTER_PARTS_TTL, sanitize: sanitizeMasterParts })
  return sanitized
}
