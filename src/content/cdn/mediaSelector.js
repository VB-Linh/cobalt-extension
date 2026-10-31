// src/content/cdn/mediaSelector.js
import { extractMediaFingerprint } from '../detection/videoDetector.js';

/**
 * Checks if a media item from Twitter Syndication API is a playable video or animated GIF.
 * 
 * @param {object} item
 * @returns {boolean}
 */
export function isVideoMedia(item) {
  if (!item || typeof item !== 'object') return false;
  return item.type === 'video' || item.type === 'animated_gif' || Boolean(item.video_info?.variants);
}

/**
 * Extracts a numeric or string media identifier from a media item.
 * 
 * @param {object} item
 * @returns {string[]} Array of potential identifier tokens (id_str, filename tokens)
 */
function getMediaIdentifiers(item) {
  const ids = [];
  if (!item) return ids;

  if (item.id_str) {
    ids.push(String(item.id_str));
  }

  if (item.media_url_https) {
    // Extract ID from media_url_https, e.g. pbs.twimg.com/media/XYZ.jpg or amplify_video_thumb/123/img/xyz.jpg
    const match = item.media_url_https.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);
    if (match) {
      ids.push(match[1]);
    }
  }

  // Also check video variant URLs for ID tokens
  if (Array.isArray(item.video_info?.variants)) {
    for (const v of item.video_info.variants) {
      if (v.url) {
        const vMatch = v.url.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);
        if (vMatch) {
          ids.push(vMatch[1]);
        }
      }
    }
  }

  return ids;
}

/**
 * Matches a target video element against Twitter Syndication media items.
 * 
 * Deterministic Hierarchy:
 * 1. Official Anchor Index (/video/:index) — 1-based index from tweet URL.
 * 2. Media Fingerprint Match — matching poster/DOM fingerprint against API media entities.
 * 3. Single Video Fallback — if tweet contains only 1 video entity, automatically select it.
 * 4. Ambiguity Detection — if multiple videos exist and cannot be matched unambiguously:
 *    STRICT RULE: Never default to mediaDetails[0], never guess DOM order.
 *    Returns { media: null, ambiguous: true, candidates }.
 * 
 * @param {Array<object>} mediaDetails - Raw mediaDetails from Syndication API
 * @param {object} [tweetInfo={}] - Metadata from Phase 1 ({ mediaIndex, mediaFingerprint, tweetId })
 * @param {HTMLVideoElement} [videoElement] - Optional DOM video element for auxiliary fingerprinting
 * @returns {{ media: object | null, ambiguous: boolean, candidates: Array<object> }}
 */
export function selectTargetMedia(mediaDetails, tweetInfo = {}, videoElement = null) {
  if (!Array.isArray(mediaDetails) || mediaDetails.length === 0) {
    return { media: null, ambiguous: false, candidates: [] };
  }

  // Filter video entities (ignoring pure photos)
  const videoCandidates = mediaDetails.filter(isVideoMedia);

  if (videoCandidates.length === 0) {
    return { media: null, ambiguous: false, candidates: [] };
  }

  // --- Level 1: Official Anchor (/video/:index) ---
  const mediaIndex = tweetInfo.mediaIndex;
  const numIndex = Number(mediaIndex);
  if (!isNaN(numIndex) && numIndex > 0) {
    const targetItem = mediaDetails[numIndex - 1];
    if (targetItem && isVideoMedia(targetItem)) {
      return { media: targetItem, ambiguous: false, candidates: videoCandidates };
    }
  }

  // --- Level 2: Media Fingerprint Match ---
  let fingerprint = tweetInfo.mediaFingerprint;
  if (!fingerprint && videoElement) {
    fingerprint = extractMediaFingerprint(videoElement);
    if (!fingerprint) {
      const poster = videoElement.getAttribute?.('poster') || videoElement.poster;
      if (poster) {
        const match = poster.match(/(?:thumb|media)\/([A-Za-z0-9_-]+)/);
        if (match) fingerprint = match[1];
      }
    }
  }

  if (fingerprint && typeof fingerprint === 'string') {
    const cleanFp = fingerprint.trim();

    // 1. Exact match first
    const exactMatches = videoCandidates.filter((item) => {
      const identifiers = getMediaIdentifiers(item);
      return identifiers.some((id) => id === cleanFp);
    });

    if (exactMatches.length === 1) {
      return { media: exactMatches[0], ambiguous: false, candidates: videoCandidates };
    }

    // 2. Fall back to substring match only if no exact matches found
    if (exactMatches.length === 0) {
      const partialMatches = videoCandidates.filter((item) => {
        const identifiers = getMediaIdentifiers(item);
        return identifiers.some((id) => cleanFp.includes(id) || id.includes(cleanFp));
      });

      if (partialMatches.length === 1) {
        return { media: partialMatches[0], ambiguous: false, candidates: videoCandidates };
      }
    }
  }

  // --- Level 3: Single Video Auto-Resolution ---
  if (videoCandidates.length === 1) {
    return { media: videoCandidates[0], ambiguous: false, candidates: videoCandidates };
  }

  // --- Level 4: Ambiguous State ---
  // Multiple videos in tweet, but no official anchor index and no unique fingerprint match.
  // STRICT RULE: DO NOT DEFAULT TO mediaDetails[0]!
  return {
    media: null,
    ambiguous: true,
    candidates: videoCandidates,
  };
}

/**
 * Top-level matcher compatible with both direct mediaDetails and syndication data object.
 * 
 * @param {HTMLVideoElement} videoElement
 * @param {object} tweetInfo
 * @param {object} syndicationData
 * @returns {object} { status: 'resolved' | 'ambiguous' | 'no_media', media?: object, candidates?: Array }
 */
export function matchVideoToMedia(videoElement, tweetInfo = {}, syndicationData = {}) {
  const mediaDetails = syndicationData?.mediaDetails || [];
  const result = selectTargetMedia(mediaDetails, tweetInfo, videoElement);

  if (result.media) {
    return {
      status: 'resolved',
      media: result.media,
      candidates: result.candidates,
    };
  }

  if (result.ambiguous) {
    return {
      status: 'ambiguous',
      media: null,
      candidates: result.candidates,
    };
  }

  return {
    status: 'no_media',
    media: null,
    candidates: [],
  };
}
