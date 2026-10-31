// tests/empiricalChallengerM6Lifecycle.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initiateDownload,
  startDownload,
  trackDownload,
  resetDownloadManager,
  DOWNLOAD_STATES,
} from '../src/background/downloads/downloadManager.js';

describe('Empirical Challenger: Milestone M6-1 Runtime Lifecycle & Multi-Tab Stress Suite', () => {
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
  // SECTION 1: Simultaneous Multi-Tab Downloads & Strict Isolation
  // =========================================================================
  describe('1. Simultaneous Multi-Tab Downloads & State Isolation', () => {
    it('1.1 coordinates 5 concurrent tabs with independent lifecycles and zero cross-talk', async () => {
      let downloadSeq = 7000;
      vi.spyOn(chrome.downloads, 'download').mockImplementation(async () => ++downloadSeq);

      // Track messages sent per tabId
      const tabMessages = new Map();
      const recordTabMessage = (tabId, msg) => {
        if (!tabMessages.has(tabId)) tabMessages.set(tabId, []);
        tabMessages.get(tabId).push(msg);
      };

      vi.spyOn(chrome.tabs, 'sendMessage').mockImplementation((tabId, msg, cb) => {
        recordTabMessage(tabId, msg);
        if (typeof cb === 'function') cb();
        return Promise.resolve();
      });

      const tabs = [101, 102, 103, 104, 105];
      const initiatePromises = tabs.map((tabId, idx) => {
        return initiateDownload(`video_tab_${tabId}_${idx}`, {
          url: `https://video.twimg.com/tab_${tabId}.mp4`,
          tweetId: `tweet_${tabId}`,
          tabId,
        });
      });

      const results = await Promise.all(initiatePromises);

      // Verify all 5 initiated successfully with unique downloadIds
      expect(results).toHaveLength(5);
      const downloadIds = results.map((r) => r.downloadId);
      expect(new Set(downloadIds).size).toBe(5);
      results.forEach((r) => expect(r.success).toBe(true));

      // Simulate mixed lifecycles across the 5 tabs:
      // Tab 101 (id: 7001) -> completes
      chrome.downloads.onChanged.dispatch({ id: 7001, state: { current: 'complete' } });
      // Tab 102 (id: 7002) -> user cancels
      chrome.downloads.onChanged.dispatch({ id: 7002, state: { current: 'interrupted' }, error: { current: 'USER_CANCELED' } });
      // Tab 103 (id: 7003) -> network fails
      chrome.downloads.onChanged.dispatch({ id: 7003, state: { current: 'interrupted' }, error: { current: 'NETWORK_FAILED' } });
      // Tab 104 (id: 7004) -> completes
      chrome.downloads.onChanged.dispatch({ id: 7004, state: { current: 'complete' } });
      // Tab 105 (id: 7005) -> completes
      chrome.downloads.onChanged.dispatch({ id: 7005, state: { current: 'complete' } });

      // Verify tab 101 received only complete
      const msgs101 = tabMessages.get(101) || [];
      expect(msgs101).toHaveLength(1);
      expect(msgs101[0]).toMatchObject({ state: 'complete', downloadId: 7001, videoKey: 'video_tab_101_0' });

      // Verify tab 102 received only cancelled
      const msgs102 = tabMessages.get(102) || [];
      expect(msgs102).toHaveLength(1);
      expect(msgs102[0]).toMatchObject({ state: 'cancelled', downloadId: 7002, videoKey: 'video_tab_102_1' });

      // Verify tab 103 received only interrupted
      const msgs103 = tabMessages.get(103) || [];
      expect(msgs103).toHaveLength(1);
      expect(msgs103[0]).toMatchObject({ state: 'interrupted', downloadId: 7003, error: 'NETWORK_FAILED', videoKey: 'video_tab_103_2' });

      // Verify tab 104 received only complete
      const msgs104 = tabMessages.get(104) || [];
      expect(msgs104).toHaveLength(1);
      expect(msgs104[0]).toMatchObject({ state: 'complete', downloadId: 7004, videoKey: 'video_tab_104_3' });

      // Verify tab 105 received only complete
      const msgs105 = tabMessages.get(105) || [];
      expect(msgs105).toHaveLength(1);
      expect(msgs105[0]).toMatchObject({ state: 'complete', downloadId: 7005, videoKey: 'video_tab_105_4' });
    });

    it('1.2 prevents duplicate downloads when two distinct tabs contend for the exact same videoKey', async () => {
      let downloadSeq = 8000;
      vi.spyOn(chrome.downloads, 'download').mockImplementation(async () => ++downloadSeq);

      const sharedKey = 'shared_viral_video_key_999';

      // Tab 201 and Tab 202 both click download on the same video at virtually the same instant
      const [resTab1, resTab2] = await Promise.all([
        initiateDownload(sharedKey, { url: 'https://video.twimg.com/shared.mp4', tweetId: '999', tabId: 201 }),
        initiateDownload(sharedKey, { url: 'https://video.twimg.com/shared.mp4', tweetId: '999', tabId: 202 }),
      ]);

      // Exactly one tab secures the in-flight lock; the other is blocked
      const successful = [resTab1, resTab2].filter((r) => r.success === true);
      const blocked = [resTab1, resTab2].filter((r) => r.blocked === true);

      expect(successful).toHaveLength(1);
      expect(blocked).toHaveLength(1);
      expect(blocked[0].reason).toBe('DOWNLOAD_IN_PROGRESS');

      // Finish the successful download
      chrome.downloads.onChanged.dispatch({ id: successful[0].downloadId, state: { current: 'complete' } });

      // The second tab can now initiate download cleanly
      const retryTab2 = await initiateDownload(sharedKey, {
        url: 'https://video.twimg.com/shared.mp4',
        tweetId: '999',
        tabId: 202,
      });
      expect(retryTab2.success).toBe(true);
      expect(retryTab2.downloadId).toBe(8002);
    });
  });

  // =========================================================================
  // SECTION 2: User Cancellation (USER_CANCELED) and Immediate Retry Stress
  // =========================================================================
  describe('2. User Cancellation & Immediate Retry Stress', () => {
    it('2.1 sustains 10 rapid consecutive initiate -> cancel -> retry cycles without lock leakage', async () => {
      let currentDlId = 9100;
      vi.spyOn(chrome.downloads, 'download').mockImplementation(async () => ++currentDlId);

      const videoKey = 'stress_cancel_retry_key';
      const tabId = 301;

      for (let i = 0; i < 10; i++) {
        // 1. Initiate download
        const initRes = await initiateDownload(videoKey, {
          url: `https://video.twimg.com/vid_${i}.mp4`,
          tweetId: '1000',
          tabId,
        });

        expect(initRes.success).toBe(true);
        expect(initRes.downloadId).toBe(currentDlId);

        // 2. Concurrency check: immediate duplicate attempt MUST be blocked
        const dupRes = await initiateDownload(videoKey, {
          url: `https://video.twimg.com/vid_${i}.mp4`,
          tweetId: '1000',
          tabId,
        });
        expect(dupRes.blocked).toBe(true);
        expect(dupRes.reason).toBe('DOWNLOAD_IN_PROGRESS');

        // 3. User cancels download
        chrome.downloads.onChanged.dispatch({
          id: initRes.downloadId,
          state: { current: 'interrupted' },
          error: { current: 'USER_CANCELED' },
        });

        // 4. Retry immediately: lock MUST be released without delay
        const retryRes = await initiateDownload(videoKey, {
          url: `https://video.twimg.com/vid_${i}.mp4`,
          tweetId: '1000',
          tabId,
        });
        expect(retryRes.blocked).toBeFalsy();
        expect(retryRes.success).toBe(true);

        // Clean up retry
        chrome.downloads.onChanged.dispatch({
          id: retryRes.downloadId,
          state: { current: 'complete' },
        });
      }
    });

    it('2.2 resolves trackDownload promise cleanly on USER_CANCELED with cancelled: true flag', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(9201);

      const onCancelCb = vi.fn();
      const videoKey = 'track_cancel_key';

      const initRes = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/cancel.mp4',
        tweetId: '2000',
        tabId: 302,
      });

      const trackingPromise = trackDownload(initRes.downloadId, {
        videoKey,
        tabId: 302,
        onCancel: onCancelCb,
      });

      chrome.downloads.onChanged.dispatch({
        id: initRes.downloadId,
        state: { current: 'interrupted' },
        error: { current: 'USER_CANCELED' },
      });

      const outcome = await trackingPromise;
      expect(outcome.success).toBe(true);
      expect(outcome.cancelled).toBe(true);
      expect(outcome.state).toBe(DOWNLOAD_STATES.CANCELLED);
      expect(onCancelCb).toHaveBeenCalledWith(expect.objectContaining({ state: DOWNLOAD_STATES.CANCELLED }));
    });
  });

  // =========================================================================
  // SECTION 3: Simulated Closed/Navigated Tab During Download Completion
  // =========================================================================
  describe('3. Simulated Closed / Navigated Tab Scenarios', () => {
    it('3.1 completes safely when tabs.sendMessage returns runtime.lastError (Receiving end does not exist)', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(9301);

      // Simulate dead tab where Chrome sets runtime.lastError in the callback
      vi.spyOn(chrome.tabs, 'sendMessage').mockImplementation((tabId, msg, cb) => {
        chrome.runtime.lastError = { message: 'Receiving end does not exist.' };
        if (typeof cb === 'function') cb();
        return Promise.resolve();
      });

      const videoKey = 'dead_tab_key_1';
      const initRes = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/dead.mp4',
        tweetId: '3001',
        tabId: 99999, // Non-existent closed tab
      });

      expect(initRes.success).toBe(true);

      // Completion must not throw or crash
      expect(() => {
        chrome.downloads.onChanged.dispatch({
          id: 9301,
          state: { current: 'complete' },
        });
      }).not.toThrow();

      // Lock is released cleanly
      const retry = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/dead.mp4',
        tweetId: '3001',
        tabId: 99999,
      });
      expect(retry.blocked).toBeFalsy();
      expect(retry.success).toBe(true);

      chrome.runtime.lastError = null;
    });

    it('3.2 survives synchronous throw from chrome.tabs.sendMessage (e.g. invalid tab ID or navigation)', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(9302);

      // Simulate chrome.tabs.sendMessage throwing synchronously
      vi.spyOn(chrome.tabs, 'sendMessage').mockImplementation(() => {
        throw new Error('Error: Tab 88888 was closed before message could be delivered.');
      });

      const videoKey = 'dead_tab_key_2';
      const initRes = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/dead2.mp4',
        tweetId: '3002',
        tabId: 88888,
      });

      expect(initRes.success).toBe(true);

      // onChanged dispatch triggers broadcastDownloadStatus which catches the throw
      expect(() => {
        chrome.downloads.onChanged.dispatch({
          id: 9302,
          state: { current: 'complete' },
        });
      }).not.toThrow();

      // Lock is still cleaned up
      const retry = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/dead2.mp4',
        tweetId: '3002',
      });
      expect(retry.blocked).toBeFalsy();
      expect(retry.success).toBe(true);
    });

    it('3.3 handles tab closed during interrupted/error lifecycle event gracefully', async () => {
      vi.spyOn(chrome.downloads, 'download').mockResolvedValue(9303);

      vi.spyOn(chrome.tabs, 'sendMessage').mockImplementation((tabId, msg, cb) => {
        chrome.runtime.lastError = { message: 'Receiving end does not exist.' };
        if (typeof cb === 'function') cb();
        return Promise.resolve();
      });

      const videoKey = 'dead_tab_key_3';
      const initRes = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/dead3.mp4',
        tweetId: '3003',
        tabId: 77777,
      });

      expect(initRes.success).toBe(true);

      // Network error occurs for closed tab
      expect(() => {
        chrome.downloads.onChanged.dispatch({
          id: 9303,
          state: { current: 'interrupted' },
          error: { current: 'SERVER_BAD_CONTENT' },
        });
      }).not.toThrow();

      // Lock is freed
      const retry = await initiateDownload(videoKey, {
        url: 'https://video.twimg.com/dead3.mp4',
        tweetId: '3003',
      });
      expect(retry.blocked).toBeFalsy();

      chrome.runtime.lastError = null;
    });
  });
});
