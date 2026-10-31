// tests/content/toolbar/reviewerRound2Adversarial.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { simulatePointerEvent } from '../../fixtures/toolbarFixture.js';
import { attachToolbar, detachToolbar, getToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import { createVideoStateStore } from '../../../src/content/state/videoState.js';
import { matchPickerItem } from '../../../src/shared/utils/mediaMatcher.js';
import { extractMediaFingerprint, getVideoKey } from '../../../src/content/detection/videoDetector.js';
import { extractTweetInfo } from '../../../src/content/extraction/permalinkExtractor.js';

describe('Reviewer Round 2 Adversarial Stress Suite', () => {
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
  // Test 1: Shared container lockout when videos have no initial fingerprint
  // -------------------------------------------------------------------------
  it('Attack 1: Attaching toolbars to 2 videos in a shared container without initial fingerprints/indices', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div class="header"><a href="https://x.com/user/status/123001"><time>1m</time></a></div>
      <div data-testid="videoComponent" class="shared-wrapper" id="sw">
        <video id="v1"></video>
        <video id="v2"></video>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');

    // Neither video has poster or /video/:index link
    const c1 = attachToolbar(v1, { tweetId: '123001' }, { stateStore });
    const c2 = attachToolbar(v2, { tweetId: '123001' }, { stateStore });

    expect(c1).not.toBeNull();
    // In prior attempt, line 60 of index.js returns null because !hasIdentity is true!
    expect(c2).not.toBeNull();
    expect(c1).not.toBe(c2);
    expect(c1.host).not.toBe(c2.host);
  });

  // -------------------------------------------------------------------------
  // Test 2: Photo entity leakage in Cobalt Picker
  // -------------------------------------------------------------------------
  it('Attack 2: matchPickerItem must NEVER return a photo item for a video toolbar', () => {
    const items = [
      { type: 'photo', url: 'https://pbs.twimg.com/media/pic1.jpg' },
      { type: 'video', url: 'https://video.twimg.com/vid1.mp4' },
    ];

    // If mediaIndex is 1 (which in Twitter is the photo), video toolbar must NOT match it
    const match = matchPickerItem(items, { mediaIndex: 1 });
    // It should not return the photo!
    expect(match?.type).not.toBe('photo');
    expect(match?.url).not.toBe('https://pbs.twimg.com/media/pic1.jpg');
  });

  // -------------------------------------------------------------------------
  // Test 3: Sibling overlay hover in shared multi-video container
  // -------------------------------------------------------------------------
  it('Attack 3: Hovering a sibling overlay associated with Video 1 inside a shared container shows Video 1 toolbar', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent" class="shared-wrapper" id="sw">
        <video id="v1" src="blob:https://x.com/v1"></video>
        <div class="overlay-1" id="ov1">Play 1</div>
        <video id="v2" src="blob:https://x.com/v2"></video>
        <div class="overlay-2" id="ov2">Play 2</div>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');
    const ov1 = article.querySelector('#ov1');

    const c1 = attachToolbar(v1, { tweetId: '123003', mediaIndex: 1 }, { stateStore });
    const c2 = attachToolbar(v2, { tweetId: '123003', mediaIndex: 2 }, { stateStore });

    expect(c1).not.toBeNull();
    expect(c2).not.toBeNull();

    // Hover ov1 (overlay associated with v1)
    simulatePointerEvent(ov1, 'mousemove');
    vi.advanceTimersByTime(50);

    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
  });

  // -------------------------------------------------------------------------
  // Test 4: Ancestor data-media-id collision guard
  // -------------------------------------------------------------------------
  it('Attack 4: Ancestor container data-media-id containing multiple videos must not cause key collision', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div class="header"><a href="https://x.com/user/status/123004"><time>1m</time></a></div>
      <div data-media-id="shared_container_media_id" class="media-container">
        <div class="cell-1"><video id="v1"></video></div>
        <div class="cell-2"><video id="v2"></video></div>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');

    const fp1 = extractMediaFingerprint(v1);
    const fp2 = extractMediaFingerprint(v2);

    const key1 = getVideoKey('123004', null, v1);
    const key2 = getVideoKey('123004', null, v2);

    // Keys must not collide
    expect(key1).not.toBe(key2);

    // Attaching toolbars to both videos must succeed independently
    const c1 = attachToolbar(v1, { tweetId: '123004' }, { stateStore });
    const c2 = attachToolbar(v2, { tweetId: '123004' }, { stateStore });

    expect(c1).not.toBeNull();
    expect(c2).not.toBeNull();
    expect(c1.host).not.toBe(c2.host);

    // Dismissing v1 must NOT dismiss v2!
    c1.dismiss();
    expect(stateStore.isDismissed(key1, v1)).toBe(true);
    expect(stateStore.isDismissed(key2, v2)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 5: Preview thumbnail inside dedicated wrapper (nested Twitter DOM)
  // -------------------------------------------------------------------------
  it('Attack 5: Extracts preview thumbnail from sibling container within dedicated player wrapper', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent">
        <div class="cell-1" data-testid="videoPlayer">
          <div class="poster-container">
            <img src="https://pbs.twimg.com/ext_tw_video_thumb/987654321/pu/img/thumb.jpg" />
          </div>
          <div class="video-container">
            <video id="v1" src="blob:https://x.com/stream-blob"></video>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const fp = extractMediaFingerprint(v1);

    expect(fp).toBe('987654321');
  });

  // -------------------------------------------------------------------------
  // Test 6: CSS background-image thumbnail extraction
  // -------------------------------------------------------------------------
  it('Attack 6: Extracts thumbnail ID from CSS background-image in dedicated wrapper', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent">
        <div class="cell-1" data-testid="videoPlayer">
          <div class="poster-div" style="background-image: url('https://pbs.twimg.com/amplify_video_thumb/55667788/img/thumb.jpg');"></div>
          <div class="video-container">
            <video id="v1" src="blob:https://x.com/stream-blob-2"></video>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const fp = extractMediaFingerprint(v1);

    expect(fp).toBe('55667788');
  });

  // -------------------------------------------------------------------------
  // Test 7: Dynamic mediaIndex discovery at action time
  // -------------------------------------------------------------------------
  it('Attack 7: Dynamic discovery of /video/:index at download action time when anchor was mounted after video', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div class="header"><a href="https://x.com/user/status/123007"><time>1m</time></a></div>
      <div data-testid="videoComponent">
        <div class="cell-1">
          <video id="v1" src="blob:https://x.com/v1"></video>
        </div>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const cell1 = article.querySelector('.cell-1');

    // Video attached when mediaIndex is null
    const c1 = attachToolbar(v1, { tweetId: '123007' }, { stateStore, enableDownload: true });
    expect(c1).not.toBeNull();

    // Later, Twitter mounts the /video/2 anchor inside cell1
    const anchor = document.createElement('a');
    anchor.href = 'https://x.com/user/status/123007/video/2';
    cell1.appendChild(anchor);

    const calls = [];
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, cb) => {
      calls.push({ msg, cb });
    });

    const dlBtn = c1.host.shadowRoot.querySelector('.xvt-btn-download');
    dlBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(calls.length).toBe(1);
    // At click time, it should dynamically pick up mediaIndex = 2 instead of undefined
    expect(calls[0].msg.payload.mediaIndex).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Test 8: CDN Ambiguous resolver rejection error handles gracefully
  // -------------------------------------------------------------------------
  it('Attack 8: CDN Ambiguous resolver handles rejection without unhandled rejection', async () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent">
        <video id="v1" src="blob:https://x.com/v1" poster="https://pbs.twimg.com/media/test_fp.jpg"></video>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const failingResolver = vi.fn((video, tweetInfo, options) => {
      // Simulate resolver invoking onAmbiguous callback
      options.onAmbiguous(
        [
          { type: 'video', id_str: 'test_fp', video_info: { variants: [{ url: 'https://video.twimg.com/test.mp4' }] } },
        ],
        async () => {
          throw new Error('Tab opener failed');
        }
      );
      return Promise.resolve({ isAmbiguous: true });
    });

    const c1 = attachToolbar(v1, { tweetId: '123008' }, { stateStore, cdnResolver: failingResolver });
    expect(c1).not.toBeNull();

    const cdnBtn = c1.host.shadowRoot.querySelector('.xvt-btn-cdn');
    cdnBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await vi.advanceTimersByTimeAsync(50);

    // Error must be set on stateManager gracefully
    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.ERROR);
  });

  // -------------------------------------------------------------------------
  // Test 9: detachToolbar on video without tweetId cleans up orphan host in multi-video wrapper
  // -------------------------------------------------------------------------
  it('Attack 9: detachToolbar on video without tweetId cleanly removes host from shared wrapper', () => {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="videoComponent" class="shared-wrapper">
        <video id="v1"></video>
        <video id="v2"></video>
      </div>
    `;
    document.body.appendChild(article);

    const v1 = article.querySelector('#v1');
    const v2 = article.querySelector('#v2');

    // Attach toolbars without tweetId
    const c1 = attachToolbar(v1, {}, { stateStore });
    const c2 = attachToolbar(v2, {}, { stateStore });

    expect(c1).not.toBeNull();
    expect(c2).not.toBeNull();

    const wrapper = article.querySelector('.shared-wrapper');
    expect(wrapper.querySelectorAll('.xvt-toolbar-host').length).toBe(2);

    detachToolbar(v1);

    expect(wrapper.querySelectorAll('.xvt-toolbar-host').length).toBe(1);
    expect(c2.host.parentNode).toBe(wrapper);
  });

  // -------------------------------------------------------------------------
  // Test 10: Multi-item picker with mixed audio, photo, gif, video
  // -------------------------------------------------------------------------
  it('Attack 10: matchPickerItem with mixed media skips photo and matches correct video', () => {
    const items = [
      { type: 'photo', url: 'https://pbs.twimg.com/media/p1.jpg' },
      { type: 'photo', url: 'https://pbs.twimg.com/media/p2.jpg' },
      { type: 'video', url: 'https://video.twimg.com/v1.mp4', thumb: 'https://pbs.twimg.com/ext_tw_video_thumb/101/img.jpg' },
      { type: 'video', url: 'https://video.twimg.com/v2.mp4', thumb: 'https://pbs.twimg.com/ext_tw_video_thumb/102/img.jpg' },
    ];

    // Video with fingerprint '102' must match item 3
    const matched = matchPickerItem(items, { mediaFingerprint: '102' });
    expect(matched?.url).toBe('https://video.twimg.com/v2.mp4');

    // Video with mediaIndex 3 (1-based index in items is v1.mp4)
    const matchedIdx = matchPickerItem(items, { mediaIndex: 3 });
    expect(matchedIdx?.url).toBe('https://video.twimg.com/v1.mp4');
  });
});
