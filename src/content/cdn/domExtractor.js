// src/content/cdn/domExtractor.js
import { isValidTwimgCdnUrl } from './cdnValidator.js';

/**
 * Directly extracts a valid MP4 CDN URL from a DOM video element if present.
 * 
 * Inspection Order:
 * 1. video.currentSrc (if non-empty and valid)
 * 2. video.src or video.getAttribute('src')
 * 3. Child <source> elements in DOM order (source.src or source.getAttribute('src'))
 * 
 * Strict Exclusions:
 * - blob: URLs (returns null, triggers fallback)
 * - video.poster or image thumbnails (strictly excluded)
 * - non-video.twimg.com URLs
 * - non-MP4 resources
 * 
 * @param {HTMLVideoElement} videoElement
 * @returns {string | null} Valid direct twimg MP4 URL or null if fallback needed
 */
export function extractDirectDomUrl(videoElement) {
  if (!videoElement || typeof videoElement !== 'object') {
    return null;
  }

  // Helper to validate and return candidate if it is a genuine MP4 CDN URL
  function checkCandidate(candidate) {
    if (!candidate || typeof candidate !== 'string') {
      return null;
    }
    const trimmed = candidate.trim();
    if (!trimmed || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return null;
    }

    if (!isValidTwimgCdnUrl(trimmed)) {
      return null;
    }

    // Must be an MP4 resource or media video resource (exclude any image paths or non-mp4)
    try {
      const parsed = new URL(trimmed);
      const pathname = parsed.pathname.toLowerCase();
      // Ensure it's not a poster/thumbnail image
      if (pathname.includes('_thumb') || pathname.endsWith('.jpg') || pathname.endsWith('.png') || pathname.endsWith('.webp')) {
        return null;
      }
      // Must point to an mp4 video or have video media path
      if (pathname.endsWith('.mp4') || pathname.includes('.mp4') || pathname.includes('/vid/') || pathname.includes('/pu/vid/')) {
        // Return full raw URL verbatim, preserving query parameters
        return trimmed;
      }
      return null;
    } catch {
      return null;
    }
  }

  // 1. Check videoElement.currentSrc
  try {
    const currentSrc = videoElement.currentSrc;
    const validCurrent = checkCandidate(currentSrc);
    if (validCurrent) {
      return validCurrent;
    }
  } catch {
    // Ignore read errors
  }

  // 2. Check videoElement.src or getAttribute('src')
  try {
    const directSrc = videoElement.src || (typeof videoElement.getAttribute === 'function' ? videoElement.getAttribute('src') : null);
    const validSrc = checkCandidate(directSrc);
    if (validSrc) {
      return validSrc;
    }
  } catch {
    // Ignore read errors
  }

  // 3. Check child <source> elements
  try {
    if (typeof videoElement.querySelectorAll === 'function') {
      const sources = videoElement.querySelectorAll('source');
      for (const source of sources) {
        const sourceSrc = source.src || source.getAttribute('src');
        const validSource = checkCandidate(sourceSrc);
        if (validSource) {
          return validSource;
        }
      }
    }
  } catch {
    // Ignore query errors
  }

  // Under NO circumstances should video.poster be inspected or returned as video URL
  return null;
}

/**
 * Alias for extractDirectDomUrl.
 */
export const extractDirectCdnUrl = extractDirectDomUrl;
