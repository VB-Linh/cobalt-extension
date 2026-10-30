// tests/extraction.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { extractTweetInfo } from '../src/content/extraction/index.js';
import { createTweetFixture } from './fixtures/factory.js';

describe('extraction module', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts canonical metadata for a single video in a timeline tweet', () => {
    const fixture = createTweetFixture({
      tweetId: '1710000000000000001',
      username: 'elonmusk',
    });
    document.body.appendChild(fixture);
    const video = fixture.querySelector('video');

    const info = extractTweetInfo(fixture, video);
    expect(info.tweetId).toBe('1710000000000000001');
    expect(info.permalink).toBe('https://x.com/elonmusk/status/1710000000000000001');
    expect(info.mediaIndex).toBeNull();
    expect(info.isQuoted).toBe(false);
    expect(info.username).toBe('elonmusk');
  });

  it('extracts official media index from surrounding anchor in multi-video tweet', () => {
    const fixture = createTweetFixture({
      tweetId: '1730000000000000003',
      username: 'broadcast',
      videoIndices: [1, 2],
    });
    document.body.appendChild(fixture);
    const videos = fixture.querySelectorAll('video');

    const info1 = extractTweetInfo(fixture, videos[0]);
    const info2 = extractTweetInfo(fixture, videos[1]);

    expect(info1.tweetId).toBe('1730000000000000003');
    expect(info1.mediaIndex).toBe(1);
    expect(info1.permalink).toBe('https://x.com/broadcast/status/1730000000000000003/video/1');

    expect(info2.tweetId).toBe('1730000000000000003');
    expect(info2.mediaIndex).toBe(2);
    expect(info2.permalink).toBe('https://x.com/broadcast/status/1730000000000000003/video/2');
  });

  it('STRICT RULE: mediaIndex is strictly null if no official anchor contains /video/:index', () => {
    // Construct tweet with multiple videos but NO /video/:index link
    const fixture = createTweetFixture({
      tweetId: '1730000000000000099',
      username: 'tester',
      videoIndices: [null, null], // Both without official media anchors
    });
    document.body.appendChild(fixture);
    const videos = fixture.querySelectorAll('video');

    const info1 = extractTweetInfo(fixture, videos[0]);
    const info2 = extractTweetInfo(fixture, videos[1]);

    // Must NEVER synthesize mediaIndex from DOM order (0 or 1)
    expect(info1.mediaIndex).toBeNull();
    expect(info2.mediaIndex).toBeNull();
  });

  it('correctly associates video inside a quoted tweet with the quoted tweet permalink', () => {
    const fixture = createTweetFixture({
      tweetId: '1750000000000000005',
      username: 'curator',
      isQuoted: true,
      quotedTweetId: '1750000000000000099',
      quotedUsername: 'originator',
    });
    document.body.appendChild(fixture);
    const video = fixture.querySelector('video');

    const info = extractTweetInfo(fixture, video);
    expect(info.isQuoted).toBe(true);
    expect(info.tweetId).toBe('1750000000000000099');
    expect(info.tweetId).not.toBe('1750000000000000005');
    expect(info.username).toBe('originator');
    expect(info.permalink).toBe('https://x.com/originator/status/1750000000000000099');
  });

  it('normalizes legacy twitter.com and strips query/hash parameters', () => {
    const fixture = createTweetFixture({
      tweetId: '1760000000000000006',
      username: 'legacy_news',
      domain: 'https://twitter.com',
      customQuery: '?s=20&t=foo#fragment',
    });
    document.body.appendChild(fixture);
    const video = fixture.querySelector('video');

    const info = extractTweetInfo(fixture, video);
    expect(info.tweetId).toBe('1760000000000000006');
    expect(info.permalink).toBe('https://x.com/legacy_news/status/1760000000000000006');
    expect(info.permalink).not.toContain('twitter.com');
    expect(info.permalink).not.toContain('?s=20');
    expect(info.permalink).not.toContain('#fragment');
  });

  it('handles incomplete DOM gracefully returning null fields for retry', () => {
    const fixture = createTweetFixture({
      tweetId: '1770000000000000007',
      incompleteHeader: true,
    });
    document.body.appendChild(fixture);
    const video = fixture.querySelector('video');

    const info = extractTweetInfo(fixture, video);
    expect(info.tweetId).toBeNull();
    expect(info.permalink).toBeNull();
    expect(info.mediaIndex).toBeNull();
  });
});
