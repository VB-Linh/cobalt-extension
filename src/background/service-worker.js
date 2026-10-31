// src/background/service-worker.js
import { MESSAGE_ACTIONS } from '../shared/constants/index.js';
import { getSettings } from '../shared/utils/storage.js';
import { extractOriginPattern } from '../shared/utils/urlHelper.js';
import { fetchTweetSyndication } from './handlers/syndicationHandler.js';
import { handleOpenTab } from './handlers/tabOpener.js';
import { requestCobalt, checkServerHealth } from './clients/cobaltClient.js';
import { handleCobaltResponse, classifyCobaltError, matchPickerItem } from './handlers/cobaltResponseHandler.js';
import { initiateDownload } from './downloads/downloadManager.js';
import { requestSession } from './clients/sessionClient.js';
import { saveSessionToken, getSessionToken, clearSessionToken, getSessionStatus } from './auth/jwtManager.js';

console.log('[X Video Tools] Background Service Worker (ESM) đã khởi động.');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const action = message?.action || message?.type;

  // 1. Fetch Twitter Syndication Tweet Metadata (Phase 3)
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

  // 2. Open Validated Twimg CDN Tab (Phase 3)
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

  // 3. Settings Query
  if (action === MESSAGE_ACTIONS.GET_SETTINGS || action === 'GET_SETTINGS') {
    getSettings()
      .then((settings) => {
        sendResponse({
          success: true,
          data: {
            cobaltUrl: settings.cobaltUrl || '',
            hasApiKey: Boolean(settings.apiKey),
            videoQuality: settings.videoQuality || 'max',
            status: settings.cobaltUrl ? 'Configured' : 'Unconfigured',
          },
        });
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: 'STORAGE_ERROR',
          message: err.message,
        });
      });
    return true;
  }

  // 4. Test Connection with Cobalt Instance
  if (action === MESSAGE_ACTIONS.TEST_CONNECTION || action === 'TEST_CONNECTION' || action === 'XVT_TEST_CONNECTION') {
    const payload = message.payload || message;
    const apiUrl = payload.apiUrl;
    const apiKey = payload.apiKey || '';

    checkServerHealth(apiUrl, apiKey)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({
        healthy: false,
        success: false,
        error: 'TEST_FAILED',
        message: err.message || 'Lỗi khi kiểm tra kết nối',
      }));
    return true;
  }

  // 5. Verify Turnstile Session (Phase 4 Session Auth)
  if (action === MESSAGE_ACTIONS.VERIFY_SESSION || action === 'VERIFY_SESSION') {
    const payload = message.payload || message;
    const { instanceUrl, turnstileResponse } = payload;

    requestSession(instanceUrl, turnstileResponse)
      .then(async (sessionRes) => {
        if (!sessionRes.success) {
          return sendResponse(sessionRes);
        }

        // Save validated token to chrome.storage.session
        await saveSessionToken(instanceUrl, sessionRes.token, sessionRes.exp);
        sendResponse({
          success: true,
          exp: sessionRes.exp,
          message: 'Xác thực phiên làm việc thành công!',
        });
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: 'SESSION_VERIFY_EXCEPTION',
          message: err.message || 'Lỗi ngoại lệ khi gửi xác thực phiên.',
        });
      });
    return true;
  }

  // 6. Get Session Status
  if (action === MESSAGE_ACTIONS.GET_SESSION_STATUS || action === 'GET_SESSION_STATUS') {
    const payload = message.payload || message;
    const instanceUrl = payload?.instanceUrl || '';

    getSessionStatus(instanceUrl)
      .then((status) => sendResponse({ success: true, ...status }))
      .catch((err) => sendResponse({ success: false, error: 'STATUS_ERROR', message: err.message }));
    return true;
  }

  // 7. Clear Session Token
  if (action === MESSAGE_ACTIONS.CLEAR_SESSION || action === 'CLEAR_SESSION') {
    clearSessionToken()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: 'CLEAR_ERROR', message: err.message }));
    return true;
  }

  // 8. Download Video via Cobalt API (Phase 4)
  if (
    action === MESSAGE_ACTIONS.DOWNLOAD_VIDEO ||
    action === MESSAGE_ACTIONS.COBALT_DOWNLOAD ||
    action === 'COBALT_DOWNLOAD' ||
    action === 'XVT_COBALT_DOWNLOAD'
  ) {
    const payload = message.payload || message;
    const { tweetId, permalink, username, videoKey, correlationId = `req_${Date.now()}`, selectedUrl, mediaIndex, mediaFingerprint } = payload;
    const tabId = sender.tab?.id;

    (async () => {
      try {
        // Direct media download if pre-selected from picker
        if (selectedUrl) {
          const downloadRes = await initiateDownload(videoKey, {
            url: selectedUrl,
            tweetId,
            username,
            correlationId,
            tabId,
          });
          return sendResponse(downloadRes);
        }

        // Read stored configuration
        const settings = await getSettings();
        if (!settings.cobaltUrl) {
          return sendResponse({
            success: false,
            error: 'UNCONFIGURED',
            message: 'Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.',
          });
        }

        // Validate origin host permissions
        const originPattern = extractOriginPattern(settings.cobaltUrl);
        if (originPattern && chrome.permissions?.contains) {
          const hasPermission = await chrome.permissions.contains({ origins: [originPattern] });
          if (!hasPermission) {
            return sendResponse({
              success: false,
              error: 'PERMISSION_REQUIRED',
              message: 'Cần cấp quyền truy cập máy chủ Cobalt trong cài đặt tiện ích.',
            });
          }
        }

        // Request Cobalt processing
        const targetUrl = permalink || (tweetId ? `https://x.com/i/status/${tweetId}` : '');
        if (!targetUrl) {
          return sendResponse({
            success: false,
            error: 'MISSING_URL',
            message: 'Thiếu đường dẫn bài viết cần tải.',
          });
        }

        let sessionToken = '';
        if (!settings.apiKey) {
          sessionToken = (await getSessionToken(settings.cobaltUrl)) || '';
        }

        const cobaltRes = await requestCobalt({
          url: targetUrl,
          apiUrl: settings.cobaltUrl,
          apiKey: settings.apiKey,
          sessionToken,
          videoQuality: settings.videoQuality || 'max',
        });

        if (!cobaltRes.success) {
          console.error('[X Video Tools] Cobalt API request failed:', {
            correlationId,
            error: cobaltRes.error,
            code: cobaltRes.code,
            message: cobaltRes.message,
            targetUrl,
            apiUrl: settings.cobaltUrl,
            details: cobaltRes.details,
          });
          const classified = classifyCobaltError(cobaltRes.raw || cobaltRes, settings.cobaltUrl);
          return sendResponse({
            success: false,
            error: classified.code || cobaltRes.error,
            code: classified.code || cobaltRes.code,
            rawCode: classified.rawCode || cobaltRes.code,
            message: classified.message || cobaltRes.message || 'Lỗi khi kết nối Cobalt API.',
            retryAfter: cobaltRes.retryAfter,
          });
        }

        // Classify response
        const handled = handleCobaltResponse(cobaltRes.raw || cobaltRes);
        if (!handled.success) {
          console.error('[X Video Tools] Cobalt response parsing failed:', {
            correlationId,
            error: handled.error,
            message: handled.message,
          });
          return sendResponse(handled);
        }

        // Multi-media picker response: resolve deterministically for this specific video element
        if (handled.type === 'PICKER') {
          const matchedItem = matchPickerItem(handled.items, { mediaIndex, mediaFingerprint });
          if (matchedItem && matchedItem.url) {
            const downloadRes = await initiateDownload(videoKey, {
              url: matchedItem.url,
              tweetId,
              username,
              correlationId,
              tabId,
            });
            return sendResponse(downloadRes);
          }

          return sendResponse({
            success: true,
            status: 'picker',
            type: 'PICKER',
            items: handled.items,
            totalItems: handled.totalItems,
            correlationId,
          });
        }

        // Download stream ready (redirect or tunnel)
        // Omit custom filename override so Chrome preserves last-used directory in Save As dialog
        const downloadRes = await initiateDownload(videoKey, {
          url: handled.downloadUrl,
          tweetId,
          username,
          correlationId,
          tabId,
        });

        sendResponse(downloadRes);
      } catch (err) {
        console.error('[X Video Tools] Unhandled error in COBALT_DOWNLOAD:', {
          correlationId,
          error: err.message,
          stack: err.stack,
        });
        sendResponse({
          success: false,
          error: 'DOWNLOAD_ERROR',
          message: err.message || 'Lỗi không xác định trong quá trình tải video.',
        });
      }
    })();

    return true; // Keep async response channel open
  }

  return false;
});
