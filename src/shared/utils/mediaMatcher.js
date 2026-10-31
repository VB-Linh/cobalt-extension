// src/shared/utils/mediaMatcher.js

/**
 * Matches a specific video element / tweet info against items in a Cobalt picker response.
 * Strictly avoids guessing by DOM order.
 * 
 * Hierarchy:
 * 1. Official 1-based mediaIndex: items[mediaIndex - 1]
 * 2. Stable mediaFingerprint: matches against item.thumb or item.url
 * 3. Single video item auto-resolution if only 1 video item exists in picker
 * 
 * @param {Array<{ index: number, type: string, url: string, thumb?: string }>} items
 * @param {object} [target={}]
 * @param {number | null} [target.mediaIndex]
 * @param {string | null} [target.mediaFingerprint]
 * @returns {object | null} Matched picker item or null if cannot be determined deterministically
 */
export function matchPickerItem(items, target = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const isVideoItem = (item) => Boolean(item && (item.type === 'video' || item.type === 'gif' || item.type === 'animated_gif' || !item.type));
  const videoItems = items.filter(isVideoItem);
  const pool = videoItems.length > 0 ? videoItems : items;

  // 1. Official 1-based mediaIndex
  const mediaIndex = target?.mediaIndex;
  if (typeof mediaIndex === 'number' && mediaIndex > 0) {
    const item = items[mediaIndex - 1];
    if (item && item.url && isVideoItem(item)) {
      return item;
    }
    // Also check if mediaIndex maps into videoItems directly
    const videoItem = videoItems[mediaIndex - 1];
    if (videoItem && videoItem.url) {
      return videoItem;
    }
  }

  // 2. Stable mediaFingerprint match
  const fingerprint = target?.mediaFingerprint;
  if (fingerprint && typeof fingerprint === 'string') {
    const cleanFp = fingerprint.trim();
    if (cleanFp.length > 0) {
      const matched = pool.filter((item) => {
        const thumb = item.thumb ? String(item.thumb) : '';
        const url = item.url ? String(item.url) : '';
        return thumb.includes(cleanFp) || url.includes(cleanFp);
      });

      if (matched.length === 1) {
        return matched[0];
      }
    }
  }

  // 3. Single video in tweet
  if (pool.length === 1 && pool[0].url) {
    return pool[0];
  }

  return null;
}
