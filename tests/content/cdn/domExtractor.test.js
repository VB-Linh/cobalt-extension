// tests/content/cdn/domExtractor.test.js
import { describe, it, expect } from 'vitest';
import { extractDirectDomUrl } from '../../../src/content/cdn/domExtractor.js';
import { createVideoWithSources } from '../../fixtures/cdnFixtures.js';

describe('Group A: Direct DOM Extraction (Tests 1–6)', () => {
  it('Test 1: video.src contains valid HTTPS video.twimg.com MP4 URL -> extracts immediately with query params', () => {
    const rawUrl = 'https://video.twimg.com/amplify_video/1800/vid/avc1/720x1280/sample.mp4?tag=14&sig=abc123xyz';
    const video = createVideoWithSources({ src: rawUrl });

    const extracted = extractDirectDomUrl(video);

    expect(extracted).toBe(rawUrl);
    expect(extracted).toContain('?tag=14&sig=abc123xyz');
  });

  it('Test 2: video.currentSrc contains valid HTTPS video.twimg.com MP4 when video.src is empty -> extracts successfully', () => {
    const currentUrl = 'https://video.twimg.com/ext_tw_video/1801/pu/vid/avc1/1280x720/vid.mp4?tag=12';
    const video = createVideoWithSources({ src: '', currentSrc: currentUrl });

    const extracted = extractDirectDomUrl(video);

    expect(extracted).toBe(currentUrl);
  });

  it('Test 3: Child <source src="..."> contains valid HTTPS video.twimg.com MP4 -> extracts successfully', () => {
    const sourceUrl = 'https://video.twimg.com/tweet_video/1802000000000000001.mp4';
    const video = createVideoWithSources({
      sources: [
        { src: 'https://example.com/invalid.mp4' },
        { src: sourceUrl, type: 'video/mp4' },
      ],
    });

    const extracted = extractDirectDomUrl(video);

    expect(extracted).toBe(sourceUrl);
  });

  it('Test 4: video.src is blob: URL -> returns null (triggers Syndication fallback)', () => {
    const blobUrl = 'blob:https://x.com/d94e2467-8509-408d-8a5b-d3d63d8fc8c4';
    const video = createVideoWithSources({ src: blobUrl });

    const extracted = extractDirectDomUrl(video);

    expect(extracted).toBeNull();
  });

  it('Test 5: Video has no media source in DOM -> returns null gracefully without throwing', () => {
    const video = createVideoWithSources({ src: '', currentSrc: '' });

    const extracted = extractDirectDomUrl(video);

    expect(extracted).toBeNull();
  });

  it('Test 6: Video poster thumbnail URL is never mistaken for video media -> returns null', () => {
    const posterUrl = 'https://pbs.twimg.com/amplify_video_thumb/1803/img/thumb.jpg';
    const video = createVideoWithSources({
      poster: posterUrl,
      src: 'blob:https://x.com/abc-uuid',
    });

    const extracted = extractDirectDomUrl(video);

    expect(extracted).toBeNull();
  });
});
