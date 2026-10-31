// tests/empiricalMockFidelityChallenger.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildHeaders,
  buildRequestBody,
  requestCobalt,
  checkServerHealth,
  probeApiKey,
  VALID_QUALITIES,
  VALID_AUDIO_FORMATS,
} from '../src/background/clients/cobaltClient.js';
import {
  handleCobaltResponse,
  classifyCobaltError,
  classifyNetworkError,
  parseResponse,
  COBALT_RESPONSE_TYPES,
} from '../src/background/handlers/cobaltResponseHandler.js';
import {
  startDownload,
  generateFilename,
  initiateDownload,
  resetDownloadManager,
  DOWNLOAD_STATES,
} from '../src/background/downloads/downloadManager.js';
import {
  validateCobaltUrl,
  normalizeCobaltUrl,
  extractOriginPattern,
} from '../src/shared/utils/urlHelper.js';
import {
  createMockRedirectResponse,
  createMockTunnelResponse,
  createMockPickerResponse,
  createMockErrorResponse,
  createMockServerInfo,
} from './fixtures/cobaltFixtures.js';

// =============================================================================
// COBALT v11.7.1 SPEC ORACLES (Extracted verbatim from ./cobalt/ repo)
// =============================================================================

/**
 * Cobalt v11.7.1 Headers Accept Regex from ./cobalt/api/src/core/api.js line 35
 */
const COBALT_ACCEPT_REGEX = /^application\/json(; charset=utf-8)?$/;

/**
 * Cobalt v11.7.1 UUIDv4 Regex from ./cobalt/api/src/security/api-keys.js line 14
 */
const COBALT_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Cobalt v11.7.1 Zod Strict Allowed Keys from ./cobalt/api/src/processing/schema.js
 */
const COBALT_SCHEMA_ALLOWED_KEYS = new Set([
  'url',
  'audioBitrate',
  'audioFormat',
  'downloadMode',
  'filenameStyle',
  'youtubeVideoCodec',
  'youtubeVideoContainer',
  'videoQuality',
  'localProcessing',
  'youtubeDubLang',
  'subtitleLang',
  'disableMetadata',
  'allowH265',
  'convertGif',
  'tiktokFullAudio',
  'alwaysProxy',
  'youtubeHLS',
  'youtubeBetterAudio',
]);

/**
 * Verifies payload against Cobalt strict schema: rejects any unknown property
 */
function validateAgainstCobaltStrictSchema(payload) {
  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, error: 'error.api.invalid_body' };
  }
  for (const key of Object.keys(payload)) {
    if (!COBALT_SCHEMA_ALLOWED_KEYS.has(key)) {
      return { valid: false, error: 'error.api.invalid_body', unexpectedKey: key };
    }
  }
  return { valid: true };
}

/**
 * Simulates Cobalt's Authorization header validator from api-keys.js
 */
function validateCobaltAuthHeader(authHeader) {
  if (typeof authHeader !== 'string') return { valid: false, error: 'missing' };
  const [authType, keyString] = authHeader.split(' ', 2);
  if (authType.toLowerCase() !== 'api-key') return { valid: false, error: 'not_api_key' };
  if (!COBALT_UUID_REGEX.test(keyString) || `${authType} ${keyString}` !== authHeader) {
    return { valid: false, error: 'invalid' };
  }
  return { valid: true, key: keyString };
}

describe('Empirical Challenger: Mock Fidelity & Edge Case Verification Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetDownloadManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetDownloadManager();
  });

  // ===========================================================================
  // SECTION 1: Mock Fidelity in tests/fixtures/cobaltFixtures.js vs ./cobalt/
  // ===========================================================================
  describe('1. Mock Fidelity Assessment vs ./cobalt/ Codebase', () => {
    it('1.1 /tunnel response mock in cobaltFixtures.js includes all 5 signed parameters with exact parameter lengths', () => {
      const mockTunnel = createMockTunnelResponse({
        baseUrl: 'https://cobalt.example.com',
      });

      expect(mockTunnel.status).toBe('tunnel');
      expect(mockTunnel.url).toBeDefined();

      const parsedUrl = new URL(mockTunnel.url);
      expect(parsedUrl.pathname).toBe('/tunnel');

      // The 5 mandatory query parameters required by Cobalt v11.7.1 api.js lines 289-298
      const id = parsedUrl.searchParams.get('id');
      const exp = parsedUrl.searchParams.get('exp');
      const sig = parsedUrl.searchParams.get('sig');
      const sec = parsedUrl.searchParams.get('sec');
      const iv = parsedUrl.searchParams.get('iv');

      expect(id).not.toBeNull();
      expect(exp).not.toBeNull();
      expect(sig).not.toBeNull();
      expect(sec).not.toBeNull();
      expect(iv).not.toBeNull();

      // Verify parameter lengths against Cobalt api.js spec:
      // Real Cobalt enforces: id.length === 21, exp.length === 13, sig.length === 43, sec.length === 43, iv.length === 22
      expect(id.length).toBe(21);
      expect(exp.length).toBe(13);
      expect(sec.length).toBe(43);
      expect(iv.length).toBe(22);

      // FIDELITY CHALLENGE OBSERVATION:
      // Real Cobalt api.js line 297 strictly checks `sig.length === 43`.
      // However, createMockTunnelResponse in cobaltFixtures.js has a 42-character sig:
      // 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEF' (length 42).
      // Real Cobalt server would reject this with HTTP 400!
      expect(sig.length).toBe(42);
      const matchesCobaltSpec = sig.length === 43;
      expect(matchesCobaltSpec).toBe(false); // Proves fixture fidelity gap!
    });

    it('1.2 cobaltClient buildRequestBody strictly adheres to Cobalt Zod .strict() schema (rejects extra keys)', () => {
      // Intentionally pass unexpected properties to buildRequestBody
      const dirtyInput = {
        url: 'https://x.com/user/status/1800000000000000000',
        videoQuality: '1080',
        extraMetadata: 'forbidden',
        customToken: 'secret',
        unknownFlag: true,
        nestedObject: { malicious: true },
      };

      const sanitizedBody = buildRequestBody(dirtyInput);

      // Verify against Cobalt's real Zod strict schema oracle
      const schemaCheck = validateAgainstCobaltStrictSchema(sanitizedBody);
      expect(schemaCheck.valid).toBe(true);

      // Verify extra fields were completely stripped
      expect(sanitizedBody).not.toHaveProperty('extraMetadata');
      expect(sanitizedBody).not.toHaveProperty('customToken');
      expect(sanitizedBody).not.toHaveProperty('unknownFlag');
      expect(sanitizedBody).not.toHaveProperty('nestedObject');

      // Allowed fields present
      expect(sanitizedBody.url).toBe('https://x.com/user/status/1800000000000000000');
      expect(sanitizedBody.videoQuality).toBe('1080');
      expect(sanitizedBody.localProcessing).toBe('disabled');
      expect(sanitizedBody.alwaysProxy).toBe(false);
    });

    it('1.3 cobaltClient buildHeaders strictly matches Cobalt v11.7.1 exact header regex', () => {
      const headers = buildHeaders();

      // Cobalt api.js line 126 & 129 checks:
      // acceptRegex = /^application\/json(; charset=utf-8)?$/
      expect(COBALT_ACCEPT_REGEX.test(headers['Accept'])).toBe(true);
      expect(COBALT_ACCEPT_REGEX.test(headers['Content-Type'])).toBe(true);
    });

    it('1.4 API Key header mock fidelity: Cobalt requires exact UUIDv4; non-UUID keys fail server validation', () => {
      const validUuid = '12345678-1234-4234-8234-123456789abc';
      const invalidKey = 'my-custom-api-key-12345';

      // Header generated by client
      const headersValid = buildHeaders(validUuid);
      const headersInvalid = buildHeaders(invalidKey);

      // Test against Cobalt's real validateAuthorization oracle
      const authCheckValid = validateCobaltAuthHeader(headersValid['Authorization']);
      expect(authCheckValid.valid).toBe(true);
      expect(authCheckValid.key).toBe(validUuid);

      const authCheckInvalid = validateCobaltAuthHeader(headersInvalid['Authorization']);
      expect(authCheckInvalid.valid).toBe(false);
      expect(authCheckInvalid.error).toBe('invalid');
    });

    it('1.5 Analysis finding: cobaltFixtures.js provides static response fixtures but lacks a dynamic mock server handler', () => {
      // In cobaltFixtures.js, only createMockRedirectResponse, createMockTunnelResponse,
      // createMockPickerResponse, createMockErrorResponse, createMockServerInfo exist.
      // There is NO mock request router or Zod-enforcing mock server.
      // We verify that callers relying on cobaltFixtures must mock fetch manually.
      expect(typeof createMockRedirectResponse).toBe('function');
      expect(typeof createMockTunnelResponse).toBe('function');
      expect(typeof createMockPickerResponse).toBe('function');
      expect(typeof createMockErrorResponse).toBe('function');
      expect(typeof createMockServerInfo).toBe('function');
    });
  });

  // ===========================================================================
  // SECTION 2: Error Classification Under Hostile Edge Cases
  // ===========================================================================
  describe('2. Error Classification Stress & Proxy Malformation', () => {
    it('2.1 Proxy returns Cloudflare/Nginx HTML 502/504 Bad Gateway pages safely caught as MALFORMED_RESPONSE', async () => {
      const html502 = `<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body><center><h1>502 Bad Gateway</h1></center><hr><center>cloudflare</center></body></html>`;

      // Test parseResponse directly
      const parsed = parseResponse(html502);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('MALFORMED_RESPONSE');
      expect(parsed.message).toContain('không hợp lệ');

      // Test requestCobalt with 502 HTML
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(html502, { status: 502, statusText: 'Bad Gateway', headers: { 'content-type': 'text/html' } })
      );

      const res = await requestCobalt({
        apiUrl: 'https://cobalt.example.com',
        url: 'https://x.com/user/status/1234567890',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('MALFORMED_RESPONSE');
      expect(res.httpStatus).toBe(502);
    });

    it('2.2 Proxy returns truncated/empty response body safely caught as MALFORMED_RESPONSE', async () => {
      // Empty response
      const emptyParsed = parseResponse('');
      expect(emptyParsed.success).toBe(false);
      expect(emptyParsed.error).toBe('MALFORMED_RESPONSE');

      // Truncated JSON
      const truncatedParsed = parseResponse('{"status": "red');
      expect(truncatedParsed.success).toBe(false);
      expect(truncatedParsed.error).toBe('MALFORMED_RESPONSE');
    });

    it('2.3 Rate Limit: Cobalt returns HTTP 429 rate_exceeded with retryAfter seconds extracted', async () => {
      const rateLimitResponse = {
        status: 'error',
        error: {
          code: 'error.api.rate_exceeded',
          context: {
            limit: 45,
          },
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(rateLimitResponse), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        })
      );

      const clientRes = await requestCobalt({
        apiUrl: 'https://cobalt.example.com',
        url: 'https://x.com/user/status/123',
      });

      expect(clientRes.success).toBe(false);
      expect(clientRes.code).toBe('error.api.rate_exceeded');

      const handled = handleCobaltResponse(clientRes);
      expect(handled.success).toBe(false);
      expect(handled.error).toBe('RATE_LIMIT');
      expect(handled.retryAfter).toBe(45);
      expect(handled.message).toContain('45 giây');
    });

    it('2.4 Rate Limit: Graceful fallback when context.limit is missing or undefined', () => {
      const errWithoutLimit = classifyCobaltError({
        code: 'error.api.rate_exceeded',
        context: {},
      });

      expect(errWithoutLimit.code).toBe('RATE_LIMIT');
      expect(errWithoutLimit.retryAfter).toBe(15); // default fallback
      expect(errWithoutLimit.message).toContain('15 giây');
    });

    it('2.5 Authentication: Classifies all key authentication error variants into Vietnamese messages', () => {
      // 1. Missing key
      const missingKey = classifyCobaltError({ code: 'error.api.auth.key.missing' });
      expect(missingKey.code).toBe('AUTH_REQUIRED');
      expect(missingKey.message).toContain('Yêu cầu API Key');

      // 2. Invalid key (malformed UUID)
      const invalidKey = classifyCobaltError({ code: 'error.api.auth.key.invalid' });
      expect(invalidKey.code).toBe('AUTH_REQUIRED');
      expect(invalidKey.message).toContain('Yêu cầu API Key');

      // 3. Not found in keys list
      const notFoundKey = classifyCobaltError({ code: 'error.api.auth.key.not_found' });
      expect(notFoundKey.code).toBe('AUTH_FAILED');
      expect(notFoundKey.message).toContain('API Key không chính xác');

      // 4. IP not allowed
      const ipBlocked = classifyCobaltError({ code: 'error.api.auth.key.ip_not_allowed' });
      expect(ipBlocked.message).toContain('Địa chỉ IP');

      // 5. User-Agent not allowed
      const uaBlocked = classifyCobaltError({ code: 'error.api.auth.key.ua_not_allowed' });
      expect(uaBlocked.message).toContain('User-Agent');
    });

    it('2.6 Network Failures: Offline, DNS failure, and Connection Refused return UNREACHABLE without unhandled exceptions', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const res = await requestCobalt({
        apiUrl: 'https://cobalt.example.com',
        url: 'https://x.com/user/status/123',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('UNREACHABLE');
      expect(res.message).toContain('Không thể kết nối đến máy chủ Cobalt');
    });

    it('2.7 Timeout & Abort: Properly identifies timeout vs explicit cancellation', async () => {
      // Case 1: Timeout throws API_TIMEOUT
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce((url, opts) => {
        return new Promise((_, reject) => {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('The user aborted a request.');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      await expect(
        requestCobalt({
          apiUrl: 'https://cobalt.example.com',
          url: 'https://x.com/user/status/123',
          timeout: 20,
        })
      ).rejects.toMatchObject({
        error: 'API_TIMEOUT',
      });

      // Case 2: User AbortSignal throws ABORTED with cancelled: true
      const controller = new AbortController();
      controller.abort();

      await expect(
        requestCobalt({
          apiUrl: 'https://cobalt.example.com',
          url: 'https://x.com/user/status/123',
          signal: controller.signal,
          timeout: 5000,
        })
      ).rejects.toMatchObject({
        error: 'ABORTED',
        cancelled: true,
      });
    });
  });

  // ===========================================================================
  // SECTION 3: Dangerous URL Validation & Protocol Injection Attacks
  // ===========================================================================
  describe('3. Hostile URL Sanitization & Protocol Injection', () => {
    it('3.1 validateCobaltUrl rejects dangerous protocols: javascript:, data:, ftp:, file:, ws:', () => {
      const dangerousUrls = [
        'javascript:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'ftp://cobalt.tools',
        'file:///etc/passwd',
        'blob:https://x.com/12345',
        'ws://cobalt.example.com',
        'wss://cobalt.example.com',
        'gopher://cobalt.tools',
      ];

      for (const dangerous of dangerousUrls) {
        const result = validateCobaltUrl(dangerous);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('INVALID_PROTOCOL');
      }
    });

    it('3.2 validateCobaltUrl rejects malformed and headless URLs', () => {
      const malformedUrls = [
        '//relative-scheme.com',
        'not a url at all',
        'http://',
        'https://',
        '   ',
        '',
        null,
        undefined,
      ];

      for (const malformed of malformedUrls) {
        const result = validateCobaltUrl(malformed);
        expect(result.valid).toBe(false);
        expect(['EMPTY_URL', 'MALFORMED_URL']).toContain(result.error);
      }
    });

    it('3.3 validateCobaltUrl accepts legitimate HTTP and HTTPS URLs', () => {
      const validCases = [
        { input: 'http://localhost:9000', expectedOrigin: 'http://localhost:9000' },
        { input: 'http://127.0.0.1:9000/', expectedOrigin: 'http://127.0.0.1:9000' },
        { input: 'https://api.cobalt.tools/', expectedOrigin: 'https://api.cobalt.tools' },
        { input: 'https://custom.instance.com:8080/path/', expectedOrigin: 'https://custom.instance.com:8080' },
      ];

      for (const { input, expectedOrigin } of validCases) {
        const result = validateCobaltUrl(input);
        expect(result.valid).toBe(true);
        expect(result.origin).toBe(expectedOrigin);
        expect(result.url).not.toMatch(/\/+$/); // stripped trailing slash
      }
    });

    it('3.4 requestCobalt with dangerous apiUrl is aborted immediately with 0 fetch calls', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const dangerousAttempts = [
        'javascript:alert(1)',
        'data:text/html,evil',
        'file:///C:/Windows/System32',
      ];

      for (const badUrl of dangerousAttempts) {
        const res = await requestCobalt({
          apiUrl: badUrl,
          url: 'https://x.com/user/status/123',
        });

        expect(res.success).toBe(false);
        expect(res.error).toBe('INVALID_URL');
      }

      // Zero network fetch calls made!
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('3.5 handleCobaltResponse rejects non-HTTPS redirect responses', () => {
      const dangerousRedirects = [
        { status: 'redirect', url: 'http://insecure.com/video.mp4' },
        { status: 'redirect', url: 'javascript:alert(1)' },
        { status: 'redirect', url: 'data:text/html,test' },
        { status: 'redirect', url: 'file:///etc/passwd' },
      ];

      for (const badResp of dangerousRedirects) {
        const res = handleCobaltResponse(badResp);
        expect(res.success).toBe(false);
        expect(res.error).toBe('INVALID_REDIRECT_URL');
      }
    });

    it('3.6 handleCobaltResponse rejects tunnel responses missing any of the 5 signature parameters', () => {
      const baseUrl = 'https://cobalt.example.com/tunnel';

      // 1. Missing 'sig'
      const missingSig = {
        status: 'tunnel',
        url: `${baseUrl}?id=123456789012345678901&exp=1730000000000&sec=abcdef&iv=1234`,
      };
      expect(handleCobaltResponse(missingSig)).toMatchObject({
        success: false,
        error: 'INCOMPLETE_TUNNEL_URL',
      });

      // 2. Missing 'id'
      const missingId = {
        status: 'tunnel',
        url: `${baseUrl}?exp=1730000000000&sig=abcdef&sec=1234&iv=5678`,
      };
      expect(handleCobaltResponse(missingId)).toMatchObject({
        success: false,
        error: 'INCOMPLETE_TUNNEL_URL',
      });

      // 3. Missing 'exp'
      const missingExp = {
        status: 'tunnel',
        url: `${baseUrl}?id=123&sig=abcdef&sec=1234&iv=5678`,
      };
      expect(handleCobaltResponse(missingExp)).toMatchObject({
        success: false,
        error: 'INCOMPLETE_TUNNEL_URL',
      });

      // 4. Missing 'sec'
      const missingSec = {
        status: 'tunnel',
        url: `${baseUrl}?id=123&exp=1730000000000&sig=abcdef&iv=5678`,
      };
      expect(handleCobaltResponse(missingSec)).toMatchObject({
        success: false,
        error: 'INCOMPLETE_TUNNEL_URL',
      });

      // 5. Missing 'iv'
      const missingIv = {
        status: 'tunnel',
        url: `${baseUrl}?id=123&exp=1730000000000&sig=abcdef&sec=1234`,
      };
      expect(handleCobaltResponse(missingIv)).toMatchObject({
        success: false,
        error: 'INCOMPLETE_TUNNEL_URL',
      });
    });

    it('3.7 downloadManager generateFilename strips path traversal and directory injection attacks', () => {
      const maliciousInputs = [
        { username: '../../../etc', tweetId: 'passwd' },
        { username: '..\\..\\Windows\\System32', tweetId: 'cmd' },
        { username: 'user/name/subpath', tweetId: '123' },
        { username: 'valid_user', tweetId: '123:456?789*abc' },
      ];

      for (const input of maliciousInputs) {
        const filename = generateFilename(input);
        expect(filename).not.toMatch(/[\\/:*?"<>|]/);
        expect(filename).not.toContain('../');
        expect(filename).not.toContain('..\\');
        expect(filename.startsWith('X_')).toBe(true);
        expect(filename.endsWith('.mp4')).toBe(true);
      }
    });

    it('3.8 extractOriginPattern correctly produces minimal least-privilege origin for permissions API', () => {
      expect(extractOriginPattern('https://cobalt.example.com')).toBe('https://cobalt.example.com/*');
      expect(extractOriginPattern('http://localhost:9000/')).toBe('http://localhost:9000/*');
      expect(extractOriginPattern('invalid_url')).toBeNull();
      expect(extractOriginPattern('ftp://example.com')).toBeNull();
    });

    it('3.9 probeApiKey correctly distinguishes valid keys, auth errors, and network errors', async () => {
      // Case A: Valid key triggers link.missing error because empty object {} was posted
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'error', error: { code: 'error.api.link.missing' } }), { status: 400 })
      );
      const resValid = await probeApiKey('https://cobalt.example.com', '12345678-1234-4234-8234-123456789abc');
      expect(resValid.valid).toBe(true);

      // Case B: Invalid key triggers error.api.auth.key.invalid
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'error', error: { code: 'error.api.auth.key.invalid' } }), { status: 401 })
      );
      const resInvalid = await probeApiKey('https://cobalt.example.com', 'bad-key');
      expect(resInvalid.valid).toBe(false);
      expect(resInvalid.error).toBe('error.api.auth.key.invalid');

      // Case C: Network exception during probe
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network failure'));
      const resFailed = await probeApiKey('https://cobalt.example.com', 'some-key');
      expect(resFailed.valid).toBe(false);
      expect(resFailed.error).toBe('PROBE_FAILED');
    });

    it('3.10 Download Manager Edge Case Challenge: startDownload does not validate URL protocol before invoking chrome.downloads', async () => {
      const downloadSpy = vi.spyOn(chrome.downloads, 'download');

      // Attempting to pass javascript: protocol to startDownload
      await startDownload({
        url: 'javascript:alert(1)',
        tweetId: '123',
      });

      // OBSERVATION: startDownload passed the URL directly to chrome.downloads.download without protocol filtering
      expect(downloadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'javascript:alert(1)',
        })
      );
    });
  });
});
