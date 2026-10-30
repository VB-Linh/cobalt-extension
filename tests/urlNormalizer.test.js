// tests/urlNormalizer.test.js
import { describe, it, expect } from 'vitest';
import {
  extractTweetId,
  extractMediaIndex,
  extractUsername,
  normalizeTweetUrl,
  isValidTweetId,
} from '../src/content/extraction/urlNormalizer.js';

describe('urlNormalizer', () => {
  describe('extractTweetId', () => {
    it('extracts ID from canonical x.com status URLs', () => {
      expect(extractTweetId('https://x.com/jack/status/20')).toBe('20');
      expect(extractTweetId('https://x.com/elonmusk/status/1710000000000000001')).toBe('1710000000000000001');
    });

    it('extracts ID from legacy twitter.com and mobile.twitter.com URLs', () => {
      expect(extractTweetId('https://twitter.com/user/status/1234567890')).toBe('1234567890');
      expect(extractTweetId('https://mobile.twitter.com/user/status/9876543210')).toBe('9876543210');
      expect(extractTweetId('https://twitter.com/user/statuses/1122334455')).toBe('1122334455');
    });

    it('extracts ID from relative paths and promoted /i/status/ paths', () => {
      expect(extractTweetId('/user/status/5555555555')).toBe('5555555555');
      expect(extractTweetId('https://x.com/i/status/1799999999999999999')).toBe('1799999999999999999');
    });

    it('strips query parameters and fragments when extracting ID', () => {
      expect(extractTweetId('https://x.com/user/status/1234567890?s=20&t=abc#top')).toBe('1234567890');
    });

    it('returns null for invalid, non-status, or empty URLs', () => {
      expect(extractTweetId(null)).toBeNull();
      expect(extractTweetId(undefined)).toBeNull();
      expect(extractTweetId('')).toBeNull();
      expect(extractTweetId('https://x.com/home')).toBeNull();
      expect(extractTweetId('https://x.com/user/status/')).toBeNull();
      expect(extractTweetId('https://x.com/user/status/nonnumeric')).toBeNull();
    });
  });

  describe('extractMediaIndex', () => {
    it('extracts 1-based index from /video/:index or /photo/:index', () => {
      expect(extractMediaIndex('/user/status/12345/video/1')).toBe(1);
      expect(extractMediaIndex('/user/status/12345/video/4')).toBe(4);
      expect(extractMediaIndex('/user/status/12345/photo/2')).toBe(2);
    });

    it('returns null when no media index pattern is present', () => {
      expect(extractMediaIndex('/user/status/12345')).toBeNull();
      expect(extractMediaIndex('https://x.com/user/status/12345?s=20')).toBeNull();
      expect(extractMediaIndex(null)).toBeNull();
    });

    it('returns null for non-positive or invalid indices', () => {
      expect(extractMediaIndex('/user/status/12345/video/0')).toBeNull();
      expect(extractMediaIndex('/user/status/12345/video/-1')).toBeNull();
    });
  });

  describe('extractUsername', () => {
    it('extracts username from valid status URLs', () => {
      expect(extractUsername('https://x.com/elonmusk/status/12345')).toBe('elonmusk');
      expect(extractUsername('https://twitter.com/jack/status/20')).toBe('jack');
      expect(extractUsername('/news_feed/status/99999')).toBe('news_feed');
    });

    it('returns null or empty for invalid paths', () => {
      expect(extractUsername(null)).toBeNull();
      expect(extractUsername('https://x.com/i/status/12345')).toBe('i');
      expect(extractUsername('https://x.com/explore')).toBeNull();
    });
  });

  describe('normalizeTweetUrl', () => {
    it('normalizes legacy twitter.com to canonical x.com and strips tracking query parameters', () => {
      const raw = 'https://twitter.com/elonmusk/status/1234567890?s=20&t=abcdef#photo';
      expect(normalizeTweetUrl(raw)).toBe('https://x.com/elonmusk/status/1234567890');
    });

    it('appends official media index if present in URL or passed via options', () => {
      const withIndex = 'https://x.com/user/status/1234567890/video/2?s=20';
      expect(normalizeTweetUrl(withIndex)).toBe('https://x.com/user/status/1234567890/video/2');

      const explicit = normalizeTweetUrl('https://x.com/user/status/1234567890', { mediaIndex: 3 });
      expect(explicit).toBe('https://x.com/user/status/1234567890/video/3');
    });

    it('falls back to "i" when username is absent', () => {
      const normalized = normalizeTweetUrl('/status/1234567890');
      expect(normalized).toBe('https://x.com/i/status/1234567890');
    });

    it('returns null if tweet ID cannot be determined', () => {
      expect(normalizeTweetUrl('https://x.com/settings')).toBeNull();
      expect(normalizeTweetUrl('')).toBeNull();
    });
  });

  describe('isValidTweetId', () => {
    it('validates numeric Tweet IDs', () => {
      expect(isValidTweetId('20')).toBe(true);
      expect(isValidTweetId('12345')).toBe(true);
      expect(isValidTweetId('1710000000000000001')).toBe(true);
      expect(isValidTweetId('17100abc0001')).toBe(false);
      expect(isValidTweetId('')).toBe(false);
      expect(isValidTweetId(null)).toBe(false);
      expect(isValidTweetId(undefined)).toBe(false);
    });
  });
});
