// src/content/detection/tweetFinder.js
import { SELECTORS } from './constants.js';

/**
 * Checks if a video element is located within an excluded non-tweet UI context (e.g. composer, sidebar, DMs).
 * 
 * @param {Element} videoElement
 * @returns {boolean}
 */
export function isExcludedContext(videoElement) {
  if (!videoElement || typeof videoElement.closest !== 'function') {
    return true;
  }
  return Boolean(
    videoElement.closest(SELECTORS.EXCLUDED_COMPOSER) ||
    videoElement.closest(SELECTORS.EXCLUDED_SIDEBAR) ||
    videoElement.closest(SELECTORS.EXCLUDED_DM)
  );
}

/**
 * Detects if the video element is enclosed within a quoted tweet card.
 * 
 * @param {Element} videoElement
 * @param {Element} [tweetContainer]
 * @returns {Element | null} Quoted tweet container element if video is inside a quote, otherwise null
 */
export function findQuotedTweetContainer(videoElement, tweetContainer = null) {
  if (!videoElement || typeof videoElement.closest !== 'function') {
    return null;
  }

  // If tweetContainer itself is already the quote container
  if (tweetContainer && isQuoteElement(tweetContainer)) {
    return tweetContainer;
  }

  // Find closest quote container ancestor
  const quoteWrapper = videoElement.closest(SELECTORS.QUOTE_CONTAINER);
  if (quoteWrapper && isQuoteElement(quoteWrapper)) {
    if (!tweetContainer || (tweetContainer.contains(quoteWrapper) && quoteWrapper !== tweetContainer)) {
      return quoteWrapper;
    }
    if (quoteWrapper === tweetContainer) {
      return quoteWrapper;
    }
  }

  // Fallback: traverse ancestors between videoElement and tweetContainer
  let curr = videoElement.parentElement;
  while (curr && curr !== tweetContainer && curr !== document.body) {
    if (isQuoteElement(curr)) {
      return curr;
    }
    curr = curr.parentElement;
  }

  return null;
}

/**
 * Checks whether an element qualifies as a quote container.
 * 
 * @param {Element} el
 * @returns {boolean}
 */
function isQuoteElement(el) {
  if (!el || typeof el.getAttribute !== 'function') return false;
  if (el.getAttribute('data-testid') === 'quoteTweet' || el.getAttribute('data-testid') === 'tweetQuote') {
    return true;
  }
  // A quoted tweet card on Twitter is an element with role="link" containing a status link or time
  if (el.getAttribute('role') === 'link' && el.querySelector?.('time, a[href*="/status/"], a[href*="/statuses/"]')) {
    return true;
  }
  return false;
}

/**
 * Determines whether a video element is inside a quoted tweet.
 * 
 * @param {Element} container - Enclosing tweet container
 * @param {Element} videoElement - Target video element
 * @returns {boolean}
 */
export function isQuotedTweet(container, videoElement) {
  if (!videoElement) return false;
  if (container && isQuoteElement(container)) return true;
  return Boolean(findQuotedTweetContainer(videoElement, container));
}

/**
 * Finds the enclosing tweet container for a given video element.
 * Prioritizes quoted tweet cards to ensure videos in quoted tweets link to the quoted tweet.
 * Falls back to article[data-testid="tweet"] or detail modal container.
 * 
 * @param {HTMLVideoElement} videoElement
 * @returns {Element | null}
 */
export function findTweetContainer(videoElement) {
  if (!videoElement || typeof videoElement.closest !== 'function') {
    return null;
  }
  if (isExcludedContext(videoElement)) {
    return null;
  }

  // 1. Quoted Tweet card: If video is inside a quoted tweet card, isolate and return the quote card
  const quoteContainer = videoElement.closest(SELECTORS.QUOTE_CONTAINER);
  if (quoteContainer && isQuoteElement(quoteContainer)) {
    return quoteContainer;
  }

  // 2. Standard Tweet Article
  const tweetArticle = videoElement.closest(SELECTORS.TWEET_ARTICLE);
  if (tweetArticle) {
    // Check if there is an intermediate quote container inside this article
    const innerQuote = findQuotedTweetContainer(videoElement, tweetArticle);
    return innerQuote || tweetArticle;
  }

  // 3. Modal / Dialog (e.g. photo/video media viewer)
  const modalDialog = videoElement.closest('div[aria-modal="true"], div[role="dialog"]');
  if (modalDialog) {
    const innerArticle = modalDialog.querySelector(SELECTORS.TWEET_ARTICLE);
    return innerArticle || modalDialog;
  }

  // 4. Detail page without standard article wrapper (fallback to primary column / main)
  const mainColumn = videoElement.closest('main[role="main"], [data-testid="primaryColumn"]');
  if (mainColumn && typeof window !== 'undefined' && window.location) {
    const locHref = window.location.pathname || window.location.href || '';
    if (locHref.includes('/status/')) {
      return mainColumn;
    }
  }

  return null;
}
