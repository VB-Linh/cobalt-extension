// src/background/handlers/syndicationHandler.js

/**
 * Pure mathematical derivation of dynamic ephemeral token for Twitter Syndication API.
 * Matches Twitter's embedded web widget implementation.
 * Zero external API keys, zero storage in chrome.storage.
 * 
 * @param {string|number} tweetId
 * @returns {string} Base-36 alphanumeric token string, or empty string on invalid input
 */
export function calculateSyndicationToken(tweetId) {
  if (!tweetId) {
    return '';
  }
  const strId = String(tweetId).trim();
  if (!/^\d+$/.test(strId)) {
    return '';
  }
  const numericId = Number(strId);
  if (isNaN(numericId) || numericId <= 0) {
    return '';
  }
  return ((numericId / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

/**
 * Alias for calculateSyndicationToken.
 */
export const generateSyndicationToken = calculateSyndicationToken;

/**
 * Extracts all video entities from Syndication API response.
 * Filters out static photos.
 * 
 * @param {object} data - Tweet result JSON object
 * @returns {Array<object>} Array of video media objects
 */
export function extractVideosFromSyndication(data) {
  if (!data || !Array.isArray(data.mediaDetails)) {
    return [];
  }
  return data.mediaDetails.filter((item) => {
    return item && (item.type === 'video' || item.type === 'animated_gif' || Boolean(item.video_info?.variants));
  });
}

/**
 * Parses and returns all valid MP4 variants from a Syndication API response.
 * Returns error object if no media found.
 * 
 * @param {object} data
 * @returns {Array<object> | { success: false, error: string, message: string }}
 */
export function parseSyndicationMedia(data) {
  if (!data || !Array.isArray(data.mediaDetails) || data.mediaDetails.length === 0) {
    return { success: false, error: 'NO_MEDIA', message: 'Bài viết không chứa dữ liệu video' };
  }

  const videos = extractVideosFromSyndication(data);
  if (videos.length === 0) {
    return { success: false, error: 'NO_MEDIA', message: 'Bài viết không chứa dữ liệu video' };
  }

  // Collect all valid MP4 variants across video items
  const allVariants = [];
  for (const video of videos) {
    if (Array.isArray(video.video_info?.variants)) {
      for (const v of video.video_info.variants) {
        if (v && v.url && v.content_type === 'video/mp4') {
          allVariants.push({
            content_type: v.content_type,
            bitrate: v.bitrate !== undefined ? Number(v.bitrate) : undefined,
            url: v.url,
          });
        }
      }
    }
  }

  return allVariants;
}

/**
 * Fetches tweet metadata from Twitter's public Syndication API with timeout and error handling.
 * 
 * @param {string} tweetId - Snowflake numeric tweet ID
 * @param {object} [options={}]
 * @param {number} [options.timeout=10000] - Timeout in milliseconds
 * @returns {Promise<{ success: boolean, data?: object, mediaDetails?: Array, error?: string, message?: string, status?: number }>}
 */
export async function fetchTweetSyndication(tweetId, options = {}) {
  const timeoutMs = typeof options.timeout === 'number' ? options.timeout : 10000;
  const token = calculateSyndicationToken(tweetId);

  if (!token) {
    return {
      success: false,
      error: 'INVALID_TWEET_ID',
      message: 'Mã số bài viết (Tweet ID) không hợp lệ',
    };
  }

  const endpoint = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(tweetId)}&token=${token}&lang=en`;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.status === 429) {
      return {
        success: false,
        error: 'API_RATE_LIMIT',
        status: 429,
        message: 'Bị giới hạn tần suất truy vấn từ X (Rate limited)',
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        error: 'TWEET_INACCESSIBLE',
        status: 404,
        message: 'Tweet không tồn tại hoặc bị giới hạn quyền riêng tư',
      };
    }

    if (response.status === 403) {
      return {
        success: false,
        error: 'TWEET_INACCESSIBLE',
        status: 403,
        message: 'Tweet không tồn tại hoặc bị giới hạn quyền riêng tư',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: 'HTTP_ERROR',
        status: response.status,
        message: `Lỗi kết nối máy chủ (${response.status})`,
      };
    }

    const data = await response.json();

    // Check for tombstones (deleted, suspended, or age-restricted tweets)
    if (data?.tombstone || data?.errors || data?.__typename === 'TweetTombstone') {
      return {
        success: false,
        error: 'TWEET_INACCESSIBLE',
        message: 'Tweet không tồn tại hoặc bị giới hạn quyền riêng tư',
      };
    }

    return {
      success: true,
      data,
      mediaDetails: data?.mediaDetails || [],
    };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('timeout')) {
      return {
        success: false,
        error: 'API_TIMEOUT',
        message: 'Hết thời gian chờ phản hồi từ máy chủ X',
      };
    }
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: err.message || 'Lỗi kết nối mạng',
    };
  }
}
