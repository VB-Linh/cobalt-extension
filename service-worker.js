const T = Object.freeze({
  SETTINGS: "xvt_settings",
  JWT_SESSION: "cobalt_jwt_session"
}), L = Object.freeze({
  cobaltUrl: "",
  videoQuality: "1080",
  apiKey: ""
}), _ = Object.freeze({
  DOWNLOAD_VIDEO: "DOWNLOAD_VIDEO",
  COBALT_DOWNLOAD: "COBALT_DOWNLOAD",
  OPEN_CDN: "OPEN_CDN",
  GET_SETTINGS: "GET_SETTINGS",
  TEST_CONNECTION: "TEST_CONNECTION",
  VERIFY_SESSION: "VERIFY_SESSION",
  GET_SESSION_STATUS: "GET_SESSION_STATUS",
  CLEAR_SESSION: "CLEAR_SESSION"
});
let b = { ...L };
async function w() {
  var e, t;
  try {
    if (typeof chrome < "u" && ((t = (e = chrome == null ? void 0 : chrome.storage) == null ? void 0 : e.local) != null && t.get)) {
      const r = await chrome.storage.local.get(T.SETTINGS), n = r == null ? void 0 : r[T.SETTINGS], i = { ...L, ...n || {} };
      return b = i, i;
    }
    return { ...b };
  } catch (r) {
    return console.error("[X Video Tools] Không thể đọc cấu hình từ storage:", r), b = { ...L }, { ...L };
  }
}
var G, K, j, F;
typeof chrome < "u" && ((K = (G = chrome == null ? void 0 : chrome.storage) == null ? void 0 : G.local) != null && K.get) && (w().catch(() => {
}), (F = (j = chrome == null ? void 0 : chrome.storage) == null ? void 0 : j.onChanged) != null && F.addListener && chrome.storage.onChanged.addListener((e, t) => {
  if (t === "local" && e[T.SETTINGS]) {
    const r = e[T.SETTINGS].newValue;
    b = { ...L, ...r || {} };
  }
}));
function O(e) {
  if (!e || typeof e != "string") return "";
  const t = e.trim();
  if (!t) return "";
  try {
    const r = new URL(t), n = r.protocol.toLowerCase(), i = r.host.toLowerCase();
    let o = r.pathname.replace(/\/+$/, "");
    return o === "/" && (o = ""), `${n}//${i}${o}`;
  } catch {
    return t.replace(/\/+$/, "");
  }
}
function v(e) {
  if (!e || typeof e != "string" || !e.trim())
    return { valid: !1, error: "EMPTY_URL" };
  const t = e.trim();
  let r;
  try {
    r = new URL(t);
  } catch {
    return { valid: !1, error: "MALFORMED_URL" };
  }
  const n = r.protocol.toLowerCase();
  return n !== "http:" && n !== "https:" ? { valid: !1, error: "INVALID_PROTOCOL" } : r.hostname ? {
    valid: !0,
    origin: r.origin,
    url: O(t)
  } : { valid: !1, error: "MALFORMED_URL" };
}
function z(e) {
  const t = v(e);
  return !t.valid || !t.origin ? null : `${t.origin}/*`;
}
function X(e) {
  if (!e)
    return "";
  const t = String(e).trim();
  if (!/^\d+$/.test(t))
    return "";
  const r = Number(t);
  return isNaN(r) || r <= 0 ? "" : (r / 1e15 * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}
async function Y(e, t = {}) {
  var c, u;
  const r = typeof t.timeout == "number" ? t.timeout : 1e4, n = X(e);
  if (!n)
    return {
      success: !1,
      error: "INVALID_TWEET_ID",
      message: "Mã số bài viết (Tweet ID) không hợp lệ"
    };
  const i = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(e)}&token=${n}&lang=en`, o = new AbortController(), s = setTimeout(() => {
    o.abort();
  }, r);
  try {
    const a = await fetch(i, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: o.signal
    });
    if (clearTimeout(s), a.status === 429)
      return {
        success: !1,
        error: "API_RATE_LIMIT",
        status: 429,
        message: "Bị giới hạn tần suất truy vấn từ X (Rate limited)"
      };
    if (a.status === 404)
      return {
        success: !1,
        error: "TWEET_INACCESSIBLE",
        status: 404,
        message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
      };
    if (a.status === 403)
      return {
        success: !1,
        error: "TWEET_INACCESSIBLE",
        status: 403,
        message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
      };
    if (!a.ok)
      return {
        success: !1,
        error: "HTTP_ERROR",
        status: a.status,
        message: `Lỗi kết nối máy chủ (${a.status})`
      };
    const l = await a.json();
    return l != null && l.tombstone || l != null && l.errors || (l == null ? void 0 : l.__typename) === "TweetTombstone" ? {
      success: !1,
      error: "TWEET_INACCESSIBLE",
      message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
    } : {
      success: !0,
      data: l,
      mediaDetails: (l == null ? void 0 : l.mediaDetails) || []
    };
  } catch (a) {
    return clearTimeout(s), a.name === "AbortError" || (c = a.message) != null && c.includes("aborted") || (u = a.message) != null && u.includes("timeout") ? {
      success: !1,
      error: "API_TIMEOUT",
      message: "Hết thời gian chờ phản hồi từ máy chủ X"
    } : {
      success: !1,
      error: "NETWORK_ERROR",
      message: a.message || "Lỗi kết nối mạng"
    };
  }
}
const q = "video.twimg.com";
function Q(e) {
  if (!e || typeof e != "string")
    return !1;
  const t = e.trim();
  if (!t || t.startsWith("blob:") || t.startsWith("data:") || t.startsWith("javascript:"))
    return !1;
  try {
    const r = new URL(t);
    if (r.protocol !== "https:" || r.hostname.toLowerCase() !== q)
      return !1;
    const i = r.pathname;
    if (!i || i === "/" || i.trim() === "")
      return !1;
    const o = i.toLowerCase();
    return !(o.endsWith(".jpg") || o.endsWith(".jpeg") || o.endsWith(".png") || o.endsWith(".webp"));
  } catch {
    return !1;
  }
}
async function J(e) {
  if (!Q(e))
    return {
      success: !1,
      error: "ERR_INVALID_URL",
      message: "URL CDN không hợp lệ hoặc không an toàn"
    };
  try {
    const t = await chrome.tabs.create({ url: e });
    return {
      success: !0,
      tabId: t == null ? void 0 : t.id,
      url: e
    };
  } catch (t) {
    return {
      success: !1,
      error: "TAB_CREATE_FAILED",
      message: t.message || "Không thể mở tab mới"
    };
  }
}
let p = null;
function k() {
  var e, t;
  return typeof chrome < "u" && !!((t = (e = chrome == null ? void 0 : chrome.storage) == null ? void 0 : e.session) != null && t.get);
}
async function Z(e, t, r = 180) {
  if (!t || typeof t != "string" || !t.trim())
    throw new TypeError("JWT token phải là một chuỗi không rỗng.");
  const n = O(e), i = typeof r == "number" && r > 0 ? r : 180, o = Math.floor(Date.now() / 1e3) + i, s = {
    token: t.trim(),
    exp: o,
    instanceUrl: n,
    createdAt: Date.now()
  };
  if (p = s, k())
    try {
      await chrome.storage.session.set({
        [T.JWT_SESSION]: s
      });
    } catch {
    }
  return { success: !0, expiresAt: o };
}
function ee(e = "") {
  if (!p || !p.token) return null;
  if (e && typeof e == "string" && e.trim()) {
    const r = O(e);
    if (p.instanceUrl && p.instanceUrl !== r)
      return null;
  }
  return Math.floor(Date.now() / 1e3) >= p.exp - 3 ? (p = null, null) : p.token;
}
async function te(e = "") {
  let t = p;
  if (k())
    try {
      const n = await chrome.storage.session.get(T.JWT_SESSION);
      n && n[T.JWT_SESSION] && (t = n[T.JWT_SESSION]);
    } catch {
      t = p;
    }
  if (!t || !t.token)
    return null;
  if (e && typeof e == "string" && e.trim()) {
    const n = O(e);
    if (t.instanceUrl && t.instanceUrl !== n)
      return null;
  }
  return Math.floor(Date.now() / 1e3) >= t.exp - 3 ? (await P(), null) : t.token;
}
async function P() {
  if (p = null, k())
    try {
      await chrome.storage.session.remove(T.JWT_SESSION);
    } catch {
    }
}
async function re(e = "") {
  let t = p;
  if (k())
    try {
      const i = await chrome.storage.session.get(T.JWT_SESSION);
      i && i[T.JWT_SESSION] && (t = i[T.JWT_SESSION]);
    } catch {
      t = p;
    }
  if (!t || !t.token)
    return {
      authenticated: !1,
      expired: !1,
      expiresIn: null,
      instanceUrl: null
    };
  if (e && typeof e == "string" && e.trim()) {
    const i = O(e);
    if (t.instanceUrl && t.instanceUrl !== i)
      return {
        authenticated: !1,
        expired: !1,
        expiresIn: null,
        instanceUrl: t.instanceUrl
      };
  }
  const r = Math.floor(Date.now() / 1e3), n = t.exp - r;
  return n <= 0 ? {
    authenticated: !1,
    expired: !0,
    expiresIn: 0,
    instanceUrl: t.instanceUrl
  } : {
    authenticated: !0,
    expired: !1,
    expiresIn: n,
    instanceUrl: t.instanceUrl
  };
}
const ne = "max", ie = 15e3, se = Object.freeze([
  "max",
  "4320",
  "2160",
  "1440",
  "1080",
  "720",
  "480",
  "360",
  "240",
  "144"
]), oe = Object.freeze([
  "best",
  "mp3",
  "ogg",
  "wav",
  "opus"
]);
function B(e = "", t = "") {
  const r = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return typeof e == "string" && e.trim().length > 0 ? r.Authorization = `Api-Key ${e.trim()}` : typeof t == "string" && t.trim().length > 0 && (r.Authorization = `Bearer ${t.trim()}`), r;
}
function ae(e = {}) {
  if (!e.url || typeof e.url != "string")
    throw new TypeError('Tham số "url" là bắt buộc và phải là chuỗi hợp lệ.');
  let t = e.videoQuality;
  !t || !se.includes(String(t)) ? t = ne : t = String(t);
  let r = e.audioFormat;
  !r || !oe.includes(String(r)) ? r = "mp3" : r = String(r);
  let n = e.downloadMode;
  !n || !["auto", "audio", "mute"].includes(String(n)) ? n = "auto" : n = String(n);
  let i = e.filenameStyle;
  return !i || !["classic", "pretty", "basic", "nerdy"].includes(String(i)) ? i = "basic" : i = String(i), {
    url: e.url.trim(),
    videoQuality: t,
    audioFormat: r,
    downloadMode: n,
    filenameStyle: i,
    localProcessing: "disabled",
    alwaysProxy: !!e.alwaysProxy
  };
}
async function ce(e = {}) {
  var y, S, h;
  const t = e.apiUrl || e.instanceUrl;
  if (!t || typeof t != "string" || !t.trim())
    return {
      success: !1,
      error: "UNCONFIGURED",
      message: "Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập."
    };
  if (!v(t).valid)
    return {
      success: !1,
      error: "INVALID_URL",
      message: "URL máy chủ Cobalt không hợp lệ."
    };
  const i = `${O(t)}/`, o = ae({
    url: e.url,
    videoQuality: e.videoQuality,
    audioFormat: e.audioFormat,
    downloadMode: e.downloadMode,
    filenameStyle: e.filenameStyle,
    alwaysProxy: e.alwaysProxy
  }), s = e.sessionToken || (e.apiKey ? "" : ee(t)) || "", c = B(e.apiKey, s), u = typeof e.timeout == "number" ? e.timeout : ie, a = new AbortController();
  let l = !1, d = null;
  u > 0 && (d = setTimeout(() => {
    l = !0, a.abort();
  }, u)), e.signal && (e.signal.aborted ? a.abort() : e.signal.addEventListener("abort", () => a.abort(), { once: !0 }));
  try {
    const g = await fetch(i, {
      method: "POST",
      headers: c,
      body: JSON.stringify(o),
      signal: a.signal
    });
    d && clearTimeout(d);
    let f;
    const I = await g.text();
    try {
      f = JSON.parse(I);
    } catch {
      return {
        success: !1,
        error: "MALFORMED_RESPONSE",
        message: "Máy chủ trả về phản hồi không hợp lệ.",
        httpStatus: g.status
      };
    }
    if (!g.ok || f.status === "error") {
      const m = ((y = f.error) == null ? void 0 : y.code) || "API_ERROR";
      if (m === "error.api.auth.jwt.invalid" || m === "error.api.auth.jwt.missing")
        try {
          await P();
        } catch {
        }
      return {
        success: !1,
        status: "error",
        error: m,
        code: m,
        context: ((S = f.error) == null ? void 0 : S.context) || {},
        httpStatus: g.status,
        raw: f
      };
    }
    return {
      success: !0,
      status: f.status,
      url: f.url,
      filename: f.filename,
      picker: f.picker,
      raw: f
    };
  } catch (g) {
    if (d && clearTimeout(d), l) {
      const f = new Error("Hết thời gian chờ phản hồi từ máy chủ Cobalt.");
      throw Object.assign(f, {
        success: !1,
        error: "API_TIMEOUT",
        code: "API_TIMEOUT"
      }), f;
    }
    if ((h = e.signal) != null && h.aborted || g.name === "AbortError") {
      const f = new Error("Yêu cầu đã bị hủy.");
      throw Object.assign(f, {
        success: !1,
        error: "ABORTED",
        code: "ABORTED",
        cancelled: !0
      }), f;
    }
    return {
      success: !1,
      error: "UNREACHABLE",
      message: "Không thể kết nối đến máy chủ Cobalt. Kiểm tra URL hoặc kết nối mạng.",
      details: g.message
    };
  }
}
async function le(e, t = "", r = {}) {
  var s, c, u, a;
  if (!e || typeof e != "string" || !e.trim())
    return {
      healthy: !1,
      error: "UNCONFIGURED",
      message: "Chưa cấu hình URL máy chủ Cobalt."
    };
  if (!v(e).valid)
    return {
      healthy: !1,
      error: "INVALID_URL",
      message: "URL máy chủ Cobalt không hợp lệ."
    };
  const i = O(e), o = `${i}/`;
  try {
    const l = await fetch(o, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: r.signal
    });
    if (!l.ok)
      return {
        healthy: !1,
        status: l.status,
        error: "SERVER_ERROR",
        message: `Máy chủ phản hồi với mã lỗi HTTP ${l.status}`
      };
    const d = await l.json(), y = ((s = d.cobalt) == null ? void 0 : s.version) || "unknown", S = ((c = d.cobalt) == null ? void 0 : c.services) || [];
    let h = null;
    if (t && t.trim().length > 0 && (h = await ue(i, t.trim()), h && !h.valid))
      return {
        healthy: !1,
        version: y,
        services: S,
        error: h.error || "AUTH_KEY_INVALID",
        message: "API Key không chính xác hoặc không được chấp nhận bởi máy chủ."
      };
    const g = !!((u = d.cobalt) != null && u.turnstileSitekey), f = ((a = d.cobalt) == null ? void 0 : a.turnstileSitekey) || null;
    return {
      healthy: !0,
      version: y,
      services: S,
      turnstileRequired: g,
      turnstileSitekey: f,
      keyValidation: h,
      raw: d
    };
  } catch (l) {
    return {
      healthy: !1,
      error: "UNREACHABLE",
      message: "Không thể kết nối đến máy chủ Cobalt. Kiểm tra URL hoặc kết nối mạng.",
      details: l.message
    };
  }
}
async function ue(e, t) {
  var r;
  try {
    const i = await (await fetch(`${e}/`, {
      method: "POST",
      headers: B(t),
      body: JSON.stringify({})
    })).json().catch(() => ({})), o = (r = i == null ? void 0 : i.error) == null ? void 0 : r.code;
    return o === "error.api.link.missing" ? { valid: !0 } : o && (o.startsWith("error.api.auth.key.") || o.startsWith("error.api.auth.jwt.")) ? { valid: !1, error: o } : { valid: !0 };
  } catch {
    return { valid: !1, error: "PROBE_FAILED" };
  }
}
const C = Object.freeze({
  REDIRECT: "redirect",
  TUNNEL: "tunnel",
  PICKER: "picker",
  LOCAL_PROCESSING: "local-processing",
  ERROR: "error"
}), M = Object.freeze({
  "error.api.rate_exceeded": "Đã vượt quá giới hạn tải. Vui lòng thử lại sau {limit} giây.",
  "error.api.header.accept": "Yêu cầu không hợp lệ (header Accept phải là application/json).",
  "error.api.header.content_type": "Yêu cầu không hợp lệ (header Content-Type phải là application/json).",
  "error.api.invalid_body": "Dữ liệu yêu cầu không hợp lệ hoặc cấu trúc payload không đúng chuẩn Cobalt.",
  "error.api.link.missing": "Thiếu liên kết bài viết cần tải.",
  "error.api.link.invalid": "Đường dẫn bài viết không hợp lệ hoặc không được Cobalt hỗ trợ.",
  "error.api.link.unsupported": "Định dạng liên kết bài viết này chưa được hỗ trợ.",
  "error.api.service.disabled": "Dịch vụ này hiện đang bị vô hiệu hóa trên máy chủ Cobalt.",
  "error.api.service.unsupported": "Dịch vụ này không nằm trong danh sách hỗ trợ của Cobalt.",
  "error.api.service.audio_not_supported": "Dịch vụ này không hỗ trợ chế độ chỉ tải âm thanh.",
  // Authentication errors
  "error.api.auth.key.missing": "Yêu cầu API Key hợp lệ. Vui lòng thiết lập trong cài đặt.",
  "error.api.auth.key.not_api_key": 'Phương thức xác thực không đúng chuẩn (cần dùng tiền tố "Api-Key").',
  "error.api.auth.key.invalid": "Yêu cầu API Key hợp lệ. Vui lòng thiết lập trong cài đặt.",
  "error.api.auth.key.not_found": "API Key không chính xác hoặc đã bị vô hiệu hóa trên máy chủ Cobalt.",
  "error.api.auth.key.invalid_ip": "Địa chỉ IP của bạn không hợp lệ đối với máy chủ Cobalt.",
  "error.api.auth.key.ip_not_allowed": "Địa chỉ IP hiện tại không được phép sử dụng API Key này.",
  "error.api.auth.key.ua_not_allowed": "User-Agent của trình duyệt không được phép sử dụng API Key này.",
  "error.api.auth.jwt.missing": "Máy chủ yêu cầu xác thực phiên Turnstile hoặc API Key. Vui lòng hoàn thành xác thực.",
  "error.api.auth.jwt.invalid": "Phiên xác thực hoặc API Key không hợp lệ hoặc đã hết hạn trên máy chủ Cobalt.",
  "error.api.auth.not_configured": "Máy chủ chưa cấu hình tính năng xác thực phiên Turnstile.",
  "error.api.auth.turnstile.missing": "Thiếu phản hồi giải đố Turnstile. Vui lòng xác thực lại.",
  "error.api.auth.turnstile.invalid": "Mã phản hồi Turnstile không hợp lệ hoặc đã hết hạn. Vui lòng xác thực lại.",
  // Fetch & Content errors
  "error.api.fetch.empty": "Không tìm thấy video hoặc tệp phương tiện nào trong bài viết này.",
  "error.api.fetch.fail": "Không thể lấy thông tin video từ X (Twitter). Vui lòng thử lại sau hoặc dùng Mở CDN.",
  "error.api.fetch.rate": "Máy chủ Cobalt đang bị nền tảng X giới hạn lượt truy cập. Vui lòng thử lại sau.",
  "error.api.fetch.critical": "Đã xảy ra lỗi nghiêm trọng khi xử lý video từ nền tảng.",
  "error.api.fetch.critical.core": "Lỗi nội bộ hệ thống xử lý tệp của máy chủ Cobalt.",
  "error.api.fetch.short_link": "Không thể mở rộng liên kết rút gọn của bài viết.",
  "error.api.content.too_long": "Video vượt quá giới hạn thời lượng cho phép của máy chủ ({limit} phút).",
  "error.api.content.post.private": "Bài viết hoặc tài khoản này được đặt ở chế độ riêng tư, không thể tải.",
  "error.api.content.post.age": "Bài viết bị giới hạn độ tuổi người xem (yêu cầu cookie xác thực trên máy chủ).",
  "error.api.content.post.unavailable": "Bài viết không còn khả dụng hoặc đã bị người đăng xóa.",
  "error.api.content.video.private": "Video này là video riêng tư, không thể tải.",
  "error.api.content.video.age": "Video yêu cầu xác thực độ tuổi người xem.",
  "error.api.content.video.unavailable": "Video không khả dụng trên X (Twitter).",
  "error.api.content.video.live": "Không hỗ trợ tải luồng phát trực tiếp (livestream).",
  "error.api.content.video.region": "Video bị chặn tại khu vực địa lý của máy chủ Cobalt.",
  "error.api.generic": "Đã xảy ra lỗi không xác định trên máy chủ Cobalt. Vui lòng thử lại sau."
});
function x(e) {
  var i, o;
  let t = "", r = {};
  if (typeof e == "string" ? t = e : e && typeof e == "object" && (t = e.code || ((i = e.error) == null ? void 0 : i.code) || e.error || "", r = e.context || ((o = e.error) == null ? void 0 : o.context) || {}), t === "error.api.auth.key.missing" || t === "error.api.auth.key.invalid" || t === "auth.key.missing" || t === "auth.key.invalid")
    return {
      code: "AUTH_REQUIRED",
      rawCode: t,
      message: "Yêu cầu API Key hợp lệ. Vui lòng thiết lập trong cài đặt."
    };
  if (t === "error.api.auth.jwt.missing" || t === "error.api.auth.jwt.invalid" || t === "auth.jwt.missing" || t === "auth.jwt.invalid") {
    const s = t.includes("invalid");
    return {
      code: s ? "AUTH_EXPIRED" : "AUTH_REQUIRED",
      rawCode: t,
      message: s ? "Phiên xác thực Turnstile hoặc API Key không hợp lệ hoặc đã hết hạn." : "Máy chủ yêu cầu xác thực phiên Turnstile hoặc API Key."
    };
  }
  if (t === "error.api.auth.turnstile.invalid" || t === "auth.turnstile.invalid")
    return {
      code: "AUTH_TURNSTILE_INVALID",
      rawCode: t,
      message: "Mã phản hồi Turnstile không hợp lệ hoặc đã hết hạn. Vui lòng xác thực lại."
    };
  if (t === "error.api.auth.turnstile.missing" || t === "auth.turnstile.missing")
    return {
      code: "AUTH_TURNSTILE_MISSING",
      rawCode: t,
      message: "Thiếu phản hồi giải đố Turnstile. Vui lòng xác thực lại."
    };
  if (t === "error.api.auth.key.not_found" || t === "auth.key.not_found")
    return {
      code: "AUTH_FAILED",
      rawCode: t,
      message: "API Key không chính xác hoặc đã bị vô hiệu hóa trên máy chủ Cobalt."
    };
  if (t === "error.api.rate_exceeded" || t === "rate_exceeded") {
    const s = r.limit || 15;
    return {
      code: "RATE_LIMIT",
      rawCode: t,
      retryAfter: Number(s),
      message: `Đã vượt quá giới hạn tải. Vui lòng thử lại sau ${s} giây.`
    };
  }
  if (t.includes("content.video.private") || t.includes("content.post.private"))
    return {
      code: "CONTENT_PRIVATE",
      rawCode: t,
      message: "Video hoặc bài viết này được đặt ở chế độ riêng tư, không thể tải."
    };
  if (t.includes("content.video.age") || t.includes("content.post.age"))
    return {
      code: "AGE_RESTRICTED",
      rawCode: t,
      message: "Video bị giới hạn độ tuổi người xem, yêu cầu đăng nhập trên máy chủ."
    };
  if (t.includes("content.video.unavailable") || t.includes("content.post.unavailable"))
    return {
      code: "CONTENT_UNAVAILABLE",
      rawCode: t,
      message: "Bài viết hoặc video không còn khả dụng trên X (Twitter)."
    };
  if (t.includes("fetch.rate"))
    return {
      code: "UPSTREAM_RATE_LIMIT",
      rawCode: t,
      message: "Máy chủ Cobalt đang bị nền tảng X giới hạn lượt truy cập. Vui lòng thử lại sau."
    };
  if (t.includes("fetch.fail"))
    return {
      code: "FETCH_FAILED",
      rawCode: t,
      message: "Không thể lấy thông tin video từ X (Twitter). Vui lòng thử lại sau hoặc dùng Mở CDN."
    };
  if (t.includes("fetch.empty"))
    return {
      code: "NO_MEDIA_FOUND",
      rawCode: t,
      message: "Không tìm thấy video hoặc tệp phương tiện nào trong bài viết này."
    };
  let n = M[t] || M["error.api.generic"];
  return r.limit && (n = n.replace("{limit}", String(r.limit))), r.service && (n = n.replace("{service}", String(r.service))), {
    code: "API_ERROR",
    rawCode: t,
    message: n
  };
}
function he(e, t = "") {
  if (!e || typeof e != "object")
    return {
      success: !1,
      error: "MALFORMED_RESPONSE",
      message: "Dữ liệu phản hồi từ máy chủ không hợp lệ."
    };
  const r = e.status;
  if (r === C.REDIRECT) {
    const n = e.url;
    return !n || typeof n != "string" || !n.startsWith("https://") ? {
      success: !1,
      error: "INVALID_REDIRECT_URL",
      message: "Đường dẫn tải video trả về không phải là URL HTTPS an toàn."
    } : {
      success: !0,
      type: "DOWNLOAD_DIRECT",
      downloadUrl: n,
      filename: e.filename || ""
    };
  }
  if (r === C.TUNNEL) {
    const n = e.url;
    if (!n || typeof n != "string")
      return {
        success: !1,
        error: "INVALID_TUNNEL_URL",
        message: "Đường dẫn tunnel stream không hợp lệ."
      };
    try {
      const o = new URL(n).searchParams;
      if (["id", "exp", "sig", "sec", "iv"].filter((u) => !o.has(u)).length > 0)
        return {
          success: !1,
          error: "INCOMPLETE_TUNNEL_URL",
          message: "Đường dẫn stream thiếu tham số chữ ký bảo mật."
        };
    } catch {
      return {
        success: !1,
        error: "MALFORMED_TUNNEL_URL",
        message: "Đường dẫn tunnel stream bị lỗi định dạng."
      };
    }
    return {
      success: !0,
      type: "DOWNLOAD_TUNNEL",
      downloadUrl: n,
      // 100% preserved query parameters intact
      filename: e.filename || ""
    };
  }
  if (r === C.PICKER) {
    const n = e.picker;
    if (!Array.isArray(n) || n.length === 0)
      return {
        success: !1,
        error: "EMPTY_PICKER",
        message: "Danh sách video trong bài viết trống."
      };
    const i = n.map((o, s) => ({
      index: s,
      type: o.type || "video",
      url: o.url,
      thumb: o.thumb
    }));
    return {
      success: !0,
      type: "PICKER",
      items: i,
      totalItems: i.length,
      audio: e.audio,
      audioFilename: e.audioFilename
    };
  }
  if (r === C.LOCAL_PROCESSING)
    return {
      success: !1,
      error: "LOCAL_PROCESSING_UNSUPPORTED",
      message: "Máy chủ yêu cầu xử lý cục bộ (local processing), tính năng chưa được hỗ trợ trên trình duyệt."
    };
  if (r === C.ERROR || e.error) {
    const n = x(e);
    return {
      success: !1,
      error: n.code,
      message: n.message,
      retryAfter: n.retryAfter,
      rawCode: n.rawCode
    };
  }
  return {
    success: !1,
    error: "UNKNOWN_STATUS",
    message: `Trạng thái phản hồi "${r}" không được hỗ trợ.`
  };
}
const E = Object.freeze({
  INITIATED: "initiated",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  INTERRUPTED: "interrupted",
  CANCELLED: "cancelled",
  ERROR: "error"
}), N = /* @__PURE__ */ new Map(), D = /* @__PURE__ */ new Map();
let V = !1;
function U(e) {
  return !e || typeof e != "string" ? "" : e.replace(/[\\/:*?"<>|]/g, "_").trim();
}
function fe(e, t = "", r = "mp4") {
  let n = "", i = "", o = r;
  e && typeof e == "object" ? (n = e.tweetId || "", i = e.username || "", o = e.extension || r) : (n = String(e || ""), i = t), o = String(o || "mp4").replace(/^\.+/, "").trim() || "mp4";
  let s = "video";
  i && typeof i == "string" && i.trim() && i !== "null" && i !== "undefined" && (s = U(i), s || (s = "video"));
  const c = U(n) || "unknown";
  return `X_${s}_${c}.${o}`;
}
function H() {
  var e, t;
  V || typeof chrome > "u" || !((t = (e = chrome.downloads) == null ? void 0 : e.onChanged) != null && t.addListener) || (chrome.downloads.onChanged.addListener((r) => {
    var o;
    if (!r || !r.id) return;
    const n = r.id, i = D.get(n);
    if (i && r.state) {
      const s = r.state.current;
      if (s === "complete")
        i.state = E.COMPLETED, i.videoKey && N.delete(i.videoKey), D.delete(n), typeof i.onComplete == "function" && i.onComplete({ downloadId: n, state: E.COMPLETED }), typeof i.resolve == "function" && i.resolve({ success: !0, downloadId: n, state: E.COMPLETED });
      else if (s === "interrupted") {
        const c = ((o = r.error) == null ? void 0 : o.current) || "UNKNOWN_ERROR", u = c === "USER_CANCELED";
        if (i.state = u ? E.CANCELLED : E.INTERRUPTED, i.videoKey && N.delete(i.videoKey), D.delete(n), u)
          typeof i.onCancel == "function" && i.onCancel({ downloadId: n, state: E.CANCELLED }), typeof i.resolve == "function" && i.resolve({ success: !0, downloadId: n, state: E.CANCELLED, cancelled: !0 });
        else {
          const a = "Quá trình tải video bị gián đoạn do lỗi kết nối mạng.";
          if (typeof i.onError == "function" && i.onError({ downloadId: n, error: c, message: a }), typeof i.reject == "function") {
            const l = new Error(a);
            Object.assign(l, { downloadId: n, error: c, state: E.INTERRUPTED }), i.reject(l);
          }
        }
      }
    }
  }), V = !0);
}
async function ge(e = {}) {
  if (H(), !e.url || typeof e.url != "string")
    return {
      success: !1,
      error: "INVALID_URL",
      message: "Thiếu đường dẫn tải tệp."
    };
  let t = e.filename;
  t ? (t = U(t), !t.endsWith(".mp4") && !t.endsWith(".gif") && !t.endsWith(".mp3") && (t += ".mp4")) : t = fe(e.tweetId, e.username, "mp4");
  try {
    return {
      success: !0,
      downloadId: await chrome.downloads.download({
        url: e.url,
        filename: t,
        conflictAction: "uniquify",
        saveAs: !1
      }),
      filename: t
    };
  } catch (r) {
    return {
      success: !1,
      error: "DOWNLOAD_FAILED",
      message: r.message || "Không thể bắt đầu tải tệp."
    };
  }
}
function de(e, t = {}) {
  return H(), new Promise((r, n) => {
    D.set(e, {
      downloadId: e,
      videoKey: t.videoKey,
      state: E.IN_PROGRESS,
      onComplete: t.onComplete,
      onError: t.onError,
      onCancel: t.onCancel,
      resolve: r,
      reject: n
    });
  });
}
async function W(e, t = {}) {
  if (e && N.has(e)) {
    const n = N.get(e);
    if (n.state === E.IN_PROGRESS || n.state === E.INITIATED)
      return {
        blocked: !0,
        success: !1,
        reason: "DOWNLOAD_IN_PROGRESS",
        message: "Video này đang trong quá trình tải xuống."
      };
  }
  const r = t.correlationId || `${e}_${Date.now()}`;
  e && N.set(e, {
    state: E.INITIATED,
    correlationId: r,
    startTime: Date.now()
  });
  try {
    const n = await ge(t);
    if (!n.success)
      return e && N.delete(e), n;
    if (e) {
      const i = N.get(e);
      i && (i.downloadId = n.downloadId, i.state = E.IN_PROGRESS);
    }
    return de(n.downloadId, {
      videoKey: e
    }).catch(() => {
    }), {
      success: !0,
      downloadId: n.downloadId,
      filename: n.filename,
      correlationId: r
    };
  } catch (n) {
    return e && N.delete(e), {
      success: !1,
      error: "DOWNLOAD_EXCEPTION",
      message: n.message
    };
  }
}
const me = 15e3;
function Ee(e) {
  return !e || typeof e != "object" ? { valid: !1, error: "MALFORMED_SESSION_DATA" } : typeof e.token != "string" || !e.token.trim() ? { valid: !1, error: "INVALID_SESSION_TOKEN" } : typeof e.exp != "number" || Number.isNaN(e.exp) || e.exp <= 0 ? { valid: !1, error: "INVALID_SESSION_EXPIRY" } : { valid: !0 };
}
async function pe(e, t, r = {}) {
  var l, d, y, S;
  if (!e || typeof e != "string" || !e.trim())
    return {
      success: !1,
      error: "UNCONFIGURED",
      code: "UNCONFIGURED",
      message: "Chưa cài đặt Cobalt URL. Vui lòng thiết lập trong cài đặt."
    };
  if (!v(e).valid)
    return {
      success: !1,
      error: "INVALID_URL",
      code: "INVALID_URL",
      message: "URL máy chủ Cobalt không hợp lệ."
    };
  if (!t || typeof t != "string" || !t.trim())
    return {
      success: !1,
      error: "TURNSTILE_RESPONSE_MISSING",
      code: "TURNSTILE_RESPONSE_MISSING",
      message: "Thiếu mã xác thực Turnstile. Vui lòng hoàn thành xác thực."
    };
  const o = `${O(e)}/session`, s = typeof r.timeout == "number" ? r.timeout : me, c = new AbortController();
  let u = !1;
  const a = setTimeout(() => {
    u = !0, c.abort();
  }, s);
  r.signal && (r.signal.aborted ? c.abort() : r.signal.addEventListener("abort", () => c.abort(), { once: !0 }));
  try {
    const h = await fetch(o, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "cf-turnstile-response": t.trim()
      },
      signal: c.signal
    });
    clearTimeout(a);
    let g;
    try {
      g = await h.json();
    } catch {
      return {
        success: !1,
        error: "MALFORMED_RESPONSE",
        code: "MALFORMED_RESPONSE",
        message: "Máy chủ phản hồi dữ liệu không hợp lệ."
      };
    }
    if (!h.ok || g.status === "error") {
      const I = x(g);
      return {
        success: !1,
        error: I.code || ((l = g.error) == null ? void 0 : l.code) || "AUTH_SESSION_REJECTED",
        code: I.code || ((d = g.error) == null ? void 0 : d.code) || "AUTH_SESSION_REJECTED",
        rawCode: ((y = g.error) == null ? void 0 : y.code) || I.rawCode,
        message: I.message || "Xác thực Turnstile không thành công hoặc bị máy chủ từ chối.",
        httpStatus: h.status
      };
    }
    const f = Ee(g);
    return f.valid ? {
      success: !0,
      token: g.token,
      exp: g.exp
    } : {
      success: !1,
      error: f.error,
      code: f.error,
      message: "Phản hồi phiên xác thực từ máy chủ không đúng định dạng chuẩn."
    };
  } catch (h) {
    return clearTimeout(a), u ? {
      success: !1,
      error: "TIMEOUT",
      code: "TIMEOUT",
      message: "Hết thời gian chờ phản hồi xác thực từ máy chủ Cobalt."
    } : (S = r.signal) != null && S.aborted || h.name === "AbortError" ? {
      success: !1,
      error: "ABORTED",
      code: "ABORTED",
      message: "Yêu cầu xác thực đã bị hủy."
    } : {
      success: !1,
      error: "UNREACHABLE",
      code: "UNREACHABLE",
      message: "Không thể kết nối tới máy chủ để xác thực phiên: " + h.message
    };
  }
}
console.log("[X Video Tools] Background Service Worker (ESM) đã khởi động.");
chrome.runtime.onMessage.addListener((e, t, r) => {
  var i, o;
  const n = (e == null ? void 0 : e.action) || (e == null ? void 0 : e.type);
  if (n === "FETCH_SYNDICATION" || n === "XVT_FETCH_SYNDICATION") {
    const s = ((i = e.payload) == null ? void 0 : i.tweetId) || e.tweetId;
    return Y(s, e.options).then((c) => r(c)).catch((c) => r({
      success: !1,
      error: "INTERNAL_ERROR",
      message: c.message || "Lỗi xử lý nội bộ Service Worker"
    })), !0;
  }
  if (n === "OPEN_CDN" || n === "OPEN_TAB" || n === "XVT_OPEN_TAB" || n === _.OPEN_CDN) {
    const s = ((o = e.payload) == null ? void 0 : o.url) || e.url;
    return J(s).then((c) => r(c)).catch((c) => r({
      success: !1,
      error: "INTERNAL_ERROR",
      message: c.message || "Lỗi xử lý mở tab mới"
    })), !0;
  }
  if (n === _.GET_SETTINGS || n === "GET_SETTINGS")
    return w().then((s) => {
      r({
        success: !0,
        data: {
          cobaltUrl: s.cobaltUrl || "",
          hasApiKey: !!s.apiKey,
          videoQuality: s.videoQuality || "max",
          status: s.cobaltUrl ? "Configured" : "Unconfigured"
        }
      });
    }).catch((s) => {
      r({
        success: !1,
        error: "STORAGE_ERROR",
        message: s.message
      });
    }), !0;
  if (n === _.TEST_CONNECTION || n === "TEST_CONNECTION" || n === "XVT_TEST_CONNECTION") {
    const s = e.payload || e, c = s.apiUrl, u = s.apiKey || "";
    return le(c, u).then((a) => r(a)).catch((a) => r({
      healthy: !1,
      success: !1,
      error: "TEST_FAILED",
      message: a.message || "Lỗi khi kiểm tra kết nối"
    })), !0;
  }
  if (n === _.VERIFY_SESSION || n === "VERIFY_SESSION") {
    const s = e.payload || e, { instanceUrl: c, turnstileResponse: u } = s;
    return pe(c, u).then(async (a) => {
      if (!a.success)
        return r(a);
      await Z(c, a.token, a.exp), r({
        success: !0,
        exp: a.exp,
        message: "Xác thực phiên làm việc thành công!"
      });
    }).catch((a) => {
      r({
        success: !1,
        error: "SESSION_VERIFY_EXCEPTION",
        message: a.message || "Lỗi ngoại lệ khi gửi xác thực phiên."
      });
    }), !0;
  }
  if (n === _.GET_SESSION_STATUS || n === "GET_SESSION_STATUS") {
    const s = e.payload || e, c = (s == null ? void 0 : s.instanceUrl) || "";
    return re(c).then((u) => r({ success: !0, ...u })).catch((u) => r({ success: !1, error: "STATUS_ERROR", message: u.message })), !0;
  }
  if (n === _.CLEAR_SESSION || n === "CLEAR_SESSION")
    return P().then(() => r({ success: !0 })).catch((s) => r({ success: !1, error: "CLEAR_ERROR", message: s.message })), !0;
  if (n === _.DOWNLOAD_VIDEO || n === _.COBALT_DOWNLOAD || n === "COBALT_DOWNLOAD" || n === "XVT_COBALT_DOWNLOAD") {
    const s = e.payload || e, { tweetId: c, permalink: u, username: a, videoKey: l, correlationId: d, selectedUrl: y } = s;
    return (async () => {
      var S;
      try {
        if (y) {
          const R = await W(l, {
            url: y,
            tweetId: c,
            username: a,
            correlationId: d
          });
          return r(R);
        }
        const h = await w();
        if (!h.cobaltUrl)
          return r({
            success: !1,
            error: "UNCONFIGURED",
            message: "Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập."
          });
        const g = z(h.cobaltUrl);
        if (g && ((S = chrome.permissions) != null && S.contains) && !await chrome.permissions.contains({ origins: [g] }))
          return r({
            success: !1,
            error: "PERMISSION_REQUIRED",
            message: "Cần cấp quyền truy cập máy chủ Cobalt trong cài đặt tiện ích."
          });
        const f = u || (c ? `https://x.com/i/status/${c}` : "");
        if (!f)
          return r({
            success: !1,
            error: "MISSING_URL",
            message: "Thiếu đường dẫn bài viết cần tải."
          });
        let I = "";
        h.apiKey || (I = await te(h.cobaltUrl) || "");
        const m = await ce({
          url: f,
          apiUrl: h.cobaltUrl,
          apiKey: h.apiKey,
          sessionToken: I,
          videoQuality: h.videoQuality || "max"
        });
        if (!m.success) {
          const R = x(m.raw || m);
          return r({
            success: !1,
            error: R.code || m.error,
            code: R.code || m.code,
            rawCode: R.rawCode || m.code,
            message: R.message || m.message || "Lỗi khi kết nối Cobalt API.",
            retryAfter: m.retryAfter
          });
        }
        const A = he(m.raw || m);
        if (!A.success)
          return r(A);
        if (A.type === "PICKER")
          return r({
            success: !0,
            status: "picker",
            type: "PICKER",
            items: A.items,
            totalItems: A.totalItems,
            correlationId: d
          });
        const $ = await W(l, {
          url: A.downloadUrl,
          filename: A.filename,
          tweetId: c,
          username: a,
          correlationId: d
        });
        r($);
      } catch (h) {
        r({
          success: !1,
          error: "DOWNLOAD_ERROR",
          message: h.message || "Lỗi không xác định trong quá trình tải video."
        });
      }
    })(), !0;
  }
  return !1;
});
