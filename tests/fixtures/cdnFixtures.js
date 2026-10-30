// tests/fixtures/cdnFixtures.js

/**
 * Creates a mock Twitter video variant object.
 * 
 * @param {object} [options={}]
 * @param {number} [options.width=1280]
 * @param {number} [options.height=720]
 * @param {number} [options.bitrate=2176000]
 * @param {string} [options.contentType='video/mp4']
 * @param {string} [options.tag='14']
 * @param {string} [options.pathType='amplify_video']
 * @param {string} [options.mediaId='1800000000000000001']
 * @returns {object}
 */
export function createMockVariant(options = {}) {
  const {
    width = 1280,
    height = 720,
    bitrate = 2176000,
    contentType = 'video/mp4',
    tag = '14',
    pathType = 'amplify_video',
    mediaId = '1800000000000000001',
    customUrl = null,
  } = options;

  if (customUrl) {
    return {
      bitrate,
      content_type: contentType,
      url: customUrl,
    };
  }

  if (contentType === 'application/x-mpegURL' || contentType === 'application/vnd.apple.mpegurl') {
    return {
      bitrate: 0,
      content_type: contentType,
      url: `https://video.twimg.com/${pathType}/${mediaId}/pl/stream.m3u8?tag=${tag}`,
    };
  }

  const resSlug = width && height ? `${width}x${height}/` : '';
  const url = `https://video.twimg.com/${pathType}/${mediaId}/vid/avc1/${resSlug}vid.mp4?tag=${tag}`;

  return {
    bitrate,
    content_type: contentType,
    url,
  };
}

/**
 * Creates a mock Twitter Syndication API response JSON object.
 * 
 * @param {object} [options={}]
 * @param {string} [options.tweetId='1800000000000000000']
 * @param {Array<object>} [options.variants]
 * @param {string} [options.type='video'] - 'video' | 'animated_gif' | 'photo' | 'mixed'
 * @param {number} [options.mediaCount=1]
 * @param {boolean} [options.isTombstone=false]
 * @returns {object}
 */
export function createMockSyndicationResponse(options = {}) {
  const {
    tweetId = '1800000000000000000',
    variants = null,
    type = 'video',
    mediaCount = 1,
    isTombstone = false,
  } = options;

  if (isTombstone) {
    return {
      __typename: 'TweetTombstone',
      tombstone: {
        text: {
          text: 'This tweet is unavailable.',
        },
      },
    };
  }

  const defaultVariants = variants || [
    createMockVariant({ width: 640, height: 360, bitrate: 288000, mediaId: tweetId }),
    createMockVariant({ width: 1280, height: 720, bitrate: 2176000, mediaId: tweetId }),
    createMockVariant({ width: 1920, height: 1080, bitrate: 4500000, mediaId: tweetId }),
  ];

  const mediaDetails = [];

  for (let i = 0; i < mediaCount; i++) {
    const itemIndex = i + 1;
    const mediaIdStr = `${tweetId}${itemIndex}`;

    if (type === 'photo') {
      mediaDetails.push({
        type: 'photo',
        media_url_https: `https://pbs.twimg.com/media/thumb_${mediaIdStr}.jpg`,
        id_str: mediaIdStr,
      });
    } else if (type === 'mixed' && i === 0) {
      mediaDetails.push({
        type: 'photo',
        media_url_https: `https://pbs.twimg.com/media/photo_${mediaIdStr}.jpg`,
        id_str: mediaIdStr,
      });
    } else {
      const itemVariants = variants || [
        createMockVariant({ width: 640, height: 360, bitrate: 288000, mediaId: mediaIdStr }),
        createMockVariant({ width: 1280, height: 720, bitrate: 2176000, mediaId: mediaIdStr }),
        createMockVariant({ width: 1920, height: 1080, bitrate: 4500000, mediaId: mediaIdStr }),
      ];

      mediaDetails.push({
        type: type === 'animated_gif' ? 'animated_gif' : 'video',
        id_str: mediaIdStr,
        media_url_https: `https://pbs.twimg.com/amplify_video_thumb/${mediaIdStr}/img/thumb.jpg`,
        video_info: {
          aspect_ratio: [16, 9],
          duration_millis: 15000,
          variants: itemVariants,
        },
      });
    }
  }

  return {
    __typename: 'Tweet',
    id_str: String(tweetId),
    text: 'Mock tweet text for CDN testing',
    mediaDetails,
  };
}

/**
 * Creates an HTMLVideoElement configured for testing in Happy DOM.
 * 
 * @param {object} [options={}]
 * @param {string} [options.src]
 * @param {string} [options.currentSrc]
 * @param {string} [options.poster]
 * @param {Array<{ src: string, type?: string }>} [options.sources]
 * @returns {HTMLVideoElement}
 */
export function createVideoWithSources(options = {}) {
  const video = document.createElement('video');

  if (options.src !== undefined) {
    video.src = options.src;
    video.setAttribute('src', options.src);
  }

  if (options.poster !== undefined) {
    video.poster = options.poster;
    video.setAttribute('poster', options.poster);
  }

  if (options.currentSrc !== undefined) {
    Object.defineProperty(video, 'currentSrc', {
      value: options.currentSrc,
      writable: true,
      configurable: true,
    });
  }

  if (Array.isArray(options.sources)) {
    for (const s of options.sources) {
      const sourceEl = document.createElement('source');
      if (s.src) {
        sourceEl.src = s.src;
        sourceEl.setAttribute('src', s.src);
      }
      if (s.type) {
        sourceEl.type = s.type;
        sourceEl.setAttribute('type', s.type);
      }
      video.appendChild(sourceEl);
    }
  }

  return video;
}
