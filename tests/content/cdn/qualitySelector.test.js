// tests/content/cdn/qualitySelector.test.js
import { describe, it, expect } from 'vitest';
import {
  selectHighestQualityMp4,
  selectBestVariant,
  extractResolution,
  getVariantResolution,
  hasMetadataResolution,
} from '../../../src/content/cdn/qualitySelector.js';
import { createMockVariant } from '../../fixtures/cdnFixtures.js';

describe('Group C: Highest Quality MP4 Selection & HLS Fallback (Tests 14–18)', () => {
  it('Test 14: Resolution ranking: selects 4K (3840x2160) and does NOT downscale or cap at 1080p', () => {
    const variants = [
      createMockVariant({ width: 640, height: 360, bitrate: 288000 }),
      createMockVariant({ width: 1280, height: 720, bitrate: 2176000 }),
      createMockVariant({ width: 1920, height: 1080, bitrate: 4500000 }),
      createMockVariant({ width: 3840, height: 2160, bitrate: 12000000 }), // 4K UHD
    ];

    const best = selectHighestQualityMp4(variants);

    expect(best).not.toBeNull();
    expect(best.resolution).toBe(3840 * 2160);
    expect(best.url).toContain('3840x2160');
    expect(best.bitrate).toBe(12000000);
  });

  it('Test 15: Identical resolutions (1080p) with different bitrates -> selects higher bitrate variant', () => {
    const variants = [
      createMockVariant({ width: 1920, height: 1080, bitrate: 2176000, tag: 'low' }),
      createMockVariant({ width: 1920, height: 1080, bitrate: 4500000, tag: 'high' }),
    ];

    const best = selectHighestQualityMp4(variants);

    expect(best).not.toBeNull();
    expect(best.bitrate).toBe(4500000);
    expect(best.url).toContain('tag=high');
  });

  it('Test 16: Variants lacking resolution dimension tokens in URL path -> ranks accurately by bitrate', () => {
    const variants = [
      createMockVariant({
        bitrate: 500000,
        customUrl: 'https://video.twimg.com/tweet_video/sample_low.mp4?tag=14',
      }),
      createMockVariant({
        bitrate: 1500000,
        customUrl: 'https://video.twimg.com/tweet_video/sample_high.mp4?tag=14',
      }),
    ];

    expect(extractResolution(variants[0].url)).toBe(0);
    expect(extractResolution(variants[1].url)).toBe(0);

    const best = selectHighestQualityMp4(variants);

    expect(best).not.toBeNull();
    expect(best.bitrate).toBe(1500000);
    expect(best.url).toContain('sample_high.mp4');
  });

  it('Test 17: Fallback to HLS (.m3u8) when no MP4 variants exist -> selects HLS stream with isHls flag', () => {
    const variants = [
      createMockVariant({
        contentType: 'application/x-mpegURL',
        customUrl: 'https://video.twimg.com/ext_tw_video/1800/pl/playlist.m3u8?tag=14',
      }),
    ];

    const best = selectBestVariant(variants);

    expect(best).not.toBeNull();
    expect(best.isHls).toBe(true);
    expect(best.url).toContain('.m3u8');
    expect(best.url).toContain('?tag=14');
  });

  it('Test 18: Only unsupported variants or empty list -> returns null', () => {
    const variantsEmpty = [];
    const variantsUnsupported = [
      { content_type: 'video/webm', url: 'https://example.com/video.webm' },
      { content_type: 'text/html', url: 'https://video.twimg.com/index.html' },
    ];

    expect(selectBestVariant(variantsEmpty)).toBeNull();
    expect(selectBestVariant(variantsUnsupported)).toBeNull();
  });

  // =========================================================================
  // AUDIT TESTS: Response Metadata Precedence & URL Dimension Conflict
  // =========================================================================
  describe('Phase 3 Audit: Response Metadata Precedence & URL Conflict Handling', () => {
    it('Audit Test 1: Prioritizes explicit metadata resolution over conflicting URL pattern (metadata 1080p vs URL 720p)', () => {
      const variantWithMeta1080p = {
        bitrate: 4500000,
        content_type: 'video/mp4',
        width: 1920,
        height: 1080,
        url: 'https://video.twimg.com/amplify_video/1800/vid/avc1/720x1280/vid.mp4?tag=14', // Conflicting URL slug
      };
      const variantWithMeta720p = {
        bitrate: 2176000,
        content_type: 'video/mp4',
        width: 1280,
        height: 720,
        url: 'https://video.twimg.com/amplify_video/1800/vid/avc1/1280x720/vid.mp4?tag=14',
      };

      expect(hasMetadataResolution(variantWithMeta1080p)).toBe(true);
      expect(getVariantResolution(variantWithMeta1080p)).toBe(1920 * 1080); // Strict metadata precedence

      const best = selectHighestQualityMp4([variantWithMeta720p, variantWithMeta1080p]);

      expect(best).not.toBeNull();
      expect(best.resolution).toBe(1920 * 1080);
      expect(best.bitrate).toBe(4500000);
      expect(best.url).toBe(variantWithMeta1080p.url); // Preserves exact raw URL
    });

    it('Audit Test 2: Bogus inflated URL dimension does NOT fool selection when explicit metadata is lower', () => {
      const bogusUrlVariant = {
        bitrate: 500000,
        content_type: 'video/mp4',
        width: 640,
        height: 360,
        url: 'https://video.twimg.com/amplify_video/1800/vid/avc1/3840x2160/vid.mp4?tag=14', // Fake 4K in URL
      };
      const real720pVariant = {
        bitrate: 2176000,
        content_type: 'video/mp4',
        width: 1280,
        height: 720,
        url: 'https://video.twimg.com/amplify_video/1800/vid/avc1/1280x720/vid.mp4?tag=14',
      };

      const best = selectHighestQualityMp4([bogusUrlVariant, real720pVariant]);

      // Real 720p metadata (1280*720 = 921600) beats bogus 360p metadata (640*360 = 230400)
      expect(best).not.toBeNull();
      expect(best.resolution).toBe(1280 * 720);
      expect(best.bitrate).toBe(2176000);
      expect(best.url).toBe(real720pVariant.url);
    });

    it('Audit Test 3: Missing metadata on both variants -> uses bitrate when URL dimensions are absent or unreliable', () => {
      const highBitrateNoResVariant = {
        bitrate: 5000000,
        content_type: 'video/mp4',
        url: 'https://video.twimg.com/tweet_video/sample_direct_5m.mp4?tag=14', // No dimensions in URL
      };
      const lowBitrateWithResVariant = {
        bitrate: 800000,
        content_type: 'video/mp4',
        url: 'https://video.twimg.com/amplify_video/1800/vid/avc1/640x360/vid.mp4?tag=14',
      };

      const best = selectHighestQualityMp4([lowBitrateWithResVariant, highBitrateNoResVariant]);

      expect(best).not.toBeNull();
      // 5Mbps variant wins without metadata bias
      expect(best.bitrate).toBe(5000000);
      expect(best.url).toBe(highBitrateNoResVariant.url);
    });

    it('Audit Test 4: getVariantResolution recognizes diverse metadata formats and rejects malformed values', () => {
      // 1. Direct width/height
      expect(getVariantResolution({ width: 1920, height: 1080 })).toBe(1920 * 1080);

      // 2. original_info nested
      expect(getVariantResolution({ original_info: { width: 1280, height: 720 } })).toBe(1280 * 720);

      // 3. dimensions nested
      expect(getVariantResolution({ dimensions: { width: 3840, height: 2160 } })).toBe(3840 * 2160);

      // 4. resolution string
      expect(getVariantResolution({ resolution: '1920x1080' })).toBe(1920 * 1080);

      // 5. resolution object
      expect(getVariantResolution({ resolution: { width: 854, height: 480 } })).toBe(854 * 480);

      // 6. Malformed/negative/zero dimensions rejected safely
      expect(getVariantResolution({ width: 0, height: 1080 })).toBe(0);
      expect(getVariantResolution({ width: -100, height: 500 })).toBe(0);
      expect(getVariantResolution({ width: 'not-a-number', height: 720 })).toBe(0);
      expect(getVariantResolution(null)).toBe(0);
      expect(getVariantResolution(undefined)).toBe(0);
      expect(getVariantResolution({})).toBe(0);
    });
  });
});
