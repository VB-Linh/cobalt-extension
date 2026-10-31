// tests/content/toolbar/reviewerRound3Adversarial.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { simulatePointerEvent } from '../../fixtures/toolbarFixture.js';
import { attachToolbar, detachToolbar, getToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import { createVideoStateStore } from '../../../src/content/state/videoState.js';
import { selectTargetMedia } from '../../../src/content/cdn/mediaSelector.js';
import { matchPickerItem } from '../../../src/shared/utils/mediaMatcher.js';
import { formatErrorMessage, redactSensitiveText } from '../../../src/shared/utils/errorHelper.js';

describe('Reviewer Round 3 Adversarial Suite: Breakage Verification', () => {
  let stateStore;

  beforeEach(() => {
    vi.useFakeTimers();
    stateStore = createVideoStateStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // -------------------------------------------------------------------------
  // Test 1: Recycled wrapper with orphan host from previous tweet
  // -------------------------------------------------------------------------
  it('Attack 1: Recycled wrapper retaining orphan host from previous tweet must not lock out new video', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent" class="recycled-wrapper">
        <!-- Orphan host left from old tweet 100 -->
        <div class="xvt-toolbar-host" data-xvt-video-key="100_media_1"></div>
        <video id="newVideo"></video>
      </div>
    `;
    document.body.appendChild(article);

    const newVideo = article.querySelector('#newVideo');
    const wrapper = article.querySelector('.recycled-wrapper');

    // Attach toolbar for tweet 200
    const controller = attachToolbar(newVideo, { tweetId: '200', mediaIndex: 1 }, { stateStore });

    // The new video MUST receive a toolbar! It must not return null!
    expect(controller).not.toBeNull();
    expect(controller.host).not.toBeNull();

    // The old orphan host from tweet 100 must have been removed!
    const oldHost = wrapper.querySelector('.xvt-toolbar-host[data-xvt-video-key="100_media_1"]');
    expect(oldHost).toBeNull();

    // Exactly 1 valid host for tweet 200 should exist
    const newHost = wrapper.querySelector('.xvt-toolbar-host[data-xvt-video-key="200_media_1"]');
    expect(newHost).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 2: Multi-video post with dedicated cells: Hovering cell 1 must NOT show toolbar 2
  // -------------------------------------------------------------------------
  it('Attack 2: In multi-video post with dedicated cells, hovering Cell 1 must NOT cause Toolbar 2 to show', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoPlayer" id="outerPlayer">
        <div class="cell-1" id="c1">
          <video id="v1" src="blob:https://x.com/v1"></video>
        </div>
        <div class="cell-2" id="c2">
          <video id="v2" src="blob:https://x.com/v2"></video>
        </div>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');
    const c1 = article.querySelector('#c1');
    const c2 = article.querySelector('#c2');

    const ctrl1 = attachToolbar(v1, { tweetId: '300', mediaIndex: 1 }, { stateStore });
    const ctrl2 = attachToolbar(v2, { tweetId: '300', mediaIndex: 2 }, { stateStore });

    expect(ctrl1).not.toBeNull();
    expect(ctrl2).not.toBeNull();
    expect(ctrl1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(ctrl2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    // Mouse moves over Cell 1
    simulatePointerEvent(c1, 'mousemove');
    vi.advanceTimersByTime(50);

    // Toolbar 1 MUST be hovered; Toolbar 2 MUST remain idle!
    expect(ctrl1.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    expect(ctrl2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
  });

  // -------------------------------------------------------------------------
  // Test 3: Shared container with 2 videos: Hovering wrapper container itself must NOT show both toolbars
  // -------------------------------------------------------------------------
  it('Attack 3: Hovering the shared container itself must NOT show both toolbars simultaneously', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent" class="shared-container" id="sharedContainer">
        <video id="v1" src="blob:https://x.com/v1"></video>
        <video id="v2" src="blob:https://x.com/v2"></video>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');
    const sharedContainer = article.querySelector('#sharedContainer');

    const ctrl1 = attachToolbar(v1, { tweetId: '400', mediaIndex: 1 }, { stateStore });
    const ctrl2 = attachToolbar(v2, { tweetId: '400', mediaIndex: 2 }, { stateStore });

    expect(ctrl1).not.toBeNull();
    expect(ctrl2).not.toBeNull();

    // Mouse enters the shared container background (not pointing at v1 or v2 specifically)
    simulatePointerEvent(sharedContainer, 'mouseenter');
    vi.advanceTimersByTime(50);

    // Neither toolbar should pop up until hovering a specific video!
    expect(ctrl1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(ctrl2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
  });

  // -------------------------------------------------------------------------
  // Test 4: selectTargetMedia with mixed media and videoCandidates fallback
  // -------------------------------------------------------------------------
  it('Attack 4: selectTargetMedia accurately resolves video permalink index and rejects photo position in mixed media tweet', () => {
    const mediaDetails = [
      { type: 'photo', id_str: 'photo_1' },
      {
        type: 'video',
        id_str: 'video_1',
        video_info: { variants: [{ url: 'https://video.twimg.com/v1.mp4', content_type: 'video/mp4' }] },
      },
      {
        type: 'video',
        id_str: 'video_2',
        video_info: { variants: [{ url: 'https://video.twimg.com/v2.mp4', content_type: 'video/mp4' }] },
      },
    ];

    // Twitter rendered /video/2 for the video at index 2
    const resultV1 = selectTargetMedia(mediaDetails, { mediaIndex: 2 });
    expect(resultV1.ambiguous).toBe(false);
    expect(resultV1.media).not.toBeNull();
    expect(resultV1.media.id_str).toBe('video_1');

    // If an anchor points to photo index 1 on a video toolbar, it must NOT return a video
    const resultPhoto = selectTargetMedia(mediaDetails, { mediaIndex: 1 });
    expect(resultPhoto.ambiguous).toBe(true);
    expect(resultPhoto.media).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 5: Keyboard accessibility via focusin on toolbar host
  // -------------------------------------------------------------------------
  it('Attack 5: Keyboard Tab focus on toolbar buttons keeps toolbar visible', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent">
        <video id="v1"></video>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const ctrl = attachToolbar(v1, { tweetId: '500' }, { stateStore });

    expect(ctrl.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    // Keyboard user tabs into the toolbar host
    ctrl.host.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(50);

    expect(ctrl.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

    // After 350ms (longer than 300ms grace period), it MUST STILL BE HOVERED because focus is active!
    vi.advanceTimersByTime(350);
    expect(ctrl.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

    // Keyboard user tabs away (focusout)
    ctrl.host.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    vi.advanceTimersByTime(350);
    expect(ctrl.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
  });

  // -------------------------------------------------------------------------
  // Test 6: Shadow DOM boundary transition when moving into button inside Shadow DOM
  // -------------------------------------------------------------------------
  it('Attack 6: Moving mouse from video into button inside Shadow DOM does not cause toolbar to hide', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent" class="vid-wrap">
        <video id="v1"></video>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const wrap = article.querySelector('.vid-wrap');
    const ctrl = attachToolbar(v1, { tweetId: '600' }, { stateStore });

    // Hover video
    simulatePointerEvent(wrap, 'mouseenter');
    expect(ctrl.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

    const btn = ctrl.host.shadowRoot.querySelector('.xvt-btn-download');
    expect(btn).not.toBeNull();

    // Mouse leaves wrap and enters btn inside ShadowRoot directly
    simulatePointerEvent(wrap, 'mouseleave', { relatedTarget: btn });

    // Even past grace period, toolbar must NOT hide because pointer moved into Shadow DOM button!
    vi.advanceTimersByTime(350);
    expect(ctrl.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
  });

  // -------------------------------------------------------------------------
  // Test 7: Active Media Picker teardown & document listener cleanup on unmount
  // -------------------------------------------------------------------------
  it('Attack 7: Popover teardown & document listener cleanup when toolbar is destroyed or unmounted during PICKER / AMBIGUOUS state', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent" class="vid-wrap">
        <video id="v1"></video>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const ctrl = attachToolbar(v1, { tweetId: '700' }, {
      stateStore,
      enableDownload: true,
    });

    const downloadBtn = ctrl.host.shadowRoot.querySelector('.xvt-btn-download');

    // Simulate background returning ambiguous picker response
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      cb({
        status: 'picker',
        items: [
          { type: 'video', url: 'https://video.twimg.com/a.mp4' },
          { type: 'video', url: 'https://video.twimg.com/b.mp4' },
        ],
      });
    });

    simulatePointerEvent(downloadBtn, 'click');
    expect(ctrl.stateManager.getState()).toBe(TOOLBAR_STATES.PICKER);

    // Popover is mounted inside Shadow DOM
    const popover = ctrl.host.shadowRoot.querySelector('.xvt-picker-popover');
    expect(popover).not.toBeNull();

    // Now video/toolbar unmounts or user dismisses
    detachToolbar(v1, stateStore);

    // Host should be removed from DOM
    expect(document.querySelector('.xvt-toolbar-host')).toBeNull();

    // The document must not retain dangling event listeners that intercept clicks
    const dummyButton = document.createElement('button');
    let clicked = false;
    dummyButton.addEventListener('click', () => { clicked = true; });
    document.body.appendChild(dummyButton);

    dummyButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 8: Sensitive Api-Key and query param credential redaction
  // -------------------------------------------------------------------------
  it('Attack 8: Sensitive Api-Key and query parameter credentials are completely redacted from error strings', () => {
    // 1. Api-Key header format
    const errApiKey = { message: 'Failed with Api-Key a1b2c3d4-e5f6-7890-abcd-ef1234567890' };
    expect(formatErrorMessage(errApiKey)).toBe('Failed with Api-Key [REDACTED]');

    // 2. Query param api_key
    const errQuery = { message: 'Request error: https://cobalt.local/download?api_key=my_secret_token_123' };
    expect(formatErrorMessage(errQuery)).toBe('Request error: https://cobalt.local/download?api_key=[REDACTED]');

    // 3. Query param session_token
    const errSession = { message: 'Error: session_token=secret_sess_abc' };
    expect(formatErrorMessage(errSession)).toBe('Error: session_token=[REDACTED]');
  });

  // -------------------------------------------------------------------------
  // Test 9: Rapid alternation between "Mở CDN" and "Tải video" within <50ms
  // -------------------------------------------------------------------------
  it('Attack 9: Rapid alternating between clicking "Mở CDN" and "Tải video" (<50ms) preserves state integrity without warnings', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent" class="vid-wrap">
        <video id="v1"></video>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const ctrl = attachToolbar(v1, { tweetId: '900' }, {
      stateStore,
      enableDownload: true,
      cdnResolver: () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
    });

    const warnSpy = vi.spyOn(console, 'warn');
    const downloadBtn = ctrl.host.shadowRoot.querySelector('.xvt-btn-download');
    const cdnBtn = ctrl.host.shadowRoot.querySelector('.xvt-btn-cdn');

    // Click CDN first
    simulatePointerEvent(cdnBtn, 'click');
    expect(ctrl.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

    // Rapidly (<50ms) click Download button
    vi.advanceTimersByTime(30);
    simulatePointerEvent(downloadBtn, 'click');

    // State MUST stay in PROCESSING, no invalid transition warning
    expect(ctrl.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

    const invalidWarnings = warnSpy.mock.calls.filter((call) =>
      call[0]?.includes('Invalid toolbar state transition')
    );
    expect(invalidWarnings.length).toBe(0);
  });
});

