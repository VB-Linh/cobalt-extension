// src/background/service-worker.js
import { MESSAGE_ACTIONS } from '../shared/constants/index.js';
import { fetchTweetSyndication } from './handlers/syndicationHandler.js';
import { handleOpenTab } from './handlers/tabOpener.js';

console.log('[X Video Tools] Background Service Worker (ESM) đã khởi động.');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const action = message?.action || message?.type;

  // 1. Fetch Twitter Syndication Tweet Metadata
  if (action === 'FETCH_SYNDICATION' || action === 'XVT_FETCH_SYNDICATION') {
    const tweetId = message.payload?.tweetId || message.tweetId;
    fetchTweetSyndication(tweetId, message.options)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({
        success: false,
        error: 'INTERNAL_ERROR',
        message: err.message || 'Lỗi xử lý nội bộ Service Worker',
      }));
    return true; // Keep async response channel open
  }

  // 2. Open Validated Twimg CDN Tab
  if (
    action === 'OPEN_CDN' ||
    action === 'OPEN_TAB' ||
    action === 'XVT_OPEN_TAB' ||
    action === MESSAGE_ACTIONS.OPEN_CDN
  ) {
    const url = message.payload?.url || message.url;
    handleOpenTab(url)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({
        success: false,
        error: 'INTERNAL_ERROR',
        message: err.message || 'Lỗi xử lý mở tab mới',
      }));
    return true; // Keep async response channel open
  }

  // 3. Settings query
  if (action === MESSAGE_ACTIONS.GET_SETTINGS) {
    sendResponse({ success: true, data: { status: 'Phase 3 Active' } });
    return false;
  }

  return false;
});
