// src/background/handlers/tabOpener.js
import { isValidTwimgCdnUrl } from '../../content/cdn/cdnValidator.js';

/**
 * Validates a CDN URL and opens it in a new browser tab via chrome.tabs.create.
 * Strictly blocks invalid URLs, spoofed hostnames, blob:, and Cobalt proxy URLs.
 * 
 * @param {string} url - Validated twimg CDN URL
 * @returns {Promise<{ success: boolean, tabId?: number, url?: string, error?: string, message?: string }>}
 */
export async function handleOpenTab(url) {
  if (!isValidTwimgCdnUrl(url)) {
    return {
      success: false,
      error: 'ERR_INVALID_URL',
      message: 'URL CDN không hợp lệ hoặc không an toàn',
    };
  }

  try {
    const tab = await chrome.tabs.create({ url });
    return {
      success: true,
      tabId: tab?.id,
      url,
    };
  } catch (err) {
    return {
      success: false,
      error: 'TAB_CREATE_FAILED',
      message: err.message || 'Không thể mở tab mới',
    };
  }
}

/**
 * Alias for handleOpenTab.
 */
export const openCdnTab = handleOpenTab;
