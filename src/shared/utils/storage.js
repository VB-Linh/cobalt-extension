// src/shared/utils/storage.js
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants/index.js';

let cachedSettings = { ...DEFAULT_SETTINGS };

/**
 * Checks synchronously whether a Cobalt URL is configured in memory cache.
 * @returns {boolean}
 */
export function isCobaltConfigured() {
  return Boolean(cachedSettings?.cobaltUrl && cachedSettings.cobaltUrl.trim());
}

/**
 * Updates memory cache of settings.
 * @param {object} settings
 */
export function setCachedSettings(settings) {
  cachedSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

/**
 * Returns current cached settings synchronously.
 * @returns {object}
 */
export function getCachedSettings() {
  return { ...cachedSettings };
}

/**
 * Lấy cấu hình tiện ích từ chrome.storage.local
 * Tự động hợp nhất với DEFAULT_SETTINGS để đảm bảo luôn đủ các trường dữ liệu
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local?.get) {
      const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const stored = data?.[STORAGE_KEYS.SETTINGS];
      const merged = { ...DEFAULT_SETTINGS, ...(stored || {}) };
      cachedSettings = merged;
      return merged;
    }
    return { ...cachedSettings };
  } catch (error) {
    console.error('[X Video Tools] Không thể đọc cấu hình từ storage:', error);
    cachedSettings = { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Lưu cấu hình tiện ích vào chrome.storage.local
 * @param {Object} settings - Đối tượng cấu hình cần lưu
 * @returns {Promise<Object>} Cấu hình sau khi lưu
 */
export async function saveSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new TypeError('Settings phải là một đối tượng hợp lệ.');
  }
  try {
    const current = await getSettings();
    const merged = { ...current, ...settings };
    if (typeof chrome !== 'undefined' && chrome?.storage?.local?.set) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: merged,
      });
    }
    cachedSettings = merged;
    return merged;
  } catch (error) {
    console.error('[X Video Tools] Lỗi khi lưu settings:', error);
    throw error;
  }
}

/**
 * Xóa cấu hình tiện ích khỏi chrome.storage.local
 * @returns {Promise<void>}
 */
export async function clearSettings() {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local?.remove) {
      await chrome.storage.local.remove(STORAGE_KEYS.SETTINGS);
    }
    cachedSettings = { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error('[X Video Tools] Lỗi khi xóa settings:', error);
    throw error;
  }
}

// Auto-sync cachedSettings with chrome.storage.local in browser environments
if (typeof chrome !== 'undefined' && chrome?.storage?.local?.get) {
  getSettings().catch(() => {});

  if (chrome?.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
        const newVal = changes[STORAGE_KEYS.SETTINGS].newValue;
        cachedSettings = { ...DEFAULT_SETTINGS, ...(newVal || {}) };
      }
    });
  }
}
