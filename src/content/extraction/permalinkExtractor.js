// src/content/extraction/permalinkExtractor.js
import { SELECTORS } from '../detection/constants.js';
import { extractTweetId, extractMediaIndex, extractUsername, normalizeTweetUrl } from './urlNormalizer.js';
import { findQuotedTweetContainer, isQuotedTweet } from '../detection/tweetFinder.js';
import { extractMediaFingerprint } from '../detection/videoDetector.js';

/**
 * @typedef {Object} TweetInfo
 * @property {string | null} tweetId - Numeric Snowflake ID of the tweet
 * @property {string | null} permalink - Canonical URL (https://x.com/user/status/id[/video/index])
 * @property {number | null} mediaIndex - 1-based official media index if official anchor exists, else null
 * @property {string | null} mediaFingerprint - Stable media fingerprint derived from poster/src if mediaIndex is null
 * @property {boolean} isQuoted - True if video belongs to an embedded quoted tweet
 * @property {string | null} username - Extracted username or null
 * @property {Element | null} container - The effective tweet or quote container
 */

/**
 * Extracts tweet metadata and canonical permalink for a video element.
 * 
 * STRICT RULE: If no official anchor around the video contains /video/:index or /photo/:index,
 * mediaIndex MUST be null. NEVER synthesize or guess media index from DOM order!
 * 
 * @param {Element | null} tweetContainer - Enclosing container
 * @param {HTMLVideoElement} videoElement - Target video element
 * @returns {TweetInfo}
 */
export function extractTweetInfo(tweetContainer, videoElement) {
  const result = {
    tweetId: null,
    permalink: null,
    mediaIndex: null,
    mediaFingerprint: null,
    isQuoted: false,
    username: null,
    container: tweetContainer || null,
  };

  if (!videoElement) {
    return result;
  }

  // Stable media fingerprint (from poster, src, or media id)
  result.mediaFingerprint = extractMediaFingerprint(videoElement);

  // 1. Detect official media index from immediate wrapping or adjacent anchor
  // Look up to 3 levels up or closest anchor for an official media index
  let surroundingAnchor = (typeof videoElement.closest === 'function')
    ? videoElement.closest('a[href*="/status/"], a[href*="/statuses/"]')
    : null;

  if (surroundingAnchor) {
    const href = surroundingAnchor.getAttribute('href') || surroundingAnchor.href || '';
    result.mediaIndex = extractMediaIndex(href);
  }

  // 2. Check for Quoted Tweet
  const quoteContainer = findQuotedTweetContainer(videoElement, tweetContainer);
  const isQuoted = Boolean(quoteContainer) || isQuotedTweet(tweetContainer, videoElement);

  if (isQuoted) {
    result.isQuoted = true;
    const effectiveQuoteContainer = quoteContainer || tweetContainer;
    result.container = effectiveQuoteContainer;

    // Search for status link strictly within quote container
    let quoteHref = null;
    if (effectiveQuoteContainer) {
      if (typeof effectiveQuoteContainer.getAttribute === 'function') {
        const directHref = effectiveQuoteContainer.getAttribute('href');
        if (directHref && extractTweetId(directHref)) {
          quoteHref = directHref;
        }
      }

      if (!quoteHref && (typeof effectiveQuoteContainer.querySelectorAll === 'function' || typeof effectiveQuoteContainer.querySelector === 'function')) {
        // Strategy A for quote: locate <time> element's parent status <a> with valid tweet ID
        const timeElements = (typeof effectiveQuoteContainer.querySelectorAll === 'function')
          ? effectiveQuoteContainer.querySelectorAll(SELECTORS.TIME_ELEMENT)
          : [effectiveQuoteContainer.querySelector(SELECTORS.TIME_ELEMENT)].filter(Boolean);

        for (const timeEl of timeElements) {
          const anchor = timeEl.closest?.(SELECTORS.STATUS_ANCHOR);
          if (anchor) {
            const href = anchor.getAttribute('href') || anchor.href;
            if (href && extractTweetId(href)) {
              quoteHref = href;
              break;
            }
          }
        }

        // Strategy B for quote: query any status anchor in quote container with valid tweet ID
        if (!quoteHref) {
          const statusAnchors = (typeof effectiveQuoteContainer.querySelectorAll === 'function')
            ? effectiveQuoteContainer.querySelectorAll(SELECTORS.STATUS_ANCHOR)
            : [effectiveQuoteContainer.querySelector(SELECTORS.STATUS_ANCHOR)].filter(Boolean);

          for (const statusAnchor of statusAnchors) {
            const href = statusAnchor.getAttribute('href') || statusAnchor.href;
            if (href && extractTweetId(href)) {
              quoteHref = href;
              break;
            }
          }
        }
      }
    }

    if (quoteHref) {
      const qId = extractTweetId(quoteHref);
      if (qId) {
        result.tweetId = qId;
        result.username = extractUsername(quoteHref);
        result.permalink = normalizeTweetUrl(quoteHref, {
          mediaIndex: result.mediaIndex,
          username: result.username,
        });
        return result;
      }
    }
  }

  // 3. Main / Standard Tweet Container
  const effectiveContainer = tweetContainer || ((typeof videoElement.closest === 'function') ? videoElement.closest(SELECTORS.TWEET_ARTICLE) : null);
  result.container = effectiveContainer;

  let statusHref = null;

  if (effectiveContainer && (typeof effectiveContainer.querySelectorAll === 'function' || typeof effectiveContainer.querySelector === 'function')) {
    // Strategy A: Best practice - locate <time> element's parent status <a>
    const timeElements = (typeof effectiveContainer.querySelectorAll === 'function')
      ? effectiveContainer.querySelectorAll(SELECTORS.TIME_ELEMENT)
      : [effectiveContainer.querySelector(SELECTORS.TIME_ELEMENT)].filter(Boolean);

    for (const timeEl of timeElements) {
      // Ignore time elements belonging to inner quoted tweets
      const quoteAncestor = timeEl.closest?.(SELECTORS.QUOTE_CONTAINER);
      if (quoteAncestor && (quoteAncestor.getAttribute?.('data-testid') === 'quoteTweet' || quoteAncestor.getAttribute?.('data-testid') === 'tweetQuote')) {
        continue;
      }
      const anchor = timeEl.closest?.(SELECTORS.STATUS_ANCHOR);
      if (anchor) {
        const href = anchor.getAttribute('href') || anchor.href;
        if (href && extractTweetId(href)) {
          statusHref = href;
          break;
        }
      }
    }

    // Strategy B: If <time> not found or not a valid status, query status anchors in tweet
    if (!statusHref) {
      const statusAnchors = (typeof effectiveContainer.querySelectorAll === 'function')
        ? effectiveContainer.querySelectorAll(SELECTORS.STATUS_ANCHOR)
        : [effectiveContainer.querySelector(SELECTORS.STATUS_ANCHOR)].filter(Boolean);

      for (const statusAnchor of statusAnchors) {
        // Ignore status anchors belonging to inner quoted tweets
        const quoteAncestor = statusAnchor.closest?.(SELECTORS.QUOTE_CONTAINER);
        if (quoteAncestor && (quoteAncestor.getAttribute?.('data-testid') === 'quoteTweet' || quoteAncestor.getAttribute?.('data-testid') === 'tweetQuote')) {
          continue;
        }
        const href = statusAnchor.getAttribute('href') || statusAnchor.href;
        if (href && extractTweetId(href)) {
          statusHref = href;
          break;
        }
      }
    }
  }

  // Strategy C: If container is modal viewer or window matches status (e.g. detail page)
  if (!statusHref && typeof window !== 'undefined' && window.location) {
    const locHref = window.location.pathname || window.location.href || '';
    if (extractTweetId(locHref)) {
      statusHref = locHref;
    }
  }

  if (statusHref) {
    const tId = extractTweetId(statusHref);
    if (tId) {
      result.tweetId = tId;
      result.username = extractUsername(statusHref);
      result.permalink = normalizeTweetUrl(statusHref, {
        mediaIndex: result.mediaIndex,
        username: result.username,
      });
    }
  }

  return result;
}
