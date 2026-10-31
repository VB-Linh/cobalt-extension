// src/shared/constants/index.js

/**
 * Khóa lưu trữ trong chrome.storage.local và chrome.storage.session
 */
export const STORAGE_KEYS = Object.freeze({
  SETTINGS: 'xvt_settings',
  JWT_SESSION: 'cobalt_jwt_session',
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
  COBALT_DOWNLOAD: 'COBALT_DOWNLOAD',
  OPEN_CDN: 'OPEN_CDN',
  GET_SETTINGS: 'GET_SETTINGS',
  TEST_CONNECTION: 'TEST_CONNECTION',
  VERIFY_SESSION: 'VERIFY_SESSION',
  GET_SESSION_STATUS: 'GET_SESSION_STATUS',
  CLEAR_SESSION: 'CLEAR_SESSION',
});

/**
 * Trạng thái xác thực phiên làm việc Turnstile / Session
 */
export const AUTH_STATES = Object.freeze({
  REACHABLE: 'reachable',
  TURNSTILE_REQUIRED: 'turnstile_required',
  WAITING_VERIFICATION: 'waiting_verification',
  AUTHENTICATED: 'authenticated',
  EXPIRED: 'expired',
  FAILED: 'failed',
});

/**
 * Phiên bản Cobalt API tham chiếu và Host CDN
 */
export const COBALT_VERSION = '11.7.1';
export const TWIMG_CDN_HOST = 'video.twimg.com';
