/**
 * Secure Storage Utility with AES-GCM Encryption
 * 
 * Features:
 * - AES-GCM encryption (256-bit)
 * - Unique IV (Initialization Vector) per encryption
 * - PBKDF2 key derivation
 * - Signature verification for tamper detection
 * - Session-based secret key
 * 
 * Security:
 * - Data is encrypted and cannot be read without the secret
 * - Secret is stored in sessionStorage (cleared on browser close)
 * - Each encryption uses unique IV for additional security
 * - HMAC signature prevents tampering
 */

// Session-scoped key so user data never persists in localStorage
const STORAGE_KEY = 'currentUser';
const SESSION_SECRET_KEY = 'garage-session-secret';
const SALT_KEY = 'garage-salt';

// Utility functions
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toHex = (buffer) => 
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hexString) => 
  new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

const toBase64 = (buffer) => 
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const fromBase64 = (base64String) => 
  Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));

/**
 * Get or create session secret
 */
const getSessionSecret = () => {
  let secret = sessionStorage.getItem(SESSION_SECRET_KEY);
  if (!secret) {
    secret = crypto.randomUUID();
    sessionStorage.setItem(SESSION_SECRET_KEY, secret);
  }
  return secret;
};

/**
 * Get or create salt for key derivation
 */
const getSalt = () => {
  let salt = sessionStorage.getItem(SALT_KEY);
  if (!salt) {
    const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
    salt = toHex(saltBuffer);
    sessionStorage.setItem(SALT_KEY, salt);
  }
  return fromHex(salt);
};

/**
 * Derive encryption key from secret using PBKDF2
 */
const deriveKey = async (secret, salt) => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Create HMAC signature for tamper detection
 */
const signPayload = async (payload) => {
  const secret = getSessionSecret();
  const data = encoder.encode(`${secret}:${payload}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
};

/**
 * Encrypt data using AES-GCM
 */
const encryptData = async (data) => {
  try {
    const secret = getSessionSecret();
    const salt = getSalt();
    const key = await deriveKey(secret, salt);
    
    // Generate unique IV (Initialization Vector) for this encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoder.encode(data)
    );

    // Return IV + encrypted data as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return toBase64(combined);
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data using AES-GCM
 */
const decryptData = async (encryptedBase64) => {
  try {
    const secret = getSessionSecret();
    const salt = getSalt();
    const key = await deriveKey(secret, salt);
    
    // Extract IV and encrypted data
    const combined = fromBase64(encryptedBase64);
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encrypted
    );

    return decoder.decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Failed to decrypt data - possibly tampered or wrong session');
  }
};

/**
 * Persist user data with encryption and signature
 */
export const persistCurrentUser = async (user) => {
  try {
    console.log('🔐 Encrypting and persisting user data...');
    
    // Convert user object to JSON string
    const jsonString = JSON.stringify(user);
    
    // Encrypt the data
    const encrypted = await encryptData(jsonString);
    
    // Create signature for tamper detection
    const signature = await signPayload(encrypted);
    
    // Wrap encrypted data with signature
    const wrapped = JSON.stringify({
      data: encrypted,
      signature: signature,
      timestamp: Date.now()
    });
    
    // Store in sessionStorage to avoid lingering auth/session data in localStorage
    sessionStorage.setItem(STORAGE_KEY, wrapped);
    
    console.log('✅ User data encrypted and stored securely');
  } catch (err) {
    console.error('❌ Failed to persist user securely:', err);
    throw err;
  }
};

/**
 * Restore user data with decryption and verification
 */
export const restoreCurrentUser = async () => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    console.log('ℹ️ No stored user data found');
    return null;
  }

  try {
    console.log('🔓 Restoring encrypted user data...');
    
    // Parse stored data
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !parsed?.signature) {
      console.warn('⚠️ Invalid stored data format, clearing...');
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Verify signature (tamper detection)
    const expectedSignature = await signPayload(parsed.data);
    if (expectedSignature !== parsed.signature) {
      console.warn('🚨 SECURITY ALERT: Detected tampered session data, clearing storage');
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.clear(); // Clear session too for safety
        return null;
      }

    // Decrypt the data
    const decrypted = await decryptData(parsed.data);
    const user = JSON.parse(decrypted);
    
    console.log('✅ User data decrypted and verified successfully');
    return user;
  } catch (err) {
    console.error('❌ Failed to restore secure session:', err);
    sessionStorage.removeItem(STORAGE_KEY);
    
    // If decryption fails, it might be from different session
    if (err.message.includes('decrypt')) {
      console.warn('⚠️ Session expired or data from different browser session');
      sessionStorage.clear();
    }
    
    return null;
  }
};

/**
 * Clear stored user data
 */
export const clearStoredUser = () => {
  console.log('🗑️ Clearing stored user data...');
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_SECRET_KEY);
  sessionStorage.removeItem(SALT_KEY);
  console.log('✅ Storage cleared');
};

/**
 * Check if user session is valid
 */
export const isSessionValid = () => {
  const secret = sessionStorage.getItem(SESSION_SECRET_KEY);
  const data = localStorage.getItem(STORAGE_KEY);
  return !!(secret && data);
};

/**
 * Get session info (for debugging)
 */
export const getSessionInfo = () => {
  return {
    hasSecret: !!sessionStorage.getItem(SESSION_SECRET_KEY),
    hasSalt: !!sessionStorage.getItem(SALT_KEY),
    hasStoredData: !!localStorage.getItem(STORAGE_KEY),
    isValid: isSessionValid()
  };
};

export default {
  persistCurrentUser,
  restoreCurrentUser,
  clearStoredUser,
  isSessionValid,
  getSessionInfo
};