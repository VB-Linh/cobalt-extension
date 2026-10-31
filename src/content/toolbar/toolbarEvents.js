// src/content/toolbar/toolbarEvents.js
import { TOOLBAR_STATES } from './toolbarState.js';
import { resolveCdnForVideo, CDN_ERROR_CODES } from '../cdn/cdnResolver.js';
import { renderMediaPicker } from '../cdn/mediaPicker.js';
import { isCobaltConfigured, getSettings } from '../../shared/utils/storage.js';
import { getVideoKey } from '../state/videoState.js';
import { extractMediaFingerprint } from '../detection/videoDetector.js';
import { matchPickerItem } from '../../shared/utils/mediaMatcher.js';
import { selectTargetMedia } from '../cdn/mediaSelector.js';

import { extractMediaIndex } from '../extraction/urlNormalizer.js';
import { resolveVideoWrapper } from './toolbar.js';

export const GRACE_PERIOD_MS = 300;
export const NOTICE_DURATION_MS = 2500;
export const CLICK_DEBOUNCE_MS = 250;

/**
 * Binds mouse events, anti-flicker grace period timers, and button interactions.
 * 
 * @param {object} params
 * @param {HTMLElement} params.host - The toolbar host container element
 * @param {HTMLElement} params.wrapper - The video wrapper element
 * @param {HTMLVideoElement} params.video - The underlying video element
 * @param {import('./toolbarState.js').ToolbarStateManager} params.stateManager
 * @param {object} params.toolbarController - Reference to toolbar controller (show, hide, dismiss, showNotice)
 * @param {import('../state/videoState.js').VideoStateStore} params.stateStore
 * @param {object} [params.tweetInfo]
 * @param {object} [params.options]
 * @returns {object} Event controller with cleanup() method
 */
export function setupToolbarEvents({
  host,
  wrapper,
  video,
  stateManager,
  toolbarController,
  stateStore,
  tweetInfo = {},
  options = {},
}) {
  let isHoveringVideo = false;
  let isHoveringToolbar = false;
  let isFocused = false;
  let hideTimer = null;
  let lastActionClickTime = 0;
  let trackedDownloadId = null;

  // Robust tweetId and permalink resolution with fallback to DOM attributes and URL
  const effectiveTweetId =
    tweetInfo.tweetId ||
    video?.dataset?.xvtTweetId ||
    video?.closest?.('article')?.id?.replace('tweet-', '') ||
    (typeof window !== 'undefined' && window.location?.href?.match(/\/status\/(\d+)/)?.[1]) ||
    null;

  const effectivePermalink =
    tweetInfo.permalink ||
    (effectiveTweetId ? `https://x.com/i/status/${effectiveTweetId}` : null) ||
    (typeof window !== 'undefined' && window.location?.href?.includes('/status/') ? window.location.href : null);

  const videoKey =
    tweetInfo.videoKey ||
    video?.dataset?.xvtVideoKey ||
    (effectiveTweetId ? getVideoKey(effectiveTweetId, tweetInfo.mediaIndex, tweetInfo.mediaFingerprint || video) : null);

  // Dynamically resolves mediaIndex at action time if initially absent
  function getEffectiveMediaIndex() {
    if (tweetInfo.mediaIndex !== undefined && tweetInfo.mediaIndex !== null) {
      return tweetInfo.mediaIndex;
    }
    if (video && typeof video.closest === 'function') {
      const surroundingAnchor = video.closest('a[href*="/status/"], a[href*="/statuses/"]');
      if (surroundingAnchor) {
        const href = surroundingAnchor.getAttribute('href') || surroundingAnchor.href;
        const idx = extractMediaIndex(href);
        if (idx) return idx;
      }
      const dedicatedCell = resolveVideoWrapper(video);
      if (dedicatedCell) {
        const anchor = dedicatedCell.querySelector?.('a[href*="/video/"]');
        if (anchor) {
          const href = anchor.getAttribute('href') || anchor.href;
          const idx = extractMediaIndex(href);
          if (idx) return idx;
        }
      }
    }
    return tweetInfo.mediaIndex;
  }

  // Runtime message listener for background download lifecycle updates
  function handleDownloadStatusChanged(msg) {
    if (!msg || msg.type !== 'DOWNLOAD_STATUS_CHANGED') return;

    // Check if the message targets this video
    const matchesVideoKey = videoKey && msg.videoKey && msg.videoKey === videoKey;
    const matchesDownloadId = trackedDownloadId && msg.downloadId && msg.downloadId === trackedDownloadId;

    if (!matchesVideoKey && !matchesDownloadId) {
      return;
    }

    if (msg.state === 'complete') {
      stateManager.setState(TOOLBAR_STATES.COMPLETED, { action: 'download', downloadId: msg.downloadId });
      toolbarController.showNotice('Đã tải xong video', NOTICE_DURATION_MS);
      setTimeout(() => {
        const cur = stateManager.getState();
        if (cur === TOOLBAR_STATES.COMPLETED || cur === TOOLBAR_STATES.SUCCESS) {
          stateManager.setState(
            isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
          );
        }
      }, NOTICE_DURATION_MS);
    } else if (msg.state === 'cancelled') {
      stateManager.setState(TOOLBAR_STATES.CANCELLED, { action: 'download' });
      toolbarController.showNotice('Đã hủy tải xuống', NOTICE_DURATION_MS);
      setTimeout(() => {
        if (stateManager.getState() === TOOLBAR_STATES.CANCELLED) {
          stateManager.setState(
            isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
          );
        }
      }, NOTICE_DURATION_MS);
    } else if (msg.state === 'interrupted') {
      stateManager.setState(TOOLBAR_STATES.INTERRUPTED, { action: 'download', error: msg.error });
      toolbarController.showNotice(msg.message || 'Tải xuống bị gián đoạn', NOTICE_DURATION_MS);
      setTimeout(() => {
        const cur = stateManager.getState();
        if (cur === TOOLBAR_STATES.INTERRUPTED || cur === TOOLBAR_STATES.ERROR) {
          stateManager.setState(
            isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
          );
        }
      }, NOTICE_DURATION_MS);
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.addListener) {
    chrome.runtime.onMessage.addListener(handleDownloadStatusChanged);
  }

  // Clear hide timer helper
  function cancelHideTimer() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  // Schedule hide after grace period
  function scheduleGracefulHide() {
    cancelHideTimer();
    hideTimer = setTimeout(() => {
      const currentState = stateManager.getState();
      if (
        !isHoveringVideo &&
        !isHoveringToolbar &&
        !isFocused &&
        !stateManager.isDismissed() &&
        currentState !== TOOLBAR_STATES.AMBIGUOUS &&
        currentState !== TOOLBAR_STATES.PICKER &&
        currentState !== TOOLBAR_STATES.DOWNLOADING
      ) {
        toolbarController.hide();
      }
      hideTimer = null;
    }, GRACE_PERIOD_MS);
  }

  // Helper to verify event relates specifically to this video
  function isEventForThisVideo(event) {
    if (!event || !event.target) return true;
    const target = event.target;

    if (target === video || (typeof video.contains === 'function' && video.contains(target))) {
      return true;
    }
    if (
      target === host ||
      (typeof host.contains === 'function' && host.contains(target)) ||
      (host.shadowRoot && typeof host.shadowRoot.contains === 'function' && host.shadowRoot.contains(target))
    ) {
      return true;
    }

    // If wrapper contains only this video
    if (wrapper && wrapper.querySelectorAll('video').length === 1) {
      if (target === wrapper || (typeof wrapper.contains === 'function' && wrapper.contains(target))) {
        return true;
      }
      return false;
    }

    // If wrapper contains multiple videos
    if (wrapper && wrapper.querySelectorAll('video').length > 1) {
      const otherVideos = wrapper.querySelectorAll('video');

      for (let i = 0; i < otherVideos.length; i++) {
        const otherV = otherVideos[i];
        if (otherV === video) continue;

        if (target === otherV || (typeof otherV.contains === 'function' && otherV.contains(target))) {
          return false;
        }

        let cur = target;
        while (cur && cur !== wrapper && cur !== document.body) {
          if (cur.contains(otherV) && !cur.contains(video)) {
            return false;
          }
          cur = cur.parentElement;
        }
      }

      let cur = target;
      while (cur && cur !== wrapper && cur !== document.body) {
        if (cur.contains(video)) {
          return true;
        }
        cur = cur.parentElement;
      }

      // Check if target is a sibling overlay or element associated with this video
      if (target !== wrapper) {
        // A. Class/id correlation check (e.g. overlay-1, cell-1)
        const targetId = `${target.id || ''} ${target.className || ''}`;
        const match = targetId.match(/[_-](\d+)\b/);
        const effectiveIdx = getEffectiveMediaIndex();
        if (match) {
          const targetIndex = Number(match[1]);
          if (effectiveIdx && targetIndex === Number(effectiveIdx)) {
            return true;
          }
          if (effectiveIdx && targetIndex !== Number(effectiveIdx)) {
            return false;
          }
        }

        // B. Visual geometry / bounding box overlap
        if (typeof target.getBoundingClientRect === 'function' && typeof video.getBoundingClientRect === 'function') {
          try {
            const tRect = target.getBoundingClientRect();
            const vRect = video.getBoundingClientRect();
            if (tRect.width > 0 && tRect.height > 0 && vRect.width > 0 && vRect.height > 0) {
              const cx = tRect.left + tRect.width / 2;
              const cy = tRect.top + tRect.height / 2;
              if (cx >= vRect.left && cx <= vRect.right && cy >= vRect.top && cy <= vRect.bottom) {
                return true;
              }
            }
          } catch {
            // ignore
          }
        }

        // C. Direct following sibling (overlay placed immediately after video in DOM)
        if (target.previousElementSibling === video) {
          return true;
        }
      }

      return false;
    }

    return false;
  }

  // --- Wrapper Mouse Listeners ---
  function onWrapperMouseEnter(event) {
    if (stateManager.isDismissed()) return;
    if (!isEventForThisVideo(event)) return;
    isHoveringVideo = true;
    cancelHideTimer();
    toolbarController.updatePosition?.();
    toolbarController.show();
  }

  function onWrapperMouseMove(event) {
    if (stateManager.isDismissed()) return;
    const forThis = isEventForThisVideo(event);
    if (!forThis) {
      if (isHoveringVideo) {
        isHoveringVideo = false;
        scheduleGracefulHide();
      }
      return;
    }
    if (!isHoveringVideo) {
      isHoveringVideo = true;
      cancelHideTimer();
      toolbarController.updatePosition?.();
      toolbarController.show();
    }
  }

  function onWrapperMouseLeave(event) {
    if (stateManager.isDismissed()) return;

    // Check if moving directly into host or into this video (including Shadow DOM boundary)
    const relatedTarget = event?.relatedTarget;
    if (
      relatedTarget &&
      (relatedTarget === host ||
        (typeof host.contains === 'function' && host.contains(relatedTarget)) ||
        (host.shadowRoot && typeof host.shadowRoot.contains === 'function' && host.shadowRoot.contains(relatedTarget)))
    ) {
      return;
    }
    if (relatedTarget && (relatedTarget === video || (typeof video.contains === 'function' && video.contains(relatedTarget)))) {
      return;
    }

    // If wrapper contains multiple videos, check if relatedTarget belongs to this video
    if (wrapper && wrapper.querySelectorAll('video').length > 1 && relatedTarget) {
      if (isEventForThisVideo({ target: relatedTarget })) {
        return;
      }
    }

    isHoveringVideo = false;
    scheduleGracefulHide();
  }

  // --- Host Mouse & Focus Listeners ---
  function onHostMouseEnter() {
    if (stateManager.isDismissed()) return;
    isHoveringToolbar = true;
    cancelHideTimer();
    toolbarController.show();
  }

  function onHostMouseMove() {
    if (stateManager.isDismissed()) return;
    if (!isHoveringToolbar) {
      isHoveringToolbar = true;
      cancelHideTimer();
      toolbarController.show();
    }
  }

  function onHostMouseLeave(event) {
    if (stateManager.isDismissed()) return;

    // Check if moving directly back into wrapper or video (or within host shadowRoot)
    const relatedTarget = event?.relatedTarget;
    if (relatedTarget) {
      if (
        relatedTarget === host ||
        (typeof host.contains === 'function' && host.contains(relatedTarget)) ||
        (host.shadowRoot && typeof host.shadowRoot.contains === 'function' && host.shadowRoot.contains(relatedTarget))
      ) {
        return;
      }
      if (relatedTarget === video || (typeof video.contains === 'function' && video.contains(relatedTarget))) {
        return;
      }
      if (relatedTarget === wrapper || (typeof wrapper.contains === 'function' && wrapper.contains(relatedTarget))) {
        if (isEventForThisVideo({ target: relatedTarget })) {
          return;
        }
      }
    }

    isHoveringToolbar = false;
    scheduleGracefulHide();
  }

  function onHostFocusIn() {
    if (stateManager.isDismissed()) return;
    isFocused = true;
    cancelHideTimer();
    toolbarController.show();
  }

  function onHostFocusOut(event) {
    if (stateManager.isDismissed()) return;
    const relatedTarget = event?.relatedTarget;
    if (
      relatedTarget &&
      (relatedTarget === host ||
        (typeof host.contains === 'function' && host.contains(relatedTarget)) ||
        (host.shadowRoot && typeof host.shadowRoot.contains === 'function' && host.shadowRoot.contains(relatedTarget)))
    ) {
      return;
    }
    isFocused = false;
    scheduleGracefulHide();
  }

  // Shield clicks on host to avoid triggering X's video play/pause or navigation
  function onHostClick(event) {
    event.stopPropagation();
  }

  // --- Button Listeners ---
  function handleDownloadClick(event) {
    event.stopPropagation();
    event.preventDefault();

    if (stateManager.isDismissed()) return;

    // Concurrency guard: Ignore clicks if download, processing, or success is already in flight
    const currentState = stateManager.getState();
    if (
      currentState === TOOLBAR_STATES.PROCESSING ||
      currentState === TOOLBAR_STATES.DOWNLOADING ||
      currentState === TOOLBAR_STATES.SUCCESS ||
      currentState === TOOLBAR_STATES.COMPLETED
    ) {
      return;
    }

    // Debounce rapid spam clicks
    const now = Date.now();
    if (now - lastActionClickTime < CLICK_DEBOUNCE_MS) {
      return;
    }
    lastActionClickTime = now;

    // Check configuration synchronously
    const isConfigured = Boolean(
      options.enableDownload === true ||
      options.cobaltUrl ||
      isCobaltConfigured()
    );

    if (!isConfigured) {
      const message = 'Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.';
      toolbarController.showNotice(message, NOTICE_DURATION_MS);
      stateManager.setState(TOOLBAR_STATES.UNCONFIGURED, { message });
      setTimeout(() => {
        if (stateManager.getState() === TOOLBAR_STATES.UNCONFIGURED) {
          stateManager.setState(
            isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
          );
        }
      }, NOTICE_DURATION_MS);
      return;
    }

    // When configured, transition to PROCESSING and send COBALT_DOWNLOAD
    stateManager.setState(TOOLBAR_STATES.PROCESSING, { action: 'download' });

    const effectiveIdx = getEffectiveMediaIndex();
    const correlationId = `${videoKey || effectiveTweetId || 'vid'}_${Date.now()}`;
    const basePayload = {
      tweetId: effectiveTweetId,
      permalink: effectivePermalink,
      username: tweetInfo.username,
      mediaIndex: effectiveIdx,
      mediaFingerprint: tweetInfo.mediaFingerprint || extractMediaFingerprint(video),
      videoKey,
      correlationId,
    };

    function sendDownloadRequest(extraPayload = {}) {
      try {
        chrome.runtime.sendMessage({
          action: 'COBALT_DOWNLOAD',
          payload: { ...basePayload, ...extraPayload },
        }, (res) => {
          if (chrome.runtime?.lastError || !res) {
            stateManager.setState(TOOLBAR_STATES.ERROR, { action: 'download' });
            toolbarController.showNotice(chrome.runtime?.lastError?.message || 'Không nhận được phản hồi từ tiện ích.', NOTICE_DURATION_MS);
            setTimeout(() => {
              if (stateManager.getState() === TOOLBAR_STATES.ERROR) {
                stateManager.setState(
                  isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
                );
              }
            }, NOTICE_DURATION_MS);
            return;
          }

          // Handle Picker response
          if (res.status === 'picker' || res.type === 'PICKER') {
            const items = res.items || res.picker || [];
            const curIdx = getEffectiveMediaIndex();
            const matchedItem = matchPickerItem(items, {
              mediaIndex: curIdx,
              mediaFingerprint: tweetInfo.mediaFingerprint || extractMediaFingerprint(video),
            });

            if (matchedItem && matchedItem.url) {
              stateManager.setState(TOOLBAR_STATES.PROCESSING, { action: 'download' });
              sendDownloadRequest({ selectedUrl: matchedItem.url });
              return;
            }

            // Fallback for unmatched ambiguous items
            stateManager.setState(TOOLBAR_STATES.PICKER, { items });
            renderMediaPicker(toolbarController.shadowRoot, items, {
              onSelect: (selectedMedia) => {
                stateManager.setState(TOOLBAR_STATES.PROCESSING, { action: 'download' });
                sendDownloadRequest({ selectedUrl: selectedMedia.url });
              },
              onCancel: () => {
                stateManager.setState(
                  isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
                );
              },
            });
            return;
          }

          // Handle success download initiation: transition to DOWNLOADING and await lifecycle sync
          if (res.success) {
            trackedDownloadId = res.downloadId;
            stateManager.setState(TOOLBAR_STATES.DOWNLOADING, { action: 'download', downloadId: res.downloadId });
            toolbarController.showNotice('Đang tải video...', NOTICE_DURATION_MS);
          } else {
            // Error handling
            if (res.error === 'UNCONFIGURED') {
              const msg = res.message || 'Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.';
              toolbarController.showNotice(msg, NOTICE_DURATION_MS);
              stateManager.setState(TOOLBAR_STATES.UNCONFIGURED, { message: msg });
              setTimeout(() => {
                if (stateManager.getState() === TOOLBAR_STATES.UNCONFIGURED) {
                  stateManager.setState(
                    isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
                  );
                }
              }, NOTICE_DURATION_MS);
            } else {
              stateManager.setState(TOOLBAR_STATES.ERROR, { action: 'download', error: res.error });
              toolbarController.showNotice(res.message || 'Lỗi khi tải video', NOTICE_DURATION_MS);

              setTimeout(() => {
                if (stateManager.getState() === TOOLBAR_STATES.ERROR) {
                  stateManager.setState(
                    isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
                  );
                }
              }, NOTICE_DURATION_MS);
            }
          }
        });
      } catch (err) {
        stateManager.setState(TOOLBAR_STATES.ERROR, { action: 'download', error: err.message });
        toolbarController.showNotice(err.message || 'Lỗi kết nối nền', NOTICE_DURATION_MS);
        setTimeout(() => {
          if (stateManager.getState() === TOOLBAR_STATES.ERROR) {
            stateManager.setState(
              isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
            );
          }
        }, NOTICE_DURATION_MS);
      }
    }

    sendDownloadRequest();
  }

  function handleCdnClick(event) {
    event.stopPropagation();
    event.preventDefault();

    if (stateManager.isDismissed()) return;

    // Concurrency guard: Ignore clicks if resolution is already in-flight
    if (stateManager.getState() === TOOLBAR_STATES.PROCESSING) {
      return;
    }

    // Debounce rapid clicks (250ms)
    const now = Date.now();
    if (now - lastActionClickTime < CLICK_DEBOUNCE_MS) {
      return;
    }
    lastActionClickTime = now;

    // Unconfigured stub guard when CDN resolver is explicitly disabled via options
    if (options.enableCdnResolver === false) {
      const message = 'Tính năng Mở CDN sẽ được tích hợp ở Phase 3.';
      toolbarController.showNotice(message, NOTICE_DURATION_MS);
      stateManager.setState(TOOLBAR_STATES.UNCONFIGURED, { message });
      return;
    }

    const isShiftClick = Boolean(event.shiftKey);
    stateManager.setState(TOOLBAR_STATES.PROCESSING, { action: 'cdn' });

    const resolver = options.cdnResolver || resolveCdnForVideo;

    function handleResult(result) {
      if (!result) return;
      if (result.isAmbiguous) {
        if (stateManager.getState() !== TOOLBAR_STATES.AMBIGUOUS) {
          stateManager.setState(TOOLBAR_STATES.AMBIGUOUS, { candidates: result.candidates });
        }
        return;
      }
      if (result.success) {
        stateManager.setState(TOOLBAR_STATES.SUCCESS, { action: 'cdn' });
        if (result.copied) {
          toolbarController.showNotice('Đã sao chép liên kết CDN', NOTICE_DURATION_MS);
        } else if (result.isHls) {
          toolbarController.showNotice('Đang mở luồng HLS (.m3u8)', NOTICE_DURATION_MS);
        } else {
          toolbarController.showNotice('Đã mở tab CDN', NOTICE_DURATION_MS);
        }

        setTimeout(() => {
          if (stateManager.getState() === TOOLBAR_STATES.SUCCESS) {
            stateManager.setState(
              isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
            );
          }
        }, NOTICE_DURATION_MS);
      } else {
        stateManager.setState(TOOLBAR_STATES.ERROR, { action: 'cdn', error: result.code || result.error });
        toolbarController.showNotice(result.error || 'Lỗi khi mở CDN', NOTICE_DURATION_MS);

        setTimeout(() => {
          if (stateManager.getState() === TOOLBAR_STATES.ERROR) {
            stateManager.setState(
              isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
            );
          }
        }, NOTICE_DURATION_MS);
      }
    }

    const effectiveIdx = getEffectiveMediaIndex();
    const effectiveInfo = { ...tweetInfo, mediaIndex: effectiveIdx };

    try {
      const promiseOrResult = resolver(video, effectiveInfo, {
        shiftKey: isShiftClick,
        onAmbiguous: (candidates, resolveCallback) => {
          // If this video can be matched deterministically, resolve it directly
          const matchResult = selectTargetMedia(candidates, effectiveInfo, video);
          if (matchResult.media) {
            resolveCallback(matchResult.media)
              .then(handleResult)
              .catch((err) => {
                handleResult({
                  success: false,
                  error: err?.message || 'Lỗi xử lý video',
                });
              });
            return;
          }

          // Otherwise, enter AMBIGUOUS state and render picker popover
          stateManager.setState(TOOLBAR_STATES.AMBIGUOUS, { candidates });
          renderMediaPicker(toolbarController.shadowRoot, candidates, {
            onSelect: async (selectedMedia, idx) => {
              stateManager.setState(TOOLBAR_STATES.PROCESSING, { action: 'cdn' });
              try {
                const res = await resolveCallback(selectedMedia);
                handleResult(res);
              } catch (err) {
                handleResult({ success: false, error: err.message || 'Lỗi xử lý video' });
              }
            },
            onCancel: () => {
              stateManager.setState(
                isHoveringVideo || isHoveringToolbar ? TOOLBAR_STATES.HOVERED : TOOLBAR_STATES.IDLE
              );
            },
          });
        },
      });

      if (promiseOrResult && typeof promiseOrResult.then === 'function') {
        promiseOrResult
          .then((result) => {
            if (result?.isAmbiguous) {
              if (stateManager.getState() !== TOOLBAR_STATES.AMBIGUOUS) {
                stateManager.setState(TOOLBAR_STATES.AMBIGUOUS, { candidates: result.candidates });
              }
              return;
            }
            handleResult(result);
          })
          .catch((err) => {
            handleResult({
              success: false,
              error: err.message || 'Lỗi kết nối máy chủ X',
            });
          });
      } else {
        if (promiseOrResult?.isAmbiguous) {
          if (stateManager.getState() !== TOOLBAR_STATES.AMBIGUOUS) {
            stateManager.setState(TOOLBAR_STATES.AMBIGUOUS, { candidates: promiseOrResult.candidates });
          }
        } else {
          handleResult(promiseOrResult);
        }
      }
    } catch (err) {
      handleResult({
        success: false,
        error: err.message || 'Lỗi kết nối máy chủ X',
      });
    }
  }

  function handleDismissClick(event) {
    event.stopPropagation();
    event.preventDefault();

    cancelHideTimer();
    toolbarController.dismiss();
  }

  // Keyboard accessibility: Enter or Space triggers button action
  function handleButtonKeydown(event, handler) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  }

  // Attach event listeners
  if (wrapper) {
    wrapper.addEventListener('mouseenter', onWrapperMouseEnter);
    wrapper.addEventListener('mousemove', onWrapperMouseMove);
    wrapper.addEventListener('mouseleave', onWrapperMouseLeave);
  }

  // Also bind to inner video and dedicated videoPlayer for reliable detection through Twitter overlay layers
  const innerPlayer = video?.closest?.('[data-testid="videoPlayer"]');
  if (innerPlayer && innerPlayer !== wrapper && (!innerPlayer.querySelectorAll || innerPlayer.querySelectorAll('video').length === 1)) {
    innerPlayer.addEventListener('mouseenter', onWrapperMouseEnter);
    innerPlayer.addEventListener('mousemove', onWrapperMouseMove);
  }
  if (video && video !== wrapper && video !== innerPlayer) {
    video.addEventListener('mouseenter', onWrapperMouseEnter);
    video.addEventListener('mousemove', onWrapperMouseMove);
  }

  if (host) {
    host.addEventListener('mouseenter', onHostMouseEnter);
    host.addEventListener('mousemove', onHostMouseMove);
    host.addEventListener('mouseleave', onHostMouseLeave);
    host.addEventListener('focusin', onHostFocusIn);
    host.addEventListener('focusout', onHostFocusOut);
    host.addEventListener('click', onHostClick);
    host.addEventListener('mousedown', onHostClick);
    host.addEventListener('mouseup', onHostClick);
  }

  // Initial check: if mouse is already resting over video wrapper when mounted, show immediately
  if (typeof wrapper?.matches === 'function') {
    try {
      if (wrapper.matches(':hover') || (innerPlayer && innerPlayer.matches(':hover')) || (video && video.matches?.(':hover'))) {
        isHoveringVideo = true;
        toolbarController.show();
      }
    } catch {
      // Ignore matches pseudo-class errors in non-browser envs
    }
  }

  // Query buttons from Shadow DOM and bind
  const shadowRoot = host.shadowRoot;
  let downloadBtn = null;
  let cdnBtn = null;
  let dismissBtn = null;

  let downloadKeydownHandler = null;
  let cdnKeydownHandler = null;
  let dismissKeydownHandler = null;

  if (shadowRoot) {
    downloadBtn = shadowRoot.querySelector('.xvt-btn-download');
    cdnBtn = shadowRoot.querySelector('.xvt-btn-cdn');
    dismissBtn = shadowRoot.querySelector('.xvt-btn-dismiss');

    if (downloadBtn) {
      downloadBtn.addEventListener('click', handleDownloadClick);
      downloadKeydownHandler = (e) => handleButtonKeydown(e, handleDownloadClick);
      downloadBtn.addEventListener('keydown', downloadKeydownHandler);
    }

    if (cdnBtn) {
      cdnBtn.addEventListener('click', handleCdnClick);
      cdnKeydownHandler = (e) => handleButtonKeydown(e, handleCdnClick);
      cdnBtn.addEventListener('keydown', cdnKeydownHandler);
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', handleDismissClick);
      dismissKeydownHandler = (e) => handleButtonKeydown(e, handleDismissClick);
      dismissBtn.addEventListener('keydown', dismissKeydownHandler);
    }
  }

  /**
   * Cleanup all listeners and timers.
   */
  function cleanup() {
    cancelHideTimer();

    if (wrapper) {
      wrapper.removeEventListener('mouseenter', onWrapperMouseEnter);
      wrapper.removeEventListener('mousemove', onWrapperMouseMove);
      wrapper.removeEventListener('mouseleave', onWrapperMouseLeave);
    }

    if (innerPlayer && innerPlayer !== wrapper && (!innerPlayer.querySelectorAll || innerPlayer.querySelectorAll('video').length === 1)) {
      innerPlayer.removeEventListener('mouseenter', onWrapperMouseEnter);
      innerPlayer.removeEventListener('mousemove', onWrapperMouseMove);
    }

    if (video && video !== wrapper && video !== innerPlayer) {
      video.removeEventListener('mouseenter', onWrapperMouseEnter);
      video.removeEventListener('mousemove', onWrapperMouseMove);
    }

    if (host) {
      host.removeEventListener('mouseenter', onHostMouseEnter);
      host.removeEventListener('mousemove', onHostMouseMove);
      host.removeEventListener('mouseleave', onHostMouseLeave);
      host.removeEventListener('focusin', onHostFocusIn);
      host.removeEventListener('focusout', onHostFocusOut);
      host.removeEventListener('click', onHostClick);
      host.removeEventListener('mousedown', onHostClick);
      host.removeEventListener('mouseup', onHostClick);
    }

    if (downloadBtn) {
      downloadBtn.removeEventListener('click', handleDownloadClick);
      if (downloadKeydownHandler) {
        downloadBtn.removeEventListener('keydown', downloadKeydownHandler);
      }
    }

    if (cdnBtn) {
      cdnBtn.removeEventListener('click', handleCdnClick);
      if (cdnKeydownHandler) {
        cdnBtn.removeEventListener('keydown', cdnKeydownHandler);
      }
    }

    if (dismissBtn) {
      dismissBtn.removeEventListener('click', handleDismissClick);
      if (dismissKeydownHandler) {
        dismissBtn.removeEventListener('keydown', dismissKeydownHandler);
      }
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.removeListener) {
      chrome.runtime.onMessage.removeListener(handleDownloadStatusChanged);
    }
  }

  return {
    cleanup,
    cancelHideTimer,
    isHoveringVideo: () => isHoveringVideo,
    isHoveringToolbar: () => isHoveringToolbar,
    getHideTimer: () => hideTimer,
  };
}
