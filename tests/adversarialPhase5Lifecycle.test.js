// tests/adversarialPhase5Lifecycle.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachToolbar } from '../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../src/content/toolbar/toolbarState.js';
import { NOTICE_DURATION_MS, GRACE_PERIOD_MS } from '../src/content/toolbar/toolbarEvents.js';
import {
  classifyCobaltError,
  classifyNetworkError,
} from '../src/background/handlers/cobaltResponseHandler.js';
import { checkServerHealth } from '../src/background/clients/cobaltClient.js';
import {
  initiateDownload,
  trackDownload,
  startDownload,
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
import { setStatusBadge, testConnection, handleSaveInstance } from '../src/popup/popup.js';
import { getSettings, saveSettings, clearSettings } from '../src/shared/utils/storage.js';

describe('Empirical Challenger: Phase 5 Lifecycle, Error Handling & Popup Stress Suite', () => {
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
  // 1. Real Download Lifecycle Synchronization Stress
  // =========================================================================
  describe('1. Real Download Lifecycle Synchronization', () => {
    it('1.1 Emulates chrome.downloads.onChanged with state "complete": transitions to COMPLETED, shows notice, and auto-reverts to IDLE or HOVERED after 2500ms', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '8001' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '8001', username: 'twitter_user' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 8001 });
      });

      // 1. Click download button
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);
      expect(noticeEl.textContent).toContain('Đang tải video...');

      // 2. Emulate Chrome Downloads API completion
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 8001,
        videoKey: '8001_0',
        state: 'complete',
      });

      // State is COMPLETED and notice displays "Đã tải xong video"
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);
      expect(noticeEl.textContent).toContain('Đã tải xong video');

      // 3. Before 2500ms: still in COMPLETED
      vi.advanceTimersByTime(2000);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);

      // 4. Past 2500ms: auto-reverts to IDLE (when not hovered)
      vi.advanceTimersByTime(550);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    });

    it('1.2 Emulates complete state while user is actively hovering video: auto-reverts to HOVERED after 2500ms', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '8002' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '8002', username: 'hover_user' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 8002 });
      });

      // User hovers video wrapper
      simulatePointerEvent(videoWrapper, 'mouseenter');
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Complete download while mouse is still hovering
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 8002,
        state: 'complete',
      });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);

      // Advance 2500ms
      vi.advanceTimersByTime(NOTICE_DURATION_MS + 50);

      // Must revert to HOVERED because mouse is still on video
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    });

    it('1.3 Emulates state "interrupted": transitions to INTERRUPTED, displays "Tải xuống bị gián đoạn", and auto-reverts without getting stuck', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '8003' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '8003' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 8003 });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Emulate download interruption (e.g. network failure)
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 8003,
        state: 'interrupted',
        error: 'NETWORK_FAILED',
        message: 'Tải xuống bị gián đoạn do lỗi kết nối mạng.',
      });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.INTERRUPTED);
      expect(noticeEl.textContent).toContain('Tải xuống bị gián đoạn');

      // Advance past NOTICE_DURATION_MS (2500ms)
      vi.advanceTimersByTime(NOTICE_DURATION_MS + 50);

      // Must not be stuck in INTERRUPTED
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    });

    it('1.4 Emulates state "cancelled" (USER_CANCELED): transitions to CANCELLED, displays "Đã hủy tải xuống", and auto-reverts after 2500ms', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '8004' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '8004' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 8004 });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Emulate user cancelling download from Chrome downloads shelf
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 8004,
        state: 'cancelled',
      });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.CANCELLED);
      expect(noticeEl.textContent).toContain('Đã hủy tải xuống');

      // Advance past 2500ms
      vi.advanceTimersByTime(NOTICE_DURATION_MS + 50);

      // Automatically restored to IDLE
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    });

    it('1.5 End-to-End Download Manager broadcast: onChanged delta with USER_CANCELED correctly notifies tab and triggers toolbar CANCELLED state', async () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '8005' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '8005' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      // Track download in downloadManager with tabId = 99
      const trackPromise = trackDownload(8005, {
        videoKey: '8005_0',
        tabId: 99,
        filename: 'X_video_8005.mp4',
      });

      // When chrome.tabs.sendMessage is called by downloadManager, dispatch it directly to chrome.runtime.onMessage to simulate tab reception
      vi.spyOn(chrome.tabs, 'sendMessage').mockImplementation((tabId, msg, cb) => {
        chrome.runtime.onMessage.dispatch(msg);
        if (cb) cb();
      });

      // Set download button to DOWNLOADING with downloadId 8005
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 8005 });
      });
      simulatePointerEvent(downloadBtn, 'click');

      // Trigger Chrome onChanged with USER_CANCELED
      chrome.downloads.onChanged.dispatch({
        id: 8005,
        state: { current: 'interrupted' },
        error: { current: 'USER_CANCELED' },
      });

      const result = await trackPromise;
      expect(result.cancelled).toBe(true);
      expect(result.state).toBe(DOWNLOAD_STATES.CANCELLED);

      // Toolbar must have transitioned to CANCELLED
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.CANCELLED);
      expect(noticeEl.textContent).toContain('Đã hủy tải xuống');
    });

    it('1.6 Subsequent download allowed after previous download finished and auto-reverted', () => {
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '8006' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '8006' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      let sendCallCount = 0;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        sendCallCount++;
        cb({ success: true, downloadId: 8006 });
      });

      // Download 1
      simulatePointerEvent(downloadBtn, 'click');
      expect(sendCallCount).toBe(1);

      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 8006,
        state: 'complete',
      });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);

      // Auto-revert
      vi.advanceTimersByTime(NOTICE_DURATION_MS + 50);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Advance past debounce window (CLICK_DEBOUNCE_MS = 250ms)
      vi.advanceTimersByTime(300);

      // Download 2
      simulatePointerEvent(downloadBtn, 'click');
      expect(sendCallCount).toBe(2);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);
    });

    it('1.7 Cleanup on toolbar teardown removes runtime message listener without throwing or leaking', () => {
      env = setupToolbarTestEnv({ tweetId: '8007' });
      const { video, videoWrapper } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '8007' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const removeListenerSpy = vi.spyOn(chrome.runtime.onMessage, 'removeListener');

      // Teardown / destroy
      controller.destroy();
      expect(removeListenerSpy).toHaveBeenCalled();

      // Dispatching message after cleanup must not affect state or throw
      expect(() => {
        chrome.runtime.onMessage.dispatch({
          type: 'DOWNLOAD_STATUS_CHANGED',
          downloadId: 8007,
          state: 'complete',
        });
      }).not.toThrow();
    });
  });

  // =========================================================================
  // 2. Localhost Offline Error Guidance & Technical Logging Stress
  // =========================================================================
  describe('2. Localhost Offline Error Guidance & Technical Logging', () => {
    it('2.1 UNREACHABLE on localhost:9000, 127.0.0.1:9000, and [::1]:9000 includes batch file guidance', () => {
      const endpoints = [
        'http://localhost:9000',
        'http://localhost:9000/api',
        'http://127.0.0.1:9000',
        'http://[::1]:9000',
      ];

      for (const endpoint of endpoints) {
        const classified = classifyCobaltError({ error: 'UNREACHABLE' }, endpoint);
        expect(classified.code).toBe('UNREACHABLE');
        expect(classified.message).toContain('scripts\\start-cobalt-windows.bat');
        expect(classified.message).toContain('localhost:9000');
      }
    });

    it('2.2 UNREACHABLE on remote instance provides clear network/URL guidance and NEVER suggests windows batch script', () => {
      const remoteUrls = [
        'https://cobalt.api.sh',
        'https://downloader.xyz',
        'http://192.168.1.100:9000',
      ];

      for (const url of remoteUrls) {
        const classified = classifyCobaltError('UNREACHABLE', url);
        expect(classified.code).toBe('UNREACHABLE');
        expect(classified.message).toContain('Không thể kết nối đến máy chủ Cobalt');
        expect(classified.message).toContain('kiểm tra lại URL hoặc mạng');
        expect(classified.message).not.toContain('scripts\\start-cobalt-windows.bat');
      }
    });

    it('2.3 checkServerHealth provides offline batch script guidance when localhost fails to connect', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      const res = await checkServerHealth('http://localhost:9000');
      expect(res.healthy).toBe(false);
      expect(res.error).toBe('UNREACHABLE');
      expect(res.message).toContain('scripts\\start-cobalt-windows.bat');
      expect(res.message).toContain('Cobalt local chưa khởi động');
    });

    it('2.4 Technical logging outputs structured error with correlationId and NO API Key leak', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate chrome.downloads.download failure in startDownload
      const originalDownload = chrome.downloads.download;
      chrome.downloads.download = vi.fn().mockRejectedValue(new Error('NETWORK_TIMEOUT'));

      const res = await startDownload({
        url: 'https://video.twimg.com/test.mp4',
        tweetId: '123456',
        username: 'test_user',
        filename: 'X_test_user_123456.mp4',
      });

      expect(res.success).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[X Video Tools] chrome.downloads.download failed:',
        expect.objectContaining({
          error: 'NETWORK_TIMEOUT',
          url: 'https://video.twimg.com/test.mp4',
          filename: 'X_test_user_123456.mp4',
        })
      );

      // Verify no sensitive credentials leaked
      const callArgs = JSON.stringify(consoleErrorSpy.mock.calls);
      expect(callArgs).not.toContain('apiKey');
      expect(callArgs).not.toContain('Bearer');

      chrome.downloads.download = originalDownload;
    });
  });

  // =========================================================================
  // 3. Popup Settings Non-Destructive Health Check Stress
  // =========================================================================
  describe('3. Popup Settings Non-Destructive Health Check', () => {
    it('3.1 Preserves saved settings in chrome.storage.local when testConnection fails against unreachable instance', async () => {
      // Pre-save valid custom settings
      await saveSettings({
        cobaltUrl: 'http://localhost:9000',
        apiKey: 'secure_auth_token_999',
        videoQuality: '720',
      });

      // Mock fetch failure (instance offline)
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      // Perform testConnection
      const testRes = await testConnection('http://localhost:9000', 'secure_auth_token_999');
      expect(testRes.healthy).toBe(false);
      expect(testRes.error).toBe('UNREACHABLE');

      // Verify chrome.storage.local was NOT wiped, mutated, or reset
      const stored = await getSettings();
      expect(stored.cobaltUrl).toBe('http://localhost:9000');
      expect(stored.apiKey).toBe('secure_auth_token_999');
      expect(stored.videoQuality).toBe('720');
    });

    it('3.2 Preserves saved settings even when testConnection is called with completely invalid or malformed URL', async () => {
      await saveSettings({
        cobaltUrl: 'http://localhost:9000',
        apiKey: 'my_key',
        videoQuality: 'max',
      });

      const malformedRes = await testConnection('not-a-valid-url');
      expect(malformedRes.healthy).toBe(false);
      expect(malformedRes.error).toBe('MALFORMED_URL');

      const protocolRes = await testConnection('ftp://invalid-protocol.com');
      expect(protocolRes.healthy).toBe(false);
      expect(protocolRes.error).toBe('INVALID_PROTOCOL');

      const stored = await getSettings();
      expect(stored.cobaltUrl).toBe('http://localhost:9000');
      expect(stored.apiKey).toBe('my_key');
    });

    it('3.3 Status badges differentiate correctly: status-saved vs status-connected vs status-error', () => {
      document.body.innerHTML = `
        <div id="statusIndicator" class="status-indicator"></div>
        <span id="statusText"></span>
        <div id="popupNotice" class="popup-notice" style="display:none"></div>
      `;

      const indicator = document.getElementById('statusIndicator');
      const text = document.getElementById('statusText');

      // 1. Initial saved state
      setStatusBadge('Đã lưu cấu hình', 'saved');
      expect(indicator.classList.contains('status-saved')).toBe(true);
      expect(indicator.classList.contains('status-connected')).toBe(false);
      expect(indicator.classList.contains('status-error')).toBe(false);
      expect(text.textContent).toBe('Đã lưu cấu hình');

      // 2. Connected state
      setStatusBadge('Đang hoạt động (v11.7.1)', 'connected');
      expect(indicator.classList.contains('status-connected')).toBe(true);
      expect(indicator.classList.contains('status-saved')).toBe(false);
      expect(text.textContent).toContain('Đang hoạt động');

      // 3. Error state
      setStatusBadge('Cobalt chưa chạy (port 9000)', 'error');
      expect(indicator.classList.contains('status-error')).toBe(true);
      expect(indicator.classList.contains('status-connected')).toBe(false);
      expect(text.textContent).toBe('Cobalt chưa chạy (port 9000)');
    });

    it('3.4 Full Popup DOM simulation: Failed test does not touch input values or wipe storage', async () => {
      document.body.innerHTML = `
        <div id="statusIndicator" class="status-indicator"></div>
        <span id="statusText"></span>
        <div id="popupNotice" class="popup-notice" style="display:none"></div>
        <form id="settingsForm">
          <input id="cobaltUrl" type="url" value="http://localhost:9000" />
          <input id="apiKey" type="password" value="secret_pass_123" />
          <select id="videoQuality">
            <option value="max" selected>Tốt nhất (Max)</option>
          </select>
          <button id="btnTest" type="button">Kiểm tra kết nối</button>
          <button id="btnSave" type="submit">Lưu cài đặt</button>
        </form>
      `;

      await saveSettings({
        cobaltUrl: 'http://localhost:9000',
        apiKey: 'secret_pass_123',
        videoQuality: 'max',
      });

      const urlInput = document.getElementById('cobaltUrl');
      const keyInput = document.getElementById('apiKey');

      // Mock offline connection
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const res = await testConnection(urlInput.value, keyInput.value);
      expect(res.healthy).toBe(false);

      // Verify input values are completely untouched
      expect(urlInput.value).toBe('http://localhost:9000');
      expect(keyInput.value).toBe('secret_pass_123');

      // Verify storage remains untouched
      const stored = await getSettings();
      expect(stored.cobaltUrl).toBe('http://localhost:9000');
      expect(stored.apiKey).toBe('secret_pass_123');
    });
  });
});
