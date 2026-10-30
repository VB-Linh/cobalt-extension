// tests/content/toolbar/hoverBridge.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { attachToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';

describe('Group B: Hover Bridge & Anti-Flicker (Scenarios 6–10)', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
    env = setupToolbarTestEnv({ tweetId: '1800000000000000010' });
  });

  afterEach(() => {
    vi.useRealTimers();
    teardownToolbarTestEnv(env);
  });

  it('Scenario 6: mouseenter on video wrapper transitions toolbar from idle to hovered', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(video, { tweetId: '1800000000000000010' }, { stateStore: env.stateStore });

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    const container = controller.shadowRoot.querySelector('.xvt-toolbar-container');
    expect(container.classList.contains('xvt-idle')).toBe(true);

    // Simulate pointer entering video wrapper
    simulatePointerEvent(videoWrapper, 'mouseenter');

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    expect(container.classList.contains('xvt-hovered')).toBe(true);
  });

  it('Scenario 7: 300ms grace period functions accurately upon mouseleave', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(video, { tweetId: '1800000000000000010' }, { stateStore: env.stateStore });
    const container = controller.shadowRoot.querySelector('.xvt-toolbar-container');

    simulatePointerEvent(videoWrapper, 'mouseenter');
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

    // Mouse leaves video wrapper
    simulatePointerEvent(videoWrapper, 'mouseleave');

    // At t = 150ms: still in grace period, toolbar must remain visible
    vi.advanceTimersByTime(150);
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    expect(container.classList.contains('xvt-hovered')).toBe(true);

    // At t = 290ms: still in grace period
    vi.advanceTimersByTime(140);
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

    // At t = 310ms: grace period expired, toolbar hides
    vi.advanceTimersByTime(20);
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(container.classList.contains('xvt-idle')).toBe(true);
  });

  it('Scenario 8: moving from video to toolbar host cancels hide timer and keeps toolbar open', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(video, { tweetId: '1800000000000000010' }, { stateStore: env.stateStore });
    const host = getToolbarHost(videoWrapper);

    simulatePointerEvent(videoWrapper, 'mouseenter');
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

    // Mouse leaves video toward toolbar
    simulatePointerEvent(videoWrapper, 'mouseleave');
    vi.advanceTimersByTime(100); // 100ms into grace period

    // Pointer enters toolbar host
    simulatePointerEvent(host, 'mouseenter');

    // Advance past initial 300ms window (e.g. 500ms total)
    vi.advanceTimersByTime(400);

    // Toolbar must remain hovered because pointer is on toolbar host
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    const container = controller.shadowRoot.querySelector('.xvt-toolbar-container');
    expect(container.classList.contains('xvt-hovered')).toBe(true);
  });

  it('Scenario 9: returning into video wrapper within 300ms cancels hide timer', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(video, { tweetId: '1800000000000000010' }, { stateStore: env.stateStore });

    simulatePointerEvent(videoWrapper, 'mouseenter');
    simulatePointerEvent(videoWrapper, 'mouseleave');

    // At t = 200ms, pointer re-enters video wrapper
    vi.advanceTimersByTime(200);
    simulatePointerEvent(videoWrapper, 'mouseenter');

    // Advance 300ms further
    vi.advanceTimersByTime(300);

    // Toolbar remains stably hovered
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
  });

  it('Scenario 10: multiple videos have completely independent hover states and timers', () => {
    teardownToolbarTestEnv(env);
    env = setupToolbarTestEnv({
      tweetId: '1800000000000000020',
      videoIndices: [1, 2],
    });

    const [video1, video2] = env.videos;
    const wrapper1 = video1.closest('[data-testid="videoComponent"]');
    const wrapper2 = video2.closest('[data-testid="videoComponent"]');

    const controller1 = attachToolbar(video1, { tweetId: '1800000000000000020', mediaIndex: 1 }, { stateStore: env.stateStore });
    const controller2 = attachToolbar(video2, { tweetId: '1800000000000000020', mediaIndex: 2 }, { stateStore: env.stateStore });

    // Initially both are idle
    expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    // Hover Video 1 only
    simulatePointerEvent(wrapper1, 'mouseenter');
    expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    // Leave Video 1 (starts grace period for Video 1)
    simulatePointerEvent(wrapper1, 'mouseleave');
    vi.advanceTimersByTime(100);

    // Hover Video 2
    simulatePointerEvent(wrapper2, 'mouseenter');
    expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

    // Advance 250ms (total 350ms since Video 1 leave)
    vi.advanceTimersByTime(250);

    // Video 1 is now idle; Video 2 is still hovered
    expect(controller1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(controller2.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
  });
});
