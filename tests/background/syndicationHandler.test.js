// tests/background/syndicationHandler.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateSyndicationToken,
  fetchTweetSyndication,
  parseSyndicationMedia,
  extractVideosFromSyndication,
} from '../../src/background/handlers/syndicationHandler.js';
import { createMockSyndicationResponse, createMockVariant } from '../fixtures/cdnFixtures.js';

describe('Group B: Twitter Syndication API Fallback (Tests 7–13)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Test 7: Valid API response with single video -> generates mathematical token and resolves video entity', async () => {
    const tweetId = '1700000000000000000';
    const expectedToken = ((Number(tweetId) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
    expect(calculateSyndicationToken(tweetId)).toBe(expectedToken);

    const mockData = createMockSyndicationResponse({ tweetId, mediaCount: 1 });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchTweetSyndication(tweetId);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`id=${tweetId}&token=${expectedToken}`),
      expect.any(Object)
    );
    expect(result.success).toBe(true);
    expect(result.mediaDetails).toHaveLength(1);
    expect(result.mediaDetails[0].type).toBe('video');
  });

  it('Test 8: Valid API response with multiple MP4 variants -> parses and filters all valid MP4 variants', () => {
    const variants = [
      createMockVariant({ width: 640, height: 360, bitrate: 288000 }),
      createMockVariant({ width: 852, height: 480, bitrate: 832000 }),
      createMockVariant({ width: 1280, height: 720, bitrate: 2176000 }),
      createMockVariant({ width: 1920, height: 1080, bitrate: 4500000 }),
      createMockVariant({ contentType: 'application/x-mpegURL' }),
    ];
    const mockData = createMockSyndicationResponse({ variants, mediaCount: 1 });

    const parsed = parseSyndicationMedia(mockData);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(4); // 4 MP4s (HLS filtered out of MP4 list)
    expect(parsed[0].bitrate).toBe(288000);
    expect(parsed[3].bitrate).toBe(4500000);
  });

  it('Test 9: Multi-media tweet response (1 photo + 2 videos) -> accurately extracts both video entities', () => {
    const mockData = createMockSyndicationResponse({
      type: 'mixed',
      mediaCount: 3, // Item 0 is photo, Items 1 and 2 are videos
    });

    const videos = extractVideosFromSyndication(mockData);

    expect(videos).toHaveLength(2);
    expect(videos[0].type).toBe('video');
    expect(videos[1].type).toBe('video');
  });

  it('Test 10: Network timeout handling -> cleanly aborts and returns API_TIMEOUT error', async () => {
    const tweetId = '1800000000000000010';

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_url, { signal }) => {
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });

    const result = await fetchTweetSyndication(tweetId, { timeout: 20 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('API_TIMEOUT');
    expect(result.message).toContain('Hết thời gian chờ');
  });

  it('Test 11: HTTP 429 Rate Limit from X server -> returns API_RATE_LIMIT with user notice', async () => {
    const tweetId = '1800000000000000011';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    const result = await fetchTweetSyndication(tweetId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('API_RATE_LIMIT');
    expect(result.status).toBe(429);
    expect(result.message).toContain('Rate limited');
  });

  it('Test 12: Inaccessible tweet (HTTP 404 / 403 / Tombstone) -> returns TWEET_INACCESSIBLE', async () => {
    const tweetId = '1800000000000000012';

    // 1. HTTP 404 Not Found
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result404 = await fetchTweetSyndication(tweetId);
    expect(result404.success).toBe(false);
    expect(result404.error).toBe('TWEET_INACCESSIBLE');

    // 2. Tombstone response with HTTP 200
    const tombstoneData = createMockSyndicationResponse({ isTombstone: true });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(tombstoneData),
    });

    const resultTombstone = await fetchTweetSyndication(tweetId);
    expect(resultTombstone.success).toBe(false);
    expect(resultTombstone.error).toBe('TWEET_INACCESSIBLE');
  });

  it('Test 13: Response HTTP 200 with no mediaDetails or empty array -> returns NO_MEDIA', () => {
    const emptyResponse = {
      __typename: 'Tweet',
      id_str: '1800000000000000013',
      text: 'Text only tweet',
      mediaDetails: [],
    };

    const parsed = parseSyndicationMedia(emptyResponse);

    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe('NO_MEDIA');
    expect(parsed.message).toContain('không chứa dữ liệu video');
  });
});
