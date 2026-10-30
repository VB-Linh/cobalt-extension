// tests/fixtures/toolbarFixture.js
import { createTweetFixture } from './factory.js';
import { createVideoStateStore } from '../../src/content/state/videoState.js';

/**
 * Sets up a synthetic test environment for Floating Toolbar tests.
 * 
 * @param {object} [options={}]
 * @param {string} [options.tweetId='1700000000000000000']
 * @param {(number|null)[]} [options.videoIndices=[null]]
 * @param {boolean} [options.isQuoted=false]
 * @param {import('../../src/content/state/videoState.js').VideoStateStore} [options.stateStore]
 * @returns {object}
 */
export function setupToolbarTestEnv(options = {}) {
  const root = document.createElement('div');
  root.id = 'timeline-root';
  document.body.appendChild(root);

  const tweet = createTweetFixture(options);
  root.appendChild(tweet);

  const videos = Array.from(tweet.querySelectorAll('video'));
  const video = videos[0] || null;
  const videoWrapper = video
    ? video.closest('[data-testid="videoComponent"], [data-testid="videoPlayer"]') || video.parentElement
    : null;

  const stateStore = options.stateStore || createVideoStateStore();

  return {
    root,
    tweet,
    video,
    videos,
    videoWrapper,
    stateStore,
  };
}

/**
 * Retrieves the toolbar host element from a video wrapper.
 * 
 * @param {Element} wrapper
 * @returns {HTMLElement | null}
 */
export function getToolbarHost(wrapper) {
  if (!wrapper) return null;
  return wrapper.querySelector('.xvt-toolbar-host');
}

/**
 * Retrieves the ShadowRoot of a toolbar host.
 * 
 * @param {Element} host
 * @returns {ShadowRoot | null}
 */
export function getShadowRoot(host) {
  return host?.shadowRoot || null;
}

/**
 * Queries an element inside the ShadowRoot.
 * 
 * @param {Element} host
 * @param {string} selector
 * @returns {Element | null}
 */
export function queryShadow(host, selector) {
  return host?.shadowRoot?.querySelector(selector) || null;
}

/**
 * Retrieves all 3 toolbar buttons from the host's Shadow DOM.
 * 
 * @param {Element} host
 * @returns {{ downloadBtn: HTMLButtonElement | null, cdnBtn: HTMLButtonElement | null, dismissBtn: HTMLButtonElement | null, noticeEl: HTMLElement | null }}
 */
export function getToolbarButtons(host) {
  const root = getShadowRoot(host);
  if (!root) {
    return { downloadBtn: null, cdnBtn: null, dismissBtn: null, noticeEl: null };
  }

  return {
    downloadBtn: root.querySelector('.xvt-btn-download'),
    cdnBtn: root.querySelector('.xvt-btn-cdn'),
    dismissBtn: root.querySelector('.xvt-btn-dismiss'),
    noticeEl: root.querySelector('.xvt-notice'),
  };
}

/**
 * Simulates a mouse/pointer event on a target element.
 * 
 * @param {Element} target
 * @param {string} type
 * @param {MouseEventInit} [init={}]
 * @returns {boolean}
 */
export function simulatePointerEvent(target, type, init = {}) {
  if (!target) return false;
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  });
  return target.dispatchEvent(event);
}

/**
 * Cleans up synthetic test environment DOM and state store.
 * 
 * @param {object} env
 */
export function teardownToolbarTestEnv(env) {
  if (env?.root && env.root.parentNode) {
    env.root.parentNode.removeChild(env.root);
  }
  if (env?.stateStore) {
    env.stateStore.reset();
  }
}
