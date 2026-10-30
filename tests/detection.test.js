// tests/detection.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import {
  findTweetContainer,
  findQuotedTweetContainer,
  isQuotedTweet,
  isExcludedContext,
  detectVideos,
  isEligibleVideo,
  getVideoKey,
} from '../src/content/detection/index.js';
import { createTweetFixture } from './fixtures/factory.js';

describe('detection module', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('isExcludedContext', () => {
    it('identifies composer, sidebar, and DM videos as excluded', () => {
      const composer = document.createElement('div');
      composer.setAttribute('data-testid', 'tweetButtonInline');
      const vComposer = document.createElement('video');
      composer.appendChild(vComposer);
      document.body.appendChild(composer);

      expect(isExcludedContext(vComposer)).toBe(true);

      const sidebar = document.createElement('div');
      sidebar.setAttribute('data-testid', 'sidebarColumn');
      const vSidebar = document.createElement('video');
      sidebar.appendChild(vSidebar);
      document.body.appendChild(sidebar);

      expect(isExcludedContext(vSidebar)).toBe(true);

      const dm = document.createElement('div');
      dm.setAttribute('data-testid', 'messageEntry');
      const vDm = document.createElement('video');
      dm.appendChild(vDm);
      document.body.appendChild(dm);

      expect(isExcludedContext(vDm)).toBe(true);
    });

    it('returns false for standard timeline tweet videos', () => {
      const fixture = createTweetFixture({ tweetId: '1001' });
      document.body.appendChild(fixture);
      const video = fixture.querySelector('video');

      expect(isExcludedContext(video)).toBe(false);
    });
  });

  describe('findTweetContainer', () => {
    it('returns article[data-testid="tweet"] for standard timeline video', () => {
      const fixture = createTweetFixture({ tweetId: '1002' });
      document.body.appendChild(fixture);
      const video = fixture.querySelector('video');

      const container = findTweetContainer(video);
      expect(container).toBe(fixture);
    });

    it('correctly isolates inner quote tweet card when video is in a quoted tweet', () => {
      const fixture = createTweetFixture({
        tweetId: '1003_parent',
        isQuoted: true,
        quotedTweetId: '1003_quoted',
      });
      document.body.appendChild(fixture);

      const video = fixture.querySelector('video');
      const container = findTweetContainer(video);

      expect(container).not.toBe(fixture);
      expect(container.getAttribute('data-testid')).toBe('quoteTweet');
    });

    it('resolves modal viewer dialog in tweet detail view', () => {
      const modal = document.createElement('div');
      modal.setAttribute('aria-modal', 'true');

      const video = document.createElement('video');
      modal.appendChild(video);
      document.body.appendChild(modal);

      const container = findTweetContainer(video);
      expect(container).toBe(modal);
    });

    it('returns null for detached or non-tweet videos', () => {
      const detachedVideo = document.createElement('video');
      expect(findTweetContainer(detachedVideo)).toBeNull();

      const randomDiv = document.createElement('div');
      const videoInDiv = document.createElement('video');
      randomDiv.appendChild(videoInDiv);
      document.body.appendChild(randomDiv);

      expect(findTweetContainer(videoInDiv)).toBeNull();
    });
  });

  describe('findQuotedTweetContainer & isQuotedTweet', () => {
    it('detects quote container for video inside quote card', () => {
      const fixture = createTweetFixture({
        tweetId: '1004',
        isQuoted: true,
        quotedTweetId: '1004_q',
      });
      document.body.appendChild(fixture);
      const video = fixture.querySelector('video');

      const quoteContainer = findQuotedTweetContainer(video, fixture);
      expect(quoteContainer).not.toBeNull();
      expect(quoteContainer.getAttribute('data-testid')).toBe('quoteTweet');
      expect(isQuotedTweet(fixture, video)).toBe(true);
    });

    it('returns null and false for normal timeline tweet', () => {
      const fixture = createTweetFixture({ tweetId: '1005' });
      document.body.appendChild(fixture);
      const video = fixture.querySelector('video');

      expect(findQuotedTweetContainer(video, fixture)).toBeNull();
      expect(isQuotedTweet(fixture, video)).toBe(false);
    });
  });

  describe('detectVideos & isEligibleVideo', () => {
    it('discovers all eligible videos while ignoring excluded elements', () => {
      // 1. Tweet with 2 videos
      const tweet1 = createTweetFixture({ tweetId: '2001', videoIndices: [1, 2] });
      document.body.appendChild(tweet1);

      // 2. Tweet with 1 video
      const tweet2 = createTweetFixture({ tweetId: '2002', videoIndices: [null] });
      document.body.appendChild(tweet2);

      // 3. Excluded composer video
      const composer = document.createElement('div');
      composer.setAttribute('data-testid', 'tweetButtonInline');
      const vComposer = document.createElement('video');
      composer.appendChild(vComposer);
      document.body.appendChild(composer);

      const videos = detectVideos(document.body);
      expect(videos).toHaveLength(3);
      expect(videos).not.toContain(vComposer);
    });

    it('validates video eligibility with isEligibleVideo', () => {
      const fixture = createTweetFixture({ tweetId: '2003' });
      document.body.appendChild(fixture);
      const validVideo = fixture.querySelector('video');

      expect(isEligibleVideo(validVideo)).toBe(true);

      const unattached = document.createElement('video');
      expect(isEligibleVideo(unattached)).toBe(false);
    });

    it('correctly associates tweet article for video wrapped in div[aria-labelledby] (real Twitter DOM)', () => {
      // Recreate real Twitter DOM structure
      const tweetArticle = document.createElement('article');
      tweetArticle.setAttribute('data-testid', 'tweet');

      const header = document.createElement('div');
      const timeAnchor = document.createElement('a');
      timeAnchor.href = 'https://x.com/kimnaky7/status/1880000000000000099';
      const timeEl = document.createElement('time');
      timeEl.textContent = '5h';
      timeAnchor.appendChild(timeEl);
      header.appendChild(timeAnchor);
      tweetArticle.appendChild(header);

      const mediaWrapper = document.createElement('div');
      mediaWrapper.setAttribute('aria-labelledby', 'id__698w0g4x6j');
      const videoComponent = document.createElement('div');
      videoComponent.setAttribute('data-testid', 'videoComponent');
      const realVideo = document.createElement('video');
      realVideo.src = 'blob:https://x.com/sample-vid';

      videoComponent.appendChild(realVideo);
      mediaWrapper.appendChild(videoComponent);
      tweetArticle.appendChild(mediaWrapper);
      document.body.appendChild(tweetArticle);

      const container = findTweetContainer(realVideo);
      expect(container).toBe(tweetArticle);
      expect(findQuotedTweetContainer(realVideo, tweetArticle)).toBeNull();
      expect(isQuotedTweet(tweetArticle, realVideo)).toBe(false);
      expect(isEligibleVideo(realVideo)).toBe(true);

      tweetArticle.remove();
    });
  });

  describe('getVideoKey', () => {
    it('generates deterministic per-video keys with tweetId and mediaIndex', () => {
      expect(getVideoKey('12345', null)).toBe('12345_media_null');
      expect(getVideoKey('12345', 1)).toBe('12345_media_1');
      expect(getVideoKey('12345', 2)).toBe('12345_media_2');
      expect(getVideoKey(null)).toBe('null_media_null');
    });
  });
});
