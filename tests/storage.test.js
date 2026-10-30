// tests/storage.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSettings, saveSettings, clearSettings } from '../src/shared/utils/storage.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../src/shared/constants/index.js';

describe('Kiểm thử Utility Storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await chrome.storage.local.clear();
  });

  it('trả về cài đặt mặc định khi storage hoàn toàn trống', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('hợp nhất cài đặt đã lưu với cài đặt mặc định (defensive merge)', async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: { cobaltUrl: 'https://cobalt.custom.io' },
    });
    const settings = await getSettings();
    expect(settings).toEqual({
      cobaltUrl: 'https://cobalt.custom.io',
      videoQuality: '1080',
      apiKey: '',
    });
  });

  it('lưu cài đặt thành công vào chrome.storage.local', async () => {
    const updated = { cobaltUrl: 'https://cobalt.example.com', videoQuality: 'max', apiKey: 'test-key' };
    await saveSettings(updated);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.SETTINGS]: updated,
    });
    const stored = await getSettings();
    expect(stored).toEqual(updated);
  });

  it('xóa cài đặt thành công khỏi chrome.storage.local', async () => {
    await saveSettings({ cobaltUrl: 'https://test.com' });
    await clearSettings();
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(STORAGE_KEYS.SETTINGS);
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('từ chối lưu nếu dữ liệu đầu vào không phải object', async () => {
    await expect(saveSettings('invalid')).rejects.toThrow(TypeError);
    await expect(saveSettings(null)).rejects.toThrow(TypeError);
  });
});
