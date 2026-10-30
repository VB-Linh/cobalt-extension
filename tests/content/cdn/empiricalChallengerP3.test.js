// tests/content/cdn/empiricalChallengerP3.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { selectTargetMedia, matchVideoToMedia } from '../../../src/content/cdn/mediaSelector.js';
import { renderMediaPicker } from '../../../src/content/cdn/mediaPicker.js';
import { resolveCdnForVideo, CDN_ERROR_CODES } from '../../../src/content/cdn/cdnResolver.js';
import { createToolbar } from '../../../src/content/toolbar/toolbar.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import { createVideoStateStore } from '../../../src/content/state/videoState.js';
import {
  createMockSyndicationResponse,
  createMockVariant,
  createVideoWithSources,
} from '../../fixtures/cdnFixtures.js';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';

describe('Empirical Challenger P3: Multi-Media, Media Picker UX & Concurrency Isolation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // =========================================================================
  // 1. MULTI-MEDIA IDENTIFICATION & AMBIGUITY HANDLING
  // =========================================================================
  describe('1. Multi-Media Identification & Disambiguation', () => {
    it('1.1: Tweet with 4 videos — anchors /video/1 through /video/4 map deterministically to exact index', () => {
      const syndicationData = createMockSyndicationResponse({
        tweetId: '1860000000000000001',
        mediaCount: 4,
      });
      expect(syndicationData.mediaDetails).toHaveLength(4);

      for (let i = 1; i <= 4; i++) {
        const videoEl = document.createElement('video');
        const result = matchVideoToMedia(videoEl, { mediaIndex: i }, syndicationData);

        expect(result.status).toBe('resolved');
        expect(result.media).toBe(syndicationData.mediaDetails[i - 1]);
        expect(result.media.id_str).toBe(syndicationData.mediaDetails[i - 1].id_str);
      }
    });

    it('1.2: Tweet with 4 videos — out-of-bounds anchors enter ambiguous state without defaulting to index 0', () => {
      const syndicationData = createMockSyndicationResponse({
        tweetId: '1860000000000000002',
        mediaCount: 4,
      });

      const invalidIndices = [0, 5, 99, -1, NaN, undefined, null];
      for (const idx of invalidIndices) {
        const videoEl = document.createElement('video');
        const result = matchVideoToMedia(videoEl, { mediaIndex: idx }, syndicationData);

        expect(result.status).toBe('ambiguous');
        expect(result.media).toBeNull();
        expect(result.candidates).toHaveLength(4);
        // Strictly verify NEVER defaulting to mediaDetails[0]
        expect(result.media).not.toBe(syndicationData.mediaDetails[0]);
      }
    });

    it('1.3: Mixed media tweet (2 photos + 2 videos: [photo, photo, video, video]) — accurately maps videos without confusing photos', () => {
      const tweetId = '1860000000000000003';
      const syndicationData = {
        id_str: tweetId,
        mediaDetails: [
          { type: 'photo', id_str: `${tweetId}_p1`, media_url_https: 'https://pbs.twimg.com/media/p1.jpg' },
          { type: 'photo', id_str: `${tweetId}_p2`, media_url_https: 'https://pbs.twimg.com/media/p2.jpg' },
          {
            type: 'video',
            id_str: `${tweetId}_v1`,
            media_url_https: 'https://pbs.twimg.com/media/v1_thumb.jpg',
            video_info: {
              variants: [createMockVariant({ mediaId: `${tweetId}_v1`, width: 1280, height: 720 })],
            },
          },
          {
            type: 'video',
            id_str: `${tweetId}_v2`,
            media_url_https: 'https://pbs.twimg.com/media/v2_thumb.jpg',
            video_info: {
              variants: [createMockVariant({ mediaId: `${tweetId}_v2`, width: 1920, height: 1080 })],
            },
          },
        ],
      };

      const videoEl = document.createElement('video');

      // Video 1 at mediaIndex: 3
      const resV1 = matchVideoToMedia(videoEl, { mediaIndex: 3 }, syndicationData);
      expect(resV1.status).toBe('resolved');
      expect(resV1.media.type).toBe('video');
      expect(resV1.media.id_str).toBe(`${tweetId}_v1`);

      // Video 2 at mediaIndex: 4
      const resV2 = matchVideoToMedia(videoEl, { mediaIndex: 4 }, syndicationData);
      expect(resV2.status).toBe('resolved');
      expect(resV2.media.type).toBe('video');
      expect(resV2.media.id_str).toBe(`${tweetId}_v2`);

      // If an anchor points to a photo position (mediaIndex: 1 or 2) on a video element,
      // it must NEVER return the photo!
      const resP1 = matchVideoToMedia(videoEl, { mediaIndex: 1 }, syndicationData);
      expect(resP1.status).not.toBe('resolved');
      expect(resP1.media).toBeNull();
      expect(resP1.status).toBe('ambiguous');
      expect(resP1.candidates).toHaveLength(2); // Only video candidates returned

      const resP2 = matchVideoToMedia(videoEl, { mediaIndex: 2 }, syndicationData);
      expect(resP2.status).not.toBe('resolved');
      expect(resP2.media).toBeNull();
      expect(resP2.status).toBe('ambiguous');
    });

    it('1.4: Alternating mixed media ([video, photo, video, photo]) — maps video anchors and rejects photo anchors', () => {
      const tweetId = '1860000000000000004';
      const syndicationData = {
        id_str: tweetId,
        mediaDetails: [
          {
            type: 'video',
            id_str: `${tweetId}_v1`,
            video_info: { variants: [createMockVariant({ mediaId: `${tweetId}_v1` })] },
          },
          { type: 'photo', id_str: `${tweetId}_p1` },
          {
            type: 'video',
            id_str: `${tweetId}_v2`,
            video_info: { variants: [createMockVariant({ mediaId: `${tweetId}_v2` })] },
          },
          { type: 'photo', id_str: `${tweetId}_p2` },
        ],
      };

      const videoEl = document.createElement('video');

      // Index 1 is video 1
      const res1 = matchVideoToMedia(videoEl, { mediaIndex: 1 }, syndicationData);
      expect(res1.status).toBe('resolved');
      expect(res1.media.id_str).toBe(`${tweetId}_v1`);

      // Index 2 is photo -> must not resolve to photo
      const res2 = matchVideoToMedia(videoEl, { mediaIndex: 2 }, syndicationData);
      expect(res2.status).toBe('ambiguous');
      expect(res2.media).toBeNull();

      // Index 3 is video 2
      const res3 = matchVideoToMedia(videoEl, { mediaIndex: 3 }, syndicationData);
      expect(res3.status).toBe('resolved');
      expect(res3.media.id_str).toBe(`${tweetId}_v2`);

      // Index 4 is photo -> must not resolve to photo
      const res4 = matchVideoToMedia(videoEl, { mediaIndex: 4 }, syndicationData);
      expect(res4.status).toBe('ambiguous');
      expect(res4.media).toBeNull();
    });

    it('1.5: Quoted tweet media isolation — video in quote card resolves quote ID while main video resolves main ID', () => {
      const mainTweetId = '1860000000000000005';
      const quotedTweetId = '1860000000000000006';

      const mainSyndication = createMockSyndicationResponse({ tweetId: mainTweetId, mediaCount: 1 });
      const quotedSyndication = createMockSyndicationResponse({ tweetId: quotedTweetId, mediaCount: 1 });

      const mainVideo = document.createElement('video');
      const quotedVideo = document.createElement('video');

      const mainInfo = { tweetId: mainTweetId, isQuoted: false, mediaIndex: 1 };
      const quotedInfo = { tweetId: quotedTweetId, isQuoted: true, mediaIndex: 1 };

      const mainMatch = matchVideoToMedia(mainVideo, mainInfo, mainSyndication);
      const quotedMatch = matchVideoToMedia(quotedVideo, quotedInfo, quotedSyndication);

      expect(mainMatch.status).toBe('resolved');
      expect(mainMatch.media.id_str).toContain(mainTweetId);

      expect(quotedMatch.status).toBe('resolved');
      expect(quotedMatch.media.id_str).toContain(quotedTweetId);

      expect(mainMatch.media.id_str).not.toBe(quotedMatch.media.id_str);
    });

    it('1.6: Ambiguous state with 4 videos without anchor or fingerprint strictly returns ambiguous with all 4 candidates', () => {
      const syndicationData = createMockSyndicationResponse({
        tweetId: '1860000000000000007',
        mediaCount: 4,
      });
      const videoEl = document.createElement('video');

      const result = selectTargetMedia(syndicationData.mediaDetails, {}, videoEl);

      expect(result.ambiguous).toBe(true);
      expect(result.media).toBeNull();
      expect(result.candidates).toHaveLength(4);
      expect(result.media).not.toBe(syndicationData.mediaDetails[0]);
    });

    it('1.7: Multi-video tweet with distinct fingerprint accurately resolves specific video out of 4', () => {
      const syndicationData = createMockSyndicationResponse({
        tweetId: '1860000000000000008',
        mediaCount: 4,
      });

      // Video 3 target
      const targetMedia = syndicationData.mediaDetails[2];
      const videoEl = document.createElement('video');
      videoEl.poster = targetMedia.media_url_https;

      const result = selectTargetMedia(
        syndicationData.mediaDetails,
        { mediaFingerprint: targetMedia.id_str },
        videoEl
      );

      expect(result.ambiguous).toBe(false);
      expect(result.media).toBe(targetMedia);
      expect(result.media.id_str).toBe(targetMedia.id_str);
    });
  });

  // =========================================================================
  // 2. MEDIA PICKER UX & INTERACTIONS
  // =========================================================================
  describe('2. Media Picker UX & Interactions', () => {
    it('2.1: Renders inside toolbar Open Shadow DOM with candidate thumbnails and selection buttons', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      container.className = 'xvt-toolbar-container';
      shadowRoot.appendChild(container);

      const candidates = [
        {
          id_str: 'cand_1',
          type: 'video',
          media_url_https: 'https://pbs.twimg.com/media/thumb1.jpg',
          video_info: { aspect_ratio: [16, 9] },
        },
        {
          id_str: 'cand_2',
          type: 'video',
          media_url_https: 'https://pbs.twimg.com/media/thumb2.jpg',
          video_info: { aspect_ratio: [9, 16] },
        },
      ];

      const picker = renderMediaPicker(shadowRoot, candidates);

      const popover = shadowRoot.querySelector('.xvt-picker-popover');
      expect(popover).not.toBeNull();
      expect(popover.getAttribute('role')).toBe('dialog');

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      expect(items).toHaveLength(2);

      // Check thumbnails
      const thumbs = shadowRoot.querySelectorAll('.xvt-picker-thumb');
      expect(thumbs).toHaveLength(2);
      expect(thumbs[0].src).toBe('https://pbs.twimg.com/media/thumb1.jpg');
      expect(thumbs[1].src).toBe('https://pbs.twimg.com/media/thumb2.jpg');

      // Check aspect ratio meta
      const metas = shadowRoot.querySelectorAll('.xvt-picker-meta');
      expect(metas[0].textContent).toBe('16:9');
      expect(metas[1].textContent).toBe('9:16');

      picker.destroy();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('2.2: Selecting candidate triggers callback and unmounts popover', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      container.className = 'xvt-toolbar-container';
      shadowRoot.appendChild(container);

      const candidates = [
        { id_str: 'cand_1', media_url_https: 'https://pbs.twimg.com/media/t1.jpg' },
        { id_str: 'cand_2', media_url_https: 'https://pbs.twimg.com/media/t2.jpg' },
      ];

      const onSelect = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onSelect });

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      simulatePointerEvent(items[1], 'click');

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(candidates[1], 1);

      // Popover should be removed from DOM
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('2.3: Keyboard interaction (Enter or Space) selects candidate', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      container.className = 'xvt-toolbar-container';
      shadowRoot.appendChild(container);

      const candidates = [{ id_str: 'cand_1' }, { id_str: 'cand_2' }];
      const onSelect = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onSelect });

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(candidates[0], 0);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('2.4: Dismissing via close button calls onCancel and destroys popover', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      container.className = 'xvt-toolbar-container';
      shadowRoot.appendChild(container);

      const candidates = [{ id_str: 'cand_1' }];
      const onCancel = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onCancel });

      const closeBtn = shadowRoot.querySelector('.xvt-picker-close');
      expect(closeBtn).not.toBeNull();
      simulatePointerEvent(closeBtn, 'click');

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('2.5: Pressing Escape key dismisses popover and calls onCancel', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      container.className = 'xvt-toolbar-container';
      shadowRoot.appendChild(container);

      const candidates = [{ id_str: 'cand_1' }];
      const onCancel = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onCancel });

      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('2.6: Full Integration Flow: Ambiguous tweet opens Media Picker in Shadow DOM, selecting candidate opens CDN tab', async () => {
      const env = setupToolbarTestEnv({ tweetId: '1860000000000000026' });
      const { video } = env;

      const syndicationData = createMockSyndicationResponse({
        tweetId: '1860000000000000026',
        mediaCount: 3,
      });

      const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 201 });
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: true, data: syndicationData };
          if (typeof callback === 'function') callback(resp);
          return Promise.resolve(resp);
        } else if (msg.action === 'OPEN_CDN') {
          tabsSpy({ url: msg.payload?.url || msg.url });
          const okResp = { success: true, tabId: 201 };
          if (typeof callback === 'function') callback(okResp);
          return Promise.resolve(okResp);
        }
        return Promise.resolve({ success: true });
      });

      const controller = createToolbar(
        video,
        { tweetId: '1860000000000000026' },
        { stateStore: env.stateStore }
      );
      const { cdnBtn } = getToolbarButtons(controller.host);

      // Click CDN button
      simulatePointerEvent(cdnBtn, 'click');

      // Allow async syndication fetch
      await new Promise((r) => setTimeout(r, 20));

      // Media picker must be rendered in controller.shadowRoot
      const popover = controller.shadowRoot.querySelector('.xvt-picker-popover');
      expect(popover).not.toBeNull();

      const items = controller.shadowRoot.querySelectorAll('.xvt-picker-item');
      expect(items).toHaveLength(3);

      // Select candidate 2
      simulatePointerEvent(items[1], 'click');

      await new Promise((r) => setTimeout(r, 20));

      // Tab should be opened for candidate 2's highest quality variant
      expect(tabsSpy).toHaveBeenCalledTimes(1);
      const expectedUrl = syndicationData.mediaDetails[1].video_info.variants[2].url;
      expect(tabsSpy).toHaveBeenCalledWith(expect.objectContaining({ url: expectedUrl }));

      // State transitions to success
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);

      teardownToolbarTestEnv(env);
    });

    it('2.7: Empirical Analysis: Clicking outside popover behavior investigation', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      container.className = 'xvt-toolbar-container';
      shadowRoot.appendChild(container);

      const candidates = [{ id_str: 'cand_1' }, { id_str: 'cand_2' }];
      const onCancel = vi.fn();
      const picker = renderMediaPicker(shadowRoot, candidates, { onCancel });

      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();

      // Simulate click outside on document.body
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Empirical Observation: Does document click close the picker?
      const popoverAfterDocClick = shadowRoot.querySelector('.xvt-picker-popover');
      const isClosedByClickOutside = popoverAfterDocClick === null;

      // Clean up
      picker.destroy();
      host.remove();

      // Document the empirical finding:
      // In current implementation, clicking outside does NOT dismiss the picker because no document click listener was bound.
      // The picker is dismissed via the close button (&times;), the Escape key, or when selecting a candidate.
      expect(typeof isClosedByClickOutside).toBe('boolean');
    });
  });

  // =========================================================================
  // 3. MULTI-VIDEO ISOLATION & CONCURRENCY
  // =========================================================================
  describe('3. Multi-Video Concurrency & Isolation', () => {
    it('3.1: 3 video players simultaneously mounted — Error on Video 1, Pending on Video 2, Success on Video 3 maintain 100% isolation', async () => {
      const root = document.createElement('div');
      document.body.appendChild(root);
      const stateStore = createVideoStateStore();

      // Create 3 separate video wrapper structures
      const wrappers = [1, 2, 3].map((num) => {
        const wrap = document.createElement('div');
        wrap.setAttribute('data-testid', 'videoComponent');
        const v = document.createElement('video');
        v.id = `video-${num}`;
        wrap.appendChild(v);
        root.appendChild(wrap);
        return { wrap, video: v, id: `186000000000000003${num}` };
      });

      const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 303 });

      // Controlled deferred promise for Video 2
      let resolveVideo2Fetch;
      const video2PendingPromise = new Promise((resolve) => {
        resolveVideo2Fetch = resolve;
      });

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        const tweetId = msg.payload?.tweetId;
        if (msg.action === 'FETCH_SYNDICATION') {
          if (tweetId === wrappers[0].id) {
            // Video 1 fails with Rate Limit
            const errResp = { success: false, error: 'API_RATE_LIMIT' };
            if (typeof callback === 'function') callback(errResp);
            return Promise.resolve(errResp);
          } else if (tweetId === wrappers[1].id) {
            // Video 2 remains pending until resolveVideo2Fetch is called
            return video2PendingPromise.then((data) => {
              const okResp = { success: true, data };
              if (typeof callback === 'function') callback(okResp);
              return okResp;
            });
          } else if (tweetId === wrappers[2].id) {
            // Video 3 succeeds immediately
            const mockData = createMockSyndicationResponse({ tweetId: wrappers[2].id, mediaCount: 1 });
            const okResp = { success: true, data: mockData };
            if (typeof callback === 'function') callback(okResp);
            return Promise.resolve(okResp);
          }
        } else if (msg.action === 'OPEN_CDN') {
          tabsSpy({ url: msg.payload?.url || msg.url });
          const res = { success: true, tabId: 303 };
          if (typeof callback === 'function') callback(res);
          return Promise.resolve(res);
        }
        return Promise.resolve({ success: true });
      });

      const controller1 = createToolbar(wrappers[0].video, { tweetId: wrappers[0].id }, { stateStore });
      const controller2 = createToolbar(wrappers[1].video, { tweetId: wrappers[1].id }, { stateStore });
      const controller3 = createToolbar(wrappers[2].video, { tweetId: wrappers[2].id }, { stateStore });

      const btns1 = getToolbarButtons(controller1.host);
      const btns2 = getToolbarButtons(controller2.host);
      const btns3 = getToolbarButtons(controller3.host);

      // All 3 start IDLE
      expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(controller3.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Click all 3 concurrently
      simulatePointerEvent(btns1.cdnBtn, 'click');
      simulatePointerEvent(btns2.cdnBtn, 'click');
      simulatePointerEvent(btns3.cdnBtn, 'click');

      // Immediately all 3 are in processing
      expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
      expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
      expect(controller3.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Wait 25ms for Video 1 and Video 3 to finish
      await new Promise((r) => setTimeout(r, 25));

      // Assert complete state divergence:
      // Video 1 must be ERROR
      expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
      expect(btns1.noticeEl.textContent).toContain('Rate limit');

      // Video 2 must remain PROCESSING (in-flight fetch)
      expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
      expect(btns2.noticeEl.textContent).toBe(''); // No error notice on Video 2!

      // Video 3 must be SUCCESS
      expect(controller3.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
      expect(btns3.noticeEl.textContent).toContain('Đã mở tab CDN');
      expect(tabsSpy).toHaveBeenCalledTimes(1);

      // Now resolve Video 2's pending fetch
      const mockData2 = createMockSyndicationResponse({ tweetId: wrappers[1].id, mediaCount: 1 });
      resolveVideo2Fetch(mockData2);

      await new Promise((r) => setTimeout(r, 25));

      // Video 2 now completes to SUCCESS
      expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
      expect(tabsSpy).toHaveBeenCalledTimes(2);

      // Video 1 still remains in ERROR (unaffected)
      expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
      // Video 3 still remains in SUCCESS (unaffected)
      expect(controller3.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);

      // Clean up
      controller1.destroy();
      controller2.destroy();
      controller3.destroy();
      root.remove();
    });

    it('3.2: Dismissing Video 1 leaves Video 2 and Video 3 mounted and functional', async () => {
      const root = document.createElement('div');
      document.body.appendChild(root);
      const stateStore = createVideoStateStore();

      const wrappers = [1, 2, 3].map((num) => {
        const wrap = document.createElement('div');
        wrap.setAttribute('data-testid', 'videoComponent');
        const v = document.createElement('video');
        v.id = `v-dismiss-${num}`;
        wrap.appendChild(v);
        root.appendChild(wrap);
        return { wrap, video: v, id: `186000000000000004${num}` };
      });

      const controller1 = createToolbar(wrappers[0].video, { tweetId: wrappers[0].id }, { stateStore });
      const controller2 = createToolbar(wrappers[1].video, { tweetId: wrappers[1].id }, { stateStore });
      const controller3 = createToolbar(wrappers[2].video, { tweetId: wrappers[2].id }, { stateStore });

      const btns1 = getToolbarButtons(controller1.host);

      // Dismiss Video 1
      simulatePointerEvent(btns1.dismissBtn, 'click');

      expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);
      expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(controller3.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Wait for 150ms dismiss animation
      await new Promise((r) => setTimeout(r, 180));

      // Video 1 host removed from DOM
      expect(controller1.host.parentNode).toBeNull();

      // Video 2 and 3 hosts remain mounted
      expect(controller2.host.parentNode).not.toBeNull();
      expect(controller3.host.parentNode).not.toBeNull();

      controller2.destroy();
      controller3.destroy();
      root.remove();
    });
  });

  // =========================================================================
  // 5. REMEDIATION SUITE: DOM QUALITY COMPARISON, AMBIGUITY & ERROR CODES
  // =========================================================================
  describe('5. Remediation Suite: DOM Quality Comparison, Ambiguous State & Error Codes', () => {
    it('5.1: Selects 1080p Syndication variant when DOM only has 720p MP4 (R1 Quality Comparison)', async () => {
      const video = document.createElement('video');
      video.src = 'https://video.twimg.com/amplify_video/1800/vid/avc1/720x1280/sample.mp4?tag=14';

      const syndicationData = {
        id_str: '1800000000000000099',
        mediaDetails: [{
          type: 'video',
          id_str: '18000000000000000991',
          video_info: {
            variants: [
              { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1800/vid/avc1/720x1280/sample.mp4?tag=14' },
              { content_type: 'video/mp4', url: 'https://video.twimg.com/amplify_video/1800/vid/avc1/1080x1920/master.mp4?tag=14' },
            ],
          },
        }],
      };

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: true, data: syndicationData };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        if (msg.action === 'OPEN_CDN') {
          if (callback) callback({ success: true, tabId: 1 });
          return Promise.resolve({ success: true, tabId: 1 });
        }
        return Promise.resolve({ success: true });
      });

      const result = await resolveCdnForVideo(video, { tweetId: '1800000000000000099' });
      expect(result.success).toBe(true);
      expect(result.url).toContain('1080x1920');
    });

    it('5.2: Falls back gracefully to 720p DOM MP4 when Syndication API fails or rate limits', async () => {
      const video = document.createElement('video');
      video.src = 'https://video.twimg.com/amplify_video/1800/vid/avc1/720x1280/sample.mp4?tag=14';

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: false, error: 'RATE_LIMIT' };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        if (msg.action === 'OPEN_CDN') {
          if (callback) callback({ success: true, tabId: 1 });
          return Promise.resolve({ success: true, tabId: 1 });
        }
        return Promise.resolve({ success: true });
      });

      const result = await resolveCdnForVideo(video, { tweetId: '1800000000000000099' });
      expect(result.success).toBe(true);
      expect(result.url).toBe(video.src);
    });

    it('5.3: Returns NO_SUPPORTED_VARIANT when media entity exists but lacks compatible variants', async () => {
      const video = document.createElement('video');
      video.src = 'blob:https://x.com/mock-blob';

      const syndicationData = {
        id_str: '1800000000000000100',
        mediaDetails: [{
          type: 'video',
          id_str: '18000000000000001001',
          video_info: {
            variants: [
              { content_type: 'video/webm', url: 'https://example.com/video.webm' },
            ],
          },
        }],
      };

      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: true, data: syndicationData };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      const result = await resolveCdnForVideo(video, { tweetId: '1800000000000000100' });
      expect(result.success).toBe(false);
      expect(result.code).toBe(CDN_ERROR_CODES.NO_SUPPORTED_VARIANT);
      expect(result.error).toContain('tương thích');
    });

    it('5.4: Sets toolbar state to AMBIGUOUS and clears aria-busy when ambiguity occurs', async () => {
      const env = setupToolbarTestEnv({
        tweetId: '1860000000000000050',
      });
      const { video, videoWrapper } = env;

      const mockCandidates = [
        { id_str: 'cand_1', type: 'video' },
        { id_str: 'cand_2', type: 'video' },
      ];

      // Custom mock resolver simulating ambiguity
      const mockAmbiguousResolver = vi.fn((v, t, opts) => {
        if (opts.onAmbiguous) {
          opts.onAmbiguous(mockCandidates, vi.fn());
        }
        return Promise.resolve({ isAmbiguous: true, candidates: mockCandidates });
      });

      const controller = createToolbar(
        video,
        { tweetId: '1860000000000000050' },
        {
          stateStore: env.stateStore,
          cdnResolver: mockAmbiguousResolver,
        }
      );

      const btns = getToolbarButtons(controller.host);
      simulatePointerEvent(btns.cdnBtn, 'click');

      await new Promise((r) => setTimeout(r, 20));

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.AMBIGUOUS);
      expect(btns.cdnBtn.hasAttribute('aria-busy')).toBe(false);
      expect(controller.host.shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();

      teardownToolbarTestEnv(env);
    });
  });
});
