// tests/content/toolbar/adversarialStress.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { attachToolbar, detachToolbar, getToolbar, createToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import { GRACE_PERIOD_MS, CLICK_DEBOUNCE_MS } from '../../../src/content/toolbar/toolbarEvents.js';
import { DISMISS_ANIMATION_DURATION_MS } from '../../../src/content/toolbar/toolbar.js';

describe('Phase 2 Empirical Challenger: Adversarial Stress & Race Condition Suite', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
    env = setupToolbarTestEnv({ tweetId: '1850000000000000001' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    teardownToolbarTestEnv(env);
  });

  // =========================================================================
  // Section 1: Hover Bridge & Grace Period Timing Stress
  // =========================================================================
  describe('1. Hover Bridge & Grace Period Timing Stress', () => {
    it('1.1: mouse leaves and enters 100 times in 10ms intervals without timer leak, crash, or out-of-order execution', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Perform 100 rapid oscillations
      for (let i = 0; i < 100; i++) {
        simulatePointerEvent(videoWrapper, 'mouseenter');
        expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
        expect(controller.eventController.isHoveringVideo()).toBe(true);
        expect(controller.eventController.getHideTimer()).toBeNull();

        vi.advanceTimersByTime(5);

        simulatePointerEvent(videoWrapper, 'mouseleave');
        expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
        expect(controller.eventController.isHoveringVideo()).toBe(false);
        expect(controller.eventController.getHideTimer()).not.toBeNull();

        vi.advanceTimersByTime(5);
      }

      // At end of loop: pointer left at t = 1000ms. Hide timer is currently active
      expect(controller.eventController.getHideTimer()).not.toBeNull();
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Advance 294ms (total 299ms since last leave) -> must remain HOVERED
      vi.advanceTimersByTime(294);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Advance 6ms more (total 305ms > 300ms) -> must cleanly transition to IDLE
      vi.advanceTimersByTime(6);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(controller.eventController.getHideTimer()).toBeNull();
    });

    it('1.2: verifies strict boundary conditions: exactly 299ms vs 300ms vs 301ms', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });

      simulatePointerEvent(videoWrapper, 'mouseenter');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      simulatePointerEvent(videoWrapper, 'mouseleave');

      // Boundary check at exactly 299ms: must still be HOVERED
      vi.advanceTimersByTime(299);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Boundary check at exactly 300ms: timer triggers, transitioning to IDLE
      vi.advanceTimersByTime(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Boundary check at 301ms+: remains IDLE
      vi.advanceTimersByTime(1);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    });

    it('1.3: buffer traversal: pointer leaves video, enters buffer, enters toolbar within 299ms vs 301ms', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });
      const host = getToolbarHost(videoWrapper);

      // Case A: enters toolbar at 299ms -> timer cancelled, remains HOVERED
      simulatePointerEvent(videoWrapper, 'mouseenter');
      simulatePointerEvent(videoWrapper, 'mouseleave'); // in buffer now
      vi.advanceTimersByTime(299);

      // Still HOVERED at 299ms
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Enters toolbar host at 299ms
      simulatePointerEvent(host, 'mouseenter');
      expect(controller.eventController.getHideTimer()).toBeNull();
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Advance another 500ms -> remains HOVERED on toolbar host
      vi.advanceTimersByTime(500);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Case B: leaves toolbar host -> starts new 300ms grace period
      simulatePointerEvent(host, 'mouseleave');
      expect(controller.eventController.getHideTimer()).not.toBeNull();

      vi.advanceTimersByTime(299);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      vi.advanceTimersByTime(2); // 301ms
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    });

    it('1.4: verifies dual-zone traversal (Video -> Host -> Document body) cleans up correctly', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });
      const host = getToolbarHost(videoWrapper);

      // User enters video wrapper
      simulatePointerEvent(videoWrapper, 'mouseenter');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // User moves directly onto toolbar host (wrapper fires mouseleave with relatedTarget = host)
      simulatePointerEvent(videoWrapper, 'mouseleave', { relatedTarget: host });
      simulatePointerEvent(host, 'mouseenter');

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
      expect(controller.eventController.isHoveringToolbar()).toBe(true);

      // Now user moves completely out of player to document body
      simulatePointerEvent(host, 'mouseleave', { relatedTarget: document.body });
      simulatePointerEvent(videoWrapper, 'mouseleave', { relatedTarget: document.body });

      // After leaving both, grace period counts down
      vi.advanceTimersByTime(299);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      vi.advanceTimersByTime(2); // 301ms
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    });

    it('1.5: re-entry into video wrapper during grace period after leaving host cancels hide', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });
      const host = getToolbarHost(videoWrapper);

      simulatePointerEvent(host, 'mouseenter');
      simulatePointerEvent(host, 'mouseleave');
      expect(controller.eventController.getHideTimer()).not.toBeNull();

      // At 150ms into grace period, user re-enters video wrapper
      vi.advanceTimersByTime(150);
      simulatePointerEvent(videoWrapper, 'mouseenter');

      expect(controller.eventController.getHideTimer()).toBeNull();
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Advance 400ms more -> still HOVERED
      vi.advanceTimersByTime(400);
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    });
  });

  // =========================================================================
  // Section 2: Rapid/Spam Click & Race Conditions
  // =========================================================================
  describe('2. Rapid/Spam Click & Race Conditions', () => {
    it('2.1: spam clicking "Tải video" 50 times in rapid succession enforces 250ms debounce and does not crash or leak', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, noticeEl } = getToolbarButtons(host);

      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const downloadsSpy = vi.spyOn(chrome.downloads, 'download');

      // Click 51 times in 10ms intervals (t = 0 to t = 500ms)
      // With CLICK_DEBOUNCE_MS = 250, exactly 3 clicks should be accepted (at t = 0, t = 250ms, and t = 500ms)
      let acceptedTransitions = 0;
      controller.stateManager.subscribe((curr, prev) => {
        if (curr === TOOLBAR_STATES.UNCONFIGURED) {
          acceptedTransitions++;
        }
      });

      for (let i = 0; i <= 50; i++) {
        simulatePointerEvent(downloadBtn, 'click');
        vi.advanceTimersByTime(10);
      }

      // Exactly 3 debounced actions should execute (at t = 0, 250ms, 500ms)
      expect(acceptedTransitions).toBe(3);

      // 0 network requests
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(downloadsSpy).not.toHaveBeenCalled();

      // UI notice remains visible
      expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);
      expect(noticeEl.textContent).toContain('Chưa cài đặt Cobalt URL');
    });

    it('2.2: spam clicking "Mở CDN" 50 times in rapid succession enforces 250ms debounce', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(
        video,
        { tweetId: '1850000000000000001' },
        { stateStore: env.stateStore, enableCdnResolver: false }
      );
      const host = getToolbarHost(videoWrapper);
      const { cdnBtn, noticeEl } = getToolbarButtons(host);

      const tabsSpy = vi.spyOn(chrome.tabs, 'create');

      // Synchronous burst: 50 clicks in the same event tick
      for (let i = 0; i < 50; i++) {
        simulatePointerEvent(cdnBtn, 'click');
      }

      // Only the first click should register, subsequent 49 in the same tick are debounced
      expect(tabsSpy).not.toHaveBeenCalled();
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
      expect(noticeEl.textContent).toContain('Phase 3');
    });

    it('2.3: alternating spam clicks between "Tải video" and "Mở CDN" sharing the debounce window', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(
        video,
        { tweetId: '1850000000000000001' },
        { stateStore: env.stateStore, enableCdnResolver: false }
      );
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, cdnBtn } = getToolbarButtons(host);

      // Click Download at t = 0
      simulatePointerEvent(downloadBtn, 'click');
      const notice1 = host.shadowRoot.querySelector('.xvt-notice').textContent;
      expect(notice1).toContain('Chưa cài đặt Cobalt URL');

      // Click CDN at t = 50ms (< 250ms debounce window)
      vi.advanceTimersByTime(50);
      simulatePointerEvent(cdnBtn, 'click');

      // Notice should still be from Download because CDN click was debounced!
      const notice2 = host.shadowRoot.querySelector('.xvt-notice').textContent;
      expect(notice2).toContain('Chưa cài đặt Cobalt URL');

      // Advance to t = 260ms (> 250ms debounce window) and click CDN
      vi.advanceTimersByTime(210);
      simulatePointerEvent(cdnBtn, 'click');

      // Now CDN notice took effect
      const notice3 = host.shadowRoot.querySelector('.xvt-notice').textContent;
      expect(notice3).toContain('Phase 3');
    });

    it('2.4: clicking Dismiss while feedback notice is visible cleanly cancels notice timer and detaches', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, dismissBtn } = getToolbarButtons(host);

      // Trigger unconfigured notice (duration 2500ms)
      simulatePointerEvent(downloadBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);

      // Advance 1000ms (in the middle of notice display)
      vi.advanceTimersByTime(1000);

      // Click Dismiss
      simulatePointerEvent(dismissBtn, 'click');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);

      // Advance past 150ms fade-out animation
      vi.advanceTimersByTime(DISMISS_ANIMATION_DURATION_MS + 10);

      // Host removed from DOM
      expect(host.parentNode).toBeNull();

      // Advancing past original 2500ms notice duration throws no error and does not touch DOM
      expect(() => {
        vi.advanceTimersByTime(2000);
      }).not.toThrow();
    });

    it('2.5: clicking Dismiss while in the middle of hover grace period cancels hide timer immediately', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });
      const host = getToolbarHost(videoWrapper);
      const { dismissBtn } = getToolbarButtons(host);

      simulatePointerEvent(videoWrapper, 'mouseenter');
      simulatePointerEvent(videoWrapper, 'mouseleave');

      expect(controller.eventController.getHideTimer()).not.toBeNull();

      // Click Dismiss at 100ms
      vi.advanceTimersByTime(100);
      simulatePointerEvent(dismissBtn, 'click');

      expect(controller.eventController.getHideTimer()).toBeNull();
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);
    });

    it('2.6: double/rapid clicking Dismiss 50 times during 150ms fade-out animation is strictly idempotent', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });
      const host = getToolbarHost(videoWrapper);
      const { dismissBtn } = getToolbarButtons(host);

      // Spam dismiss button 50 times in rapid succession
      for (let i = 0; i < 50; i++) {
        simulatePointerEvent(dismissBtn, 'click');
        vi.advanceTimersByTime(5);
      }

      // Must remain in DISMISSED state
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);

      // Advance remaining time to complete 150ms animation
      vi.advanceTimersByTime(150);

      // Host detached cleanly, exactly once
      expect(host.parentNode).toBeNull();
    });

    it('2.7: keyboard accessibility spam (50 rapid Enter / Space keydowns) is handled cleanly', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn } = getToolbarButtons(host);

      // Dispatch 50 rapid Enter / Space keydowns
      for (let i = 0; i < 50; i++) {
        const key = i % 2 === 0 ? 'Enter' : ' ';
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        downloadBtn.dispatchEvent(event);
        vi.advanceTimersByTime(10);
      }

      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
    });
  });

  // =========================================================================
  // Section 3: Multi-Video Concurrency & Isolation
  // =========================================================================
  describe('3. Multi-Video Concurrency & Isolation', () => {
    it('3.1: mounts 10 video toolbars simultaneously; hovering and leaving Video 1 NEVER affects Video 2 through 10', () => {
      teardownToolbarTestEnv(env);
      env = setupToolbarTestEnv({
        tweetId: '1850000000000000010',
        videoIndices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });

      const controllers = env.videos.map((vid, idx) => {
        return attachToolbar(
          vid,
          { tweetId: '1850000000000000010', mediaIndex: idx + 1 },
          { stateStore: env.stateStore }
        );
      });

      expect(controllers).toHaveLength(10);
      for (const c of controllers) {
        expect(c.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      }

      const wrappers = env.videos.map((v) => v.closest('[data-testid="videoComponent"]'));

      // 1. Hover Video 1
      simulatePointerEvent(wrappers[0], 'mouseenter');
      expect(controllers[0].stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
      for (let i = 1; i < 10; i++) {
        expect(controllers[i].stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      }

      // 2. Hover Video 2
      simulatePointerEvent(wrappers[1], 'mouseenter');
      expect(controllers[0].stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
      expect(controllers[1].stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
      for (let i = 2; i < 10; i++) {
        expect(controllers[i].stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      }

      // 3. Leave Video 1
      simulatePointerEvent(wrappers[0], 'mouseleave');
      expect(controllers[0].eventController.getHideTimer()).not.toBeNull();
      expect(controllers[1].eventController.getHideTimer()).toBeNull();

      // Advance 350ms (Video 1 hide timer fires)
      vi.advanceTimersByTime(350);

      // Video 1 is now IDLE; Video 2 is STILL HOVERED
      expect(controllers[0].stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(controllers[1].stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

      // Videos 3..10 were completely untouched and remain IDLE
      for (let i = 2; i < 10; i++) {
        expect(controllers[i].stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      }
    });

    it('3.2: staggered hover waves across 10 videos operate completely independently', () => {
      teardownToolbarTestEnv(env);
      env = setupToolbarTestEnv({
        tweetId: '1850000000000000020',
        videoIndices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });

      const controllers = env.videos.map((vid, idx) => {
        return attachToolbar(
          vid,
          { tweetId: '1850000000000000020', mediaIndex: idx + 1 },
          { stateStore: env.stateStore }
        );
      });

      const wrappers = env.videos.map((v) => v.closest('[data-testid="videoComponent"]'));

      // Staggered enter: enter video i at i * 50ms
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(50);
        simulatePointerEvent(wrappers[i], 'mouseenter');
      }

      // All 10 are now hovered
      for (let i = 0; i < 10; i++) {
        expect(controllers[i].stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
      }

      // Staggered leave: leave video i at i * 50ms
      for (let i = 0; i < 10; i++) {
        simulatePointerEvent(wrappers[i], 'mouseleave');
        vi.advanceTimersByTime(50);
      }

      // At this point (total elapsed: 500ms since video 0 left), early videos (0..3) have expired grace period
      // while later videos are still within grace period
      expect(controllers[0].stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(controllers[1].stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      expect(controllers[2].stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

      // Advance 300ms more to let all remaining timers complete
      vi.advanceTimersByTime(300);
      for (let i = 0; i < 10; i++) {
        expect(controllers[i].stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      }
    });

    it('3.3: dismissing 5 out of 10 videos concurrently during hover does not affect the surviving 5', () => {
      teardownToolbarTestEnv(env);
      env = setupToolbarTestEnv({
        tweetId: '1850000000000000030',
        videoIndices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });

      const controllers = env.videos.map((vid, idx) => {
        return attachToolbar(
          vid,
          { tweetId: '1850000000000000030', mediaIndex: idx + 1 },
          { stateStore: env.stateStore }
        );
      });

      const wrappers = env.videos.map((v) => v.closest('[data-testid="videoComponent"]'));

      // Hover all 10
      for (let i = 0; i < 10; i++) {
        simulatePointerEvent(wrappers[i], 'mouseenter');
      }

      // Dismiss even-indexed videos (0, 2, 4, 6, 8)
      for (let i = 0; i < 10; i += 2) {
        controllers[i].dismiss();
      }

      // Advance 160ms to complete dismiss animations
      vi.advanceTimersByTime(160);

      // Verify even-indexed are dismissed and detached
      for (let i = 0; i < 10; i += 2) {
        expect(controllers[i].stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);
        expect(controllers[i].host.parentNode).toBeNull();
      }

      // Verify odd-indexed (1, 3, 5, 7, 9) remain active and HOVERED
      for (let i = 1; i < 10; i += 2) {
        expect(controllers[i].stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
        expect(controllers[i].host.parentNode).not.toBeNull();
      }
    });
  });

  // =========================================================================
  // Section 4: DOM Churn & Lifecycle Destruction Race Conditions
  // =========================================================================
  describe('4. DOM Churn & Lifecycle Destruction Race Conditions', () => {
    it('4.1: video removed from DOM during active 300ms grace period timer cleans up without errors', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });

      simulatePointerEvent(videoWrapper, 'mouseenter');
      simulatePointerEvent(videoWrapper, 'mouseleave');
      expect(controller.eventController.getHideTimer()).not.toBeNull();

      // Video wrapper removed from DOM at 100ms
      vi.advanceTimersByTime(100);
      detachToolbar(video);

      // Verify timer was cancelled
      expect(controller.eventController.getHideTimer()).toBeNull();

      // Advancing time past 300ms throws 0 errors
      expect(() => {
        vi.advanceTimersByTime(500);
      }).not.toThrow();
    });

    it('4.2: detachToolbar called while 150ms dismiss animation is active does not throw or double-destroy', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });

      controller.dismiss();
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);

      // Call detachToolbar in the middle of dismiss animation
      vi.advanceTimersByTime(50);
      expect(() => {
        detachToolbar(video);
      }).not.toThrow();

      // Advance past remaining animation time
      expect(() => {
        vi.advanceTimersByTime(200);
      }).not.toThrow();
    });

    it('4.3: calling detachToolbar twice in a row is safe and idempotent', () => {
      const { video } = env;
      attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });

      const firstResult = detachToolbar(video);
      expect(firstResult).toBe(true);

      const secondResult = detachToolbar(video);
      expect(secondResult).toBe(false);
    });

    it('4.4: prevent resurrection: mouseenter on video wrapper or calling show() after dismiss NEVER resurrects toolbar', () => {
      const { video, videoWrapper } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });

      controller.dismiss();
      vi.advanceTimersByTime(160);

      // Attempt to resurrect via show()
      controller.show();
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);

      // Attempt to resurrect via mouseenter
      simulatePointerEvent(videoWrapper, 'mouseenter');
      expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);

      // Attempt to attachToolbar again on the same video element
      const attachAgain = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });
      expect(attachAgain).toBeNull();
    });

    it('4.5: survives 1,000 rapid synchronous show() and hide() transitions without corrupting state machine', () => {
      const { video } = env;
      const controller = attachToolbar(video, { tweetId: '1850000000000000001' }, { stateStore: env.stateStore });

      for (let i = 0; i < 1000; i++) {
        controller.show();
        expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
        controller.hide();
        expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
      }
    });

    it('4.6: attachToolbar returns null gracefully when video element is null, undefined, or has no parent wrapper', () => {
      expect(attachToolbar(null)).toBeNull();
      expect(attachToolbar(undefined)).toBeNull();

      const orphanVideo = document.createElement('video');
      expect(attachToolbar(orphanVideo)).toBeNull();
    });

    it('4.7: destroy() gracefully catches and logs when onDestroy option throws an error', () => {
      const { video } = env;
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const controller = createToolbar(video, { tweetId: '1850000000000000001' }, {
        stateStore: env.stateStore,
        onDestroy: () => {
          throw new Error('Explosive onDestroy error');
        },
      });

      expect(() => {
        controller.destroy();
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('4.8: video wrapper with existing non-static position (absolute / relative) is preserved', () => {
      teardownToolbarTestEnv(env);
      env = setupToolbarTestEnv({ tweetId: '1850000000000000099' });

      const { video, videoWrapper } = env;
      videoWrapper.style.position = 'absolute';

      attachToolbar(video, { tweetId: '1850000000000000099' }, { stateStore: env.stateStore });
      expect(videoWrapper.style.position).toBe('absolute');
    });
  });
});
