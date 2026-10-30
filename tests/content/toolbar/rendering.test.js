// tests/content/toolbar/rendering.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getShadowRoot,
  getToolbarButtons,
} from '../../fixtures/toolbarFixture.js';
import { attachToolbar, getToolbar } from '../../../src/content/toolbar/index.js';

describe('Group A: Toolbar Rendering (Scenarios 1–5)', () => {
  let env;

  beforeEach(() => {
    env = setupToolbarTestEnv({ tweetId: '1800000000000000001' });
  });

  afterEach(() => {
    teardownToolbarTestEnv(env);
  });

  it('Scenario 1: mounts correctly on detected video element within open Shadow DOM', () => {
    const { video, videoWrapper } = env;
    expect(video).not.toBeNull();
    expect(videoWrapper).not.toBeNull();

    const controller = attachToolbar(video, { tweetId: '1800000000000000001' }, { stateStore: env.stateStore });
    expect(controller).not.toBeNull();

    const host = getToolbarHost(videoWrapper);
    expect(host).not.toBeNull();
    expect(host.classList.contains('xvt-toolbar-host')).toBe(true);

    const shadowRoot = getShadowRoot(host);
    expect(shadowRoot).not.toBeNull();

    const { downloadBtn, cdnBtn, dismissBtn } = getToolbarButtons(host);
    expect(downloadBtn).not.toBeNull();
    expect(cdnBtn).not.toBeNull();
    expect(dismissBtn).not.toBeNull();

    // Check SVG icons presence
    expect(downloadBtn.querySelector('svg')).not.toBeNull();
    expect(cdnBtn.querySelector('svg')).not.toBeNull();
    expect(dismissBtn.querySelector('svg')).not.toBeNull();

    // Check compact horizontal toolbar structure (icon-only buttons with tooltips)
    const pillContainer = shadowRoot.querySelector('.xvt-toolbar-pill');
    expect(pillContainer).not.toBeNull();
    expect(shadowRoot.querySelectorAll('.xvt-tooltip').length).toBe(2);
    expect(downloadBtn.querySelector('.xvt-btn-text')).toBeNull();
    expect(cdnBtn.querySelector('.xvt-btn-text')).toBeNull();

    // CSS Encapsulation check: internal classes must not leak into parent document
    expect(document.querySelector('.xvt-btn-download')).toBeNull();
    expect(document.querySelector('.xvt-toolbar-pill')).toBeNull();
  });

  it('Scenario 2: anchors horizontally inside top-left corner of video (top: 10px, left: 10px, z-index: 9999)', () => {
    const { video, videoWrapper } = env;

    attachToolbar(video, { tweetId: '1800000000000000001' }, { stateStore: env.stateStore });
    const host = getToolbarHost(videoWrapper);

    expect(host.style.position).toBe('absolute');
    expect(host.style.top).toBe('10px');
    expect(host.style.left).toBe('10px');
    expect(host.style.zIndex).toBe('9999');

    // Wrapper must establish positioning context (relative)
    expect(videoWrapper.style.position).toBe('relative');
  });

  it('Scenario 3: instantiates two distinct, independent toolbars for two videos in the same tweet', () => {
    teardownToolbarTestEnv(env);
    env = setupToolbarTestEnv({
      tweetId: '1800000000000000002',
      videoIndices: [1, 2],
    });

    const [video1, video2] = env.videos;
    expect(video1).toBeDefined();
    expect(video2).toBeDefined();

    const controller1 = attachToolbar(video1, { tweetId: '1800000000000000002', mediaIndex: 1 }, { stateStore: env.stateStore });
    const controller2 = attachToolbar(video2, { tweetId: '1800000000000000002', mediaIndex: 2 }, { stateStore: env.stateStore });

    expect(controller1).not.toBe(controller2);
    expect(controller1.host).not.toBe(controller2.host);
    expect(controller1.shadowRoot).not.toBe(controller2.shadowRoot);

    const wrapper1 = video1.closest('[data-testid="videoComponent"]');
    const wrapper2 = video2.closest('[data-testid="videoComponent"]');
    expect(wrapper1.querySelectorAll('.xvt-toolbar-host').length).toBe(1);
    expect(wrapper2.querySelectorAll('.xvt-toolbar-host').length).toBe(1);
  });

  it('Scenario 4: guards against duplicate mounting when called multiple times on the same video', () => {
    const { video, videoWrapper } = env;

    const controller1 = attachToolbar(video, { tweetId: '1800000000000000001' }, { stateStore: env.stateStore });
    const controller2 = attachToolbar(video, { tweetId: '1800000000000000001' }, { stateStore: env.stateStore });

    expect(controller1).toBe(controller2);
    expect(videoWrapper.querySelectorAll('.xvt-toolbar-host').length).toBe(1);
  });

  it('Scenario 5: preserves tweet card structure, children, and layout without alteration', () => {
    const { tweet, video, videoWrapper } = env;

    const initialHeader = tweet.querySelector('.tweet-header');
    expect(initialHeader).not.toBeNull();

    attachToolbar(video, { tweetId: '1800000000000000001' }, { stateStore: env.stateStore });

    // Header and tweet structure remain intact
    expect(tweet.querySelector('.tweet-header')).toBe(initialHeader);
    expect(videoWrapper.contains(video)).toBe(true);

    // Host element is an absolute overlay child
    const host = getToolbarHost(videoWrapper);
    expect(host.parentElement).toBe(videoWrapper);
  });
});
