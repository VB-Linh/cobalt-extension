// tests/challengerPhase5Stress.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachToolbar } from '../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../src/content/toolbar/toolbarState.js';
import { NOTICE_DURATION_MS, GRACE_PERIOD_MS, CLICK_DEBOUNCE_MS } from '../src/content/toolbar/toolbarEvents.js';
import {
  initiateDownload,
  startDownload,
  trackDownload,
  resetDownloadManager,
  DOWNLOAD_STATES,
} from '../src/background/downloads/downloadManager.js';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getToolbarButtons,
  simulatePointerEvent,
} from './fixtures/toolbarFixture.js';
import { clearSettings } from '../src/shared/utils/storage.js';

describe('Empirical Challenger: Phase 5 Stress, Concurrency & Resilience Suite', () => {
  let envA;
  let envB;

  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearSettings();
    resetDownloadManager();
  });

  afterEach(async () => {
    if (envA) teardownToolbarTestEnv(envA);
    if (envB) teardownToolbarTestEnv(envB);
    vi.useRealTimers();
    vi.restoreAllMocks();
    await clearSettings();
    resetDownloadManager();
  });

  // =========================================================================
  // 1. Concurrency: Rapid Multiple Clicks on Download Button
  // =========================================================================
  describe('1. Concurrency: Rapid Multiple Clicks on Download Button', () => {
    it('1.1 Burst click storm (50 rapid clicks in 250ms) triggers exactly 1 download request', () => {
      vi.useFakeTimers();
      envA = setupToolbarTestEnv({ tweetId: '8001' });
      const { video, videoWrapper } = envA;

      const controller = attachToolbar(
        video,
        { tweetId: '8001', username: 'adversary' },
        { stateStore: envA.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      let sendCount = 0;
      const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        sendCount++;
      });

      // 50 rapid clicks spaced by 5ms
      for (let i = 0; i < 50; i++) {
        simulatePointerEvent(downloadBtn, 'click');
        vi.advanceTimersByTime(5);
      }

      // Assert only 1 request was sent to background
      expect(sendCount).toBe(1);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
      expect(controller.stateManager.isDismissed()).toBe(false);

      vi.useRealTimers();
    });

    it('1.2 In-flight download lock in downloadManager blocks concurrent initiateDownload for same videoKey', async () => {
      let downloadIdCounter = 9000;
      vi.spyOn(chrome.downloads, 'download').mockImplementation(async () => ++downloadIdCounter);

      const videoKey = 'tweet_8002_media_0';

      // First initiateDownload starts
      const firstPromise = initiateDownload(videoKey, {
        url: 'https://video.twimg.com/vid_8002.mp4',
        tweetId: '8002',
        username: 'adversary',
      });

      // Second initiateDownload called while first is in-flight
      const secondResult = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/vid_8002.mp4',
        tweetId: '8002',
        username: 'adversary',
      });

      const firstResult = await firstPromise;

      expect(firstResult.success).toBe(true);
      expect(firstResult.downloadId).toBe(9001);

      // Second was blocked cleanly by in-flight lock
      expect(secondResult.success).toBe(false);
      expect(secondResult.blocked).toBe(true);
      expect(secondResult.reason).toBe('DOWNLOAD_IN_PROGRESS');
      expect(secondResult.message).toContain('đang trong quá trình tải');
    });

    it('1.3 Post-completion unlocks: After download completes and notice expires, new download can be initiated', () => {
      vi.useFakeTimers();
      envA = setupToolbarTestEnv({ tweetId: '8003' });
      const { video, videoWrapper } = envA;

      const controller = attachToolbar(
        video,
        { tweetId: '8003', username: 'adversary' },
        { stateStore: envA.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      let sendCount = 0;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        sendCount++;
        cb({ success: true, downloadId: 9005 + sendCount });
      });

      // First download
      simulatePointerEvent(downloadBtn, 'click');
      expect(sendCount).toBe(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Download completes
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 9006,
        state: 'complete',
      });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);

      // Advance past notice duration + debounce window
      vi.advanceTimersByTime(NOTICE_DURATION_MS + 300);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Second download attempt
      simulatePointerEvent(downloadBtn, 'click');
      expect(sendCount).toBe(2);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // 2. Download Clicks During Active / Terminal States
  // =========================================================================
  describe('2. Clicking Download during SUCCESS / COMPLETED / PROCESSING / DOWNLOADING states', () => {
    it('2.1 Zero invalid state transition warnings or errors during PROCESSING state clicks', () => {
      vi.useFakeTimers();
      const warnSpy = vi.spyOn(console, 'warn');
      const errSpy = vi.spyOn(console, 'error');

      envA = setupToolbarTestEnv({ tweetId: '8010' });
      const { video, videoWrapper } = envA;

      const controller = attachToolbar(
        video,
        { tweetId: '8010' },
        { stateStore: envA.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => {});

      // Enter PROCESSING
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Spam clicks while in PROCESSING
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(50);
        simulatePointerEvent(downloadBtn, 'click');
      }

      // Assert no invalid state warnings were issued
      const invalidTransitionWarnings = warnSpy.mock.calls.filter(c =>
        c[0]?.includes?.('Invalid toolbar state transition')
      );
      expect(invalidTransitionWarnings).toHaveLength(0);
      expect(errSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('2.2 Zero invalid state transition warnings or errors during DOWNLOADING state clicks', () => {
      vi.useFakeTimers();
      const warnSpy = vi.spyOn(console, 'warn');
      const errSpy = vi.spyOn(console, 'error');

      envA = setupToolbarTestEnv({ tweetId: '8011' });
      const { video, videoWrapper } = envA;

      const controller = attachToolbar(
        video,
        { tweetId: '8011' },
        { stateStore: envA.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 8011 });
      });

      // Enter DOWNLOADING
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Click during DOWNLOADING
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(50);
        simulatePointerEvent(downloadBtn, 'click');
      }

      const invalidTransitionWarnings = warnSpy.mock.calls.filter(c =>
        c[0]?.includes?.('Invalid toolbar state transition')
      );
      expect(invalidTransitionWarnings).toHaveLength(0);
      expect(errSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('2.3 Zero invalid state transition warnings or errors during SUCCESS & COMPLETED state clicks', () => {
      vi.useFakeTimers();
      const warnSpy = vi.spyOn(console, 'warn');
      const errSpy = vi.spyOn(console, 'error');

      envA = setupToolbarTestEnv({ tweetId: '8012' });
      const { video, videoWrapper } = envA;

      const controller = attachToolbar(
        video,
        { tweetId: '8012' },
        { stateStore: envA.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 8012 });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Sync complete -> COMPLETED
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 8012,
        state: 'complete',
      });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);

      // Clicks during COMPLETED
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(50);
        simulatePointerEvent(downloadBtn, 'click');
      }

      // Revert to IDLE and test SUCCESS state via CDN resolution
      vi.advanceTimersByTime(NOTICE_DURATION_MS + 100);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Transition to SUCCESS from PROCESSING
      controller.stateManager.setState(TOOLBAR_STATES.PROCESSING);
      controller.stateManager.setState(TOOLBAR_STATES.SUCCESS);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);

      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(50);
        simulatePointerEvent(downloadBtn, 'click');
      }

      const invalidTransitionWarnings = warnSpy.mock.calls.filter(c =>
        c[0]?.includes?.('Invalid toolbar state transition')
      );
      expect(invalidTransitionWarnings).toHaveLength(0);
      expect(errSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // 3. Open CDN Independence
  // =========================================================================
  describe('3. Open CDN Independence', () => {
    it('3.1 Open CDN works when Cobalt is completely unconfigured', async () => {
      vi.useFakeTimers();
      envA = setupToolbarTestEnv({ tweetId: '8020' });
      const { video, videoWrapper } = envA;

      const cdnSpy = vi.fn(async () => ({ success: true }));
      const controller = attachToolbar(
        video,
        { tweetId: '8020' },
        {
          stateStore: envA.stateStore,
          enableDownload: false, // Cobalt unconfigured
          enableCdnResolver: true,
          cdnResolver: cdnSpy,
        }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, cdnBtn, noticeEl } = getToolbarButtons(host);

      // User first clicks Download -> gets UNCONFIGURED notice
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
      expect(noticeEl.textContent).toContain('Chưa cài đặt Cobalt URL');

      // Advance past click debounce (250ms)
      vi.advanceTimersByTime(CLICK_DEBOUNCE_MS + 10);

      // User clicks Open CDN -> completely unblocked
      simulatePointerEvent(cdnBtn, 'click');
      await Promise.resolve();

      expect(cdnSpy).toHaveBeenCalledTimes(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
      expect(noticeEl.textContent).toContain('Đã mở tab CDN');

      vi.useRealTimers();
    });

    it('3.2 Open CDN works when Cobalt returns an error', async () => {
      vi.useFakeTimers();
      envA = setupToolbarTestEnv({ tweetId: '8021' });
      const { video, videoWrapper } = envA;

      const cdnSpy = vi.fn(async () => ({ success: true }));
      const controller = attachToolbar(
        video,
        { tweetId: '8021' },
        {
          stateStore: envA.stateStore,
          enableDownload: true,
          enableCdnResolver: true,
          cdnResolver: cdnSpy,
        }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, cdnBtn, noticeEl } = getToolbarButtons(host);

      // Cobalt returns error
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: false, error: 'UNREACHABLE', message: 'Không thể kết nối máy chủ Cobalt' });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
      expect(noticeEl.textContent).toContain('Không thể kết nối máy chủ Cobalt');

      // Advance past click debounce (250ms)
      vi.advanceTimersByTime(CLICK_DEBOUNCE_MS + 10);

      // Open CDN is clicked while in ERROR
      simulatePointerEvent(cdnBtn, 'click');
      await Promise.resolve();

      expect(cdnSpy).toHaveBeenCalledTimes(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // 4. Dismiss Isolation
  // =========================================================================
  describe('4. Dismiss Isolation', () => {
    it('4.1 Dismissing toolbar on Video A has zero effect on Video B', () => {
      vi.useFakeTimers();
      envA = setupToolbarTestEnv({ tweetId: '8031' });
      envB = setupToolbarTestEnv({ tweetId: '8032' });

      const controllerA = attachToolbar(
        envA.video,
        { tweetId: '8031', username: 'user_a' },
        { stateStore: envA.stateStore, enableDownload: true }
      );

      const controllerB = attachToolbar(
        envB.video,
        { tweetId: '8032', username: 'user_b' },
        { stateStore: envA.stateStore, enableDownload: true }
      );

      const hostA = getToolbarHost(envA.videoWrapper);
      const hostB = getToolbarHost(envB.videoWrapper);

      const { dismissBtn: dismissA } = getToolbarButtons(hostA);
      const { downloadBtn: downloadB } = getToolbarButtons(hostB);

      // Hover both
      controllerA.show();
      controllerB.show();
      expect(controllerA.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
      expect(controllerB.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Dismiss Video A
      simulatePointerEvent(dismissA, 'click');
      expect(controllerA.stateManager.isDismissed()).toBe(true);
      expect(controllerA.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);

      // Video B must remain completely intact and active
      expect(controllerB.stateManager.isDismissed()).toBe(false);
      expect(controllerB.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Advance time for Video A's 150ms dismiss animation
      vi.advanceTimersByTime(200);

      // Video A host detached
      expect(getToolbarHost(envA.videoWrapper)).toBeNull();

      // Video B host still attached
      expect(getToolbarHost(envB.videoWrapper)).not.toBeNull();

      // Video B still accepts actions
      const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 8888 });
      });

      simulatePointerEvent(downloadB, 'click');
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(controllerB.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // 5. Notice Banner Resilience
  // =========================================================================
  describe('5. Notice Banner Resilience', () => {
    it('5.1 Notice banner displays for full 2500ms duration even when mouse leaves video and toolbar enters IDLE', () => {
      vi.useFakeTimers();
      envA = setupToolbarTestEnv({ tweetId: '8040' });
      const { video, videoWrapper } = envA;

      const controller = attachToolbar(
        video,
        { tweetId: '8040' },
        { stateStore: envA.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);
      const container = host.shadowRoot.querySelector('.xvt-toolbar-container');

      // Trigger notice via error response
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: false, error: 'TIMEOUT', message: 'Hết thời gian chờ phản hồi.' });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);
      expect(container.classList.contains('xvt-has-notice')).toBe(true);
      expect(noticeEl.textContent).toContain('Hết thời gian chờ');

      // Mouse leaves video wrapper after 100ms
      vi.advanceTimersByTime(100);
      simulatePointerEvent(videoWrapper, 'mouseleave', { relatedTarget: document.body });

      // Advance past 300ms grace period -> toolbar transitions to IDLE
      vi.advanceTimersByTime(GRACE_PERIOD_MS + 20);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Notice banner must NOT be truncated; it must still be visible!
      expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);
      expect(container.classList.contains('xvt-has-notice')).toBe(true);

      // Advance to 2000ms elapsed -> still visible
      vi.advanceTimersByTime(1580);
      expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);
      expect(container.classList.contains('xvt-has-notice')).toBe(true);

      // Advance past full 2500ms duration -> notice finally hides
      vi.advanceTimersByTime(850);
      expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(false);
      expect(container.classList.contains('xvt-has-notice')).toBe(false);

      vi.useRealTimers();
    });
  });
});
