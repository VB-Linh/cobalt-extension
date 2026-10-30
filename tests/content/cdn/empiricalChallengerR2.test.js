// tests/content/cdn/empiricalChallengerR2.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveCdnForVideo, CDN_ERROR_CODES } from '../../../src/content/cdn/cdnResolver.js';
import {
  calculateSyndicationToken,
  fetchTweetSyndication,
} from '../../../src/background/handlers/syndicationHandler.js';
import {
  isValidTwimgCdnUrl,
  validateCdnUrl,
  isValidTweetId,
} from '../../../src/content/cdn/cdnValidator.js';
import { createToolbar } from '../../../src/content/toolbar/toolbar.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { createMockSyndicationResponse, createMockVariant } from '../../fixtures/cdnFixtures.js';

describe('Empirical Challenger P3 Round 2: Adversarial Stress & Quality Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // =========================================================================
  // 1. DOM QUALITY COMPARISON VS SYNDICATION API
  // =========================================================================
  describe('1. DOM Quality Comparison vs Syndication API', () => {
    it('1.1: When DOM MP4 is 360p and Syndication API returns 1080p -> selects 1080p variant', async () => {
      const video = document.createElement('video');
      video.src = 'https://video.twimg.com/amplify_video/18001/vid/avc1/640x360/low.mp4?tag=14';

      const syndicationData = {
        id_str: '1800100000000000001',
        mediaDetails: [
          {
            type: 'video',
            id_str: '1800100000000000001_m',
            video_info: {
              variants: [
                { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/18001/vid/avc1/640x360/low.mp4?tag=14', bitrate: 288000 },
                { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/18001/vid/avc1/1280x720/mid.mp4?tag=14', bitrate: 2176000 },
                { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/18001/vid/avc1/1920x1080/high.mp4?tag=14', bitrate: 4500000 },
              ],
            },
          },
        ],
      };

      const openedUrls = [];
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: true, data: syndicationData };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        if (msg.action === 'OPEN_CDN') {
          openedUrls.push(msg.payload?.url || msg.url);
          const resp = { success: true, tabId: 101 };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      const result = await resolveCdnForVideo(video, { tweetId: '1800100000000000001' });

      expect(result.success).toBe(true);
      expect(result.isHls).toBe(false);
      expect(result.url).toBe('https://video.twimg.com/amplify_video/18001/vid/avc1/1920x1080/high.mp4?tag=14');
      expect(openedUrls).toContain('https://video.twimg.com/amplify_video/18001/vid/avc1/1920x1080/high.mp4?tag=14');
    });

    it('1.2: When DOM MP4 is 1080p and Syndication API only returns up to 720p -> selects DOM 1080p', async () => {
      const video = document.createElement('video');
      video.src = 'https://video.twimg.com/amplify_video/18002/vid/avc1/1920x1080/dom1080.mp4?tag=14';

      const syndicationData = {
        id_str: '1800200000000000002',
        mediaDetails: [
          {
            type: 'video',
            id_str: '1800200000000000002_m',
            video_info: {
              variants: [
                { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/18002/vid/avc1/640x360/low.mp4?tag=14', bitrate: 288000 },
                { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/18002/vid/avc1/1280x720/mid720.mp4?tag=14', bitrate: 2176000 },
              ],
            },
          },
        ],
      };

      const openedUrls = [];
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: true, data: syndicationData };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        if (msg.action === 'OPEN_CDN') {
          openedUrls.push(msg.payload?.url || msg.url);
          const resp = { success: true, tabId: 102 };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      const result = await resolveCdnForVideo(video, { tweetId: '1800200000000000002' });

      expect(result.success).toBe(true);
      expect(result.isHls).toBe(false);
      // Confirms DOM 1080p is retained and not downgraded to 720p!
      expect(result.url).toBe(video.src);
      expect(openedUrls).toContain(video.src);
      expect(openedUrls).not.toContain('https://video.twimg.com/amplify_video/18002/vid/avc1/1280x720/mid720.mp4?tag=14');
    });

    it('1.3: When DOM MP4 exists but Syndication API times out -> gracefully falls back to DOM MP4', async () => {
      const video = document.createElement('video');
      video.src = 'https://video.twimg.com/amplify_video/18003/vid/avc1/1280x720/fallback.mp4?tag=14';

      const openedUrls = [];
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: false, error: 'TIMEOUT', message: 'Hết thời gian chờ phản hồi' };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        if (msg.action === 'OPEN_CDN') {
          openedUrls.push(msg.payload?.url || msg.url);
          const resp = { success: true, tabId: 103 };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      const result = await resolveCdnForVideo(video, { tweetId: '1800300000000000003' });

      expect(result.success).toBe(true);
      expect(result.url).toBe(video.src);
      expect(openedUrls).toContain(video.src);
    });

    it('1.4: When DOM MP4 exists but Syndication API rate limits (HTTP 429) -> gracefully falls back to DOM MP4', async () => {
      const video = document.createElement('video');
      video.src = 'https://video.twimg.com/amplify_video/18004/vid/avc1/1280x720/ratelimited.mp4?tag=14';

      const openedUrls = [];
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: false, error: 'API_RATE_LIMIT', message: 'Rate limited' };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        if (msg.action === 'OPEN_CDN') {
          openedUrls.push(msg.payload?.url || msg.url);
          const resp = { success: true, tabId: 104 };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      const result = await resolveCdnForVideo(video, { tweetId: '1800400000000000004' });

      expect(result.success).toBe(true);
      expect(result.url).toBe(video.src);
      expect(openedUrls).toContain(video.src);
    });

    it('1.5: When DOM MP4 exists but Syndication API returns network error or throws -> gracefully falls back to DOM MP4', async () => {
      const video = document.createElement('video');
      video.src = 'https://video.twimg.com/amplify_video/18005/vid/avc1/1280x720/neterr.mp4?tag=14';

      const openedUrls = [];
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          return Promise.reject(new Error('Fatal background disconnect'));
        }
        if (msg.action === 'OPEN_CDN') {
          openedUrls.push(msg.payload?.url || msg.url);
          const resp = { success: true, tabId: 105 };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      const result = await resolveCdnForVideo(video, { tweetId: '1800500000000000005' });

      expect(result.success).toBe(true);
      expect(result.url).toBe(video.src);
      expect(openedUrls).toContain(video.src);
    });

    it('1.6: When DOM MP4 exists but Syndication API only returns HLS -> DOM MP4 is preferred over HLS', async () => {
      const video = document.createElement('video');
      video.src = 'https://video.twimg.com/amplify_video/18006/vid/avc1/640x360/dom_direct.mp4?tag=14';

      const syndicationData = {
        id_str: '1800600000000000006',
        mediaDetails: [
          {
            type: 'video',
            id_str: '1800600000000000006_m',
            video_info: {
              variants: [
                {
                  content_type: 'application/x-mpegURL',
                  url: 'https://video.twimg.com/ext_tw_video/18006/pu/pl/master.m3u8?tag=14',
                },
              ],
            },
          },
        ],
      };

      const openedUrls = [];
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: true, data: syndicationData };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        if (msg.action === 'OPEN_CDN') {
          openedUrls.push(msg.payload?.url || msg.url);
          const resp = { success: true, tabId: 106 };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      const result = await resolveCdnForVideo(video, { tweetId: '1800600000000000006' });

      expect(result.success).toBe(true);
      expect(result.isHls).toBe(false);
      // Strictly prefers direct DOM MP4 over HLS playlist!
      expect(result.url).toBe(video.src);
      expect(openedUrls).toContain(video.src);
      expect(openedUrls).not.toContain('https://video.twimg.com/ext_tw_video/18006/pu/pl/master.m3u8?tag=14');
    });

    it('1.7: When DOM MP4 is already 4K (3840x2160) -> skips Syndication API query and opens immediately', async () => {
      const video = document.createElement('video');
      video.src = 'https://video.twimg.com/amplify_video/18007/vid/avc1/3840x2160/4k_dom.mp4?tag=14';

      const syndicationFetchSpy = vi.fn();
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          syndicationFetchSpy();
          return Promise.resolve({ success: true, data: {} });
        }
        if (msg.action === 'OPEN_CDN') {
          const resp = { success: true, tabId: 107 };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      const result = await resolveCdnForVideo(video, { tweetId: '1800700000000000007' });

      expect(result.success).toBe(true);
      expect(result.url).toBe(video.src);
      // Syndication API fetch should NOT be called since 4K is already highest possible
      expect(syndicationFetchSpy).not.toHaveBeenCalled();
    });

    it('1.8: In multi-video tweet, DOM MP4 matches candidate by media ID to check higher resolution', async () => {
      const video = document.createElement('video');
      video.src = 'https://video.twimg.com/amplify_video/999888/vid/avc1/640x360/preview.mp4?tag=14';

      const syndicationData = {
        id_str: '1800800000000000008',
        mediaDetails: [
          {
            type: 'video',
            id_str: '111222',
            video_info: {
              variants: [
                { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/111222/vid/avc1/1920x1080/other.mp4' },
              ],
            },
          },
          {
            type: 'video',
            id_str: '999888',
            video_info: {
              variants: [
                { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/999888/vid/avc1/640x360/preview.mp4' },
                { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/999888/vid/avc1/1920x1080/hd.mp4?tag=14' },
              ],
            },
          },
        ],
      };

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: true, data: syndicationData };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        if (msg.action === 'OPEN_CDN') {
          const resp = { success: true, tabId: 108 };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      // No anchor or fingerprint -> ambiguous state for general selector,
      // but cdnResolver correlates by media ID (999888) from domUrl
      const result = await resolveCdnForVideo(video, { tweetId: '1800800000000000008' });

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://video.twimg.com/amplify_video/999888/vid/avc1/1920x1080/hd.mp4?tag=14');
    });
  });

  // =========================================================================
  // 2. CONFIRM NO REGRESSIONS ON SNOWFLAKE TOKEN DERIVATION
  // =========================================================================
  describe('2. Snowflake Token Derivation Integrity & Boundary Stress', () => {
    it('2.1: Mathematical precision matches expected Twitter embedded widget algorithm', () => {
      const knownVectors = [
        { tweetId: '1700000000000000000', expected: ((1700000000000000000 / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '') },
        { tweetId: '1860000000000000001', expected: ((1860000000000000001 / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '') },
        { tweetId: '20', expected: ((20 / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '') },
      ];

      for (const vector of knownVectors) {
        const token = calculateSyndicationToken(vector.tweetId);
        expect(token).toBe(vector.expected);
        expect(token).toMatch(/^[a-z0-9]+$/);
        expect(token).not.toContain('.');
        expect(token).not.toContain('0');
      }
    });

    it('2.2: Extreme boundaries and hostile injections produce safe empty string', () => {
      const invalidVectors = [
        '',
        '   ',
        null,
        undefined,
        0,
        -500,
        '-1800000000000000000',
        '1800000000000000000; DROP TABLE tweets;',
        '1800000000000000000<script>',
        'NaN',
        'Infinity',
        {},
        [],
      ];

      for (const inv of invalidVectors) {
        const token = calculateSyndicationToken(inv);
        expect(token).toBe('');
      }
    });

    it('2.3: Snowflake ID format validator (isValidTweetId) enforces 1-25 digit contract', () => {
      expect(isValidTweetId('1860000000000000001')).toBe(true);
      expect(isValidTweetId(1860000000000000001n)).toBe(true);
      expect(isValidTweetId('1234567890123456789012345')).toBe(true); // 25 digits
      expect(isValidTweetId('12345678901234567890123456')).toBe(false); // 26 digits
      expect(isValidTweetId('abc123456789')).toBe(false);
      expect(isValidTweetId('')).toBe(false);
      expect(isValidTweetId(null)).toBe(false);
    });
  });

  // =========================================================================
  // 3. CONFIRM NO REGRESSIONS ON URL VALIDATOR
  // =========================================================================
  describe('3. URL Validator Security & Whitelist Compliance', () => {
    it('3.1: Rejects any URL not strictly matching HTTPS on video.twimg.com', () => {
      const invalidOrigins = [
        'http://video.twimg.com/amplify_video/1/vid/avc1/720x1280/v.mp4',
        'ftp://video.twimg.com/amplify_video/1/vid/avc1/720x1280/v.mp4',
        'blob:https://x.com/abc-123',
        'blob:https://video.twimg.com/abc-123',
        'https://video.twimg.com.attacker.com/v.mp4',
        'https://attacker.com/video.twimg.com/v.mp4',
        'https://video.twimg.com@attacker.com/v.mp4',
        'https://pbs.twimg.com/media/photo.jpg',
        'https://x.com/i/status/12345',
        'https://cobalt.tools/api/stream',
      ];

      for (const url of invalidOrigins) {
        expect(isValidTwimgCdnUrl(url)).toBe(false);
        expect(validateCdnUrl(url)).toBe(false);
      }
    });

    it('3.2: Rejects root path and image poster extensions on video.twimg.com', () => {
      const invalidPaths = [
        'https://video.twimg.com/',
        'https://video.twimg.com',
        'https://video.twimg.com/amplify_video_thumb/1800/img/poster.jpg',
        'https://video.twimg.com/amplify_video_thumb/1800/img/poster.jpeg',
        'https://video.twimg.com/amplify_video_thumb/1800/img/poster.png',
        'https://video.twimg.com/amplify_video_thumb/1800/img/poster.webp',
      ];

      for (const url of invalidPaths) {
        expect(isValidTwimgCdnUrl(url)).toBe(false);
      }
    });

    it('3.3: Accepts all legitimate X video CDN media path variants', () => {
      const validMediaUrls = [
        'https://video.twimg.com/amplify_video/12345/vid/avc1/1280x720/vid.mp4?tag=14',
        'https://video.twimg.com/ext_tw_video/12345/pu/vid/avc1/1920x1080/vid.mp4',
        'https://video.twimg.com/tweet_video/12345.mp4',
        'https://video.twimg.com/amplify_video/12345/pl/master.m3u8',
      ];

      for (const url of validMediaUrls) {
        expect(isValidTwimgCdnUrl(url)).toBe(true);
        expect(validateCdnUrl(url)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 4. CONFIRM NO REGRESSIONS ON IN-FLIGHT CLICK LOCKING & ISOLATION
  // =========================================================================
  describe('4. Concurrency, In-Flight Click Locking & State Lifecycle', () => {
    let env;

    afterEach(() => {
      if (env) {
        teardownToolbarTestEnv(env);
        env = null;
      }
    });

    it('4.1: Rapid-fire 30 clicks during an active resolve lock out subsequent calls', async () => {
      env = setupToolbarTestEnv({ tweetId: '1888000000000000001' });
      const { video } = env;
      video.src = 'https://video.twimg.com/amplify_video/1888000000000000001/vid/avc1/1920x1080/v.mp4';

      let openCallCount = 0;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'OPEN_CDN') {
          openCallCount++;
          setTimeout(() => {
            if (callback) callback({ success: true, tabId: 201 });
          }, 30);
          return Promise.resolve({ success: true, tabId: 201 });
        }
        return Promise.resolve({ success: true });
      });

      const controller = createToolbar(
        video,
        { tweetId: '1888000000000000001' },
        { stateStore: env.stateStore }
      );
      const { cdnBtn } = getToolbarButtons(controller.host);

      // Trigger 30 clicks synchronously
      for (let i = 0; i < 30; i++) {
        simulatePointerEvent(cdnBtn, 'click');
      }

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Wait for async finish
      await new Promise((r) => setTimeout(r, 60));

      expect(openCallCount).toBe(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    });

    it('4.2: Inflight lock is per-toolbar/video: Video A processing does not block Video B', async () => {
      env = setupToolbarTestEnv({
        tweetId: '1888000000000000002',
        videoIndices: [1, 2],
      });
      const [v1, v2] = env.videos;
      v1.src = 'https://video.twimg.com/amplify_video/18881/vid/avc1/720x1280/v1.mp4';
      v2.src = 'https://video.twimg.com/amplify_video/18882/vid/avc1/720x1280/v2.mp4';

      const calls = [];
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'OPEN_CDN') {
          calls.push(msg.payload?.url || msg.url);
          if (callback) callback({ success: true, tabId: 1 });
          return Promise.resolve({ success: true, tabId: 1 });
        }
        return Promise.resolve({ success: true });
      });

      const c1 = createToolbar(v1, { tweetId: '1888000000000000002', mediaIndex: 1 }, { stateStore: env.stateStore });
      const c2 = createToolbar(v2, { tweetId: '1888000000000000002', mediaIndex: 2 }, { stateStore: env.stateStore });

      const { cdnBtn: btn1 } = getToolbarButtons(c1.host);
      const { cdnBtn: btn2 } = getToolbarButtons(c2.host);

      // Fire both
      simulatePointerEvent(btn1, 'click');
      simulatePointerEvent(btn2, 'click');

      await new Promise((r) => setTimeout(r, 20));

      expect(calls).toHaveLength(2);
      expect(calls).toContain(v1.src);
      expect(calls).toContain(v2.src);
    });
  });
});
