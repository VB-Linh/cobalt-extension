// src/content/state/videoState.js
import { getVideoKey, extractMediaFingerprint } from '../detection/videoDetector.js';

export { getVideoKey, extractMediaFingerprint };

/**
 * 3-Tier Per-Video State Manager:
 * - Tier 1: Live DOM element dataset (dataset.xvtDismissed, dataset.xvtMounted, dataset.xvtVideoKey)
 * - Tier 2: In-memory WeakSet / WeakMap for DOM element references (automatically garbage-collected)
 * - Tier 3: In-memory Set of canonical key strings for the current tab session (persists across virtual scroll recycling)
 * 
 * STRICT ARCHITECTURAL RULE: DOM node references are NEVER stored in chrome.storage.
 */
export class VideoStateStore {
  constructor() {
    // Tier 2: In-memory weak references bound to live DOM nodes
    this._mountedElements = new WeakSet();
    this._dismissedElements = new WeakSet();
    this._perVideoData = new WeakMap();

    // Tier 3: In-memory tab session string keys
    this._dismissedKeys = new Set();
  }

  /**
   * Checks whether a video element or its key is dismissed.
   * 
   * @param {string} [key] - Canonical video key
   * @param {Element} [element] - Live video element
   * @returns {boolean}
   */
  isDismissed(key, element) {
    // 1. Check Tier 1 (DOM dataset)
    if (element && element.dataset && element.dataset.xvtDismissed === 'true') {
      return true;
    }

    // 2. Check Tier 2 (WeakSet)
    if (element && this._dismissedElements.has(element)) {
      return true;
    }

    // 3. Resolve key from argument or dataset
    const resolvedKey = key || element?.dataset?.xvtVideoKey;

    // 4. Check Tier 3 (Tab session string key)
    if (resolvedKey && typeof resolvedKey === 'string' && this._dismissedKeys.has(resolvedKey)) {
      // Re-sync Tier 1 & Tier 2 if the element is currently attached
      if (element) {
        if (element.dataset) {
          element.dataset.xvtDismissed = 'true';
        }
        this._dismissedElements.add(element);
      }
      return true;
    }

    return false;
  }

  /**
   * Dismisses a video across all 3 tiers.
   * 
   * @param {string} [key] - Canonical video key
   * @param {Element} [element] - Live video element
   */
  dismiss(key, element) {
    const resolvedKey = key || element?.dataset?.xvtVideoKey;

    // Tier 1: Tag live DOM element
    if (element && element.dataset) {
      element.dataset.xvtDismissed = 'true';
      delete element.dataset.xvtMounted;
    }

    // Tier 2: Record in WeakSet, remove from mounted
    if (element) {
      this._dismissedElements.add(element);
      this._mountedElements.delete(element);
    }

    // Tier 3: Record canonical string key in tab session Set
    if (resolvedKey && typeof resolvedKey === 'string') {
      this._dismissedKeys.add(resolvedKey);
    }
  }

  /**
   * Undismisses a video (useful for testing and reset scenarios).
   * 
   * @param {string} [key]
   * @param {Element} [element]
   */
  undismiss(key, element) {
    const resolvedKey = key || element?.dataset?.xvtVideoKey;

    if (element && element.dataset) {
      delete element.dataset.xvtDismissed;
    }
    if (element) {
      this._dismissedElements.delete(element);
    }
    if (resolvedKey && typeof resolvedKey === 'string') {
      this._dismissedKeys.delete(resolvedKey);
    }
  }

  /**
   * Checks whether a video element is currently marked as mounted.
   * 
   * @param {Element} element
   * @returns {boolean}
   */
  isMounted(element) {
    if (!element) return false;
    if (element.dataset && element.dataset.xvtMounted === 'true') {
      return true;
    }
    return this._mountedElements.has(element);
  }

  /**
   * Marks a video element as mounted.
   * 
   * @param {Element} element
   * @param {string} [key]
   */
  markMounted(element, key) {
    if (!element) return;
    if (element.dataset) {
      element.dataset.xvtMounted = 'true';
      if (key) {
        element.dataset.xvtVideoKey = key;
      }
    }
    this._mountedElements.add(element);
  }

  /**
   * Removes mounted mark from a video element.
   * 
   * @param {Element} element
   */
  unmarkMounted(element) {
    if (!element) return;
    if (element.dataset) {
      delete element.dataset.xvtMounted;
      delete element.dataset.xvtVideoKey;
    }
    this._mountedElements.delete(element);
  }

  /**
   * Retrieves per-video metadata from Tier 2 WeakMap.
   * 
   * @param {Element} element
   * @returns {object | undefined}
   */
  getPerVideoData(element) {
    if (!element) return undefined;
    return this._perVideoData.get(element);
  }

  /**
   * Stores per-video metadata in Tier 2 WeakMap.
   * 
   * @param {Element} element
   * @param {object} data
   */
  setPerVideoData(element, data) {
    if (!element || !data) return;
    const existing = this._perVideoData.get(element) || {};
    this._perVideoData.set(element, { ...existing, ...data });
  }

  /**
   * Resets the store.
   * 
   * @param {boolean} [clearSession=true] - Whether to clear Tier 3 session keys
   */
  reset(clearSession = true) {
    this._mountedElements = new WeakSet();
    this._dismissedElements = new WeakSet();
    this._perVideoData = new WeakMap();
    if (clearSession) {
      this._dismissedKeys.clear();
    }
  }

  /**
   * Returns count of dismissed keys in current tab session.
   * @returns {number}
   */
  getDismissedCount() {
    return this._dismissedKeys.size;
  }
}

/**
 * Creates a new instance of VideoStateStore.
 * @returns {VideoStateStore}
 */
export function createVideoStateStore() {
  return new VideoStateStore();
}

// Default singleton instance for content script runtime
export const videoStateStore = createVideoStateStore();
