// src/content/toolbar/toolbar.js
import { TOOLBAR_STYLES, ICONS } from './toolbarStyles.js';
import { TOOLBAR_STATES, createToolbarStateManager } from './toolbarState.js';
import { setupToolbarEvents } from './toolbarEvents.js';
import { videoStateStore as defaultStateStore, getVideoKey } from '../state/videoState.js';

export const DISMISS_ANIMATION_DURATION_MS = 150;

/**
 * Checks whether the toolbar should fallback inside the video player
 * (e.g. when there is less than 48px available between video and screen edge).
 * 
 * @param {HTMLElement} wrapper
 * @param {HTMLVideoElement} videoElement
 * @returns {boolean}
 */
export function shouldFallbackInside(wrapper, videoElement) {
  if (typeof window === 'undefined') return false;
  try {
    const target = wrapper || videoElement;
    if (!target || typeof target.getBoundingClientRect !== 'function') return false;
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return rect.left < 48;
  } catch {
    return false;
  }
}

/**
 * Resolves the isolated wrapper container dedicated to a specific video element.
 * If a shared container (e.g. videoComponent) contains multiple videos, this traverses
 * down to find the closest wrapper dedicated exclusively to this single video.
 * 
 * @param {HTMLVideoElement} videoElement
 * @returns {HTMLElement | null}
 */
export function resolveVideoWrapper(videoElement) {
  if (!videoElement || typeof videoElement !== 'object') return null;

  const quoteTweet = videoElement.closest?.('[data-testid="quoteTweet"], [data-testid="tweetQuote"]');
  const tweetArticle = videoElement.closest?.('article[data-testid="tweet"], article');
  const boundary = quoteTweet || tweetArticle || document.body;

  const videoComponent = videoElement.closest?.('[data-testid="videoComponent"]');
  const videoPlayer = videoElement.closest?.('[data-testid="videoPlayer"]');

  // If videoComponent exists, is within boundary, and only contains this video element
  if (videoComponent && (!quoteTweet || quoteTweet.contains(videoComponent)) && videoComponent.querySelectorAll('video').length === 1) {
    return videoComponent;
  }

  // If videoPlayer exists, is within boundary, and only contains this video element
  if (videoPlayer && (!quoteTweet || quoteTweet.contains(videoPlayer)) && videoPlayer.querySelectorAll('video').length === 1) {
    return videoPlayer;
  }

  // If container contains multiple videos, walk up from videoElement to find the closest container with 1 video
  let current = videoElement.parentElement;
  while (current && current !== boundary && current !== document.body) {
    if (current.querySelectorAll('video').length === 1) {
      return current;
    }
    current = current.parentElement;
  }

  return videoComponent || videoPlayer || videoElement.parentElement || null;
}

/**
 * Creates and mounts a Floating Toolbar instance attached to a video wrapper.
 * 
 * @param {HTMLVideoElement} videoElement
 * @param {object} [tweetInfo={}]
 * @param {object} [options={}]
 * @param {import('../state/videoState.js').VideoStateStore} [options.stateStore]
 * @returns {object} ToolbarController instance
 */
export function createToolbar(videoElement, tweetInfo = {}, options = {}) {
  const stateStore = options.stateStore || defaultStateStore;

  // 1. Identify isolated video wrapper container dedicated to this video
  const wrapper = resolveVideoWrapper(videoElement);

  if (!wrapper) {
    console.warn('[X Video Tools] Cannot attach toolbar: no valid video wrapper found.');
    return null;
  }

  // 2. Ensure wrapper establishes CSS positioning context and does not clip outside toolbar
  if (typeof window !== 'undefined') {
    try {
      const computedPos = window.getComputedStyle(wrapper).position;
      if (computedPos === 'static' || !computedPos) {
        wrapper.style.position = 'relative';
      }
      wrapper.style.setProperty('overflow', 'visible', 'important');

      if (wrapper.parentElement && wrapper.parentElement.tagName !== 'ARTICLE' && wrapper.parentElement !== document.body) {
        const parentOverflow = window.getComputedStyle(wrapper.parentElement).overflow;
        if (parentOverflow === 'hidden' || parentOverflow === 'clip') {
          wrapper.parentElement.style.setProperty('overflow', 'visible', 'important');
        }
      }
    } catch {
      wrapper.style.position = 'relative';
      wrapper.style.setProperty('overflow', 'visible', 'important');
    }
  } else if (!wrapper.style.position || wrapper.style.position === 'static') {
    wrapper.style.position = 'relative';
  }

  // 3. Resolve canonical video key
  const videoKey =
    tweetInfo.videoKey ||
    videoElement.dataset.xvtVideoKey ||
    (tweetInfo.tweetId ? getVideoKey(tweetInfo.tweetId, tweetInfo.mediaIndex, tweetInfo.mediaFingerprint || videoElement) : null);

  if (videoKey && videoElement.dataset) {
    videoElement.dataset.xvtVideoKey = videoKey;
  }

  // 4. Create host container (Default: horizontal pill anchored top-left inside video)
  const host = document.createElement('div');
  host.className = 'xvt-toolbar-host';
  host.setAttribute('data-xvt-mounted', 'true');
  if (videoKey) {
    host.setAttribute('data-xvt-video-key', videoKey);
    host.dataset.xvtVideoKey = videoKey;
  }
  host.style.position = 'absolute';
  host.style.top = '10px';
  host.style.left = '10px';
  host.style.zIndex = '9999';

  /**
   * Adjusts positioning to top-left corner of video.
   */
  function updatePosition() {
    let topOffset = 10;
    let leftOffset = 10;
    if (wrapper.querySelectorAll('video').length > 1) {
      topOffset = (videoElement.offsetTop || 0) + 10;
      leftOffset = (videoElement.offsetLeft || 0) + 10;
    }
    host.style.top = `${topOffset}px`;
    host.style.left = `${leftOffset}px`;
    host.style.right = 'auto';
    host.style.transform = 'none';
  }

  updatePosition();

  // 5. Attach Open Shadow DOM
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // 6. Inject encapsulated CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = TOOLBAR_STYLES;
  shadowRoot.appendChild(styleEl);

  // 7. Build Toolbar DOM structure (horizontal pill: Download, CDN, Dismiss)
  const container = document.createElement('div');
  container.className = 'xvt-toolbar-container xvt-idle';

  container.innerHTML = `
    <div class="xvt-toolbar-pill" role="toolbar" aria-label="X Video Tools">
      <button class="xvt-btn xvt-btn-download" role="button" tabindex="0" aria-label="Tải video">
        <span class="xvt-btn-icon" aria-hidden="true">${ICONS.DOWNLOAD}</span>
        <div class="xvt-tooltip" role="tooltip">Tải</div>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-cdn" role="button" tabindex="0" aria-label="Link">
        <span class="xvt-btn-icon" aria-hidden="true">${ICONS.CDN}</span>
        <div class="xvt-tooltip" role="tooltip">Link</div>
      </button>
      <div class="xvt-divider" aria-hidden="true"></div>
      <button class="xvt-btn xvt-btn-dismiss" role="button" tabindex="0" aria-label="Ẩn trên video này">
        <span class="xvt-btn-icon" aria-hidden="true">${ICONS.CLOSE}</span>
      </button>
    </div>
    <div class="xvt-notice" aria-live="polite"></div>
  `;

  shadowRoot.appendChild(container);

  const noticeEl = shadowRoot.querySelector('.xvt-notice');
  const downloadIconEl = shadowRoot.querySelector('.xvt-btn-download .xvt-btn-icon');
  const downloadBtn = shadowRoot.querySelector('.xvt-btn-download');
  const cdnBtn = shadowRoot.querySelector('.xvt-btn-cdn');
  const cdnIconEl = shadowRoot.querySelector('.xvt-btn-cdn .xvt-btn-icon');

  // 8. State Manager initialization
  const stateManager = createToolbarStateManager(TOOLBAR_STATES.IDLE);
  let noticeTimer = null;
  let dismissTimer = null;

  // React to state machine transitions
  stateManager.subscribe((currentState, previousState, payload) => {
    // Reset all status class modifiers on container
    container.classList.remove(
      'xvt-idle',
      'xvt-hovered',
      'xvt-processing',
      'xvt-downloading',
      'xvt-completed',
      'xvt-ambiguous',
      'xvt-picker',
      'xvt-success',
      'xvt-error',
      'xvt-interrupted',
      'xvt-cancelled',
      'xvt-unconfigured',
      'xvt-dismissing'
    );

    // Apply active class
    container.classList.add(`xvt-${currentState}`);

    const isCdnAction = payload?.action === 'cdn';

    // Update icons / buttons based on state
    if (currentState === TOOLBAR_STATES.PROCESSING || currentState === TOOLBAR_STATES.DOWNLOADING) {
      if (isCdnAction) {
        if (cdnIconEl) cdnIconEl.innerHTML = ICONS.SPINNER;
        if (cdnBtn) cdnBtn.setAttribute('aria-busy', 'true');
      } else {
        if (downloadIconEl) downloadIconEl.innerHTML = ICONS.SPINNER;
        if (downloadBtn) downloadBtn.setAttribute('aria-busy', 'true');
      }
    } else if (currentState === TOOLBAR_STATES.SUCCESS || currentState === TOOLBAR_STATES.COMPLETED) {
      if (isCdnAction) {
        if (cdnIconEl) cdnIconEl.innerHTML = ICONS.CHECKMARK;
        if (cdnBtn) cdnBtn.removeAttribute('aria-busy');
      } else {
        if (downloadIconEl) downloadIconEl.innerHTML = ICONS.CHECKMARK;
        if (downloadBtn) downloadBtn.removeAttribute('aria-busy');
      }
    } else if (currentState === TOOLBAR_STATES.ERROR || currentState === TOOLBAR_STATES.INTERRUPTED) {
      if (isCdnAction) {
        if (cdnIconEl) cdnIconEl.innerHTML = ICONS.ERROR;
        if (cdnBtn) cdnBtn.removeAttribute('aria-busy');
      } else {
        if (downloadIconEl) downloadIconEl.innerHTML = ICONS.ERROR;
        if (downloadBtn) downloadBtn.removeAttribute('aria-busy');
      }
    } else {
      if (downloadIconEl) downloadIconEl.innerHTML = ICONS.DOWNLOAD;
      if (downloadBtn) downloadBtn.removeAttribute('aria-busy');
      if (cdnIconEl) cdnIconEl.innerHTML = ICONS.CDN;
      if (cdnBtn) cdnBtn.removeAttribute('aria-busy');
    }
  });

  /**
   * Displays temporary feedback notice message.
   * 
   * @param {string} message
   * @param {number} [duration=2500]
   */
  function showNotice(message, duration = 2500) {
    if (!noticeEl) return;
    if (noticeTimer !== null) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }

    noticeEl.textContent = message;
    container.classList.add('xvt-has-notice');
    noticeEl.classList.add('xvt-notice-visible');

    noticeTimer = setTimeout(() => {
      hideNotice();
    }, duration);
  }

  /**
   * Hides the notice banner.
   */
  function hideNotice() {
    if (noticeTimer !== null) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    if (container) {
      container.classList.remove('xvt-has-notice');
    }
    if (noticeEl) {
      noticeEl.classList.remove('xvt-notice-visible');
    }
  }

  /**
   * Shows toolbar (transition to hovered state).
   */
  function show() {
    if (stateManager.isDismissed()) return;
    stateManager.setState(TOOLBAR_STATES.HOVERED);
  }

  /**
   * Hides toolbar (transition to idle state).
   * Inhibited during active feedback (AMBIGUOUS, PICKER, DOWNLOADING).
   */
  function hide() {
    if (
      stateManager.isDismissed() ||
      stateManager.getState() === TOOLBAR_STATES.AMBIGUOUS ||
      stateManager.getState() === TOOLBAR_STATES.PICKER ||
      stateManager.getState() === TOOLBAR_STATES.DOWNLOADING
    ) {
      return;
    }
    stateManager.setState(TOOLBAR_STATES.IDLE);
  }

  /**
   * Performs dismiss sequence:
   * 1. Sets state to DISMISSED.
   * 2. Registers dismiss in VideoStateStore.
   * 3. Runs 150ms fade-out animation.
   * 4. Detaches from DOM and cleans up.
   */
  function dismiss() {
    if (stateManager.isDismissed()) return;

    // Transition state
    stateManager.setState(TOOLBAR_STATES.DISMISSED);

    // Synchronize across VideoStateStore
    stateStore.dismiss(videoKey, videoElement);

    // Apply dismissing class for fade-out animation
    container.classList.remove('xvt-hovered', 'xvt-idle', 'xvt-unconfigured');
    container.classList.add('xvt-dismissing');

    dismissTimer = setTimeout(() => {
      destroy();
    }, DISMISS_ANIMATION_DURATION_MS);
  }

  const onDestroy = options.onDestroy;

  /**
   * Teardown and cleanup of all listeners, timers, and DOM elements.
   */
  function destroy() {
    if (noticeTimer !== null) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    if (dismissTimer !== null) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }

    if (eventController) {
      eventController.cleanup();
    }

    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }

    stateManager.destroy();

    if (typeof onDestroy === 'function') {
      try {
        onDestroy();
      } catch (err) {
        console.error('[X Video Tools] Error in onDestroy callback:', err);
      }
    }
  }

  // 9. Mount to DOM
  wrapper.appendChild(host);

  // 10. Bind events
  const toolbarController = {
    host,
    shadowRoot,
    wrapper,
    video: videoElement,
    stateManager,
    show,
    hide,
    dismiss,
    showNotice,
    hideNotice,
    updatePosition,
    updateState: (nextState, payload) => stateManager.setState(nextState, payload),
    destroy,
  };

  const eventController = setupToolbarEvents({
    host,
    wrapper,
    video: videoElement,
    stateManager,
    toolbarController,
    stateStore,
    tweetInfo,
    options,
  });

  toolbarController.eventController = eventController;

  return toolbarController;
}
