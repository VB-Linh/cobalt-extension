// src/content/observers/videoObserver.js
import { videoStateStore, getVideoKey } from '../state/videoState.js';
import { detectVideos as defaultDetectVideos } from '../detection/videoDetector.js';
import { findTweetContainer as defaultFindTweetContainer } from '../detection/tweetFinder.js';
import { extractTweetInfo as defaultExtractTweetInfo } from '../extraction/permalinkExtractor.js';

/**
 * Traverses a newly added DOM node and collects all contained <video> elements.
 * 
 * @param {Node} node
 * @param {Set<HTMLVideoElement>} accumulator
 */
export function collectVideosFromNode(node, accumulator) {
  if (!node || node.nodeType !== 1 /* Node.ELEMENT_NODE */) {
    return;
  }

  // 1. Direct <video> element
  if (node.tagName === 'VIDEO') {
    accumulator.add(/** @type {HTMLVideoElement} */ (node));
    return;
  }

  // 2. Subtree search
  if (typeof node.querySelectorAll === 'function') {
    try {
      const videos = node.querySelectorAll('video');
      for (let i = 0; i < videos.length; i++) {
        accumulator.add(videos[i]);
      }
    } catch {
      // Ignore query errors on non-standard nodes
    }
  }
}

/**
 * Creates a dynamic DOM observer for detecting and managing videos on X (Twitter).
 * 
 * Features:
 * - Duplicate guard: multiple start() calls are safe no-ops.
 * - Subtree optimization: only processes childList mutations with added nodes.
 * - Batching via requestAnimationFrame (or custom scheduler).
 * - 3-tier state integration: ignores already mounted or dismissed videos.
 * - Clean disconnect and teardown.
 * 
 * @param {object} [options={}]
 * @param {(video: HTMLVideoElement, info: object) => void} [options.onVideoDetected]
 * @param {(video: HTMLVideoElement) => void} [options.onVideoRemoved]
 * @param {Element | Document} [options.root]
 * @param {import('../state/videoState.js').VideoStateStore} [options.stateStore]
 * @param {(root: Element | Document) => HTMLVideoElement[]} [options.detectVideos]
 * @param {(video: HTMLVideoElement) => Element | null} [options.findTweetContainer]
 * @param {(container: Element, video: HTMLVideoElement) => object} [options.extractTweetInfo]
 * @param {(cb: () => void) => number} [options.scheduler]
 * @param {(id: number) => void} [options.canceler]
 * @returns {object} Observer controller
 */
export function createVideoObserver(options = {}) {
  const {
    onVideoDetected,
    onVideoRemoved,
    root = (typeof document !== 'undefined' ? document.body : null),
    stateStore = videoStateStore,
    detectVideos = defaultDetectVideos,
    findTweetContainer = defaultFindTweetContainer,
    extractTweetInfo = defaultExtractTweetInfo,
    scheduler = (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(cb, 16)),
    canceler = (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : (id) => clearTimeout(id)),
  } = options;

  let observer = null;
  let running = false;
  let rafId = null;
  const pendingVideos = new Set();

  /**
   * Evaluates and processes an individual video element.
   * 
   * @param {HTMLVideoElement} video
   */
  function processVideo(video) {
    if (!video || video.isConnected === false) {
      return;
    }

    // 1. Fast checks (Tier 1 & Tier 2)
    if (stateStore.isMounted(video)) {
      return;
    }
    if (stateStore.isDismissed(undefined, video)) {
      return;
    }

    // 2. Identify tweet container
    const tweetContainer = findTweetContainer(video);
    if (!tweetContainer) {
      return;
    }

    // 3. Extract tweet metadata
    const info = extractTweetInfo(tweetContainer, video);
    if (!info || !info.tweetId) {
      // Incomplete DOM: postpone mounting until status/time anchor is rendered
      return;
    }

    // 4. Derive canonical video key
    const videoKey = getVideoKey(info.tweetId, info.mediaIndex, info.mediaFingerprint || video);

    // 5. Tier 3 Session check
    if (stateStore.isDismissed(videoKey, video)) {
      return;
    }

    // 6. Dynamic media event listener for delayed src/poster attachment
    if (!video.getAttribute('src') && !video.src && !video.querySelector?.('source') && !video.getAttribute('poster')) {
      const onMediaReady = () => {
        video.removeEventListener('loadedmetadata', onMediaReady);
        video.removeEventListener('loadstart', onMediaReady);
        if (!stateStore.isMounted(video) && !stateStore.isDismissed(undefined, video)) {
          pendingVideos.add(video);
          scheduleFlush();
        }
      };
      video.addEventListener('loadedmetadata', onMediaReady, { once: true });
      video.addEventListener('loadstart', onMediaReady, { once: true });
    }

    // 6. Mark mounted & record Tier 2 metadata
    stateStore.markMounted(video, videoKey);
    stateStore.setPerVideoData(video, {
      videoKey,
      ...info,
      detectedAt: Date.now(),
    });

    // 7. Fire notification callback
    if (typeof onVideoDetected === 'function') {
      try {
        onVideoDetected(video, { ...info, videoKey });
      } catch (err) {
        console.error('[X Video Tools] Error in onVideoDetected callback:', err);
      }
    }
  }

  /**
   * Flushes all accumulated pending videos.
   */
  function flushPendingVideos() {
    rafId = null;
    if (pendingVideos.size === 0) return;

    const list = Array.from(pendingVideos);
    pendingVideos.clear();

    for (let i = 0; i < list.length; i++) {
      processVideo(list[i]);
    }
  }

  /**
   * Schedules flush via rAF debounce.
   */
  function scheduleFlush() {
    if (rafId !== null) return;
    rafId = scheduler(() => {
      flushPendingVideos();
    });
  }

  /**
   * MutationObserver callback.
   * 
   * @param {MutationRecord[]} mutations
   */
  function handleMutations(mutations) {
    if (!running) return;

    let hasCandidates = false;

    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];

      // 1. Attribute change on <video> (e.g. src, poster, or data-media-id dynamically added)
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target && target.tagName === 'VIDEO') {
          if (!stateStore.isMounted(target) && !stateStore.isDismissed(undefined, target)) {
            pendingVideos.add(target);
            hasCandidates = true;
          }
        }
        continue;
      }

      // 2. DOM tree insertions (childList)
      if (mutation.type === 'childList') {
        // Direct child appended to <video> (e.g. <source> element)
        if (mutation.target && mutation.target.tagName === 'VIDEO') {
          if (!stateStore.isMounted(mutation.target) && !stateStore.isDismissed(undefined, mutation.target)) {
            pendingVideos.add(mutation.target);
            hasCandidates = true;
          }
        }

        // Handle removed nodes for DOM cleanup
        const removed = mutation.removedNodes;
        if (removed && removed.length > 0) {
          const removedVideos = new Set();
          for (let j = 0; j < removed.length; j++) {
            const node = removed[j];
            if (node.nodeType === 1 /* ELEMENT_NODE */) {
              collectVideosFromNode(node, removedVideos);
            }
          }
          for (const removedVideo of removedVideos) {
            stateStore.unmarkMounted(removedVideo);
            if (typeof onVideoRemoved === 'function') {
              try {
                onVideoRemoved(removedVideo);
              } catch (err) {
                console.error('[X Video Tools] Error in onVideoRemoved callback:', err);
              }
            }
          }
        }

        const added = mutation.addedNodes;
        if (!added || added.length === 0) continue;

        for (let j = 0; j < added.length; j++) {
          const node = added[j];
          if (node.nodeType === 1 /* ELEMENT_NODE */) {
            const prevSize = pendingVideos.size;
            collectVideosFromNode(node, pendingVideos);
            if (pendingVideos.size > prevSize) {
              hasCandidates = true;
            }

            // If time or status link was inserted dynamically into a tweet, re-queue any unmounted video in that tweet
            if (node.tagName === 'TIME' || (typeof node.querySelector === 'function' && node.querySelector('time, a[href*="/status/"], a[href*="/statuses/"]'))) {
              const enclosingTweet = node.closest?.('article[data-testid="tweet"]');
              if (enclosingTweet) {
                const unmountedVideos = enclosingTweet.querySelectorAll('video');
                for (let v = 0; v < unmountedVideos.length; v++) {
                  if (!stateStore.isMounted(unmountedVideos[v]) && !stateStore.isDismissed(undefined, unmountedVideos[v])) {
                    pendingVideos.add(unmountedVideos[v]);
                    hasCandidates = true;
                  }
                }
              }
            }
          }
        }
      }
    }

    if (hasCandidates) {
      scheduleFlush();
    }
  }

  /**
   * Scans existing DOM tree for eligible videos.
   * 
   * @param {Element | Document} [targetRoot]
   */
  function scan(targetRoot) {
    const target = targetRoot || root || (typeof document !== 'undefined' ? document.body : null);
    if (!target) return;

    const videos = detectVideos(target);
    for (let i = 0; i < videos.length; i++) {
      pendingVideos.add(videos[i]);
    }

    if (pendingVideos.size > 0) {
      flushPendingVideos();
    }
  }

  /**
   * Starts DOM observation. Safe no-op if already running.
   * 
   * @param {Element | Document} [targetRoot]
   */
  function start(targetRoot) {
    if (running) {
      return; // Safe no-op against duplicate start
    }

    const target = targetRoot || root || (typeof document !== 'undefined' ? document.body : null);
    if (!target) {
      console.warn('[X Video Tools] No valid root found to start VideoObserver.');
      return;
    }

    if (typeof MutationObserver === 'undefined') {
      console.warn('[X Video Tools] MutationObserver is not supported in this environment.');
      return;
    }

    observer = new MutationObserver(handleMutations);
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'poster', 'data-media-id'],
      characterData: false,
    });

    running = true;
    scan(target);
  }

  /**
   * Stops observation, disconnects observer, and cancels pending batch timers.
   */
  function stop() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (rafId !== null) {
      canceler(rafId);
      rafId = null;
    }

    pendingVideos.clear();
    running = false;
  }

  /**
   * Resets observer and optionally clears state store.
   * 
   * @param {boolean} [clearState=false]
   */
  function reset(clearState = false) {
    stop();
    if (clearState && stateStore) {
      stateStore.reset();
    }
  }

  /**
   * Checks whether observer is active.
   * @returns {boolean}
   */
  function isActive() {
    return running;
  }

  return {
    start,
    stop,
    scan,
    reset,
    isActive,
    isRunning: isActive,
    _getPendingSize: () => pendingVideos.size,
  };
}
