// tests/phase5UxAndErrorHandling.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachToolbar } from '../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../src/content/toolbar/toolbarState.js';
import { NOTICE_DURATION_MS, GRACE_PERIOD_MS } from '../src/content/toolbar/toolbarEvents.js';
import {
  classifyCobaltError,
  classifyNetworkError,
  handleCobaltResponse,
} from '../src/background/handlers/cobaltResponseHandler.js';
import { checkServerHealth, requestCobalt } from '../src/background/clients/cobaltClient.js';
import {
  initiateDownload,
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
import { setStatusBadge, testConnection } from '../src/popup/popup.js';
import { getSettings, saveSettings, clearSettings } from '../src/shared/utils/storage.js';

describe('Phase 5: UX Polish & Error Handling Suite (T-01 to T-05)', () => {
  let env;

  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearSettings();
    resetDownloadManager();
  });

  afterEach(async () => {
    if (env) teardownToolbarTestEnv(env);
    vi.useRealTimers();
    await clearSettings();
    resetDownloadManager();
  });

  // =========================================================================
  // T-01: Toolbar State Standardization & Concurrency Guards
  // =========================================================================
  describe('T-01: Toolbar State Standardization', () => {
    it('1.1 Concurrency guard: Blocks clicks during SUCCESS state and prevents invalid transition', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '5001' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '5001', username: 'tester' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      let sendCallCount = 0;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        sendCallCount++;
        cb({ success: true, downloadId: 501 });
      });

      // 1. Initial click -> PROCESSING -> DOWNLOADING
      simulatePointerEvent(downloadBtn, 'click');
      expect(sendCallCount).toBe(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // 2. Lifecycle sync completes download -> COMPLETED / SUCCESS
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 501,
        state: 'complete',
      });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);

      // 3. User clicks while in COMPLETED state
      simulatePointerEvent(downloadBtn, 'click');
      // Concurrency guard blocks the click at toolbar UI level
      expect(sendCallCount).toBe(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);

      vi.useRealTimers();
    });

    it('1.2 Stuck ERROR state recovery: Automatically restores to IDLE or HOVERED after NOTICE_DURATION_MS on !res', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '5002' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '5002', username: 'tester' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      // Background responds with null (e.g. extension worker crash/disconnect)
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb(null);
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
      expect(noticeEl.textContent).toContain('Không nhận được phản hồi');

      // Advance past NOTICE_DURATION_MS (2500ms)
      vi.advanceTimersByTime(NOTICE_DURATION_MS + 50);

      // State is recovered, not permanently stuck in ERROR
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      vi.useRealTimers();
    });

    it('1.3 Stuck ERROR state recovery: Automatically restores after exception in sendMessage', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '5003' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '5003', username: 'tester' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => {
        throw new Error('Extension context invalidated');
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);

      vi.advanceTimersByTime(NOTICE_DURATION_MS + 50);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      vi.useRealTimers();
    });

    it('1.4 Notice persistence: Mouse leaving video does NOT prematurely hide active notice banner', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '5004' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '5004' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      // Trigger error response
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: false, error: 'RATE_LIMIT', message: 'Vui lòng thử lại sau.' });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);

      // Mouse leaves video wrapper -> triggers grace period (300ms) -> transitions to IDLE
      simulatePointerEvent(videoWrapper, 'mouseleave', { relatedTarget: document.body });
      vi.advanceTimersByTime(GRACE_PERIOD_MS + 50);

      // Toolbar is IDLE, but notice banner REMAINS VISIBLE for its full duration!
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);

      // Only hides once full notice duration expires
      vi.advanceTimersByTime(NOTICE_DURATION_MS);
      expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(false);

      vi.useRealTimers();
    });

    it('1.5 Dismiss button DOM compliance: Contains NO .xvt-tooltip element', () => {
      env = setupToolbarTestEnv({ tweetId: '5005' });
      const { video, videoWrapper } = env;

      attachToolbar(
        video,
        { tweetId: '5005' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { dismissBtn } = getToolbarButtons(host);

      expect(dismissBtn.querySelector('.xvt-tooltip')).toBeNull();
      expect(dismissBtn.getAttribute('aria-label')).toBe('Ẩn trên video này');
    });
  });

  // =========================================================================
  // T-02: System-Wide Error Handling & Localhost Guidance
  // =========================================================================
  describe('T-02: System-Wide Error Handling', () => {
    it('2.1 Localhost UNREACHABLE error: Guides user to run scripts\\start-cobalt-windows.bat', () => {
      const errLocal1 = classifyCobaltError({ error: 'UNREACHABLE' }, 'http://localhost:9000');
      expect(errLocal1.code).toBe('UNREACHABLE');
      expect(errLocal1.message).toContain('localhost:9000');
      expect(errLocal1.message).toContain('scripts\\start-cobalt-windows.bat');

      const errLocal2 = classifyCobaltError({ error: 'UNREACHABLE' }, 'http://127.0.0.1:9000');
      expect(errLocal2.message).toContain('scripts\\start-cobalt-windows.bat');
    });

    it('2.2 Remote UNREACHABLE error: Returns clear network/URL guidance', () => {
      const errRemote = classifyCobaltError({ error: 'UNREACHABLE' }, 'https://api.cobalt.tools');
      expect(errRemote.code).toBe('UNREACHABLE');
      expect(errRemote.message).toContain('Không thể kết nối đến máy chủ Cobalt');
      expect(errRemote.message).toContain('kiểm tra lại URL hoặc mạng');
      expect(errRemote.message).not.toContain('start-cobalt-windows.bat');
    });

    it('2.3 classifyNetworkError differentiates between localhost and remote instance', () => {
      const netErr = new TypeError('fetch failed');
      const localResult = classifyNetworkError(netErr, 'http://localhost:9000');
      expect(localResult.message).toContain('start-cobalt-windows.bat');

      const remoteResult = classifyNetworkError(netErr, 'https://cobalt.remote.org');
      expect(remoteResult.message).toContain('kiểm tra lại URL hoặc mạng');
    });

    it('2.4 Technical logging: Structured console.error without exposing sensitive tokens', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate download interruption
      const trackPromise = trackDownload(999, {
        videoKey: 'vid_logging_test',
      });

      chrome.downloads.onChanged.dispatch({
        id: 999,
        state: { current: 'interrupted' },
        error: { current: 'SERVER_BAD_CONTENT' },
      });

      await expect(trackPromise).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[X Video Tools] Download interrupted:',
        expect.objectContaining({
          downloadId: 999,
          videoKey: 'vid_logging_test',
          error: 'SERVER_BAD_CONTENT',
        })
      );
    });
  });

  // =========================================================================
  // T-03: Settings Popup Polish & Non-Destructive Health Check
  // =========================================================================
  describe('T-03: Settings Popup Polish', () => {
    it('3.1 Distinguishes saved configuration (status-saved) from connected (status-connected)', () => {
      // Setup minimal DOM for popup
      document.body.innerHTML = `
        <div id="statusIndicator" class="status-indicator"></div>
        <span id="statusText"></span>
      `;

      setStatusBadge('Đã lưu cấu hình', 'saved');
      const indicator = document.getElementById('statusIndicator');
      const text = document.getElementById('statusText');

      expect(indicator.classList.contains('status-saved')).toBe(true);
      expect(indicator.classList.contains('status-connected')).toBe(false);
      expect(text.textContent).toBe('Đã lưu cấu hình');

      setStatusBadge('Đang hoạt động (v11.7.1)', 'connected');
      expect(indicator.classList.contains('status-connected')).toBe(true);
      expect(text.textContent).toContain('Đang hoạt động');
    });

    it('3.2 Failed testConnection never clears or mutates saved chrome.storage.local', async () => {
      // 1. Pre-populate valid configuration in storage
      await saveSettings({
        cobaltUrl: 'http://localhost:9000',
        apiKey: 'valid-secret-key',
        videoQuality: '1080',
      });

      // 2. Mock fetch failure for unreachable server
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));

      // 3. Run testConnection
      const testRes = await testConnection('http://localhost:9000', 'valid-secret-key');
      expect(testRes.healthy).toBe(false);
      expect(testRes.error).toBe('UNREACHABLE');

      // 4. Verify chrome.storage.local remains completely intact
      const saved = await getSettings();
      expect(saved.cobaltUrl).toBe('http://localhost:9000');
      expect(saved.apiKey).toBe('valid-secret-key');
      expect(saved.videoQuality).toBe('1080');
    });

    it('3.3 Localhost health check failure provides batch script guidance', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const res = await checkServerHealth('http://localhost:9000');
      expect(res.healthy).toBe(false);
      expect(res.message).toContain('Cobalt local chưa khởi động');
      expect(res.message).toContain('scripts\\start-cobalt-windows.bat');
    });
  });

  // =========================================================================
  // T-04: Download Lifecycle Management & Sync
  // =========================================================================
  describe('T-04: Download Lifecycle Management & Sync', () => {
    it('4.1 Download completed event: Broadcasts message and updates toolbar to COMPLETED', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '5006' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '5006', username: 'tester' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 6001 });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Broadcast download complete
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 6001,
        state: 'complete',
      });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);
      expect(noticeEl.textContent).toContain('Đã tải xong video');

      // Auto reverts to IDLE after 2500ms
      vi.advanceTimersByTime(NOTICE_DURATION_MS + 50);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      vi.useRealTimers();
    });

    it('4.2 Download cancelled event: Updates toolbar to CANCELLED and resets notice', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '5007' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '5007' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 6002 });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Broadcast cancelled
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 6002,
        state: 'cancelled',
      });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.CANCELLED);
      expect(noticeEl.textContent).toContain('Đã hủy tải xuống');

      vi.advanceTimersByTime(NOTICE_DURATION_MS + 50);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      vi.useRealTimers();
    });

    it('4.3 Download interrupted event: Updates toolbar to INTERRUPTED with error notice', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '5008' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '5008' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 6003 });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Broadcast network interruption
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 6003,
        state: 'interrupted',
        error: 'NETWORK_FAILED',
        message: 'Tải xuống bị gián đoạn do lỗi kết nối mạng.',
      });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.INTERRUPTED);
      expect(noticeEl.textContent).toContain('gián đoạn');

      vi.advanceTimersByTime(NOTICE_DURATION_MS + 50);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // T-05: Resilience & Multi-Video Independence
  // =========================================================================
  describe('T-05: Resilience & Multi-Video Independence', () => {
    it('5.1 Unconfigured prompt reverts to IDLE without locking Open CDN', async () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '5009' });
      const { video, videoWrapper } = env;

      const tabsSpy = vi.fn();
      const controller = attachToolbar(
        video,
        { tweetId: '5009' },
        {
          stateStore: env.stateStore,
          enableDownload: false,
          enableCdnResolver: true,
          cdnResolver: vi.fn(async () => {
            tabsSpy();
            return { success: true };
          }),
        }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, cdnBtn, noticeEl } = getToolbarButtons(host);

      // Click download when unconfigured
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
      expect(noticeEl.textContent).toContain('Chưa cài đặt Cobalt URL');

      // Reverts after notice duration
      vi.advanceTimersByTime(NOTICE_DURATION_MS + 50);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Open CDN button still works 100% independently
      simulatePointerEvent(cdnBtn, 'click');
      await Promise.resolve();

      expect(tabsSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('5.2 Two concurrent video downloads maintain independent lifecycle states', () => {
      const tabsSpy = vi.spyOn(chrome.tabs, 'sendMessage');

      // Setup 2 distinct download tasks
      const track1 = trackDownload(7001, { videoKey: 'vid_A', tabId: 101 }).catch(() => {});
      const track2 = trackDownload(7002, { videoKey: 'vid_B', tabId: 102 });

      // Task 1 fails
      chrome.downloads.onChanged.dispatch({
        id: 7001,
        state: { current: 'interrupted' },
        error: { current: 'NETWORK_FAILED' },
      });

      expect(tabsSpy).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          type: 'DOWNLOAD_STATUS_CHANGED',
          downloadId: 7001,
          videoKey: 'vid_A',
          state: 'interrupted',
        }),
        expect.any(Function)
      );

      // Task 2 succeeds independently
      chrome.downloads.onChanged.dispatch({
        id: 7002,
        state: { current: 'complete' },
      });

      expect(tabsSpy).toHaveBeenCalledWith(
        102,
        expect.objectContaining({
          type: 'DOWNLOAD_STATUS_CHANGED',
          downloadId: 7002,
          videoKey: 'vid_B',
          state: 'complete',
        }),
        expect.any(Function)
      );
    });
  });
});
