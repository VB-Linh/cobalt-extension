// tests/background/handlers/cobaltResponseHandler.test.js
import { describe, it, expect } from 'vitest';
import {
  handleCobaltResponse,
  classifyCobaltError,
  classifyNetworkError,
  parseResponse,
} from '../../../src/background/handlers/cobaltResponseHandler.js';
import {
  createMockRedirectResponse,
  createMockTunnelResponse,
  createMockPickerResponse,
  createMockErrorResponse,
} from '../../fixtures/cobaltFixtures.js';

describe('Group C: Response Handler Tests (Tests 17–25)', () => {
  it('Test 17: Direct redirect response handling (status: "redirect") with HTTPS protocol validation', () => {
    // Valid HTTPS redirect
    const validRedirect = createMockRedirectResponse({
      url: 'https://video.twimg.com/amplify_video/1800000000000000001/vid/avc1/1920x1080/vid.mp4',
      filename: 'tweet_123.mp4',
    });

    const res = handleCobaltResponse(validRedirect);
    expect(res.success).toBe(true);
    expect(res.type).toBe('DOWNLOAD_DIRECT');
    expect(res.downloadUrl).toBe('https://video.twimg.com/amplify_video/1800000000000000001/vid/avc1/1920x1080/vid.mp4');
    expect(res.filename).toBe('tweet_123.mp4');

    // Insecure HTTP redirect rejection
    const invalidRedirect = {
      status: 'redirect',
      url: 'http://insecure-cdn.twimg.com/video.mp4',
    };
    const resInvalid = handleCobaltResponse(invalidRedirect);
    expect(resInvalid.success).toBe(false);
    expect(resInvalid.error).toBe('INVALID_REDIRECT_URL');
  });

  it('Test 18: Tunnel response handling with signed URL & query preservation (id, exp, sig, sec, iv intact)', () => {
    const rawTunnel = createMockTunnelResponse({
      baseUrl: 'https://cobalt.example.com',
      filename: 'X_video_1800000000000000001.mp4',
    });

    const res = handleCobaltResponse(rawTunnel);
    expect(res.success).toBe(true);
    expect(res.type).toBe('DOWNLOAD_TUNNEL');
    expect(res.downloadUrl).toBe(rawTunnel.url);
    expect(res.filename).toBe('X_video_1800000000000000001.mp4');

    // Assert that all 5 critical query params are preserved intact
    const parsed = new URL(res.downloadUrl);
    expect(parsed.searchParams.get('id')).toBe('abc123456789012345678');
    expect(parsed.searchParams.get('exp')).toBe('1730332800000');
    expect(parsed.searchParams.get('sig')).toBe('abcdefghijklmnopqrstuvwxyz0123456789ABCDEF');
    expect(parsed.searchParams.get('sec')).toBe('1234567890123456789012345678901234567890123');
    expect(parsed.searchParams.get('iv')).toBe('1234567890123456789012');
  });

  it('Test 19: Picker response handling with media item parsing', () => {
    const pickerData = createMockPickerResponse({
      items: [
        { type: 'video', url: 'https://video.twimg.com/v1.mp4', thumb: 'https://pbs.twimg.com/t1.jpg' },
        { type: 'photo', url: 'https://pbs.twimg.com/p2.jpg' },
        { type: 'gif', url: 'https://video.twimg.com/g3.mp4' },
      ],
    });

    const res = handleCobaltResponse(pickerData);
    expect(res.success).toBe(true);
    expect(res.type).toBe('PICKER');
    expect(res.totalItems).toBe(3);
    expect(res.items.length).toBe(3);
    expect(res.items[0]).toMatchObject({
      index: 0,
      type: 'video',
      url: 'https://video.twimg.com/v1.mp4',
      thumb: 'https://pbs.twimg.com/t1.jpg',
    });
  });

  it('Test 20: Local processing response fallback handling (returns LOCAL_PROCESSING_UNSUPPORTED in Vietnamese)', () => {
    const localProcData = {
      status: 'local-processing',
      type: 'merge',
      service: 'twitter',
      tunnel: ['https://cobalt.io/tunnel?t1', 'https://cobalt.io/tunnel?t2'],
    };

    const res = handleCobaltResponse(localProcData);
    expect(res.success).toBe(false);
    expect(res.error).toBe('LOCAL_PROCESSING_UNSUPPORTED');
    expect(res.message).toContain('xử lý cục bộ');
  });

  it('Test 21: Error classification: Authentication failure (AUTH_REQUIRED in Vietnamese)', () => {
    const errMissing = classifyCobaltError({ code: 'error.api.auth.key.missing' });
    expect(errMissing.code).toBe('AUTH_REQUIRED');
    expect(errMissing.message).toContain('Yêu cầu API Key hợp lệ');

    const errInvalid = classifyCobaltError({ code: 'error.api.auth.key.invalid' });
    expect(errInvalid.code).toBe('AUTH_REQUIRED');
    expect(errInvalid.message).toContain('Yêu cầu API Key hợp lệ');
  });

  it('Test 22: Error classification: Rate limit exceeded (RATE_LIMIT with retryAfter seconds in Vietnamese)', () => {
    const errRate = classifyCobaltError({
      code: 'error.api.rate_exceeded',
      context: { limit: 15 },
    });

    expect(errRate.code).toBe('RATE_LIMIT');
    expect(errRate.retryAfter).toBe(15);
    expect(errRate.message).toContain('15 giây');
    expect(errRate.message).toContain('quá giới hạn');
  });

  it('Test 23: Error classification: Service & Content restrictions (private video, age restriction, fetch fail)', () => {
    const errPrivate = classifyCobaltError({ code: 'error.api.content.video.private' });
    expect(errPrivate.code).toBe('CONTENT_PRIVATE');
    expect(errPrivate.message).toContain('riêng tư');

    const errAge = classifyCobaltError({ code: 'error.api.content.video.age' });
    expect(errAge.code).toBe('AGE_RESTRICTED');
    expect(errAge.message).toContain('độ tuổi');

    const errFetch = classifyCobaltError({ code: 'error.api.fetch.fail' });
    expect(errFetch.code).toBe('FETCH_FAILED');
    expect(errFetch.message).toContain('Không thể lấy thông tin video');
  });

  it('Test 24: Network failure & unreachable instance classification (UNREACHABLE in Vietnamese)', () => {
    const networkErr = new TypeError('Failed to fetch');
    const classified = classifyNetworkError(networkErr);

    expect(classified.success).toBe(false);
    expect(classified.error).toBe('UNREACHABLE');
    expect(classified.message).toContain('Không thể kết nối đến máy chủ Cobalt');
  });

  it('Test 25: Malformed JSON & non-JSON response handling (safely catches SyntaxError on HTML pages)', () => {
    const htmlGatewayTimeout = `
      <html>
        <head><title>504 Gateway Time-out</title></head>
        <body><center><h1>504 Gateway Time-out</h1></center></body>
      </html>
    `;

    const parsed = parseResponse(htmlGatewayTimeout);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe('MALFORMED_RESPONSE');
    expect(parsed.message).toContain('phản hồi không hợp lệ');

    // Valid JSON
    const validJson = JSON.stringify({ status: 'redirect', url: 'https://video.twimg.com/test.mp4' });
    const parsedValid = parseResponse(validJson);
    expect(parsedValid.success).toBe(true);
    expect(parsedValid.data.status).toBe('redirect');
  });
});
