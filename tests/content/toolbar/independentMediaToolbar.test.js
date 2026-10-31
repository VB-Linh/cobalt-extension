// tests/content/toolbar/independentMediaToolbar.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { createTweetFixture } from '../../fixtures/factory.js';
import { attachToolbar, detachToolbar, getToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import { createVideoStateStore } from '../../../src/content/state/videoState.js';
import { matchPickerItem } from '../../../src/shared/utils/mediaMatcher.js';

describe('Independent Floating Toolbar Per Media Element Suite', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (env) {
      teardownToolbarTestEnv(env);
      env = null;
    }
  });

  // =========================================================================
  // 1. MOUNTING & ATTACHMENT
  // =========================================================================
  describe('1. Mounting & Attachment Independence', () => {
    it('1.1: Single video post has exactly 1 Floating Toolbar attached to that video', () => {
      env = setupToolbarTestEnv({ tweetId: '2000000000000000001', videoIndices: [null] });
      const { video, videoWrapper, stateStore } = env;

      const controller = attachToolbar(video, { tweetId: '2000000000000000001' }, { stateStore });

      expect(controller).not.toBeNull();
      const host = getToolbarHost(videoWrapper);
      expect(host).not.toBeNull();
      expect(videoWrapper.querySelectorAll('.xvt-toolbar-host').length).toBe(1);
    });

    it('1.2: Post with two videos: each video has an independent Floating Toolbar', () => {
      env = setupToolbarTestEnv({
        tweetId: '2000000000000000002',
        videoIndices: [1, 2],
      });

      const [v1, v2] = env.videos;
      const w1 = v1.closest('[data-testid="videoComponent"]');
      const w2 = v2.closest('[data-testid="videoComponent"]');

      const c1 = attachToolbar(v1, { tweetId: '2000000000000000002', mediaIndex: 1 }, { stateStore: env.stateStore });
      const c2 = attachToolbar(v2, { tweetId: '2000000000000000002', mediaIndex: 2 }, { stateStore: env.stateStore });

      expect(c1).not.toBeNull();
      expect(c2).not.toBeNull();
      expect(c1).not.toBe(c2);
      expect(c1.host).not.toBe(c2.host);
      expect(c1.shadowRoot).not.toBe(c2.shadowRoot);
      expect(w1.querySelectorAll('.xvt-toolbar-host').length).toBe(1);
      expect(w2.querySelectorAll('.xvt-toolbar-host').length).toBe(1);
    });

    it('1.3: Post with multiple videos and photos: each video gets a toolbar, photos do not', () => {
      const tweet = createTweetFixture({
        tweetId: '2000000000000000003',
        videoIndices: [1, 2],
        hasPhoto: true,
      });
      document.body.appendChild(tweet);
      const stateStore = createVideoStateStore();

      const videos = Array.from(tweet.querySelectorAll('video'));
      const photos = Array.from(tweet.querySelectorAll('[data-testid="tweetPhoto"], img'));

      expect(videos.length).toBe(2);
      expect(photos.length).toBeGreaterThan(0);

      // Photos must not have toolbars
      for (const photo of photos) {
        expect(photo.tagName).not.toBe('VIDEO');
        expect(attachToolbar(photo, {}, { stateStore })).toBeNull();
      }

      // Both videos get toolbars
      const c1 = attachToolbar(videos[0], { tweetId: '2000000000000000003', mediaIndex: 1 }, { stateStore });
      const c2 = attachToolbar(videos[1], { tweetId: '2000000000000000003', mediaIndex: 2 }, { stateStore });

      expect(c1).not.toBeNull();
      expect(c2).not.toBeNull();
      expect(c1).not.toBe(c2);

      tweet.remove();
    });

    it('1.4: Quoted tweet with media: toolbar is attached to corresponding tweet ID', () => {
      const tweet = createTweetFixture({
        tweetId: '2000000000000000004',
        videoIndices: [1],
        isQuoted: true,
        quotedTweetId: '2000000000000000005',
      });
      document.body.appendChild(tweet);
      const stateStore = createVideoStateStore();

      // Video inside quoted tweet
      const quoteCard = tweet.querySelector('[data-testid="quoteTweet"]');
      const quotedVideo = quoteCard.querySelector('video');
      expect(quotedVideo).not.toBeNull();

      const cQuote = attachToolbar(
        quotedVideo,
        { tweetId: '2000000000000000005', isQuoted: true, mediaIndex: 1 },
        { stateStore }
      );

      expect(cQuote).not.toBeNull();
      expect(cQuote.video).toBe(quotedVideo);

      tweet.remove();
    });
  });

  // =========================================================================
  // 2. HOVER INDEPENDENCE
  // =========================================================================
  describe('2. Hover Interaction Independence', () => {
    it('2.1: Hovering Video 1 shows only Toolbar 1; hovering Video 2 shows only Toolbar 2', () => {
      env = setupToolbarTestEnv({
        tweetId: '2000000000000000010',
        videoIndices: [1, 2],
      });

      const [v1, v2] = env.videos;
      const w1 = v1.closest('[data-testid="videoComponent"]');
      const w2 = v2.closest('[data-testid="videoComponent"]');

      const c1 = attachToolbar(v1, { tweetId: '2000000000000000010', mediaIndex: 1 }, { stateStore: env.stateStore });
      const c2 = attachToolbar(v2, { tweetId: '2000000000000000010', mediaIndex: 2 }, { stateStore: env.stateStore });

      // Initial: both idle
      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Hover w1
      simulatePointerEvent(w1, 'mouseenter');
      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Mouse leaves w1, moves to w2
      simulatePointerEvent(w1, 'mouseleave');
      simulatePointerEvent(w2, 'mouseenter');

      vi.advanceTimersByTime(310); // past 300ms grace period

      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    });
  });

  // =========================================================================
  // 3. OPERATION INDEPENDENCE (DOWNLOAD, CDN, DISMISS)
  // =========================================================================
  describe('3. Operation Independence: Download, CDN & Dismiss', () => {
    it('3.1: Download on Video 1 matches Video 1 directly from Cobalt picker without dialog, Video 2 is untouched', () => {
      env = setupToolbarTestEnv({
        tweetId: '2000000000000000020',
        videoIndices: [1, 2],
      });

      const [v1, v2] = env.videos;
      const c1 = attachToolbar(
        v1,
        { tweetId: '2000000000000000020', mediaIndex: 1 },
        { stateStore: env.stateStore, enableDownload: true }
      );
      const c2 = attachToolbar(
        v2,
        { tweetId: '2000000000000000020', mediaIndex: 2 },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const calls = [];
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        calls.push({ msg, cb });
      });

      const { downloadBtn: dl1 } = getToolbarButtons(c1.host);
      simulatePointerEvent(dl1, 'click');

      expect(calls.length).toBe(1);
      expect(calls[0].msg.payload.mediaIndex).toBe(1);
      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE); // Video 2 untouched!

      // Cobalt returns picker with 2 items
      calls[0].cb({
        status: 'picker',
        items: [
          { index: 0, type: 'video', url: 'https://video.twimg.com/v1.mp4' },
          { index: 1, type: 'video', url: 'https://video.twimg.com/v2.mp4' },
        ],
      });

      // Directly requests download of v1.mp4 WITHOUT displaying MediaPicker popover!
      expect(c1.host.shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
      expect(calls.length).toBe(2);
      expect(calls[1].msg.payload.selectedUrl).toBe('https://video.twimg.com/v1.mp4');
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    });

    it('3.2: Download on Video 2 matches Video 2 directly from Cobalt picker without dialog, Video 1 is untouched', () => {
      env = setupToolbarTestEnv({
        tweetId: '2000000000000000021',
        videoIndices: [1, 2],
      });

      const [v1, v2] = env.videos;
      const c1 = attachToolbar(
        v1,
        { tweetId: '2000000000000000021', mediaIndex: 1 },
        { stateStore: env.stateStore, enableDownload: true }
      );
      const c2 = attachToolbar(
        v2,
        { tweetId: '2000000000000000021', mediaIndex: 2 },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const calls = [];
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        calls.push({ msg, cb });
      });

      const { downloadBtn: dl2 } = getToolbarButtons(c2.host);
      simulatePointerEvent(dl2, 'click');

      expect(calls.length).toBe(1);
      expect(calls[0].msg.payload.mediaIndex).toBe(2);
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE); // Video 1 untouched!

      // Cobalt returns picker with 2 items
      calls[0].cb({
        status: 'picker',
        items: [
          { index: 0, type: 'video', url: 'https://video.twimg.com/v1.mp4' },
          { index: 1, type: 'video', url: 'https://video.twimg.com/v2.mp4' },
        ],
      });

      // Directly requests download of v2.mp4 WITHOUT displaying MediaPicker popover!
      expect(c2.host.shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
      expect(calls.length).toBe(2);
      expect(calls[1].msg.payload.selectedUrl).toBe('https://video.twimg.com/v2.mp4');
      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    });

    it('3.3: Open CDN on Video 1 opens Video 1 CDN URL directly without dialog, Video 2 is untouched', async () => {
      env = setupToolbarTestEnv({
        tweetId: '2000000000000000030',
        videoIndices: [1, 2],
      });

      const [v1, v2] = env.videos;
      const syndicationData = {
        id_str: '2000000000000000030',
        mediaDetails: [
          {
            type: 'video',
            id_str: 'vid_1',
            video_info: { variants: [{ url: 'https://video.twimg.com/vid_1.mp4', content_type: 'video/mp4', bitrate: 2000 }] },
          },
          {
            type: 'video',
            id_str: 'vid_2',
            video_info: { variants: [{ url: 'https://video.twimg.com/vid_2.mp4', content_type: 'video/mp4', bitrate: 2000 }] },
          },
        ],
      };

      const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 101 });
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: true, data: syndicationData };
          if (cb) cb(resp);
          return Promise.resolve(resp);
        }
        if (msg.action === 'OPEN_CDN') {
          tabsSpy({ url: msg.payload?.url });
          const resp = { success: true, tabId: 101 };
          if (cb) cb(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      const c1 = attachToolbar(v1, { tweetId: '2000000000000000030', mediaIndex: 1 }, { stateStore: env.stateStore });
      const c2 = attachToolbar(v2, { tweetId: '2000000000000000030', mediaIndex: 2 }, { stateStore: env.stateStore });

      const { cdnBtn: cdn1 } = getToolbarButtons(c1.host);
      simulatePointerEvent(cdn1, 'click');

      await vi.advanceTimersByTimeAsync(50);

      expect(c1.host.shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
      expect(tabsSpy).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://video.twimg.com/vid_1.mp4' }));
      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    });

    it('3.4: Open CDN on Video 2 opens Video 2 CDN URL directly without dialog, Video 1 is untouched', async () => {
      env = setupToolbarTestEnv({
        tweetId: '2000000000000000031',
        videoIndices: [1, 2],
      });

      const [v1, v2] = env.videos;
      const syndicationData = {
        id_str: '2000000000000000031',
        mediaDetails: [
          {
            type: 'video',
            id_str: 'vid_1',
            video_info: { variants: [{ url: 'https://video.twimg.com/vid_1.mp4', content_type: 'video/mp4', bitrate: 2000 }] },
          },
          {
            type: 'video',
            id_str: 'vid_2',
            video_info: { variants: [{ url: 'https://video.twimg.com/vid_2.mp4', content_type: 'video/mp4', bitrate: 2000 }] },
          },
        ],
      };

      const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 102 });
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'FETCH_SYNDICATION') {
          const resp = { success: true, data: syndicationData };
          if (cb) cb(resp);
          return Promise.resolve(resp);
        }
        if (msg.action === 'OPEN_CDN') {
          tabsSpy({ url: msg.payload?.url });
          const resp = { success: true, tabId: 102 };
          if (cb) cb(resp);
          return Promise.resolve(resp);
        }
        return Promise.resolve({ success: true });
      });

      const c1 = attachToolbar(v1, { tweetId: '2000000000000000031', mediaIndex: 1 }, { stateStore: env.stateStore });
      const c2 = attachToolbar(v2, { tweetId: '2000000000000000031', mediaIndex: 2 }, { stateStore: env.stateStore });

      const { cdnBtn: cdn2 } = getToolbarButtons(c2.host);
      simulatePointerEvent(cdn2, 'click');

      await vi.advanceTimersByTimeAsync(50);

      expect(c2.host.shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
      expect(tabsSpy).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://video.twimg.com/vid_2.mp4' }));
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    });

    it('3.5: Dismiss on Video 1 hides only Video 1 toolbar; Video 2 toolbar remains mounted and active', () => {
      env = setupToolbarTestEnv({
        tweetId: '2000000000000000040',
        videoIndices: [1, 2],
      });

      const [v1, v2] = env.videos;
      const c1 = attachToolbar(v1, { tweetId: '2000000000000000040', mediaIndex: 1 }, { stateStore: env.stateStore });
      const c2 = attachToolbar(v2, { tweetId: '2000000000000000040', mediaIndex: 2 }, { stateStore: env.stateStore });

      const { dismissBtn: d1 } = getToolbarButtons(c1.host);
      simulatePointerEvent(d1, 'click');

      expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);
      expect(env.stateStore.isDismissed(undefined, v1)).toBe(true);

      // Video 2 is unaffected
      expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(env.stateStore.isDismissed(undefined, v2)).toBe(false);

      vi.advanceTimersByTime(160);
      expect(c1.host.parentNode).toBeNull();
      expect(c2.host.parentNode).not.toBeNull();
    });
  });

  // =========================================================================
  // 4. DETERMINISTIC PICKER MATCHER UNIT TESTS
  // =========================================================================
  describe('4. Deterministic Picker Matching (No DOM Order Guessing)', () => {
    const items = [
      { index: 0, type: 'video', url: 'https://video.twimg.com/v1.mp4', thumb: 'https://pbs.twimg.com/media/thumb1.jpg' },
      { index: 1, type: 'video', url: 'https://video.twimg.com/v2.mp4', thumb: 'https://pbs.twimg.com/media/thumb2.jpg' },
      { index: 2, type: 'photo', url: 'https://pbs.twimg.com/media/photo.jpg' },
    ];

    it('4.1: matches deterministically by 1-based official mediaIndex', () => {
      expect(matchPickerItem(items, { mediaIndex: 1 })).toBe(items[0]);
      expect(matchPickerItem(items, { mediaIndex: 2 })).toBe(items[1]);
      expect(matchPickerItem(items, { mediaIndex: 99 })).toBeNull();
    });

    it('4.2: matches deterministically by stable mediaFingerprint', () => {
      expect(matchPickerItem(items, { mediaFingerprint: 'thumb1' })).toBe(items[0]);
      expect(matchPickerItem(items, { mediaFingerprint: 'thumb2' })).toBe(items[1]);
      expect(matchPickerItem(items, { mediaFingerprint: 'unknown' })).toBeNull();
    });

    it('4.3: single video item in tweet resolves automatically without guessing', () => {
      const singleItem = [{ index: 0, type: 'video', url: 'https://video.twimg.com/single.mp4' }];
      expect(matchPickerItem(singleItem, {})).toBe(singleItem[0]);
    });

    it('4.4: multi-video tweet without index or fingerprint strictly returns null (no DOM guessing)', () => {
      expect(matchPickerItem(items, {})).toBeNull();
      expect(matchPickerItem(items, { mediaIndex: null, mediaFingerprint: null })).toBeNull();
    });
  });
});
