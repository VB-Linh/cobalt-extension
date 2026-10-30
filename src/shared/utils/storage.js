// src/shared/utils/storage.js
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants/index.js';

/**
 * Lấy cấu hình tiện ích từ chrome.storage.local
 * Tự động hợp nhất với DEFAULT_SETTINGS để đảm bảo luôn đủ các trường dữ liệu
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = data?.[STORAGE_KEYS.SETTINGS];
    return { ...DEFAULT_SETTINGS, ...(stored || {}) };
  } catch (error) {
    console.error('[X Video Tools] Không thể đọc cấu hình từ storage:', error);
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
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: merged,
    });
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
    await chrome.storage.local.remove(STORAGE_KEYS.SETTINGS);
  } catch (error) {
    console.error('[X Video Tools] Lỗi khi xóa settings:', error);
    throw error;
  }
}
