// tests/constants.test.js
import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, STORAGE_KEYS, MESSAGE_ACTIONS } from '../src/shared/constants/index.js';

describe('Kiểm thử Hằng Số Cấu Hình Shared', () => {
  it('STORAGE_KEYS phải bất biến và có key SETTINGS chuẩn', () => {
    expect(STORAGE_KEYS).toBeDefined();
    expect(STORAGE_KEYS.SETTINGS).toBe('xvt_settings');
    expect(Object.isFrozen(STORAGE_KEYS)).toBe(true);
  });

  it('DEFAULT_SETTINGS phải an toàn, đúng cấu trúc và bất biến', () => {
    expect(DEFAULT_SETTINGS).toBeDefined();
    expect(DEFAULT_SETTINGS.cobaltUrl).toBe('');
    expect(DEFAULT_SETTINGS.videoQuality).toBe('1080');
    expect(DEFAULT_SETTINGS.apiKey).toBe('');
    expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true);
  });

  it('MESSAGE_ACTIONS phải định nghĩa đủ các hành động nghiệp vụ giữa các thành phần', () => {
    expect(MESSAGE_ACTIONS).toBeDefined();
    expect(MESSAGE_ACTIONS.DOWNLOAD_VIDEO).toBe('DOWNLOAD_VIDEO');
    expect(MESSAGE_ACTIONS.OPEN_CDN).toBe('OPEN_CDN');
    expect(MESSAGE_ACTIONS.GET_SETTINGS).toBe('GET_SETTINGS');
    expect(Object.isFrozen(MESSAGE_ACTIONS)).toBe(true);
  });
});
