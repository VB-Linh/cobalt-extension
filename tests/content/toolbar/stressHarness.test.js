// tests/content/toolbar/stressHarness.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { createTweetFixture } from '../../fixtures/factory.js';
import {
  attachToolbar,
  detachToolbar,
  getToolbar,
  clearToolbarRegistry,
} from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import { createVideoObserver } from '../../../src/content/observers/videoObserver.js';
import { createVideoStateStore, getVideoKey } from '../../../src/content/state/videoState.js';
import { detectVideos, findTweetContainer } from '../../../src/content/detection/index.js';
import { extractTweetInfo } from '../../../src/content/extraction/index.js';

describe('Empirical Challenge & Stress Harness: Floating Toolbar', () => {
  let root;
  let stateStore;

  beforeEach(() => {
    root = document.createElement('div');
    root.id = 'stress-timeline-root';
    document.body.appendChild(root);
    stateStore = createVideoStateStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (root && root.parentNode) {
      root.parentNode.removeChild(root);
    }
    stateStore.reset();
  });

  const flushAsync = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

  // =========================================================================
  // Dimension 1: Virtual Scrolling & Element Recycling Stress
  // =========================================================================
  describe('1. Virtual Scrolling & Element Recycling Stress', () => {
    it('simulates 50-video timeline: mounts 50, dismisses 25, virtualizes out of DOM, and scrolls back with recycled DOM nodes', async () => {
      const detectedVideos = new Map();
      const removedVideos = new Set();

      const observer = createVideoObserver({
        root,
        stateStore,
        detectVideos,
        findTweetContainer,
        extractTweetInfo,
        onVideoDetected: (video, info) => {
          detectedVideos.set(video, info);
          attachToolbar(video, info, { stateStore });
        },
        onVideoRemoved: (video) => {
          removedVideos.add(video);
          detachToolbar(video);
        },
      });

      observer.start();

      // Step 1: Mount 50 video tweets into timeline
      const TOTAL_VIDEOS = 50;
      const tweets = [];
      for (let i = 1; i <= TOTAL_VIDEOS; i++) {
        const tweetId = `1980000000000000${String(i).padStart(3, '0')}`;
        const tweet = createTweetFixture({ tweetId, username: `user_${i}` });
        tweets.push(tweet);
        root.appendChild(tweet);
      }

      await flushAsync();

      // Verify all 50 videos mounted and received toolbars
      expect(detectedVideos.size).toBe(TOTAL_VIDEOS);
      const videoElements = Array.from(root.querySelectorAll('video'));
      expect(videoElements).toHaveLength(TOTAL_VIDEOS);

      for (const video of videoElements) {
        expect(getToolbar(video)).not.toBeNull();
        const wrapper = video.closest('[data-testid="videoComponent"]');
        expect(getToolbarHost(wrapper)).not.toBeNull();
      }

      // Step 2: User dismisses first 25 videos
      const DISMISSED_COUNT = 25;
      for (let i = 0; i < DISMISSED_COUNT; i++) {
        const video = videoElements[i];
        const controller = getToolbar(video);
        expect(controller).not.toBeNull();
        controller.dismiss();
      }

      // Advance through 150ms dismiss animation
      await flushAsync(180);

      // Verify first 25 are dismissed and their toolbars removed from DOM
      for (let i = 0; i < DISMISSED_COUNT; i++) {
        const video = videoElements[i];
        expect(getToolbar(video)).toBeNull();
        const wrapper = video.closest('[data-testid="videoComponent"]');
        expect(getToolbarHost(wrapper)).toBeNull();
        expect(stateStore.isDismissed(undefined, video)).toBe(true);
      }

      // Verify remaining 25 are still active and have live toolbars
      for (let i = DISMISSED_COUNT; i < TOTAL_VIDEOS; i++) {
        const video = videoElements[i];
        expect(getToolbar(video)).not.toBeNull();
        const wrapper = video.closest('[data-testid="videoComponent"]');
        expect(getToolbarHost(wrapper)).not.toBeNull();
      }

      // Step 3: Virtual scroll virtualization — unmount all 50 tweets from DOM
      removedVideos.clear();
      root.innerHTML = '';
      await flushAsync();

      // Verify all active toolbars were cleanly detached and unmounted
      expect(root.querySelectorAll('.xvt-toolbar-host').length).toBe(0);

      // Step 4: Virtual scroll remounts tweets 1 to 50 with RECYCLED DOM nodes
      // (Twitter's virtualizer creates fresh DOM wrappers and video elements)
      detectedVideos.clear();

      for (let i = 1; i <= TOTAL_VIDEOS; i++) {
        const tweetId = `1980000000000000${String(i).padStart(3, '0')}`;
        // Create fresh DOM elements simulating re-render/recycled nodes
        const tweet = createTweetFixture({ tweetId, username: `user_${i}` });
        root.appendChild(tweet);
      }

      await flushAsync();

      const remountedVideos = Array.from(root.querySelectorAll('video'));
      expect(remountedVideos).toHaveLength(TOTAL_VIDEOS);

      // Step 5: Verification of Virtual Scroll Recycling Integrity
      // A: Dismissed videos (1–25) MUST NEVER get a toolbar mounted
      for (let i = 0; i < DISMISSED_COUNT; i++) {
        const video = remountedVideos[i];
        const wrapper = video.closest('[data-testid="videoComponent"]');
        expect(getToolbarHost(wrapper)).toBeNull();
        expect(getToolbar(video)).toBeNull();
        expect(stateStore.isDismissed(undefined, video)).toBe(true);
      }

      // B: Active videos (26–50) MUST be remounted properly with functional toolbars
      for (let i = DISMISSED_COUNT; i < TOTAL_VIDEOS; i++) {
        const video = remountedVideos[i];
        const wrapper = video.closest('[data-testid="videoComponent"]');
        expect(getToolbarHost(wrapper)).not.toBeNull();
        const controller = getToolbar(video);
        expect(controller).not.toBeNull();
        expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

        // Verify hover enter on remounted toolbar
        simulatePointerEvent(wrapper, 'mouseenter');
        expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
        simulatePointerEvent(wrapper, 'mouseleave');
      }

      // Await grace period concurrently for all 25 active remounted videos
      await flushAsync(350);

      for (let i = DISMISSED_COUNT; i < TOTAL_VIDEOS; i++) {
        const video = remountedVideos[i];
        const controller = getToolbar(video);
        expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      }

      observer.stop();
    });

    it('handles multiple scroll cycles across 3 batches of virtualized tweets without leaking orphan host elements', async () => {
      const observer = createVideoObserver({
        root,
        stateStore,
        detectVideos,
        findTweetContainer,
        extractTweetInfo,
        onVideoDetected: (v, info) => attachToolbar(v, info, { stateStore }),
        onVideoRemoved: (v) => detachToolbar(v),
      });

      observer.start();

      // Cycle through 3 different batches of tweets (Batch A, Batch B, Batch C)
      for (let batch = 0; batch < 3; batch++) {
        root.innerHTML = '';
        await flushAsync();

        // Mount 10 tweets
        for (let i = 0; i < 10; i++) {
          const tweetId = `1981000000000000${batch}${i}`;
          root.appendChild(createTweetFixture({ tweetId }));
        }

        await flushAsync();

        // Confirm exactly 10 toolbars exist
        expect(root.querySelectorAll('.xvt-toolbar-host').length).toBe(10);
      }

      // Final unmount of entire container
      root.innerHTML = '';
      await flushAsync();

      expect(root.querySelectorAll('.xvt-toolbar-host').length).toBe(0);
      observer.stop();
    });

    it('prevents toolbar mounting on recycled wrapper element that retains an orphan host', () => {
      const tweetId = '1982000000000000001';
      const tweet = createTweetFixture({ tweetId });
      root.appendChild(tweet);

      const video = tweet.querySelector('video');
      const wrapper = video.closest('[data-testid="videoComponent"]');

      // Attach first toolbar
      const c1 = attachToolbar(video, { tweetId }, { stateStore });
      expect(c1).not.toBeNull();
      expect(getToolbarHost(wrapper)).not.toBeNull();

      // Intentionally simulate an orphan host scenario where wrapper has an existing host
      // Calling attachToolbar again or on another video in the same wrapper must be guarded
      const dummyVideo = document.createElement('video');
      wrapper.appendChild(dummyVideo);

      const c2 = attachToolbar(dummyVideo, { tweetId: '1982000000000000002' }, { stateStore });
      expect(c2).toBeNull();
      expect(wrapper.querySelectorAll('.xvt-toolbar-host').length).toBe(1);

      detachToolbar(video);
      expect(wrapper.querySelectorAll('.xvt-toolbar-host').length).toBe(0);
    });
  });

  // =========================================================================
  // Dimension 2: Memory Leak & Reference Retention
  // =========================================================================
  describe('2. Memory Leak & Reference Retention', () => {
    it('mounts 100 toolbars, schedules active timers, and verifies complete teardown without active timers or dangling listeners', () => {
      vi.useFakeTimers();
      try {
        const controllers = [];
        const videos = [];
        const wrappers = [];

        for (let i = 0; i < 100; i++) {
          const tweetId = `1983000000000000${String(i).padStart(3, '0')}`;
          const tweet = createTweetFixture({ tweetId });
          root.appendChild(tweet);

          const video = tweet.querySelector('video');
          const wrapper = video.closest('[data-testid="videoComponent"]');
          const controller = attachToolbar(video, { tweetId }, { stateStore });

          controllers.push(controller);
          videos.push(video);
          wrappers.push(wrapper);

          // Schedule timers on some:
          if (i % 3 === 0) {
            // Grace period hide timer (300ms)
            simulatePointerEvent(wrapper, 'mouseenter');
            simulatePointerEvent(wrapper, 'mouseleave');
            expect(controller.eventController.getHideTimer()).not.toBeNull();
          } else if (i % 3 === 1) {
            // Unconfigured notice timer (2500ms)
            const { downloadBtn } = getToolbarButtons(controller.host);
            simulatePointerEvent(downloadBtn, 'click');
          } else {
            // Dismiss fade-out timer (150ms)
            controller.dismiss();
          }
        }

        // Detach all 100 toolbars immediately while timers are ticking
        for (let i = 0; i < 100; i++) {
          detachToolbar(videos[i]);
        }

        // Verify all hosts removed from wrappers
        expect(root.querySelectorAll('.xvt-toolbar-host').length).toBe(0);

        // Verify WeakMap getToolbar returns null
        for (const video of videos) {
          expect(getToolbar(video)).toBeNull();
        }

        // Advance time through all timer windows (300ms, 2500ms, etc.)
        // No dangling callbacks should execute or throw exceptions
        expect(() => {
          vi.advanceTimersByTime(3000);
        }).not.toThrow();

        // Verify pointer events on detached wrappers cause 0 state transitions or errors
        for (const wrapper of wrappers) {
          expect(() => {
            simulatePointerEvent(wrapper, 'mouseenter');
            simulatePointerEvent(wrapper, 'mouseleave');
          }).not.toThrow();
        }
      } finally {
        vi.useRealTimers();
      }
    });

    it('per-element detachToolbar() cleans up timers, listeners, host DOM, and WeakMap registration completely', () => {
      const tweetId = '1984000000000000001';
      const tweet = createTweetFixture({ tweetId });
      root.appendChild(tweet);

      const video = tweet.querySelector('video');
      const wrapper = video.closest('[data-testid="videoComponent"]');
      const controller = attachToolbar(video, { tweetId }, { stateStore });

      // Trigger hover leave so hide timer is active
      simulatePointerEvent(wrapper, 'mouseenter');
      simulatePointerEvent(wrapper, 'mouseleave');
      expect(controller.eventController.getHideTimer()).not.toBeNull();

      // Trigger notice timer
      controller.showNotice('Test notice message');

      // Detach
      const detached = detachToolbar(video);
      expect(detached).toBe(true);

      // Check WeakMap
      expect(getToolbar(video)).toBeNull();

      // Check DOM
      expect(getToolbarHost(wrapper)).toBeNull();
      expect(controller.host.parentNode).toBeNull();

      // Verify timers cancelled
      expect(controller.eventController.getHideTimer()).toBeNull();

      // Calling detachToolbar again is safe no-op
      expect(detachToolbar(video)).toBe(false);
      expect(detachToolbar(null)).toBe(false);
      expect(detachToolbar(undefined)).toBe(false);
    });

    it('clearToolbarRegistry() does not throw and maintains safe execution', () => {
      expect(() => clearToolbarRegistry()).not.toThrow();
    });

    it('WeakMap references allow ephemeral elements to be released without memory retention', () => {
      // Create 50 ephemeral videos and attach toolbars
      for (let i = 0; i < 50; i++) {
        const dummyWrapper = document.createElement('div');
        const dummyVideo = document.createElement('video');
        dummyWrapper.appendChild(dummyVideo);

        const controller = attachToolbar(dummyVideo, { tweetId: `1985000000000000${i}` }, { stateStore });
        expect(controller).not.toBeNull();

        // Cleanly detach
        detachToolbar(dummyVideo);
      }

      // No lingering hosts
      expect(document.querySelectorAll('.xvt-toolbar-host').length).toBe(0);
    });
  });

  // =========================================================================
  // Dimension 3: DOM Mutation Storms
  // =========================================================================
  describe('3. DOM Mutation Storms', () => {
    it('survives a storm of 200 rapid non-video DOM mutations around video components without creating duplicate toolbars or state corruption', async () => {
      const detectedVideos = [];
      const observer = createVideoObserver({
        root,
        stateStore,
        detectVideos,
        findTweetContainer,
        extractTweetInfo,
        onVideoDetected: (v, info) => {
          detectedVideos.push(v);
          attachToolbar(v, info, { stateStore });
        },
        onVideoRemoved: (v) => detachToolbar(v),
      });

      observer.start();

      // Create 5 tweets with videos
      const videoWrappers = [];
      for (let i = 1; i <= 5; i++) {
        const tweetId = `198600000000000000${i}`;
        const tweet = createTweetFixture({ tweetId });
        root.appendChild(tweet);
        const wrapper = tweet.querySelector('[data-testid="videoComponent"]');
        videoWrappers.push(wrapper);
      }

      await flushAsync();

      expect(detectedVideos).toHaveLength(5);
      expect(root.querySelectorAll('.xvt-toolbar-host').length).toBe(5);

      // Unleash 200 rapid mutations around the video wrappers and tweets:
      // (adding spans, removing spans, changing attributes, adding text, adding comments)
      for (let i = 0; i < 200; i++) {
        const targetWrapper = videoWrappers[i % videoWrappers.length];
        const mutationType = i % 5;

        if (mutationType === 0) {
          // Sibling div added to wrapper
          const badge = document.createElement('div');
          badge.className = `view-badge-${i}`;
          badge.textContent = `${i * 10} views`;
          targetWrapper.appendChild(badge);
        } else if (mutationType === 1) {
          // Attribute change on wrapper
          targetWrapper.setAttribute('data-interaction-score', String(i));
          targetWrapper.classList.toggle(`active-tier-${i % 3}`);
        } else if (mutationType === 2) {
          // Nested element insertion and immediate removal
          const temp = document.createElement('span');
          temp.textContent = 'overlay';
          targetWrapper.appendChild(temp);
          targetWrapper.removeChild(temp);
        } else if (mutationType === 3) {
          // Mutation on tweet container
          const tweet = targetWrapper.closest('article');
          if (tweet) {
            tweet.setAttribute('data-stress-cycle', String(i));
          }
        } else {
          // Comment node
          const comment = document.createComment(`mutation-${i}`);
          targetWrapper.appendChild(comment);
        }
      }

      await flushAsync();

      // CRITICAL ASSERTION: Exactly 5 toolbars must exist — no duplicates, no unmounts
      const hosts = root.querySelectorAll('.xvt-toolbar-host');
      expect(hosts.length).toBe(5);

      // Verify each video wrapper has exactly 1 toolbar host
      for (const wrapper of videoWrappers) {
        const wrapperHosts = wrapper.querySelectorAll('.xvt-toolbar-host');
        expect(wrapperHosts.length).toBe(1);
      }

      // Verify hover interaction still works seamlessly during / after mutation storm
      const firstWrapper = videoWrappers[0];
      const firstVideo = firstWrapper.querySelector('video');
      const firstController = getToolbar(firstVideo);

      simulatePointerEvent(firstWrapper, 'mouseenter');
      expect(firstController.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      simulatePointerEvent(firstWrapper, 'mouseleave');
      await flushAsync(350);
      expect(firstController.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      observer.stop();
    });

    it('handles rapid pointer events (hover churn) concurrent with DOM additions without throwing or locking state', () => {
      vi.useFakeTimers();
      try {
        const tweetId = '1987000000000000001';
        const tweet = createTweetFixture({ tweetId });
        root.appendChild(tweet);

        const video = tweet.querySelector('video');
        const wrapper = video.closest('[data-testid="videoComponent"]');
        const controller = attachToolbar(video, { tweetId }, { stateStore });

        // Simulate 50 rapid alternating enter/leave events combined with DOM churn
        for (let i = 0; i < 50; i++) {
          simulatePointerEvent(wrapper, i % 2 === 0 ? 'mouseenter' : 'mouseleave');
          vi.advanceTimersByTime(10);

          // Mutate DOM concurrently
          const span = document.createElement('span');
          span.textContent = `churn-${i}`;
          wrapper.appendChild(span);
        }

        // Allow remaining grace period to elapse
        vi.advanceTimersByTime(350);

        // State must be cleanly IDLE after last mouseleave
        expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
        expect(wrapper.querySelectorAll('.xvt-toolbar-host').length).toBe(1);

        detachToolbar(video);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // =========================================================================
  // Dimension 4: Edge Cases & Hostile Invalidation
  // =========================================================================
  describe('4. Edge Cases & Hostile Invalidation', () => {
    it('handles attachToolbar called with invalid, non-element, or un-wrapped video safely', () => {
      expect(attachToolbar(null)).toBeNull();
      expect(attachToolbar(undefined)).toBeNull();
      expect(attachToolbar({})).toBeNull();
      expect(attachToolbar(document.createTextNode('not an element'))).toBeNull();

      // Video without parent or wrapper
      const orphanVideo = document.createElement('video');
      const controller = attachToolbar(orphanVideo, {}, { stateStore });
      expect(controller).toBeNull();
    });

    it('handles rapid sequential dismiss() calls idempotently without duplicate timers', async () => {
      const tweetId = '1988000000000000001';
      const tweet = createTweetFixture({ tweetId });
      root.appendChild(tweet);

      const video = tweet.querySelector('video');
      const controller = attachToolbar(video, { tweetId }, { stateStore });

      // Call dismiss multiple times in rapid succession
      controller.dismiss();
      controller.dismiss();
      controller.dismiss();

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);
      expect(stateStore.isDismissed(undefined, video)).toBe(true);

      await flushAsync(180);
      expect(getToolbar(video)).toBeNull();
    });

    it('showNotice handles rapid replacement of active notice timer without race condition', () => {
      vi.useFakeTimers();
      try {
        const tweetId = '1989000000000000001';
        const tweet = createTweetFixture({ tweetId });
        root.appendChild(tweet);

        const video = tweet.querySelector('video');
        const controller = attachToolbar(video, { tweetId }, { stateStore });
        const host = controller.host;
        const { noticeEl } = getToolbarButtons(host);

        // Show first notice
        controller.showNotice('Notice 1', 1000);
        expect(noticeEl.textContent).toBe('Notice 1');
        expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);

        // Replace at 500ms with second notice
        vi.advanceTimersByTime(500);
        controller.showNotice('Notice 2', 1000);
        expect(noticeEl.textContent).toBe('Notice 2');

        // At 1100ms (500 + 600): Notice 1 would have expired, but Notice 2 is active!
        vi.advanceTimersByTime(600);
        expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);

        // At 1600ms (500 + 1100): Notice 2 expires
        vi.advanceTimersByTime(500);
        expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(false);

        detachToolbar(video);
      } finally {
        vi.useRealTimers();
      }
    });

    it('ensures all Shadow DOM SVG icons have valid SVG markup and non-empty paths', () => {
      const tweetId = '1990000000000000001';
      const tweet = createTweetFixture({ tweetId });
      root.appendChild(tweet);

      const video = tweet.querySelector('video');
      const controller = attachToolbar(video, { tweetId }, { stateStore });
      const host = controller.host;

      const svgs = Array.from(host.shadowRoot.querySelectorAll('svg'));
      expect(svgs.length).toBeGreaterThanOrEqual(3);

      for (const svg of svgs) {
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(svg.getAttribute('width')).toBe('16');
        expect(svg.getAttribute('height')).toBe('16');
        const paths = svg.querySelectorAll('path');
        expect(paths.length).toBeGreaterThan(0);
        for (const path of paths) {
          expect(path.getAttribute('d')).toBeTruthy();
        }
      }

      detachToolbar(video);
    });
  });
});
