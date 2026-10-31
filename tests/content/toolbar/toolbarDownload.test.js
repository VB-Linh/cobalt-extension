// tests/content/toolbar/toolbarDownload.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';

describe('Group E: Toolbar Integration Tests (Tests 35–42)', () => {
  let env;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    env = setupToolbarTestEnv();
  });

  afterEach(() => {
    teardownToolbarTestEnv(env);
    vi.useRealTimers();
  });

  it('Test 35: Download button click event handler invocation: shields event propagation and sends COBALT_DOWNLOAD message', () => {
    const { video, videoWrapper, tweet } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1800000000000000001', username: 'twitterdev', permalink: 'https://x.com/twitterdev/status/1800000000000000001' },
      { stateStore: env.stateStore, enableDownload: true }
    );

    const host = getToolbarHost(videoWrapper);
    const { downloadBtn } = getToolbarButtons(host);

    const sendMsgSpy = vi.spyOn(chrome.runtime, 'sendMessage');
    const tweetClickSpy = vi.fn();
    tweet.addEventListener('click', tweetClickSpy);

    simulatePointerEvent(downloadBtn, 'click');

    expect(tweetClickSpy).not.toHaveBeenCalled(); // Event propagation shielded
    expect(sendMsgSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COBALT_DOWNLOAD',
        payload: expect.objectContaining({
          tweetId: '1800000000000000001',
          username: 'twitterdev',
        }),
      }),
      expect.any(Function)
    );
  });

  it('Test 36: State machine transition: Idle -> Processing -> Downloading -> Success', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1800000000000000002' },
      { stateStore: env.stateStore, enableDownload: true }
    );

    const host = getToolbarHost(videoWrapper);
    const { downloadBtn } = getToolbarButtons(host);

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    let capturedCallback;
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      capturedCallback = cb;
    });

    // 1. Click download
    simulatePointerEvent(downloadBtn, 'click');
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

    // 2. Background responds download initiated
    capturedCallback({ success: true, downloadId: 2001 });
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

    // 3. Background signals download completion via runtime message
    chrome.runtime.onMessage.dispatch({
      type: 'DOWNLOAD_STATUS_CHANGED',
      downloadId: 2001,
      state: 'complete',
    });
    expect([TOOLBAR_STATES.COMPLETED, TOOLBAR_STATES.SUCCESS]).toContain(controller.stateManager.getState());
  });

  it('Test 37: State machine transition: Error state & Retry on error response', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1800000000000000003' },
      { stateStore: env.stateStore, enableDownload: true }
    );

    const host = getToolbarHost(videoWrapper);
    const { downloadBtn, noticeEl } = getToolbarButtons(host);

    let capturedCallback;
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      capturedCallback = cb;
    });

    // First attempt
    simulatePointerEvent(downloadBtn, 'click');
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

    // Fail with error
    capturedCallback({
      success: false,
      error: 'RATE_LIMIT',
      message: 'Đã vượt quá giới hạn tải. Vui lòng thử lại sau 15 giây.',
    });

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
    expect(noticeEl.textContent).toContain('quá giới hạn tải');

    // Advance time past debounce to retry
    vi.advanceTimersByTime(300);

    // Click retry
    simulatePointerEvent(downloadBtn, 'click');
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
  });

  it('Test 38: Unconfigured state prompt & Popup guidance: displays notice and transitions to UNCONFIGURED with 0 network calls', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1800000000000000004' },
      { stateStore: env.stateStore, enableDownload: false }
    );

    const host = getToolbarHost(videoWrapper);
    const { downloadBtn, noticeEl } = getToolbarButtons(host);

    const sendMsgSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    simulatePointerEvent(downloadBtn, 'click');

    expect(sendMsgSpy).not.toHaveBeenCalled();
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
    expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);
    expect(noticeEl.textContent).toContain('Chưa cài đặt Cobalt URL');
  });

  it('Test 39: Picker UI display on Cobalt picker response and user selection download flow', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1800000000000000005' },
      { stateStore: env.stateStore, enableDownload: true }
    );

    const host = getToolbarHost(videoWrapper);
    const { downloadBtn } = getToolbarButtons(host);

    const calls = [];
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      calls.push({ msg, cb });
    });

    // Click download
    simulatePointerEvent(downloadBtn, 'click');
    expect(calls.length).toBe(1);

    // Background returns picker with 2 items
    calls[0].cb({
      status: 'picker',
      picker: [
        { type: 'video', url: 'https://video.twimg.com/v1.mp4', thumb: 'https://pbs.twimg.com/t1.jpg' },
        { type: 'video', url: 'https://video.twimg.com/v2.mp4', thumb: 'https://pbs.twimg.com/t2.jpg' },
      ],
    });

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PICKER);

    // Popover is rendered in Shadow DOM
    const popover = host.shadowRoot.querySelector('.xvt-picker-popover');
    expect(popover).not.toBeNull();

    const items = popover.querySelectorAll('.xvt-picker-item');
    expect(items.length).toBe(2);

    // User clicks item 1
    simulatePointerEvent(items[0], 'click');

    // Sends download message with selectedUrl
    expect(calls.length).toBe(2);
    expect(calls[1].msg.payload.selectedUrl).toBe('https://video.twimg.com/v1.mp4');
  });

  it('Test 40: Independent per-video feedback states (Video 1 processing does not mutate Video 2 idle state)', () => {
    const env2 = setupToolbarTestEnv({ tweetId: '1800000000000000099' });

    const controller1 = attachToolbar(
      env.video,
      { tweetId: '1800000000000000001' },
      { stateStore: env.stateStore, enableDownload: true }
    );

    const controller2 = attachToolbar(
      env2.video,
      { tweetId: '1800000000000000099' },
      { stateStore: env2.stateStore, enableDownload: true }
    );

    const host1 = getToolbarHost(env.videoWrapper);
    const host2 = getToolbarHost(env2.videoWrapper);

    const btn1 = getToolbarButtons(host1).downloadBtn;
    const btn2 = getToolbarButtons(host2).downloadBtn;

    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => {});

    // Trigger video 1
    simulatePointerEvent(btn1, 'click');

    expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
    expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    teardownToolbarTestEnv(env2);
  });

  it('Test 41: Anti-spam click prevention & debounce on Download button (5 rapid clicks trigger only 1 request)', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1800000000000000006' },
      { stateStore: env.stateStore, enableDownload: true }
    );

    const host = getToolbarHost(videoWrapper);
    const { downloadBtn } = getToolbarButtons(host);

    const sendMsgSpy = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => {});

    // Click 5 times in 20ms intervals (< 250ms debounce)
    for (let i = 0; i < 5; i++) {
      simulatePointerEvent(downloadBtn, 'click');
      vi.advanceTimersByTime(20);
    }

    expect(sendMsgSpy).toHaveBeenCalledTimes(1);
  });

  it('Test 42: Grace period & hover behavior during active download (inhibits hide during DOWNLOADING state)', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1800000000000000007' },
      { stateStore: env.stateStore, enableDownload: true }
    );

    const host = getToolbarHost(videoWrapper);
    const { downloadBtn } = getToolbarButtons(host);

    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      cb({ success: true, downloadId: 5001 });
    });

    simulatePointerEvent(downloadBtn, 'click');
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

    // Mouse leaves video wrapper
    simulatePointerEvent(videoWrapper, 'mouseleave');
    vi.advanceTimersByTime(500); // Exceeds 300ms grace period

    // State remains DOWNLOADING, toolbar is NOT hidden to IDLE abruptly
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);
  });
});
