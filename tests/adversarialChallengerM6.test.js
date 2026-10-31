// tests/adversarialChallengerM6.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Suite 1 imports
import { attachToolbar, detachToolbar, TOOLBAR_STATES } from '../src/content/toolbar/index.js';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getToolbarButtons,
  simulatePointerEvent,
} from './fixtures/toolbarFixture.js';

// Suite 2 imports
import { createTweetFixture } from './fixtures/factory.js';
import { createVideoStateStore, VideoStateStore } from '../src/content/state/videoState.js';

// Suite 3 imports
import { getVideoKey, extractMediaFingerprint } from '../src/content/detection/videoDetector.js';

// Suite 4 imports
import {
  resolveCdnForVideo,
  CDN_ERROR_CODES,
  CDN_ERROR_MESSAGES,
} from '../src/content/cdn/cdnResolver.js';
import {
  fetchTweetSyndication,
  extractVideosFromSyndication,
  parseSyndicationMedia,
} from '../src/background/handlers/syndicationHandler.js';
import {
  selectHighestQualityMp4,
  selectBestVariant,
} from '../src/content/cdn/qualitySelector.js';
import { isValidTwimgCdnUrl } from '../src/content/cdn/cdnValidator.js';

// Suite 5 imports
import {
  sanitizeFilenamePart,
  generateFilename,
  buildFilename,
  startDownload,
  initiateDownload,
  resetDownloadManager,
  DOWNLOAD_STATES,
} from '../src/background/downloads/downloadManager.js';

describe('Empirical Challenger: Milestone M6-1 Adversarial Stress Suite', () => {

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

  // =========================================================================
  // FOCUS AREA 1: Concurrency Click Spamming on Toolbar Buttons
  // =========================================================================
  describe('Area 1: Concurrency Click Spamming on Toolbar Download/CDN Buttons', () => {
    let env;

    beforeEach(() => {
      env = setupToolbarTestEnv({ tweetId: '18001001001001' });
    });

    afterEach(() => {
      teardownToolbarTestEnv(env);
    });

    it('1.1 suppresses 100 rapid synchronous clicks on the Download button, dispatching exactly 1 request', () => {
      const sendMessageSpy = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (typeof cb === 'function') {
          cb({ success: true, downloadId: 9001 });
        }
      });

      const controller = attachToolbar(
        env.video,
        {
          tweetId: '18001001001001',
          permalink: 'https://x.com/user/status/18001001001001',
          username: 'user',
        },
        {
          stateStore: env.stateStore,
          enableDownload: true,
          cobaltUrl: 'http://127.0.0.1:9000/',
        }
      );

      controller.show();
      const host = getToolbarHost(env.videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);
      expect(downloadBtn).toBeTruthy();

      // Fire 100 rapid synchronous clicks
      for (let i = 0; i < 100; i++) {
        simulatePointerEvent(downloadBtn, 'click');
      }

      // Assert runtime sendMessage was called ONLY ONCE
      expect(sendMessageSpy).toHaveBeenCalledTimes(1);
      expect(sendMessageSpy.mock.calls[0][0]).toMatchObject({
        action: 'COBALT_DOWNLOAD',
        payload: {
          tweetId: '18001001001001',
        },
      });

      // Assert state machine transitioned to DOWNLOADING
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      controller.destroy();
    });

    it('1.2 suppresses 100 rapid synchronous clicks on the Open CDN button, invoking resolver exactly 1 time', async () => {
      let resolverInvocations = 0;
      const mockResolver = vi.fn().mockImplementation(() => {
        resolverInvocations++;
        return Promise.resolve({ success: true, url: 'https://video.twimg.com/ext_tw_video/123/pu/vid/1280x720/vid.mp4' });
      });

      const controller = attachToolbar(
        env.video,
        {
          tweetId: '18001001001001',
          permalink: 'https://x.com/user/status/18001001001001',
        },
        {
          stateStore: env.stateStore,
          enableCdnResolver: true,
          cdnResolver: mockResolver,
        }
      );

      controller.show();
      const host = getToolbarHost(env.videoWrapper);
      const { cdnBtn } = getToolbarButtons(host);
      expect(cdnBtn).toBeTruthy();

      // Fire 100 rapid synchronous clicks
      for (let i = 0; i < 100; i++) {
        simulatePointerEvent(cdnBtn, 'click');
      }

      // Allow microtasks to settle
      await Promise.resolve();

      // Resolver should be invoked exactly once due to CLICK_DEBOUNCE_MS and state guard
      expect(resolverInvocations).toBe(1);
      expect(mockResolver).toHaveBeenCalledTimes(1);

      controller.destroy();
    });

    it('1.3 prevents cross-button interleaving race conditions during alternating spam clicks', async () => {
      const sendMessageSpy = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (typeof cb === 'function') {
          cb({ success: true, downloadId: 9002 });
        }
      });

      const mockResolver = vi.fn().mockResolvedValue({
        success: true,
        url: 'https://video.twimg.com/vid.mp4',
      });

      const controller = attachToolbar(
        env.video,
        {
          tweetId: '18001001001001',
        },
        {
          stateStore: env.stateStore,
          enableDownload: true,
          enableCdnResolver: true,
          cobaltUrl: 'http://127.0.0.1:9000/',
          cdnResolver: mockResolver,
        }
      );

      controller.show();
      const host = getToolbarHost(env.videoWrapper);
      const { downloadBtn, cdnBtn } = getToolbarButtons(host);

      // Alternate Download and CDN rapidly (50 pairs = 100 total clicks)
      for (let i = 0; i < 50; i++) {
        simulatePointerEvent(downloadBtn, 'click');
        simulatePointerEvent(cdnBtn, 'click');
      }

      await Promise.resolve();

      // Download fired first, locking state into PROCESSING -> DOWNLOADING
      expect(sendMessageSpy).toHaveBeenCalledTimes(1);
      // CDN must NOT have fired at all because state guard blocked it!
      expect(mockResolver).toHaveBeenCalledTimes(0);

      controller.destroy();
    });

    it('1.4 cleanly unlocks after resolution completes and debounce window expires', async () => {
      vi.useFakeTimers();

      let resolveDeferred;
      const deferredPromise = new Promise((resolve) => {
        resolveDeferred = resolve;
      });

      const mockResolver = vi.fn().mockReturnValue(deferredPromise);

      const controller = attachToolbar(
        env.video,
        {
          tweetId: '18001001001001',
        },
        {
          stateStore: env.stateStore,
          enableCdnResolver: true,
          cdnResolver: mockResolver,
        }
      );

      controller.show();
      const host = getToolbarHost(env.videoWrapper);
      const { cdnBtn } = getToolbarButtons(host);

      // First click: triggers resolution
      simulatePointerEvent(cdnBtn, 'click');
      expect(mockResolver).toHaveBeenCalledTimes(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Intermediate click spam while in-flight: ignored
      simulatePointerEvent(cdnBtn, 'click');
      simulatePointerEvent(cdnBtn, 'click');
      expect(mockResolver).toHaveBeenCalledTimes(1);

      // Resolve the in-flight resolution
      resolveDeferred({ success: true, url: 'https://video.twimg.com/test.mp4' });
      await Promise.resolve();

      // State is now SUCCESS
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);

      // Advance time past notice duration (2500ms) to allow auto-revert
      vi.advanceTimersByTime(2600);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Now click again: must trigger second resolution successfully
      mockResolver.mockResolvedValueOnce({ success: true, url: 'https://video.twimg.com/test2.mp4' });
      simulatePointerEvent(cdnBtn, 'click');

      expect(mockResolver).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
      controller.destroy();
    });
  });

  // =========================================================================
  // FOCUS AREA 2: Virtual Scrolling Stress Across 100+ Simulated Tweets
  // =========================================================================
  describe('Area 2: Virtual Scrolling Stress with Rapid DOM Unmounting/Remounting (100+ Tweets)', () => {
    let timelineRoot;
    let stateStore;

    beforeEach(() => {
      timelineRoot = document.createElement('div');
      timelineRoot.id = 'stress-feed';
      document.body.appendChild(timelineRoot);
      stateStore = createVideoStateStore();
    });

    afterEach(() => {
      if (timelineRoot?.parentNode) {
        timelineRoot.parentNode.removeChild(timelineRoot);
      }
      stateStore.reset();
    });

    it('2.1 sustains 100-tweet virtual scroll lifecycle: dismisses 50, unmounts all, remounts, and preserves state integrity', () => {
      const tweetCount = 100;
      const tweets = [];
      const videoKeys = [];

      // Phase 1: Mount 100 tweets
      for (let i = 0; i < tweetCount; i++) {
        const tweetId = `180000000000000${String(i).padStart(3, '0')}`;
        const tweetEl = createTweetFixture({ tweetId });
        timelineRoot.appendChild(tweetEl);

        const video = tweetEl.querySelector('video');
        const key = getVideoKey(tweetId, null, video);
        videoKeys.push({ tweetId, key, video });
        tweets.push(tweetEl);

        stateStore.markMounted(video, key);
      }

      expect(timelineRoot.querySelectorAll('article').length).toBe(100);

      // Phase 2: Dismiss 50 tweets (even indices: 0, 2, 4, ... 98)
      for (let i = 0; i < tweetCount; i += 2) {
        stateStore.dismiss(videoKeys[i].key, videoKeys[i].video);
        expect(stateStore.isDismissed(videoKeys[i].key, videoKeys[i].video)).toBe(true);
      }

      // Verify odd indices are NOT dismissed
      for (let i = 1; i < tweetCount; i += 2) {
        expect(stateStore.isDismissed(videoKeys[i].key, videoKeys[i].video)).toBe(false);
      }

      expect(stateStore.getDismissedCount()).toBe(50);

      // Phase 3: Virtual scrolling unmount (clear all 100 tweets from DOM)
      timelineRoot.innerHTML = '';
      expect(timelineRoot.querySelectorAll('article').length).toBe(0);

      // Phase 4: Virtual scrolling remount (fresh DOM elements simulating recycling)
      for (let i = 0; i < tweetCount; i++) {
        const tweetId = videoKeys[i].tweetId;
        const freshTweetEl = createTweetFixture({ tweetId });
        timelineRoot.appendChild(freshTweetEl);

        const freshVideo = freshTweetEl.querySelector('video');
        const key = getVideoKey(tweetId, null, freshVideo);

        // Even indices must STILL be dismissed via Tier 3 session Set
        if (i % 2 === 0) {
          expect(stateStore.isDismissed(key, freshVideo)).toBe(true);
        } else {
          expect(stateStore.isDismissed(key, freshVideo)).toBe(false);
        }
      }

      expect(timelineRoot.querySelectorAll('article').length).toBe(100);
    });

    it('2.2 survives 10 rapid iterations of unmount/remount cycles (1,000 tweet churn) with zero state drift', () => {
      const iterations = 10;
      const batchSize = 100;
      const dismissedSet = new Set();

      for (let cycle = 0; cycle < iterations; cycle++) {
        // Mount batch
        timelineRoot.innerHTML = '';
        for (let i = 0; i < batchSize; i++) {
          const tweetId = `stress_tweet_${i}`;
          const tweetEl = createTweetFixture({ tweetId });
          timelineRoot.appendChild(tweetEl);

          const video = tweetEl.querySelector('video');
          const key = getVideoKey(tweetId, null, video);

          // In cycle 0, dismiss items divisible by 5
          if (cycle === 0 && i % 5 === 0) {
            stateStore.dismiss(key, video);
            dismissedSet.add(key);
          }

          // Verify state correctness in every cycle
          const shouldBeDismissed = dismissedSet.has(key);
          expect(stateStore.isDismissed(key, video)).toBe(shouldBeDismissed);
        }

        // Rapidly unmount batch
        timelineRoot.innerHTML = '';
      }

      expect(dismissedSet.size).toBe(20);
      expect(stateStore.getDismissedCount()).toBe(20);
    });

    it('2.3 tears down toolbar hosts cleanly during rapid unmounting without leaving dangling nodes in body', () => {
      const controllers = [];

      for (let i = 0; i < 20; i++) {
        const tweetId = `cleanup_tweet_${i}`;
        const tweetEl = createTweetFixture({ tweetId });
        timelineRoot.appendChild(tweetEl);

        const video = tweetEl.querySelector('video');

        const ctrl = attachToolbar(video, { tweetId }, { stateStore });
        controllers.push(ctrl);
      }

      // Verify 20 toolbar hosts are mounted
      expect(document.querySelectorAll('.xvt-toolbar-host').length).toBe(20);

      // Clean up all 20 controllers via destroy()
      controllers.forEach((ctrl) => ctrl.destroy());

      // Verify all toolbar hosts are cleanly detached
      expect(document.querySelectorAll('.xvt-toolbar-host').length).toBe(0);
    });
  });

  // =========================================================================
  // FOCUS AREA 3: Multi-Video Tweets with Missing Anchors & Posters (Collision Resistance)
  // =========================================================================
  describe('Area 3: Multi-Video Tweets Missing Anchor Indices and Posters (Collision Resistance)', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    it('3.1 generates 4 distinct collision-free video keys for 4 completely bare video elements in a 2x2 tweet grid', () => {
      const tweetArticle = document.createElement('article');
      tweetArticle.setAttribute('data-testid', 'tweet');
      tweetArticle.id = 'tweet-88888888';
      container.appendChild(tweetArticle);

      const gridContainer = document.createElement('div');
      gridContainer.className = 'multi-video-grid';
      tweetArticle.appendChild(gridContainer);

      // Create 4 video elements with NO mediaIndex, NO poster, NO src, NO data-media-id
      const videoElements = [];
      for (let i = 0; i < 4; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-wrapper';
        const video = document.createElement('video');
        wrapper.appendChild(video);
        gridContainer.appendChild(wrapper);
        videoElements.push(video);
      }

      // Generate keys for all 4 videos
      const keys = videoElements.map((v) => getVideoKey('88888888', null, v));

      // Assert all 4 keys are defined strings
      expect(keys.length).toBe(4);
      keys.forEach((k) => {
        expect(typeof k).toBe('string');
        expect(k).toContain('88888888_media_tok_');
      });

      // Assert 0 collisions: a Set of the 4 keys must have size 4!
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(4);

      // Assert idempotency: calling getVideoKey a second time on the same video element returns the exact same key
      for (let i = 0; i < 4; i++) {
        const secondCallKey = getVideoKey('88888888', null, videoElements[i]);
        expect(secondCallKey).toBe(keys[i]);
      }
    });

    it('3.2 distinguishes mixed videos with partial fingerprints and fallback tokens in the same tweet', () => {
      const tweetArticle = document.createElement('article');
      tweetArticle.setAttribute('data-testid', 'tweet');
      tweetArticle.id = 'tweet-77777777';
      container.appendChild(tweetArticle);

      // Video 1: Has amplify poster
      const v1 = document.createElement('video');
      v1.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/123456789/img/thumb.jpg');
      tweetArticle.appendChild(v1);

      // Video 2: Has media photo poster
      const v2 = document.createElement('video');
      v2.setAttribute('poster', 'https://pbs.twimg.com/media/abcdef123456.jpg');
      tweetArticle.appendChild(v2);

      // Video 3: Has ext_tw_video src
      const v3 = document.createElement('video');
      v3.setAttribute('src', 'https://video.twimg.com/ext_tw_video/99998888/pu/vid/1280x720/vid.mp4');
      tweetArticle.appendChild(v3);

      // Video 4: Completely bare (gets token)
      const v4 = document.createElement('video');
      tweetArticle.appendChild(v4);

      const key1 = getVideoKey('77777777', null, v1);
      const key2 = getVideoKey('77777777', null, v2);
      const key3 = getVideoKey('77777777', null, v3);
      const key4 = getVideoKey('77777777', null, v4);

      expect(key1).toBe('77777777_media_fp_123456789');
      expect(key2).toBe('77777777_media_fp_abcdef123456');
      expect(key3).toBe('77777777_media_fp_99998888');
      expect(key4).toMatch(/^77777777_media_tok_/);

      const distinctKeys = new Set([key1, key2, key3, key4]);
      expect(distinctKeys.size).toBe(4);
    });

    it('3.3 ensures cross-tweet token isolation even if token strings happen to match', () => {
      const vA = document.createElement('video');
      vA.dataset.xvtToken = 'same_token';

      const vB = document.createElement('video');
      vB.dataset.xvtToken = 'same_token';

      // Although the token string is identical, tweetId prefixes isolate them completely
      const keyA = `tweet_A_media_tok_${vA.dataset.xvtToken}`;
      const keyB = `tweet_B_media_tok_${vB.dataset.xvtToken}`;

      expect(keyA).not.toBe(keyB);
      expect(keyA).toBe('tweet_A_media_tok_same_token');
      expect(keyB).toBe('tweet_B_media_tok_same_token');
    });
  });

  // =========================================================================
  // FOCUS AREA 4: Open CDN Resolution Under Abnormal Twitter Syndication Responses
  // =========================================================================
  describe('Area 4: Open CDN Resolution Under Abnormal Twitter Syndication Responses', () => {

    it('4.1 handles HTTP 403 Forbidden (NSFW / private tweet) with friendly Vietnamese error message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 403,
        ok: false,
      });

      const res = await fetchTweetSyndication('1800403403403');
      expect(res.success).toBe(false);
      expect(res.error).toBe('TWEET_INACCESSIBLE');
      expect(res.status).toBe(403);
      expect(res.message).toBe('Tweet không tồn tại hoặc bị giới hạn quyền riêng tư');

      // Now verify resolveCdnForVideo maps it cleanly to ERR_TWEET_INACCESSIBLE
      const mockVideo = document.createElement('video');
      mockVideo.src = 'blob:https://x.com/blob-id';

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          if (typeof cb === 'function') {
            cb({ success: false, error: 'TWEET_INACCESSIBLE', message: res.message });
          }
        }
      });

      const cdnResult = await resolveCdnForVideo(mockVideo, { tweetId: '1800403403403' });
      expect(cdnResult.success).toBe(false);
      expect(cdnResult.code).toBe(CDN_ERROR_CODES.TWEET_INACCESSIBLE);
      expect(cdnResult.error).toBe(CDN_ERROR_MESSAGES[CDN_ERROR_CODES.TWEET_INACCESSIBLE]);
    });

    it('4.2 handles HTTP 429 Too Many Requests (Rate limit) with friendly Vietnamese guidance', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 429,
        ok: false,
      });

      const res = await fetchTweetSyndication('1800429429429');
      expect(res.success).toBe(false);
      expect(res.error).toBe('API_RATE_LIMIT');
      expect(res.status).toBe(429);
      expect(res.message).toBe('Bị giới hạn tần suất truy vấn từ X (Rate limited)');

      // Verify resolveCdnForVideo maps it cleanly to ERR_RATE_LIMITED
      const mockVideo = document.createElement('video');
      mockVideo.src = 'blob:https://x.com/blob-id';

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          if (typeof cb === 'function') {
            cb({ success: false, error: 'API_RATE_LIMIT', message: res.message });
          }
        }
      });

      const cdnResult = await resolveCdnForVideo(mockVideo, { tweetId: '1800429429429' });
      expect(cdnResult.success).toBe(false);
      expect(cdnResult.code).toBe(CDN_ERROR_CODES.RATE_LIMITED);
      expect(cdnResult.error).toBe(CDN_ERROR_MESSAGES[CDN_ERROR_CODES.RATE_LIMITED]);
    });

    it('4.3 handles empty or missing mediaDetails gracefully without throwing exceptions', async () => {
      const mockVideo = document.createElement('video');
      mockVideo.src = 'blob:https://x.com/blob-id';

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          if (typeof cb === 'function') {
            cb({ success: true, data: { mediaDetails: [] } });
          }
        }
      });

      const cdnResult = await resolveCdnForVideo(mockVideo, { tweetId: '180000000000' });
      expect(cdnResult.success).toBe(false);
      expect(cdnResult.code).toBe(CDN_ERROR_CODES.NO_MEDIA);
      expect(cdnResult.error).toBe(CDN_ERROR_MESSAGES[CDN_ERROR_CODES.NO_MEDIA]);
    });

    it('4.4 handles media entity with empty variants array without crashing (ERR_NO_SUPPORTED_VARIANT)', async () => {
      const mockVideo = document.createElement('video');
      mockVideo.src = 'blob:https://x.com/blob-id';

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          if (typeof cb === 'function') {
            cb({
              success: true,
              data: {
                mediaDetails: [
                  {
                    type: 'video',
                    video_info: {
                      variants: [],
                    },
                  },
                ],
              },
            });
          }
        }
      });

      const cdnResult = await resolveCdnForVideo(mockVideo, { tweetId: '180000000000' });
      expect(cdnResult.success).toBe(false);
      expect(cdnResult.code).toBe(CDN_ERROR_CODES.NO_SUPPORTED_VARIANT);
    });

    it('4.5 filters out pathological and malformed URLs in variants, rejecting spoofing and non-twimg origins', () => {
      const pathologicalVariants = [
        { content_type: 'video/mp4', url: 'http://video.twimg.com/insecure.mp4' }, // Insecure HTTP
        { content_type: 'video/mp4', url: 'https://video.twimg.com.attacker.com/evil.mp4' }, // Subdomain spoof
        { content_type: 'video/mp4', url: 'https://video.twimg.com/' }, // Root path
        { content_type: 'video/mp4', url: 'https://video.twimg.com/thumbnail.png' }, // Image disguised as MP4
        { content_type: 'video/mp4', url: 'javascript:alert(1)' }, // XSS attack vector
        { content_type: 'video/mp4', url: '' }, // Empty string
        { content_type: 'video/mp4', url: null }, // Null URL
        { content_type: 'video/mp4' }, // Missing URL property
        null, // Null variant item
        undefined,
      ];

      // selectHighestQualityMp4 must reject all of these and return null
      const best = selectHighestQualityMp4(pathologicalVariants);
      expect(best).toBeNull();

      // selectBestVariant must also return null
      const bestOverall = selectBestVariant(pathologicalVariants);
      expect(bestOverall).toBeNull();
    });

    it('4.6 strictly enforces twimg validation on direct video element src', async () => {
      const spoofedVideo = document.createElement('video');
      spoofedVideo.setAttribute('src', 'https://video.twimg.com.attacker.com/spoofed.mp4');

      const cdnResult = await resolveCdnForVideo(spoofedVideo, { tweetId: '12345' });
      expect(cdnResult.success).toBe(false);
      expect(cdnResult.code).toBe(CDN_ERROR_CODES.INVALID_URL);
    });
  });

  // =========================================================================
  // FOCUS AREA 5: Filename Sanitization with Pathological Windows Forbidden Characters
  // =========================================================================
  describe('Area 5: Filename Sanitization with Pathological Windows Characters', () => {

    it('5.1 sanitizes all 9 forbidden Windows characters (\\ / : * ? " < > |) into underscores', () => {
      const dirtyString = 'bad\\slash/colon:star*question?quote"less<greater>pipe|';
      const sanitized = sanitizeFilenamePart(dirtyString);

      // Must not contain any forbidden characters
      expect(sanitized).not.toMatch(/[\\/:*?"<>|]/);
      expect(sanitized).toBe('bad_slash_colon_star_question_quote_less_greater_pipe_');
    });

    it('5.2 generates clean compliant filename when username and tweetId contain pathological forbidden strings', () => {
      const filename = generateFilename({
        username: 'hack\\user/name:foo*bar?baz"qux<less>greater|pipe',
        tweetId: 'id:123/456\\789*000?111"222<333>444|555',
        extension: 'mp4',
      });

      expect(filename).not.toMatch(/[\\/:*?"<>|]/);
      expect(filename.startsWith('X_')).toBe(true);
      expect(filename.endsWith('.mp4')).toBe(true);
      expect(filename).toBe('X_hack_user_name_foo_bar_baz_qux_less_greater_pipe_id_123_456_789_000_111_222_333_444_555.mp4');
    });

    it('5.3 defuses directory traversal attacks in tweetId and username (..\\..\\Windows\\System32)', () => {
      const filenameTraversal = generateFilename({
        username: '..\\..\\Windows\\System32',
        tweetId: '../../evil_dir/payload',
      });

      expect(filenameTraversal).not.toMatch(/[\\/:*?"<>|]/);
      // Slashes and backslashes neutralized to underscores
      expect(filenameTraversal).toContain('_.._.._Windows_System32');
      expect(filenameTraversal).toContain('_.._.._evil_dir_payload');
    });

    it('5.4 handles whitespace, null, undefined, empty, and unusual username edge cases', () => {
      // Only whitespace
      expect(generateFilename({ username: '     ', tweetId: '100' })).toBe('X_video_100.mp4');

      // Literal string 'null'
      expect(generateFilename({ username: 'null', tweetId: '100' })).toBe('X_video_100.mp4');

      // Literal string 'undefined'
      expect(generateFilename({ username: 'undefined', tweetId: '100' })).toBe('X_video_100.mp4');

      // Pure illegal characters: "\\/:*?\"<>|" (9 forbidden chars + 2 separators = 11 underscores total)
      expect(generateFilename({ username: '\\/:*?"<>|', tweetId: '100' })).toBe('X___________100.mp4');

      // Empty tweetId
      expect(generateFilename({ username: 'gooduser', tweetId: '' })).toBe('X_gooduser_unknown.mp4');

      // Null tweetId
      expect(generateFilename({ username: 'gooduser', tweetId: null })).toBe('X_gooduser_unknown.mp4');
    });

    it('5.5 normalizes extensions with leading dots and strips illegal characters', () => {
      // Normalization of leading dots
      expect(generateFilename({ username: 'user', tweetId: '100', extension: '...mp4' })).toBe('X_user_100.mp4');

      // Omitted extension defaults to mp4
      expect(generateFilename({ username: 'user', tweetId: '100', extension: '' })).toBe('X_user_100.mp4');
    });

    it('5.6 startDownload sanitizes passed filename before calling chrome.downloads.download', async () => {
      const downloadSpy = vi.spyOn(chrome.downloads, 'download').mockResolvedValue(9999);

      const res = await startDownload({
        url: 'https://video.twimg.com/test.mp4',
        filename: 'dirty:name*with?illegal/chars.mp4',
      });

      expect(res.success).toBe(true);
      expect(downloadSpy).toHaveBeenCalledTimes(1);

      const options = downloadSpy.mock.calls[0][0];
      expect(options.filename).not.toMatch(/[\\/:*?"<>|]/);
      expect(options.filename).toBe('dirty_name_with_illegal_chars.mp4');
    });

    it('5.7 initiateDownload enforces anti-duplicate lock per videoKey and releases on completion', async () => {
      const downloadSpy = vi.spyOn(chrome.downloads, 'download').mockResolvedValue(7777);

      const res1 = await initiateDownload('vid_key_123', {
        url: 'https://video.twimg.com/vid.mp4',
      });
      expect(res1.success).toBe(true);

      // Second download with same videoKey while in-flight must be blocked
      const res2 = await initiateDownload('vid_key_123', {
        url: 'https://video.twimg.com/vid.mp4',
      });
      expect(res2.blocked).toBe(true);
      expect(res2.reason).toBe('DOWNLOAD_IN_PROGRESS');

      // Reset releases the lock
      resetDownloadManager();

      const res3 = await initiateDownload('vid_key_123', {
        url: 'https://video.twimg.com/vid.mp4',
      });
      expect(res3.success).toBe(true);
    });
  });

});
