// src/shared/utils/urlHelper.js

/**
 * Normalizes a Cobalt API instance URL:
 * - Trims whitespace
 * - Standardizes protocol/host
 * - Strips trailing slashes
 * 
 * @param {string} url
 * @returns {string}
 */
export function normalizeCobaltUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    const host = parsed.host.toLowerCase();
    let pathname = parsed.pathname.replace(/\/+$/, '');
    if (pathname === '/') pathname = '';
    return `${protocol}//${host}${pathname}`;
  } catch {
    // If not parseable directly, strip trailing slashes and trim
    return trimmed.replace(/\/+$/, '');
  }
}

/**
 * Validates whether a Cobalt URL is safe and valid for network requests.
 * Only http: and https: protocols are permitted.
 * 
 * @param {string} url
 * @returns {{ valid: boolean, error?: string, origin?: string, url?: string }}
 */
export function validateCobaltUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { valid: false, error: 'EMPTY_URL' };
  }

  const trimmed = url.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'MALFORMED_URL' };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { valid: false, error: 'INVALID_PROTOCOL' };
  }

  if (!parsed.hostname) {
    return { valid: false, error: 'MALFORMED_URL' };
  }

  return {
    valid: true,
    origin: parsed.origin,
    url: normalizeCobaltUrl(trimmed),
  };
}

/**
 * Extracts Chrome permission origin pattern (e.g. 'https://cobalt.example.com/*')
 * from an instance URL for optional_host_permissions requests.
 * 
 * @param {string} url
 * @returns {string | null}
 */
export function extractOriginPattern(url) {
  const validation = validateCobaltUrl(url);
  if (!validation.valid || !validation.origin) {
    return null;
  }
  return `${validation.origin}/*`;
}
