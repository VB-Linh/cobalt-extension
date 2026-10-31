// tests/background/clients/cobaltClient.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  requestCobalt,
  buildHeaders,
  buildRequestBody,
  checkServerHealth,
  VALID_QUALITIES,
  VALID_AUDIO_FORMATS,
} from '../../../src/background/clients/cobaltClient.js';
import { createMockRedirectResponse, createMockServerInfo } from '../../fixtures/cobaltFixtures.js';

describe('Group A: Cobalt Discovery & Request Client Tests (Tests 1–8)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Test 1: Cobalt API endpoint URL formatting: formats POST / correctly without duplicate slashes or path distortion', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(createMockRedirectResponse()), { status: 200 }))
    );

    // Test with trailing slash
    await requestCobalt({
      apiUrl: 'https://cobalt.example.com/',
      url: 'https://x.com/user/status/1234567890',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl1 = fetchSpy.mock.calls[0][0];
    expect(calledUrl1).toBe('https://cobalt.example.com/');
    expect(calledUrl1).not.toContain('//api');
    expect(calledUrl1).not.toContain('.com//');

    // Test without trailing slash
    await requestCobalt({
      apiUrl: 'https://cobalt.example.com',
      url: 'https://x.com/user/status/1234567890',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const calledUrl2 = fetchSpy.mock.calls[1][0];
    expect(calledUrl2).toBe('https://cobalt.example.com/');
  });

  it('Test 2: Mandatory JSON headers and Authorization header formatting', () => {
    // Case 1: with API Key
    const headersWithKey = buildHeaders('test-token-123');
    expect(headersWithKey['Accept']).toBe('application/json');
    expect(headersWithKey['Content-Type']).toBe('application/json');
    expect(headersWithKey['Authorization']).toBe('Api-Key test-token-123');

    // Case 2: without API Key (empty string or undefined)
    const headersEmpty = buildHeaders('');
    expect(headersEmpty['Accept']).toBe('application/json');
    expect(headersEmpty['Content-Type']).toBe('application/json');
    expect(headersEmpty['Authorization']).toBeUndefined();

    const headersUndefined = buildHeaders();
    expect(headersUndefined['Authorization']).toBeUndefined();
  });

  it('Test 3: Request body structure & strict schema adherence (no extra fields that trigger error.api.invalid_body)', () => {
    const body = buildRequestBody({
      url: 'https://x.com/u/status/999',
      extraProperty: 'should_not_exist',
      anotherOne: 12345,
    });

    // Allowed keys per Cobalt v11.7.1 schema
    const allowedKeys = [
      'url',
      'videoQuality',
      'audioFormat',
      'downloadMode',
      'filenameStyle',
      'localProcessing',
      'alwaysProxy',
    ];

    const actualKeys = Object.keys(body);
    for (const key of actualKeys) {
      expect(allowedKeys).toContain(key);
    }

    expect(body.url).toBe('https://x.com/u/status/999');
    expect(body.localProcessing).toBe('disabled');
    expect(body.alwaysProxy).toBe(false);
    expect(body['extraProperty']).toBeUndefined();
    expect(body['anotherOne']).toBeUndefined();
  });

  it('Test 4: Video quality configuration with "max" preference without forced downscaling', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(createMockRedirectResponse()), { status: 200 }))
    );

    // Case A: videoQuality explicitly "max"
    await requestCobalt({
      apiUrl: 'https://cobalt.example.com',
      url: 'https://x.com/user/status/100',
      videoQuality: 'max',
    });

    const bodyA = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(bodyA.videoQuality).toBe('max');

    // Case B: videoQuality "1080"
    await requestCobalt({
      apiUrl: 'https://cobalt.example.com',
      url: 'https://x.com/user/status/100',
      videoQuality: '1080',
    });

    const bodyB = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(bodyB.videoQuality).toBe('1080');
  });

  it('Test 5: Request timeout handling: cleanly aborts and rejects with API_TIMEOUT', async () => {
    // Mock hanging fetch that respects signal
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      return new Promise((resolve, reject) => {
        if (opts?.signal) {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('The user aborted a request.');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    const reqPromise = requestCobalt({
      apiUrl: 'https://cobalt.example.com',
      url: 'https://x.com/user/status/100',
      timeout: 30, // 30ms timeout
    });

    await expect(reqPromise).rejects.toMatchObject({
      success: false,
      error: 'API_TIMEOUT',
    });
  });

  it('Test 6: External AbortSignal handling (Cancellation mid-flight)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      return new Promise((resolve, reject) => {
        if (opts?.signal) {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('The user aborted a request.');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    const controller = new AbortController();

    const reqPromise = requestCobalt({
      apiUrl: 'https://cobalt.example.com',
      url: 'https://x.com/user/status/100',
      signal: controller.signal,
      timeout: 5000,
    });

    // Abort immediately
    controller.abort();

    await expect(reqPromise).rejects.toMatchObject({
      success: false,
      error: 'ABORTED',
      cancelled: true,
    });
  });

  it('Test 7: Audio format configuration: defaults to mp3, supports valid enums and sanitizes invalid values', () => {
    // Default when omitted
    const bodyDefault = buildRequestBody({ url: 'https://x.com/u/status/1' });
    expect(bodyDefault.audioFormat).toBe('mp3');

    // Valid enums pass through
    for (const fmt of VALID_AUDIO_FORMATS) {
      const body = buildRequestBody({ url: 'https://x.com/u/status/1', audioFormat: fmt });
      expect(body.audioFormat).toBe(fmt);
    }

    // Invalid format sanitizes to mp3
    const bodyInvalid = buildRequestBody({ url: 'https://x.com/u/status/1', audioFormat: 'flac_unsupported' });
    expect(bodyInvalid.audioFormat).toBe('mp3');
  });

  it('Test 8: Server metadata & Health Check (GET /): asserts HTTP method is GET and parses version/services', async () => {
    const serverInfo = createMockServerInfo({
      version: '11.7.1',
      services: ['twitter', 'youtube', 'tiktok'],
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(serverInfo), { status: 200 }))
    );

    const res = await checkServerHealth('https://cobalt.example.com');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOpts] = fetchSpy.mock.calls[0];
    expect(calledUrl).toBe('https://cobalt.example.com/');
    expect(calledOpts.method).toBe('GET');
    expect(calledOpts.headers['Accept']).toBe('application/json');

    expect(res.healthy).toBe(true);
    expect(res.version).toBe('11.7.1');
    expect(res.services).toContain('twitter');
  });
});
