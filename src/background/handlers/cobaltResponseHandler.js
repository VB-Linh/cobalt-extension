// src/background/handlers/cobaltResponseHandler.js

export const COBALT_RESPONSE_TYPES = Object.freeze({
  REDIRECT: 'redirect',
  TUNNEL: 'tunnel',
  PICKER: 'picker',
  LOCAL_PROCESSING: 'local-processing',
  ERROR: 'error',
});

/**
 * Mapping of Cobalt API error codes to user-friendly Vietnamese descriptions.
 */
export const COBALT_ERROR_MESSAGES = Object.freeze({
  'error.api.rate_exceeded': 'Đã vượt quá giới hạn tải. Vui lòng thử lại sau {limit} giây.',
  'error.api.header.accept': 'Yêu cầu không hợp lệ (header Accept phải là application/json).',
  'error.api.header.content_type': 'Yêu cầu không hợp lệ (header Content-Type phải là application/json).',
  'error.api.invalid_body': 'Dữ liệu yêu cầu không hợp lệ hoặc cấu trúc payload không đúng chuẩn Cobalt.',
  'error.api.link.missing': 'Thiếu liên kết bài viết cần tải.',
  'error.api.link.invalid': 'Đường dẫn bài viết không hợp lệ hoặc không được Cobalt hỗ trợ.',
  'error.api.link.unsupported': 'Định dạng liên kết bài viết này chưa được hỗ trợ.',
  'error.api.service.disabled': 'Dịch vụ này hiện đang bị vô hiệu hóa trên máy chủ Cobalt.',
  'error.api.service.unsupported': 'Dịch vụ này không nằm trong danh sách hỗ trợ của Cobalt.',
  'error.api.service.audio_not_supported': 'Dịch vụ này không hỗ trợ chế độ chỉ tải âm thanh.',

  // Authentication errors
  'error.api.auth.key.missing': 'Yêu cầu API Key hợp lệ. Vui lòng thiết lập trong cài đặt.',
  'error.api.auth.key.not_api_key': 'Phương thức xác thực không đúng chuẩn (cần dùng tiền tố "Api-Key").',
  'error.api.auth.key.invalid': 'Yêu cầu API Key hợp lệ. Vui lòng thiết lập trong cài đặt.',
  'error.api.auth.key.not_found': 'API Key không chính xác hoặc đã bị vô hiệu hóa trên máy chủ Cobalt.',
  'error.api.auth.key.invalid_ip': 'Địa chỉ IP của bạn không hợp lệ đối với máy chủ Cobalt.',
  'error.api.auth.key.ip_not_allowed': 'Địa chỉ IP hiện tại không được phép sử dụng API Key này.',
  'error.api.auth.key.ua_not_allowed': 'User-Agent của trình duyệt không được phép sử dụng API Key này.',
  'error.api.auth.jwt.missing': 'Máy chủ yêu cầu xác thực phiên Turnstile hoặc API Key. Vui lòng hoàn thành xác thực.',
  'error.api.auth.jwt.invalid': 'Phiên xác thực hoặc API Key không hợp lệ hoặc đã hết hạn trên máy chủ Cobalt.',
  'error.api.auth.not_configured': 'Máy chủ chưa cấu hình tính năng xác thực phiên Turnstile.',
  'error.api.auth.turnstile.missing': 'Thiếu phản hồi giải đố Turnstile. Vui lòng xác thực lại.',
  'error.api.auth.turnstile.invalid': 'Mã phản hồi Turnstile không hợp lệ hoặc đã hết hạn. Vui lòng xác thực lại.',

  // Fetch & Content errors
  'error.api.fetch.empty': 'Không tìm thấy video hoặc tệp phương tiện nào trong bài viết này.',
  'error.api.fetch.fail': 'Không thể lấy thông tin video từ X (Twitter). Vui lòng thử lại sau hoặc dùng Mở CDN.',
  'error.api.fetch.rate': 'Máy chủ Cobalt đang bị nền tảng X giới hạn lượt truy cập. Vui lòng thử lại sau.',
  'error.api.fetch.critical': 'Đã xảy ra lỗi nghiêm trọng khi xử lý video từ nền tảng.',
  'error.api.fetch.critical.core': 'Lỗi nội bộ hệ thống xử lý tệp của máy chủ Cobalt.',
  'error.api.fetch.short_link': 'Không thể mở rộng liên kết rút gọn của bài viết.',

  'error.api.content.too_long': 'Video vượt quá giới hạn thời lượng cho phép của máy chủ ({limit} phút).',
  'error.api.content.post.private': 'Bài viết hoặc tài khoản này được đặt ở chế độ riêng tư, không thể tải.',
  'error.api.content.post.age': 'Bài viết bị giới hạn độ tuổi người xem (yêu cầu cookie xác thực trên máy chủ).',
  'error.api.content.post.unavailable': 'Bài viết không còn khả dụng hoặc đã bị người đăng xóa.',
  'error.api.content.video.private': 'Video này là video riêng tư, không thể tải.',
  'error.api.content.video.age': 'Video yêu cầu xác thực độ tuổi người xem.',
  'error.api.content.video.unavailable': 'Video không khả dụng trên X (Twitter).',
  'error.api.content.video.live': 'Không hỗ trợ tải luồng phát trực tiếp (livestream).',
  'error.api.content.video.region': 'Video bị chặn tại khu vực địa lý của máy chủ Cobalt.',
  'error.api.generic': 'Đã xảy ra lỗi không xác định trên máy chủ Cobalt. Vui lòng thử lại sau.',
  'UNREACHABLE': 'Không thể kết nối đến máy chủ Cobalt. Vui lòng kiểm tra lại URL hoặc mạng.',
  'API_TIMEOUT': 'Hết thời gian chờ phản hồi từ máy chủ Cobalt. Vui lòng thử lại sau.',
  'ABORTED': 'Yêu cầu tải đã bị hủy.',
});

/**
 * Classifies Cobalt error response into structured error details with Vietnamese message.
 * 
 * @param {object|string} data - Raw error response or error code string
 * @param {string} [targetUrl=''] - Optional instance or target URL for local context
 * @returns {{ code: string, message: string, retryAfter?: number, rawCode?: string }}
 */
export function classifyCobaltError(data, targetUrl = '') {
  let rawCode = '';
  let context = {};

  if (typeof data === 'string') {
    rawCode = data;
  } else if (data && typeof data === 'object') {
    rawCode = data.code || data.error?.code || data.error || '';
    context = data.context || data.error?.context || {};
  }

  const effectiveUrl = String(targetUrl || data?.apiUrl || data?.url || context?.url || '');
  const isLocalhost = Boolean(
    effectiveUrl.includes('localhost') ||
    effectiveUrl.includes('127.0.0.1') ||
    effectiveUrl.includes('[::1]')
  );

  // Handle network reachability errors
  if (
    rawCode === 'UNREACHABLE' ||
    rawCode === 'SERVER_UNREACHABLE' ||
    rawCode === 'LOCAL_OFFLINE' ||
    rawCode === 'LOCAL_SERVICE_OFFLINE'
  ) {
    return {
      code: 'UNREACHABLE',
      rawCode,
      message: isLocalhost
        ? 'Không thể kết nối máy chủ Cobalt nội bộ (localhost:9000). Vui lòng khởi động scripts\\start-cobalt-windows.bat.'
        : 'Không thể kết nối đến máy chủ Cobalt. Vui lòng kiểm tra lại URL hoặc mạng.',
    };
  }

  // Handle timeout and abort
  if (rawCode === 'API_TIMEOUT') {
    return {
      code: 'API_TIMEOUT',
      rawCode,
      message: 'Hết thời gian chờ phản hồi từ máy chủ Cobalt. Vui lòng thử lại sau.',
    };
  }

  if (rawCode === 'ABORTED') {
    return {
      code: 'ABORTED',
      rawCode,
      message: 'Yêu cầu tải đã bị hủy.',
    };
  }

  // Handle key authentication errors
  if (
    rawCode === 'error.api.auth.key.missing' ||
    rawCode === 'error.api.auth.key.invalid' ||
    rawCode === 'auth.key.missing' ||
    rawCode === 'auth.key.invalid'
  ) {
    return {
      code: 'AUTH_REQUIRED',
      rawCode,
      message: 'Yêu cầu API Key hợp lệ. Vui lòng thiết lập trong cài đặt.',
    };
  }

  // Handle JWT / Turnstile web session authentication errors
  if (
    rawCode === 'error.api.auth.jwt.missing' ||
    rawCode === 'error.api.auth.jwt.invalid' ||
    rawCode === 'auth.jwt.missing' ||
    rawCode === 'auth.jwt.invalid'
  ) {
    const isInvalid = rawCode.includes('invalid');
    return {
      code: isInvalid ? 'AUTH_EXPIRED' : 'AUTH_REQUIRED',
      rawCode,
      message: isInvalid
        ? 'Phiên xác thực Turnstile hoặc API Key không hợp lệ hoặc đã hết hạn.'
        : 'Máy chủ yêu cầu xác thực phiên Turnstile hoặc API Key.',
    };
  }

  if (rawCode === 'error.api.auth.turnstile.invalid' || rawCode === 'auth.turnstile.invalid') {
    return {
      code: 'AUTH_TURNSTILE_INVALID',
      rawCode,
      message: 'Mã phản hồi Turnstile không hợp lệ hoặc đã hết hạn. Vui lòng xác thực lại.',
    };
  }

  if (rawCode === 'error.api.auth.turnstile.missing' || rawCode === 'auth.turnstile.missing') {
    return {
      code: 'AUTH_TURNSTILE_MISSING',
      rawCode,
      message: 'Thiếu phản hồi giải đố Turnstile. Vui lòng xác thực lại.',
    };
  }

  if (rawCode === 'error.api.auth.key.not_found' || rawCode === 'auth.key.not_found') {
    return {
      code: 'AUTH_FAILED',
      rawCode,
      message: 'API Key không chính xác hoặc đã bị vô hiệu hóa trên máy chủ Cobalt.',
    };
  }

  // Handle rate limits
  if (rawCode === 'error.api.rate_exceeded' || rawCode === 'rate_exceeded') {
    const limitSec = context.limit || 15;
    return {
      code: 'RATE_LIMIT',
      rawCode,
      retryAfter: Number(limitSec),
      message: `Đã vượt quá giới hạn tải. Vui lòng thử lại sau ${limitSec} giây.`,
    };
  }

  // Content restrictions
  if (rawCode.includes('content.video.private') || rawCode.includes('content.post.private')) {
    return {
      code: 'CONTENT_PRIVATE',
      rawCode,
      message: 'Video hoặc bài viết này được đặt ở chế độ riêng tư, không thể tải.',
    };
  }

  if (rawCode.includes('content.video.age') || rawCode.includes('content.post.age')) {
    return {
      code: 'AGE_RESTRICTED',
      rawCode,
      message: 'Video bị giới hạn độ tuổi người xem, yêu cầu đăng nhập trên máy chủ.',
    };
  }

  if (rawCode.includes('content.video.unavailable') || rawCode.includes('content.post.unavailable')) {
    return {
      code: 'CONTENT_UNAVAILABLE',
      rawCode,
      message: 'Bài viết hoặc video không còn khả dụng trên X (Twitter).',
    };
  }

  if (rawCode.includes('fetch.rate')) {
    return {
      code: 'UPSTREAM_RATE_LIMIT',
      rawCode,
      message: 'Máy chủ Cobalt đang bị nền tảng X giới hạn lượt truy cập. Vui lòng thử lại sau.',
    };
  }

  if (rawCode.includes('fetch.fail')) {
    return {
      code: 'FETCH_FAILED',
      rawCode,
      message: 'Không thể lấy thông tin video từ X (Twitter). Vui lòng thử lại sau hoặc dùng Mở CDN.',
    };
  }

  if (rawCode.includes('fetch.empty')) {
    return {
      code: 'NO_MEDIA_FOUND',
      rawCode,
      message: 'Không tìm thấy video hoặc tệp phương tiện nào trong bài viết này.',
    };
  }

  // Fallback to dictionary or generic message
  let template = COBALT_ERROR_MESSAGES[rawCode] || COBALT_ERROR_MESSAGES['error.api.generic'];
  if (context.limit) {
    template = template.replace('{limit}', String(context.limit));
  }
  if (context.service) {
    template = template.replace('{service}', String(context.service));
  }

  return {
    code: 'API_ERROR',
    rawCode,
    message: template,
  };
}

/**
 * Classifies network exception errors (Failed to fetch, offline, DNS failure).
 * 
 * @param {Error|any} err
 * @param {string} [targetUrl='']
 * @returns {{ success: boolean, error: string, message: string, details?: string }}
 */
export function classifyNetworkError(err, targetUrl = '') {
  const effectiveUrl = String(targetUrl || err?.url || '');
  const isLocalhost = Boolean(
    effectiveUrl.includes('localhost') ||
    effectiveUrl.includes('127.0.0.1') ||
    effectiveUrl.includes('[::1]')
  );

  return {
    success: false,
    error: 'UNREACHABLE',
    message: isLocalhost
      ? 'Không thể kết nối máy chủ Cobalt nội bộ (localhost:9000). Vui lòng khởi động scripts\\start-cobalt-windows.bat.'
      : 'Không thể kết nối đến máy chủ Cobalt. Vui lòng kiểm tra lại URL hoặc mạng.',
    details: err?.message,
  };
}

/**
 * Safely parses raw text response into JSON, catching non-JSON responses (e.g. HTML 502/504).
 * 
 * @param {string} rawText
 * @returns {{ success: boolean, data?: object, error?: string, message?: string }}
 */
export function parseResponse(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return {
      success: false,
      error: 'MALFORMED_RESPONSE',
      message: 'Máy chủ trả về phản hồi không hợp lệ.',
    };
  }

  try {
    const data = JSON.parse(rawText);
    return {
      success: true,
      data,
    };
  } catch {
    return {
      success: false,
      error: 'MALFORMED_RESPONSE',
      message: 'Máy chủ trả về phản hồi không hợp lệ.',
    };
  }
}

/**
 * Parses and validates raw Cobalt v11.7.1 response into actionable extension commands:
 * - Redirect: HTTPS direct video download
 * - Tunnel: Signed tunnel URL with 100% preserved query parameters
 * - Picker: Multi-media tweet selection list
 * - Local-processing: Graceful fallback error
 * - Error: Structured Vietnamese error
 * 
 * @param {object} responseBody - Raw JSON object from Cobalt
 * @param {string} [instanceUrl] - Optional base instance URL
 * @returns {object} Actionable result object
 */
export function handleCobaltResponse(responseBody, instanceUrl = '') {
  if (!responseBody || typeof responseBody !== 'object') {
    return {
      success: false,
      error: 'MALFORMED_RESPONSE',
      message: 'Dữ liệu phản hồi từ máy chủ không hợp lệ.',
    };
  }

  const status = responseBody.status;

  // 1. Direct Redirect Download
  if (status === COBALT_RESPONSE_TYPES.REDIRECT) {
    const url = responseBody.url;
    if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
      return {
        success: false,
        error: 'INVALID_REDIRECT_URL',
        message: 'Đường dẫn tải video trả về không phải là URL HTTPS an toàn.',
      };
    }

    return {
      success: true,
      type: 'DOWNLOAD_DIRECT',
      downloadUrl: url,
      filename: responseBody.filename || '',
    };
  }

  // 2. Proxied / Remuxed Tunnel Stream
  if (status === COBALT_RESPONSE_TYPES.TUNNEL) {
    const url = responseBody.url;
    if (!url || typeof url !== 'string') {
      return {
        success: false,
        error: 'INVALID_TUNNEL_URL',
        message: 'Đường dẫn tunnel stream không hợp lệ.',
      };
    }

    // Tunnel URLs require all 5 query params (id, exp, sig, sec, iv) intact
    try {
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;
      const requiredParams = ['id', 'exp', 'sig', 'sec', 'iv'];
      const missing = requiredParams.filter((p) => !params.has(p));

      if (missing.length > 0) {
        return {
          success: false,
          error: 'INCOMPLETE_TUNNEL_URL',
          message: 'Đường dẫn stream thiếu tham số chữ ký bảo mật.',
        };
      }
    } catch {
      return {
        success: false,
        error: 'MALFORMED_TUNNEL_URL',
        message: 'Đường dẫn tunnel stream bị lỗi định dạng.',
      };
    }

    return {
      success: true,
      type: 'DOWNLOAD_TUNNEL',
      downloadUrl: url, // 100% preserved query parameters intact
      filename: responseBody.filename || '',
    };
  }

  // 3. Multi-Media Picker
  if (status === COBALT_RESPONSE_TYPES.PICKER) {
    const rawPicker = responseBody.picker;
    if (!Array.isArray(rawPicker) || rawPicker.length === 0) {
      return {
        success: false,
        error: 'EMPTY_PICKER',
        message: 'Danh sách video trong bài viết trống.',
      };
    }

    // Format picker media items
    const items = rawPicker.map((item, index) => ({
      index,
      type: item.type || 'video',
      url: item.url,
      thumb: item.thumb,
    }));

    return {
      success: true,
      type: 'PICKER',
      items,
      totalItems: items.length,
      audio: responseBody.audio,
      audioFilename: responseBody.audioFilename,
    };
  }

  // 4. Local Processing Fallback
  if (status === COBALT_RESPONSE_TYPES.LOCAL_PROCESSING) {
    return {
      success: false,
      error: 'LOCAL_PROCESSING_UNSUPPORTED',
      message: 'Máy chủ yêu cầu xử lý cục bộ (local processing), tính năng chưa được hỗ trợ trên trình duyệt.',
    };
  }

  // 5. Cobalt Error response
  if (status === COBALT_RESPONSE_TYPES.ERROR || responseBody.error) {
    const classified = classifyCobaltError(responseBody);
    return {
      success: false,
      error: classified.code,
      message: classified.message,
      retryAfter: classified.retryAfter,
      rawCode: classified.rawCode,
    };
  }

  return {
    success: false,
    error: 'UNKNOWN_STATUS',
    message: `Trạng thái phản hồi "${status}" không được hỗ trợ.`,
  };
}
