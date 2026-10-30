// src/shared/constants/index.js

/**
 * Khóa lưu trữ trong chrome.storage.local
 */
export const STORAGE_KEYS = Object.freeze({
  SETTINGS: 'xvt_settings',
});

/**
 * Cấu hình mặc định của tiện ích
 */
export const DEFAULT_SETTINGS = Object.freeze({
  cobaltUrl: '',
  videoQuality: '1080',
  apiKey: '',
});

/**
 * Danh mục hành động trao đổi Message Passing
 */
export const MESSAGE_ACTIONS = Object.freeze({
  DOWNLOAD_VIDEO: 'DOWNLOAD_VIDEO',
  OPEN_CDN: 'OPEN_CDN',
  GET_SETTINGS: 'GET_SETTINGS',
});

/**
 * Phiên bản Cobalt API tham chiếu và Host CDN
 */
export const COBALT_VERSION = '11.7.1';
export const TWIMG_CDN_HOST = 'video.twimg.com';
