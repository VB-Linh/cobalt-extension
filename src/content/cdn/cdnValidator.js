// src/content/cdn/cdnValidator.js

export const VALID_TWIMG_HOSTNAME = 'video.twimg.com';

/**
 * Validates whether a given URL is a legitimate, secure Twitter video CDN URL.
 * 
 * Rules:
 * - Protocol must be strictly 'https:'.
 * - Hostname must strictly equal 'video.twimg.com' (case-insensitive, no spoofing, no subdomains).
 * - Path must be non-empty and point to a media resource.
 * - Rejects blob:, data:, http:, Cobalt proxy URLs, Tweet web page URLs, image CDN URLs.
 * 
 * @param {string} urlString
 * @returns {boolean}
 */
export function isValidTwimgCdnUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }

  const trimmed = urlString.trim();
  if (!trimmed) {
    return false;
  }

  // Reject blob: and data: immediately
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);

    // 1. Strict HTTPS protocol enforcement
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // 2. Strict Hostname Match against exact video.twimg.com (prevents spoofing like video.twimg.com.attacker.com)
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== VALID_TWIMG_HOSTNAME) {
      return false;
    }

    // 3. Path must be non-empty and not the root slash
    const pathname = parsed.pathname;
    if (!pathname || pathname === '/' || pathname.trim() === '') {
      return false;
    }

    // 4. Reject image extensions (thumbnails/posters mistakenly parsed as video)
    const lowerPath = pathname.toLowerCase();
    if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg') || lowerPath.endsWith('.png') || lowerPath.endsWith('.webp')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Alias for isValidTwimgCdnUrl for API flexibility.
 * 
 * @param {string} urlString
 * @returns {boolean}
 */
export const validateCdnUrl = isValidTwimgCdnUrl;

/**
 * Validates whether a tweet ID is a valid numeric Snowflake string.
 * 
 * @param {string|number} tweetId
 * @returns {boolean}
 */
export function isValidTweetId(tweetId) {
  if (!tweetId) return false;
  const str = String(tweetId).trim();
  return /^\d{1,25}$/.test(str);
}

/**
 * Checks whether a given CDN URL is an HLS playlist (.m3u8).
 * 
 * @param {string} urlString
 * @returns {boolean}
 */
export function isHlsUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString);
    return parsed.pathname.toLowerCase().endsWith('.m3u8') || parsed.pathname.toLowerCase().includes('.m3u8');
  } catch {
    return false;
  }
}
