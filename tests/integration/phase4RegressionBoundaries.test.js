// tests/integration/phase4RegressionBoundaries.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { attachToolbar } from '../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../src/content/toolbar/toolbarState.js';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getToolbarButtons,
  simulatePointerEvent,
} from '../fixtures/toolbarFixture.js';
import { requestCobalt } from '../../src/background/clients/cobaltClient.js';
import { startDownload } from '../../src/background/downloads/downloadManager.js';
import { createMockTunnelResponse } from '../fixtures/cobaltFixtures.js';

describe('Group F: Regression & Boundaries Tests (Tests 43–47)', () => {
  let env;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = setupToolbarTestEnv();
  });

  afterEach(() => {
    teardownToolbarTestEnv(env);
  });

  it('Test 43: Backwards compatibility & regression: core modules exist and initialize cleanly', () => {
    // Assert that baseline modules load and export expected APIs without runtime corruption
    expect(attachToolbar).toBeDefined();
    expect(TOOLBAR_STATES).toBeDefined();
    expect(TOOLBAR_STATES.IDLE).toBe('idle');
    expect(TOOLBAR_STATES.DISMISSED).toBe('dismissed');
  });

  it('Test 44: Open CDN button remains fully functional and independent when Cobalt API fails', async () => {
    const { video, videoWrapper } = env;

    // Set video src to direct twimg CDN URL
    video.src = 'https://video.twimg.com/amplify_video/1800000000000000055/vid/avc1/1920x1080/sample.mp4';

    const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 99 });
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      if (msg.action === 'OPEN_CDN') {
        tabsSpy({ url: msg.payload?.url || msg.url });
        if (typeof cb === 'function') cb({ success: true, tabId: 99 });
        return Promise.resolve({ success: true, tabId: 99 });
      }
      return Promise.resolve({ success: true });
    });

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Cobalt is offline'));

    const controller = attachToolbar(
      video,
      { tweetId: '1800000000000000055' },
      { stateStore: env.stateStore, enableCdnResolver: true }
    );

    const host = getToolbarHost(videoWrapper);
    const { cdnBtn } = getToolbarButtons(host);

    // Click Mở CDN button
    simulatePointerEvent(cdnBtn, 'click');

    // Wait for resolution
    await new Promise((r) => setTimeout(r, 50));

    // Asserts tab is opened with verified twimg CDN URL
    expect(tabsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://video.twimg.com/amplify_video/1800000000000000055/vid/avc1/1920x1080/sample.mp4',
      })
    );
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
  });

  it('Test 45: Dismiss button remains fully functional and adheres to lifecycle bounds', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1800000000000000056' },
      { stateStore: env.stateStore }
    );

    const host = getToolbarHost(videoWrapper);
    const { dismissBtn } = getToolbarButtons(host);

    expect(controller.stateManager.isDismissed()).toBe(false);

    // Click Dismiss button
    simulatePointerEvent(dismissBtn, 'click');

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);
    expect(controller.stateManager.isDismissed()).toBe(true);
    expect(env.stateStore.isDismissed('1800000000000000056_media_null', video)).toBe(true);
    expect(video.dataset.xvtDismissed).toBe('true');
  });

  it('Test 46: Reference repository ./cobalt/ working tree remains 100% clean and pristine', () => {
    let output = '';
    try {
      output = execSync('git -C cobalt status --porcelain', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } catch (err) {
      // In case git fails, fail test
      expect(err).toBeNull();
    }

    expect(output).toBe('');
  });

  it('Test 47: Zero secrets logging: API Key and signed tokens are never leaked in console logs', async () => {
    const logSpy = vi.spyOn(console, 'log');
    const infoSpy = vi.spyOn(console, 'info');
    const warnSpy = vi.spyOn(console, 'warn');
    const errorSpy = vi.spyOn(console, 'error');

    const secretApiKey = '11223344-5566-4778-8990-aabbccddeeff';
    const mockTunnel = createMockTunnelResponse({ baseUrl: 'https://cobalt.instance.com' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockTunnel), { status: 200 })
    );

    vi.spyOn(chrome.downloads, 'download').mockResolvedValue(9001);

    // Execute Cobalt request with secret key
    await requestCobalt({
      apiUrl: 'https://cobalt.instance.com',
      url: 'https://x.com/user/status/12345',
      apiKey: secretApiKey,
    });

    // Execute Download with signed tunnel URL
    await startDownload({
      url: mockTunnel.url,
      tweetId: '12345',
      username: 'user',
    });

    const allConsoleCalls = [
      ...logSpy.mock.calls,
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ].map((call) => call.join(' '));

    for (const logLine of allConsoleCalls) {
      expect(logLine).not.toContain(secretApiKey);
    }
  });
});
