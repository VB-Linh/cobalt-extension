// tests/content/toolbar/verticalRefinement.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getShadowRoot,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { attachToolbar, getToolbar, shouldFallbackInside } from '../../../src/content/toolbar/index.js';

describe('Layout Specification: Horizontal Floating Toolbar Inside Video Top-Left', () => {
  let env;

  beforeEach(() => {
    env = setupToolbarTestEnv({ tweetId: '1880000000000000001' });
  });

  afterEach(() => {
    teardownToolbarTestEnv(env);
  });

  describe('1. Horizontal Layout & Top-Left Anchoring', () => {
    it('positions toolbar at top-left inside video player (top: 10px, left: 10px)', () => {
      const { video, videoWrapper, stateStore } = env;

      const controller = attachToolbar(video, { tweetId: '1880000000000000001' }, { stateStore });
      expect(controller).not.toBeNull();

      const host = getToolbarHost(videoWrapper);
      expect(host).not.toBeNull();

      // CSS Positioning at top-left corner
      expect(host.style.position).toBe('absolute');
      expect(host.style.top).toBe('10px');
      expect(host.style.left).toBe('10px');
      expect(host.style.zIndex).toBe('9999');

      // Video wrapper positioning context
      expect(videoWrapper.style.position).toBe('relative');
    });

    it('arranges buttons in horizontal sequence: Download (left), CDN (center), Close (right)', () => {
      const { video, videoWrapper, stateStore } = env;
      attachToolbar(video, { tweetId: '1880000000000000001' }, { stateStore });
      const host = getToolbarHost(videoWrapper);
      const shadowRoot = getShadowRoot(host);

      const buttons = Array.from(shadowRoot.querySelectorAll('.xvt-btn'));
      expect(buttons.length).toBe(3);

      // Verify sequence
      expect(buttons[0].classList.contains('xvt-btn-download')).toBe(true);
      expect(buttons[1].classList.contains('xvt-btn-cdn')).toBe(true);
      expect(buttons[2].classList.contains('xvt-btn-dismiss')).toBe(true);

      // Verify parent container is pill
      const pillContainer = shadowRoot.querySelector('.xvt-toolbar-pill');
      expect(pillContainer).not.toBeNull();
      expect(pillContainer.contains(buttons[0])).toBe(true);
      expect(pillContainer.contains(buttons[1])).toBe(true);
      expect(pillContainer.contains(buttons[2])).toBe(true);
    });

    it('each action button has an SVG icon and descriptive floating tooltip without static text labels', () => {
      const { video, videoWrapper, stateStore } = env;
      attachToolbar(video, { tweetId: '1880000000000000001' }, { stateStore });
      const host = getToolbarHost(videoWrapper);
      const { downloadBtn, cdnBtn, dismissBtn } = getToolbarButtons(host);

      // All 3 buttons contain 16x16 SVG icons
      expect(downloadBtn.querySelector('svg')).not.toBeNull();
      expect(cdnBtn.querySelector('svg')).not.toBeNull();
      expect(dismissBtn.querySelector('svg')).not.toBeNull();

      // No static text labels inside button (pure icon-only buttons)
      expect(downloadBtn.querySelector('.xvt-btn-text')).toBeNull();
      expect(cdnBtn.querySelector('.xvt-btn-text')).toBeNull();

      // Tooltips are accessible and concise
      expect(downloadBtn.querySelector('.xvt-tooltip')?.textContent).toBe('Tải');
      expect(cdnBtn.querySelector('.xvt-tooltip')?.textContent).toBe('Link');
      expect(dismissBtn.querySelector('.xvt-tooltip')).toBeNull();
    });

    it('updatePosition stably maintains top-left anchor coordinates', () => {
      const { video, videoWrapper, stateStore } = env;
      const controller = attachToolbar(video, { tweetId: '1880000000000000001' }, { stateStore });
      const host = getToolbarHost(videoWrapper);

      controller.updatePosition();
      expect(host.style.top).toBe('10px');
      expect(host.style.left).toBe('10px');
    });
  });

  describe('3. Interaction & Hover Bridge Integration', () => {
    it('shows toolbar when entering video wrapper and hides after grace period', () => {
      vi.useFakeTimers();
      const { video, videoWrapper, stateStore } = env;
      const controller = attachToolbar(video, { tweetId: '1880000000000000001' }, { stateStore });
      const host = getToolbarHost(videoWrapper);
      const container = host.shadowRoot.querySelector('.xvt-toolbar-container');

      // Initially idle
      expect(container.classList.contains('xvt-idle')).toBe(true);

      // Pointer enters wrapper
      simulatePointerEvent(videoWrapper, 'mouseenter');
      expect(container.classList.contains('xvt-hovered')).toBe(true);

      // Pointer leaves wrapper
      simulatePointerEvent(videoWrapper, 'mouseleave');

      // During 300ms grace period: still visible!
      vi.advanceTimersByTime(200);
      expect(container.classList.contains('xvt-hovered')).toBe(true);

      // After 300ms: transitions to idle
      vi.advanceTimersByTime(110);
      expect(container.classList.contains('xvt-idle')).toBe(true);

      vi.useRealTimers();
    });

    it('moving from video into toolbar cancels hide timer and maintains visibility', () => {
      vi.useFakeTimers();
      const { video, videoWrapper, stateStore } = env;
      attachToolbar(video, { tweetId: '1880000000000000001' }, { stateStore });
      const host = getToolbarHost(videoWrapper);
      const container = host.shadowRoot.querySelector('.xvt-toolbar-container');

      simulatePointerEvent(videoWrapper, 'mouseenter');
      expect(container.classList.contains('xvt-hovered')).toBe(true);

      // Mouse leaves video toward toolbar
      simulatePointerEvent(videoWrapper, 'mouseleave');
      vi.advanceTimersByTime(100);

      // Mouse enters toolbar host before grace period expires
      simulatePointerEvent(host, 'mouseenter');
      vi.advanceTimersByTime(250);

      // Toolbar remains hovered!
      expect(container.classList.contains('xvt-hovered')).toBe(true);

      vi.useRealTimers();
    });

    it('clicking dismiss button executes fade-out and dismisses video', () => {
      vi.useFakeTimers();
      const { video, videoWrapper, stateStore } = env;
      attachToolbar(video, { tweetId: '1880000000000000001' }, { stateStore });
      const host = getToolbarHost(videoWrapper);
      const { dismissBtn } = getToolbarButtons(host);

      simulatePointerEvent(videoWrapper, 'mouseenter');
      simulatePointerEvent(dismissBtn, 'click');

      expect(video.dataset.xvtDismissed).toBe('true');
      expect(stateStore.isDismissed(undefined, video)).toBe(true);

      vi.advanceTimersByTime(160);
      expect(getToolbarHost(videoWrapper)).toBeNull();

      vi.useRealTimers();
    });

    it('prioritizes videoComponent over inner videoPlayer and applies overflow: visible !important', () => {
      // Simulate real Twitter DOM structure with nested videoComponent -> videoPlayer -> video
      const nestedTweet = document.createElement('article');
      nestedTweet.setAttribute('data-testid', 'tweet');

      const outerComponent = document.createElement('div');
      outerComponent.setAttribute('data-testid', 'videoComponent');
      outerComponent.style.overflow = 'hidden';

      const innerPlayer = document.createElement('div');
      innerPlayer.setAttribute('data-testid', 'videoPlayer');
      innerPlayer.style.overflow = 'hidden';

      const testVideo = document.createElement('video');
      testVideo.src = 'blob:https://x.com/nested-test';

      innerPlayer.appendChild(testVideo);
      outerComponent.appendChild(innerPlayer);
      nestedTweet.appendChild(outerComponent);
      document.body.appendChild(nestedTweet);

      const controller = attachToolbar(testVideo, { tweetId: '1880000000000000099' });
      expect(controller).not.toBeNull();

      // Host must be attached to outerComponent, NOT innerPlayer
      const host = outerComponent.querySelector('.xvt-toolbar-host');
      expect(host).not.toBeNull();
      expect(innerPlayer.querySelector('.xvt-toolbar-host')).toBeNull();

      // Overflow style on outerComponent must be set to 'visible' with 'important' priority
      expect(outerComponent.style.getPropertyValue('overflow')).toBe('visible');
      expect(outerComponent.style.getPropertyPriority('overflow')).toBe('important');

      controller.destroy();
      nestedTweet.remove();
    });

    it('activates hovered state via mousemove inside video or wrapper', () => {
      const { video, videoWrapper, stateStore } = env;
      const controller = attachToolbar(video, { tweetId: '1880000000000000001' }, { stateStore });
      const host = getToolbarHost(videoWrapper);
      const container = host.shadowRoot.querySelector('.xvt-toolbar-container');

      expect(controller.stateManager.getState()).toBe('idle');

      // Dispatch mousemove on wrapper (e.g. mouse already on page during reload)
      simulatePointerEvent(videoWrapper, 'mousemove');

      expect(controller.stateManager.getState()).toBe('hovered');
      expect(container.classList.contains('xvt-hovered')).toBe(true);
    });

    it('activates hovered state via mousemove on inner video element', () => {
      const { video, videoWrapper, stateStore } = env;
      const controller = attachToolbar(video, { tweetId: '1880000000000000001' }, { stateStore });
      const host = getToolbarHost(videoWrapper);
      const container = host.shadowRoot.querySelector('.xvt-toolbar-container');

      expect(controller.stateManager.getState()).toBe('idle');

      // Dispatch mousemove directly on video element
      simulatePointerEvent(video, 'mousemove');

      expect(controller.stateManager.getState()).toBe('hovered');
      expect(container.classList.contains('xvt-hovered')).toBe(true);
    });
  });
});