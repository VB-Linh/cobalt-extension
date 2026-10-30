// tests/content/cdn/urlValidator.test.js
import { describe, it, expect } from 'vitest';
import { isValidTwimgCdnUrl, validateCdnUrl } from '../../../src/content/cdn/cdnValidator.js';

describe('Group E: URL Validation & Security (Tests 25–31)', () => {
  it('Test 25: Valid HTTPS URL on exact video.twimg.com hostname -> passes validation', () => {
    const validUrls = [
      'https://video.twimg.com/amplify_video/1800000000000000000/vid/avc1/720x1280/sample.mp4?tag=14',
      'https://video.twimg.com/ext_tw_video/1801000000000000000/pu/vid/avc1/1280x720/vid.mp4',
      'https://video.twimg.com/tweet_video/1802000000000000000.mp4',
      'https://VIDEO.TWIMG.COM/amplify_video/123/vid/avc1/1920x1080/sample.mp4', // Case insensitive
    ];

    for (const url of validUrls) {
      expect(validateCdnUrl(url)).toBe(true);
    }
  });

  it('Test 26: Insecure HTTP protocol -> rejected (enforces HTTPS)', () => {
    const httpUrl = 'http://video.twimg.com/amplify_video/1800/vid/avc1/720x1280/test.mp4';
    expect(validateCdnUrl(httpUrl)).toBe(false);
  });

  it('Test 27: Blob protocol URL -> rejected', () => {
    const blobUrls = [
      'blob:https://x.com/d94e2467-8509-408d-8a5b-d3d63d8fc8c4',
      'blob:https://video.twimg.com/d94e2467-8509-408d-8a5b-d3d63d8fc8c4',
    ];

    for (const url of blobUrls) {
      expect(validateCdnUrl(url)).toBe(false);
    }
  });

  it('Test 28: Spoofed hostnames and subdomain attacks -> rejected', () => {
    const maliciousUrls = [
      'https://video.twimg.com.attacker.com/vid.mp4',
      'https://attacker.com/video.twimg.com/vid.mp4',
      'https://fakevideo.twimg.com/vid.mp4',
      'https://video_twimg.com/vid.mp4',
      'https://video.twimg.co/vid.mp4',
      'https://video.twimg.com@attacker.com/vid.mp4',
    ];

    for (const url of maliciousUrls) {
      expect(validateCdnUrl(url)).toBe(false);
    }
  });

  it('Test 29: Cobalt instance URLs or proxy endpoints -> rejected', () => {
    const cobaltUrls = [
      'https://cobalt.tools/tunnel?id=123&sig=abc',
      'https://cobalt.instance.org/api/json',
      'https://api.cobalt.tools/',
      'https://my-cobalt-server.com/stream/video.mp4',
    ];

    for (const url of cobaltUrls) {
      expect(validateCdnUrl(url)).toBe(false);
    }
  });

  it('Test 30: Tweet web page URLs or photo URLs -> rejected', () => {
    const nonMediaUrls = [
      'https://x.com/user/status/1700000000000000000',
      'https://twitter.com/i/status/1700000000000000000',
      'https://pbs.twimg.com/media/sample_photo.jpg',
      'https://pbs.twimg.com/amplify_video_thumb/1800/img/thumb.jpg',
    ];

    for (const url of nonMediaUrls) {
      expect(validateCdnUrl(url)).toBe(false);
    }
  });

  it('Test 31: Complex query parameters are preserved 100% without stripping or modification', () => {
    const complexUrl = 'https://video.twimg.com/amplify_video/1800/vid/avc1/1920x1080/vid.mp4?tag=14&ref=ext&sig=4a8f9c0e&exp=1700000000&custom=val%20space#t=10';

    expect(isValidTwimgCdnUrl(complexUrl)).toBe(true);

    const parsed = new URL(complexUrl);
    expect(parsed.searchParams.get('tag')).toBe('14');
    expect(parsed.searchParams.get('ref')).toBe('ext');
    expect(parsed.searchParams.get('sig')).toBe('4a8f9c0e');
    expect(parsed.searchParams.get('exp')).toBe('1700000000');
    expect(parsed.hash).toBe('#t=10');
  });
});
