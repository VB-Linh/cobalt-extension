// src/content/toolbar/toolbarEvents.js
import { TOOLBAR_STATES } from './toolbarState.js';
import { resolveCdnForVideo } from '../cdn/cdnResolver.js';
import { renderMediaPicker } from '../cdn/mediaPicker.js';

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
  let hideTimer = null;
  let lastActionClickTime = 0;

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
      if (
        !isHoveringVideo &&
        !isHoveringToolbar &&
        !stateManager.isDismissed() &&
        stateManager.getState() !== TOOLBAR_STATES.AMBIGUOUS
      ) {
        toolbarController.hide();
      }
      hideTimer = null;
    }, GRACE_PERIOD_MS);
  }

  // --- Wrapper Mouse Listeners ---
  function onWrapperMouseEnter() {
    if (stateManager.isDismissed()) return;
    isHoveringVideo = true;
    cancelHideTimer();
    toolbarController.updatePosition?.();
    toolbarController.show();
  }

  function onWrapperMouseMove() {
    if (stateManager.isDismissed()) return;
    if (!isHoveringVideo) {
      isHoveringVideo = true;
      cancelHideTimer();
      toolbarController.updatePosition?.();
      toolbarController.show();
    }
  }

  function onWrapperMouseLeave(event) {
    if (stateManager.isDismissed()) return;

    // Check if moving directly into host
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && (relatedTarget === host || host.contains(relatedTarget))) {
      return;
    }

    isHoveringVideo = false;
    scheduleGracefulHide();
  }

  // --- Host Mouse Listeners ---
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

    // Check if moving directly back into wrapper
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && (relatedTarget === wrapper || wrapper.contains(relatedTarget))) {
      return;
    }

    isHoveringToolbar = false;
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

    // Debounce rapid spam clicks
    const now = Date.now();
    if (now - lastActionClickTime < CLICK_DEBOUNCE_MS) {
      return;
    }
    lastActionClickTime = now;

    // In Phase 2: Action buttons operate in unconfigured state without network calls or fake success
    const message = 'Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.';
    toolbarController.showNotice(message, NOTICE_DURATION_MS);
    stateManager.setState(TOOLBAR_STATES.UNCONFIGURED, { message });
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

    try {
      const promiseOrResult = resolver(video, tweetInfo, {
        shiftKey: isShiftClick,
        onAmbiguous: (candidates, resolveCallback) => {
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

  // Also bind to inner video and videoPlayer for reliable detection through Twitter overlay layers
  const innerPlayer = video?.closest?.('[data-testid="videoPlayer"]');
  if (innerPlayer && innerPlayer !== wrapper) {
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

    if (innerPlayer && innerPlayer !== wrapper) {
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
  }

  return {
    cleanup,
    cancelHideTimer,
    isHoveringVideo: () => isHoveringVideo,
    isHoveringToolbar: () => isHoveringToolbar,
    getHideTimer: () => hideTimer,
  };
}
