// tests/adversarial.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  extractTweetId,
  extractMediaIndex,
  extractUsername,
  normalizeTweetUrl,
  isValidTweetId,
} from '../src/content/extraction/urlNormalizer.js';
import {
  isExcludedContext,
  findQuotedTweetContainer,
  isQuotedTweet,
  findTweetContainer,
} from '../src/content/detection/tweetFinder.js';
import {
  isEligibleVideo,
  detectVideos,
  getVideoKey,
} from '../src/content/detection/videoDetector.js';
import { extractTweetInfo } from '../src/content/extraction/permalinkExtractor.js';
import { createVideoStateStore } from '../src/content/state/videoState.js';
import { createVideoObserver } from '../src/content/observers/videoObserver.js';
import { flushMutations } from './fixtures/factory.js';

describe('Adversarial & Stress Challenge Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // =========================================================================
  // Section 1: Malformed & Pathological URLs
  // =========================================================================
  describe('Adversarial URL Normalization & ID Extraction', () => {
    it('handles URLs without username or /i/status/ fallback', () => {
      expect(extractTweetId('https://x.com/status/1234567890')).toBe('1234567890');
      expect(extractTweetId('/status/1234567890')).toBe('1234567890');
      expect(extractTweetId('https://x.com/i/status/1234567890')).toBe('1234567890');

      expect(normalizeTweetUrl('https://x.com/status/1234567890')).toBe('https://x.com/i/status/1234567890');
      expect(normalizeTweetUrl('/status/1234567890')).toBe('https://x.com/i/status/1234567890');
    });

    it('handles trailing slashes, repeated slashes, and whitespace', () => {
      expect(extractTweetId('https://x.com/user/status/1234567890/')).toBe('1234567890');
      expect(extractTweetId('https://x.com/user/status/1234567890///')).toBe('1234567890');
      expect(normalizeTweetUrl('https://x.com/user/status/1234567890/')).toBe('https://x.com/user/status/1234567890');
    });

    it('handles complex query strings with redirects, nested status paths, and fragments', () => {
      const oddUrl1 = 'https://x.com/target/status/1111111111?return_to=%2Fother%2Fstatus%2F9999999999&s=21#frag';
      expect(extractTweetId(oddUrl1)).toBe('1111111111');
      expect(extractUsername(oddUrl1)).toBe('target');
      expect(normalizeTweetUrl(oddUrl1)).toBe('https://x.com/target/status/1111111111');

      const oddUrl2 = 'https://x.com/user/status/2222222222?redirect=/status/8888888888';
      expect(extractTweetId(oddUrl2)).toBe('2222222222');
      expect(normalizeTweetUrl(oddUrl2)).toBe('https://x.com/user/status/2222222222');
    });

    it('handles Unicode usernames and unusual characters', () => {
      const unicodeUrl = 'https://x.com/user_日本語_123/status/3333333333';
      expect(extractTweetId(unicodeUrl)).toBe('3333333333');
      expect(extractUsername(unicodeUrl)).toBe('user_日本語_123');
      expect(normalizeTweetUrl(unicodeUrl)).toBe('https://x.com/user_日本語_123/status/3333333333');

      const accentUrl = 'https://x.com/nguyễn_văn_a/status/4444444444';
      expect(extractTweetId(accentUrl)).toBe('4444444444');
      expect(extractUsername(accentUrl)).toBe('nguyễn_văn_a');
      expect(normalizeTweetUrl(accentUrl)).toBe('https://x.com/nguyễn_văn_a/status/4444444444');
    });

    it('rejects completely non-numeric or malformed status segments', () => {
      expect(extractTweetId('https://x.com/user/status/')).toBeNull();
      expect(extractTweetId('https://x.com/user/status/abc')).toBeNull();
      expect(extractTweetId('https://x.com/user/status/-12345')).toBeNull();
      expect(extractTweetId('https://x.com/user/status/undefined')).toBeNull();
      expect(extractTweetId('https://x.com/user/status/null')).toBeNull();
      expect(extractTweetId('https://x.com/user/status/NaN')).toBeNull();

      expect(isValidTweetId('abc')).toBe(false);
      expect(isValidTweetId('12345a')).toBe(false);
      expect(isValidTweetId('a12345')).toBe(false);
      expect(isValidTweetId('-12345')).toBe(false);
      expect(isValidTweetId('12345 67890')).toBe(false);
      expect(isValidTweetId('12345\n')).toBe(false);
      expect(isValidTweetId('1234567890123456789')).toBe(true);
    });

    it('handles non-string and falsy types safely without throwing', () => {
      expect(extractTweetId(null)).toBeNull();
      expect(extractTweetId(undefined)).toBeNull();
      expect(extractTweetId(12345)).toBeNull();
      expect(extractTweetId({})).toBeNull();
      expect(extractTweetId([])).toBeNull();

      expect(extractMediaIndex(null)).toBeNull();
      expect(extractMediaIndex(undefined)).toBeNull();
      expect(extractMediaIndex(12345)).toBeNull();

      expect(extractUsername(null)).toBeNull();
      expect(extractUsername(undefined)).toBeNull();
      expect(extractUsername(true)).toBeNull();

      expect(normalizeTweetUrl(null)).toBeNull();
      expect(normalizeTweetUrl(undefined)).toBeNull();
      expect(normalizeTweetUrl('')).toBeNull();
      expect(normalizeTweetUrl({})).toBeNull();
    });
  });

  // =========================================================================
  // Section 2: Media Index Trickery & Zero-Guesswork Rigor
  // =========================================================================
  describe('Media Index Trickery & Zero-Guesswork Rigor', () => {
    it('strictly returns null for /video/0, negative indices, non-digit indices, and empty index', () => {
      expect(extractMediaIndex('https://x.com/user/status/123/video/0')).toBeNull();
      expect(extractMediaIndex('https://x.com/user/status/123/video/-1')).toBeNull();
      expect(extractMediaIndex('https://x.com/user/status/123/video/abc')).toBeNull();
      expect(extractMediaIndex('https://x.com/user/status/123/video/')).toBeNull();
      expect(extractMediaIndex('https://x.com/user/status/123/photo/0')).toBeNull();
      expect(extractMediaIndex('https://x.com/user/status/123/photo/-2')).toBeNull();
      expect(extractMediaIndex('https://x.com/user/status/123/photo/xyz')).toBeNull();
    });

    it('extracts index from both /video/:index and /photo/:index correctly', () => {
      expect(extractMediaIndex('https://x.com/user/status/123/video/1')).toBe(1);
      expect(extractMediaIndex('https://x.com/user/status/123/video/2')).toBe(2);
      expect(extractMediaIndex('https://x.com/user/status/123/photo/1')).toBe(1);
      expect(extractMediaIndex('https://x.com/user/status/123/photo/3')).toBe(3);
    });

    it('normalizer with options.mediaIndex = 0 or null does NOT append /video/0', () => {
      const normNull = normalizeTweetUrl('https://x.com/user/status/123', { mediaIndex: null });
      expect(normNull).toBe('https://x.com/user/status/123');

      const normZero = normalizeTweetUrl('https://x.com/user/status/123', { mediaIndex: 0 });
      expect(normZero).toBe('https://x.com/user/status/123');

      const normNeg = normalizeTweetUrl('https://x.com/user/status/123', { mediaIndex: -1 });
      expect(normNeg).toBe('https://x.com/user/status/123');

      const normInvalid = normalizeTweetUrl('https://x.com/user/status/123', { mediaIndex: 'abc' });
      expect(normInvalid).toBe('https://x.com/user/status/123');
    });

    it('NEVER synthesizes media index when video element is NOT wrapped in official media anchor', () => {
      // Create a tweet with 3 videos where NONE are wrapped in an official anchor
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');
      article.innerHTML = `
        <div class="header">
          <a href="https://x.com/testuser/status/987654321"><time>1m</time></a>
        </div>
        <div class="video-grid">
          <div class="vid-wrap-1"><video id="v1"></video></div>
          <div class="vid-wrap-2"><video id="v2"></video></div>
          <div class="vid-wrap-3"><video id="v3"></video></div>
        </div>
      `;
      document.body.appendChild(article);

      const v1 = article.querySelector('#v1');
      const v2 = article.querySelector('#v2');
      const v3 = article.querySelector('#v3');

      const info1 = extractTweetInfo(article, v1);
      const info2 = extractTweetInfo(article, v2);
      const info3 = extractTweetInfo(article, v3);

      expect(info1.mediaIndex).toBeNull();
      expect(info2.mediaIndex).toBeNull();
      expect(info3.mediaIndex).toBeNull();

      expect(info1.permalink).toBe('https://x.com/testuser/status/987654321');
      expect(info2.permalink).toBe('https://x.com/testuser/status/987654321');
      expect(info3.permalink).toBe('https://x.com/testuser/status/987654321');
    });

    it('handles anchors that do NOT belong to the video element (e.g. sibling anchors or other tweet links)', () => {
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');
      article.innerHTML = `
        <div class="header">
          <a href="https://x.com/testuser/status/987654321"><time>1m</time></a>
        </div>
        <div class="media-container">
          <!-- Unrelated anchor nearby -->
          <a class="hashtag" href="/hashtag/breaking">#breaking</a>
          <a class="external" href="https://example.com/video/1">External link</a>
          <div class="player">
            <video id="target-video"></video>
          </div>
        </div>
      `;
      document.body.appendChild(article);

      const video = article.querySelector('#target-video');
      const info = extractTweetInfo(article, video);

      expect(info.tweetId).toBe('987654321');
      expect(info.mediaIndex).toBeNull();
      expect(info.permalink).toBe('https://x.com/testuser/status/987654321');
    });

    it('handles video wrapped inside /photo/1 anchor vs /video/2 anchor', () => {
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');
      article.innerHTML = `
        <div class="header">
          <a href="https://x.com/photovideo/status/5555555555"><time>2m</time></a>
        </div>
        <div class="media">
          <a href="https://x.com/photovideo/status/5555555555/photo/1">
            <video id="v-photo1"></video>
          </a>
          <a href="https://x.com/photovideo/status/5555555555/video/2">
            <video id="v-video2"></video>
          </a>
        </div>
      `;
      document.body.appendChild(article);

      const v1 = article.querySelector('#v-photo1');
      const v2 = article.querySelector('#v-video2');

      const info1 = extractTweetInfo(article, v1);
      const info2 = extractTweetInfo(article, v2);

      expect(info1.mediaIndex).toBe(1);
      expect(info1.permalink).toBe('https://x.com/photovideo/status/5555555555/video/1');

      expect(info2.mediaIndex).toBe(2);
      expect(info2.permalink).toBe('https://x.com/photovideo/status/5555555555/video/2');
    });
  });

  // =========================================================================
  // Section 3: Complex Nested DOMs & Quoted Tweet Hierarchy
  // =========================================================================
  describe('Complex Nested DOMs & Multi-Quoted Tweet Resolution', () => {
    it('resolves deepest quoted tweet in multi-quoted tweet (quote inside quote inside quote)', () => {
      // Structure:
      // Outer Article (id: 1000)
      //   -> Quote 1 (id: 2000)
      //     -> Deepest Quote 2 (id: 3000)
      //       -> <video id="deep-vid">
      const outerArticle = document.createElement('article');
      outerArticle.setAttribute('data-testid', 'tweet');
      outerArticle.innerHTML = `
        <div class="outer-header">
          <a href="https://x.com/outer_user/status/1000000000"><time>1h</time></a>
        </div>
        <div class="outer-content">
          <div data-testid="quoteTweet" role="link" tabindex="0" class="quote-level-1">
            <div class="quote-1-header">
              <a href="https://x.com/middle_user/status/2000000000"><time>2h</time></a>
            </div>
            <div class="quote-1-content">
              <div data-testid="quoteTweet" role="link" tabindex="0" class="quote-level-2">
                <div class="quote-2-header">
                  <a href="https://x.com/innermost_user/status/3000000000"><time>3h</time></a>
                </div>
                <div class="quote-2-content">
                  <video id="deep-vid"></video>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(outerArticle);

      const deepVid = outerArticle.querySelector('#deep-vid');
      const container = findTweetContainer(deepVid);

      expect(container).not.toBe(outerArticle);
      expect(container.classList.contains('quote-level-2')).toBe(true);

      const info = extractTweetInfo(container, deepVid);
      expect(info.isQuoted).toBe(true);
      expect(info.tweetId).toBe('3000000000');
      expect(info.username).toBe('innermost_user');
      expect(info.permalink).toBe('https://x.com/innermost_user/status/3000000000');
    });

    it('distinguishes outer video from quoted tweet video within the same parent article', () => {
      // Structure:
      // Article (id: 1111) has video #v-outer
      // AND embeds a quote tweet (id: 2222) which has video #v-quoted
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');
      article.innerHTML = `
        <div class="header">
          <a href="https://x.com/author/status/1111000000"><time>10m</time></a>
        </div>
        <div class="main-video-wrapper">
          <video id="v-outer"></video>
        </div>
        <div data-testid="quoteTweet" role="link" class="quote-box">
          <div class="quote-header">
            <a href="https://x.com/quoted_author/status/2222000000"><time>20m</time></a>
          </div>
          <div class="quoted-video-wrapper">
            <video id="v-quoted"></video>
          </div>
        </div>
      `;
      document.body.appendChild(article);

      const vOuter = article.querySelector('#v-outer');
      const vQuoted = article.querySelector('#v-quoted');

      const containerOuter = findTweetContainer(vOuter);
      expect(containerOuter).toBe(article);
      const infoOuter = extractTweetInfo(containerOuter, vOuter);
      expect(infoOuter.isQuoted).toBe(false);
      expect(infoOuter.tweetId).toBe('1111000000');
      expect(infoOuter.permalink).toBe('https://x.com/author/status/1111000000');

      const containerQuoted = findTweetContainer(vQuoted);
      expect(containerQuoted.getAttribute('data-testid')).toBe('quoteTweet');
      const infoQuoted = extractTweetInfo(containerQuoted, vQuoted);
      expect(infoQuoted.isQuoted).toBe(true);
      expect(infoQuoted.tweetId).toBe('2222000000');
      expect(infoQuoted.permalink).toBe('https://x.com/quoted_author/status/2222000000');
    });

    it('handles deeply nested wrappers (20+ div layers) between quote and video', () => {
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');

      const quote = document.createElement('div');
      quote.setAttribute('data-testid', 'quoteTweet');
      const quoteAnchor = document.createElement('a');
      quoteAnchor.href = 'https://x.com/deep_user/status/7777777777';
      const quoteTime = document.createElement('time');
      quoteTime.textContent = '5m';
      quoteAnchor.appendChild(quoteTime);
      quote.appendChild(quoteAnchor);

      // Create 20 nested divs
      let curr = quote;
      for (let i = 0; i < 20; i++) {
        const d = document.createElement('div');
        d.className = `wrapper-layer-${i}`;
        curr.appendChild(d);
        curr = d;
      }
      const video = document.createElement('video');
      curr.appendChild(video);

      article.appendChild(quote);
      document.body.appendChild(article);

      const container = findTweetContainer(video);
      expect(container).toBe(quote);

      const info = extractTweetInfo(container, video);
      expect(info.isQuoted).toBe(true);
      expect(info.tweetId).toBe('7777777777');
      expect(info.permalink).toBe('https://x.com/deep_user/status/7777777777');
    });

    it('handles conflicting <time> and status anchors (e.g. edit history, relative replies)', () => {
      // In X, an edited tweet might have multiple <time> elements or extra status links
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');
      article.innerHTML = `
        <div class="author-info">
          <a href="/someuser">Some User</a>
        </div>
        <div class="edit-badge">
          <span>Edited</span>
          <time datetime="2026-10-30T10:00:00Z">Oct 30</time> <!-- Edit time not wrapped in status <a> -->
        </div>
        <div class="canonical-header">
          <a href="https://x.com/someuser/status/8888888888" role="link">
            <time datetime="2026-10-30T09:00:00Z">9:00 AM</time>
          </a>
        </div>
        <div class="body">
          <video id="v-edited"></video>
        </div>
        <div class="footer-actions">
          <a href="https://x.com/someuser/status/8888888888/analytics">Analytics</a>
          <a href="https://x.com/someuser/status/8888888888/retweets">Retweets</a>
        </div>
      `;
      document.body.appendChild(article);

      const video = article.querySelector('#v-edited');
      const info = extractTweetInfo(article, video);

      expect(info.tweetId).toBe('8888888888');
      expect(info.permalink).toBe('https://x.com/someuser/status/8888888888');
    });

    it('rejects videos in excluded UI contexts (composer, sidebar, DMs)', () => {
      // 1. Composer
      const composer = document.createElement('div');
      composer.setAttribute('data-testid', 'tweetButtonInline');
      const vComp = document.createElement('video');
      composer.appendChild(vComp);
      document.body.appendChild(composer);

      expect(isExcludedContext(vComp)).toBe(true);
      expect(isEligibleVideo(vComp)).toBe(false);
      expect(findTweetContainer(vComp)).toBeNull();

      // 2. Sidebar
      const sidebar = document.createElement('aside');
      sidebar.setAttribute('data-testid', 'sidebarColumn');
      const vSide = document.createElement('video');
      sidebar.appendChild(vSide);
      document.body.appendChild(sidebar);

      expect(isExcludedContext(vSide)).toBe(true);
      expect(isEligibleVideo(vSide)).toBe(false);
      expect(findTweetContainer(vSide)).toBeNull();

      // 3. DM
      const dm = document.createElement('div');
      dm.setAttribute('data-testid', 'messageEntry');
      const vDm = document.createElement('video');
      dm.appendChild(vDm);
      document.body.appendChild(dm);

      expect(isExcludedContext(vDm)).toBe(true);
      expect(isEligibleVideo(vDm)).toBe(false);
      expect(findTweetContainer(vDm)).toBeNull();
    });
  });

  // =========================================================================
  // Section 4: Stress Harness & High Volume Invalidation
  // =========================================================================
  describe('High Volume & Rapid Mutation Stress Harness', () => {
    it('handles 50 dynamic video mutations in burst without dropping or duplicating detections', async () => {
      const stateStore = createVideoStateStore();
      const detected = [];

      const obs = createVideoObserver({
        root: document.body,
        stateStore,
        onVideoDetected: (video, info) => {
          detected.push({ video, info });
        },
      });

      obs.start();

      // Inject 50 tweets with videos in rapid succession
      const count = 50;
      for (let i = 0; i < count; i++) {
        const id = `90000000000000000${i.toString().padStart(2, '0')}`;
        const tweet = document.createElement('article');
        tweet.setAttribute('data-testid', 'tweet');
        tweet.innerHTML = `
          <a href="https://x.com/stress_user/status/${id}"><time>${i}s</time></a>
          <video id="stress-v-${i}"></video>
        `;
        document.body.appendChild(tweet);
      }

      await flushMutations(50);

      expect(detected).toHaveLength(count);
      const uniqueIds = new Set(detected.map((d) => d.info.tweetId));
      expect(uniqueIds.size).toBe(count);

      // Verify every video element was mounted
      for (let i = 0; i < count; i++) {
        const v = document.getElementById(`stress-v-${i}`);
        expect(v.dataset.xvtMounted).toBe('true');
      }

      obs.stop();
    });

    it('ensures dismissed state is strictly preserved across DOM replacement of 20 elements', async () => {
      const stateStore = createVideoStateStore();

      // Setup 20 tweets
      for (let i = 0; i < 20; i++) {
        const id = `91000000000000000${i.toString().padStart(2, '0')}`;
        const tweet = document.createElement('article');
        tweet.id = `tweet-${i}`;
        tweet.setAttribute('data-testid', 'tweet');
        tweet.innerHTML = `
          <a href="https://x.com/user/status/${id}"><time>now</time></a>
          <video id="v-orig-${i}"></video>
        `;
        document.body.appendChild(tweet);

        // Dismiss the first 10
        if (i < 10) {
          const key = getVideoKey(id, null);
          const v = tweet.querySelector('video');
          stateStore.dismiss(key, v);
        }
      }

      expect(stateStore.getDismissedCount()).toBe(10);

      // Now simulate X virtual scroll replacing all 20 videos with fresh DOM elements
      for (let i = 0; i < 20; i++) {
        const tweet = document.getElementById(`tweet-${i}`);
        const oldV = tweet.querySelector('video');
        oldV.remove();

        const freshV = document.createElement('video');
        freshV.id = `v-fresh-${i}`;
        tweet.appendChild(freshV);
      }

      // Track observer detections
      const detected = [];
      const obs = createVideoObserver({
        root: document.body,
        stateStore,
        onVideoDetected: (video, info) => {
          detected.push({ video, info });
        },
      });

      obs.scan();

      // Only the 10 un-dismissed videos should trigger onVideoDetected!
      expect(detected).toHaveLength(10);
      for (let i = 0; i < 10; i++) {
        const freshV = document.getElementById(`v-fresh-${i}`);
        expect(stateStore.isDismissed(`91000000000000000${i.toString().padStart(2, '0')}_media_null`, freshV)).toBe(true);
        expect(freshV.dataset.xvtDismissed).toBe('true');
      }

      for (let i = 10; i < 20; i++) {
        const freshV = document.getElementById(`v-fresh-${i}`);
        expect(stateStore.isDismissed(`91000000000000000${i.toString().padStart(2, '0')}_media_null`, freshV)).toBe(false);
        expect(freshV.dataset.xvtMounted).toBe('true');
      }

      obs.stop();
    });
  });

  // =========================================================================
  // Section 5: Fine-grained Edge Cases & Boundary Conditions
  // =========================================================================
  describe('Fine-grained Edge Cases & Boundary Conditions', () => {
    it('nested articles: resolves inner tweet article when an article is nested within an article', () => {
      const outer = document.createElement('article');
      outer.setAttribute('data-testid', 'tweet');
      outer.innerHTML = `
        <div class="outer-header"><a href="https://x.com/outer/status/111111"><time>1m</time></a></div>
        <div class="quote-article-wrapper">
          <article data-testid="tweet" id="nested-article">
            <div class="inner-header"><a href="https://x.com/inner/status/222222"><time>2m</time></a></div>
            <video id="v-nested-art"></video>
          </article>
        </div>
      `;
      document.body.appendChild(outer);

      const v = outer.querySelector('#v-nested-art');
      const container = findTweetContainer(v);
      expect(container.id).toBe('nested-article');

      const info = extractTweetInfo(container, v);
      expect(info.tweetId).toBe('222222');
      expect(info.permalink).toBe('https://x.com/inner/status/222222');
    });

    it('sibling photo anchor does NOT leak mediaIndex into un-anchored video in mixed tweet', () => {
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');
      article.innerHTML = `
        <div class="header"><a href="https://x.com/mixed/status/333333"><time>1m</time></a></div>
        <div class="media-grid">
          <div class="photo-cell">
            <a href="https://x.com/mixed/status/333333/photo/1"><img src="photo.jpg"></a>
          </div>
          <div class="video-cell">
            <!-- Video without wrapping anchor -->
            <video id="v-unwrapped"></video>
          </div>
        </div>
      `;
      document.body.appendChild(article);

      const v = article.querySelector('#v-unwrapped');
      const info = extractTweetInfo(article, v);

      expect(info.tweetId).toBe('333333');
      expect(info.mediaIndex).toBeNull();
      expect(info.permalink).toBe('https://x.com/mixed/status/333333');
    });

    it('wrapped anchor with /video/0 or /video/abc results in null mediaIndex and clean permalink', () => {
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');
      article.innerHTML = `
        <div class="header"><a href="https://x.com/author/status/444444"><time>1m</time></a></div>
        <a href="https://x.com/author/status/444444/video/0">
          <video id="v-zero"></video>
        </a>
      `;
      document.body.appendChild(article);

      const vZero = article.querySelector('#v-zero');
      const infoZero = extractTweetInfo(article, vZero);
      expect(infoZero.mediaIndex).toBeNull();
      expect(infoZero.permalink).toBe('https://x.com/author/status/444444');

      // Test with /video/abc
      const a = vZero.closest('a');
      a.href = 'https://x.com/author/status/444444/video/abc';
      const infoAbc = extractTweetInfo(article, vZero);
      expect(infoAbc.mediaIndex).toBeNull();
      expect(infoAbc.permalink).toBe('https://x.com/author/status/444444');
    });

    it('rejects alphanumeric status segments like 12345abc', () => {
      expect(extractTweetId('https://x.com/user/status/12345abc')).toBeNull();
    });

    it('rejects alphanumeric status segments with underscore like 12345_abc', () => {
      expect(extractTweetId('https://x.com/user/status/12345_abc')).toBeNull();
    });

    it('rejects media index with non-digit suffix like /video/1abc', () => {
      expect(extractMediaIndex('/user/status/12345/video/1abc')).toBeNull();
    });

    it('multiple time elements: when first time element is not a status link, falls back to real status anchor', () => {
      const article = document.createElement('article');
      article.setAttribute('data-testid', 'tweet');
      article.innerHTML = `
        <div class="user-bio">
          <a href="/user/history"><time>Joined Oct 2020</time></a>
        </div>
        <div class="header">
          <a href="https://x.com/user/status/1710000000000000001"><time>10m</time></a>
        </div>
        <video id="v-multi-time"></video>
      `;
      document.body.appendChild(article);

      const v = article.querySelector('#v-multi-time');
      const info = extractTweetInfo(article, v);

      expect(info.tweetId).toBe('1710000000000000001');
      expect(info.permalink).toBe('https://x.com/user/status/1710000000000000001');
    });

    it('handles multiple status occurrences in query params without corrupting canonical URL', () => {
      const oddUrl = 'https://x.com/primary/status/555555?redirect=https://twitter.com/secondary/status/666666/video/1';
      expect(extractTweetId(oddUrl)).toBe('555555');
      expect(extractUsername(oddUrl)).toBe('primary');
      // Should NOT extract secondary mediaIndex or status
      expect(normalizeTweetUrl(oddUrl)).toBe('https://x.com/primary/status/555555');
    });
  });
});
