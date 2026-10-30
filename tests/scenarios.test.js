// tests/scenarios.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectVideos, findTweetContainer, getVideoKey } from '../src/content/detection/index.js';
import { extractTweetInfo } from '../src/content/extraction/index.js';
import { createVideoStateStore } from '../src/content/state/index.js';
import { createVideoObserver } from '../src/content/observers/index.js';
import { createTweetFixture, flushMutations } from './fixtures/factory.js';

describe('Phase 1: 14 Mandatory Scenarios (ORIGINAL_REQUEST § R5)', () => {
  let root;
  let stateStore;

  beforeEach(() => {
    root = document.createElement('div');
    root.id = 'timeline-root';
    document.body.appendChild(root);
    stateStore = createVideoStateStore();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Scenario 1: Video in main timeline
  it('Scenario 1: Video in main timeline (article[data-testid="tweet"])', () => {
    const article = createTweetFixture({
      tweetId: '1710000000000000001',
      username: 'elonmusk',
    });
    root.appendChild(article);

    const videos = detectVideos(root);
    expect(videos).toHaveLength(1);

    const container = findTweetContainer(videos[0]);
    expect(container).toBe(article);

    const info = extractTweetInfo(container, videos[0]);
    expect(info.tweetId).toBe('1710000000000000001');
    expect(info.permalink).toBe('https://x.com/elonmusk/status/1710000000000000001');
    expect(info.mediaIndex).toBeNull();
    expect(info.isQuoted).toBe(false);

    const key = getVideoKey(info.tweetId, info.mediaIndex);
    expect(key).toBe('1710000000000000001_media_null');
  });

  // Scenario 2: Video in tweet detail page
  it('Scenario 2: Video in tweet detail page isolates focal tweet from reply tweets', () => {
    const detailContainer = document.createElement('div');
    detailContainer.setAttribute('data-testid', 'primaryColumn');

    // Focal tweet
    const focalTweet = createTweetFixture({
      tweetId: '1720000000000000002',
      username: 'techinsider',
    });
    focalTweet.id = 'focal-tweet';
    detailContainer.appendChild(focalTweet);

    // Reply tweet with text only
    const replyTweet = document.createElement('article');
    replyTweet.setAttribute('data-testid', 'tweet');
    replyTweet.id = 'reply-tweet';
    const replyAnchor = document.createElement('a');
    replyAnchor.href = 'https://x.com/reply_user/status/1720000000000000099';
    const replyTime = document.createElement('time');
    replyTime.textContent = '5m';
    replyAnchor.appendChild(replyTime);
    replyTweet.appendChild(replyAnchor);
    detailContainer.appendChild(replyTweet);

    root.appendChild(detailContainer);

    const video = focalTweet.querySelector('video');
    const container = findTweetContainer(video);
    expect(container.id).toBe('focal-tweet');

    const info = extractTweetInfo(container, video);
    expect(info.tweetId).toBe('1720000000000000002');
    expect(info.tweetId).not.toBe('1720000000000000099');
    expect(info.isQuoted).toBe(false);
  });

  // Scenario 3: Tweet with multiple videos
  it('Scenario 3: Tweet with multiple videos (Grid/Carousel) assigns distinct official media indices and keys', () => {
    const multiTweet = createTweetFixture({
      tweetId: '1730000000000000003',
      username: 'broadcast',
      videoIndices: [1, 2],
    });
    root.appendChild(multiTweet);

    const videos = detectVideos(multiTweet);
    expect(videos).toHaveLength(2);

    const info1 = extractTweetInfo(multiTweet, videos[0]);
    const info2 = extractTweetInfo(multiTweet, videos[1]);

    expect(info1.tweetId).toBe('1730000000000000003');
    expect(info1.mediaIndex).toBe(1);
    expect(info1.permalink).toBe('https://x.com/broadcast/status/1730000000000000003/video/1');

    expect(info2.tweetId).toBe('1730000000000000003');
    expect(info2.mediaIndex).toBe(2);
    expect(info2.permalink).toBe('https://x.com/broadcast/status/1730000000000000003/video/2');

    const key1 = getVideoKey(info1.tweetId, info1.mediaIndex);
    const key2 = getVideoKey(info2.tweetId, info2.mediaIndex);
    expect(key1).toBe('1730000000000000003_media_1');
    expect(key2).toBe('1730000000000000003_media_2');
    expect(key1).not.toBe(key2);
  });

  // Scenario 4: Tweet with mixed photo and video
  it('Scenario 4: Tweet with mixed photo and video only detects video element and preserves official index', () => {
    const mixedTweet = createTweetFixture({
      tweetId: '1740000000000000004',
      username: 'artist',
      hasPhoto: true,
      videoIndices: [2], // Video is at index 2
    });
    root.appendChild(mixedTweet);

    const videos = detectVideos(mixedTweet);
    expect(videos).toHaveLength(1);
    expect(videos[0].tagName.toLowerCase()).toBe('video');

    const info = extractTweetInfo(mixedTweet, videos[0]);
    expect(info.tweetId).toBe('1740000000000000004');
    expect(info.mediaIndex).toBe(2);
    expect(info.permalink).toBe('https://x.com/artist/status/1740000000000000004/video/2');
  });

  // Scenario 5: Video inside quoted tweet
  it('Scenario 5: Video inside quoted tweet links strictly to quoted tweet permalink', () => {
    const outerTweet = createTweetFixture({
      tweetId: '1750000000000000005',
      username: 'curator',
      isQuoted: true,
      quotedTweetId: '1750000000000000099',
      quotedUsername: 'originator',
    });
    root.appendChild(outerTweet);

    const video = outerTweet.querySelector('video');
    const container = findTweetContainer(video);
    expect(container.getAttribute('data-testid')).toBe('quoteTweet');

    const info = extractTweetInfo(container, video);
    expect(info.isQuoted).toBe(true);
    expect(info.tweetId).toBe('1750000000000000099');
    expect(info.tweetId).not.toBe('1750000000000000005');
    expect(info.username).toBe('originator');
    expect(info.permalink).toBe('https://x.com/originator/status/1750000000000000099');
  });

  // Scenario 6: URLs from both x.com and twitter.com
  it('Scenario 6: URLs from both x.com and twitter.com normalize to canonical permalinks without query noise', () => {
    const legacyTweet = createTweetFixture({
      tweetId: '1760000000000000006',
      username: 'news_channel',
      domain: 'https://twitter.com',
      customQuery: '?s=20&t=abcdef#media',
    });
    const modernTweet = createTweetFixture({
      tweetId: '1760000000000000007',
      username: 'modern_feed',
      domain: 'https://x.com',
      customQuery: '?ref_src=twsrc%5Etfw',
    });
    root.appendChild(legacyTweet);
    root.appendChild(modernTweet);

    const vLegacy = legacyTweet.querySelector('video');
    const vModern = modernTweet.querySelector('video');

    const infoLegacy = extractTweetInfo(legacyTweet, vLegacy);
    const infoModern = extractTweetInfo(modernTweet, vModern);

    expect(infoLegacy.tweetId).toBe('1760000000000000006');
    expect(infoLegacy.permalink).toBe('https://x.com/news_channel/status/1760000000000000006');
    expect(infoLegacy.permalink).not.toContain('twitter.com');
    expect(infoLegacy.permalink).not.toContain('?s=20');
    expect(infoLegacy.permalink).not.toContain('#media');

    expect(infoModern.tweetId).toBe('1760000000000000007');
    expect(infoModern.permalink).toBe('https://x.com/modern_feed/status/1760000000000000007');
    expect(infoModern.permalink).not.toContain('ref_src');
  });

  // Scenario 7: Invalid or undetermined tweet ID (incomplete DOM handling)
  it('Scenario 7: Incomplete DOM returns null fields and defers mounting until status anchor is hydrated', async () => {
    const incompleteTweet = createTweetFixture({
      tweetId: '1770000000000000007',
      incompleteHeader: true, // Header lacks <time> or status anchor
    });
    root.appendChild(incompleteTweet);

    const video = incompleteTweet.querySelector('video');
    const onDetected = vi.fn();
    const obs = createVideoObserver({
      root,
      stateStore,
      onVideoDetected: onDetected,
    });

    obs.start();
    expect(onDetected).not.toHaveBeenCalled();
    expect(video.dataset.xvtMounted).toBeUndefined();

    // Now simulate React hydrating the header
    const permalinkAnchor = document.createElement('a');
    permalinkAnchor.href = 'https://x.com/hydrated_user/status/1770000000000000007';
    const timeEl = document.createElement('time');
    timeEl.textContent = 'just now';
    permalinkAnchor.appendChild(timeEl);
    incompleteTweet.querySelector('.tweet-header').appendChild(permalinkAnchor);

    // Trigger observer scan
    obs.scan();
    expect(onDetected).toHaveBeenCalledTimes(1);
    expect(onDetected.mock.calls[0][1].tweetId).toBe('1770000000000000007');
    expect(video.dataset.xvtMounted).toBe('true');

    obs.stop();
  });

  // Scenario 8: Video added to DOM dynamically after page load
  it('Scenario 8: Video added to DOM dynamically after page load is detected via MutationObserver', async () => {
    const onDetected = vi.fn();
    const obs = createVideoObserver({
      root,
      stateStore,
      onVideoDetected: onDetected,
    });

    obs.start();
    expect(onDetected).not.toHaveBeenCalled();

    // Insert tweet dynamically
    const tweet = createTweetFixture({ tweetId: '1780000000000000008', username: 'dynamic_poster' });
    root.appendChild(tweet);

    await flushMutations();

    expect(onDetected).toHaveBeenCalledTimes(1);
    expect(onDetected.mock.calls[0][1].tweetId).toBe('1780000000000000008');
    const video = tweet.querySelector('video');
    expect(video.dataset.xvtMounted).toBe('true');

    obs.stop();
  });

  // Scenario 9: Infinite scrolling adding successive tweet chunks
  it('Scenario 9: Infinite scrolling adding successive tweet chunks detects new videos without duplicating earlier ones', async () => {
    const onDetected = vi.fn();
    const obs = createVideoObserver({
      root,
      stateStore,
      onVideoDetected: onDetected,
    });

    obs.start();

    // Chunk 1: 2 tweets with videos
    root.appendChild(createTweetFixture({ tweetId: '1790000000000000001' }));
    root.appendChild(createTweetFixture({ tweetId: '1790000000000000002' }));
    await flushMutations();

    expect(onDetected).toHaveBeenCalledTimes(2);

    // Chunk 2: 2 more tweets with videos
    root.appendChild(createTweetFixture({ tweetId: '1790000000000000003' }));
    root.appendChild(createTweetFixture({ tweetId: '1790000000000000004' }));
    await flushMutations();

    expect(onDetected).toHaveBeenCalledTimes(4);

    const detectedIds = onDetected.mock.calls.map((call) => call[1].tweetId);
    expect(detectedIds).toEqual([
      '1790000000000000001',
      '1790000000000000002',
      '1790000000000000003',
      '1790000000000000004',
    ]);
    expect(new Set(detectedIds).size).toBe(4);

    obs.stop();
  });

  // Scenario 10: X re-render replacing <video> with fresh DOM element (resilience)
  it('Scenario 10: X re-render replacing <video> with fresh DOM element preserves dismissed state via session key', async () => {
    const tweet = createTweetFixture({ tweetId: '1800000000000000010' });
    root.appendChild(tweet);

    const oldVideo = tweet.querySelector('video');
    const key = getVideoKey('1800000000000000010', null);

    // User dismisses old video element
    stateStore.dismiss(key, oldVideo);
    expect(stateStore.isDismissed(key, oldVideo)).toBe(true);

    // Simulate React recycling DOM node upon scroll back into viewport:
    // Old video element is removed, fresh new video element is mounted for the same tweet
    const videoWrapper = oldVideo.parentElement;
    oldVideo.remove();

    const newVideo = document.createElement('video');
    newVideo.src = 'blob:https://x.com/fresh-video-instance';
    videoWrapper.appendChild(newVideo);

    const onDetected = vi.fn();
    const obs = createVideoObserver({
      root,
      stateStore,
      onVideoDetected: onDetected,
    });

    obs.start();
    await flushMutations();

    // New video element must NOT be detected or mounted because key was dismissed in session
    expect(onDetected).not.toHaveBeenCalled();
    expect(stateStore.isDismissed(key, newVideo)).toBe(true);
    expect(newVideo.dataset.xvtDismissed).toBe('true');

    obs.stop();
  });

  // Scenario 11: Multiple videos coexisting simultaneously
  it('Scenario 11: Multiple videos coexisting simultaneously maintain isolated states and metadata', () => {
    const tweet1 = createTweetFixture({ tweetId: '1810000000000000011' });
    const tweet2 = createTweetFixture({ tweetId: '1810000000000000012' });
    const tweet3 = createTweetFixture({ tweetId: '1810000000000000013' });
    root.appendChild(tweet1);
    root.appendChild(tweet2);
    root.appendChild(tweet3);

    const v1 = tweet1.querySelector('video');
    const v2 = tweet2.querySelector('video');
    const v3 = tweet3.querySelector('video');

    stateStore.markMounted(v1, '1810000000000000011_media_null');
    stateStore.markMounted(v2, '1810000000000000012_media_null');
    stateStore.markMounted(v3, '1810000000000000013_media_null');

    stateStore.setPerVideoData(v1, { bitrate: 2000 });
    stateStore.setPerVideoData(v2, { bitrate: 4000 });
    stateStore.setPerVideoData(v3, { bitrate: 8000 });

    expect(stateStore.getPerVideoData(v1).bitrate).toBe(2000);
    expect(stateStore.getPerVideoData(v2).bitrate).toBe(4000);
    expect(stateStore.getPerVideoData(v3).bitrate).toBe(8000);

    // Dismiss v1
    stateStore.dismiss('1810000000000000011_media_null', v1);
    expect(stateStore.isDismissed('1810000000000000011_media_null', v1)).toBe(true);
    expect(stateStore.isDismissed('1810000000000000012_media_null', v2)).toBe(false);
    expect(stateStore.isDismissed('1810000000000000013_media_null', v3)).toBe(false);
  });

  // Scenario 12: Dismissing one video does not affect other videos
  it('Scenario 12: Dismissing one video does not affect other videos in same session', () => {
    const tweetA = createTweetFixture({ tweetId: '1820000000000000001' });
    const tweetB = createTweetFixture({ tweetId: '1820000000000000002' });
    root.appendChild(tweetA);
    root.appendChild(tweetB);

    const vA = tweetA.querySelector('video');
    const vB = tweetB.querySelector('video');

    const keyA = getVideoKey('1820000000000000001', null);
    const keyB = getVideoKey('1820000000000000002', null);

    stateStore.dismiss(keyA, vA);

    expect(stateStore.isDismissed(keyA, vA)).toBe(true);
    expect(vA.dataset.xvtDismissed).toBe('true');

    expect(stateStore.isDismissed(keyB, vB)).toBe(false);
    expect(vB.dataset.xvtDismissed).toBeUndefined();
  });

  // Scenario 13: MutationObserver does not create duplicate registrations on restart
  it('Scenario 13: MutationObserver does not create duplicate registrations on repeated start() calls', async () => {
    const onDetected = vi.fn();
    const obs = createVideoObserver({
      root,
      stateStore,
      onVideoDetected: onDetected,
    });

    obs.start();
    obs.start(); // Redundant start call
    obs.start(); // Redundant start call

    root.appendChild(createTweetFixture({ tweetId: '1830000000000000013' }));
    await flushMutations();

    expect(onDetected).toHaveBeenCalledTimes(1);

    obs.stop();

    root.appendChild(createTweetFixture({ tweetId: '1830000000000000014' }));
    await flushMutations();

    expect(onDetected).toHaveBeenCalledTimes(1); // No new call while stopped

    obs.start();
    root.appendChild(createTweetFixture({ tweetId: '1830000000000000015' }));
    await flushMutations();

    expect(onDetected).toHaveBeenCalledTimes(3); // 1 initial + 1 from stopped scan + 1 dynamic
    obs.stop();
  });

  // Scenario 14: Dismissed video does not reappear in the session upon subsequent DOM mutations
  it('Scenario 14: Dismissed video does not reappear in session upon subsequent DOM mutations', async () => {
    const tweet = createTweetFixture({ tweetId: '1840000000000000014' });
    root.appendChild(tweet);

    const video = tweet.querySelector('video');
    const key = getVideoKey('1840000000000000014', null);

    const onDetected = vi.fn();
    const obs = createVideoObserver({
      root,
      stateStore,
      onVideoDetected: onDetected,
    });

    obs.start();
    expect(onDetected).toHaveBeenCalledTimes(1);

    // User dismisses the video
    stateStore.dismiss(key, video);
    expect(stateStore.isDismissed(key, video)).toBe(true);

    onDetected.mockClear();

    // Perform multiple subsequent DOM mutations on the tweet article
    tweet.classList.add('hover-effect');
    tweet.setAttribute('aria-expanded', 'true');
    tweet.appendChild(document.createElement('span'));
    tweet.appendChild(document.createElement('div'));

    await flushMutations();

    // Verify onDetected is NOT re-triggered
    expect(onDetected).not.toHaveBeenCalled();
    expect(stateStore.isDismissed(key, video)).toBe(true);

    obs.stop();
  });
});
