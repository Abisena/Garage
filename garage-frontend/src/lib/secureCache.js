const isBrowser = typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
const KEY_PREFIX = 'garage-cache:'
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 6 // 6 hours

const buildKey = (key) => `${KEY_PREFIX}${key}`

const cloneValue = (value) => {
  if (value === null || value === undefined) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  try {
    return JSON.parse(JSON.stringify(value))
  } catch (err) {
    console.error('Failed to clone cache value', err)
    return value
  }
}

/**
 * Persist cache data in sessionStorage with optional TTL and sanitization.
 */
export const writeCache = (key, value, { ttl = DEFAULT_TTL_MS, sanitize } = {}) => {
  if (!isBrowser) return
  try {
    const sanitized = sanitize ? sanitize(value) : value
    const payload = {
      version: 1,
      data: sanitized,
      expiresAt: ttl ? Date.now() + ttl : null
    }
    window.sessionStorage.setItem(buildKey(key), JSON.stringify(payload))
  } catch (err) {
    console.error(`Failed to persist cache for key "${key}"`, err)
  }
}

/**
 * Read cached data. Returns fallback when missing/expired/invalid.
 */
export const readCache = (key, fallback = null) => {
  if (!isBrowser) return cloneValue(fallback)
  const raw = window.sessionStorage.getItem(buildKey(key))
  if (!raw) return cloneValue(fallback)
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.expiresAt && Date.now() > parsed.expiresAt) {
      window.sessionStorage.removeItem(buildKey(key))
      return cloneValue(fallback)
    }
    return cloneValue(parsed?.data ?? fallback)
  } catch (err) {
    console.error(`Failed to read cache for key "${key}"`, err)
    window.sessionStorage.removeItem(buildKey(key))
    return cloneValue(fallback)
  }
}

export const clearCache = (key) => {
  if (!isBrowser) return
  try {
    window.sessionStorage.removeItem(buildKey(key))
  } catch (err) {
    console.error(`Failed to clear cache for key "${key}"`, err)
  }
}

/**
 * Migrate data from legacy localStorage into the secure session cache once.
 */
export const migrateLocalCache = (key, { sanitize } = {}) => {
  if (!isBrowser || typeof window.localStorage === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const sanitized = sanitize ? sanitize(parsed) : parsed
    window.localStorage.removeItem(key)
    return sanitized
  } catch (err) {
    console.warn(`Legacy cache for key "${key}" is invalid, clearing...`, err)
    window.localStorage.removeItem(key)
    return null
  }
}

export const getDefaultTtl = () => DEFAULT_TTL_MS

export default {
  writeCache,
  readCache,
  clearCache,
  migrateLocalCache,
  getDefaultTtl
}
