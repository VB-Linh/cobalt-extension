// src/shared/utils/errorHelper.js

/**
 * Redacts sensitive credentials (tokens, keys, secrets) from text strings.
 * 
 * @param {string} text
 * @returns {string}
 */
export function redactSensitiveText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/Api-Key\s+[A-Za-z0-9._~+/-]+=*/gi, 'Api-Key [REDACTED]')
    .replace(/\b(api[_-]?key|session[_-]?token|token|jwt|secret|password|auth)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]*)?\b/g, '[REDACTED_JWT]');
}

/**
 * Safely extracts a clean, human-readable string message from an error or payload.
 * Prevents [object Object] from ever being rendered in the UI.
 * 
 * @param {any} err
 * @param {string} [fallback='Lỗi không xác định.']
 * @returns {string}
 */
export function formatErrorMessage(err, fallback = 'Lỗi không xác định.') {
  if (err === null || err === undefined || err === '') {
    return fallback;
  }

  if (typeof err === 'string') {
    const trimmed = err.trim();
    return redactSensitiveText(trimmed) || fallback;
  }

  if (typeof err === 'number' || typeof err === 'boolean') {
    return String(err);
  }

  if (typeof err === 'object') {
    // 1. Check direct .message string
    if (typeof err.message === 'string' && err.message.trim()) {
      return redactSensitiveText(err.message.trim());
    }

    // 2. Check direct .error string
    if (typeof err.error === 'string' && err.error.trim()) {
      return redactSensitiveText(err.error.trim());
    }

    // 3. Check nested .error object (.error.message or .error.code)
    if (err.error && typeof err.error === 'object') {
      if (typeof err.error.message === 'string' && err.error.message.trim()) {
        return redactSensitiveText(err.error.message.trim());
      }
      if (typeof err.error.code === 'string' && err.error.code.trim()) {
        return redactSensitiveText(err.error.code.trim());
      }
    }

    // 4. Check .code string
    if (typeof err.code === 'string' && err.code.trim()) {
      return redactSensitiveText(err.code.trim());
    }

    // 5. Check .rawCode string
    if (typeof err.rawCode === 'string' && err.rawCode.trim()) {
      return redactSensitiveText(err.rawCode.trim());
    }

    // 6. Check .statusText string
    if (typeof err.statusText === 'string' && err.statusText.trim()) {
      return redactSensitiveText(err.statusText.trim());
    }

    // 7. Check .details string
    if (typeof err.details === 'string' && err.details.trim()) {
      return redactSensitiveText(err.details.trim());
    }

    // 8. Defensive JSON serialization if object has meaningful keys
    try {
      const keys = Object.keys(err);
      if (keys.length > 0) {
        // Strip sensitive fields before stringifying
        const safe = { ...err };
        for (const k of Object.keys(safe)) {
          const lower = k.toLowerCase();
          if (
            lower.includes('key') ||
            lower.includes('token') ||
            lower.includes('secret') ||
            lower.includes('jwt') ||
            lower.includes('auth') ||
            lower.includes('pass')
          ) {
            delete safe[k];
          }
        }
        const str = JSON.stringify(safe);
        if (str && str !== '{}') return redactSensitiveText(str);
      }
    } catch {
      // ignore
    }
  }

  return fallback;
}
