import { useCallback, useMemo, useRef, useState } from 'react'
import { frappeClient } from './frappeClient'

const POINTER_STORAGE_KEY = 'serverCachePointers'
const inMemoryCache = new Map()

const getSessionStorage = () => {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return null
  }
  return window.sessionStorage
}

const readPointers = () => {
  const storage = getSessionStorage()
  if (!storage) return {}
  try {
    return JSON.parse(storage.getItem(POINTER_STORAGE_KEY) || '{}')
  } catch (error) {
    console.warn('Unable to parse cache pointer map, resetting.', error)
    storage.removeItem(POINTER_STORAGE_KEY)
    return {}
  }
}

const writePointer = (key, value) => {
  const storage = getSessionStorage()
  if (!storage) return
  const next = { ...readPointers(), [key]: value }
  storage.setItem(POINTER_STORAGE_KEY, JSON.stringify(next))
}

export const ensurePointer = (name, fallbackFactory) => {
  const storage = getSessionStorage()
  const desired = fallbackFactory()
  if (!storage) return desired
  const pointers = readPointers()
  if (pointers[name] && pointers[name] !== desired) {
    writePointer(name, desired)
    return desired
  }
  if (pointers[name]) return pointers[name]
  writePointer(name, desired)
  return desired
}

export const saveCache = async (key, data) => {
  try {
    const response = await frappeClient.request('/api/method/garage.cache.save', {
      method: 'POST',
      body: JSON.stringify({ key, value: data }),
    })
    inMemoryCache.set(key, data)
    return response?.message || response
  } catch (error) {
    console.error('Failed to save cache to server, using in-memory fallback.', error)
    inMemoryCache.set(key, data)
    return { success: false, cache_key: key, error: error.message }
  }
}

export const loadCache = async (key) => {
  if (!key) return null
  try {
    const response = await frappeClient.request(`/api/method/garage.cache.load?key=${encodeURIComponent(key)}`)
    const value = response?.message ?? response
    if (value !== null && value !== undefined) {
      inMemoryCache.set(key, value)
      return value
    }
  } catch (error) {
    console.warn('Failed to load cache from server, checking memory fallback.', error)
  }
  return inMemoryCache.has(key) ? inMemoryCache.get(key) : null
}

export const deleteCache = async (key) => {
  if (!key) return { success: false }
  try {
    const response = await frappeClient.request('/api/method/garage.cache.delete', {
      method: 'POST',
      body: JSON.stringify({ key }),
    })
    inMemoryCache.delete(key)
    return response?.message || response
  } catch (error) {
    console.error('Failed to delete cache from server, clearing memory fallback.', error)
    inMemoryCache.delete(key)
    return { success: false, error: error.message }
  }
}

export const useServerCache = () => {
  const [loading, setLoading] = useState(false)
  const pending = useRef(new Map())

  const load = useCallback(async (key) => {
    if (!key) return null
    if (pending.current.has(key)) return pending.current.get(key)
    setLoading(true)
    const promise = loadCache(key).finally(() => {
      pending.current.delete(key)
      setLoading(false)
    })
    pending.current.set(key, promise)
    return promise
  }, [])

  const save = useCallback(async (key, value) => {
    setLoading(true)
    try {
      return await saveCache(key, value)
    } finally {
      setLoading(false)
    }
  }, [])

  const remove = useCallback(async (key) => {
    setLoading(true)
    try {
      return await deleteCache(key)
    } finally {
      setLoading(false)
    }
  }, [])

  return useMemo(
    () => ({
      load,
      save,
      remove,
      loading,
    }),
    [load, save, remove, loading],
  )
}

export default useServerCache
