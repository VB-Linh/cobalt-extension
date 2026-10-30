// tests/content/toolbar/lifecycle.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { attachToolbar, detachToolbar, getToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import { createVideoObserver } from '../../../src/content/observers/videoObserver.js';
import { detectVideos, findTweetContainer } from '../../../src/content/detection/index.js';
import { extractTweetInfo } from '../../../src/content/extraction/index.js';

describe('Group D: State & Lifecycle (Scenarios 16–20)', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
    env = setupToolbarTestEnv({ tweetId: '1800000000000000040' });
  });

  afterEach(() => {
    vi.useRealTimers();
    teardownToolbarTestEnv(env);
  });

  it('Scenario 16: toolbar does not reappear on dismissed video during subsequent observer scans', () => {
    const { root, video, videoWrapper, stateStore } = env;

    let detectedCount = 0;
    const observer = createVideoObserver({
      root,
      stateStore,
      detectVideos,
      findTweetContainer,
      extractTweetInfo,
      onVideoDetected: (v, info) => {
        detectedCount++;
        attachToolbar(v, info, { stateStore });
      },
    });

    observer.start();
    expect(getToolbarHost(videoWrapper)).not.toBeNull();
    const initialDetectedCount = detectedCount;

    // Dismiss the toolbar
    const controller = getToolbar(video);
    expect(controller).not.toBeNull();
    controller.dismiss();

    // Finish 150ms dismiss animation
    vi.advanceTimersByTime(160);
    expect(getToolbarHost(videoWrapper)).toBeNull();
    expect(stateStore.isDismissed(undefined, video)).toBe(true);

    // Run DOM scan again
    observer.scan();
    vi.advanceTimersByTime(50);

    // Toolbar must NOT reappear
    expect(getToolbarHost(videoWrapper)).toBeNull();
    expect(getToolbar(video)).toBeNull();

    observer.stop();
  });

  it('Scenario 17: virtual scrolling maintains dismissed state via Tier 3 canonical video key', () => {
    teardownToolbarTestEnv(env);
    env = setupToolbarTestEnv({
      tweetId: '1800000000000000050',
      videoIndices: [1],
    });

    const { video, videoWrapper, stateStore } = env;
    const tweetInfo = { tweetId: '1800000000000000050', mediaIndex: 1 };

    const controller = attachToolbar(video, tweetInfo, { stateStore });
    expect(controller).not.toBeNull();

    // Dismiss video
    controller.dismiss();
    vi.advanceTimersByTime(160);
    expect(stateStore.isDismissed(undefined, video)).toBe(true);

    // Simulate virtual scroll recycling: X unmounts old video element and mounts a new one
    detachToolbar(video);
    videoWrapper.innerHTML = '';

    const newMediaAnchor = document.createElement('a');
    newMediaAnchor.href = 'https://x.com/testuser/status/1800000000000000050/video/1';
    newMediaAnchor.setAttribute('role', 'link');

    const newVideo = document.createElement('video');
    newVideo.src = 'blob:https://x.com/vid-1800000000000000050-1';
    newMediaAnchor.appendChild(newVideo);
    videoWrapper.appendChild(newMediaAnchor);

    // New element is tested for dismissal
    const newTweetInfo = { tweetId: '1800000000000000050', mediaIndex: 1 };
    const attachResult = attachToolbar(newVideo, newTweetInfo, { stateStore });

    // Must be rejected because canonical key matches Tier 3 dismissed key
    expect(attachResult).toBeNull();
    expect(getToolbarHost(videoWrapper)).toBeNull();
  });

  it('Scenario 18: tweet re-rendering tears down old toolbar cleanly without leaving orphan host elements', () => {
    const { root, video, videoWrapper, stateStore } = env;

    const controller = attachToolbar(video, { tweetId: '1800000000000000040' }, { stateStore });
    expect(getToolbarHost(videoWrapper)).not.toBeNull();

    // Detach old video
    detachToolbar(video);

    expect(getToolbarHost(videoWrapper)).toBeNull();
    expect(root.querySelectorAll('.xvt-toolbar-host').length).toBe(0);
  });

  it('Scenario 19: cleans up active timers and event listeners on destroy()', () => {
    const { video, videoWrapper, stateStore } = env;

    const controller = attachToolbar(video, { tweetId: '1800000000000000040' }, { stateStore });

    // Trigger hover leave to schedule a 300ms grace period timer
    simulatePointerEvent(videoWrapper, 'mouseenter');
    simulatePointerEvent(videoWrapper, 'mouseleave');

    expect(controller.eventController.getHideTimer()).not.toBeNull();

    // Destroy toolbar while timer is ticking
    controller.destroy();

    // Verify timer was cancelled
    expect(controller.eventController.getHideTimer()).toBeNull();

    // Advance time past 300ms — no exceptions should be thrown
    expect(() => {
      vi.advanceTimersByTime(500);
    }).not.toThrow();
  });

  it('Scenario 20: strictly integrates with and updates Phase 1 VideoStateStore across all 3 tiers', () => {
    const { video, videoWrapper, stateStore } = env;
    const tweetInfo = { tweetId: '1800000000000000040', mediaIndex: 1 };

    const controller = attachToolbar(video, tweetInfo, { stateStore });

    // Pre-dismiss state
    expect(stateStore.isDismissed(undefined, video)).toBe(false);

    // Dismiss via controller
    controller.dismiss();

    // Tier 1 (DOM dataset): tagged on video element
    expect(video.dataset.xvtDismissed).toBe('true');

    // Tier 2 (Weak references): tracked in stateStore
    expect(stateStore.isDismissed(undefined, video)).toBe(true);

    // Tier 3 (Canonical string keys): tab session count incremented
    expect(stateStore.getDismissedCount()).toBe(1);
  });
});
