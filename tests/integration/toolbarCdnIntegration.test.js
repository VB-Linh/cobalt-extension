// tests/integration/toolbarCdnIntegration.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createToolbar } from '../../src/content/toolbar/toolbar.js';
import { TOOLBAR_STATES } from '../../src/content/toolbar/toolbarState.js';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarButtons,
  simulatePointerEvent,
} from '../fixtures/toolbarFixture.js';

describe('Group F: Toolbar Integration & Concurrency Guard (Tests 32–36)', () => {
  let env;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (env) {
      teardownToolbarTestEnv(env);
    }
  });

  it('Test 32: Clicking "Mở CDN" successfully transitions through processing -> success and opens tab', async () => {
    env = setupToolbarTestEnv({ tweetId: '1890000000000000032' });
    const { video } = env;

    const cdnUrl = 'https://video.twimg.com/amplify_video/1890000000000000032/vid/avc1/1920x1080/vid.mp4?tag=14';
    video.src = cdnUrl;

    const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 99 });
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
      if (msg.action === 'OPEN_CDN') {
        tabsSpy({ url: msg.payload?.url || msg.url });
        if (typeof callback === 'function') callback({ success: true, tabId: 99 });
        return Promise.resolve({ success: true, tabId: 99 });
      }
      return Promise.resolve({ success: true });
    });

    const controller = createToolbar(
      video,
      { tweetId: '1890000000000000032' },
      { stateStore: env.stateStore }
    );
    const { cdnBtn } = getToolbarButtons(controller.host);

    // Initial state is idle
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    // Click CDN button
    simulatePointerEvent(cdnBtn, 'click');

    // State transitions to processing immediately
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

    // Allow async resolver promise to resolve
    await new Promise((r) => setTimeout(r, 20));

    // Reaches success state and opened tab
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    expect(tabsSpy).toHaveBeenCalledWith(expect.objectContaining({ url: cdnUrl }));
  });

  it('Test 33: Rapid burst clicks within 250ms debounce window generate exactly 1 request and 1 tab', async () => {
    env = setupToolbarTestEnv({ tweetId: '1890000000000000033' });
    const { video } = env;

    const cdnUrl = 'https://video.twimg.com/tweet_video/1890000000000000033.mp4';
    video.src = cdnUrl;

    const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 100 });
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
      if (msg.action === 'OPEN_CDN') {
        tabsSpy({ url: msg.payload?.url || msg.url });
        if (typeof callback === 'function') callback({ success: true, tabId: 100 });
        return Promise.resolve({ success: true, tabId: 100 });
      }
      return Promise.resolve({ success: true });
    });

    const controller = createToolbar(
      video,
      { tweetId: '1890000000000000033' },
      { stateStore: env.stateStore }
    );
    const { cdnBtn } = getToolbarButtons(controller.host);

    // Fire 10 rapid clicks in the same event tick
    for (let i = 0; i < 10; i++) {
      simulatePointerEvent(cdnBtn, 'click');
    }

    await new Promise((r) => setTimeout(r, 20));

    // Exactly one tab opened
    expect(tabsSpy).toHaveBeenCalledTimes(1);
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
  });

  it('Test 34: Two video players on page operate completely independently', async () => {
    env = setupToolbarTestEnv({
      tweetId: '1890000000000000034',
      videoIndices: [1, 2],
    });
    const [video1, video2] = env.videos;

    video1.src = 'https://video.twimg.com/amplify_video/18900000000000000341/vid/avc1/720x1280/vid1.mp4?tag=14';
    video2.src = 'https://video.twimg.com/amplify_video/18900000000000000342/vid/avc1/720x1280/vid2.mp4?tag=14';

    const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 101 });
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
      if (msg.action === 'OPEN_CDN') {
        tabsSpy({ url: msg.payload?.url || msg.url });
        if (typeof callback === 'function') callback({ success: true, tabId: 101 });
        return Promise.resolve({ success: true, tabId: 101 });
      }
      return Promise.resolve({ success: true });
    });

    const controller1 = createToolbar(
      video1,
      { tweetId: '1890000000000000034', mediaIndex: 1 },
      { stateStore: env.stateStore }
    );
    const controller2 = createToolbar(
      video2,
      { tweetId: '1890000000000000034', mediaIndex: 2 },
      { stateStore: env.stateStore }
    );

    const { cdnBtn: cdnBtn1 } = getToolbarButtons(controller1.host);

    // Click CDN on Video 1 only
    simulatePointerEvent(cdnBtn1, 'click');

    expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
    // Video 2 must remain in IDLE state unaffected
    expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    await new Promise((r) => setTimeout(r, 20));

    expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(tabsSpy).toHaveBeenCalledTimes(1);
    expect(tabsSpy).toHaveBeenCalledWith(expect.objectContaining({ url: video1.src }));
  });

  it('Test 35: Error on Video 1 does not affect Video 2 toolbar functionality', async () => {
    env = setupToolbarTestEnv({
      tweetId: '1890000000000000035',
      videoIndices: [1, 2],
    });
    const [video1, video2] = env.videos;

    // Video 1 will simulate an API error
    video1.src = 'blob:https://x.com/blob-vid1';
    // Video 2 has a valid direct MP4
    video2.src = 'https://video.twimg.com/amplify_video/18900000000000000352/vid/avc1/1280x720/vid2.mp4?tag=14';

    const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 102 });

    // Mock API failing on video 1 with Rate Limit, but succeeding opening tab for video 2
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
      if (msg.action === 'FETCH_SYNDICATION') {
        const errResp = { success: false, error: 'API_RATE_LIMIT' };
        if (typeof callback === 'function') callback(errResp);
        return Promise.resolve(errResp);
      } else if (msg.action === 'OPEN_CDN') {
        tabsSpy({ url: msg.payload?.url || msg.url });
        const okResp = { success: true, tabId: 102 };
        if (typeof callback === 'function') callback(okResp);
        return Promise.resolve(okResp);
      }
      return Promise.resolve({ success: true });
    });

    const controller1 = createToolbar(
      video1,
      { tweetId: '1890000000000000035', mediaIndex: 1 },
      { stateStore: env.stateStore }
    );
    const controller2 = createToolbar(
      video2,
      { tweetId: '1890000000000000035', mediaIndex: 2 },
      { stateStore: env.stateStore }
    );

    const { cdnBtn: cdnBtn1, noticeEl: notice1 } = getToolbarButtons(controller1.host);
    const { cdnBtn: cdnBtn2 } = getToolbarButtons(controller2.host);

    // 1. Click CDN on Video 1 -> Fails with Rate Limit notice
    simulatePointerEvent(cdnBtn1, 'click');
    await new Promise((r) => setTimeout(r, 20));

    expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
    expect(notice1.textContent).toContain('Rate limit');
    expect(tabsSpy).not.toHaveBeenCalled();

    // 2. Video 2 is unaffected and succeeds
    expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    simulatePointerEvent(cdnBtn2, 'click');
    await new Promise((r) => setTimeout(r, 20));

    expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    expect(tabsSpy).toHaveBeenCalledTimes(1);
    expect(tabsSpy).toHaveBeenCalledWith(expect.objectContaining({ url: video2.src }));
  });

  it('Test 36: Tab opening is strictly blocked if URL validation fails, transitioning toolbar to error state', async () => {
    env = setupToolbarTestEnv({ tweetId: '1890000000000000036' });
    const { video } = env;

    // Spoofed malicious URL
    video.src = 'https://video.twimg.com.attacker.com/malicious.mp4';

    const tabsSpy = vi.spyOn(chrome.tabs, 'create');
    const controller = createToolbar(
      video,
      { tweetId: '1890000000000000036' },
      { stateStore: env.stateStore }
    );
    const { cdnBtn, noticeEl } = getToolbarButtons(controller.host);

    simulatePointerEvent(cdnBtn, 'click');
    await new Promise((r) => setTimeout(r, 20));

    // chrome.tabs.create must NEVER be called
    expect(tabsSpy).not.toHaveBeenCalled();

    // Toolbar transitions to error state
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
    expect(noticeEl.textContent).toContain('không hợp lệ');
  });
});
