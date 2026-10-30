// src/content/detection/constants.js

/**
 * DOM Selectors for Twitter/X video and tweet container detection
 */
export const SELECTORS = Object.freeze({
  TWEET_ARTICLE: 'article[data-testid="tweet"]',
  TIME_ELEMENT: 'time',
  STATUS_ANCHOR: 'a[href*="/status/"], a[href*="/statuses/"]',
  VIDEO_TAG: 'video',
  VIDEO_PLAYER: '[data-testid="videoPlayer"], [data-testid="videoComponent"]',

  // Quoted tweet card selectors
  QUOTE_CONTAINER: '[data-testid="quoteTweet"], [data-testid="tweetQuote"], div[role="link"][tabindex="0"]',

  // Excluded contexts (composer, sidebar, DMs)
  EXCLUDED_COMPOSER: '[data-testid="tweetButtonInline"], [data-testid="tweetTextarea_0"]',
  EXCLUDED_SIDEBAR: '[data-testid="sidebarColumn"], aside',
  EXCLUDED_DM: '[data-testid="messageEntry"]',
});

/**
 * Regex patterns for status URL extraction, normalization, and validation
 */
export const REGEX = Object.freeze({
  // Matches /status/:id or /statuses/:id
  TWEET_ID: /(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,

  // Matches official /video/:index or /photo/:index (1-based index)
  MEDIA_INDEX: /(?:status|statuses)\/\d+\/(?:video|photo)\/(\d+)(?=[/?#]|$)/i,

  // Matches status URL pattern including twitter.com, x.com, or relative paths
  STATUS_URL: /^(?:https?:\/\/(?:(?:www\.|mobile\.)?(?:twitter|x)\.com))?\/([^/?#]+)\/(?:status|statuses)\/(\d+)(?=[/?#]|$)/i,

  // Validates numeric Tweet ID
  NUMERIC_ID: /^\d+$/,
});
