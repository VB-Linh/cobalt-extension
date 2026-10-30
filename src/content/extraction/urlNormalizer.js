// src/content/extraction/urlNormalizer.js
import { REGEX } from '../detection/constants.js';

/**
 * Extracts numeric Tweet ID from a status URL or path.
 * Supports both x.com, twitter.com, mobile.twitter.com, and relative paths.
 * 
 * @param {string} urlString - URL string to parse
 * @returns {string | null} Tweet ID if found, otherwise null
 */
export function extractTweetId(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return null;
  }
  const cleanPath = urlString.trim().split(/[?#]/)[0];
  const match = cleanPath.match(REGEX.TWEET_ID);
  return match ? match[1] : null;
}

/**
 * Extracts 1-based official media index (/video/:index or /photo/:index) from a URL string.
 * Strictly returns null if no official index pattern exists in the URL.
 * 
 * @param {string} urlString - URL string to parse
 * @returns {number | null} 1-based media index or null
 */
export function extractMediaIndex(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return null;
  }
  const cleanPath = urlString.trim().split(/[?#]/)[0];
  const match = cleanPath.match(REGEX.MEDIA_INDEX);
  if (!match) {
    return null;
  }
  const index = parseInt(match[1], 10);
  return Number.isInteger(index) && index > 0 ? index : null;
}

/**
 * Extracts username from a status URL string if present.
 * 
 * @param {string} urlString - URL string to parse
 * @returns {string | null} Username or null
 */
export function extractUsername(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return null;
  }
  const cleanPath = urlString.trim().split(/[?#]/)[0];
  const match = cleanPath.match(REGEX.STATUS_URL);
  if (!match) {
    return null;
  }
  const username = match[1];
  return username ? username.trim() : null;
}

/**
 * Normalizes a Twitter/X URL or relative path to a canonical https://x.com/${username}/status/${tweetId} format.
 * Strips all query parameters (?s=..., ?t=...) and hash fragments (#...).
 * 
 * @param {string} urlString - Raw URL string or path
 * @param {object} [options={}]
 * @param {number | null} [options.mediaIndex] - Explicit official media index (if any)
 * @param {string} [options.username] - Explicit username override (if any)
 * @returns {string | null} Canonical permalink or null if tweetId cannot be determined
 */
export function normalizeTweetUrl(urlString, options = {}) {
  const tweetId = extractTweetId(urlString);
  if (!tweetId) {
    return null;
  }

  const username = options.username || extractUsername(urlString) || 'i';
  let canonical = `https://x.com/${username}/status/${tweetId}`;

  // Check explicit options.mediaIndex first; fall back to extracting from urlString
  const mediaIndex = (options.mediaIndex !== undefined)
    ? options.mediaIndex
    : extractMediaIndex(urlString);

  if (mediaIndex !== null && mediaIndex !== undefined && Number.isInteger(Number(mediaIndex)) && Number(mediaIndex) > 0) {
    canonical += `/video/${Number(mediaIndex)}`;
  }

  return canonical;
}

/**
 * Checks whether an ID string is a valid numeric Twitter Snowflake ID.
 * 
 * @param {unknown} tweetId
 * @returns {boolean}
 */
export function isValidTweetId(tweetId) {
  return typeof tweetId === 'string' && REGEX.NUMERIC_ID.test(tweetId);
}
