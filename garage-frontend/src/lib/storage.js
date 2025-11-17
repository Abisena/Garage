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

export const loadFromStorage = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return cloneValue(fallback)
    return JSON.parse(stored)
  } catch (err) {
    console.error(`Failed to load storage key "${key}"`, err)
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    return cloneValue(fallback)
  }
}

export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error(`Failed to save storage key "${key}"`, err)
  }
}
