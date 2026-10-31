// tests/challengerDownloadConcurrency.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachToolbar } from '../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../src/content/toolbar/toolbarState.js';
import {
  startDownload,
  generateFilename,
  trackDownload,
  initiateDownload,
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

describe('Empirical Challenger: Phase 4 Download Manager & Concurrency Stress Suite', () => {
  let env;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetDownloadManager();
    env = setupToolbarTestEnv();
  });

  afterEach(() => {
    teardownToolbarTestEnv(env);
    resetDownloadManager();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: Anti-Duplicate Download Locking Under Rapid Clicks
  // =========================================================================
  describe('1. Anti-Duplicate Download Locking Stress', () => {
    it('1.1 Toolbar UI: Rapidly clicking Download 10 times consecutively triggers only 1 request', () => {
      vi.useFakeTimers();
      const { video, videoWrapper } = env;
      const controller = attachToolbar(
        video,
        { tweetId: '9000000000000000001', username: 'tester', permalink: 'https://x.com/tester/status/9000000000000000001' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);
      const sendMsgSpy = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => {});

      // Rapidly click Download 10 times consecutively with minimal interval (10ms)
      for (let i = 0; i < 10; i++) {
        simulatePointerEvent(downloadBtn, 'click');
        vi.advanceTimersByTime(10);
      }

      // Assert: only 1 runtime message was ever dispatched
      expect(sendMsgSpy).toHaveBeenCalledTimes(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      vi.useRealTimers();
    });

    it('1.2 Toolbar UI: Spam clicking 10 times while download is IN_PROGRESS/DOWNLOADING is blocked by state machine', () => {
      vi.useFakeTimers();
      const { video, videoWrapper } = env;
      const controller = attachToolbar(
        video,
        { tweetId: '9000000000000000002', username: 'tester' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      let capturedCallback;
      const sendMsgSpy = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        capturedCallback = cb;
      });

      // First click
      simulatePointerEvent(downloadBtn, 'click');
      expect(sendMsgSpy).toHaveBeenCalledTimes(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Background confirms download started
      capturedCallback({ success: true, downloadId: 7701 });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // User clicks 10 more times within the 800ms DOWNLOADING window (e.g. every 60ms)
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(60);
        simulatePointerEvent(downloadBtn, 'click');
      }

      // Assert: Send message was STILL only called once (state machine guard blocked all 10 clicks)
      expect(sendMsgSpy).toHaveBeenCalledTimes(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      vi.useRealTimers();
    });

    it('1.3 Download Manager: Parallel initiateDownload calls for same videoKey block duplicates', async () => {
      let downloadCallCount = 0;
      vi.spyOn(chrome.downloads, 'download').mockImplementation(async () => {
        downloadCallCount++;
        // Simulate a slight delay to test true concurrent in-flight locking
        await new Promise((r) => setTimeout(r, 20));
        return 8801;
      });

      const videoKey = 'vid_canonical_same_element_123';
      const params = {
        url: 'https://video.twimg.com/video_123.mp4',
        tweetId: '123',
        username: 'alice',
      };

      // Launch 10 simultaneous initiateDownload calls on the same videoKey
      const promises = Array.from({ length: 10 }, () => initiateDownload(videoKey, params));
      const results = await Promise.all(promises);

      // Exactly 1 download succeeded, 9 were blocked with DOWNLOAD_IN_PROGRESS
      const successful = results.filter((r) => r.success === true);
      const blocked = results.filter((r) => r.blocked === true && r.reason === 'DOWNLOAD_IN_PROGRESS');

      expect(successful.length).toBe(1);
      expect(blocked.length).toBe(9);
      expect(downloadCallCount).toBe(1);
      expect(successful[0].downloadId).toBe(8801);
    });

    it('1.4 Download Manager: Lock is properly released after download completion allowing subsequent downloads', async () => {
      let currentDownloadId = 9001;
      vi.spyOn(chrome.downloads, 'download').mockImplementation(async () => currentDownloadId++);

      const videoKey = 'vid_repeatable_key_456';
      const params = { url: 'https://video.twimg.com/vid.mp4', tweetId: '456' };

      // 1. First download starts
      const first = await initiateDownload(videoKey, params);
      expect(first.success).toBe(true);
      expect(first.downloadId).toBe(9001);

      // 2. Immediate duplicate is blocked
      const duplicate = await initiateDownload(videoKey, params);
      expect(duplicate.blocked).toBe(true);

      // 3. First download completes via chrome.downloads.onChanged
      chrome.downloads.onChanged.dispatch({
        id: 9001,
        state: { current: 'complete', previous: 'in_progress' },
      });

      // Allow tick for event processing
      await new Promise((r) => setTimeout(r, 10));

      // 4. Subsequent download on the same videoKey should now be ALLOWED
      const subsequent = await initiateDownload(videoKey, params);
      expect(subsequent.success).toBe(true);
      expect(subsequent.downloadId).toBe(9002);
    });

    it('1.5 Download Manager: Exception recovery releases in-flight lock when startDownload fails', async () => {
      vi.spyOn(chrome.downloads, 'download').mockRejectedValueOnce(new Error('Chrome disk full'));

      const videoKey = 'vid_exception_key_789';
      const params = { url: 'https://video.twimg.com/vid.mp4', tweetId: '789' };

      // Download fails on first attempt
      const failed = await initiateDownload(videoKey, params);
      expect(failed.success).toBe(false);

      // Verify lock was not leaked: retry should NOT be blocked by DOWNLOAD_IN_PROGRESS
      vi.spyOn(chrome.downloads, 'download').mockResolvedValueOnce(9005);
      const retry = await initiateDownload(videoKey, params);
      expect(retry.success).toBe(true);
      expect(retry.downloadId).toBe(9005);
    });
  });

  // =========================================================================
  // SECTION 2: Concurrency Between Different Videos
  // =========================================================================
  describe('2. Multi-Video Concurrency & Independence', () => {
    it('2.1 Two videos downloaded simultaneously execute independently with distinct IDs and filenames', async () => {
      let nextId = 10001;
      vi.spyOn(chrome.downloads, 'download').mockImplementation(async (opts) => {
        return nextId++;
      });

      const videoKeyA = 'tweet_111_media_0';
      const videoKeyB = 'tweet_222_media_0';

      const [resA, resB] = await Promise.all([
        initiateDownload(videoKeyA, {
          url: 'https://video.twimg.com/vidA.mp4',
          tweetId: '111',
          username: 'user_alpha',
        }),
        initiateDownload(videoKeyB, {
          url: 'https://video.twimg.com/vidB.mp4',
          tweetId: '222',
          username: 'user_beta',
        }),
      ]);

      expect(resA.success).toBe(true);
      expect(resB.success).toBe(true);

      // Verify distinct download IDs
      expect(resA.downloadId).toBe(10001);
      expect(resB.downloadId).toBe(10002);
      expect(resA.downloadId).not.toBe(resB.downloadId);

      // Verify distinct standardized filenames
      expect(resA.filename).toBe('X_user_alpha_111.mp4');
      expect(resB.filename).toBe('X_user_beta_222.mp4');
    });

    it('2.2 Video A failure/interruption does NOT abort or alter concurrent Video B', async () => {
      vi.spyOn(chrome.downloads, 'download')
        .mockResolvedValueOnce(11001)
        .mockResolvedValueOnce(11002);

      const videoKeyA = 'video_failing_A';
      const videoKeyB = 'video_succeeding_B';

      const resA = await initiateDownload(videoKeyA, { url: 'https://video.twimg.com/A.mp4', tweetId: '1101' });
      const resB = await initiateDownload(videoKeyB, { url: 'https://video.twimg.com/B.mp4', tweetId: '1102' });

      const onCompleteB = vi.fn();
      const onErrorA = vi.fn();

      const trackA = trackDownload(resA.downloadId, { videoKey: videoKeyA, onError: onErrorA });
      const trackB = trackDownload(resB.downloadId, { videoKey: videoKeyB, onComplete: onCompleteB });

      // Crash Video A with network interruption
      chrome.downloads.onChanged.dispatch({
        id: resA.downloadId,
        state: { current: 'interrupted' },
        error: { current: 'NETWORK_FAILED' },
      });

      // Video A should reject
      await expect(trackA).rejects.toMatchObject({
        downloadId: 11001,
        error: 'NETWORK_FAILED',
        state: DOWNLOAD_STATES.INTERRUPTED,
      });
      expect(onErrorA).toHaveBeenCalled();

      // Video B should STILL be intact and complete cleanly
      chrome.downloads.onChanged.dispatch({
        id: resB.downloadId,
        state: { current: 'complete' },
      });

      const completedB = await trackB;
      expect(completedB.success).toBe(true);
      expect(completedB.state).toBe(DOWNLOAD_STATES.COMPLETED);
      expect(onCompleteB).toHaveBeenCalledWith(
        expect.objectContaining({ downloadId: 11002, state: DOWNLOAD_STATES.COMPLETED })
      );
    });

    it('2.3 Video A cancellation by user does NOT abort or alter concurrent Video B', async () => {
      vi.spyOn(chrome.downloads, 'download')
        .mockResolvedValueOnce(12001)
        .mockResolvedValueOnce(12002);

      const resA = await initiateDownload('vid_cancel_A', { url: 'https://video.twimg.com/A.mp4', tweetId: '1201' });
      const resB = await initiateDownload('vid_complete_B', { url: 'https://video.twimg.com/B.mp4', tweetId: '1202' });

      const onCancelA = vi.fn();
      const onCompleteB = vi.fn();

      const trackA = trackDownload(resA.downloadId, { onCancel: onCancelA });
      const trackB = trackDownload(resB.downloadId, { onComplete: onCompleteB });

      // User cancels Video A
      chrome.downloads.onChanged.dispatch({
        id: resA.downloadId,
        state: { current: 'interrupted' },
        error: { current: 'USER_CANCELED' },
      });

      const resultA = await trackA;
      expect(resultA.success).toBe(true);
      expect(resultA.cancelled).toBe(true);
      expect(resultA.state).toBe(DOWNLOAD_STATES.CANCELLED);
      expect(onCancelA).toHaveBeenCalled();

      // Video B completes
      chrome.downloads.onChanged.dispatch({
        id: resB.downloadId,
        state: { current: 'complete' },
      });

      const resultB = await trackB;
      expect(resultB.success).toBe(true);
      expect(resultB.state).toBe(DOWNLOAD_STATES.COMPLETED);
      expect(onCompleteB).toHaveBeenCalled();
    });

    it('2.4 High-load Stress: 5 distinct concurrent video downloads with mixed lifecycle outcomes', async () => {
      let idCounter = 20000;
      vi.spyOn(chrome.downloads, 'download').mockImplementation(async () => ++idCounter);

      const videoKeys = ['vid_1', 'vid_2', 'vid_3', 'vid_4', 'vid_5'];
      const tasks = await Promise.all(
        videoKeys.map((key, i) =>
          initiateDownload(key, {
            url: `https://video.twimg.com/v${i}.mp4`,
            tweetId: `tweet_${i}`,
            username: `user_${i}`,
          })
        )
      );

      // Verify 5 distinct IDs
      const ids = tasks.map((t) => t.downloadId);
      expect(new Set(ids).size).toBe(5);

      // Attach trackers
      const spies = {
        complete1: vi.fn(),
        error2: vi.fn(),
        cancel3: vi.fn(),
        complete4: vi.fn(),
        complete5: vi.fn(),
      };

      const track1 = trackDownload(ids[0], { onComplete: spies.complete1 });
      const track2 = trackDownload(ids[1], { onError: spies.error2 });
      const track3 = trackDownload(ids[2], { onCancel: spies.cancel3 });
      const track4 = trackDownload(ids[3], { onComplete: spies.complete4 });
      const track5 = trackDownload(ids[4], { onComplete: spies.complete5 });

      // Dispatch events
      // 1: Complete
      chrome.downloads.onChanged.dispatch({ id: ids[0], state: { current: 'complete' } });
      // 2: Network failure
      chrome.downloads.onChanged.dispatch({ id: ids[1], state: { current: 'interrupted' }, error: { current: 'SERVER_FAILED' } });
      // 3: User cancel
      chrome.downloads.onChanged.dispatch({ id: ids[2], state: { current: 'interrupted' }, error: { current: 'USER_CANCELED' } });
      // 4: Complete
      chrome.downloads.onChanged.dispatch({ id: ids[3], state: { current: 'complete' } });
      // 5: Complete
      chrome.downloads.onChanged.dispatch({ id: ids[4], state: { current: 'complete' } });

      const [r1, r2, r3, r4, r5] = await Promise.allSettled([track1, track2, track3, track4, track5]);

      expect(r1.status).toBe('fulfilled');
      expect(r1.value.state).toBe(DOWNLOAD_STATES.COMPLETED);
      expect(spies.complete1).toHaveBeenCalled();

      expect(r2.status).toBe('rejected');
      expect(r2.reason.state).toBe(DOWNLOAD_STATES.INTERRUPTED);
      expect(spies.error2).toHaveBeenCalled();

      expect(r3.status).toBe('fulfilled');
      expect(r3.value.cancelled).toBe(true);
      expect(spies.cancel3).toHaveBeenCalled();

      expect(r4.status).toBe('fulfilled');
      expect(r4.value.state).toBe(DOWNLOAD_STATES.COMPLETED);
      expect(spies.complete4).toHaveBeenCalled();

      expect(r5.status).toBe('fulfilled');
      expect(r5.value.state).toBe(DOWNLOAD_STATES.COMPLETED);
      expect(spies.complete5).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SECTION 3: Chrome Download Lifecycle States
  // =========================================================================
  describe('3. Chrome Download Lifecycle State Transitions', () => {
    it('3.1 Lifecycle: initiated -> in_progress -> complete transitions cleanly', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(31001);

      const onComplete = vi.fn();
      const res = await initiateDownload('vid_lifecycle_1', { url: 'https://video.twimg.com/test.mp4' });
      expect(res.success).toBe(true);

      const trackPromise = trackDownload(res.downloadId, { onComplete });

      // Simulate download progress (bytesReceived change without state change)
      chrome.downloads.onChanged.dispatch({
        id: 31001,
        bytesReceived: { current: 1048576, previous: 524288 },
      });

      // Complete
      chrome.downloads.onChanged.dispatch({
        id: 31001,
        state: { current: 'complete', previous: 'in_progress' },
      });

      const outcome = await trackPromise;
      expect(outcome.success).toBe(true);
      expect(outcome.state).toBe(DOWNLOAD_STATES.COMPLETED);
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ downloadId: 31001, state: DOWNLOAD_STATES.COMPLETED })
      );
    });

    it('3.2 Lifecycle: interrupted -> error mapping provides localized Vietnamese description', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(32001);

      const onError = vi.fn();
      const res = await initiateDownload('vid_lifecycle_2', { url: 'https://video.twimg.com/test.mp4' });
      const trackPromise = trackDownload(res.downloadId, { onError });

      chrome.downloads.onChanged.dispatch({
        id: 32001,
        state: { current: 'interrupted', previous: 'in_progress' },
        error: { current: 'CRASH' },
      });

      await expect(trackPromise).rejects.toMatchObject({
        downloadId: 32001,
        error: 'CRASH',
        state: DOWNLOAD_STATES.INTERRUPTED,
        message: expect.stringContaining('gián đoạn'),
      });
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          downloadId: 32001,
          error: 'CRASH',
          message: expect.stringContaining('gián đoạn'),
        })
      );
    });

    it('3.3 Lifecycle: USER_CANCELED resolves gracefully without treating as system crash', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(33001);

      const onCancel = vi.fn();
      const res = await initiateDownload('vid_lifecycle_3', { url: 'https://video.twimg.com/test.mp4' });
      const trackPromise = trackDownload(res.downloadId, { onCancel });

      chrome.downloads.onChanged.dispatch({
        id: 33001,
        state: { current: 'interrupted', previous: 'in_progress' },
        error: { current: 'USER_CANCELED' },
      });

      const outcome = await trackPromise;
      expect(outcome.success).toBe(true);
      expect(outcome.cancelled).toBe(true);
      expect(outcome.state).toBe(DOWNLOAD_STATES.CANCELLED);
      expect(onCancel).toHaveBeenCalledWith(
        expect.objectContaining({ downloadId: 33001, state: DOWNLOAD_STATES.CANCELLED })
      );
    });

    it('3.4 Lifecycle Robustness: Untracked downloads and empty deltas do not cause errors', () => {
      // Dispatch delta with null or non-existent ID
      expect(() => {
        chrome.downloads.onChanged.dispatch(null);
        chrome.downloads.onChanged.dispatch({ id: 999999, state: { current: 'complete' } });
        chrome.downloads.onChanged.dispatch({ id: undefined });
      }).not.toThrow();
    });
  });

  // =========================================================================
  // SECTION 4: Phase 3 CDN & Toolbar Regression Boundaries
  // =========================================================================
  describe('4. Phase 3 & Toolbar Regression Boundaries', () => {
    it('4.1 Open CDN works 100% independently when Cobalt is completely unconfigured', async () => {
      const { video, videoWrapper } = env;
      video.src = 'https://video.twimg.com/amplify_video/99001/vid/avc1/720x1280/cdn_vid.mp4';

      const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 801 });
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'OPEN_CDN') {
          tabsSpy({ url: msg.payload?.url || msg.url });
          if (typeof cb === 'function') cb({ success: true, tabId: 801 });
          return Promise.resolve({ success: true, tabId: 801 });
        }
        return Promise.resolve({ success: true });
      });

      // Cobalt explicitly unconfigured (enableDownload: false)
      const controller = attachToolbar(
        video,
        { tweetId: '99001' },
        { stateStore: env.stateStore, enableCdnResolver: true, enableDownload: false }
      );

      const host = getToolbarHost(videoWrapper);
      const { cdnBtn } = getToolbarButtons(host);

      simulatePointerEvent(cdnBtn, 'click');

      await new Promise((r) => setTimeout(r, 60));

      expect(tabsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://video.twimg.com/amplify_video/99001/vid/avc1/720x1280/cdn_vid.mp4',
        })
      );
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    });

    it('4.2 Open CDN works 100% independently when Cobalt server is offline / throws error', async () => {
      const { video, videoWrapper } = env;
      video.src = 'https://video.twimg.com/ext_tw_video/99002/pu/vid/avc1/1280x720/offline_test.mp4';

      const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 802 });
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'OPEN_CDN') {
          tabsSpy({ url: msg.payload?.url || msg.url });
          if (typeof cb === 'function') cb({ success: true, tabId: 802 });
          return Promise.resolve({ success: true, tabId: 802 });
        }
        if (msg.action === 'COBALT_DOWNLOAD') {
          if (typeof cb === 'function') cb({ success: false, error: 'SERVER_UNREACHABLE' });
          return Promise.resolve({ success: false, error: 'SERVER_UNREACHABLE' });
        }
        return Promise.resolve({ success: true });
      });

      // Network fetch fails for Cobalt
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Cobalt is unreachable'));

      const controller = attachToolbar(
        video,
        { tweetId: '99002' },
        { stateStore: env.stateStore, enableCdnResolver: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { cdnBtn } = getToolbarButtons(host);

      simulatePointerEvent(cdnBtn, 'click');

      await new Promise((r) => setTimeout(r, 60));

      expect(tabsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://video.twimg.com/ext_tw_video/99002/pu/vid/avc1/1280x720/offline_test.mp4',
        })
      );
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    });

    it('4.3 Dismiss button hides toolbar and persists dismissal in videoStateStore', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(
        video,
        { tweetId: '99003' },
        { stateStore: env.stateStore }
      );

      const host = getToolbarHost(videoWrapper);
      const { dismissBtn } = getToolbarButtons(host);

      expect(controller.stateManager.isDismissed()).toBe(false);

      // User clicks Dismiss
      simulatePointerEvent(dismissBtn, 'click');

      // State becomes DISMISSED
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);
      expect(controller.stateManager.isDismissed()).toBe(true);
      expect(host.classList.contains('xvt-toolbar-visible')).toBe(false);

      // State store records dismissal
      expect(env.stateStore.isDismissed('99003_media_null', video)).toBe(true);
      expect(video.dataset.xvtDismissed).toBe('true');

      // Subsequent mouseenter does NOT reveal toolbar
      simulatePointerEvent(videoWrapper, 'mouseenter');
      expect(host.classList.contains('xvt-toolbar-visible')).toBe(false);
    });

    it('4.4 Action buttons (Download, Open CDN, Dismiss) do not cross-contaminate each other', async () => {
      vi.useFakeTimers();
      const { video, videoWrapper } = env;
      video.src = 'https://video.twimg.com/vid.mp4';

      const controller = attachToolbar(
        video,
        { tweetId: '99004' },
        { stateStore: env.stateStore, enableDownload: true, enableCdnResolver: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, cdnBtn } = getToolbarButtons(host);

      let capturedDownloadCb;
      const sendMsgSpy = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        if (msg.action === 'COBALT_DOWNLOAD') {
          capturedDownloadCb = cb;
        }
      });

      // 1. Click Download
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // 2. Click Open CDN while Download is processing - concurrency guard prevents clash
      simulatePointerEvent(cdnBtn, 'click');
      // State remains in Download's PROCESSING
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // 3. Complete Download
      capturedDownloadCb({ success: true, downloadId: 4401 });
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // SECTION 5: Additional Adversarial Boundary Challenges
  // =========================================================================
  describe('5. Adversarial Boundary & Security Challenges', () => {
    it('5.1 Multi-video tweet concurrency: MediaIndex 1 and MediaIndex 2 operate independently', async () => {
      let downloadIdCounter = 50000;
      vi.spyOn(chrome.downloads, 'download').mockImplementation(async () => ++downloadIdCounter);

      const tweetId = '1800000000000000999';
      const keyMedia1 = `${tweetId}_media_1`;
      const keyMedia2 = `${tweetId}_media_2`;

      // Both videos belong to the SAME tweetId but have distinct mediaIndex
      const [res1, res2] = await Promise.all([
        initiateDownload(keyMedia1, {
          url: 'https://video.twimg.com/vid_m1.mp4',
          tweetId,
          username: 'multi_creator',
        }),
        initiateDownload(keyMedia2, {
          url: 'https://video.twimg.com/vid_m2.mp4',
          tweetId,
          username: 'multi_creator',
        }),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res1.downloadId).toBe(50001);
      expect(res2.downloadId).toBe(50002);
      expect(res1.downloadId).not.toBe(res2.downloadId);
    });

    it('5.2 Filename path-traversal & illegal character sanitization', () => {
      const maliciousTweet = {
        tweetId: '..\\..\\windows\\system32',
        username: '../../etc/passwd',
        extension: 'exe',
      };

      const filename = generateFilename(maliciousTweet);
      // Slashes must be replaced with underscores
      expect(filename).not.toContain('/');
      expect(filename).not.toContain('\\');
      expect(filename).not.toMatch(/[\\/:*?"<>|]/);
      expect(filename).toBe('X_.._.._etc_passwd_.._.._windows_system32.exe');
    });

    it('5.3 Clicking Download during SUCCESS state: background lock guards against duplicate download', async () => {
      vi.useFakeTimers();
      const { video, videoWrapper } = env;
      const controller = attachToolbar(
        video,
        { tweetId: '9000000000000000003', username: 'tester' },
        { stateStore: env.stateStore, enableDownload: true }
      );

      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      // Set up background mock that tracks active in-flight download
      let bgCalls = 0;
      vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
        bgCalls++;
        if (bgCalls === 1) {
          // First download succeeds
          cb({ success: true, downloadId: 6001 });
        } else {
          // Second download while first is in-flight is rejected by background
          cb({ success: false, blocked: true, error: 'DOWNLOAD_IN_PROGRESS', message: 'Video này đang trong quá trình tải xuống.' });
        }
      });

      // 1. Initial click
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);

      // 2. Advance 850ms so toolbar enters SUCCESS state
      vi.advanceTimersByTime(850);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);

      // 3. User clicks Download again while in SUCCESS state
      simulatePointerEvent(downloadBtn, 'click');

      // The background download manager rejected the duplicate
      expect(bgCalls).toBe(2);

      vi.useRealTimers();
    });
  });
});
