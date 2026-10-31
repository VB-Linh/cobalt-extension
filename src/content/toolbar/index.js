// src/content/toolbar/index.js
import { createToolbar, shouldFallbackInside, resolveVideoWrapper } from './toolbar.js';
import { TOOLBAR_STATES } from './toolbarState.js';
import { videoStateStore as defaultStateStore, getVideoKey } from '../state/videoState.js';
import { extractMediaFingerprint } from '../detection/videoDetector.js';

export { createToolbar, shouldFallbackInside, resolveVideoWrapper, TOOLBAR_STATES };

/**
 * WeakMap registry tracking live toolbar controllers per video element.
 * Bound to the DOM element's lifecycle, automatically garbage-collected.
 * @type {WeakMap<HTMLVideoElement, object>}
 */
const toolbarRegistry = new WeakMap();

/**
 * Attaches a Floating Toolbar to a video element if not already present or dismissed.
 * 
 * @param {HTMLVideoElement} videoElement
 * @param {object} [tweetInfo={}]
 * @param {object} [options={}]
 * @param {import('../state/videoState.js').VideoStateStore} [options.stateStore]
 * @returns {object | null} Toolbar controller or null if dismissed/already attached
 */
export function attachToolbar(videoElement, tweetInfo = {}, options = {}) {
  if (!videoElement || videoElement.nodeType !== 1 || videoElement.tagName !== 'VIDEO') {
    return null;
  }

  const stateStore = options.stateStore || defaultStateStore;

  // 1. Resolve canonical video key (guaranteeing non-null key for element tracking)
  const videoKey =
    tweetInfo.videoKey ||
    videoElement.dataset?.xvtVideoKey ||
    (tweetInfo.tweetId
      ? getVideoKey(tweetInfo.tweetId, tweetInfo.mediaIndex, tweetInfo.mediaFingerprint || videoElement)
      : getVideoKey('tweet', tweetInfo.mediaIndex, tweetInfo.mediaFingerprint || videoElement));

  // 2. Guard against mounting on dismissed videos
  if (stateStore.isDismissed(videoKey, videoElement)) {
    return null;
  }

  // 3. Idempotency guard: Return existing instance if already attached
  if (toolbarRegistry.has(videoElement)) {
    return toolbarRegistry.get(videoElement);
  }

  // 4. DOM guard: Check if wrapper already contains an active toolbar host for this video
  const wrapper = resolveVideoWrapper(videoElement);
  if (wrapper) {
    const existingHosts = wrapper.querySelectorAll('.xvt-toolbar-host');
    for (let i = 0; i < existingHosts.length; i++) {
      const hostEl = existingHosts[i];
      const existingKey = hostEl.getAttribute('data-xvt-video-key');

      // If existing host belongs to a different tweet
      if (tweetInfo.tweetId && existingKey && !existingKey.startsWith(tweetInfo.tweetId)) {
        // If there is another video in the wrapper that owns this host, reject mounting cross-tweet video in same wrapper
        const ownerVideo = Array.from(wrapper.querySelectorAll('video')).find(
          (v) => v !== videoElement && (v.dataset?.xvtVideoKey === existingKey || !v.dataset?.xvtVideoKey)
        );
        if (ownerVideo) {
          return null;
        }
        // Otherwise, it is a dead orphan host left from a recycled wrapper with no owning video -> clean it up!
        hostEl.remove();
        continue;
      }

      // If wrapper has only 1 video
      if (wrapper.querySelectorAll('video').length === 1) {
        // If this host belongs to THIS specific videoKey, return existing or avoid duplicate
        if (existingKey === videoKey) {
          return toolbarRegistry.get(videoElement) || null;
        }
        // Stale host with a different key inside single-video wrapper -> clean it up
        hostEl.remove();
        continue;
      }

      // If wrapper has multiple videos, reject if host for THIS specific videoKey already exists
      if (videoKey && existingKey === videoKey) {
        return toolbarRegistry.get(videoElement) || null;
      }
    }
  }

  // 5. Create toolbar controller
  const controller = createToolbar(
    videoElement,
    { ...tweetInfo, videoKey },
    {
      ...options,
      stateStore,
      onDestroy: () => {
        toolbarRegistry.delete(videoElement);
      },
    }
  );
  if (!controller) {
    return null;
  }

  // Register in WeakMap
  toolbarRegistry.set(videoElement, controller);

  return controller;
}

/**
 * Retrieves the toolbar controller for a video element.
 * 
 * @param {HTMLVideoElement} videoElement
 * @returns {object | null}
 */
export function getToolbar(videoElement) {
  if (!videoElement) return null;
  return toolbarRegistry.get(videoElement) || null;
}

/**
 * Detaches and destroys the toolbar controller associated with a video element.
 * 
 * @param {HTMLVideoElement} videoElement
 * @returns {boolean} True if detached, false if not found
 */
export function detachToolbar(videoElement) {
  if (!videoElement) return false;
  const controller = toolbarRegistry.get(videoElement);
  if (!controller) {
    // If not in registry, still check if there is an orphan host attached to wrapper for this video
    const wrapper = resolveVideoWrapper(videoElement);
    const videoKey = videoElement.dataset?.xvtVideoKey;
    let orphanHost = null;
    if (videoKey && wrapper) {
      orphanHost = wrapper.querySelector(`.xvt-toolbar-host[data-xvt-video-key="${videoKey}"]`);
    }
    if (!orphanHost && wrapper?.querySelectorAll('video').length === 1) {
      orphanHost = wrapper.querySelector('.xvt-toolbar-host');
    }
    if (orphanHost && orphanHost.parentNode) {
      orphanHost.parentNode.removeChild(orphanHost);
      return true;
    }
    return false;
  }

  toolbarRegistry.delete(videoElement);
  controller.destroy();
  return true;
}

/**
 * Clears registry (primarily for test resets).
 */
export function clearToolbarRegistry() {
  // WeakMap does not have clear(), but replacing is not necessary since keys are weak.
  // Any controllers currently mounted should be destroyed manually if needed.
}
