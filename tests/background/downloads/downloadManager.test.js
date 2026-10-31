// tests/background/downloads/downloadManager.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startDownload,
  generateFilename,
  trackDownload,
  initiateDownload,
  resetDownloadManager,
  DOWNLOAD_STATES,
} from '../../../src/background/downloads/downloadManager.js';

describe('Group D: Download Manager Tests (Tests 26–34)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetDownloadManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetDownloadManager();
  });

  it('Test 26: chrome.downloads.download invocation with options (uniquify, saveAs false, verified URL)', async () => {
    const downloadSpy = vi.spyOn(chrome.downloads, 'download').mockResolvedValue(1001);

    const res = await startDownload({
      url: 'https://cobalt.io/tunnel?id=test',
      filename: 'X_elonmusk_123.mp4',
    });

    expect(downloadSpy).toHaveBeenCalledWith({
      url: 'https://cobalt.io/tunnel?id=test',
      filename: 'X_elonmusk_123.mp4',
      conflictAction: 'uniquify',
      saveAs: false,
    });

    expect(res.success).toBe(true);
    expect(res.downloadId).toBe(1001);
  });

  it('Test 26b: chrome.downloads.download invocation without filename preserves native server naming and last-used folder', async () => {
    const downloadSpy = vi.spyOn(chrome.downloads, 'download').mockResolvedValue(1002);

    const res = await startDownload({
      url: 'https://cobalt.io/tunnel?id=native_test',
    });

    expect(downloadSpy).toHaveBeenCalledWith({
      url: 'https://cobalt.io/tunnel?id=native_test',
      conflictAction: 'uniquify',
      saveAs: false,
    });
    // Ensure filename property was NOT included in options
    expect(downloadSpy.mock.calls[0][0]).not.toHaveProperty('filename');

    expect(res.success).toBe(true);
    expect(res.downloadId).toBe(1002);
  });

  it('Test 27: File naming convention: Username + Tweet ID (strips illegal filesystem characters)', () => {
    const filename1 = generateFilename({
      username: 'elonmusk',
      tweetId: '1800000000000000000',
      extension: 'mp4',
    });
    expect(filename1).toBe('X_elonmusk_1800000000000000000.mp4');

    // Test with illegal characters: \ / : * ? " < > |
    const filenameDirty = generateFilename({
      username: 'bad/user:name*with?chars',
      tweetId: '12345/678',
      extension: 'mp4',
    });
    expect(filenameDirty).toBe('X_bad_user_name_with_chars_12345_678.mp4');
    expect(filenameDirty).not.toMatch(/[\\/:*?"<>|]/);
  });

  it('Test 28: File naming convention: Fallback without username (uses "video", never "null" or "undefined")', () => {
    const filenameNull = generateFilename({
      username: null,
      tweetId: '1800000000000000000',
      extension: 'mp4',
    });
    expect(filenameNull).toBe('X_video_1800000000000000000.mp4');
    expect(filenameNull).not.toContain('null');

    const filenameUndefined = generateFilename({
      username: undefined,
      tweetId: '1800000000000000000',
    });
    expect(filenameUndefined).toBe('X_video_1800000000000000000.mp4');
    expect(filenameUndefined).not.toContain('undefined');

    const filenameEmpty = generateFilename({
      username: '   ',
      tweetId: '1800000000000000000',
    });
    expect(filenameEmpty).toBe('X_video_1800000000000000000.mp4');
  });

  it('Test 29: File extension validation & deduplication (prevents double extension .mp4.mp4)', () => {
    // When filename already has .mp4
    const res = generateFilename('1800000000000000000', 'creator', '.mp4');
    expect(res).toBe('X_creator_1800000000000000000.mp4');
    expect(res).not.toContain('.mp4.mp4');

    // Passing filename directly into startDownload
    vi.spyOn(chrome.downloads, 'download').mockImplementation(async (opts) => {
      expect(opts.filename).toBe('X_creator_123.mp4');
      return 1002;
    });

    return startDownload({
      url: 'https://video.twimg.com/video.mp4',
      filename: 'X_creator_123.mp4',
    });
  });

  it('Test 30: Download lifecycle: In progress & Completion event dispatching', async () => {
    const onCompleteSpy = vi.fn();

    const trackPromise = trackDownload(1001, {
      videoKey: 'vid_1001',
      onComplete: onCompleteSpy,
    });

    // Simulate chrome.downloads.onChanged dispatching complete state
    chrome.downloads.onChanged.dispatch({
      id: 1001,
      state: { current: 'complete', previous: 'in_progress' },
    });

    const res = await trackPromise;
    expect(res.success).toBe(true);
    expect(res.state).toBe(DOWNLOAD_STATES.COMPLETED);
    expect(onCompleteSpy).toHaveBeenCalledWith({
      downloadId: 1001,
      state: DOWNLOAD_STATES.COMPLETED,
    });
  });

  it('Test 31: Download lifecycle: Interrupted / Network failure emits error and releases task lock', async () => {
    const onErrorSpy = vi.fn();

    const trackPromise = trackDownload(1002, {
      videoKey: 'vid_1002',
      onError: onErrorSpy,
    });

    // Simulate chrome.downloads.onChanged dispatching network failure
    chrome.downloads.onChanged.dispatch({
      id: 1002,
      state: { current: 'interrupted', previous: 'in_progress' },
      error: { current: 'NETWORK_FAILED' },
    });

    await expect(trackPromise).rejects.toMatchObject({
      downloadId: 1002,
      error: 'NETWORK_FAILED',
      state: DOWNLOAD_STATES.INTERRUPTED,
    });

    expect(onErrorSpy).toHaveBeenCalledWith({
      downloadId: 1002,
      error: 'NETWORK_FAILED',
      message: expect.stringContaining('gián đoạn'),
    });
  });

  it('Test 32: Download lifecycle: User cancellation identified cleanly without error alerts', async () => {
    const onCancelSpy = vi.fn();

    const trackPromise = trackDownload(1003, {
      videoKey: 'vid_1003',
      onCancel: onCancelSpy,
    });

    // Simulate user cancellation
    chrome.downloads.onChanged.dispatch({
      id: 1003,
      state: { current: 'interrupted', previous: 'in_progress' },
      error: { current: 'USER_CANCELED' },
    });

    const res = await trackPromise;
    expect(res.success).toBe(true);
    expect(res.cancelled).toBe(true);
    expect(res.state).toBe(DOWNLOAD_STATES.CANCELLED);
    expect(onCancelSpy).toHaveBeenCalledWith({
      downloadId: 1003,
      state: DOWNLOAD_STATES.CANCELLED,
    });
  });

  it('Test 33: Anti-duplicate download prevention for the same video entity', async () => {
    let callCount = 0;
    vi.spyOn(chrome.downloads, 'download').mockImplementation(async () => {
      callCount++;
      return 2001;
    });

    const videoKey = '1800000000000000001_media_1';

    // First download begins
    const res1 = await initiateDownload(videoKey, {
      url: 'https://video.twimg.com/v1.mp4',
      tweetId: '1800000000000000001',
    });

    expect(res1.success).toBe(true);
    expect(callCount).toBe(1);

    // Second download on the same videoKey while in flight is BLOCKED
    const res2 = await initiateDownload(videoKey, {
      url: 'https://video.twimg.com/v1.mp4',
      tweetId: '1800000000000000001',
    });

    expect(res2.blocked).toBe(true);
    expect(res2.reason).toBe('DOWNLOAD_IN_PROGRESS');
    expect(callCount).toBe(1); // Not called twice!
  });

  it('Test 34: Independent download tasks for different videos operating concurrently', async () => {
    let nextId = 3001;
    vi.spyOn(chrome.downloads, 'download').mockImplementation(async () => {
      return nextId++;
    });

    const keyA = 'video_A_tweet_100';
    const keyB = 'video_B_tweet_200';

    // Trigger video A
    const resA = await initiateDownload(keyA, {
      url: 'https://video.twimg.com/A.mp4',
      tweetId: '100',
    });

    // Trigger video B concurrently
    const resB = await initiateDownload(keyB, {
      url: 'https://video.twimg.com/B.mp4',
      tweetId: '200',
    });

    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);
    expect(resA.downloadId).toBe(3001);
    expect(resB.downloadId).toBe(3002);
    expect(resA.downloadId).not.toBe(resB.downloadId);

    // Fail video A
    chrome.downloads.onChanged.dispatch({
      id: 3001,
      state: { current: 'interrupted' },
      error: { current: 'NETWORK_FAILED' },
    });

    // Complete video B
    const bCompletedSpy = vi.fn();
    trackDownload(3002, { onComplete: bCompletedSpy });

    chrome.downloads.onChanged.dispatch({
      id: 3002,
      state: { current: 'complete' },
    });

    expect(bCompletedSpy).toHaveBeenCalledWith({
      downloadId: 3002,
      state: DOWNLOAD_STATES.COMPLETED,
    });
  });
});
