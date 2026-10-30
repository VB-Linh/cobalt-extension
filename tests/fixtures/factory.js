// tests/fixtures/factory.js

/**
 * Creates a synthetic Tweet DOM article element.
 * 
 * @param {Object|string} options
 * @param {string} [options.tweetId='1700000000000000000']
 * @param {string} [options.username='testuser']
 * @param {string} [options.domain='https://x.com']
 * @param {(number|null)[]} [options.videoIndices=[null]] - Array of media indices, e.g. [1, 2] or [null]
 * @param {boolean} [options.hasPhoto=false]
 * @param {boolean} [options.isQuoted=false]
 * @param {string} [options.quotedTweetId='1799999999999999999']
 * @param {string} [options.quotedUsername='quoteduser']
 * @param {boolean} [options.incompleteHeader=false]
 * @param {string} [options.customQuery='']
 * @returns {HTMLElement}
 */
export function createTweetFixture(options = {}) {
  const opts = typeof options === 'string' ? { tweetId: options } : options;
  const {
    tweetId = '1700000000000000000',
    username = 'testuser',
    domain = 'https://x.com',
    videoIndices = [null],
    hasPhoto = false,
    isQuoted = false,
    quotedTweetId = '1799999999999999999',
    quotedUsername = 'quoteduser',
    incompleteHeader = false,
    customQuery = '',
  } = opts;

  const article = document.createElement('article');
  article.setAttribute('data-testid', 'tweet');
  article.id = `tweet-${tweetId}`;

  // Header with timestamp and canonical status link
  const header = document.createElement('div');
  header.className = 'tweet-header';

  if (!incompleteHeader) {
    const permalinkAnchor = document.createElement('a');
    permalinkAnchor.href = `${domain}/${username}/status/${tweetId}${customQuery}`;
    permalinkAnchor.setAttribute('role', 'link');

    const timeEl = document.createElement('time');
    timeEl.dateTime = new Date().toISOString();
    timeEl.textContent = '10m';

    permalinkAnchor.appendChild(timeEl);
    header.appendChild(permalinkAnchor);
  }
  article.appendChild(header);

  // Determine media container: article root or quoted tweet box
  let mediaParent = article;

  if (isQuoted) {
    const quoteCard = document.createElement('div');
    quoteCard.setAttribute('data-testid', 'quoteTweet');
    quoteCard.setAttribute('role', 'link');
    quoteCard.setAttribute('tabindex', '0');
    quoteCard.setAttribute('aria-labelledby', `quote-header-${quotedTweetId}`);

    const quoteHeader = document.createElement('div');
    quoteHeader.id = `quote-header-${quotedTweetId}`;

    const quoteAnchor = document.createElement('a');
    quoteAnchor.href = `https://x.com/${quotedUsername}/status/${quotedTweetId}`;
    quoteAnchor.setAttribute('role', 'link');

    const quoteTime = document.createElement('time');
    quoteTime.dateTime = new Date().toISOString();
    quoteTime.textContent = '1h';
    quoteAnchor.appendChild(quoteTime);

    quoteHeader.appendChild(quoteAnchor);
    quoteCard.appendChild(quoteHeader);
    article.appendChild(quoteCard);

    mediaParent = quoteCard;
  }

  // Optional photo element
  if (hasPhoto) {
    const photoContainer = document.createElement('div');
    photoContainer.setAttribute('data-testid', 'tweetPhoto');

    const photoAnchor = document.createElement('a');
    photoAnchor.href = `${domain}/${username}/status/${tweetId}/photo/1`;

    const img = document.createElement('img');
    img.src = 'https://pbs.twimg.com/media/sample.jpg';
    photoAnchor.appendChild(img);
    photoContainer.appendChild(photoAnchor);
    mediaParent.appendChild(photoContainer);
  }

  // Videos
  for (const idx of videoIndices) {
    const videoWrapper = document.createElement('div');
    videoWrapper.setAttribute('data-testid', 'videoComponent');

    let videoContainer = videoWrapper;

    if (idx !== null && idx !== undefined) {
      const mediaAnchor = document.createElement('a');
      mediaAnchor.href = `${domain}/${username}/status/${tweetId}/video/${idx}`;
      mediaAnchor.setAttribute('role', 'link');
      videoWrapper.appendChild(mediaAnchor);
      videoContainer = mediaAnchor;
    }

    const video = document.createElement('video');
    video.src = `blob:${domain}/vid-${tweetId}-${idx ?? '0'}`;
    videoContainer.appendChild(video);
    mediaParent.appendChild(videoWrapper);
  }

  return article;
}

/**
 * Helper to wait for DOM mutations and microtasks to flush.
 * @param {number} [ms=30]
 * @returns {Promise<void>}
 */
export function flushMutations(ms = 30) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
