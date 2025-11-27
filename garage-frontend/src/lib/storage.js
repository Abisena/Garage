import { readCache, writeCache, clearCache, migrateLocalCache } from './secureCache'

const DEFAULT_KEY_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

const cloneValue = (value) => {
  if (value === null || value === undefined) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  try {
    return JSON.parse(JSON.stringify(value))
  } catch (err) {
    console.error('Failed to clone fallback value', err)
    return value
  }
}

export const loadFromStorage = (key, fallback, { ttl = DEFAULT_KEY_TTL_MS, sanitize } = {}) => {
  const migrated = migrateLocalCache(key, { sanitize })
  if (migrated) {
    writeCache(key, migrated, { ttl, sanitize })
    return cloneValue(migrated)
  }
  return readCache(key, fallback)
}

export const saveToStorage = (key, value, { ttl = DEFAULT_KEY_TTL_MS, sanitize } = {}) => {
  try {
    writeCache(key, value, { ttl, sanitize })
  } catch (err) {
    console.error(`Failed to save storage key "${key}"`, err)
  }
}

export const clearFromStorage = (key) => {
  clearCache(key)
}
