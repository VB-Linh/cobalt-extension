// src/content/toolbar/index.js
import { createToolbar, shouldFallbackInside } from './toolbar.js';
import { TOOLBAR_STATES } from './toolbarState.js';
import { videoStateStore as defaultStateStore, getVideoKey } from '../state/videoState.js';

export { createToolbar, shouldFallbackInside, TOOLBAR_STATES };

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
  if (!videoElement || videoElement.nodeType !== 1) {
    return null;
  }

  const stateStore = options.stateStore || defaultStateStore;

  // 1. Resolve canonical video key
  const videoKey =
    tweetInfo.videoKey ||
    videoElement.dataset.xvtVideoKey ||
    (tweetInfo.tweetId ? getVideoKey(tweetInfo.tweetId, tweetInfo.mediaIndex, tweetInfo.mediaFingerprint || videoElement) : null);

  // 2. Guard against mounting on dismissed videos
  if (stateStore.isDismissed(videoKey, videoElement)) {
    return null;
  }

  // 3. Idempotency guard: Return existing instance if already attached
  if (toolbarRegistry.has(videoElement)) {
    return toolbarRegistry.get(videoElement);
  }

  // 4. DOM guard: Check if wrapper already contains an active toolbar host
  const videoComponent = videoElement.closest('[data-testid="videoComponent"]');
  const videoPlayer = videoElement.closest('[data-testid="videoPlayer"]');
  const wrapper = videoComponent || videoPlayer || videoElement.parentElement;

  if (wrapper) {
    const existingHost = wrapper.querySelector('.xvt-toolbar-host');
    if (existingHost) {
      return null;
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
    // If not in registry, still check if there is an orphan host attached to wrapper
    const videoComponent = videoElement.closest('[data-testid="videoComponent"]');
    const videoPlayer = videoElement.closest('[data-testid="videoPlayer"]');
    const wrapper = videoComponent || videoPlayer || videoElement.parentElement;
    const orphanHost = wrapper?.querySelector('.xvt-toolbar-host');
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
