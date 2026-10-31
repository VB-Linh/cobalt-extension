// tests/content/toolbar/reviewerAdversarialStress.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { attachToolbar, detachToolbar, getToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import { createVideoStateStore } from '../../../src/content/state/videoState.js';
import { extractTweetInfo } from '../../../src/content/extraction/permalinkExtractor.js';

describe('Reviewer Round 1 Adversarial Suite', () => {
  let stateStore;

  beforeEach(() => {
    vi.useFakeTimers();
    stateStore = createVideoStateStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // -------------------------------------------------------------------------
  // Test 1: Multiple videos sharing a single container / videoComponent
  // -------------------------------------------------------------------------
  it('Bug 1: Attaching toolbars to 2 videos sharing a single container / videoComponent', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div class="header"><a href="https://x.com/user/status/55555"><time>1m</time></a></div>
      <div data-testid="videoComponent" class="shared-wrapper">
        <div class="video-cell-1">
          <a href="https://x.com/user/status/55555/video/1">Link 1</a>
          <video id="v1" src="blob:https://x.com/v1"></video>
        </div>
        <div class="video-cell-2">
          <a href="https://x.com/user/status/55555/video/2">Link 2</a>
          <video id="v2" src="blob:https://x.com/v2"></video>
        </div>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');

    const c1 = attachToolbar(v1, { tweetId: '55555', mediaIndex: 1 }, { stateStore });
    const c2 = attachToolbar(v2, { tweetId: '55555', mediaIndex: 2 }, { stateStore });

    expect(c1).not.toBeNull();
    // This will FAIL with current implementation because index.js line 55 blocks c2!
    expect(c2).not.toBeNull();
    expect(c1).not.toBe(c2);
  });

  // -------------------------------------------------------------------------
  // Test 2: Hover isolation when moving from Video 1 to Video 2
  // -------------------------------------------------------------------------
  it('Bug 2: Hover transitions from Video 1 directly to Video 2 overlay', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent" class="wrapper-1" id="w1">
        <video id="v1" src="blob:https://x.com/v1"></video>
        <div class="overlay-1" id="ov1">Play 1</div>
      </div>
      <div data-testid="videoComponent" class="wrapper-2" id="w2">
        <video id="v2" src="blob:https://x.com/v2"></video>
        <div class="overlay-2" id="ov2">Play 2</div>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');
    const w1 = article.querySelector('#w1');
    const w2 = article.querySelector('#w2');
    const ov2 = article.querySelector('#ov2');

    const c1 = attachToolbar(v1, { tweetId: '55555', mediaIndex: 1 }, { stateStore });
    const c2 = attachToolbar(v2, { tweetId: '55555', mediaIndex: 2 }, { stateStore });

    expect(c1).not.toBeNull();
    expect(c2).not.toBeNull();

    // Hover w1
    simulatePointerEvent(w1, 'mouseenter');
    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    // Pointer leaves w1, moves into ov2 (overlay child of w2)
    simulatePointerEvent(w1, 'mouseleave', { relatedTarget: ov2 });
    simulatePointerEvent(ov2, 'mouseenter', { relatedTarget: w1 });
    simulatePointerEvent(ov2, 'mousemove');

    vi.advanceTimersByTime(350);

    // Video 1 must hide, Video 2 must show
    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
  });

  // -------------------------------------------------------------------------
  // Test 3: Sibling anchor extraction in multi-video tweet
  // -------------------------------------------------------------------------
  it('Bug 3: permalinkExtractor finds mediaIndex when anchor is sibling inside video cell', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div class="header"><a href="https://x.com/user/status/77777"><time>1m</time></a></div>
      <div data-testid="videoComponent">
        <div class="cell-1">
          <a href="https://x.com/user/status/77777/video/1">Watch 1</a>
          <video id="v1" src="blob:https://x.com/v1"></video>
        </div>
        <div class="cell-2">
          <a href="https://x.com/user/status/77777/video/2">Watch 2</a>
          <video id="v2" src="blob:https://x.com/v2"></video>
        </div>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');

    const info1 = extractTweetInfo(article, v1);
    const info2 = extractTweetInfo(article, v2);

    expect(info1.mediaIndex).toBe(1);
    expect(info2.mediaIndex).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Test 4: Tweets with 3 or 4 videos sharing a single container (Ledger R0-5)
  // -------------------------------------------------------------------------
  it('Edge case 4: Tweets with 4 videos sharing a container mount 4 independent toolbars', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div class="header"><a href="https://x.com/user/status/88888"><time>1m</time></a></div>
      <div data-testid="videoComponent" class="grid-4">
        <div class="cell" id="c1"><video id="v1" src="blob:https://x.com/v1"></video></div>
        <div class="cell" id="c2"><video id="v2" src="blob:https://x.com/v2"></video></div>
        <div class="cell" id="c3"><video id="v3" src="blob:https://x.com/v3"></video></div>
        <div class="cell" id="c4"><video id="v4" src="blob:https://x.com/v4"></video></div>
      </div>
    `;
    document.body.appendChild(article);

    const videos = Array.from(article.querySelectorAll('video'));
    const controllers = videos.map((v, i) =>
      attachToolbar(v, { tweetId: '88888', mediaIndex: i + 1 }, { stateStore })
    );

    // All 4 must mount successfully and have independent controllers
    expect(controllers[0]).not.toBeNull();
    expect(controllers[1]).not.toBeNull();
    expect(controllers[2]).not.toBeNull();
    expect(controllers[3]).not.toBeNull();

    const uniqueHosts = new Set(controllers.map((c) => c.host));
    expect(uniqueHosts.size).toBe(4);
  });

  // -------------------------------------------------------------------------
  // Test 5: Quoted tweet with video + Parent tweet with multiple videos (Ledger R0-6)
  // -------------------------------------------------------------------------
  it('Edge case 5: Quoted tweet with video and parent tweet with 2 videos stay isolated', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div class="header"><a href="https://x.com/parent_user/status/10001"><time>1m</time></a></div>
      <div data-testid="videoComponent" class="parent-media">
        <div class="cell" id="p-cell-1">
          <a href="https://x.com/parent_user/status/10001/video/1">PV1</a>
          <video id="pv1" src="blob:https://x.com/pv1"></video>
        </div>
        <div class="cell" id="p-cell-2">
          <a href="https://x.com/parent_user/status/10001/video/2">PV2</a>
          <video id="pv2" src="blob:https://x.com/pv2"></video>
        </div>
      </div>
      <div data-testid="quoteTweet" role="link">
        <div class="quote-header"><a href="https://x.com/quoted_user/status/20002"><time>2m</time></a></div>
        <div data-testid="videoComponent" class="quote-media">
          <a href="https://x.com/quoted_user/status/20002/video/1">QV1</a>
          <video id="qv1" src="blob:https://x.com/qv1"></video>
        </div>
      </div>
    `;
    document.body.appendChild(article);

    const pv1 = article.querySelector('#pv1');
    const pv2 = article.querySelector('#pv2');
    const qv1 = article.querySelector('#qv1');

    const infoPV1 = extractTweetInfo(article, pv1);
    const infoPV2 = extractTweetInfo(article, pv2);
    const infoQV1 = extractTweetInfo(article, qv1);

    expect(infoPV1.tweetId).toBe('10001');
    expect(infoPV1.isQuoted).toBe(false);
    expect(infoPV1.mediaIndex).toBe(1);

    expect(infoPV2.tweetId).toBe('10001');
    expect(infoPV2.isQuoted).toBe(false);
    expect(infoPV2.mediaIndex).toBe(2);

    expect(infoQV1.tweetId).toBe('20002');
    expect(infoQV1.isQuoted).toBe(true);
    expect(infoQV1.mediaIndex).toBe(1);

    const cp1 = attachToolbar(pv1, infoPV1, { stateStore });
    const cp2 = attachToolbar(pv2, infoPV2, { stateStore });
    const cq1 = attachToolbar(qv1, infoQV1, { stateStore });

    expect(cp1).not.toBeNull();
    expect(cp2).not.toBeNull();
    expect(cq1).not.toBeNull();
    expect(cq1.wrapper).not.toBe(article.querySelector('[data-testid="quoteTweet"]'));
  });

  // -------------------------------------------------------------------------
  // Test 6: Detaching toolbar on video 2 does not delete video 1 host
  // -------------------------------------------------------------------------
  it('Bug 6: detachToolbar on video 2 does not delete video 1 toolbar host in shared wrapper', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent" class="shared-wrapper">
        <video id="v1" src="blob:https://x.com/v1"></video>
        <video id="v2" src="blob:https://x.com/v2"></video>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');

    const c1 = attachToolbar(v1, { tweetId: '66666', mediaIndex: 1 }, { stateStore });
    const c2 = attachToolbar(v2, { tweetId: '66666', mediaIndex: 2 }, { stateStore });

    if (!c1 || !c2) return;

    detachToolbar(v2);

    expect(c1.host.parentNode).not.toBeNull();
    expect(c2.host.parentNode).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 7: Hovering between 2 videos sharing a single container directly
  // -------------------------------------------------------------------------
  it('Bug 7: Moving mouse from v1 to v2 inside directly shared container hides v1 and shows v2', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent" class="shared-wrapper" id="sw">
        <video id="v1" src="blob:https://x.com/v1"></video>
        <video id="v2" src="blob:https://x.com/v2"></video>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');
    const sw = article.querySelector('#sw');

    const c1 = attachToolbar(v1, { tweetId: '77777', mediaIndex: 1 }, { stateStore });
    const c2 = attachToolbar(v2, { tweetId: '77777', mediaIndex: 2 }, { stateStore });

    expect(c1).not.toBeNull();
    expect(c2).not.toBeNull();
    expect(c1.wrapper).toBe(sw);
    expect(c2.wrapper).toBe(sw);

    // Hover v1
    simulatePointerEvent(v1, 'mousemove');
    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    // Mouse moves from v1 to v2 within sw (bubbles to sw)
    simulatePointerEvent(v2, 'mousemove');
    vi.advanceTimersByTime(350);

    // c1 MUST be IDLE, c2 MUST be HOVERED
    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
  });

  // -------------------------------------------------------------------------
  // Test 8: 3-video shared container Download without /video/:index anchors (Ledger R0-5)
  // -------------------------------------------------------------------------
  it('Edge case 8: Download in 3-video container without index anchors resolves via fingerprint or falls back gracefully', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div class="header"><a href="https://x.com/user/status/99999"><time>1m</time></a></div>
      <div data-testid="videoComponent" class="shared-container">
        <video id="v1" poster="https://pbs.twimg.com/media/fp_video_1.jpg"></video>
        <video id="v2" poster="https://pbs.twimg.com/media/fp_video_2.jpg"></video>
        <video id="v3" poster="https://pbs.twimg.com/media/fp_video_3.jpg"></video>
      </div>
    `;
    document.body.appendChild(article);

    const [v1, v2, v3] = Array.from(article.querySelectorAll('video'));
    const c1 = attachToolbar(v1, { tweetId: '99999' }, { stateStore, enableDownload: true });
    const c2 = attachToolbar(v2, { tweetId: '99999' }, { stateStore, enableDownload: true });
    const c3 = attachToolbar(v3, { tweetId: '99999' }, { stateStore, enableDownload: true });

    expect(c1).not.toBeNull();
    expect(c2).not.toBeNull();
    expect(c3).not.toBeNull();

    const calls = [];
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      calls.push({ msg, cb });
    });

    // 1. Download on v2 (matches fp_video_2)
    const dl2 = c2.host.shadowRoot.querySelector('.xvt-btn-download');
    dl2.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(calls.length).toBe(1);
    expect(calls[0].msg.payload.mediaFingerprint).toBe('fp_video_2');
    expect(calls[0].msg.payload.mediaIndex).toBeUndefined();

    // Cobalt returns picker with 3 items
    calls[0].cb({
      status: 'picker',
      items: [
        { type: 'video', url: 'https://video.twimg.com/v1.mp4', thumb: 'https://pbs.twimg.com/media/fp_video_1.jpg' },
        { type: 'video', url: 'https://video.twimg.com/v2.mp4', thumb: 'https://pbs.twimg.com/media/fp_video_2.jpg' },
        { type: 'video', url: 'https://video.twimg.com/v3.mp4', thumb: 'https://pbs.twimg.com/media/fp_video_3.jpg' },
      ],
    });

    // v2 matches directly by fingerprint WITHOUT rendering dialog modal!
    expect(c2.host.shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    expect(calls.length).toBe(2);
    expect(calls[1].msg.payload.selectedUrl).toBe('https://video.twimg.com/v2.mp4');
    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(c3.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
  });

  // -------------------------------------------------------------------------
  // Test 9: 3-video shared container Open CDN without /video/:index anchors (Ledger R0-5)
  // -------------------------------------------------------------------------
  it('Edge case 9: Open CDN in 3-video container without index anchors resolves via fingerprint or falls back gracefully', async () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div class="header"><a href="https://x.com/user/status/99998"><time>1m</time></a></div>
      <div data-testid="videoComponent" class="shared-container">
        <video id="v1" poster="https://pbs.twimg.com/media/fp_cdn_1.jpg"></video>
        <video id="v2" poster="https://pbs.twimg.com/media/fp_cdn_2.jpg"></video>
        <video id="v3" poster="https://pbs.twimg.com/media/fp_cdn_3.jpg"></video>
      </div>
    `;
    document.body.appendChild(article);

    const [v1, v2, v3] = Array.from(article.querySelectorAll('video'));
    const c1 = attachToolbar(v1, { tweetId: '99998' }, { stateStore });
    const c2 = attachToolbar(v2, { tweetId: '99998' }, { stateStore });
    const c3 = attachToolbar(v3, { tweetId: '99998' }, { stateStore });

    const syndicationData = {
      id_str: '99998',
      mediaDetails: [
        {
          type: 'video',
          id_str: 'fp_cdn_1',
          media_url_https: 'https://pbs.twimg.com/media/fp_cdn_1.jpg',
          video_info: { variants: [{ url: 'https://video.twimg.com/cdn_v1.mp4', content_type: 'video/mp4', bitrate: 2000 }] },
        },
        {
          type: 'video',
          id_str: 'fp_cdn_2',
          media_url_https: 'https://pbs.twimg.com/media/fp_cdn_2.jpg',
          video_info: { variants: [{ url: 'https://video.twimg.com/cdn_v2.mp4', content_type: 'video/mp4', bitrate: 2000 }] },
        },
        {
          type: 'video',
          id_str: 'fp_cdn_3',
          media_url_https: 'https://pbs.twimg.com/media/fp_cdn_3.jpg',
          video_info: { variants: [{ url: 'https://video.twimg.com/cdn_v3.mp4', content_type: 'video/mp4', bitrate: 2000 }] },
        },
      ],
    };

    const tabsSpy = vi.spyOn(chrome.tabs, 'create').mockResolvedValue({ id: 999 });
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      if (msg.action === 'FETCH_SYNDICATION') {
        const resp = { success: true, data: syndicationData };
        if (cb) cb(resp);
        return Promise.resolve(resp);
      }
      if (msg.action === 'OPEN_CDN') {
        tabsSpy({ url: msg.payload?.url });
        const resp = { success: true, tabId: 999 };
        if (cb) cb(resp);
        return Promise.resolve(resp);
      }
      return Promise.resolve({ success: true });
    });

    const cdn3 = c3.host.shadowRoot.querySelector('.xvt-btn-cdn');
    cdn3.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await vi.advanceTimersByTimeAsync(50);

    // v3 matches directly by fingerprint WITHOUT rendering dialog modal!
    expect(c3.host.shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    expect(tabsSpy).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://video.twimg.com/cdn_v3.mp4' }));
    expect(c3.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);
    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
  });
});

