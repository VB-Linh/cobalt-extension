// tests/background/auth/jwtManager.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveSessionToken,
  getSessionToken,
  getSessionTokenSync,
  clearSessionToken,
  isSessionValid,
  getSessionStatus,
} from '../../../src/background/auth/jwtManager.js';
import { STORAGE_KEYS } from '../../../src/shared/constants/index.js';

describe('Turnstile JWT Session Manager Unit & Security Tests', () => {
  const instanceUrl = 'https://cobalt.example.com';
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockPayload.mockSignature';

  beforeEach(async () => {
    await clearSessionToken();
    vi.restoreAllMocks();
  });

  it('1. saveSessionToken: correctly calculates expiration and stores in chrome.storage.session', async () => {
    const expSeconds = 300;
    const nowSec = Math.floor(Date.now() / 1000);

    const res = await saveSessionToken(instanceUrl, mockToken, expSeconds);

    expect(res.success).toBe(true);
    expect(res.expiresAt).toBeGreaterThanOrEqual(nowSec + expSeconds - 1);
    expect(res.expiresAt).toBeLessThanOrEqual(nowSec + expSeconds + 2);

    // Verify stored in session storage
    const stored = await chrome.storage.session.get(STORAGE_KEYS.JWT_SESSION);
    const sessionObj = stored[STORAGE_KEYS.JWT_SESSION];

    expect(sessionObj).toBeDefined();
    expect(sessionObj.token).toBe(mockToken);
    expect(sessionObj.exp).toBe(res.expiresAt);
    expect(sessionObj.instanceUrl).toBe('https://cobalt.example.com');
  });

  it('2. saveSessionToken: throws TypeError if token is empty or invalid string', async () => {
    await expect(saveSessionToken(instanceUrl, '')).rejects.toThrow(TypeError);
    await expect(saveSessionToken(instanceUrl, null)).rejects.toThrow(TypeError);
    await expect(saveSessionToken(instanceUrl, 12345)).rejects.toThrow(TypeError);
  });

  it('3. getSessionToken & getSessionTokenSync: retrieves valid token for matching instance URL', async () => {
    await saveSessionToken(instanceUrl, mockToken, 300);

    const tokenAsync = await getSessionToken(instanceUrl);
    expect(tokenAsync).toBe(mockToken);

    const tokenSync = getSessionTokenSync(instanceUrl);
    expect(tokenSync).toBe(mockToken);
  });

  it('4. Instance isolation: returns null if requested instance URL does not match session instance URL', async () => {
    await saveSessionToken('https://cobalt-a.com', mockToken, 300);

    const tokenOther = await getSessionToken('https://cobalt-b.com');
    expect(tokenOther).toBeNull();

    const tokenSyncOther = getSessionTokenSync('https://cobalt-b.com');
    expect(tokenSyncOther).toBeNull();
  });

  it('5. Expiration handling: auto-clears and returns null when token has expired', async () => {
    // Save token with 1 second lifetime
    await saveSessionToken(instanceUrl, mockToken, 1);

    // Advance time by 5 seconds
    const futureSec = Math.floor(Date.now() / 1000) + 5;
    vi.spyOn(Date, 'now').mockReturnValue(futureSec * 1000);

    const token = await getSessionToken(instanceUrl);
    expect(token).toBeNull();

    const isValid = await isSessionValid(instanceUrl);
    expect(isValid).toBe(false);

    // Verify session storage is cleared
    const stored = await chrome.storage.session.get(STORAGE_KEYS.JWT_SESSION);
    expect(stored[STORAGE_KEYS.JWT_SESSION]).toBeUndefined();
  });

  it('6. clearSessionToken: removes token cleanly from memory and storage', async () => {
    await saveSessionToken(instanceUrl, mockToken, 300);
    expect(await isSessionValid(instanceUrl)).toBe(true);

    await clearSessionToken();

    expect(await isSessionValid(instanceUrl)).toBe(false);
    expect(await getSessionToken(instanceUrl)).toBeNull();
  });

  it('7. getSessionStatus: returns safe status metadata without exposing raw JWT', async () => {
    await saveSessionToken(instanceUrl, mockToken, 180);

    const status = await getSessionStatus(instanceUrl);

    expect(status.authenticated).toBe(true);
    expect(status.expired).toBe(false);
    expect(status.expiresIn).toBeGreaterThan(0);
    expect(status.instanceUrl).toBe('https://cobalt.example.com');
    // Ensure raw token is not in status
    expect(status.token).toBeUndefined();
  });

  it('8. Security: Never persists into chrome.storage.local', async () => {
    const localSpy = vi.spyOn(chrome.storage.local, 'set');

    await saveSessionToken(instanceUrl, mockToken, 300);

    expect(localSpy).not.toHaveBeenCalled();
    const localStored = await chrome.storage.local.get(STORAGE_KEYS.JWT_SESSION);
    expect(localStored[STORAGE_KEYS.JWT_SESSION]).toBeUndefined();
  });
});
