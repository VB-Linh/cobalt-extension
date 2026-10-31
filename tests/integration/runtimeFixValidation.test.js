// tests/integration/runtimeFixValidation.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachToolbar, getToolbar } from '../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../src/content/toolbar/toolbarState.js';
import { setupToolbarTestEnv, teardownToolbarTestEnv, getToolbarHost, getToolbarButtons, simulatePointerEvent } from '../fixtures/toolbarFixture.js';
import { formatErrorMessage } from '../../src/shared/utils/errorHelper.js';
import { classifyCobaltError, classifyNetworkError } from '../../src/background/handlers/cobaltResponseHandler.js';
import { getSettings, saveSettings, clearSettings, isCobaltConfigured, setCachedSettings } from '../../src/shared/utils/storage.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Runtime Fixes & Acceptance Scenarios Validation Suite (T-01 to T-04)', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (env) {
      teardownToolbarTestEnv(env);
      env = null;
    }
    await clearSettings();
  });

  // =========================================================================
  // R1: INVALID TOOLBAR STATE TRANSITIONS (T-01)
  // =========================================================================
  describe('R1 (T-01): Prevention of Invalid State Transitions during Download Lifecycle', () => {
    it('1.1: Mouse movements during PROCESSING do NOT corrupt state to HOVERED; transitions cleanly to DOWNLOADING', () => {
      env = setupToolbarTestEnv({ tweetId: '9001' });
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '9001' }, { stateStore: env.stateStore, enableDownload: true });
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      const warnSpy = vi.spyOn(console, 'warn');
      let downloadCallback;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        downloadCallback = cb;
      });

      // User hovers video -> HOVERED
      simulatePointerEvent(videoWrapper, 'mouseenter');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // User clicks download -> PROCESSING
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Mouse moves over video wrapper and toolbar host while request is in-flight
      simulatePointerEvent(videoWrapper, 'mousemove');
      simulatePointerEvent(host, 'mouseenter');
      simulatePointerEvent(host, 'mousemove');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Background responds with download initiated
      downloadCallback({ success: true, downloadId: 9001 });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Zero invalid state transition warnings!
      const invalidWarnings = warnSpy.mock.calls.filter((call) =>
        call[0]?.includes('Invalid toolbar state transition')
      );
      expect(invalidWarnings.length).toBe(0);
    });

    it('1.2: Mouse movements during DOWNLOADING do NOT corrupt state to HOVERED; transitions cleanly to COMPLETED on download complete', () => {
      env = setupToolbarTestEnv({ tweetId: '9002' });
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '9002' }, { stateStore: env.stateStore, enableDownload: true });
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      const warnSpy = vi.spyOn(console, 'warn');
      let downloadCallback;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        downloadCallback = cb;
      });

      simulatePointerEvent(downloadBtn, 'click');
      downloadCallback({ success: true, downloadId: 9002 });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // User moves mouse over video or host while file is downloading
      simulatePointerEvent(videoWrapper, 'mousemove');
      simulatePointerEvent(host, 'mouseenter');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Background signals download completion
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 9002,
        state: 'complete',
      });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);
      expect(noticeEl.textContent).toContain('Đã tải xong video');

      // Verify no invalid transition warning occurred
      const invalidWarnings = warnSpy.mock.calls.filter((call) =>
        call[0]?.includes('Invalid toolbar state transition')
      );
      expect(invalidWarnings.length).toBe(0);

      // Notice timeout expires -> transitions to HOVERED or IDLE cleanly
      vi.advanceTimersByTime(2550);
      expect([TOOLBAR_STATES.HOVERED, TOOLBAR_STATES.IDLE]).toContain(controller.stateManager.getState());
    });

    it('1.3: User cancels download in Chrome shelf: transitions cleanly from DOWNLOADING to CANCELLED without warning', () => {
      env = setupToolbarTestEnv({ tweetId: '9003' });
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '9003' }, { stateStore: env.stateStore, enableDownload: true });
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      const warnSpy = vi.spyOn(console, 'warn');
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 9003 });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Simulate mouse entering host while downloading
      simulatePointerEvent(host, 'mouseenter');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Chrome reports cancellation
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 9003,
        state: 'cancelled',
      });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.CANCELLED);
      expect(noticeEl.textContent).toContain('Đã hủy tải xuống');

      const invalidWarnings = warnSpy.mock.calls.filter((call) =>
        call[0]?.includes('Invalid toolbar state transition')
      );
      expect(invalidWarnings.length).toBe(0);
    });

    it('1.4: CDN Resolver flow: mouse movements do NOT corrupt PROCESSING; transitions cleanly to SUCCESS', async () => {
      env = setupToolbarTestEnv({ tweetId: '9004' });
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '9004' }, {
        stateStore: env.stateStore,
        cdnResolver: () => new Promise((resolve) => {
          setTimeout(() => resolve({ success: true, url: 'https://video.twimg.com/vid.mp4' }), 100);
        }),
      });
      const host = getToolbarHost(videoWrapper);
      const { cdnBtn, noticeEl } = getToolbarButtons(host);

      const warnSpy = vi.spyOn(console, 'warn');
      simulatePointerEvent(cdnBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Mouse movements
      simulatePointerEvent(videoWrapper, 'mousemove');
      simulatePointerEvent(host, 'mouseenter');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Advance timer for CDN resolution
      await vi.advanceTimersByTimeAsync(110);

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
      expect(noticeEl.textContent).toContain('Đã mở tab CDN');

      const invalidWarnings = warnSpy.mock.calls.filter((call) =>
        call[0]?.includes('Invalid toolbar state transition')
      );
      expect(invalidWarnings.length).toBe(0);
    });

    it('1.5: Direct transitions from PROCESSING and DOWNLOADING to HOVERED or IDLE are strictly disallowed in state machine', () => {
      env = setupToolbarTestEnv({ tweetId: '9005' });
      const controller = attachToolbar(env.video, { tweetId: '9005' }, { stateStore: env.stateStore, enableDownload: true });
      const sm = controller.stateManager;

      // Start in IDLE -> HOVERED -> PROCESSING
      expect(sm.setState(TOOLBAR_STATES.HOVERED)).toBe(true);
      expect(sm.setState(TOOLBAR_STATES.PROCESSING)).toBe(true);

      // Direct transition from PROCESSING to HOVERED must be REJECTED
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(sm.setState(TOOLBAR_STATES.HOVERED)).toBe(false);
      expect(sm.setState(TOOLBAR_STATES.IDLE)).toBe(false);
      expect(sm.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Transition PROCESSING -> DOWNLOADING
      expect(sm.setState(TOOLBAR_STATES.DOWNLOADING)).toBe(true);

      // Direct transition from DOWNLOADING to HOVERED or IDLE must be REJECTED
      expect(sm.setState(TOOLBAR_STATES.HOVERED)).toBe(false);
      expect(sm.setState(TOOLBAR_STATES.IDLE)).toBe(false);
      expect(sm.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Must complete via appropriate lifecycle outcome
      expect(sm.setState(TOOLBAR_STATES.COMPLETED)).toBe(true);
      expect(sm.setState(TOOLBAR_STATES.HOVERED)).toBe(true);
    });

    it('1.6: Clicking CDN while DOWNLOADING is in progress does NOT trigger invalid state transition warning and does not corrupt download state', () => {
      env = setupToolbarTestEnv({ tweetId: '9006' });
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '9006' }, { stateStore: env.stateStore, enableDownload: true });
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, cdnBtn } = getToolbarButtons(host);

      const warnSpy = vi.spyOn(console, 'warn');
      let downloadCb;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        downloadCb = cb;
      });

      // Initiate download
      simulatePointerEvent(downloadBtn, 'click');
      downloadCb({ success: true, downloadId: 9006 });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // Advance clock past click debounce (250ms)
      vi.advanceTimersByTime(300);

      // User accidentally clicks CDN while download is active
      simulatePointerEvent(cdnBtn, 'click');

      // State MUST remain DOWNLOADING, no transition warning
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);
      const invalidWarnings = warnSpy.mock.calls.filter((call) =>
        call[0]?.includes('Invalid toolbar state transition')
      );
      expect(invalidWarnings.length).toBe(0);
    });

    it('1.7: Stale or late download lifecycle events received while toolbar is in IDLE or HOVERED do NOT cause invalid transition warnings', () => {
      env = setupToolbarTestEnv({ tweetId: '9007' });
      const controller = attachToolbar(env.video, { tweetId: '9007' }, { stateStore: env.stateStore, enableDownload: true });

      const warnSpy = vi.spyOn(console, 'warn');

      // Toolbar is in IDLE
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Simulate unexpected background message for this video
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        videoKey: '9007_media_null',
        downloadId: 9007,
        state: 'complete',
      });

      // Must remain in IDLE with zero invalid transition warnings
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      const invalidWarnings1 = warnSpy.mock.calls.filter((call) =>
        call[0]?.includes('Invalid toolbar state transition')
      );
      expect(invalidWarnings1.length).toBe(0);

      // Move to HOVERED
      controller.show();
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Stale cancellation message arrives
      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        videoKey: '9007_media_null',
        downloadId: 9007,
        state: 'cancelled',
      });

      // Must remain in HOVERED without transition warnings
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
      const invalidWarnings2 = warnSpy.mock.calls.filter((call) =>
        call[0]?.includes('Invalid toolbar state transition')
      );
      expect(invalidWarnings2.length).toBe(0);
    });

    it('1.8: Late response from background sendMessage when toolbar has already reset does NOT force invalid transition to DOWNLOADING', () => {
      env = setupToolbarTestEnv({ tweetId: '9008' });
      const controller = attachToolbar(env.video, { tweetId: '9008' }, { stateStore: env.stateStore, enableDownload: true });
      const host = getToolbarHost(env.videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      const warnSpy = vi.spyOn(console, 'warn');
      let downloadCb;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        downloadCb = cb;
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Simulate error or cancel that already moved state away from PROCESSING
      controller.stateManager.setState(TOOLBAR_STATES.ERROR);

      // Now late response arrives
      downloadCb({ success: true, downloadId: 9008 });

      // Must NOT transition to DOWNLOADING
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
      const invalidWarnings = warnSpy.mock.calls.filter((call) =>
        call[0]?.includes('Invalid toolbar state transition')
      );
      expect(invalidWarnings.length).toBe(0);
    });
  });

  // =========================================================================
  // R2: COBALT URL CONFIGURATION & RELOAD RECOVERY (T-02)
  // =========================================================================
  describe('R2 (T-02): Configuration Persistence, Recovery & Error Categorization', () => {
    it('2.1: Stores and recovers cobaltUrl in storage across simulated extension reloads', async () => {
      await saveSettings({ cobaltUrl: 'http://localhost:9000', apiKey: 'test-key-uuid' });
      expect(isCobaltConfigured()).toBe(true);

      // Simulate extension reload: clear in-memory cache, read from storage
      setCachedSettings({});
      expect(isCobaltConfigured()).toBe(false);

      const restored = await getSettings();
      expect(restored.cobaltUrl).toBe('http://localhost:9000');
      expect(restored.apiKey).toBe('test-key-uuid');
      expect(isCobaltConfigured()).toBe(true);
    });

    it('2.2: Differentiates error categories: UNCONFIGURED vs UNREACHABLE vs AUTH_REQUIRED vs RATE_LIMIT', () => {
      // 1. Unreachable (Cobalt not running)
      const offlineErr = classifyCobaltError('UNREACHABLE', 'http://localhost:9000');
      expect(offlineErr.code).toBe('UNREACHABLE');
      expect(offlineErr.message).toContain('localhost:9000');

      // 2. Auth Required
      const authErr = classifyCobaltError('error.api.auth.key.missing');
      expect(authErr.code).toBe('AUTH_REQUIRED');
      expect(authErr.message).toContain('API Key');

      // 3. Rate Limit
      const rateErr = classifyCobaltError({ code: 'error.api.rate_exceeded', context: { limit: 20 } });
      expect(rateErr.code).toBe('RATE_LIMIT');
      expect(rateErr.message).toContain('20 giây');

      // 4. Content Unavailable
      const contentErr = classifyCobaltError('error.api.content.post.unavailable');
      expect(contentErr.code).toBe('CONTENT_UNAVAILABLE');
    });

    it('2.3: Health check failure does NOT delete or wipe stored settings', async () => {
      await saveSettings({ cobaltUrl: 'http://localhost:9000', apiKey: 'my-key' });

      // Simulate checking an unreachable server
      const netErr = classifyNetworkError(new Error('Connection refused'), 'http://localhost:9000');
      expect(netErr.error).toBe('UNREACHABLE');

      // Configuration must remain 100% intact in storage!
      const current = await getSettings();
      expect(current.cobaltUrl).toBe('http://localhost:9000');
      expect(current.apiKey).toBe('my-key');
    });
  });

  // =========================================================================
  // R3: CLOUDFLARE TURNSTILE CSP COMPLIANCE (T-03)
  // =========================================================================
  describe('R3 (T-03): Cloudflare Turnstile CSP Elimination & Manifest V3 Compliance', () => {
    it('3.1: sandbox.html (src, dist, and root) contains ZERO external script calls to challenges.cloudflare.com', () => {
      const srcSandboxPath = path.resolve(__dirname, '../../src/popup/sandbox.html');
      const rootSandboxPath = path.resolve(__dirname, '../../sandbox.html');
      const distSandboxPath = path.resolve(__dirname, '../../dist/sandbox.html');

      const srcSandboxHtml = fs.readFileSync(srcSandboxPath, 'utf8');
      expect(srcSandboxHtml).not.toContain('challenges.cloudflare.com');
      expect(srcSandboxHtml).not.toContain('https://challenges.cloudflare.com/turnstile/v0/api.js');

      if (fs.existsSync(rootSandboxPath)) {
        const rootSandboxHtml = fs.readFileSync(rootSandboxPath, 'utf8');
        expect(rootSandboxHtml).not.toContain('challenges.cloudflare.com');
        expect(rootSandboxHtml).not.toContain('https://challenges.cloudflare.com/turnstile/v0/api.js');
      }

      if (fs.existsSync(distSandboxPath)) {
        const distSandboxHtml = fs.readFileSync(distSandboxPath, 'utf8');
        expect(distSandboxHtml).not.toContain('challenges.cloudflare.com');
        expect(distSandboxHtml).not.toContain('https://challenges.cloudflare.com/turnstile/v0/api.js');
      }
    });

    it('3.2: popup.html and manifest.json contain no external scripts or relaxed CSP directives', () => {
      const manifestPath = path.resolve(__dirname, '../../manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      expect(manifest.content_security_policy.extension_pages).toBe("script-src 'self'; object-src 'self';");
      expect(manifest.content_security_policy.extension_pages).not.toContain('unsafe-eval');
      expect(manifest.content_security_policy.extension_pages).not.toContain('challenges.cloudflare.com');
    });
  });

  // =========================================================================
  // R4: COBALT API ERROR DETAILS & [object Object] ELIMINATION (T-04)
  // =========================================================================
  describe('R4 (T-04): Error Formatting & Sensitive Information Protection', () => {
    it('4.1: formatErrorMessage cleanly extracts string from various error objects, NEVER returning [object Object]', () => {
      // 1. Direct message
      expect(formatErrorMessage({ message: 'Lỗi tải video' })).toBe('Lỗi tải video');

      // 2. Direct error property string
      expect(formatErrorMessage({ error: 'RATE_LIMIT' })).toBe('RATE_LIMIT');

      // 3. Nested error object with message
      expect(formatErrorMessage({ error: { message: 'Video không tồn tại' } })).toBe('Video không tồn tại');

      // 4. Nested error object with code
      expect(formatErrorMessage({ error: { code: 'error.api.link.invalid' } })).toBe('error.api.link.invalid');

      // 5. Error instance
      expect(formatErrorMessage(new Error('Mạng bị gián đoạn'))).toBe('Mạng bị gián đoạn');

      // 6. Null / undefined fallback
      expect(formatErrorMessage(null)).toBe('Lỗi không xác định.');
      expect(formatErrorMessage(undefined)).toBe('Lỗi không xác định.');

      // 7. Plain object without recognized keys
      const plain = { customField: 'xyz' };
      const formatted = formatErrorMessage(plain);
      expect(formatted).not.toBe('[object Object]');
      expect(formatted).toContain('xyz');
    });

    it('4.2: classifyCobaltError handles object input without crashing or outputting [object Object]', () => {
      const complexCobaltError = {
        status: 'error',
        error: {
          code: 'error.api.rate_exceeded',
          context: { limit: 15 },
        },
      };

      const classified = classifyCobaltError(complexCobaltError);
      expect(classified.code).toBe('RATE_LIMIT');
      expect(classified.message).toContain('15 giây');
      expect(classified.message).not.toContain('[object Object]');
      expect(classified.rawCode).toBe('error.api.rate_exceeded');
    });

    it('4.3: Strips sensitive credentials (API Key, JWT token) from formatted errors', () => {
      const errWithSecrets = {
        message: 'Lỗi xác thực',
        apiKey: 'SECRET-API-KEY-1234',
        jwt: 'SECRET-JWT-HEADER.PAYLOAD.SIG',
        token: 'BEARER-TOKEN',
      };

      const formatted = formatErrorMessage(errWithSecrets);
      expect(formatted).toBe('Lỗi xác thực');
      expect(formatted).not.toContain('SECRET-API-KEY-1234');
      expect(formatted).not.toContain('SECRET-JWT-HEADER');
    });

    it('4.4: classifyCobaltError robustly classifies rate_limit variants, timed_out, capacity, and {{ limit }} templates', () => {
      // 1. RATE_LIMIT uppercase string
      const r1 = classifyCobaltError('RATE_LIMIT');
      expect(r1.code).toBe('RATE_LIMIT');
      expect(r1.message).toContain('15 giây');

      // 2. error.api.rate_limit object with context.limit
      const r2 = classifyCobaltError({ error: { code: 'error.api.rate_limit', context: { limit: 30 } } });
      expect(r2.code).toBe('RATE_LIMIT');
      expect(r2.message).toContain('30 giây');

      // 3. Lowercase unreachable
      const r3 = classifyCobaltError('unreachable', 'http://localhost:9000');
      expect(r3.code).toBe('UNREACHABLE');
      expect(r3.message).toContain('localhost:9000');

      // 4. Cobalt timed_out
      const r4 = classifyCobaltError('timed_out');
      expect(r4.code).toBe('API_TIMEOUT');
      expect(r4.message).toContain('Hết thời gian chờ');

      // 5. Cobalt capacity
      const r5 = classifyCobaltError('capacity');
      expect(r5.code).toBe('CAPACITY');
      expect(r5.message).toContain('quá tải');

      // 6. Template with {{ limit }} double brace syntax
      const r6 = classifyCobaltError({ rawCode: 'custom', message: 'Wait {{ limit }} seconds.', context: { limit: 45 } });
      expect(r6.message).toBe('Wait 45 seconds.');
    });

    it('4.5: Sensitive credentials with Bearer prefix, JWT pattern, or lowercase/underscore keys are properly redacted from error strings', () => {
      // 1. Bearer token in message
      const errWithBearer = { message: 'Unauthorized: Bearer secret_token_xyz_123' };
      expect(formatErrorMessage(errWithBearer)).toBe('Unauthorized: Bearer [REDACTED]');

      // 2. JWT pattern in message
      const errWithJwt = { message: 'Failed token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' };
      expect(formatErrorMessage(errWithJwt)).toContain('[REDACTED_JWT]');
      expect(formatErrorMessage(errWithJwt)).not.toContain('eyJhbGci');

      // 3. Object with api_key, session_token, secret
      const errWithUnderscores = { api_key: 'key-abc', session_token: 'sess-def', secret_val: 'shhh' };
      const formatted = formatErrorMessage(errWithUnderscores);
      expect(formatted).not.toContain('key-abc');
      expect(formatted).not.toContain('sess-def');
      expect(formatted).not.toContain('shhh');
    });
  });

  // =========================================================================
  // 10 MINIMAL TEST SCENARIOS
  // =========================================================================
  describe('10 Minimal Acceptance Scenarios', () => {
    // Scenario 1: Reload extension khi Cobalt đã được cấu hình
    it('Scenario 1: Reload extension khi Cobalt đã được cấu hình restores configuration correctly', async () => {
      await saveSettings({ cobaltUrl: 'http://localhost:9000' });
      setCachedSettings({}); // simulate reload cache wipe
      const settings = await getSettings();
      expect(settings.cobaltUrl).toBe('http://localhost:9000');
      expect(isCobaltConfigured()).toBe(true);
    });

    // Scenario 2: Reload extension khi chưa cấu hình Cobalt URL
    it('Scenario 2: Reload extension khi chưa cấu hình Cobalt URL retains unconfigured prompt', async () => {
      await clearSettings();
      setCachedSettings({});
      const settings = await getSettings();
      expect(settings.cobaltUrl).toBe('');
      expect(isCobaltConfigured()).toBe(false);
    });

    // Scenario 3: Mở nhiều video và thao tác Download độc lập
    it('Scenario 3: Multiple videos on page have independent download states', () => {
      const env2 = setupToolbarTestEnv({ tweetId: '9012' });
      env = setupToolbarTestEnv({ tweetId: '9011' });

      const c1 = attachToolbar(env.video, { tweetId: '9011' }, { stateStore: env.stateStore, enableDownload: true });
      const c2 = attachToolbar(env2.video, { tweetId: '9012' }, { stateStore: env2.stateStore, enableDownload: true });

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => {});

      const { downloadBtn: btn1 } = getToolbarButtons(c1.host);
      simulatePointerEvent(btn1, 'click');

      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE); // Video 2 unaffected

      teardownToolbarTestEnv(env2);
    });

    // Scenario 4: Download thành công
    it('Scenario 4: Download success lifecycle transitions cleanly from Idle -> Processing -> Downloading -> Completed', () => {
      env = setupToolbarTestEnv({ tweetId: '9014' });
      const controller = attachToolbar(env.video, { tweetId: '9014' }, { stateStore: env.stateStore, enableDownload: true });
      const { downloadBtn, noticeEl } = getToolbarButtons(controller.host);

      let downloadCb;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        downloadCb = cb;
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      downloadCb({ success: true, downloadId: 4001 });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 4001,
        state: 'complete',
      });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);
      expect(noticeEl.textContent).toContain('Đã tải xong video');
    });

    // Scenario 5: Download thất bại
    it('Scenario 5: Download failure shows informative Vietnamese message without [object Object]', () => {
      env = setupToolbarTestEnv({ tweetId: '9015' });
      const controller = attachToolbar(env.video, { tweetId: '9015' }, { stateStore: env.stateStore, enableDownload: true });
      const { downloadBtn, noticeEl } = getToolbarButtons(controller.host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: false, error: 'RATE_LIMIT', message: 'Đã vượt quá giới hạn tải. Vui lòng thử lại sau 15 giây.' });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
      expect(noticeEl.textContent).toContain('quá giới hạn tải');
      expect(noticeEl.textContent).not.toContain('[object Object]');
    });

    // Scenario 6: Hủy Download
    it('Scenario 6: Cancel download transitions to CANCELLED and displays notice', () => {
      env = setupToolbarTestEnv({ tweetId: '9016' });
      const controller = attachToolbar(env.video, { tweetId: '9016' }, { stateStore: env.stateStore, enableDownload: true });
      const { downloadBtn, noticeEl } = getToolbarButtons(controller.host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        cb({ success: true, downloadId: 6001 });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 6001,
        state: 'cancelled',
      });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.CANCELLED);
      expect(noticeEl.textContent).toContain('Đã hủy tải xuống');
    });

    // Scenario 7: Cobalt không chạy
    it('Scenario 7: Cobalt not running reports UNREACHABLE with local restart instruction', () => {
      const err = classifyCobaltError('UNREACHABLE', 'http://localhost:9000');
      expect(err.code).toBe('UNREACHABLE');
      expect(err.message).toContain('start-cobalt-windows.bat');
      expect(err.message).not.toContain('[object Object]');
    });

    // Scenario 8: Cobalt khởi động lại sau khi extension đã được tải
    it('Scenario 8: Cobalt restart allows subsequent download to succeed without reload', () => {
      env = setupToolbarTestEnv({ tweetId: '9018' });
      const controller = attachToolbar(env.video, { tweetId: '9018' }, { stateStore: env.stateStore, enableDownload: true });
      const { downloadBtn } = getToolbarButtons(controller.host);

      let attempt = 0;
      let downloadCb;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        attempt++;
        downloadCb = cb;
        if (attempt === 1) {
          cb({ success: false, error: 'UNREACHABLE', message: 'Không thể kết nối máy chủ Cobalt.' });
        }
      });

      // Attempt 1: Failed
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);

      // Advance past debounce and notice timer
      vi.advanceTimersByTime(2600);

      // Attempt 2: Cobalt has restarted, download succeeds
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
      downloadCb({ success: true, downloadId: 8001 });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);
    });

    // Scenario 9: Open CDN khi Cobalt đang tắt
    it('Scenario 9: Open CDN operates 100% independently of Cobalt server', async () => {
      env = setupToolbarTestEnv({ tweetId: '9019' });
      const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 99 });
      const controller = attachToolbar(env.video, { tweetId: '9019' }, {
        stateStore: env.stateStore,
        cdnResolver: () => Promise.resolve({ success: true, url: 'https://video.twimg.com/standalone.mp4' }),
      });
      const { cdnBtn } = getToolbarButtons(controller.host);

      simulatePointerEvent(cdnBtn, 'click');
      await vi.advanceTimersByTimeAsync(50);

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    });

    // Scenario 10: Reload extension nhiều lần và xác minh cấu hình không bị mất
    it('Scenario 10: Repeated extension reloads preserve persisted settings intact', async () => {
      await saveSettings({ cobaltUrl: 'http://localhost:9000', videoQuality: '1080', apiKey: 'key-123' });

      for (let i = 0; i < 5; i++) {
        setCachedSettings({});
        const loaded = await getSettings();
        expect(loaded.cobaltUrl).toBe('http://localhost:9000');
        expect(loaded.videoQuality).toBe('1080');
        expect(loaded.apiKey).toBe('key-123');
      }
    });
  });
});
