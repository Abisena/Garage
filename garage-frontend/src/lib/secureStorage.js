const STORAGE_KEY = 'currentUser'
const SESSION_SECRET_KEY = 'garage-session-secret'

const encoder = new TextEncoder()

const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('')

const getSessionSecret = async () => {
  let secret = sessionStorage.getItem(SESSION_SECRET_KEY)
  if (!secret) {
    secret = crypto.randomUUID()
    sessionStorage.setItem(SESSION_SECRET_KEY, secret)
  }
  const data = encoder.encode(secret)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

const signPayload = async (payload) => {
  const secret = await getSessionSecret()
  const data = encoder.encode(`${secret}:${payload}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

export const persistCurrentUser = async (user) => {
  try {
    const payload = btoa(JSON.stringify(user))
    const signature = await signPayload(payload)
    const wrapped = JSON.stringify({ payload, signature })
    localStorage.setItem(STORAGE_KEY, wrapped)
  } catch (err) {
    console.error('Failed to persist user securely', err)
  }
}

export const restoreCurrentUser = async () => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.payload || !parsed?.signature) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    const expectedSignature = await signPayload(parsed.payload)
    if (expectedSignature !== parsed.signature) {
      console.warn('Detected tampered session data, clearing storage')
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    const decoded = atob(parsed.payload)
    return JSON.parse(decoded)
  } catch (err) {
    console.error('Failed to restore secure session', err)
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const clearStoredUser = () => {
  localStorage.removeItem(STORAGE_KEY)
}
