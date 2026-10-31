// tests/background/clients/sessionClient.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  requestSession,
  validateSessionResponse,
} from '../../../src/background/clients/sessionClient.js';

describe('Cobalt POST /session Client Tests', () => {
  const instanceUrl = 'https://cobalt.example.com';
  const mockTurnstileToken = '0.mockTurnstileResponseToken.xyz123';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateSessionResponse', () => {
    it('validates correct session response with token and exp', () => {
      const res = validateSessionResponse({ token: 'jwt.token.here', exp: 178 });
      expect(res.valid).toBe(true);
    });

    it('rejects missing or empty token', () => {
      expect(validateSessionResponse({ token: '', exp: 178 }).valid).toBe(false);
      expect(validateSessionResponse({ exp: 178 }).valid).toBe(false);
      expect(validateSessionResponse(null).valid).toBe(false);
    });

    it('rejects invalid or non-positive exp', () => {
      expect(validateSessionResponse({ token: 'jwt', exp: 0 }).valid).toBe(false);
      expect(validateSessionResponse({ token: 'jwt', exp: -10 }).valid).toBe(false);
      expect(validateSessionResponse({ token: 'jwt', exp: '178' }).valid).toBe(false);
      expect(validateSessionResponse({ token: 'jwt' }).valid).toBe(false);
    });
  });

  describe('requestSession network execution', () => {
    it('sends POST /session with cf-turnstile-response header and parses success response', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
        expect(url).toBe('https://cobalt.example.com/session');
        expect(opts.method).toBe('POST');
        expect(opts.headers['Accept']).toBe('application/json');
        expect(opts.headers['cf-turnstile-response']).toBe(mockTurnstileToken);

        return Promise.resolve(new Response(JSON.stringify({
          token: 'eyJhbGciOiJIUzI1NiJ9.payload.sig',
          exp: 178,
        }), { status: 200 }));
      });

      const res = await requestSession(instanceUrl, mockTurnstileToken);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(res.success).toBe(true);
      expect(res.token).toBe('eyJhbGciOiJIUzI1NiJ9.payload.sig');
      expect(res.exp).toBe(178);
    });

    it('returns error when turnstileResponse is missing or empty string', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const res = await requestSession(instanceUrl, '');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(res.success).toBe(false);
      expect(res.error).toBe('TURNSTILE_RESPONSE_MISSING');
    });

    it('returns error when instanceUrl is empty or invalid', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const resEmpty = await requestSession('', mockTurnstileToken);
      expect(resEmpty.success).toBe(false);
      expect(resEmpty.error).toBe('UNCONFIGURED');

      const resInvalid = await requestSession('ftp://invalid', mockTurnstileToken);
      expect(resInvalid.success).toBe(false);
      expect(resInvalid.error).toBe('INVALID_URL');

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('classifies server Turnstile error when backend rejects token', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
        status: 'error',
        error: {
          code: 'error.api.auth.turnstile.invalid',
        },
      }), { status: 400 }));

      const res = await requestSession(instanceUrl, 'bad-turnstile-token');

      expect(res.success).toBe(false);
      expect(res.error).toBe('AUTH_TURNSTILE_INVALID');
      expect(res.message).toContain('Turnstile không hợp lệ hoặc đã hết hạn');
    });

    it('handles network failure gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch'));

      const res = await requestSession(instanceUrl, mockTurnstileToken);

      expect(res.success).toBe(false);
      expect(res.error).toBe('UNREACHABLE');
      expect(res.message).toContain('Không thể kết nối');
    });

    it('handles request timeout cleanly', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
        return new Promise((_, reject) => {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const res = await requestSession(instanceUrl, mockTurnstileToken, { timeout: 20 });

      expect(res.success).toBe(false);
      expect(res.error).toBe('TIMEOUT');
    });
  });
});
