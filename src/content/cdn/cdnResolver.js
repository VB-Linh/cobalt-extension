// src/content/cdn/cdnResolver.js
import { isValidTwimgCdnUrl, isHlsUrl } from './cdnValidator.js';
import { extractDirectDomUrl } from './domExtractor.js';
import { selectBestVariant, selectHighestQualityMp4, extractResolution, getVariantResolution } from './qualitySelector.js';
import { selectTargetMedia } from './mediaSelector.js';

export const CDN_ERROR_CODES = Object.freeze({
  NO_TWEET_INFO: 'ERR_NO_TWEET_INFO',
  TWEET_INACCESSIBLE: 'ERR_TWEET_INACCESSIBLE',
  RATE_LIMITED: 'ERR_RATE_LIMITED',
  NETWORK_TIMEOUT: 'ERR_NETWORK_TIMEOUT',
  NO_MEDIA: 'ERR_NO_MEDIA',
  NO_SUPPORTED_VARIANT: 'ERR_NO_SUPPORTED_VARIANT',
  AMBIGUOUS_MEDIA: 'ERR_AMBIGUOUS_MEDIA',
  INVALID_URL: 'ERR_INVALID_URL',
  TAB_CREATE_FAILED: 'ERR_TAB_CREATE_FAILED',
  NETWORK_ERROR: 'ERR_NETWORK_ERROR',
});

export const CDN_ERROR_MESSAGES = Object.freeze({
  [CDN_ERROR_CODES.NO_TWEET_INFO]: 'Không tìm thấy thông tin bài viết',
  [CDN_ERROR_CODES.TWEET_INACCESSIBLE]: 'Tweet không tồn tại hoặc bị giới hạn quyền riêng tư',
  [CDN_ERROR_CODES.RATE_LIMITED]: 'Quá giới hạn yêu cầu (Rate limit). Vui lòng thử lại sau',
  [CDN_ERROR_CODES.NETWORK_TIMEOUT]: 'Lỗi kết nối mạng hoặc yêu cầu quá thời gian',
  [CDN_ERROR_CODES.NO_MEDIA]: 'Không tìm thấy video trong bài viết',
  [CDN_ERROR_CODES.NO_SUPPORTED_VARIANT]: 'Không tìm thấy định dạng video tương thích',
  [CDN_ERROR_CODES.AMBIGUOUS_MEDIA]: 'Có nhiều video. Vui lòng chọn video cần mở',
  [CDN_ERROR_CODES.INVALID_URL]: 'URL CDN không hợp lệ hoặc không an toàn',
  [CDN_ERROR_CODES.TAB_CREATE_FAILED]: 'Không thể mở tab mới',
  [CDN_ERROR_CODES.NETWORK_ERROR]: 'Lỗi kết nối mạng',
});

/**
 * Sends a message via chrome.runtime.sendMessage with hybrid callback/promise support.
 * 
 * @param {object} message
 * @returns {Promise<any>}
 */
function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    let responded = false;
    function safeResolve(res) {
      if (!responded) {
        responded = true;
        resolve(res);
      }
    }

    try {
      const p = chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) {
          safeResolve({
            success: false,
            error: 'NETWORK_ERROR',
            message: chrome.runtime.lastError.message,
          });
        } else {
          safeResolve(res || { success: true });
        }
      });

      if (p && typeof p.then === 'function') {
        p.then((res) => safeResolve(res || { success: true })).catch((err) => {
          safeResolve({
            success: false,
            error: 'NETWORK_ERROR',
            message: err?.message || 'Message error',
          });
        });
      }
    } catch (err) {
      safeResolve({
        success: false,
        error: 'NETWORK_ERROR',
        message: err.message,
      });
    }
  });
}

/**
 * Resolves the highest quality direct CDN URL for a given video element.
 * 
 * Flow:
 * 1. Inspect direct DOM URL (video.currentSrc, video.src, <source>).
 * 2. If video has an explicit non-blob src that fails twimg validation -> Reject as INVALID_URL.
 * 3. If DOM provides a valid twimg MP4 -> open tab directly.
 * 4. If DOM has blob: or no direct MP4 -> Fall back to Twitter Syndication API.
 * 5. Match video entity against API response (handling multi-media ambiguity).
 * 6. Select highest quality MP4 (or HLS fallback).
 * 7. Validate strict twimg CDN URL.
 * 8. Open tab via background service worker (or copy to clipboard if shiftKey).
 * 
 * @param {HTMLVideoElement} videoElement
 * @param {object} [tweetInfo={}] - Metadata { tweetId, permalink, mediaIndex, mediaFingerprint, isQuoted }
 * @param {object} [options={}]
 * @param {boolean} [options.shiftKey=false] - If true, copies URL to clipboard instead of opening tab
 * @param {(candidates: Array<object>, resolveCallback: (selected: object) => Promise<any>) => void} [options.onAmbiguous]
 * @returns {Promise<{ success: boolean, url?: string, isHls?: boolean, copied?: boolean, tabOpened?: boolean, error?: string, code?: string, candidates?: Array }>}
 */
export async function resolveCdnForVideo(videoElement, tweetInfo = {}, options = {}) {
  const isShift = Boolean(options.shiftKey || options.isShiftClick);

  // Check if video element has an explicit non-blob src that fails twimg validation (e.g. spoofed domain)
  const rawDirectSrc = videoElement?.src || (typeof videoElement?.getAttribute === 'function' ? videoElement.getAttribute('src') : null);
  if (rawDirectSrc && typeof rawDirectSrc === 'string' && !rawDirectSrc.startsWith('blob:') && rawDirectSrc.trim() !== '') {
    if (!isValidTwimgCdnUrl(rawDirectSrc)) {
      return {
        success: false,
        code: CDN_ERROR_CODES.INVALID_URL,
        error: CDN_ERROR_MESSAGES[CDN_ERROR_CODES.INVALID_URL],
      };
    }
  }

  // 1. Direct DOM Extraction candidate
  const domUrl = extractDirectDomUrl(videoElement);

  // Determine Tweet ID (needed for Syndication API queries and quality checks)
  const tweetId =
    tweetInfo?.tweetId ||
    videoElement?.dataset?.xvtTweetId ||
    videoElement?.closest?.('article')?.id?.replace('tweet-', '') ||
    null;

  // 1a. If DOM provides a direct MP4, compare against Syndication API variants to ensure highest quality (R1)
  if (domUrl) {
    const domRes =
      extractResolution(domUrl) ||
      (videoElement?.videoWidth && videoElement?.videoHeight ? videoElement.videoWidth * videoElement.videoHeight : 0);

    // If tweetId exists and DOM resolution is below maximum possible Twitter resolution (4K: 3840x2160 = 8,294,400)
    if (tweetId && domRes < 3840 * 2160) {
      try {
        const apiResponse = await sendRuntimeMessage({
          action: 'FETCH_SYNDICATION',
          payload: { tweetId },
        });

        if (apiResponse?.success && apiResponse?.data) {
          const mediaDetails = apiResponse.data.mediaDetails || [];
          let targetMedia = null;

          const matchResult = selectTargetMedia(mediaDetails, tweetInfo, videoElement);
          if (matchResult.media) {
            targetMedia = matchResult.media;
          } else if (matchResult.ambiguous) {
            // In multi-video ambiguous state, correlate by media ID embedded in domUrl
            const domIdMatch = domUrl.match(/(?:amplify_video|ext_tw_video|tweet_video)\/(\d+)/);
            if (domIdMatch) {
              const domMediaId = domIdMatch[1];
              targetMedia = matchResult.candidates.find((c) => {
                if (c.id_str === domMediaId) return true;
                return c.video_info?.variants?.some((v) => v.url && v.url.includes(`/${domMediaId}/`));
              });
            }
          }

          if (targetMedia) {
            const apiBestMp4 = selectHighestQualityMp4(targetMedia.video_info?.variants);
            if (apiBestMp4) {
              const apiRes = apiBestMp4.resolution ?? getVariantResolution(apiBestMp4);
              // R1 Quality Comparison: select API variant if it offers higher resolution
              if ((domRes > 0 && apiRes > domRes) || (domRes === 0 && apiRes > 0)) {
                return handleFinalCdnUrl(apiBestMp4.url, false, isShift);
              }
            }
          }
        }
      } catch {
        // Fall through to domUrl if API request fails, times out, or errors
      }
    }

    // Default to domUrl if no higher resolution variant exists or API check was bypassed/failed
    return handleFinalCdnUrl(domUrl, false, isShift);
  }

  // 2. If DOM did not provide a direct MP4, determine Tweet ID for Syndication API fallback
  if (tweetId) {
    try {
      const apiResponse = await sendRuntimeMessage({
        action: 'FETCH_SYNDICATION',
        payload: { tweetId },
      });

      if (apiResponse.success && apiResponse.data) {
        const mediaDetails = apiResponse.data.mediaDetails || [];
        const matchResult = selectTargetMedia(mediaDetails, tweetInfo, videoElement);

        if (matchResult.ambiguous) {
          // Ambiguous state: multiple videos without deterministic anchor or fingerprint
          if (typeof options.onAmbiguous === 'function') {
            options.onAmbiguous(matchResult.candidates, async (selectedCandidate) => {
              const bestVariant = selectBestVariant(selectedCandidate?.video_info?.variants);
              if (!bestVariant) {
                return {
                  success: false,
                  code: CDN_ERROR_CODES.NO_SUPPORTED_VARIANT,
                  error: CDN_ERROR_MESSAGES[CDN_ERROR_CODES.NO_SUPPORTED_VARIANT],
                };
              }
              return handleFinalCdnUrl(bestVariant.url, Boolean(bestVariant.isHls), isShift);
            });
          }
          return {
            success: false,
            isAmbiguous: true,
            code: CDN_ERROR_CODES.AMBIGUOUS_MEDIA,
            error: CDN_ERROR_MESSAGES[CDN_ERROR_CODES.AMBIGUOUS_MEDIA],
            candidates: matchResult.candidates,
          };
        }

        if (matchResult.media) {
          const apiBest = selectBestVariant(matchResult.media.video_info?.variants);
          if (apiBest) {
            return handleFinalCdnUrl(apiBest.url, Boolean(apiBest.isHls), isShift);
          }
          // A media entity was found but lacks compatible MP4/HLS variants
          return {
            success: false,
            code: CDN_ERROR_CODES.NO_SUPPORTED_VARIANT,
            error: CDN_ERROR_MESSAGES[CDN_ERROR_CODES.NO_SUPPORTED_VARIANT],
          };
        }

        return {
          success: false,
          code: CDN_ERROR_CODES.NO_MEDIA,
          error: CDN_ERROR_MESSAGES[CDN_ERROR_CODES.NO_MEDIA],
        };
      }

      // Map API errors
      const errCode = mapApiError(apiResponse.error);
      return {
        success: false,
        code: errCode,
        error: CDN_ERROR_MESSAGES[errCode] || apiResponse.message || 'Lỗi kết nối máy chủ X',
      };
    } catch (err) {
      return {
        success: false,
        code: CDN_ERROR_CODES.NETWORK_ERROR,
        error: err.message || CDN_ERROR_MESSAGES[CDN_ERROR_CODES.NETWORK_ERROR],
      };
    }
  }

  // If no DOM URL and no tweetId
  return {
    success: false,
    code: CDN_ERROR_CODES.NO_TWEET_INFO,
    error: CDN_ERROR_MESSAGES[CDN_ERROR_CODES.NO_TWEET_INFO],
  };
}

/**
 * Handles the validated final CDN URL: opening new tab or copying to clipboard.
 * 
 * @param {string} url
 * @param {boolean} isHls
 * @param {boolean} isShift
 * @returns {Promise<object>}
 */
async function handleFinalCdnUrl(url, isHls, isShift) {
  if (!isValidTwimgCdnUrl(url)) {
    return {
      success: false,
      code: CDN_ERROR_CODES.INVALID_URL,
      error: CDN_ERROR_MESSAGES[CDN_ERROR_CODES.INVALID_URL],
    };
  }

  // Shift + Click: Copy to clipboard
  if (isShift) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return {
          success: true,
          url,
          isHls,
          copied: true,
        };
      }
    } catch {
      // Fall through to tab opening if clipboard access fails
    }
  }

  // Open in new tab via Background Service Worker
  try {
    const tabResult = await sendRuntimeMessage({
      action: 'OPEN_CDN',
      payload: { url },
    });

    if (tabResult && tabResult.success === false) {
      return {
        success: false,
        code: CDN_ERROR_CODES.TAB_CREATE_FAILED,
        error: tabResult.message || CDN_ERROR_MESSAGES[CDN_ERROR_CODES.TAB_CREATE_FAILED],
      };
    }

    return {
      success: true,
      url,
      isHls,
      tabOpened: true,
    };
  } catch (err) {
    return {
      success: false,
      code: CDN_ERROR_CODES.TAB_CREATE_FAILED,
      error: err.message || CDN_ERROR_MESSAGES[CDN_ERROR_CODES.TAB_CREATE_FAILED],
    };
  }
}

/**
 * Maps background / API error strings to standard CDN_ERROR_CODES.
 * 
 * @param {string} error
 * @returns {string}
 */
function mapApiError(error) {
  switch (error) {
    case 'API_RATE_LIMIT':
    case 'RATE_LIMIT':
    case 'ERR_RATE_LIMITED':
      return CDN_ERROR_CODES.RATE_LIMITED;
    case 'TWEET_INACCESSIBLE':
    case 'NOT_FOUND':
    case 'ERR_TWEET_NOT_FOUND':
    case 'ERR_AGE_RESTRICTED':
      return CDN_ERROR_CODES.TWEET_INACCESSIBLE;
    case 'API_TIMEOUT':
    case 'TIMEOUT':
    case 'ERR_NETWORK_TIMEOUT':
      return CDN_ERROR_CODES.NETWORK_TIMEOUT;
    case 'NO_MEDIA':
    case 'ERR_NO_MEDIA':
      return CDN_ERROR_CODES.NO_MEDIA;
    default:
      return CDN_ERROR_CODES.NETWORK_ERROR;
  }
}
