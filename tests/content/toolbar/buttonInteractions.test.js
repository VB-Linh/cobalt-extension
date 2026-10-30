// tests/content/toolbar/buttonInteractions.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { attachToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';

describe('Group C: Button Interaction & Feedback (Scenarios 11–15)', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
    env = setupToolbarTestEnv({ tweetId: '1800000000000000030' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    teardownToolbarTestEnv(env);
  });

  it('Scenario 11: clicking "Tải video" sends 0 network requests, shows unconfigured feedback, and shields event propagation', () => {
    const { tweet, video, videoWrapper } = env;
    const controller = attachToolbar(video, { tweetId: '1800000000000000030' }, { stateStore: env.stateStore });
    const host = getToolbarHost(videoWrapper);
    const { downloadBtn, noticeEl } = getToolbarButtons(host);

    // Spy on network and extension APIs
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const downloadsSpy = vi.spyOn(chrome.downloads, 'download');
    const sendMsgSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    // Attach click listener on tweet to verify stopPropagation
    const tweetClickSpy = vi.fn();
    tweet.addEventListener('click', tweetClickSpy);

    // Click download button
    simulatePointerEvent(downloadBtn, 'click');

    // Verification: Zero network requests made
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(downloadsSpy).not.toHaveBeenCalled();
    expect(sendMsgSpy).not.toHaveBeenCalled();

    // Verification: Event propagation blocked (tweet click handler NOT invoked)
    expect(tweetClickSpy).not.toHaveBeenCalled();

    // Verification: Feedback state transitioned to unconfigured
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
    expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);
    expect(noticeEl.textContent).toContain('Chưa cài đặt Cobalt URL');
  });

  it('Scenario 12: clicking "Mở CDN" does not open tabs or make network calls, displays Phase 3 feedback', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1800000000000000030' },
      { stateStore: env.stateStore, enableCdnResolver: false }
    );
    const host = getToolbarHost(videoWrapper);
    const { cdnBtn, noticeEl } = getToolbarButtons(host);

    const tabsSpy = vi.spyOn(chrome.tabs, 'create');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    simulatePointerEvent(cdnBtn, 'click');

    expect(tabsSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
    expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);
    expect(noticeEl.textContent).toContain('Phase 3');
  });

  it('Scenario 13: clicking "Đóng / Ẩn" dismisses only target video and syncs across VideoStateStore', () => {
    teardownToolbarTestEnv(env);
    env = setupToolbarTestEnv({
      tweetId: '1800000000000000035',
      videoIndices: [1, 2],
    });

    const [video1, video2] = env.videos;
    const controller1 = attachToolbar(video1, { tweetId: '1800000000000000035', mediaIndex: 1 }, { stateStore: env.stateStore });
    const controller2 = attachToolbar(video2, { tweetId: '1800000000000000035', mediaIndex: 2 }, { stateStore: env.stateStore });

    const host1 = controller1.host;
    const { dismissBtn: dismiss1 } = getToolbarButtons(host1);

    // Dismiss Video 1
    simulatePointerEvent(dismiss1, 'click');

    // Video 1 state becomes dismissed immediately
    expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);
    expect(env.stateStore.isDismissed(undefined, video1)).toBe(true);

    // Video 2 is unaffected
    expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(env.stateStore.isDismissed(undefined, video2)).toBe(false);

    // Host 1 plays dismiss animation (~150ms) and is removed from DOM
    vi.advanceTimersByTime(160);
    expect(host1.parentNode).toBeNull();
  });

  it('Scenario 14: unintegrated buttons render accessible tooltips and clear notice banner', () => {
    const { video, videoWrapper } = env;
    attachToolbar(video, { tweetId: '1800000000000000030' }, { stateStore: env.stateStore });
    const host = getToolbarHost(videoWrapper);

    const tooltips = Array.from(host.shadowRoot.querySelectorAll('.xvt-tooltip'));
    expect(tooltips.length).toBe(2);

    const tooltipTexts = tooltips.map((t) => t.textContent.trim());
    expect(tooltipTexts).toContain('Tải');
    expect(tooltipTexts).toContain('Link');
    expect(host.shadowRoot.querySelector('.xvt-btn-dismiss .xvt-tooltip')).toBeNull();

    const noticeEl = host.shadowRoot.querySelector('.xvt-notice');
    expect(noticeEl.getAttribute('aria-live')).toBe('polite');
  });

  it('Scenario 15: rapid repeated clicks do not create duplicate timers or corrupt state', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(video, { tweetId: '1800000000000000030' }, { stateStore: env.stateStore });
    const host = getToolbarHost(videoWrapper);
    const { downloadBtn } = getToolbarButtons(host);

    // Click 10 times rapidly
    for (let i = 0; i < 10; i++) {
      simulatePointerEvent(downloadBtn, 'click');
      vi.advanceTimersByTime(20);
    }

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
    const notices = host.shadowRoot.querySelectorAll('.xvt-notice');
    expect(notices.length).toBe(1);
  });
});
