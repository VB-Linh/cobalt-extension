// tests/phase6FullValidation.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Suite 1: Video Detection Component
import {
  detectVideos,
  isEligibleVideo,
  findTweetContainer,
  isQuotedTweet,
  getVideoKey,
  extractMediaFingerprint,
} from '../src/content/detection/index.js';
import {
  extractTweetInfo,
  extractTweetId,
  extractUsername,
} from '../src/content/extraction/index.js';
import { createVideoStateStore } from '../src/content/state/index.js';
import { createTweetFixture } from './fixtures/factory.js';

// Suite 2: Floating Toolbar Component
import { createToolbar } from '../src/content/toolbar/toolbar.js';
import { attachToolbar, detachToolbar, TOOLBAR_STATES } from '../src/content/toolbar/index.js';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getToolbarButtons,
  simulatePointerEvent,
} from './fixtures/toolbarFixture.js';

// Suite 3: Independent Open CDN Resolver
import { extractDirectDomUrl } from '../src/content/cdn/domExtractor.js';
import { selectHighestQualityMp4, selectBestVariant } from '../src/content/cdn/qualitySelector.js';
import { isValidTwimgCdnUrl } from '../src/content/cdn/cdnValidator.js';
import {
  resolveCdnForVideo,
  CDN_ERROR_CODES,
  CDN_ERROR_MESSAGES,
} from '../src/content/cdn/cdnResolver.js';
import {
  createMockVariant,
  createMockSyndicationResponse,
  createVideoWithSources,
} from './fixtures/cdnFixtures.js';

// Suite 4: Cobalt Download Client
import {
  buildRequestBody,
  buildHeaders,
  requestCobalt,
  checkServerHealth,
} from '../src/background/clients/cobaltClient.js';
import {
  handleCobaltResponse,
  classifyCobaltError,
} from '../src/background/handlers/cobaltResponseHandler.js';
import {
  createMockRedirectResponse,
  createMockTunnelResponse,
  createMockPickerResponse,
  createMockErrorResponse,
  createMockServerInfo,
} from './fixtures/cobaltFixtures.js';

// Suite 5: MediaPicker Popover Component
import { renderMediaPicker } from '../src/content/cdn/mediaPicker.js';

// Suite 6: Download Manager & Lifecycle
import {
  generateFilename,
  initiateDownload,
  startDownload,
  resetDownloadManager,
  DOWNLOAD_STATES,
} from '../src/background/downloads/downloadManager.js';

const NOTICE_DURATION_MS = 2500;
const CLICK_DEBOUNCE_MS = 250;
const GRACE_PERIOD_MS = 300;

describe('Phase 6: Personal Release & Final Validation Test Suite', () => {

  beforeEach(() => {
    chrome.runtime.lastError = null;
  });

  afterEach(() => {
    chrome.runtime.lastError = null;
  });

  // =========================================================================
  // SUITE 1: Video Detection Component (T-01.1)
  // =========================================================================
  describe('Suite 1: Video Detection Component (T-01.1)', () => {
    let rootContainer;
    let stateStore;

    beforeEach(() => {
      chrome.runtime.lastError = null;
      rootContainer = document.createElement('div');
      rootContainer.id = 'suite1-root';
      document.body.appendChild(rootContainer);
      stateStore = createVideoStateStore();
    });

    afterEach(() => {
      chrome.runtime.lastError = null;
      if (rootContainer?.parentNode) {
        rootContainer.parentNode.removeChild(rootContainer);
      }
      stateStore.reset();
      vi.restoreAllMocks();
    });

    it('1.1 should detect eligible video elements and ignore disconnected elements', () => {
      const tweet = createTweetFixture({ tweetId: '1800000000000000001' });
      rootContainer.appendChild(tweet);

      const attachedVideo = tweet.querySelector('video');
      expect(attachedVideo).not.toBeNull();
      expect(attachedVideo.isConnected).toBe(true);

      const detected = detectVideos(rootContainer);
      expect(detected).toContain(attachedVideo);

      const disconnectedVideo = document.createElement('video');
      expect(disconnectedVideo.isConnected).toBe(false);
      expect(isEligibleVideo(disconnectedVideo)).toBe(false);
    });

    it('1.2 should strictly exclude non-tweet UI contexts (composer, sidebar, DMs)', () => {
      const composerWrap = document.createElement('div');
      composerWrap.setAttribute('data-testid', 'tweetTextarea_0');
      const vComposer = document.createElement('video');
      composerWrap.appendChild(vComposer);
      rootContainer.appendChild(composerWrap);

      const sidebarWrap = document.createElement('div');
      sidebarWrap.setAttribute('data-testid', 'sidebarColumn');
      const vSidebar = document.createElement('video');
      sidebarWrap.appendChild(vSidebar);
      rootContainer.appendChild(sidebarWrap);

      const dmWrap = document.createElement('div');
      dmWrap.setAttribute('data-testid', 'DMDrawer');
      const vDm = document.createElement('video');
      dmWrap.appendChild(vDm);
      rootContainer.appendChild(dmWrap);

      expect(isEligibleVideo(vComposer)).toBe(false);
      expect(isEligibleVideo(vSidebar)).toBe(false);
      expect(isEligibleVideo(vDm)).toBe(false);
    });

    it('1.3 should extract canonical permalink, tweet ID, and username from header time anchor', () => {
      const tweet = createTweetFixture({
        tweetId: '1800000000000000001',
        username: 'elonmusk',
        domain: 'https://x.com',
      });
      rootContainer.appendChild(tweet);

      const video = tweet.querySelector('video');
      const container = findTweetContainer(video);
      expect(container).not.toBeNull();

      const info = extractTweetInfo(container, video);
      expect(info.tweetId).toBe('1800000000000000001');
      expect(info.username).toBe('elonmusk');
      expect(info.permalink).toBe('https://x.com/elonmusk/status/1800000000000000001');
    });

    it('1.4 should isolate quoted tweet video and prevent parent tweet collision', () => {
      const tweet = createTweetFixture({
        tweetId: '1111111111',
        username: 'parent_user',
        isQuoted: true,
        quotedTweetId: '2222222222',
        quotedUsername: 'quote_author',
      });
      rootContainer.appendChild(tweet);

      const video = tweet.querySelector('video');
      expect(isQuotedTweet(tweet, video)).toBe(true);

      const container = findTweetContainer(video);
      expect(container).not.toBeNull();

      const info = extractTweetInfo(container, video);
      expect(info.tweetId).toBe('2222222222');
      expect(info.username).toBe('quote_author');
    });

    it('1.5 should derive stable media fingerprint from poster URLs', () => {
      const v1 = document.createElement('video');
      v1.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/18500000001/img.jpg');

      const v2 = document.createElement('video');
      v2.setAttribute('poster', 'https://pbs.twimg.com/ext_tw_video_thumb/18500000002/pu/img/abc.jpg');

      const v3 = document.createElement('video');
      v3.setAttribute('poster', 'https://pbs.twimg.com/tweet_video_thumb/slug123.jpg');

      const v4 = document.createElement('video');
      v4.setAttribute('poster', 'https://pbs.twimg.com/media/thumb456.jpg');

      expect(extractMediaFingerprint(v1)).toBe('18500000001');
      expect(extractMediaFingerprint(v2)).toBe('18500000002');
      expect(extractMediaFingerprint(v3)).toBe('slug123');
      expect(extractMediaFingerprint(v4)).toBe('thumb456');
    });

    it('1.6 should derive media fingerprint from video src and source elements', () => {
      const vBlob = document.createElement('video');
      vBlob.src = 'blob:x.com/abc-123-uuid';
      expect(extractMediaFingerprint(vBlob)).toBe('blob_abc-123-uuid');

      const vSource = document.createElement('video');
      const source = document.createElement('source');
      source.setAttribute('src', 'https://video.twimg.com/amplify_video/18500000003/vid/1280x720/vid.mp4');
      vSource.appendChild(source);
      expect(extractMediaFingerprint(vSource)).toBe('18500000003');
    });

    it('1.7 should assign isolated tokens to multi-video containers without anchors to prevent key collision', () => {
      const container = document.createElement('article');
      container.setAttribute('data-testid', 'tweet');

      const v1 = document.createElement('video');
      const v2 = document.createElement('video');
      container.appendChild(v1);
      container.appendChild(v2);
      rootContainer.appendChild(container);

      const key1 = getVideoKey('1800000000000000000', null, v1);
      const key2 = getVideoKey('1800000000000000000', null, v2);

      expect(key1).not.toBe(key2);
      expect(key1).toContain('1800000000000000000_media_tok_');
      expect(key2).toContain('1800000000000000000_media_tok_');
      expect(key1).not.toBe('1800000000000000000_media_null');
      expect(key2).not.toBe('1800000000000000000_media_null');
    });

    it('1.8 should maintain 3-Tier State Store isolation across virtual scrolling recycling', () => {
      const v1 = document.createElement('video');
      rootContainer.appendChild(v1);

      stateStore.dismiss('key_1', v1);
      expect(v1.dataset.xvtDismissed).toBe('true'); // Tier 1 (DOM dataset)
      expect(stateStore.isDismissed('key_1', v1)).toBe(true); // Tier 2 (WeakSet)

      // Simulate virtual scroll unmount
      rootContainer.removeChild(v1);

      // Simulate remounting with fresh video DOM node representing the same key
      const v2 = document.createElement('video');
      rootContainer.appendChild(v2);

      expect(stateStore.isDismissed('key_1', v2)).toBe(true); // Tier 3 (session Set)
      expect(v2.dataset.xvtDismissed).toBe('true'); // Synchronized to Tier 1
    });
  });

  // =========================================================================
  // SUITE 2: Floating Toolbar Component (T-01.2)
  // =========================================================================
  describe('Suite 2: Floating Toolbar Component (T-01.2)', () => {
    let env;

    beforeEach(() => {
      chrome.runtime.lastError = null;
      vi.useFakeTimers();
      env = setupToolbarTestEnv({ tweetId: '1800000000000000002' });
    });

    afterEach(() => {
      chrome.runtime.lastError = null;
      vi.useRealTimers();
      vi.restoreAllMocks();
      teardownToolbarTestEnv(env);
    });

    it('2.1 should mount 3-button pill UI in open Shadow DOM with top-left positioning', () => {
      const { video } = env;
      const controller = createToolbar(video, { tweetId: '1800000000000000002' }, { stateStore: env.stateStore });

      expect(controller).not.toBeNull();
      expect(controller.host.style.top).toBe('10px');
      expect(controller.host.style.left).toBe('10px');

      const { downloadBtn, cdnBtn, dismissBtn } = getToolbarButtons(controller.host);
      expect(downloadBtn).not.toBeNull();
      expect(cdnBtn).not.toBeNull();
      expect(dismissBtn).not.toBeNull();
    });

    it('2.2 should prevent flicker via 300ms hover bridge when pointer crosses gap between video and toolbar', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1800000000000000002' }, { stateStore: env.stateStore });
      const host = getToolbarHost(videoWrapper);

      simulatePointerEvent(videoWrapper, 'mouseenter');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Traversal to toolbar host (simulated with relatedTarget)
      simulatePointerEvent(videoWrapper, 'mouseleave', { relatedTarget: host });
      simulatePointerEvent(host, 'mouseenter');
      vi.advanceTimersByTime(150);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Leave host to outside
      simulatePointerEvent(host, 'mouseleave');
      vi.advanceTimersByTime(250);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED); // still within 300ms grace period

      vi.advanceTimersByTime(60);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE); // grace period expired
    });

    it('2.3 should inhibit toolbar hiding during active feedback states (DOWNLOADING, AMBIGUOUS, PICKER)', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1800000000000000002' }, { stateStore: env.stateStore });

      controller.stateManager.setState(TOOLBAR_STATES.HOVERED);
      controller.stateManager.setState(TOOLBAR_STATES.PROCESSING);
      controller.stateManager.setState(TOOLBAR_STATES.DOWNLOADING);
      simulatePointerEvent(videoWrapper, 'mouseleave');

      vi.advanceTimersByTime(500);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);
    });

    it('2.4 should drop rapid spam clicks via 250ms click debounce guard', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(
        video,
        { tweetId: '1800000000000000002' },
        { stateStore: env.stateStore, enableDownload: true }
      );
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

      // 5 rapid clicks in 50ms
      for (let i = 0; i < 5; i++) {
        simulatePointerEvent(downloadBtn, 'click');
        vi.advanceTimersByTime(10);
      }

      // First click was accepted, subsequent 4 spam clicks dropped
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('2.5 should drop clicks when toolbar is already in PROCESSING, DOWNLOADING, SUCCESS, or COMPLETED state', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(
        video,
        { tweetId: '1800000000000000002' },
        { stateStore: env.stateStore, enableDownload: true }
      );
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      const sendSpy = vi.spyOn(chrome.runtime, 'sendMessage');

      controller.stateManager.setState(TOOLBAR_STATES.HOVERED);
      controller.stateManager.setState(TOOLBAR_STATES.PROCESSING);
      simulatePointerEvent(downloadBtn, 'click');
      expect(sendSpy).not.toHaveBeenCalled();

      controller.stateManager.setState(TOOLBAR_STATES.COMPLETED);
      simulatePointerEvent(downloadBtn, 'click');
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('2.6 should auto-revert temporary feedback states back to HOVERED or IDLE after 2500ms', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(
        video,
        { tweetId: '1800000000000000002' },
        { stateStore: env.stateStore }
      );
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      // Trigger unconfigured state
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
      expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);

      // Auto-reverts to IDLE after 2500ms
      vi.advanceTimersByTime(NOTICE_DURATION_MS);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(false);
    });

    it('2.7 should dismiss toolbar across all 3 tiers with 150ms animation upon clicking dismiss button', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1800000000000000002' }, { stateStore: env.stateStore });
      const host = getToolbarHost(videoWrapper);
      const { dismissBtn } = getToolbarButtons(host);

      simulatePointerEvent(dismissBtn, 'click');
      expect(controller.stateManager.isDismissed()).toBe(true);
      expect(video.dataset.xvtDismissed).toBe('true');

      vi.advanceTimersByTime(160);
      expect(getToolbarHost(videoWrapper)).toBeNull();
    });

    it('2.8 should support keyboard accessibility (Enter / Space triggers action)', () => {
      const { video } = env;
      const controller = attachToolbar(video, { tweetId: '1800000000000000002' }, { stateStore: env.stateStore });
      const host = getToolbarHost(controller.wrapper);
      const { dismissBtn } = getToolbarButtons(host);

      const dismissKeydown = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      dismissBtn.dispatchEvent(dismissKeydown);

      expect(controller.stateManager.isDismissed()).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 3: Independent Open CDN Resolver (T-01.3)
  // =========================================================================
  describe('Suite 3: Independent Open CDN Resolver (T-01.3)', () => {
    let video;

    beforeEach(() => {
      chrome.runtime.lastError = null;
      video = document.createElement('video');
      document.body.appendChild(video);
    });

    afterEach(() => {
      chrome.runtime.lastError = null;
      if (video?.parentNode) {
        video.parentNode.removeChild(video);
      }
      vi.restoreAllMocks();
    });

    it('3.1 should extract direct MP4 from DOM video currentSrc, src, and source tags', () => {
      const cdnUrl = 'https://video.twimg.com/amplify_video/123/vid/avc1/1280x720/vid.mp4?tag=14';
      video.src = cdnUrl;
      expect(extractDirectDomUrl(video)).toBe(cdnUrl);
    });

    it('3.2 should reject invalid DOM sources (blob, data, image thumbnails, spoofed domains)', () => {
      video.src = 'blob:https://x.com/abc-uuid';
      expect(extractDirectDomUrl(video)).toBeNull();

      video.src = 'data:video/mp4;base64,AAAA';
      expect(extractDirectDomUrl(video)).toBeNull();

      video.src = 'https://pbs.twimg.com/media/thumb.jpg';
      expect(extractDirectDomUrl(video)).toBeNull();

      video.src = 'https://attacker.com/video.mp4';
      expect(extractDirectDomUrl(video)).toBeNull();
    });

    it('3.3 should fall back to Twitter Syndication API when DOM has only blob URL', async () => {
      video.src = 'blob:https://x.com/blob-123';

      const syndicationResp = createMockSyndicationResponse({ tweetId: '1800000000000000003' });
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const res = { success: true, data: syndicationResp };
          if (cb) cb(res);
          return Promise.resolve(res);
        }
        if (msg.action === 'OPEN_CDN') {
          const res = { success: true, tabId: 101 };
          if (cb) cb(res);
          return Promise.resolve(res);
        }
        return Promise.resolve({ success: true });
      });

      const res = await resolveCdnForVideo(video, { tweetId: '1800000000000000003' });
      expect(res.success).toBe(true);
      expect(res.url).toContain('1920x1080');
    });

    it('3.4 should select highest resolution variant (prioritizing 1440p/4K over 1080p)', () => {
      const variants = [
        createMockVariant({ width: 1280, height: 720, bitrate: 2176000 }),
        createMockVariant({ width: 1920, height: 1080, bitrate: 4500000 }),
        createMockVariant({ width: 2560, height: 1440, bitrate: 6000000 }),
      ];

      const best = selectHighestQualityMp4(variants);
      expect(best).not.toBeNull();
      expect(best.resolution).toBe(2560 * 1440);
      expect(best.url).toContain('2560x1440');
    });

    it('3.5 should use bitrate as tie-breaker when resolutions are identical or metadata is missing', () => {
      const vLow = createMockVariant({ width: 1920, height: 1080, bitrate: 2500000 });
      const vHigh = createMockVariant({ width: 1920, height: 1080, bitrate: 4500000 });

      const best = selectHighestQualityMp4([vLow, vHigh]);
      expect(best.bitrate).toBe(4500000);
    });

    it('3.6 should fall back to HLS stream (.m3u8) when no MP4 variant is available', () => {
      const hlsVariant = createMockVariant({ contentType: 'application/x-mpegURL' });
      const best = selectBestVariant([hlsVariant]);
      expect(best).not.toBeNull();
      expect(best.isHls).toBe(true);
      expect(best.url).toContain('.m3u8');
    });

    it('3.7 should preserve 100% of query parameters on CDN URLs (?tag=..., tokens, signatures)', () => {
      const rawUrl = 'https://video.twimg.com/amplify_video/123/vid/avc1/1280x720/vid.mp4?tag=14&sig=abc123xyz&token=987';
      const variant = createMockVariant({ customUrl: rawUrl });

      const best = selectHighestQualityMp4([variant]);
      expect(best.url).toBe(rawUrl);
    });

    it('3.8 should open validated twimg CDN URL in a new tab via chrome.tabs.create', async () => {
      const cdnUrl = 'https://video.twimg.com/amplify_video/123/vid/avc1/1280x720/vid.mp4?tag=14';
      video.src = cdnUrl;

      const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 102 });
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'OPEN_CDN') {
          tabsSpy({ url: msg.payload?.url || msg.url });
          const res = { success: true, tabId: 102 };
          if (cb) cb(res);
          return Promise.resolve(res);
        }
        return Promise.resolve({ success: true });
      });

      const res = await resolveCdnForVideo(video, { tweetId: '1800000000000000003' });
      expect(res.success).toBe(true);
      expect(tabsSpy).toHaveBeenCalledWith(expect.objectContaining({ url: cdnUrl }));
    });

    it('3.9 should copy CDN URL to clipboard on Shift+Click instead of opening new tab', async () => {
      const cdnUrl = 'https://video.twimg.com/amplify_video/123/vid/avc1/1280x720/vid.mp4?tag=14';
      video.src = cdnUrl;

      const tabsSpy = vi.spyOn(chrome.tabs, 'create');
      const clipboardSpy = vi.fn().mockResolvedValue();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: clipboardSpy },
        configurable: true,
        writable: true,
      });

      const res = await resolveCdnForVideo(video, { tweetId: '1800000000000000003' }, { shiftKey: true });
      expect(res.success).toBe(true);
      expect(res.copied).toBe(true);
      expect(clipboardSpy).toHaveBeenCalledWith(cdnUrl);
      expect(tabsSpy).not.toHaveBeenCalled();
    });

    it('3.10 should verify Open CDN operates 100% independently when Cobalt is completely offline or unconfigured', async () => {
      const cdnUrl = 'https://video.twimg.com/amplify_video/123/vid/avc1/1920x1080/vid.mp4?tag=14';
      video.src = cdnUrl;

      // Cobalt is offline / rejected
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Cobalt offline'));

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'OPEN_CDN') {
          const res = { success: true, tabId: 103 };
          if (cb) cb(res);
          return Promise.resolve(res);
        }
        return Promise.resolve({ success: true });
      });

      const res = await resolveCdnForVideo(video, { tweetId: '1800000000000000003' });
      expect(res.success).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled(); // Zero calls to Cobalt API
    });

    it('3.11 should handle Syndication API errors gracefully (403 NSFW, 429 Rate Limit, network timeout)', async () => {
      chrome.runtime.lastError = null;
      video.src = 'blob:https://x.com/blob-err';

      // 1. Rate Limit (429)
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        const res = { success: false, error: 'API_RATE_LIMIT' };
        if (typeof cb === 'function') cb(res);
        return Promise.resolve(res);
      });
      const resRateLimit = await resolveCdnForVideo(video, { tweetId: '1800000000000000003' });
      expect(resRateLimit.success).toBe(false);
      expect(resRateLimit.code).toBe(CDN_ERROR_CODES.RATE_LIMITED);

      // 2. Tweet Inaccessible / 403 NSFW
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        const res = { success: false, error: 'TWEET_INACCESSIBLE' };
        if (typeof cb === 'function') cb(res);
        return Promise.resolve(res);
      });
      const resInaccessible = await resolveCdnForVideo(video, { tweetId: '1800000000000000003' });
      expect(resInaccessible.success).toBe(false);
      expect(resInaccessible.code).toBe(CDN_ERROR_CODES.TWEET_INACCESSIBLE);

      // 3. Network Timeout
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        const res = { success: false, error: 'API_TIMEOUT' };
        if (typeof cb === 'function') cb(res);
        return Promise.resolve(res);
      });
      const resTimeout = await resolveCdnForVideo(video, { tweetId: '1800000000000000003' });
      expect(resTimeout.success).toBe(false);
      expect(resTimeout.code).toBe(CDN_ERROR_CODES.NETWORK_TIMEOUT);
    });
  });

  // =========================================================================
  // SUITE 4: Cobalt Download Client (T-01.4)
  // =========================================================================
  describe('Suite 4: Cobalt Download Client (T-01.4)', () => {
    it('4.1 should construct strict v11.7.1 payload with localProcessing=disabled and valid enums', () => {
      const body = buildRequestBody({
        url: 'https://x.com/user/status/123',
        videoQuality: '1080',
      });

      expect(body.url).toBe('https://x.com/user/status/123');
      expect(body.videoQuality).toBe('1080');
      expect(body.downloadMode).toBe('auto');
      expect(body.localProcessing).toBe('disabled');
      expect(body.filenameStyle).toBe('basic');
    });

    it('4.2 should build strict headers with Accept, Content-Type, Api-Key, and Bearer token', () => {
      const hApiKey = buildHeaders('test-uuid-key');
      expect(hApiKey.Accept).toBe('application/json');
      expect(hApiKey['Content-Type']).toBe('application/json');
      expect(hApiKey.Authorization).toBe('Api-Key test-uuid-key');

      const hBearer = buildHeaders('', 'jwt.token.val');
      expect(hBearer.Authorization).toBe('Bearer jwt.token.val');
    });

    it('4.3 should handle status redirect: returns direct HTTPS download action', () => {
      const resp = createMockRedirectResponse({
        url: 'https://video.twimg.com/amplify_video/123/vid/avc1/1920x1080/vid.mp4',
        filename: 'X_user_123.mp4',
      });

      const result = handleCobaltResponse(resp);
      expect(result.success).toBe(true);
      expect(result.type).toBe('DOWNLOAD_DIRECT');
      expect(result.downloadUrl).toBe(resp.url);
      expect(result.filename).toBe('X_user_123.mp4');
    });

    it('4.4 should handle status tunnel: validates signed parameters (id, exp, sig, sec, iv) and preserves query', () => {
      const resp = createMockTunnelResponse();
      const result = handleCobaltResponse(resp);

      expect(result.success).toBe(true);
      expect(result.type).toBe('DOWNLOAD_TUNNEL');
      expect(result.downloadUrl).toContain('sig=');
      expect(result.downloadUrl).toContain('sec=');
      expect(result.downloadUrl).toContain('iv=');
    });

    it('4.5 should handle status picker: formats media items array for interactive selection', () => {
      const resp = createMockPickerResponse();
      const result = handleCobaltResponse(resp);

      expect(result.success).toBe(true);
      expect(result.type).toBe('PICKER');
      expect(result.items.length).toBe(2);
      expect(result.items[0].type).toBe('video');
    });

    it('4.6 should handle status local-processing: returns clear error indicating browser unsupported', () => {
      const resp = { status: 'local-processing' };
      const result = handleCobaltResponse(resp);

      expect(result.success).toBe(false);
      expect(result.error).toBe('LOCAL_PROCESSING_UNSUPPORTED');
      expect(result.message).toContain('xử lý cục bộ');
    });

    it('4.7 should map error codes to user-friendly Vietnamese messages with dynamic context parameters', () => {
      const err = classifyCobaltError({
        code: 'error.api.rate_exceeded',
        context: { limit: 20 },
      });

      expect(err.code).toBe('RATE_LIMIT');
      expect(err.rawCode).toBe('error.api.rate_exceeded');
      expect(err.message).toContain('20 giây');

      const privateErr = classifyCobaltError('error.api.content.post.private');
      expect(privateErr.message).toContain('riêng tư');
    });

    it('4.8 should classify network errors and server offline with localhost script hint', () => {
      const err = classifyCobaltError('UNREACHABLE', 'http://localhost:9000/');
      expect(err.code).toBe('UNREACHABLE');
      expect(err.message).toContain('scripts\\start-cobalt-windows.bat');
    });

    it('4.9 should execute health check probe (GET /) and validate Cobalt version and services', async () => {
      const serverInfo = createMockServerInfo({ version: '11.7.1', services: ['twitter', 'youtube'] });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(serverInfo),
      });

      const health = await checkServerHealth('http://localhost:9000/');
      expect(health.healthy).toBe(true);
      expect(health.version).toBe('11.7.1');
      expect(health.services).toContain('twitter');
    });
  });

  // =========================================================================
  // SUITE 5: MediaPicker Popover Component (T-01.5)
  // =========================================================================
  describe('Suite 5: MediaPicker Popover Component (T-01.5)', () => {
    let host;
    let shadowRoot;

    beforeEach(() => {
      host = document.createElement('div');
      host.className = 'xvt-toolbar-host';
      document.body.appendChild(host);
      shadowRoot = host.attachShadow({ mode: 'open' });
    });

    afterEach(() => {
      if (host?.parentNode) {
        host.parentNode.removeChild(host);
      }
      vi.restoreAllMocks();
    });

    it('5.1 should render popover in Shadow DOM with items, thumbnails, aspect ratio, and resolution', () => {
      const candidates = [
        { id_str: '1', type: 'video', video_info: { aspect_ratio: [16, 9] } },
        { id_str: '2', type: 'video', video_info: { aspect_ratio: [9, 16] } },
      ];

      const picker = renderMediaPicker(shadowRoot, candidates);
      const popover = shadowRoot.querySelector('.xvt-picker-popover');
      expect(popover).not.toBeNull();

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      expect(items.length).toBe(2);

      picker.destroy();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('5.2 should trigger onSelect with selected candidate when user clicks an item', () => {
      const candidates = [
        { id_str: 'cand_1', type: 'video' },
        { id_str: 'cand_2', type: 'video' },
      ];

      const selectSpy = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onSelect: selectSpy });

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      items[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(selectSpy).toHaveBeenCalledWith(candidates[1], 1);
    });

    it('5.3 should trigger onCancel and unmount on close button click or Escape key', () => {
      const cancelSpy = vi.fn();
      renderMediaPicker(shadowRoot, [{ id_str: '1' }], { onCancel: cancelSpy });

      const closeBtn = shadowRoot.querySelector('.xvt-picker-close');
      expect(closeBtn).not.toBeNull();

      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(cancelSpy).toHaveBeenCalled();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('5.4 should close popover when clicking outside the dialog', async () => {
      const cancelSpy = vi.fn();
      renderMediaPicker(shadowRoot, [{ id_str: '1' }], { onCancel: cancelSpy });

      await new Promise((r) => setTimeout(r, 10));

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(cancelSpy).toHaveBeenCalled();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('5.5 should maintain popover interactivity when pointer leaves video wrapper', () => {
      const selectSpy = vi.fn();
      renderMediaPicker(shadowRoot, [{ id_str: '1' }], { onSelect: selectSpy });

      // Moving mouse to document body does not automatically destroy picker (unless clicked outside)
      document.body.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();
    });
  });

  // =========================================================================
  // SUITE 6: Download Manager & Lifecycle (T-01.6)
  // =========================================================================
  describe('Suite 6: Download Manager & Lifecycle (T-01.6)', () => {
    beforeEach(() => {
      chrome.runtime.lastError = null;
      vi.restoreAllMocks();
      resetDownloadManager();
    });

    afterEach(() => {
      chrome.runtime.lastError = null;
      vi.restoreAllMocks();
      resetDownloadManager();
    });

    it('6.1 should format sanitized filename as X_username_tweetId.ext stripping illegal characters', () => {
      const fn = generateFilename({
        tweetId: '1800:123/456',
        username: 'john/doe*test',
      });

      expect(fn).toBe('X_john_doe_test_1800_123_456.mp4');
      expect(fn).not.toMatch(/[\\/:*?"<>|]/);
    });

    it('6.2 should enforce anti-duplicate concurrency lock for same videoKey', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(1001);

      const res1 = await initiateDownload('key_lock_test', {
        url: 'https://video.twimg.com/video.mp4',
        tweetId: '123',
      });
      expect(res1.success).toBe(true);

      const res2 = await initiateDownload('key_lock_test', {
        url: 'https://video.twimg.com/video.mp4',
        tweetId: '123',
      });
      expect(res2.blocked).toBe(true);
      expect(res2.reason).toBe('DOWNLOAD_IN_PROGRESS');
    });

    it('6.3 should omit filename override to preserve user last-chosen directory in Save As dialog', async () => {
      const downloadSpy = vi.spyOn(chrome.downloads, 'download').mockResolvedValue(1002);

      await startDownload({
        url: 'https://cobalt.io/tunnel?id=preservation_test',
      });

      expect(downloadSpy).toHaveBeenCalledWith({
        url: 'https://cobalt.io/tunnel?id=preservation_test',
        conflictAction: 'uniquify',
        saveAs: false,
      });
      expect(downloadSpy.mock.calls[0][0]).not.toHaveProperty('filename');
    });

    it('6.4 should synchronize complete lifecycle: updates state, releases lock, broadcasts to tab', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(1003);
      const tabSpy = vi.spyOn(chrome.tabs, 'sendMessage').mockResolvedValue();

      await initiateDownload('key_lifecycle_complete', {
        url: 'https://video.twimg.com/video.mp4',
        tweetId: '123',
        tabId: 55,
      });

      chrome.downloads.onChanged.dispatch({
        id: 1003,
        state: { current: 'complete' },
      });

      expect(tabSpy).toHaveBeenCalledWith(
        55,
        expect.objectContaining({ state: 'complete', videoKey: 'key_lifecycle_complete' }),
        expect.any(Function)
      );

      // Lock is released: next download is allowed
      const retry = await initiateDownload('key_lifecycle_complete', {
        url: 'https://video.twimg.com/video.mp4',
        tweetId: '123',
      });
      expect(retry.blocked).toBeFalsy();
    });

    it('6.5 should synchronize cancelled lifecycle: USER_CANCELED releases lock and allows immediate retry', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(1004);
      const tabSpy = vi.spyOn(chrome.tabs, 'sendMessage').mockResolvedValue();

      await initiateDownload('key_lifecycle_cancel', {
        url: 'https://video.twimg.com/video.mp4',
        tweetId: '123',
        tabId: 56,
      });

      chrome.downloads.onChanged.dispatch({
        id: 1004,
        state: { current: 'interrupted' },
        error: { current: 'USER_CANCELED' },
      });

      expect(tabSpy).toHaveBeenCalledWith(
        56,
        expect.objectContaining({ state: 'cancelled', videoKey: 'key_lifecycle_cancel' }),
        expect.any(Function)
      );

      const retry = await initiateDownload('key_lifecycle_cancel', {
        url: 'https://video.twimg.com/video.mp4',
        tweetId: '123',
      });
      expect(retry.success).toBe(true);
    });

    it('6.6 should synchronize interrupted lifecycle: network failure logs error and notifies tab', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(1005);
      const tabSpy = vi.spyOn(chrome.tabs, 'sendMessage').mockResolvedValue();

      await initiateDownload('key_lifecycle_interrupted', {
        url: 'https://video.twimg.com/video.mp4',
        tweetId: '123',
        tabId: 57,
      });

      chrome.downloads.onChanged.dispatch({
        id: 1005,
        state: { current: 'interrupted' },
        error: { current: 'NETWORK_FAILED' },
      });

      expect(tabSpy).toHaveBeenCalledWith(
        57,
        expect.objectContaining({ state: 'interrupted', videoKey: 'key_lifecycle_interrupted' }),
        expect.any(Function)
      );
    });

    it('6.7 should safely handle closed or navigated tabs during lifecycle broadcast', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(1006);

      vi.spyOn(chrome.tabs, 'sendMessage').mockImplementation((tabId, msg, cb) => {
        chrome.runtime.lastError = { message: 'Receiving end does not exist.' };
        if (cb) cb();
        return Promise.resolve();
      });

      await initiateDownload('key_closed_tab', {
        url: 'https://video.twimg.com/video.mp4',
        tweetId: '123',
        tabId: 9999,
      });

      expect(() => {
        chrome.downloads.onChanged.dispatch({
          id: 1006,
          state: { current: 'complete' },
        });
      }).not.toThrow();

      chrome.runtime.lastError = null;
    });
  });

  // =========================================================================
  // SUITE 7: Real-World Live Scenarios (T-02)
  // =========================================================================
  describe('Suite 7: Real-World Live Scenarios (T-02)', () => {
    beforeEach(() => {
      chrome.runtime.lastError = null;
      vi.restoreAllMocks();
      resetDownloadManager();
    });

    afterEach(() => {
      chrome.runtime.lastError = null;
      vi.restoreAllMocks();
      resetDownloadManager();
    });

    it('Scenario 1: Cobalt running & video download succeeds end-to-end with full lifecycle synchronization', async () => {
      vi.useFakeTimers();
      const env = setupToolbarTestEnv({ tweetId: '7001', username: 'cobalt_user' });
      const { video, videoWrapper, stateStore } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '7001', username: 'cobalt_user', permalink: 'https://x.com/cobalt_user/status/7001' },
        { stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'COBALT_DOWNLOAD') {
          cb({ success: true, downloadId: 7001, filename: 'X_cobalt_user_7001.mp4' });
        }
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);
      expect(noticeEl.textContent).toContain('Đang tải video');

      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 7001,
        videoKey: '7001_media_null',
        state: 'complete',
        filename: 'X_cobalt_user_7001.mp4',
      });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);
      expect(noticeEl.textContent).toContain('Đã tải xong video');

      vi.advanceTimersByTime(NOTICE_DURATION_MS);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      teardownToolbarTestEnv(env);
      vi.useRealTimers();
    });

    it('Scenario 2: Cobalt not running triggers exact actionable notice and auto-reverts cleanly without getting stuck', async () => {
      vi.useFakeTimers();
      const env = setupToolbarTestEnv({ tweetId: '7002' });
      const { video, videoWrapper, stateStore } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '7002', username: 'tester' },
        { stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      const actionableNotice = 'Không thể kết nối máy chủ Cobalt nội bộ (localhost:9000). Vui lòng khởi động scripts\\start-cobalt-windows.bat.';

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'COBALT_DOWNLOAD') {
          cb({
            success: false,
            error: 'UNREACHABLE',
            code: 'UNREACHABLE',
            message: actionableNotice,
          });
        }
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
      expect(noticeEl.textContent).toBe(actionableNotice);

      vi.advanceTimersByTime(NOTICE_DURATION_MS);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      let secondClickFired = false;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        secondClickFired = true;
        cb({ success: false, error: 'UNREACHABLE', message: actionableNotice });
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(secondClickFired).toBe(true);

      teardownToolbarTestEnv(env);
      vi.useRealTimers();
    });

    it('Scenario 3: Cobalt killed mid-request or timing out is cleanly captured and auto-reverts gracefully', async () => {
      vi.useFakeTimers();
      const env = setupToolbarTestEnv({ tweetId: '7003' });
      const { video, videoWrapper, stateStore } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '7003', username: 'tester' },
        { stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      const timeoutMsg = 'Hết thời gian chờ phản hồi từ máy chủ Cobalt. Vui lòng thử lại sau.';
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'COBALT_DOWNLOAD') {
          cb({
            success: false,
            error: 'API_TIMEOUT',
            code: 'API_TIMEOUT',
            message: timeoutMsg,
          });
        }
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
      expect(noticeEl.textContent).toBe(timeoutMsg);

      vi.advanceTimersByTime(NOTICE_DURATION_MS);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      teardownToolbarTestEnv(env);
      vi.useRealTimers();
    });

    it('Scenario 4: User cancels download in browser shelf immediately releases anti-duplicate lock and transitions toolbar to cancelled', async () => {
      vi.useFakeTimers();
      const videoKey = '7004_media_null';

      const initRes = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/sample_7004.mp4',
        tweetId: '7004',
        tabId: 1,
      });

      expect(initRes.success).toBe(true);
      const downloadId = initRes.downloadId;

      const dupRes = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/sample_7004.mp4',
        tweetId: '7004',
      });
      expect(dupRes.blocked).toBe(true);

      chrome.downloads.onChanged.dispatch({
        id: downloadId,
        state: { current: 'interrupted' },
        error: { current: 'USER_CANCELED' },
      });

      const retryRes = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/sample_7004.mp4',
        tweetId: '7004',
      });
      expect(retryRes.blocked).toBeFalsy();
      expect(retryRes.success).toBe(true);

      vi.useRealTimers();
    });

    it('Scenario 5: User retries downloading an already completed video after auto-revert', async () => {
      vi.useFakeTimers();
      const env = setupToolbarTestEnv({ tweetId: '7005' });
      const { video, videoWrapper, stateStore } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '7005', username: 'tester' },
        { stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      let downloadCount = 0;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'COBALT_DOWNLOAD') {
          downloadCount++;
          cb({ success: true, downloadId: 5000 + downloadCount });
        }
      });

      simulatePointerEvent(downloadBtn, 'click');
      expect(downloadCount).toBe(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      chrome.runtime.onMessage.dispatch({
        type: 'DOWNLOAD_STATUS_CHANGED',
        downloadId: 5001,
        videoKey: '7005_media_null',
        state: 'complete',
      });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.COMPLETED);

      simulatePointerEvent(downloadBtn, 'click');
      expect(downloadCount).toBe(1); // Blocked during COMPLETED

      vi.advanceTimersByTime(NOTICE_DURATION_MS);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      simulatePointerEvent(downloadBtn, 'click');
      expect(downloadCount).toBe(2);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      teardownToolbarTestEnv(env);
      vi.useRealTimers();
    });

    it('Scenario 6: Multi-tab timeline usage maintains independent downloads and zero cross-tab state interference', async () => {
      const tab1VideoKey = 'tab1_101_media_null';
      const tab2VideoKey = 'tab2_102_media_null';

      let nextDlId = 6000;
      vi.spyOn(chrome.downloads, 'download').mockImplementation(() => Promise.resolve(++nextDlId));

      const tab1MsgSpy = vi.fn();
      const tab2MsgSpy = vi.fn();

      vi.spyOn(chrome.tabs, 'sendMessage').mockImplementation((tabId, msg, cb) => {
        if (tabId === 101) tab1MsgSpy(msg);
        if (tabId === 102) tab2MsgSpy(msg);
        if (cb) cb();
        return Promise.resolve();
      });

      const res1 = await initiateDownload(tab1VideoKey, {
        url: 'https://video.twimg.com/tab1.mp4',
        tweetId: '101',
        tabId: 101,
      });

      const res2 = await initiateDownload(tab2VideoKey, {
        url: 'https://video.twimg.com/tab2.mp4',
        tweetId: '102',
        tabId: 102,
      });

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res1.downloadId).not.toBe(res2.downloadId);

      chrome.downloads.onChanged.dispatch({
        id: res1.downloadId,
        state: { current: 'complete' },
      });

      expect(tab1MsgSpy).toHaveBeenCalledWith(expect.objectContaining({ state: 'complete', videoKey: tab1VideoKey }));
      expect(tab2MsgSpy).not.toHaveBeenCalled();

      chrome.downloads.onChanged.dispatch({
        id: res2.downloadId,
        state: { current: 'complete' },
      });

      expect(tab2MsgSpy).toHaveBeenCalledWith(expect.objectContaining({ state: 'complete', videoKey: tab2VideoKey }));
    });

    it('Scenario 7: Tab closed during active download completes safely in background without unhandled exceptions', async () => {
      const closedTabId = 999;
      const videoKey = '7007_media_null';

      vi.spyOn(chrome.tabs, 'sendMessage').mockImplementation((tabId, msg, cb) => {
        chrome.runtime.lastError = { message: 'Receiving end does not exist.' };
        if (cb) cb();
        return Promise.resolve();
      });

      const res = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/video_7007.mp4',
        tweetId: '7007',
        tabId: closedTabId,
      });
      expect(res.success).toBe(true);

      expect(() => {
        chrome.downloads.onChanged.dispatch({
          id: res.downloadId,
          state: { current: 'complete' },
        });
      }).not.toThrow();

      chrome.runtime.lastError = null;

      const retry = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/video_7007.mp4',
        tweetId: '7007',
      });
      expect(retry.blocked).toBeFalsy();
      expect(retry.success).toBe(true);
    });

    it('Scenario 8: Tab switching and continuous virtualized scrolling preserves 3-tier dismissal state without duplicate toolbars', () => {
      const env = setupToolbarTestEnv({ tweetId: '7008' });
      const { video, videoWrapper, stateStore } = env;

      const controller = attachToolbar(
        video,
        { tweetId: '7008', username: 'scroller' },
        { stateStore }
      );

      const host = getToolbarHost(videoWrapper);
      const { dismissBtn } = getToolbarButtons(host);

      simulatePointerEvent(dismissBtn, 'click');
      expect(controller.stateManager.isDismissed()).toBe(true);
      expect(stateStore.isDismissed('7008_media_null', video)).toBe(true);

      videoWrapper.removeChild(host);
      video.remove();

      const newVideoWrapper = document.createElement('div');
      newVideoWrapper.setAttribute('data-testid', 'videoComponent');
      const newVideo = document.createElement('video');
      newVideoWrapper.appendChild(newVideo);
      env.root.appendChild(newVideoWrapper);

      const remountedController = attachToolbar(
        newVideo,
        { tweetId: '7008', username: 'scroller' },
        { stateStore }
      );

      expect(remountedController).toBeNull(); // Guard prevents mounting toolbar on dismissed video
      expect(getToolbarHost(newVideoWrapper)).toBeNull();

      teardownToolbarTestEnv(env);
    });

    it('Scenario 9: Open CDN operates 100% independently with highest resolution when Cobalt service is completely inactive', async () => {
      chrome.runtime.lastError = null;
      const env = setupToolbarTestEnv({ tweetId: '7009' });
      const { video, videoWrapper, stateStore } = env;

      const cdnUrl = 'https://video.twimg.com/amplify_video/1800000000000000009/vid/avc1/1920x1080/vid.mp4?tag=14';
      video.src = cdnUrl;

      const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 109 });
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Cobalt is offline'));

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'OPEN_CDN') {
          tabsSpy({ url: msg.payload?.url || msg.url });
          if (cb) cb({ success: true, tabId: 109 });
          return Promise.resolve({ success: true, tabId: 109 });
        }
        return Promise.resolve({ success: true });
      });

      const controller = attachToolbar(
        video,
        { tweetId: '7009' },
        { stateStore, enableCdnResolver: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { cdnBtn } = getToolbarButtons(host);

      simulatePointerEvent(cdnBtn, 'click');

      await new Promise((r) => setTimeout(r, 40));

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
      expect(tabsSpy).toHaveBeenCalledWith(expect.objectContaining({ url: cdnUrl }));
      expect(fetchSpy).not.toHaveBeenCalled();

      teardownToolbarTestEnv(env);
    });
  });
});
