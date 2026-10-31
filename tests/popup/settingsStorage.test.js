// tests/popup/settingsStorage.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSettings, saveSettings, clearSettings } from '../../src/shared/utils/storage.js';
import {
  normalizeCobaltUrl,
  extractOriginPattern,
  validateCobaltUrl,
} from '../../src/shared/utils/urlHelper.js';
import { handleSaveInstance, setupApiKeyToggle } from '../../src/popup/popup.js';
import { requestCobalt } from '../../src/background/clients/cobaltClient.js';
import { DEFAULT_SETTINGS } from '../../src/shared/constants/index.js';

describe('Group B: Configuration & Storage Tests (Tests 9–16)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearSettings();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearSettings();
  });

  it('Test 9: Saving and loading Cobalt API configuration with chrome.storage.local', async () => {
    const configToSave = {
      cobaltUrl: 'https://cobalt.io',
      apiKey: 'sec123',
      videoQuality: 'max',
    };

    const saved = await saveSettings(configToSave);
    expect(saved.cobaltUrl).toBe('https://cobalt.io');
    expect(saved.apiKey).toBe('sec123');
    expect(saved.videoQuality).toBe('max');

    const loaded = await getSettings();
    expect(loaded).toEqual({
      cobaltUrl: 'https://cobalt.io',
      apiKey: 'sec123',
      videoQuality: 'max',
    });
  });

  it('Test 10: URL normalization and whitespace trimming (stripping trailing slashes, lowercasing protocol/host)', () => {
    const raw1 = '  https://cobalt.io/  ';
    expect(normalizeCobaltUrl(raw1)).toBe('https://cobalt.io');

    const raw2 = 'HTTP://MY-SERVER:8080///';
    expect(normalizeCobaltUrl(raw2)).toBe('http://my-server:8080');

    const raw3 = 'https://sub.domain.com/path/api///';
    expect(normalizeCobaltUrl(raw3)).toBe('https://sub.domain.com/path/api');
  });

  it('Test 11: Origin pattern extraction for host permissions (specific origin pattern, not blanket *://*/*)', () => {
    const url1 = 'https://cobalt.domain.org:8443/api';
    const pattern1 = extractOriginPattern(url1);
    expect(pattern1).toBe('https://cobalt.domain.org:8443/*');
    expect(pattern1).not.toBe('*://*/*');
    expect(pattern1).not.toBe('<all_urls>');

    const url2 = 'http://192.168.1.10:9000';
    const pattern2 = extractOriginPattern(url2);
    expect(pattern2).toBe('http://192.168.1.10:9000/*');
  });

  it('Test 12: optional_host_permissions request flow: checks contains, requests origin, handles grant and deny', async () => {
    // Case 1: Permission not yet contained, user GRANTS permission
    const containsSpy = vi.spyOn(chrome.permissions, 'contains').mockResolvedValue(false);
    const requestSpy = vi.spyOn(chrome.permissions, 'request').mockResolvedValue(true);

    const resGranted = await handleSaveInstance('https://cobalt.granted.com', 'key-123', 'max');

    expect(containsSpy).toHaveBeenCalledWith({ origins: ['https://cobalt.granted.com/*'] });
    expect(requestSpy).toHaveBeenCalledWith({ origins: ['https://cobalt.granted.com/*'] });
    expect(resGranted.success).toBe(true);

    const saved = await getSettings();
    expect(saved.cobaltUrl).toBe('https://cobalt.granted.com');

    // Case 2: Permission not yet contained, user DENIES permission
    containsSpy.mockResolvedValue(false);
    requestSpy.mockResolvedValue(false);

    const resDenied = await handleSaveInstance('https://cobalt.denied.com', 'key-456', 'max');

    expect(resDenied.success).toBe(false);
    expect(resDenied.error).toBe('PERMISSION_DENIED');
  });

  it('Test 13: API Key masking and unmasking toggle in UI (type toggles between password and text)', () => {
    const input = document.createElement('input');
    input.id = 'apiKey';
    input.type = 'password';
    input.value = 'secret-api-key-value-123';

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggleApiKey';
    toggleBtn.textContent = '👁';

    setupApiKeyToggle(input, toggleBtn);

    // Initial state
    expect(input.type).toBe('password');

    // Click 1: unmask
    toggleBtn.click();
    expect(input.type).toBe('text');
    expect(input.value).toBe('secret-api-key-value-123'); // Value uncorrupted

    // Click 2: re-mask
    toggleBtn.click();
    expect(input.type).toBe('password');
    expect(input.value).toBe('secret-api-key-value-123');
  });

  it('Test 14: Invalid URL protocol and malformed input rejection (rejects javascript, data, ftp, malformed)', () => {
    expect(validateCobaltUrl('javascript:alert(1)')).toMatchObject({
      valid: false,
      error: 'INVALID_PROTOCOL',
    });

    expect(validateCobaltUrl('data:text/html;base64,123')).toMatchObject({
      valid: false,
      error: 'INVALID_PROTOCOL',
    });

    expect(validateCobaltUrl('ftp://cobalt.server/files')).toMatchObject({
      valid: false,
      error: 'INVALID_PROTOCOL',
    });

    expect(validateCobaltUrl('not_a_url_at_all')).toMatchObject({
      valid: false,
      error: 'MALFORMED_URL',
    });

    // Valid URLs
    expect(validateCobaltUrl('https://valid.cobalt.tools').valid).toBe(true);
    expect(validateCobaltUrl('http://localhost:9000').valid).toBe(true);
  });

  it('Test 15: Empty configuration handling: detects missing URL immediately without issuing network fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await requestCobalt({
      apiUrl: '',
      url: 'https://x.com/user/status/12345',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe('UNCONFIGURED');
  });

  it('Test 16: Storage migration & defensive fallback (recovers gracefully from corrupted storage)', async () => {
    // Inject corrupted null or non-object in mock storage
    vi.spyOn(chrome.storage.local, 'get').mockResolvedValueOnce({
      xvt_settings: null,
    });

    const settingsNull = await getSettings();
    expect(settingsNull).toEqual(DEFAULT_SETTINGS);

    vi.spyOn(chrome.storage.local, 'get').mockRejectedValueOnce(new Error('Storage disk I/O failure'));

    const settingsError = await getSettings();
    expect(settingsError).toEqual(DEFAULT_SETTINGS);
  });
});
