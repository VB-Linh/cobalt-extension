// tests/content/cdn/adversarialP3Stress.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateSyndicationToken, fetchTweetSyndication } from '../../../src/background/handlers/syndicationHandler.js';
import {
  selectHighestQualityMp4,
  selectBestVariant,
  extractResolution,
} from '../../../src/content/cdn/qualitySelector.js';
import {
  isValidTwimgCdnUrl,
  isValidTweetId,
  isHlsUrl,
} from '../../../src/content/cdn/cdnValidator.js';
import { createToolbar } from '../../../src/content/toolbar/toolbar.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';

describe('Empirical Challenge & Adversarial Stress Suite: Phase 3 Open CDN Resolver', () => {

  // =========================================================================
  // Challenge 1: Token Derivation Adversarial Stress
  // =========================================================================
  describe('Challenge 1: Token Derivation & Snowflake ID Edge Cases', () => {
    it('1.1: Handles very small positive IDs (1, 2, 10, 999999) without generating empty string, NaN, or undefined', () => {
      const smallIds = [1, 2, 10, 42, 100, 999999, '1', '2', '10', '999999'];
      for (const id of smallIds) {
        const token = calculateSyndicationToken(id);
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
        expect(token).not.toBe('NaN');
        expect(token).not.toBe('undefined');
        expect(token).not.toContain('undefined');
      }
    });

    it('1.2: Handles modern Twitter Snowflake IDs (> 2^53 - 1) including BigInts and extreme snowflake values', () => {
      const snowflakeIds = [
        '1851234567890123456',
        1851234567890123456n, // BigInt input
        '1800000000000000000',
        '1899999999999999999',
        '1999999999999999999',
        '9999999999999999999', // 19 digits
      ];

      for (const id of snowflakeIds) {
        const token = calculateSyndicationToken(id);
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
        expect(token).not.toBe('NaN');
        expect(token).not.toBe('undefined');
      }
    });

    it('1.3: Rejects invalid, zero, negative, non-numeric, and hostile tweet IDs cleanly with empty string', () => {
      const hostileIds = [
        0,
        -1,
        -9999999,
        '0',
        '-123',
        'abc',
        '1851234567890123456n', // string ending with 'n'
        '1851 234567890123456', // internal whitespace
        '18512345x6789012345',  // internal non-digit character
        '123; DROP TABLE tweets;',
        '<script>alert(1)</script>',
        '',
        '   ',
        null,
        undefined,
        NaN,
        Infinity,
        {},
        [],
      ];

      for (const id of hostileIds) {
        const token = calculateSyndicationToken(id);
        expect(token).toBe('');
      }
    });

    it('1.4: Monte Carlo Stress: 10,000 random snowflake IDs never produce empty string or mathematical NaN', () => {
      let emptyCount = 0;
      let invalidCount = 0;

      for (let i = 0; i < 10000; i++) {
        // Generate pseudo-random 19-digit snowflake
        const prefix = 180000000 + Math.floor(Math.random() * 99999999);
        const suffix = 1000000000 + Math.floor(Math.random() * 8999999999);
        const snowflake = `${prefix}${suffix}`;

        const token = calculateSyndicationToken(snowflake);
        if (!token || token.length === 0) {
          emptyCount++;
        }
        if (token === 'NaN' || token.includes('undefined')) {
          invalidCount++;
        }
      }

      expect(emptyCount).toBe(0);
      expect(invalidCount).toBe(0);
    });

    it('1.5: isValidTweetId validates Snowflake boundary limits correctly (1-25 digits)', () => {
      expect(isValidTweetId('1851234567890123456')).toBe(true);
      expect(isValidTweetId(1851234567890123456n)).toBe(true);
      expect(isValidTweetId('1')).toBe(true);
      expect(isValidTweetId('1234567890123456789012345')).toBe(true); // 25 digits
      expect(isValidTweetId('12345678901234567890123456')).toBe(false); // 26 digits
      expect(isValidTweetId('0')).toBe(true);
      expect(isValidTweetId('-1')).toBe(false);
      expect(isValidTweetId('abc')).toBe(false);
      expect(isValidTweetId('')).toBe(false);
      expect(isValidTweetId(null)).toBe(false);
    });
  });

  // =========================================================================
  // Challenge 2: Quality Selection & Extreme Resolution Ranking
  // =========================================================================
  describe('Challenge 2: Quality Selection, 8K/4K/1440p Ranking & Verbatim URL Preservation', () => {
    it('2.1: Correctly ranks exotic and high resolutions: 8K (7680x4320) > 4K (3840x2160) > 1440p (2560x1440) > 1080p (1920x1080)', () => {
      const variants = [
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/1280x720/720p.mp4', bitrate: 2000000 },
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/1920x1080/1080p.mp4', bitrate: 4500000 },
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/2560x1440/1440p.mp4', bitrate: 9000000 },
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/3840x2160/4k.mp4', bitrate: 16000000 },
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/7680x4320/8k.mp4', bitrate: 45000000 },
      ];

      const best = selectHighestQualityMp4(variants);
      expect(best).not.toBeNull();
      expect(best.resolution).toBe(7680 * 4320);
      expect(best.url).toContain('7680x4320');
      expect(best.bitrate).toBe(45000000);
    });

    it('2.2: Properly evaluates portrait / vertical video (1080x1920) against landscape (1280x720)', () => {
      const variants = [
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/1280x720/land.mp4', bitrate: 2000000 }, // 921,600 px
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/720x1280/vert720.mp4', bitrate: 2000000 }, // 921,600 px
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/1080x1920/vert1080.mp4', bitrate: 4500000 }, // 2,073,600 px
      ];

      const best = selectHighestQualityMp4(variants);
      expect(best).not.toBeNull();
      expect(best.resolution).toBe(1080 * 1920);
      expect(best.url).toContain('1080x1920');
    });

    it('2.3: Preserves 100% of raw query parameters, signatures, and tokens verbatim', () => {
      const verbatimUrl = 'https://video.twimg.com/amplify_video/1800/vid/avc1/1920x1080/vid.mp4?tag=14&sig=a9f4%20x+1=&exp=1799999999&token=SEC_TOKEN_XYZ_123#t=0';
      const variants = [
        {
          content_type: 'video/mp4',
          url: verbatimUrl,
          bitrate: 4500000,
        },
      ];

      const best = selectHighestQualityMp4(variants);
      expect(best).not.toBeNull();
      expect(best.url).toBe(verbatimUrl);
      expect(best.url).toContain('?tag=14&sig=a9f4%20x+1=&exp=1799999999&token=SEC_TOKEN_XYZ_123#t=0');
    });

    it('2.4: Handles identical resolutions with different bitrates (tie-breaker)', () => {
      const variants = [
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/1920x1080/v1.mp4', bitrate: 2000000 },
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/1920x1080/v2.mp4', bitrate: 6000000 },
        { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1/vid/avc1/1920x1080/v3.mp4', bitrate: 3500000 },
      ];

      const best = selectHighestQualityMp4(variants);
      expect(best).not.toBeNull();
      expect(best.bitrate).toBe(6000000);
      expect(best.url).toContain('v2.mp4');
    });

    it('2.5: Handles missing resolution dimensions and missing bitrates gracefully', () => {
      const variants = [
        { content_type: 'video/mp4', url: 'https://video.twimg.com/tweet_video/no_res_low.mp4', bitrate: 500000 },
        { content_type: 'video/mp4', url: 'https://video.twimg.com/tweet_video/no_res_high.mp4', bitrate: 2500000 },
        { content_type: 'video/mp4', url: 'https://video.twimg.com/tweet_video/no_res_nobitrate.mp4' }, // no bitrate
      ];

      const best = selectHighestQualityMp4(variants);
      expect(best).not.toBeNull();
      expect(best.bitrate).toBe(2500000);
      expect(best.url).toContain('no_res_high.mp4');
    });

    it('2.6: Hostile and malformed variant inputs do not throw and are filtered safely', () => {
      const hostileVariants = [
        null,
        undefined,
        'not-an-object',
        12345,
        {},
        { url: null },
        { content_type: 'video/mp4' }, // missing url
        { content_type: 'video/mp4', url: 'blob:https://video.twimg.com/blob' }, // blob
        { content_type: 'video/mp4', url: 'https://attacker.com/vid.mp4' }, // bad domain
        { content_type: 'video/webm', url: 'https://video.twimg.com/vid.webm' }, // webm
        { content_type: 'image/jpeg', url: 'https://video.twimg.com/pic.jpg' }, // image
        { content_type: 'video/mp4', url: 'https://video.twimg.com/tweet_video/valid.mp4', bitrate: -100 },
      ];

      const best = selectHighestQualityMp4(hostileVariants);
      expect(best).not.toBeNull();
      expect(best.url).toBe('https://video.twimg.com/tweet_video/valid.mp4');
    });
  });

  // =========================================================================
  // Challenge 3: HLS Fallback Detection & Isolation
  // =========================================================================
  describe('Challenge 3: HLS Fallback (.m3u8) Detection & Priority Isolation', () => {
    it('3.1: Flags isHls: true when only HLS playlist variant exists', () => {
      const variants = [
        {
          content_type: 'application/x-mpegURL',
          url: 'https://video.twimg.com/ext_tw_video/1800/pl/master.m3u8?tag=14',
          bitrate: 2176000,
        },
      ];

      const best = selectBestVariant(variants);
      expect(best).not.toBeNull();
      expect(best.isHls).toBe(true);
      expect(best.url).toContain('.m3u8');
    });

    it('3.2: Recognizes alternative MIME type application/vnd.apple.mpegurl', () => {
      const variants = [
        {
          content_type: 'application/vnd.apple.mpegurl',
          url: 'https://video.twimg.com/ext_tw_video/1800/pl/hls.m3u8',
        },
      ];

      const best = selectBestVariant(variants);
      expect(best).not.toBeNull();
      expect(best.isHls).toBe(true);
    });

    it('3.3: Strict priority: MP4 ALWAYS takes precedence over HLS even if HLS is earlier in array or higher bitrate', () => {
      const variants = [
        {
          content_type: 'application/x-mpegURL',
          url: 'https://video.twimg.com/ext_tw_video/1800/pl/master.m3u8?tag=14',
          bitrate: 50000000, // Massive bitrate on HLS
        },
        {
          content_type: 'video/mp4',
          url: 'https://video.twimg.com/ext_tw_video/1800/pu/vid/avc1/1280x720/vid.mp4?tag=14',
          bitrate: 2000000,
        },
      ];

      const best = selectBestVariant(variants);
      expect(best).not.toBeNull();
      expect(best.isHls).toBe(false);
      expect(best.url).toContain('vid.mp4');
    });

    it('3.4: Rejects hostile HLS URLs not hosted on authentic video.twimg.com', () => {
      const variants = [
        {
          content_type: 'application/x-mpegURL',
          url: 'https://evil.com/ext_tw_video/1800/pl/master.m3u8',
        },
      ];

      const best = selectBestVariant(variants);
      expect(best).toBeNull();
    });

    it('3.5: Returns null when only non-video formats exist in variants', () => {
      const variants = [
        { content_type: 'text/html', url: 'https://video.twimg.com/index.html' },
        { content_type: 'audio/mp3', url: 'https://video.twimg.com/audio.mp3' },
      ];

      expect(selectBestVariant(variants)).toBeNull();
      expect(selectBestVariant([])).toBeNull();
      expect(selectBestVariant(null)).toBeNull();
    });

    it('3.6: isHlsUrl accurately identifies m3u8 playlists', () => {
      expect(isHlsUrl('https://video.twimg.com/video/stream.m3u8')).toBe(true);
      expect(isHlsUrl('https://video.twimg.com/video/stream.m3u8?tag=14')).toBe(true);
      expect(isHlsUrl('https://video.twimg.com/video/file.mp4')).toBe(false);
      expect(isHlsUrl('')).toBe(false);
      expect(isHlsUrl(null)).toBe(false);
    });
  });

  // =========================================================================
  // Challenge 4: URL Validator Hostile Payload Defense
  // =========================================================================
  describe('Challenge 4: URL Validator Hostile Payload Defense', () => {
    it('4.1: Rejects subdomain spoofing, evil suffix domains, and relative attacks', () => {
      const attackUrls = [
        'https://video.twimg.com.attacker.com/vid.mp4',
        'https://video.twimg.com.evil.co/vid.mp4',
        'https://attacker.com/video.twimg.com/vid.mp4',
        'https://fakevideo.twimg.com/vid.mp4',
        'https://video_twimg.com/vid.mp4',
        'https://video.twimg.co/vid.mp4',
        'https://video.twimg.com.attacker.net/video.mp4',
      ];

      for (const url of attackUrls) {
        expect(isValidTwimgCdnUrl(url)).toBe(false);
      }
    });

    it('4.2: Rejects userinfo @ credential hijacking attacks', () => {
      const userinfoUrls = [
        'https://video.twimg.com@attacker.com/video.mp4',
        'https://video.twimg.com:443@attacker.com/video.mp4',
        'https://video.twimg.com:secret@attacker.com/vid.mp4',
        'https://user:password@attacker.com/video.twimg.com/vid.mp4',
      ];

      for (const url of userinfoUrls) {
        expect(isValidTwimgCdnUrl(url)).toBe(false);
      }
    });

    it('4.3: Rejects insecure, dangerous, and non-HTTP protocols', () => {
      const dangerousProtocols = [
        'http://video.twimg.com/vid.mp4',
        'blob:https://video.twimg.com/123-abc',
        'blob:http://video.twimg.com/123-abc',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'data:video/mp4;base64,AAAA',
        'file:///C:/video.mp4',
        'ftp://video.twimg.com/vid.mp4',
      ];

      for (const url of dangerousProtocols) {
        expect(isValidTwimgCdnUrl(url)).toBe(false);
      }
    });

    it('4.4: Rejects root paths, empty paths, and static image extensions', () => {
      const invalidPaths = [
        'https://video.twimg.com/',
        'https://video.twimg.com',
        'https://video.twimg.com/   ',
        'https://video.twimg.com/poster.jpg',
        'https://video.twimg.com/thumb.png',
        'https://video.twimg.com/pic.webp',
        'https://video.twimg.com/image.jpeg',
      ];

      for (const url of invalidPaths) {
        expect(isValidTwimgCdnUrl(url)).toBe(false);
      }
    });

    it('4.5: Rejects non-string and malformed primitives cleanly', () => {
      const nonStrings = [
        null,
        undefined,
        '',
        '   ',
        12345,
        {},
        [],
        () => {},
        Symbol('url'),
      ];

      for (const val of nonStrings) {
        expect(isValidTwimgCdnUrl(val)).toBe(false);
      }
    });

    it('4.6: Rejects Internationalized Domain (IDN) homoglyph spoofing (e.g. Cyrillic)', () => {
      // Cyrillic small letter 'і' (U+0456) instead of ASCII 'i' (U+0069)
      const homoglyphUrl = 'https://v\u0456deo.twimg.com/amplify_video/123/vid.mp4';
      expect(isValidTwimgCdnUrl(homoglyphUrl)).toBe(false);
    });
  });

  // =========================================================================
  // Challenge 5: Concurrency, In-Flight Locking, Debouncing & Race Conditions
  // =========================================================================
  describe('Challenge 5: Concurrency, In-Flight Locking & Debouncing', () => {
    let env;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      if (env) {
        teardownToolbarTestEnv(env);
      }
    });

    it('5.1: In-Flight Lock: 50 concurrent clicks during an in-flight fetch trigger exactly 1 request', async () => {
      env = setupToolbarTestEnv({ tweetId: '1890000000000000051' });
      const { video } = env;
      video.src = 'https://video.twimg.com/amplify_video/1890000000000000051/vid/avc1/1920x1080/vid.mp4';

      let requestCount = 0;
      const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 1051 });

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'OPEN_CDN') {
          requestCount++;
          // Simulate 50ms network delay
          setTimeout(() => {
            tabsSpy({ url: msg.payload?.url || msg.url });
            if (typeof callback === 'function') callback({ success: true, tabId: 1051 });
          }, 50);
          return Promise.resolve({ success: true, tabId: 1051 });
        }
        return Promise.resolve({ success: true });
      });

      const controller = createToolbar(
        video,
        { tweetId: '1890000000000000051' },
        { stateStore: env.stateStore }
      );
      const { cdnBtn } = getToolbarButtons(controller.host);

      // Fire 50 clicks in rapid succession
      for (let i = 0; i < 50; i++) {
        simulatePointerEvent(cdnBtn, 'click');
      }

      // Initial state is processing
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Wait for delay to complete
      await new Promise((r) => setTimeout(r, 80));

      expect(requestCount).toBe(1);
      expect(tabsSpy).toHaveBeenCalledTimes(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    });

    it('5.2: Keyboard navigation spam (50 Enter/Space keys) respects debounce and concurrency lock', async () => {
      env = setupToolbarTestEnv({ tweetId: '1890000000000000052' });
      const { video } = env;
      video.src = 'https://video.twimg.com/amplify_video/1890000000000000052/vid/avc1/1920x1080/vid.mp4';

      let requestCount = 0;
      vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 1052 });

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'OPEN_CDN') {
          requestCount++;
          if (typeof callback === 'function') callback({ success: true, tabId: 1052 });
          return Promise.resolve({ success: true, tabId: 1052 });
        }
        return Promise.resolve({ success: true });
      });

      const controller = createToolbar(
        video,
        { tweetId: '1890000000000000052' },
        { stateStore: env.stateStore }
      );
      const { cdnBtn } = getToolbarButtons(controller.host);

      // Spam Enter and Space keys
      for (let i = 0; i < 25; i++) {
        cdnBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        cdnBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      }

      await new Promise((r) => setTimeout(r, 30));

      expect(requestCount).toBe(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    });

    it('5.3: Independent video resolution: Simultaneous clicks on two separate videos fire independent requests', async () => {
      env = setupToolbarTestEnv({
        tweetId: '1890000000000000053',
        videoIndices: [1, 2],
      });
      const [v1, v2] = env.videos;
      v1.src = 'https://video.twimg.com/amplify_video/18900000000000000531/vid/avc1/720x1280/v1.mp4';
      v2.src = 'https://video.twimg.com/amplify_video/18900000000000000532/vid/avc1/720x1280/v2.mp4';

      const openedUrls = [];
      vi.spyOn(chrome.tabs, 'create').mockImplementation(({ url }) => {
        openedUrls.push(url);
        return Promise.resolve({ id: Math.random() });
      });

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'OPEN_CDN') {
          openedUrls.push(msg.payload?.url || msg.url);
          if (typeof callback === 'function') callback({ success: true, tabId: 1 });
          return Promise.resolve({ success: true, tabId: 1 });
        }
        return Promise.resolve({ success: true });
      });

      const c1 = createToolbar(v1, { tweetId: '1890000000000000053', mediaIndex: 1 }, { stateStore: env.stateStore });
      const c2 = createToolbar(v2, { tweetId: '1890000000000000053', mediaIndex: 2 }, { stateStore: env.stateStore });

      const { cdnBtn: btn1 } = getToolbarButtons(c1.host);
      const { cdnBtn: btn2 } = getToolbarButtons(c2.host);

      // Click both buttons
      simulatePointerEvent(btn1, 'click');
      simulatePointerEvent(btn2, 'click');

      await new Promise((r) => setTimeout(r, 30));

      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
      expect(openedUrls).toContain(v1.src);
      expect(openedUrls).toContain(v2.src);
    });

    it('5.4: Post-completion unlocks: After resolution finishes, a subsequent click is NOT permanently blocked', async () => {
      env = setupToolbarTestEnv({ tweetId: '1890000000000000054' });
      const { video } = env;
      video.src = 'https://video.twimg.com/amplify_video/1890000000000000054/vid/avc1/1920x1080/vid.mp4';

      let openCount = 0;
      vi.spyOn(chrome.tabs, 'create').mockImplementation(() => {
        openCount++;
        return Promise.resolve({ id: openCount });
      });

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'OPEN_CDN') {
          openCount++;
          if (typeof callback === 'function') callback({ success: true, tabId: openCount });
          return Promise.resolve({ success: true, tabId: openCount });
        }
        return Promise.resolve({ success: true });
      });

      const controller = createToolbar(
        video,
        { tweetId: '1890000000000000054' },
        { stateStore: env.stateStore }
      );
      const { cdnBtn } = getToolbarButtons(controller.host);

      // Click 1
      simulatePointerEvent(cdnBtn, 'click');
      await new Promise((r) => setTimeout(r, 30));
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
      expect(openCount).toBe(1);

      // Manually trigger the notice expiration transition (SUCCESS -> IDLE)
      // or simulate state returning to IDLE after 2500ms notice duration
      controller.stateManager.setState(TOOLBAR_STATES.IDLE);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Advance clock past debounce window (300ms)
      await new Promise((r) => setTimeout(r, 300));

      // Click 2 (subsequent user action)
      simulatePointerEvent(cdnBtn, 'click');
      await new Promise((r) => setTimeout(r, 30));
      expect(openCount).toBe(2);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    });
  });
});
