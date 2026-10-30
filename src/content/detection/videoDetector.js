// src/content/detection/videoDetector.js
import { SELECTORS } from './constants.js';
import { findTweetContainer, isExcludedContext } from './tweetFinder.js';

/**
 * Evaluates whether a video element is eligible for extension handling.
 * 
 * @param {HTMLVideoElement} videoElement
 * @returns {boolean}
 */
export function isEligibleVideo(videoElement) {
  if (!videoElement || typeof videoElement.closest !== 'function') {
    return false;
  }
  // If running in DOM environment where isConnected is defined
  if (videoElement.isConnected === false) {
    return false;
  }
  if (isExcludedContext(videoElement)) {
    return false;
  }
  const container = findTweetContainer(videoElement);
  return Boolean(container);
}

/**
 * Discovers and returns all eligible <video> elements within the specified root element or document.
 * 
 * @param {Element | Document} [root=document]
 * @returns {HTMLVideoElement[]}
 */
export function detectVideos(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return [];
  }

  const videoNodes = root.querySelectorAll(SELECTORS.VIDEO_TAG);
  const eligibleVideos = [];

  for (let i = 0; i < videoNodes.length; i++) {
    const video = videoNodes[i];
    if (isEligibleVideo(video)) {
      eligibleVideos.push(video);
    }
  }

  return eligibleVideos;
}

/**
 * Extracts a stable media fingerprint from a video element when official mediaIndex is unavailable.
 * Inspects:
 * 1. video.dataset.mediaId or data-media-id attribute
 * 2. Poster URL:
 *    - amplify_video_thumb/:id
 *    - ext_tw_video_thumb/:id
 *    - tweet_video_thumb/:id
 *    - pbs.twimg.com/media/:id
 *    - pathname filename slug
 * 3. Video src or child <source> src:
 *    - amplify_video/:id
 *    - ext_tw_video/:id
 *    - tweet_video/:id
 *    - blob: UUID
 * 4. Ancestor container data-media-id or unique marker
 * 
 * STRICT ARCHITECTURAL RULE:
 * This derives media identity from element attributes/sources.
 * NEVER synthesize or guess media index from DOM order!
 * 
 * @param {Element} videoElement
 * @returns {string | null}
 */
export function extractMediaFingerprint(videoElement) {
  if (!videoElement || typeof videoElement.getAttribute !== 'function') {
    return null;
  }

  // 1. Direct or dataset media-id
  const directMediaId = videoElement.dataset?.mediaId || videoElement.getAttribute('data-media-id');
  if (directMediaId && typeof directMediaId === 'string' && directMediaId.trim()) {
    return directMediaId.trim();
  }

  // 2. Poster URL analysis
  const poster = videoElement.getAttribute('poster') || videoElement.poster;
  if (poster && typeof poster === 'string') {
    const thumbMatch = poster.match(/(?:amplify_video_thumb|ext_tw_video_thumb)\/(\d+)/i);
    if (thumbMatch && thumbMatch[1]) {
      return thumbMatch[1];
    }
    const tweetVideoMatch = poster.match(/tweet_video_thumb\/([a-zA-Z0-9_-]+)/i);
    if (tweetVideoMatch && tweetVideoMatch[1]) {
      return tweetVideoMatch[1];
    }
    const mediaThumbMatch = poster.match(/pbs\.twimg\.com\/media\/([a-zA-Z0-9_-]+)/i);
    if (mediaThumbMatch && mediaThumbMatch[1]) {
      return mediaThumbMatch[1];
    }
    try {
      const url = new URL(poster, 'https://x.com');
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const last = segments[segments.length - 1].replace(/\.[^.]+$/, '');
        if (last && last !== 'img') {
          return last;
        }
        if (segments.length > 1) {
          return segments[segments.length - 2];
        }
      }
    } catch {
      // ignore URL parsing failures
    }
  }

  // 3. Video src or child <source> src
  const src = videoElement.currentSrc || videoElement.getAttribute('src') || videoElement.src || videoElement.querySelector?.('source')?.getAttribute('src');
  if (src && typeof src === 'string') {
    const srcMatch = src.match(/(?:amplify_video|ext_tw_video)\/(\d+)/i);
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1];
    }
    const tweetVideoSrcMatch = src.match(/tweet_video\/([a-zA-Z0-9_-]+)/i);
    if (tweetVideoSrcMatch && tweetVideoSrcMatch[1]) {
      return tweetVideoSrcMatch[1];
    }
    const blobMatch = src.match(/blob:[^/]+\/([a-zA-Z0-9_-]+)/i);
    if (blobMatch && blobMatch[1]) {
      return `blob_${blobMatch[1]}`;
    }
  }

  // 4. Ancestor container data-media-id
  const ancestorWithMediaId = videoElement.closest?.('[data-media-id]');
  if (ancestorWithMediaId) {
    const ancestorId = ancestorWithMediaId.getAttribute('data-media-id');
    if (ancestorId && ancestorId.trim()) {
      return ancestorId.trim();
    }
  }

  return null;
}

/**
 * Generates an isolated canonical key for a video element per tweet.
 * 
 * Hierarchy:
 * 1. Official media index: `${tweetId}_media_${mediaIndex}` (e.g. "12345_media_1")
 * 2. Stable media fingerprint (from poster, src, or media id): `${tweetId}_media_fp_${fp}`
 * 3. Multi-video container with no identifying attributes: assign isolated per-element token to prevent collision: `${tweetId}_media_tok_${token}`
 * 4. Single-video default fallback: `${tweetId}_media_null`
 * 
 * STRICT ARCHITECTURAL RULE:
 * Multiple videos in the same tweet MUST NOT share `${tweetId}_media_null`.
 * NEVER synthesize or guess media index from DOM order!
 * 
 * @param {string | null} tweetId - Numeric status ID
 * @param {number | string | null} [mediaIndex=null] - 1-based official media index
 * @param {Element | string | null} [extraIdentifier=null] - Video element or fingerprint string
 * @returns {string} Standardized per-video key
 */
export function getVideoKey(tweetId, mediaIndex = null, extraIdentifier = null) {
  const normalizedIndex = (mediaIndex !== undefined && mediaIndex !== null) ? mediaIndex : null;

  if (normalizedIndex !== null) {
    return `${tweetId}_media_${normalizedIndex}`;
  }

  // String fingerprint directly passed
  if (typeof extraIdentifier === 'string' && extraIdentifier.trim().length > 0) {
    return `${tweetId}_media_fp_${extraIdentifier.trim()}`;
  }

  // Video element passed
  if (extraIdentifier && typeof extraIdentifier === 'object') {
    const fp = extractMediaFingerprint(extraIdentifier);
    if (fp) {
      return `${tweetId}_media_fp_${fp}`;
    }

    // Check if the element is inside a container with multiple videos
    const container = extraIdentifier.closest?.('article, [data-testid="tweet"]') || extraIdentifier.parentElement;
    const siblingVideos = container?.querySelectorAll?.('video');
    if (siblingVideos && siblingVideos.length > 1) {
      // Multiple videos without official index or fingerprint: assign instance token to prevent key collision!
      if (!extraIdentifier.dataset) {
        extraIdentifier.dataset = {};
      }
      if (!extraIdentifier.dataset.xvtToken) {
        extraIdentifier.dataset.xvtToken = Math.random().toString(36).slice(2, 10);
      }
      return `${tweetId}_media_tok_${extraIdentifier.dataset.xvtToken}`;
    }
  }

  return `${tweetId}_media_null`;
}
