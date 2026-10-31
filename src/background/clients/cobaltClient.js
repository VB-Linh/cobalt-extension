// src/background/clients/cobaltClient.js
import { normalizeCobaltUrl, validateCobaltUrl } from '../../shared/utils/urlHelper.js';
import { getSessionTokenSync, clearSessionToken } from '../auth/jwtManager.js';

export const COBALT_DEFAULT_QUALITY = 'max';
export const COBALT_DEFAULT_TIMEOUT_MS = 15000;

export const VALID_QUALITIES = Object.freeze([
  'max',
  '4320',
  '2160',
  '1440',
  '1080',
  '720',
  '480',
  '360',
  '240',
  '144',
]);

export const VALID_AUDIO_FORMATS = Object.freeze([
  'best',
  'mp3',
  'ogg',
  'wav',
  'opus',
]);

/**
 * Builds HTTP headers strictly compliant with Cobalt v11.7.1 requirements:
 * - Accept: application/json
 * - Content-Type: application/json
 * - Authorization: Api-Key <UUID> (if apiKey provided)
 * - Authorization: Bearer <JWT> (if sessionToken provided and no apiKey)
 * 
 * @param {string} [apiKey]
 * @param {string} [sessionToken]
 * @returns {Record<string, string>}
 */
export function buildHeaders(apiKey = '', sessionToken = '') {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    headers['Authorization'] = `Api-Key ${apiKey.trim()}`;
  } else if (typeof sessionToken === 'string' && sessionToken.trim().length > 0) {
    headers['Authorization'] = `Bearer ${sessionToken.trim()}`;
  }

  return headers;
}

/**
 * Constructs the request body according to Cobalt v11.7.1 strict Zod schema.
 * Rejects unknown properties and sets maximum quality defaults for Twitter.
 * 
 * @param {object} params
 * @param {string} params.url - Social post URL
 * @param {string} [params.videoQuality='max'] - Target video quality
 * @param {string} [params.audioFormat='mp3'] - Audio format (best, mp3, ogg, wav, opus)
 * @param {string} [params.downloadMode='auto'] - Download mode (auto, audio, mute)
 * @param {string} [params.filenameStyle='basic'] - Filename style
 * @param {boolean} [params.alwaysProxy=false] - Proxy streams via tunnel
 * @returns {object} Strict payload object
 */
export function buildRequestBody(params = {}) {
  if (!params.url || typeof params.url !== 'string') {
    throw new TypeError('Tham số "url" là bắt buộc và phải là chuỗi hợp lệ.');
  }

  // Validate videoQuality enum
  let videoQuality = params.videoQuality;
  if (!videoQuality || !VALID_QUALITIES.includes(String(videoQuality))) {
    videoQuality = COBALT_DEFAULT_QUALITY;
  } else {
    videoQuality = String(videoQuality);
  }

  // Validate audioFormat enum
  let audioFormat = params.audioFormat;
  if (!audioFormat || !VALID_AUDIO_FORMATS.includes(String(audioFormat))) {
    audioFormat = 'mp3';
  } else {
    audioFormat = String(audioFormat);
  }

  // Validate downloadMode enum
  let downloadMode = params.downloadMode;
  if (!downloadMode || !['auto', 'audio', 'mute'].includes(String(downloadMode))) {
    downloadMode = 'auto';
  } else {
    downloadMode = String(downloadMode);
  }

  // Validate filenameStyle enum
  let filenameStyle = params.filenameStyle;
  if (!filenameStyle || !['classic', 'pretty', 'basic', 'nerdy'].includes(String(filenameStyle))) {
    filenameStyle = 'basic';
  } else {
    filenameStyle = String(filenameStyle);
  }

  // Return strictly compliant object (Cobalt schema uses .strict())
  return {
    url: params.url.trim(),
    videoQuality,
    audioFormat,
    downloadMode,
    filenameStyle,
    localProcessing: 'disabled',
    alwaysProxy: Boolean(params.alwaysProxy),
  };
}

/**
 * Executes a POST / request to a Cobalt instance with strict headers and body.
 * 
 * @param {object} options
 * @param {string} options.url - Social media post URL (e.g. tweet permalink)
 * @param {string} [options.apiUrl] - Base URL of the Cobalt instance
 * @param {string} [options.apiKey] - Optional API key
 * @param {string} [options.videoQuality] - Target quality ("max", "1080", etc.)
 * @param {string} [options.audioFormat] - Target audio format ("best", "mp3", etc.)
 * @param {number} [options.timeout=15000] - Request timeout in milliseconds
 * @param {AbortSignal} [options.signal] - External AbortSignal for cancellation
 * @returns {Promise<object>} Response result object
 */
export async function requestCobalt(options = {}) {
  const apiUrl = options.apiUrl || options.instanceUrl;
  if (!apiUrl || typeof apiUrl !== 'string' || !apiUrl.trim()) {
    return {
      success: false,
      error: 'UNCONFIGURED',
      message: 'Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập.',
    };
  }

  const validation = validateCobaltUrl(apiUrl);
  if (!validation.valid) {
    return {
      success: false,
      error: 'INVALID_URL',
      message: 'URL máy chủ Cobalt không hợp lệ.',
    };
  }

  const normalizedBase = normalizeCobaltUrl(apiUrl);
  const endpoint = `${normalizedBase}/`;

  const payload = buildRequestBody({
    url: options.url,
    videoQuality: options.videoQuality,
    audioFormat: options.audioFormat,
    downloadMode: options.downloadMode,
    filenameStyle: options.filenameStyle,
    alwaysProxy: options.alwaysProxy,
  });

  const effectiveSessionToken = options.sessionToken || (!options.apiKey ? getSessionTokenSync(apiUrl) : '') || '';
  const headers = buildHeaders(options.apiKey, effectiveSessionToken);

  const timeoutMs = typeof options.timeout === 'number' ? options.timeout : COBALT_DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let didTimeout = false;
  let timer = null;

  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);
  }

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (timer) clearTimeout(timer);

    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: 'MALFORMED_RESPONSE',
        message: 'Máy chủ trả về phản hồi không hợp lệ.',
        httpStatus: response.status,
      };
    }

    if (!response.ok || data.status === 'error') {
      const errorCode = data.error?.code || 'API_ERROR';
      if (errorCode === 'error.api.auth.jwt.invalid' || errorCode === 'error.api.auth.jwt.missing') {
        try {
          await clearSessionToken();
        } catch {
          // ignore
        }
      }
      return {
        success: false,
        status: 'error',
        error: errorCode,
        code: errorCode,
        context: data.error?.context || {},
        httpStatus: response.status,
        raw: data,
      };
    }

    return {
      success: true,
      status: data.status,
      url: data.url,
      filename: data.filename,
      picker: data.picker,
      raw: data,
    };
  } catch (err) {
    if (timer) clearTimeout(timer);

    if (didTimeout) {
      const timeoutError = new Error('Hết thời gian chờ phản hồi từ máy chủ Cobalt.');
      Object.assign(timeoutError, {
        success: false,
        error: 'API_TIMEOUT',
        code: 'API_TIMEOUT',
      });
      throw timeoutError;
    }

    if (options.signal?.aborted || err.name === 'AbortError') {
      const abortError = new Error('Yêu cầu đã bị hủy.');
      Object.assign(abortError, {
        success: false,
        error: 'ABORTED',
        code: 'ABORTED',
        cancelled: true,
      });
      throw abortError;
    }

    const isLocalhost = Boolean(
      apiUrl.includes('localhost') ||
      apiUrl.includes('127.0.0.1') ||
      apiUrl.includes('[::1]')
    );

    return {
      success: false,
      error: 'UNREACHABLE',
      message: isLocalhost
        ? 'Không thể kết nối máy chủ Cobalt nội bộ (localhost:9000). Vui lòng khởi động scripts\\start-cobalt-windows.bat.'
        : 'Không thể kết nối đến máy chủ Cobalt. Kiểm tra URL hoặc kết nối mạng.',
      details: err.message,
      apiUrl,
    };
  }
}

/**
 * Checks server metadata and reachability via GET /.
 * 
 * @param {string} apiUrl - Base instance URL
 * @param {string} [apiKey] - Optional API key
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function checkServerHealth(apiUrl, apiKey = '', options = {}) {
  if (!apiUrl || typeof apiUrl !== 'string' || !apiUrl.trim()) {
    return {
      healthy: false,
      error: 'UNCONFIGURED',
      message: 'Chưa cấu hình URL máy chủ Cobalt.',
    };
  }

  const validation = validateCobaltUrl(apiUrl);
  if (!validation.valid) {
    return {
      healthy: false,
      error: 'INVALID_URL',
      message: 'URL máy chủ Cobalt không hợp lệ.',
    };
  }

  const normalizedBase = normalizeCobaltUrl(apiUrl);
  const endpoint = `${normalizedBase}/`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: options.signal,
    });

    if (!response.ok) {
      return {
        healthy: false,
        status: response.status,
        error: 'SERVER_ERROR',
        message: `Máy chủ phản hồi với mã lỗi HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const version = data.cobalt?.version || 'unknown';
    const services = data.cobalt?.services || [];

    // If an API key is provided, we can validate it using a probe POST / with {}
    let keyValidation = null;
    if (apiKey && apiKey.trim().length > 0) {
      keyValidation = await probeApiKey(normalizedBase, apiKey.trim());
      if (keyValidation && !keyValidation.valid) {
        return {
          healthy: false,
          version,
          services,
          error: keyValidation.error || 'AUTH_KEY_INVALID',
          message: 'API Key không chính xác hoặc không được chấp nhận bởi máy chủ.',
        };
      }
    }

    const hasTurnstile = Boolean(data.cobalt?.turnstileSitekey);
    const turnstileSitekey = data.cobalt?.turnstileSitekey || null;

    return {
      healthy: true,
      version,
      services,
      turnstileRequired: hasTurnstile,
      turnstileSitekey,
      keyValidation,
      raw: data,
    };
  } catch (err) {
    const isLocalhost = Boolean(
      apiUrl.includes('localhost') ||
      apiUrl.includes('127.0.0.1') ||
      apiUrl.includes('[::1]')
    );
    return {
      healthy: false,
      error: 'UNREACHABLE',
      message: isLocalhost
        ? 'Cobalt local chưa khởi động. Vui lòng chạy file scripts\\start-cobalt-windows.bat'
        : 'Không thể kết nối đến máy chủ Cobalt. Kiểm tra URL hoặc kết nối mạng.',
      details: err.message,
      apiUrl,
    };
  }
}

/**
 * Probes API Key validity using POST / with {}
 * 
 * @param {string} normalizedBase
 * @param {string} apiKey
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
export async function probeApiKey(normalizedBase, apiKey) {
  try {
    const res = await fetch(`${normalizedBase}/`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify({}),
    });

    const data = await res.json().catch(() => ({}));
    const code = data?.error?.code;

    if (code === 'error.api.link.missing') {
      return { valid: true };
    }

    if (code && (code.startsWith('error.api.auth.key.') || code.startsWith('error.api.auth.jwt.'))) {
      return { valid: false, error: code };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'PROBE_FAILED' };
  }
}

/**
 * High-level alias matching interface contract: requestCobaltMedia(instanceUrl, params, apiKey, options)
 */
export async function requestCobaltMedia(instanceUrl, params = {}, apiKey = '', options = {}) {
  return requestCobalt({
    apiUrl: instanceUrl,
    apiKey,
    url: params.url,
    videoQuality: params.videoQuality,
    audioFormat: params.audioFormat,
    downloadMode: params.downloadMode,
    filenameStyle: params.filenameStyle,
    alwaysProxy: params.alwaysProxy,
    timeout: options.timeout,
    signal: options.signal,
  });
}
