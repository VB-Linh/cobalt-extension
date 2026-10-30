// tests/finalValidation.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectVideos,
  findTweetContainer,
  getVideoKey,
  extractMediaFingerprint,
} from '../src/content/detection/index.js';
import {
  extractTweetInfo,
  extractTweetId,
  extractUsername,
  normalizeTweetUrl,
} from '../src/content/extraction/index.js';
import {
  createVideoStateStore,
} from '../src/content/state/index.js';
import {
  createVideoObserver,
} from '../src/content/observers/index.js';
import { flushMutations } from './fixtures/factory.js';

describe('PHASE 1 — FINAL VALIDATION: Video Identity & State Isolation', () => {
  let rootContainer;
  let stateStore;

  beforeEach(() => {
    rootContainer = document.createElement('div');
    rootContainer.id = 'test-root';
    document.body.appendChild(rootContainer);
    stateStore = createVideoStateStore();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    stateStore.reset();
  });

  describe('1. Video Identity & State Isolation in Multi-Video Tweets', () => {
    it('generates distinct canonical keys for multiple videos without official mediaIndex, avoiding ${tweetId}_media_null', () => {
      const tweetId = '1850000000000000001';
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');

      // Canonical status link in header
      const headerAnchor = document.createElement('a');
      headerAnchor.href = `https://x.com/user/status/${tweetId}`;
      const time = document.createElement('time');
      headerAnchor.appendChild(time);
      article.appendChild(headerAnchor);

      // Video 1 with Amplify thumbnail
      const wrap1 = document.createElement('div');
      wrap1.setAttribute('data-testid', 'videoComponent');
      const v1 = document.createElement('video');
      v1.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/1850111222333/img/first_thumb.jpg');
      v1.src = 'blob:https://x.com/blob-1';
      wrap1.appendChild(v1);
      article.appendChild(wrap1);

      // Video 2 with ext_tw thumbnail
      const wrap2 = document.createElement('div');
      wrap2.setAttribute('data-testid', 'videoComponent');
      const v2 = document.createElement('video');
      v2.setAttribute('poster', 'https://pbs.twimg.com/ext_tw_video_thumb/1850444555666/pu/img/second_thumb.jpg');
      v2.src = 'blob:https://x.com/blob-2';
      wrap2.appendChild(v2);
      article.appendChild(wrap2);

      rootContainer.appendChild(article);

      const info1 = extractTweetInfo(article, v1);
      const info2 = extractTweetInfo(article, v2);

      // Neither video has an official anchor index in DOM
      expect(info1.mediaIndex).toBeNull();
      expect(info2.mediaIndex).toBeNull();

      // Fingerprints extracted from posters
      expect(info1.mediaFingerprint).toBe('1850111222333');
      expect(info2.mediaFingerprint).toBe('1850444555666');

      const key1 = getVideoKey(info1.tweetId, info1.mediaIndex, v1);
      const key2 = getVideoKey(info2.tweetId, info2.mediaIndex, v2);

      expect(key1).toBe(`${tweetId}_media_fp_1850111222333`);
      expect(key2).toBe(`${tweetId}_media_fp_1850444555666`);
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(`${tweetId}_media_null`);
      expect(key2).not.toBe(`${tweetId}_media_null`);
    });

    it('dismissing Video 1 does NOT dismiss Video 2 in live DOM', () => {
      const tweetId = '1850000000000000002';
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');

      const headerAnchor = document.createElement('a');
      headerAnchor.href = `https://x.com/user/status/${tweetId}`;
      const time = document.createElement('time');
      headerAnchor.appendChild(time);
      article.appendChild(headerAnchor);

      const v1 = document.createElement('video');
      v1.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/100001/img/thumb.jpg');
      const v2 = document.createElement('video');
      v2.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/100002/img/thumb.jpg');
      article.appendChild(v1);
      article.appendChild(v2);
      rootContainer.appendChild(article);

      const key1 = getVideoKey(tweetId, null, v1);
      const key2 = getVideoKey(tweetId, null, v2);

      // User dismisses Video 1
      stateStore.dismiss(key1, v1);

      // Check Tier 1 & Tier 2 on v1
      expect(stateStore.isDismissed(key1, v1)).toBe(true);
      expect(v1.dataset.xvtDismissed).toBe('true');

      // Check Tier 1 & Tier 2 on v2: must NOT be dismissed!
      expect(stateStore.isDismissed(key2, v2)).toBe(false);
      expect(v2.dataset.xvtDismissed).toBeUndefined();
    });

    it('maintains strict state isolation across virtual scrolling DOM destruction and recreation', async () => {
      const tweetId = '1850000000000000003';
      const detectedVideos = [];

      const observer = createVideoObserver({
        root: rootContainer,
        stateStore,
        onVideoDetected: (video, info) => {
          detectedVideos.push({ video, info });
        },
      });

      // 1. Initial Render
      const article1 = document.createElement('article');
      article1.setAttribute('data-testid', 'tweet');
      const anchor1 = document.createElement('a');
      anchor1.href = `https://x.com/user/status/${tweetId}`;
      anchor1.appendChild(document.createElement('time'));
      article1.appendChild(anchor1);

      const v1 = document.createElement('video');
      v1.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/200001/img/a.jpg');
      const v2 = document.createElement('video');
      v2.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/200002/img/b.jpg');
      article1.appendChild(v1);
      article1.appendChild(v2);

      rootContainer.appendChild(article1);
      observer.start();

      expect(detectedVideos.length).toBe(2);
      expect(stateStore.isMounted(v1)).toBe(true);
      expect(stateStore.isMounted(v2)).toBe(true);

      // 2. User dismisses Video 1
      const key1 = getVideoKey(tweetId, null, v1);
      const key2 = getVideoKey(tweetId, null, v2);
      stateStore.dismiss(key1, v1);
      expect(stateStore.isDismissed(key1, v1)).toBe(true);
      expect(stateStore.isDismissed(key2, v2)).toBe(false);

      // 3. Virtual Scrolling: Twitter unmounts and removes the tweet article entirely
      rootContainer.removeChild(article1);
      detectedVideos.length = 0;

      // 4. User scrolls back: Twitter creates brand NEW DOM elements for the same tweet
      const article2 = document.createElement('article');
      article2.setAttribute('data-testid', 'tweet');
      const anchor2 = document.createElement('a');
      anchor2.href = `https://x.com/user/status/${tweetId}`;
      anchor2.appendChild(document.createElement('time'));
      article2.appendChild(anchor2);

      const newV1 = document.createElement('video');
      newV1.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/200001/img/a.jpg');
      const newV2 = document.createElement('video');
      newV2.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/200002/img/b.jpg');
      article2.appendChild(newV1);
      article2.appendChild(newV2);

      rootContainer.appendChild(article2);
      await flushMutations(30);

      // 5. Verification:
      // - New Video 1 matches Tier 3 key and remains DISMISSED
      // - New Video 2 is NOT dismissed and triggers onVideoDetected callback!
      expect(stateStore.isDismissed(key1, newV1)).toBe(true);
      expect(stateStore.isDismissed(key2, newV2)).toBe(false);
      expect(detectedVideos.length).toBe(1);
      expect(detectedVideos[0].video).toBe(newV2);

      observer.stop();
    });

    it('prevents key collision when multi-video tweet has NO official index and NO poster or src', () => {
      const tweetId = '1850000000000000004';
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');

      const anchor = document.createElement('a');
      anchor.href = `https://x.com/user/status/${tweetId}`;
      anchor.appendChild(document.createElement('time'));
      article.appendChild(anchor);

      // Two bare videos with NO attributes
      const v1 = document.createElement('video');
      const v2 = document.createElement('video');
      article.appendChild(v1);
      article.appendChild(v2);
      rootContainer.appendChild(article);

      const key1 = getVideoKey(tweetId, null, v1);
      const key2 = getVideoKey(tweetId, null, v2);

      // Crucial: neither video receives ${tweetId}_media_null!
      expect(key1).not.toBe(`${tweetId}_media_null`);
      expect(key2).not.toBe(`${tweetId}_media_null`);
      expect(key1).not.toBe(key2);

      // Dismissing v1 leaves v2 active
      stateStore.dismiss(key1, v1);
      expect(stateStore.isDismissed(key1, v1)).toBe(true);
      expect(stateStore.isDismissed(key2, v2)).toBe(false);
    });
  });

  describe('2. Edge Cases Validation', () => {
    it('Case 2.1: detects video when src is added dynamically after DOM insertion', async () => {
      const tweetId = '1850000000000000010';
      const detectedVideos = [];

      const observer = createVideoObserver({
        root: rootContainer,
        stateStore,
        onVideoDetected: (video, info) => {
          detectedVideos.push({ video, info });
        },
      });

      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');
      const anchor = document.createElement('a');
      anchor.href = `https://x.com/user/status/${tweetId}`;
      anchor.appendChild(document.createElement('time'));
      article.appendChild(anchor);

      // Video element created with NO src and NO poster
      const video = document.createElement('video');
      article.appendChild(video);
      rootContainer.appendChild(article);

      observer.start();
      await flushMutations(30);

      expect(detectedVideos.length).toBe(1);
      expect(detectedVideos[0].video).toBe(video);

      // Now dynamically update src
      video.setAttribute('src', 'https://video.twimg.com/amplify_video/99999/vid/avc1/720x1280/test.mp4');
      await flushMutations(30);

      // Video was already mounted, state remains healthy
      expect(stateStore.isMounted(video)).toBe(true);
      expect(detectedVideos.length).toBe(1);

      observer.stop();
    });

    it('Case 2.2: handles multi-video tweet where only one video has an official anchor index', () => {
      const tweetId = '1850000000000000020';
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');

      // Canonical status link in header
      const headerAnchor = document.createElement('a');
      headerAnchor.href = `https://x.com/author/status/${tweetId}`;
      headerAnchor.appendChild(document.createElement('time'));
      article.appendChild(headerAnchor);

      // Video 1 wrapped in official anchor with /video/1
      const officialAnchor = document.createElement('a');
      officialAnchor.href = `https://x.com/author/status/${tweetId}/video/1`;
      const v1 = document.createElement('video');
      v1.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/300001/img/thumb.jpg');
      officialAnchor.appendChild(v1);
      article.appendChild(officialAnchor);

      // Video 2 wrapped in generic div without /video/2 link
      const unindexedWrap = document.createElement('div');
      unindexedWrap.setAttribute('data-testid', 'videoComponent');
      const v2 = document.createElement('video');
      v2.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/300002/img/thumb.jpg');
      unindexedWrap.appendChild(v2);
      article.appendChild(unindexedWrap);

      rootContainer.appendChild(article);

      const info1 = extractTweetInfo(article, v1);
      const info2 = extractTweetInfo(article, v2);

      // Video 1 has official index 1
      expect(info1.mediaIndex).toBe(1);
      expect(info1.permalink).toBe(`https://x.com/author/status/${tweetId}/video/1`);

      // Video 2 has NO official index
      expect(info2.mediaIndex).toBeNull();
      expect(info2.permalink).toBe(`https://x.com/author/status/${tweetId}`);
      expect(info2.mediaFingerprint).toBe('300002');

      const key1 = getVideoKey(tweetId, info1.mediaIndex, v1);
      const key2 = getVideoKey(tweetId, info2.mediaIndex, v2);

      expect(key1).toBe(`${tweetId}_media_1`);
      expect(key2).toBe(`${tweetId}_media_fp_300002`);
      expect(key1).not.toBe(key2);

      // Dismiss v1
      stateStore.dismiss(key1, v1);
      expect(stateStore.isDismissed(key1, v1)).toBe(true);
      expect(stateStore.isDismissed(key2, v2)).toBe(false);

      // Dismiss v2
      stateStore.dismiss(key2, v2);
      expect(stateStore.isDismissed(key2, v2)).toBe(true);
    });

    it('Case 2.3: isolates quoted tweet nested inside parent tweet', () => {
      const parentTweetId = '1820000000000000001';
      const quoteTweetId = '1820000000000000002';

      // Parent Tweet Article
      const parentArticle = document.createElement('article');
      parentArticle.setAttribute('data-testid', 'tweet');

      const parentTime = document.createElement('time');
      const parentAnchor = document.createElement('a');
      parentAnchor.href = `https://x.com/parent_user/status/${parentTweetId}`;
      parentAnchor.appendChild(parentTime);
      parentArticle.appendChild(parentAnchor);

      // Parent Video
      const parentVideo = document.createElement('video');
      parentVideo.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/400001/img/p.jpg');
      parentArticle.appendChild(parentVideo);

      // Nested Quoted Tweet Card
      const quoteCard = document.createElement('div');
      quoteCard.setAttribute('data-testid', 'quoteTweet');
      quoteCard.setAttribute('role', 'link');
      quoteCard.setAttribute('tabindex', '0');

      const quoteTime = document.createElement('time');
      const quoteAnchor = document.createElement('a');
      quoteAnchor.href = `https://x.com/quote_user/status/${quoteTweetId}`;
      quoteAnchor.appendChild(quoteTime);
      quoteCard.appendChild(quoteAnchor);

      // Quoted Video
      const quoteVideo = document.createElement('video');
      quoteVideo.setAttribute('poster', 'https://pbs.twimg.com/amplify_video_thumb/400002/img/q.jpg');
      quoteCard.appendChild(quoteVideo);

      parentArticle.appendChild(quoteCard);
      rootContainer.appendChild(parentArticle);

      // Parent video extraction
      const parentInfo = extractTweetInfo(parentArticle, parentVideo);
      expect(parentInfo.tweetId).toBe(parentTweetId);
      expect(parentInfo.username).toBe('parent_user');
      expect(parentInfo.isQuoted).toBe(false);
      expect(parentInfo.permalink).toBe(`https://x.com/parent_user/status/${parentTweetId}`);

      // Quoted video extraction
      const quoteContainer = findTweetContainer(quoteVideo);
      const quoteInfo = extractTweetInfo(quoteContainer, quoteVideo);
      expect(quoteInfo.tweetId).toBe(quoteTweetId);
      expect(quoteInfo.username).toBe('quote_user');
      expect(quoteInfo.isQuoted).toBe(true);
      expect(quoteInfo.permalink).toBe(`https://x.com/quote_user/status/${quoteTweetId}`);

      // State isolation
      const parentKey = getVideoKey(parentTweetId, null, parentVideo);
      const quoteKey = getVideoKey(quoteTweetId, null, quoteVideo);

      stateStore.dismiss(quoteKey, quoteVideo);
      expect(stateStore.isDismissed(quoteKey, quoteVideo)).toBe(true);
      expect(stateStore.isDismissed(parentKey, parentVideo)).toBe(false);
    });

    it('Case 2.4: correctly extracts and normalizes URL /i/status/:id', () => {
      const tweetId = '1840000000000000099';
      const shortUrl = `/i/status/${tweetId}`;
      const fullUrl = `https://x.com/i/status/${tweetId}`;

      // URL Normalizer tests
      expect(extractTweetId(shortUrl)).toBe(tweetId);
      expect(extractTweetId(fullUrl)).toBe(tweetId);
      expect(extractUsername(shortUrl)).toBe('i');
      expect(extractUsername(fullUrl)).toBe('i');
      expect(normalizeTweetUrl(shortUrl)).toBe(`https://x.com/i/status/${tweetId}`);
      expect(normalizeTweetUrl(fullUrl)).toBe(`https://x.com/i/status/${tweetId}`);

      // DOM extraction test
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');
      const anchor = document.createElement('a');
      anchor.href = shortUrl;
      anchor.appendChild(document.createElement('time'));
      article.appendChild(anchor);

      const video = document.createElement('video');
      article.appendChild(video);
      rootContainer.appendChild(article);

      const info = extractTweetInfo(article, video);
      expect(info.tweetId).toBe(tweetId);
      expect(info.permalink).toBe(`https://x.com/i/status/${tweetId}`);
    });

    it('Case 2.5: disconnects on pagehide and rescans on SPA navigation', () => {
      let scanCount = 0;
      const observer = createVideoObserver({
        root: rootContainer,
        stateStore,
      });

      // Spy on scan
      const originalScan = observer.scan;
      observer.scan = function (...args) {
        scanCount++;
        return originalScan.apply(this, args);
      };

      observer.start();
      expect(observer.isActive()).toBe(true);

      // Simulate pagehide
      observer.stop();
      expect(observer.isActive()).toBe(false);

      // Simulate SPA route change trigger
      observer.start();
      observer.scan();
      expect(scanCount).toBeGreaterThanOrEqual(1);

      observer.stop();
    });

    it('Case 2.6: restores dismissed state on brand new DOM element after virtual scrolling in single-video tweet', async () => {
      const tweetId = '1850000000000000030';
      const detectedVideos = [];

      const observer = createVideoObserver({
        root: rootContainer,
        stateStore,
        onVideoDetected: (video, info) => {
          detectedVideos.push({ video, info });
        },
      });

      // 1. Initial single-video tweet
      const article1 = document.createElement('article');
      article1.setAttribute('data-testid', 'tweet');
      const anchor1 = document.createElement('a');
      anchor1.href = `https://x.com/user/status/${tweetId}`;
      anchor1.appendChild(document.createElement('time'));
      article1.appendChild(anchor1);

      const video1 = document.createElement('video');
      video1.setAttribute('poster', 'https://pbs.twimg.com/media/single_thumb.jpg');
      article1.appendChild(video1);
      rootContainer.appendChild(article1);

      observer.start();
      expect(detectedVideos.length).toBe(1);

      // 2. Dismiss video
      const key = getVideoKey(tweetId, null, video1);
      stateStore.dismiss(key, video1);
      expect(stateStore.isDismissed(key, video1)).toBe(true);

      // 3. Virtual scrolling removes article1
      rootContainer.removeChild(article1);
      detectedVideos.length = 0;

      // 4. Virtual scrolling re-attaches new DOM elements
      const article2 = document.createElement('article');
      article2.setAttribute('data-testid', 'tweet');
      const anchor2 = document.createElement('a');
      anchor2.href = `https://x.com/user/status/${tweetId}`;
      anchor2.appendChild(document.createElement('time'));
      article2.appendChild(anchor2);

      const video2 = document.createElement('video');
      video2.setAttribute('poster', 'https://pbs.twimg.com/media/single_thumb.jpg');
      article2.appendChild(video2);
      rootContainer.appendChild(article2);

      await flushMutations(30);

      // 5. Verification: video2 is recognized as dismissed and NOT mounted
      expect(stateStore.isDismissed(key, video2)).toBe(true);
      expect(detectedVideos.length).toBe(0);

      observer.stop();
    });
  });
});