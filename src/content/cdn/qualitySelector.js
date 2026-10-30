// src/content/cdn/qualitySelector.js
import { isValidTwimgCdnUrl } from './cdnValidator.js';

/**
 * Extracts the pixel resolution area (width * height) from a Twitter video URL.
 * Matches patterns like /1280x720/, /1920x1080/, /3840x2160/, /720x1280/.
 * 
 * @param {string} url
 * @returns {number} Pixel count or 0 if not extractable
 */
export function extractResolution(url) {
  if (!url || typeof url !== 'string') return 0;
  const match = url.match(/\/(\d+)x(\d+)\//);
  if (!match) return 0;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) return 0;
  return width * height;
}

/**
 * Checks if a variant has explicit metadata resolution from the response.
 * 
 * @param {object} variant
 * @returns {boolean}
 */
export function hasMetadataResolution(variant) {
  if (!variant || typeof variant !== 'object') return false;

  const metaWidth = Number(
    variant.width ??
    variant.original_info?.width ??
    variant.dimensions?.width
  );
  const metaHeight = Number(
    variant.height ??
    variant.original_info?.height ??
    variant.dimensions?.height
  );
  if (!isNaN(metaWidth) && !isNaN(metaHeight) && metaWidth > 0 && metaHeight > 0) {
    return true;
  }

  if (typeof variant.resolution === 'string' && /^\d+x\d+$/.test(variant.resolution)) {
    return true;
  }
  if (variant.resolution && typeof variant.resolution === 'object') {
    const w = Number(variant.resolution.width);
    const h = Number(variant.resolution.height);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) return true;
  }

  return false;
}

/**
 * Resolves the pixel resolution area (width * height) of a video variant.
 * 
 * Quality Priority Hierarchy:
 * 1. Authoritative API metadata: variant.width & variant.height (or original_info / dimensions).
 *    Strictly prioritized over URL pattern matching.
 * 2. If explicit metadata is absent: URL dimension token parsing (/1280x720/).
 * 3. Returns 0 if neither is present or reliably determinable.
 * 
 * @param {object} variant
 * @returns {number} Pixel count (width * height) or 0
 */
export function getVariantResolution(variant) {
  if (!variant || typeof variant !== 'object') return 0;

  // 1. Prioritize explicit metadata from API response
  const metaWidth = Number(
    variant.width ??
    variant.original_info?.width ??
    variant.dimensions?.width
  );
  const metaHeight = Number(
    variant.height ??
    variant.original_info?.height ??
    variant.dimensions?.height
  );

  if (!isNaN(metaWidth) && !isNaN(metaHeight) && metaWidth > 0 && metaHeight > 0) {
    return metaWidth * metaHeight;
  }

  // Also support variant.resolution as "1920x1080" string or { width, height } object
  if (typeof variant.resolution === 'string') {
    const match = variant.resolution.match(/^(\d+)x(\d+)$/);
    if (match) {
      const w = Number(match[1]);
      const h = Number(match[2]);
      if (w > 0 && h > 0) return w * h;
    }
  } else if (variant.resolution && typeof variant.resolution === 'object') {
    const w = Number(variant.resolution.width);
    const h = Number(variant.resolution.height);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) return w * h;
  }

  // 2. If explicit metadata is absent, check URL pattern as secondary fallback
  if (variant.url && typeof variant.url === 'string') {
    return extractResolution(variant.url);
  }

  return 0;
}

/**
 * Compares two MP4 variants to determine which has higher quality.
 * 
 * Rules:
 * 1. Authoritative Metadata Precedence:
 *    If metadata resolution exists, it strictly overrides dimension tokens in the URL.
 * 2. Resolution Comparison:
 *    Higher pixel resolution area wins.
 * 3. Bitrate Tie-Breaker & Missing Metadata Rule:
 *    If resolutions are identical, or if metadata is absent and URL dimensions are missing/unreliable,
 *    bitrate is the authoritative differentiator.
 * 
 * @param {object} a
 * @param {object} b
 * @returns {number} Positive if b > a, negative if a > b, 0 if equal
 */
export function compareVariants(a, b) {
  const hasMetaA = hasMetadataResolution(a);
  const hasMetaB = hasMetadataResolution(b);

  const resA = getVariantResolution(a);
  const resB = getVariantResolution(b);

  const bitrateA = Number(a.bitrate || 0);
  const bitrateB = Number(b.bitrate || 0);

  // Both have explicit metadata resolution
  if (hasMetaA && hasMetaB) {
    if (resA !== resB) {
      return resB - resA;
    }
    return bitrateB - bitrateA;
  }

  // One has explicit metadata, the other does not
  if (hasMetaA && !hasMetaB) {
    if (resA >= resB) return -1;
    if (resA > 0 && bitrateA >= bitrateB) return -1;
  } else if (!hasMetaA && hasMetaB) {
    if (resB >= resA) return 1;
    if (resB > 0 && bitrateB >= bitrateA) return 1;
  }

  // Neither has explicit metadata
  // If both have reliable URL dimensions
  if (resA > 0 && resB > 0) {
    if (resA !== resB) {
      return resB - resA;
    }
    return bitrateB - bitrateA;
  }

  // If one has missing URL dimensions or both do
  if (bitrateA !== bitrateB) {
    return bitrateB - bitrateA;
  }

  return resB - resA;
}

/**
 * Selects the highest quality MP4 variant from a list of video variants.
 * 
 * Ranking Hierarchy:
 * 1. Authoritative resolution metadata from response (width * height).
 *    Never downscales, never artificially caps at 1080p (4K, 1440p prioritized).
 * 2. URL resolution pattern fallback when metadata is absent.
 * 3. Bitrate ranking as tie-breaker or when resolution cannot be reliably determined.
 * 
 * Raw URL Preservation:
 * Preserves 100% of query parameters (?tag=14, tokens, signatures).
 * 
 * @param {Array<object>} variants
 * @returns {object | null} Best MP4 variant or null if none available
 */
export function selectHighestQualityMp4(variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null;
  }

  // Filter valid MP4 variants on video.twimg.com
  const mp4Variants = variants.filter((v) => {
    if (!v || typeof v !== 'object') return false;
    if (v.content_type !== 'video/mp4') return false;
    if (!v.url || typeof v.url !== 'string') return false;
    return isValidTwimgCdnUrl(v.url);
  });

  if (mp4Variants.length === 0) {
    return null;
  }

  // Rank variants
  let best = mp4Variants[0];

  for (let i = 1; i < mp4Variants.length; i++) {
    const current = mp4Variants[i];
    if (compareVariants(best, current) > 0) {
      best = current;
    }
  }

  const bestRes = getVariantResolution(best);
  const bestBitrate = Number(best.bitrate || 0);

  return {
    ...best,
    url: best.url, // Full raw URL preserved verbatim
    isHls: false,
    resolution: bestRes,
    bitrate: bestBitrate,
  };
}

/**
 * Selects the best variant available.
 * Prioritizes highest quality MP4; if no MP4 is available, falls back to HLS (.m3u8).
 * 
 * @param {Array<object>} variants
 * @returns {object | null} Selected variant with isHls flag, or null
 */
export function selectBestVariant(variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null;
  }

  // 1. Try highest quality MP4
  const bestMp4 = selectHighestQualityMp4(variants);
  if (bestMp4) {
    return bestMp4;
  }

  // 2. Fallback to HLS playlist (.m3u8)
  const hlsVariant = variants.find((v) => {
    if (!v || typeof v !== 'object' || !v.url) return false;
    const isM3u8Type = v.content_type === 'application/x-mpegURL' || v.content_type === 'application/vnd.apple.mpegurl';
    const hasM3u8Path = v.url.toLowerCase().includes('.m3u8');
    return (isM3u8Type || hasM3u8Path) && isValidTwimgCdnUrl(v.url);
  });

  if (hlsVariant) {
    return {
      ...hlsVariant,
      url: hlsVariant.url,
      isHls: true,
      bitrate: Number(hlsVariant.bitrate || 0),
    };
  }

  return null;
}
