// tests/state.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createVideoStateStore,
  getVideoKey,
} from '../src/content/state/index.js';

describe('state module (VideoStateStore)', () => {
  let store;

  beforeEach(() => {
    store = createVideoStateStore();
  });

  it('manages mounted state via Tier 1 dataset and Tier 2 WeakSet', () => {
    const video = document.createElement('video');
    expect(store.isMounted(video)).toBe(false);

    store.markMounted(video, '1001_media_null');
    expect(store.isMounted(video)).toBe(true);
    expect(video.dataset.xvtMounted).toBe('true');
    expect(video.dataset.xvtVideoKey).toBe('1001_media_null');

    store.unmarkMounted(video);
    expect(store.isMounted(video)).toBe(false);
    expect(video.dataset.xvtMounted).toBeUndefined();
  });

  it('dismisses video across Tier 1, Tier 2, and Tier 3', () => {
    const video = document.createElement('video');
    const key = '1002_media_1';

    store.markMounted(video, key);
    expect(store.isMounted(video)).toBe(true);
    expect(video.dataset.xvtMounted).toBe('true');
    expect(store.isDismissed(key, video)).toBe(false);

    store.dismiss(key, video);
    expect(store.isDismissed(key, video)).toBe(true);
    expect(video.dataset.xvtDismissed).toBe('true');
    expect(video.dataset.xvtMounted).toBeUndefined();
    expect(store.isMounted(video)).toBe(false);
    expect(store.getDismissedCount()).toBe(1);
  });

  it('preserves dismissed state across simulated virtual scroll element replacement (Tier 3)', () => {
    const oldVideo = document.createElement('video');
    const key = '1003_media_null';

    // User dismisses old element
    store.dismiss(key, oldVideo);
    expect(store.isDismissed(key, oldVideo)).toBe(true);

    // Simulate virtual scroll: old element removed, fresh new DOM element instantiated
    const newVideo = document.createElement('video');
    expect(newVideo.dataset.xvtDismissed).toBeUndefined();

    // Querying with key finds it in Tier 3 session Set and re-syncs Tier 1 on new element
    const isDismissed = store.isDismissed(key, newVideo);
    expect(isDismissed).toBe(true);
    expect(newVideo.dataset.xvtDismissed).toBe('true');
  });

  it('isolates per-video metadata between multiple elements via WeakMap', () => {
    const v1 = document.createElement('video');
    const v2 = document.createElement('video');

    store.setPerVideoData(v1, { tweetId: 't1', speed: 1.0 });
    store.setPerVideoData(v2, { tweetId: 't2', speed: 1.5 });

    expect(store.getPerVideoData(v1)).toEqual({ tweetId: 't1', speed: 1.0 });
    expect(store.getPerVideoData(v2)).toEqual({ tweetId: 't2', speed: 1.5 });

    // Modifying v1 does not mutate v2
    store.setPerVideoData(v1, { speed: 2.0 });
    expect(store.getPerVideoData(v1).speed).toBe(2.0);
    expect(store.getPerVideoData(v2).speed).toBe(1.5);
  });

  it('resets state store cleanly', () => {
    const video = document.createElement('video');
    const key = '1004_media_null';
    store.dismiss(key, video);
    store.markMounted(video, key);
    store.setPerVideoData(video, { meta: true });

    expect(store.getDismissedCount()).toBe(1);

    store.reset(true);
    expect(store.getDismissedCount()).toBe(0);
    const freshVideo = document.createElement('video');
    expect(store.isDismissed(key, freshVideo)).toBe(false); // Tier 3 cleared
  });

  it('STRICT RULE: never stores DOM references in chrome.storage', () => {
    const setSpy = vi.spyOn(chrome.storage.local, 'set');
    const video = document.createElement('video');
    const key = '1005_media_null';

    store.markMounted(video, key);
    store.dismiss(key, video);
    store.setPerVideoData(video, { custom: 'data' });

    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });
});
