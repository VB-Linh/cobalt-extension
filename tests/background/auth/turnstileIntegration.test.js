// tests/background/auth/turnstileIntegration.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkServerHealth, requestCobalt, buildHeaders } from '../../../src/background/clients/cobaltClient.js';
import { requestSession } from '../../../src/background/clients/sessionClient.js';
import { saveSessionToken, getSessionToken, clearSessionToken, isSessionValid } from '../../../src/background/auth/jwtManager.js';

describe('Turnstile Session Authentication End-to-End & Boundary Integration', () => {
  const instanceUrl = 'https://cobalt-alpha.wolfy.love';
  const sitekey = '0x4AAAAAABBCV3tPrCXT9h2H';
  const mockJwt = 'header.payload.sigJWT';

  beforeEach(async () => {
    await clearSessionToken();
    vi.restoreAllMocks();
  });

  it('1. GET / discovery: detects turnstileSitekey and flags turnstileRequired', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      cobalt: {
        version: '11.7.1',
        url: `${instanceUrl}/`,
        turnstileSitekey: sitekey,
        services: ['twitter', 'youtube'],
      },
    }), { status: 200 }));

    const res = await checkServerHealth(instanceUrl);

    expect(res.healthy).toBe(true);
    expect(res.version).toBe('11.7.1');
    expect(res.turnstileRequired).toBe(true);
    expect(res.turnstileSitekey).toBe(sitekey);
  });

  it('2. POST /session: acquires JWT and saves into session storage', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      token: mockJwt,
      exp: 180,
    }), { status: 200 }));

    const sessionRes = await requestSession(instanceUrl, 'mock-turnstile-solution');
    expect(sessionRes.success).toBe(true);

    // Save to JWT Manager
    await saveSessionToken(instanceUrl, sessionRes.token, sessionRes.exp);

    expect(await isSessionValid(instanceUrl)).toBe(true);
    expect(await getSessionToken(instanceUrl)).toBe(mockJwt);
  });

  it('3. POST /: requestCobalt automatically applies Authorization: Bearer <JWT> when session is active', async () => {
    // Pre-populate active session
    await saveSessionToken(instanceUrl, mockJwt, 300);

    let sentHeaders = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      sentHeaders = opts.headers;
      return Promise.resolve(new Response(JSON.stringify({
        status: 'tunnel',
        url: 'https://cobalt.example.com/tunnel/stream.mp4',
        filename: 'video.mp4',
      }), { status: 200 }));
    });

    const cobaltRes = await requestCobalt({
      apiUrl: instanceUrl,
      url: 'https://x.com/user/status/123456',
    });

    expect(cobaltRes.success).toBe(true);
    expect(sentHeaders['Authorization']).toBe(`Bearer ${mockJwt}`);
  });

  it('4. API Key Compatibility: Authorization: Api-Key strictly takes precedence over Bearer JWT', async () => {
    // Have both an active session token and an explicit API key
    await saveSessionToken(instanceUrl, mockJwt, 300);

    const apiKey = 'c56a4180-65aa-42ec-a945-5fd21dec0538';
    let sentHeaders = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      sentHeaders = opts.headers;
      return Promise.resolve(new Response(JSON.stringify({
        status: 'redirect',
        url: 'https://video.twimg.com/vid.mp4',
      }), { status: 200 }));
    });

    const cobaltRes = await requestCobalt({
      apiUrl: instanceUrl,
      apiKey,
      url: 'https://x.com/user/status/123456',
    });

    expect(cobaltRes.success).toBe(true);
    expect(sentHeaders['Authorization']).toBe(`Api-Key ${apiKey}`);
    expect(sentHeaders['Authorization']).not.toContain('Bearer');
  });

  it('5. Header helper differentiation: verifies buildHeaders behavior', () => {
    // No auth
    const headersEmpty = buildHeaders('', '');
    expect(headersEmpty['Authorization']).toBeUndefined();

    // Bearer token only
    const headersBearer = buildHeaders('', mockJwt);
    expect(headersBearer['Authorization']).toBe(`Bearer ${mockJwt}`);

    // API key only
    const headersApiKey = buildHeaders('uuid-key', '');
    expect(headersApiKey['Authorization']).toBe('Api-Key uuid-key');

    // Both provided: API key takes precedence
    const headersBoth = buildHeaders('uuid-key', mockJwt);
    expect(headersBoth['Authorization']).toBe('Api-Key uuid-key');
  });

  it('6. Invalid JWT handling: auto-clears session when server returns error.api.auth.jwt.invalid', async () => {
    await saveSessionToken(instanceUrl, mockJwt, 300);
    expect(await isSessionValid(instanceUrl)).toBe(true);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      status: 'error',
      error: {
        code: 'error.api.auth.jwt.invalid',
      },
    }), { status: 400 }));

    const res = await requestCobalt({
      apiUrl: instanceUrl,
      url: 'https://x.com/user/status/123456',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('error.api.auth.jwt.invalid');

    // Verify session token was wiped
    expect(await isSessionValid(instanceUrl)).toBe(false);
    expect(await getSessionToken(instanceUrl)).toBeNull();
  });

  it('7. Invalid API Key: server rejects with error.api.auth.key.invalid, does NOT silently fallback to Bearer JWT', async () => {
    // Have an active session token saved, but user specified an invalid API Key
    await saveSessionToken(instanceUrl, mockJwt, 300);

    let sentHeaders = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      sentHeaders = opts.headers;
      return Promise.resolve(new Response(JSON.stringify({
        status: 'error',
        error: {
          code: 'error.api.auth.key.invalid',
        },
      }), { status: 401 }));
    });

    const res = await requestCobalt({
      apiUrl: instanceUrl,
      apiKey: 'invalid-api-key-uuid',
      url: 'https://x.com/user/status/123456',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('error.api.auth.key.invalid');
    expect(sentHeaders['Authorization']).toBe('Api-Key invalid-api-key-uuid');
    // Ensure it did NOT switch to Bearer token
    expect(sentHeaders['Authorization']).not.toContain('Bearer');
    // Session token remains untouched
    expect(await isSessionValid(instanceUrl)).toBe(true);
  });

  it('8. Expired JWT: does not send expired Bearer header, reports error without retry loop', async () => {
    // Save token with 1s lifetime
    await saveSessionToken(instanceUrl, mockJwt, 1);

    // Fast forward 5s
    const futureSec = Math.floor(Date.now() / 1000) + 5;
    vi.spyOn(Date, 'now').mockReturnValue(futureSec * 1000);

    let sentHeaders = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      sentHeaders = opts.headers;
      return Promise.resolve(new Response(JSON.stringify({
        status: 'error',
        error: {
          code: 'error.api.auth.jwt.missing',
        },
      }), { status: 400 }));
    });

    const res = await requestCobalt({
      apiUrl: instanceUrl,
      url: 'https://x.com/user/status/123456',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('error.api.auth.jwt.missing');
    // Header should not contain expired token
    expect(sentHeaders['Authorization']).toBeUndefined();
  });
});
