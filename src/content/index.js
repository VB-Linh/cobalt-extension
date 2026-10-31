import { STORAGE_KEYS } from '../shared/constants/index.js';
import { getSettings } from '../shared/utils/storage.js';
import { detectVideos, findTweetContainer } from './detection/index.js';
import { extractTweetInfo } from './extraction/index.js';
import { videoStateStore } from './state/index.js';
import { createVideoObserver } from './observers/index.js';
import { attachToolbar, detachToolbar } from './toolbar/index.js';

console.log('[X Video Tools] Content Script khởi tạo thành công trên', typeof window !== 'undefined' ? window.location.hostname : 'unknown');
console.log('[X Video Tools] Storage key tham chiếu:', STORAGE_KEYS.SETTINGS);

// Pre-load Cobalt instance configuration into cache
getSettings().catch(() => {});

/**
 * Handles detection of an eligible video element.
 * Attaches the Floating Toolbar UI.
 * 
 * @param {HTMLVideoElement} video
 * @param {import('./extraction/permalinkExtractor.js').TweetInfo} info
 */
function handleVideoDetected(video, info) {
  console.log('[X Video Tools] Đã nhận diện video hợp lệ:', {
    tweetId: info.tweetId,
    permalink: info.permalink,
    mediaIndex: info.mediaIndex,
    isQuoted: info.isQuoted,
  });

  attachToolbar(video, info, { stateStore: videoStateStore });
}

/**
 * Handles removal of a video element from DOM.
 * Cleans up and detaches the Floating Toolbar.
 * 
 * @param {HTMLVideoElement} video
 */
function handleVideoRemoved(video) {
  detachToolbar(video);
}

// Initialize singleton observer
export const observer = createVideoObserver({
  root: typeof document !== 'undefined' ? document.body : null,
  stateStore: videoStateStore,
  detectVideos,
  findTweetContainer,
  extractTweetInfo,
  onVideoDetected: handleVideoDetected,
  onVideoRemoved: handleVideoRemoved,
});

// Autostart observer on DOMContentLoaded or immediately
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observer.start();
    });
  } else {
    observer.start();
  }
}

// Clean up on page unmount / pagehide, and respond to SPA navigations
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    observer.stop();
  });

  // Handle SPA back/forward history navigation
  window.addEventListener('popstate', () => {
    observer.scan();
  });

  // Rescan on timeline scroll (throttled) for virtualized tweets
  let scrollThrottleTimer = null;
  window.addEventListener('scroll', () => {
    if (scrollThrottleTimer !== null) return;
    scrollThrottleTimer = setTimeout(() => {
      scrollThrottleTimer = null;
      observer.scan();
    }, 250);
  }, { passive: true });

  // Hook pushState and replaceState for SPA route transitions
  if (typeof history !== 'undefined') {
    const originalPushState = history.pushState;
    if (typeof originalPushState === 'function') {
      history.pushState = function (...args) {
        const result = originalPushState.apply(this, args);
        setTimeout(() => observer.scan(), 0);
        return result;
      };
    }

    const originalReplaceState = history.replaceState;
    if (typeof originalReplaceState === 'function') {
      history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        setTimeout(() => observer.scan(), 0);
        return result;
      };
    }
  }
}
