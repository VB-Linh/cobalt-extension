// tests/content/cdn/mediaIdentifier.test.js
import { describe, it, expect } from 'vitest';
import { matchVideoToMedia, selectTargetMedia } from '../../../src/content/cdn/mediaSelector.js';
import { createMockSyndicationResponse } from '../../fixtures/cdnFixtures.js';

describe('Group D: Multi-Media Identification & Ambiguity (Tests 19–24)', () => {
  it('Test 19: Tweet with multiple videos and official /video/:index anchor -> maps deterministically by anchor index', () => {
    const syndicationData = createMockSyndicationResponse({ tweetId: '1850000000000000019', mediaCount: 2 });
    const videoElement1 = document.createElement('video');
    const videoElement2 = document.createElement('video');

    const result1 = matchVideoToMedia(videoElement1, { mediaIndex: 1 }, syndicationData);
    const result2 = matchVideoToMedia(videoElement2, { mediaIndex: 2 }, syndicationData);

    expect(result1.status).toBe('resolved');
    expect(result1.media).toBe(syndicationData.mediaDetails[0]);

    expect(result2.status).toBe('resolved');
    expect(result2.media).toBe(syndicationData.mediaDetails[1]);
  });

  it('Test 20: Mixed media tweet (1 photo + 1 video) -> accurately selects video, completely ignoring photo', () => {
    const syndicationData = createMockSyndicationResponse({
      tweetId: '1850000000000000020',
      type: 'mixed',
      mediaCount: 2, // Item 0 is photo, Item 1 is video
    });
    const videoElement = document.createElement('video');

    // Case A: With official mediaIndex: 2
    const resultWithIndex = matchVideoToMedia(videoElement, { mediaIndex: 2 }, syndicationData);
    expect(resultWithIndex.status).toBe('resolved');
    expect(resultWithIndex.media.type).toBe('video');
    expect(resultWithIndex.media.id_str).toBe(syndicationData.mediaDetails[1].id_str);

    // Case B: Without mediaIndex, auto-selects only video entity
    const resultAuto = matchVideoToMedia(videoElement, { mediaIndex: null }, syndicationData);
    expect(resultAuto.status).toBe('resolved');
    expect(resultAuto.media.type).toBe('video');
  });

  it('Test 21: Video in Quoted Tweet -> resolves video belonging to the quoted tweet ID', () => {
    const mainTweetId = '1850000000000000021';
    const quotedTweetId = '1850000000000000099';

    const quotedSyndicationData = createMockSyndicationResponse({ tweetId: quotedTweetId, mediaCount: 1 });
    const videoElement = document.createElement('video');

    const quotedTweetInfo = {
      tweetId: quotedTweetId,
      isQuoted: true,
      mediaIndex: 1,
    };

    const result = matchVideoToMedia(videoElement, quotedTweetInfo, quotedSyndicationData);

    expect(result.status).toBe('resolved');
    expect(result.media.id_str).toContain(quotedTweetId);
  });

  it('Test 22: Multi-video tweet without official anchor, matching via distinct Media Fingerprint', () => {
    const syndicationData = createMockSyndicationResponse({ tweetId: '1850000000000000022', mediaCount: 3 });
    const targetMedia = syndicationData.mediaDetails[1]; // Target is second video
    const targetFingerprint = targetMedia.id_str;

    const videoElement = document.createElement('video');

    const result = matchVideoToMedia(
      videoElement,
      { mediaIndex: null, mediaFingerprint: targetFingerprint },
      syndicationData
    );

    expect(result.status).toBe('resolved');
    expect(result.media).toBe(targetMedia);
  });

  it('Test 23: Multi-video tweet where fingerprint does not match and no anchor exists -> enters ambiguous state', () => {
    const syndicationData = createMockSyndicationResponse({ tweetId: '1850000000000000023', mediaCount: 3 });
    const videoElement = document.createElement('video');

    const result = matchVideoToMedia(
      videoElement,
      { mediaIndex: null, mediaFingerprint: 'non-matching-unknown-fingerprint' },
      syndicationData
    );

    expect(result.status).toBe('ambiguous');
    expect(result.media).toBeNull();
    expect(result.candidates).toHaveLength(3);
  });

  it('Test 24: STRICT INTEGRITY RULE: Never defaults to mediaDetails[0] or DOM index when ambiguous', () => {
    const syndicationData = createMockSyndicationResponse({ tweetId: '1850000000000000024', mediaCount: 2 });
    const videoElement = document.createElement('video');

    // No anchor index, no fingerprint
    const selection = selectTargetMedia(syndicationData.mediaDetails, {}, videoElement);

    // Assert that media is strictly NOT defaulted to mediaDetails[0]
    expect(selection.ambiguous).toBe(true);
    expect(selection.media).toBeNull();
    expect(selection.media).not.toBe(syndicationData.mediaDetails[0]);
    expect(selection.candidates).toHaveLength(2);
  });
});
