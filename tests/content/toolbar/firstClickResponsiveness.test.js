// tests/content/toolbar/firstClickResponsiveness.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { attachToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import * as storage from '../../../src/shared/utils/storage.js';

describe('Floating Toolbar: First-Click Responsiveness & Pointerdown Acceleration', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
    env = setupToolbarTestEnv({ tweetId: '1899999999999999999' });
    // Default configured cobalt
    storage.setCachedSettings({ cobaltUrl: 'http://localhost:9000' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    teardownToolbarTestEnv(env);
  });

  it('triggers download immediately on pointerdown without needing a second click', async () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1899999999999999999' },
      { stateStore: env.stateStore, enableDownload: true, cobaltUrl: 'http://localhost:9000' }
    );
    const host = getToolbarHost(videoWrapper);
    const { downloadBtn } = getToolbarButtons(host);

    const sendMsgSpy = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      if (typeof cb === 'function') {
        cb({ success: true, downloadId: 888 });
      }
    });

    // 1. Dispatch pointerdown (simulate primary left mouse press)
    const pointerdownEvent = new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    downloadBtn.dispatchEvent(pointerdownEvent);

    // Verifications:
    // A. Concurrency transition to DOWNLOADING occurred on response!
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);
    // B. Download request was sent on first action!
    expect(sendMsgSpy).toHaveBeenCalledTimes(1);
    expect(sendMsgSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COBALT_DOWNLOAD',
        payload: expect.objectContaining({
          tweetId: '1899999999999999999',
        }),
      }),
      expect.any(Function)
    );

    // 2. Browser subsequently dispatches 'click' after mouseup
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    downloadBtn.dispatchEvent(clickEvent);

    // C. Concurrency guard / debounce ensures zero duplicate messages
    expect(sendMsgSpy).toHaveBeenCalledTimes(1);
  });

  it('safely handles direct click if pointerdown is not emitted (keyboard / accessibility)', async () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1899999999999999999' },
      { stateStore: env.stateStore, enableDownload: true, cobaltUrl: 'http://localhost:9000' }
    );
    const host = getToolbarHost(videoWrapper);
    const { downloadBtn } = getToolbarButtons(host);

    const sendMsgSpy = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      if (typeof cb === 'function') cb({ success: true, downloadId: 889 });
    });

    // Direct click (e.g. from keyboard activation or screen reader)
    simulatePointerEvent(downloadBtn, 'click');

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DOWNLOADING);
    expect(sendMsgSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores non-primary pointerdown events (e.g. right-click)', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1899999999999999999' },
      { stateStore: env.stateStore, enableDownload: true }
    );
    const host = getToolbarHost(videoWrapper);
    const { downloadBtn } = getToolbarButtons(host);
    const sendMsgSpy = vi.spyOn(chrome.runtime, 'sendMessage');

    // Right-click pointerdown
    const rightClickDown = new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 2, // Secondary
    });
    downloadBtn.dispatchEvent(rightClickDown);

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(sendMsgSpy).not.toHaveBeenCalled();
  });

  it('shields pointerdown, pointerup, mousedown, mouseup, and click from bubbling to Twitter DOM', () => {
    const { tweet, video, videoWrapper } = env;
    attachToolbar(video, { tweetId: '1899999999999999999' }, { stateStore: env.stateStore });
    const host = getToolbarHost(videoWrapper);

    const tweetPointerDownSpy = vi.fn();
    const tweetPointerUpSpy = vi.fn();
    const tweetMouseDownSpy = vi.fn();
    const tweetMouseUpSpy = vi.fn();
    const tweetClickSpy = vi.fn();

    tweet.addEventListener('pointerdown', tweetPointerDownSpy);
    tweet.addEventListener('pointerup', tweetPointerUpSpy);
    tweet.addEventListener('mousedown', tweetMouseDownSpy);
    tweet.addEventListener('mouseup', tweetMouseUpSpy);
    tweet.addEventListener('click', tweetClickSpy);

    // Dispatch events on host
    host.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    host.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true }));
    host.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    host.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    host.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(tweetPointerDownSpy).not.toHaveBeenCalled();
    expect(tweetPointerUpSpy).not.toHaveBeenCalled();
    expect(tweetMouseDownSpy).not.toHaveBeenCalled();
    expect(tweetMouseUpSpy).not.toHaveBeenCalled();
    expect(tweetClickSpy).not.toHaveBeenCalled();
  });

  it('triggers CDN resolution on first pointerdown', async () => {
    const { video, videoWrapper } = env;
    const resolverSpy = vi.fn().mockResolvedValue({ success: true, url: 'https://video.twimg.com/test.mp4' });

    const controller = attachToolbar(
      video,
      { tweetId: '1899999999999999999' },
      { stateStore: env.stateStore, cdnResolver: resolverSpy }
    );
    const host = getToolbarHost(videoWrapper);
    const { cdnBtn } = getToolbarButtons(host);

    const pointerdownEvent = new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    cdnBtn.dispatchEvent(pointerdownEvent);

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);
    expect(resolverSpy).toHaveBeenCalledTimes(1);

    // Follow-up click is ignored
    cdnBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(resolverSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers dismiss on first pointerdown', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1899999999999999999' },
      { stateStore: env.stateStore }
    );
    const host = getToolbarHost(videoWrapper);
    const { dismissBtn } = getToolbarButtons(host);

    const pointerdownEvent = new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    dismissBtn.dispatchEvent(pointerdownEvent);

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);
  });

  it('re-activates hovered state on mousemove if state had reset to idle', () => {
    const { video, videoWrapper } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1899999999999999999' },
      { stateStore: env.stateStore }
    );
    const host = getToolbarHost(videoWrapper);

    // Initial state is idle
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    // Wrapper mousemove triggers show
    videoWrapper.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

    // Manually hide
    controller.hide();
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    // Host mousemove re-triggers show
    host.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
  });
});
