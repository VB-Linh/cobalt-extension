// src/background/auth/jwtManager.js
import { STORAGE_KEYS } from '../../shared/constants/index.js';
import { normalizeCobaltUrl } from '../../shared/utils/urlHelper.js';

// In-memory fallback for environments without chrome.storage.session
let inMemorySession = null;

/**
 * Checks whether chrome.storage.session is available.
 * @returns {boolean}
 */
function hasStorageSession() {
  return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.session?.get);
}

/**
 * Saves a JWT session token securely into chrome.storage.session.
 * Never persists into chrome.storage.local.
 * 
 * @param {string} instanceUrl - Normalized Cobalt instance URL
 * @param {string} token - JWT bearer token
 * @param {number} expSeconds - Token lifetime duration in seconds (from Cobalt POST /session)
 * @returns {Promise<{ success: boolean, expiresAt: number }>}
 */
export async function saveSessionToken(instanceUrl, token, expSeconds = 180) {
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new TypeError('JWT token phải là một chuỗi không rỗng.');
  }

  const normalizedUrl = normalizeCobaltUrl(instanceUrl);
  const lifetime = typeof expSeconds === 'number' && expSeconds > 0 ? expSeconds : 180;
  const expiresAt = Math.floor(Date.now() / 1000) + lifetime;

  const sessionData = {
    token: token.trim(),
    exp: expiresAt,
    instanceUrl: normalizedUrl,
    createdAt: Date.now(),
  };

  inMemorySession = sessionData;

  if (hasStorageSession()) {
    try {
      await chrome.storage.session.set({
        [STORAGE_KEYS.JWT_SESSION]: sessionData,
      });
    } catch {
      // In-memory fallback preserved
    }
  }

  return { success: true, expiresAt };
}

/**
 * Synchronously retrieves the cached JWT token if valid and unexpired.
 * 
 * @param {string} [instanceUrl]
 * @returns {string|null}
 */
export function getSessionTokenSync(instanceUrl = '') {
  if (!inMemorySession || !inMemorySession.token) return null;

  if (instanceUrl && typeof instanceUrl === 'string' && instanceUrl.trim()) {
    const targetNormalized = normalizeCobaltUrl(instanceUrl);
    if (inMemorySession.instanceUrl && inMemorySession.instanceUrl !== targetNormalized) {
      return null;
    }
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime >= (inMemorySession.exp - 3)) {
    inMemorySession = null;
    return null;
  }

  return inMemorySession.token;
}

/**
 * Retrieves the active, unexpired JWT bearer token.
 * Automatically clears and returns null if the token has expired.
 * 
 * @param {string} [instanceUrl] - Optional instance URL to assert matching instance
 * @returns {Promise<string|null>} The raw JWT token or null
 */
export async function getSessionToken(instanceUrl = '') {
  let sessionData = inMemorySession;

  if (hasStorageSession()) {
    try {
      const data = await chrome.storage.session.get(STORAGE_KEYS.JWT_SESSION);
      if (data && data[STORAGE_KEYS.JWT_SESSION]) {
        sessionData = data[STORAGE_KEYS.JWT_SESSION];
      }
    } catch {
      sessionData = inMemorySession;
    }
  }

  if (!sessionData || !sessionData.token) {
    return null;
  }

  // If instanceUrl is specified, ensure session belongs to this instance
  if (instanceUrl && typeof instanceUrl === 'string' && instanceUrl.trim()) {
    const targetNormalized = normalizeCobaltUrl(instanceUrl);
    if (sessionData.instanceUrl && sessionData.instanceUrl !== targetNormalized) {
      return null;
    }
  }

  // Check expiration with 3-second safety margin
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime >= (sessionData.exp - 3)) {
    await clearSessionToken();
    return null;
  }

  return sessionData.token;
}

/**
 * Clears the stored JWT session token.
 * 
 * @returns {Promise<void>}
 */
export async function clearSessionToken() {
  inMemorySession = null;

  if (hasStorageSession()) {
    try {
      await chrome.storage.session.remove(STORAGE_KEYS.JWT_SESSION);
    } catch {
      // Ignore removal failure
    }
  }
}

/**
 * Checks whether an active, valid session exists for the given instance URL.
 * 
 * @param {string} [instanceUrl]
 * @returns {Promise<boolean>}
 */
export async function isSessionValid(instanceUrl = '') {
  const token = await getSessionToken(instanceUrl);
  return Boolean(token);
}

/**
 * Returns safe metadata about session state without ever exposing the raw JWT.
 * 
 * @param {string} [instanceUrl]
 * @returns {Promise<{ authenticated: boolean, expired: boolean, expiresIn: number|null, instanceUrl: string|null }>}
 */
export async function getSessionStatus(instanceUrl = '') {
  let sessionData = inMemorySession;

  if (hasStorageSession()) {
    try {
      const data = await chrome.storage.session.get(STORAGE_KEYS.JWT_SESSION);
      if (data && data[STORAGE_KEYS.JWT_SESSION]) {
        sessionData = data[STORAGE_KEYS.JWT_SESSION];
      }
    } catch {
      sessionData = inMemorySession;
    }
  }

  if (!sessionData || !sessionData.token) {
    return {
      authenticated: false,
      expired: false,
      expiresIn: null,
      instanceUrl: null,
    };
  }

  if (instanceUrl && typeof instanceUrl === 'string' && instanceUrl.trim()) {
    const targetNormalized = normalizeCobaltUrl(instanceUrl);
    if (sessionData.instanceUrl && sessionData.instanceUrl !== targetNormalized) {
      return {
        authenticated: false,
        expired: false,
        expiresIn: null,
        instanceUrl: sessionData.instanceUrl,
      };
    }
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const remaining = sessionData.exp - currentTime;

  if (remaining <= 0) {
    return {
      authenticated: false,
      expired: true,
      expiresIn: 0,
      instanceUrl: sessionData.instanceUrl,
    };
  }

  return {
    authenticated: true,
    expired: false,
    expiresIn: remaining,
    instanceUrl: sessionData.instanceUrl,
  };
}
