const S = Object.freeze({
  SETTINGS: "xvt_settings",
  JWT_SESSION: "cobalt_jwt_session"
}), R = Object.freeze({
  cobaltUrl: "",
  videoQuality: "1080",
  apiKey: ""
}), A = Object.freeze({
  DOWNLOAD_VIDEO: "DOWNLOAD_VIDEO",
  COBALT_DOWNLOAD: "COBALT_DOWNLOAD",
  OPEN_CDN: "OPEN_CDN",
  GET_SETTINGS: "GET_SETTINGS",
  TEST_CONNECTION: "TEST_CONNECTION",
  VERIFY_SESSION: "VERIFY_SESSION",
  GET_SESSION_STATUS: "GET_SESSION_STATUS",
  CLEAR_SESSION: "CLEAR_SESSION"
});
let D = { ...R };
async function P() {
  var e, n;
  try {
    if (typeof chrome < "u" && ((n = (e = chrome == null ? void 0 : chrome.storage) == null ? void 0 : e.local) != null && n.get)) {
      const t = await chrome.storage.local.get(S.SETTINGS), r = t == null ? void 0 : t[S.SETTINGS], i = { ...R, ...r || {} };
      return D = i, i;
    }
    return { ...D };
  } catch (t) {
    return console.error("[X Video Tools] Không thể đọc cấu hình từ storage:", t), D = { ...R }, { ...R };
  }
}
var B, F, j, H;
typeof chrome < "u" && ((F = (B = chrome == null ? void 0 : chrome.storage) == null ? void 0 : B.local) != null && F.get) && (P().catch(() => {
}), (H = (j = chrome == null ? void 0 : chrome.storage) == null ? void 0 : j.onChanged) != null && H.addListener && chrome.storage.onChanged.addListener((e, n) => {
  if (n === "local" && e[S.SETTINGS]) {
    const t = e[S.SETTINGS].newValue;
    D = { ...R, ...t || {} };
  }
}));
function L(e) {
  if (!e || typeof e != "string") return "";
  const n = e.trim();
  if (!n) return "";
  try {
    const t = new URL(n), r = t.protocol.toLowerCase(), i = t.host.toLowerCase();
    let c = t.pathname.replace(/\/+$/, "");
    return c === "/" && (c = ""), `${r}//${i}${c}`;
  } catch {
    return n.replace(/\/+$/, "");
  }
}
function w(e) {
  if (!e || typeof e != "string" || !e.trim())
    return { valid: !1, error: "EMPTY_URL" };
  const n = e.trim();
  let t;
  try {
    t = new URL(n);
  } catch {
    return { valid: !1, error: "MALFORMED_URL" };
  }
  const r = t.protocol.toLowerCase();
  return r !== "http:" && r !== "https:" ? { valid: !1, error: "INVALID_PROTOCOL" } : t.hostname ? {
    valid: !0,
    origin: t.origin,
    url: L(n)
  } : { valid: !1, error: "MALFORMED_URL" };
}
function z(e) {
  const n = w(e);
  return !n.valid || !n.origin ? null : `${n.origin}/*`;
}
function q(e) {
  if (!e)
    return "";
  const n = String(e).trim();
  if (!/^\d+$/.test(n))
    return "";
  const t = Number(n);
  return isNaN(t) || t <= 0 ? "" : (t / 1e15 * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}
async function Q(e, n = {}) {
  var o, l;
  const t = typeof n.timeout == "number" ? n.timeout : 1e4, r = q(e);
  if (!r)
    return {
      success: !1,
      error: "INVALID_TWEET_ID",
      message: "Mã số bài viết (Tweet ID) không hợp lệ"
    };
  const i = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(e)}&token=${r}&lang=en`, c = new AbortController(), h = setTimeout(() => {
    c.abort();
  }, t);
  try {
    const a = await fetch(i, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: c.signal
    });
    if (clearTimeout(h), a.status === 429)
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
    const s = await a.json();
    return s != null && s.tombstone || s != null && s.errors || (s == null ? void 0 : s.__typename) === "TweetTombstone" ? {
      success: !1,
      error: "TWEET_INACCESSIBLE",
      message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
    } : {
      success: !0,
      data: s,
      mediaDetails: (s == null ? void 0 : s.mediaDetails) || []
    };
  } catch (a) {
    return clearTimeout(h), a.name === "AbortError" || (o = a.message) != null && o.includes("aborted") || (l = a.message) != null && l.includes("timeout") ? {
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
const J = "video.twimg.com";
function Z(e) {
  if (!e || typeof e != "string")
    return !1;
  const n = e.trim();
  if (!n || n.startsWith("blob:") || n.startsWith("data:") || n.startsWith("javascript:"))
    return !1;
  try {
    const t = new URL(n);
    if (t.protocol !== "https:" || t.hostname.toLowerCase() !== J)
      return !1;
    const i = t.pathname;
    if (!i || i === "/" || i.trim() === "")
      return !1;
    const c = i.toLowerCase();
    return !(c.endsWith(".jpg") || c.endsWith(".jpeg") || c.endsWith(".png") || c.endsWith(".webp"));
  } catch {
    return !1;
  }
}
async function ee(e) {
  if (!Z(e))
    return {
      success: !1,
      error: "ERR_INVALID_URL",
      message: "URL CDN không hợp lệ hoặc không an toàn"
    };
  try {
    const n = await chrome.tabs.create({ url: e });
    return {
      success: !0,
      tabId: n == null ? void 0 : n.id,
      url: e
    };
  } catch (n) {
    return {
      success: !1,
      error: "TAB_CREATE_FAILED",
      message: n.message || "Không thể mở tab mới"
    };
  }
}
let y = null;
function k() {
  var e, n;
  return typeof chrome < "u" && !!((n = (e = chrome == null ? void 0 : chrome.storage) == null ? void 0 : e.session) != null && n.get);
}
async function te(e, n, t = 180) {
  if (!n || typeof n != "string" || !n.trim())
    throw new TypeError("JWT token phải là một chuỗi không rỗng.");
  const r = L(e), i = typeof t == "number" && t > 0 ? t : 180, c = Math.floor(Date.now() / 1e3) + i, h = {
    token: n.trim(),
    exp: c,
    instanceUrl: r,
    createdAt: Date.now()
  };
  if (y = h, k())
    try {
      await chrome.storage.session.set({
        [S.JWT_SESSION]: h
      });
    } catch {
    }
  return { success: !0, expiresAt: c };
}
function re(e = "") {
  if (!y || !y.token) return null;
  if (e && typeof e == "string" && e.trim()) {
    const t = L(e);
    if (y.instanceUrl && y.instanceUrl !== t)
      return null;
  }
  return Math.floor(Date.now() / 1e3) >= y.exp - 3 ? (y = null, null) : y.token;
}
async function ne(e = "") {
  let n = y;
  if (k())
    try {
      const r = await chrome.storage.session.get(S.JWT_SESSION);
      r && r[S.JWT_SESSION] && (n = r[S.JWT_SESSION]);
    } catch {
      n = y;
    }
  if (!n || !n.token)
    return null;
  if (e && typeof e == "string" && e.trim()) {
    const r = L(e);
    if (n.instanceUrl && n.instanceUrl !== r)
      return null;
  }
  return Math.floor(Date.now() / 1e3) >= n.exp - 3 ? (await M(), null) : n.token;
}
async function M() {
  if (y = null, k())
    try {
      await chrome.storage.session.remove(S.JWT_SESSION);
    } catch {
    }
}
async function ie(e = "") {
  let n = y;
  if (k())
    try {
      const i = await chrome.storage.session.get(S.JWT_SESSION);
      i && i[S.JWT_SESSION] && (n = i[S.JWT_SESSION]);
    } catch {
      n = y;
    }
  if (!n || !n.token)
    return {
      authenticated: !1,
      expired: !1,
      expiresIn: null,
      instanceUrl: null
    };
  if (e && typeof e == "string" && e.trim()) {
    const i = L(e);
    if (n.instanceUrl && n.instanceUrl !== i)
      return {
        authenticated: !1,
        expired: !1,
        expiresIn: null,
        instanceUrl: n.instanceUrl
      };
  }
  const t = Math.floor(Date.now() / 1e3), r = n.exp - t;
  return r <= 0 ? {
    authenticated: !1,
    expired: !0,
    expiresIn: 0,
    instanceUrl: n.instanceUrl
  } : {
    authenticated: !0,
    expired: !1,
    expiresIn: r,
    instanceUrl: n.instanceUrl
  };
}
const oe = "max", se = 15e3, ae = Object.freeze([
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
]), ce = Object.freeze([
  "best",
  "mp3",
  "ogg",
  "wav",
  "opus"
]);
function X(e = "", n = "") {
  const t = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return typeof e == "string" && e.trim().length > 0 ? t.Authorization = `Api-Key ${e.trim()}` : typeof n == "string" && n.trim().length > 0 && (t.Authorization = `Bearer ${n.trim()}`), t;
}
function le(e = {}) {
  if (!e.url || typeof e.url != "string")
    throw new TypeError('Tham số "url" là bắt buộc và phải là chuỗi hợp lệ.');
  let n = e.videoQuality;
  !n || !ae.includes(String(n)) ? n = oe : n = String(n);
  let t = e.audioFormat;
  !t || !ce.includes(String(t)) ? t = "mp3" : t = String(t);
  let r = e.downloadMode;
  !r || !["auto", "audio", "mute"].includes(String(r)) ? r = "auto" : r = String(r);
  let i = e.filenameStyle;
  return !i || !["classic", "pretty", "basic", "nerdy"].includes(String(i)) ? i = "basic" : i = String(i), {
    url: e.url.trim(),
    videoQuality: n,
    audioFormat: t,
    downloadMode: r,
    filenameStyle: i,
    localProcessing: "disabled",
    alwaysProxy: !!e.alwaysProxy
  };
}
async function ue(e = {}) {
  var m, I, d;
  const n = e.apiUrl || e.instanceUrl;
  if (!n || typeof n != "string" || !n.trim())
    return {
      success: !1,
      error: "UNCONFIGURED",
      message: "Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập."
    };
  if (!w(n).valid)
    return {
      success: !1,
      error: "INVALID_URL",
      message: "URL máy chủ Cobalt không hợp lệ."
    };
  const i = `${L(n)}/`, c = le({
    url: e.url,
    videoQuality: e.videoQuality,
    audioFormat: e.audioFormat,
    downloadMode: e.downloadMode,
    filenameStyle: e.filenameStyle,
    alwaysProxy: e.alwaysProxy
  }), h = e.sessionToken || (e.apiKey ? "" : re(n)) || "", o = X(e.apiKey, h), l = typeof e.timeout == "number" ? e.timeout : se, a = new AbortController();
  let s = !1, f = null;
  l > 0 && (f = setTimeout(() => {
    s = !0, a.abort();
  }, l)), e.signal && (e.signal.aborted ? a.abort() : e.signal.addEventListener("abort", () => a.abort(), { once: !0 }));
  try {
    const g = await fetch(i, {
      method: "POST",
      headers: o,
      body: JSON.stringify(c),
      signal: a.signal
    });
    f && clearTimeout(f);
    let u;
    const E = await g.text();
    try {
      u = JSON.parse(E);
    } catch {
      return {
        success: !1,
        error: "MALFORMED_RESPONSE",
        message: "Máy chủ trả về phản hồi không hợp lệ.",
        httpStatus: g.status
      };
    }
    if (!g.ok || u.status === "error") {
      const _ = ((m = u.error) == null ? void 0 : m.code) || "API_ERROR";
      if (_ === "error.api.auth.jwt.invalid" || _ === "error.api.auth.jwt.missing")
        try {
          await M();
        } catch {
        }
      return {
        success: !1,
        status: "error",
        error: _,
        code: _,
        context: ((I = u.error) == null ? void 0 : I.context) || {},
        httpStatus: g.status,
        raw: u
      };
    }
    return {
      success: !0,
      status: u.status,
      url: u.url,
      filename: u.filename,
      picker: u.picker,
      raw: u
    };
  } catch (g) {
    if (f && clearTimeout(f), s) {
      const E = new Error("Hết thời gian chờ phản hồi từ máy chủ Cobalt.");
      throw Object.assign(E, {
        success: !1,
        error: "API_TIMEOUT",
        code: "API_TIMEOUT"
      }), E;
    }
    if ((d = e.signal) != null && d.aborted || g.name === "AbortError") {
      const E = new Error("Yêu cầu đã bị hủy.");
      throw Object.assign(E, {
        success: !1,
        error: "ABORTED",
        code: "ABORTED",
        cancelled: !0
      }), E;
    }
    return {
      success: !1,
      error: "UNREACHABLE",
      message: !!(n.includes("localhost") || n.includes("127.0.0.1") || n.includes("[::1]")) ? "Không thể kết nối máy chủ Cobalt nội bộ (localhost:9000). Vui lòng khởi động scripts\\start-cobalt-windows.bat." : "Không thể kết nối đến máy chủ Cobalt. Kiểm tra URL hoặc kết nối mạng.",
      details: g.message,
      apiUrl: n
    };
  }
}
async function he(e, n = "", t = {}) {
  var h, o, l, a;
  if (!e || typeof e != "string" || !e.trim())
    return {
      healthy: !1,
      error: "UNCONFIGURED",
      message: "Chưa cấu hình URL máy chủ Cobalt."
    };
  if (!w(e).valid)
    return {
      healthy: !1,
      error: "INVALID_URL",
      message: "URL máy chủ Cobalt không hợp lệ."
    };
  const i = L(e), c = `${i}/`;
  try {
    const s = await fetch(c, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: t.signal
    });
    if (!s.ok)
      return {
        healthy: !1,
        status: s.status,
        error: "SERVER_ERROR",
        message: `Máy chủ phản hồi với mã lỗi HTTP ${s.status}`
      };
    const f = await s.json(), m = ((h = f.cobalt) == null ? void 0 : h.version) || "unknown", I = ((o = f.cobalt) == null ? void 0 : o.services) || [];
    let d = null;
    if (n && n.trim().length > 0 && (d = await ge(i, n.trim()), d && !d.valid))
      return {
        healthy: !1,
        version: m,
        services: I,
        error: d.error || "AUTH_KEY_INVALID",
        message: "API Key không chính xác hoặc không được chấp nhận bởi máy chủ."
      };
    const g = !!((l = f.cobalt) != null && l.turnstileSitekey), u = ((a = f.cobalt) == null ? void 0 : a.turnstileSitekey) || null;
    return {
      healthy: !0,
      version: m,
      services: I,
      turnstileRequired: g,
      turnstileSitekey: u,
      keyValidation: d,
      raw: f
    };
  } catch (s) {
    return {
      healthy: !1,
      error: "UNREACHABLE",
      message: !!(e.includes("localhost") || e.includes("127.0.0.1") || e.includes("[::1]")) ? "Cobalt local chưa khởi động. Vui lòng chạy file scripts\\start-cobalt-windows.bat" : "Không thể kết nối đến máy chủ Cobalt. Kiểm tra URL hoặc kết nối mạng.",
      details: s.message,
      apiUrl: e
    };
  }
}
async function ge(e, n) {
  var t;
  try {
    const i = await (await fetch(`${e}/`, {
      method: "POST",
      headers: X(n),
      body: JSON.stringify({})
    })).json().catch(() => ({})), c = (t = i == null ? void 0 : i.error) == null ? void 0 : t.code;
    return c === "error.api.link.missing" ? { valid: !0 } : c && (c.startsWith("error.api.auth.key.") || c.startsWith("error.api.auth.jwt.")) ? { valid: !1, error: c } : { valid: !0 };
  } catch {
    return { valid: !1, error: "PROBE_FAILED" };
  }
}
const b = Object.freeze({
  REDIRECT: "redirect",
  TUNNEL: "tunnel",
  PICKER: "picker",
  LOCAL_PROCESSING: "local-processing",
  ERROR: "error"
}), K = Object.freeze({
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
  "error.api.generic": "Đã xảy ra lỗi không xác định trên máy chủ Cobalt. Vui lòng thử lại sau.",
  UNREACHABLE: "Không thể kết nối đến máy chủ Cobalt. Vui lòng kiểm tra lại URL hoặc mạng.",
  API_TIMEOUT: "Hết thời gian chờ phản hồi từ máy chủ Cobalt. Vui lòng thử lại sau.",
  ABORTED: "Yêu cầu tải đã bị hủy."
});
function V(e, n = "") {
  var o, l;
  let t = "", r = {};
  typeof e == "string" ? t = e : e && typeof e == "object" && (t = e.code || ((o = e.error) == null ? void 0 : o.code) || e.error || "", r = e.context || ((l = e.error) == null ? void 0 : l.context) || {});
  const i = String(n || (e == null ? void 0 : e.apiUrl) || (e == null ? void 0 : e.url) || (r == null ? void 0 : r.url) || ""), c = !!(i.includes("localhost") || i.includes("127.0.0.1") || i.includes("[::1]"));
  if (t === "UNREACHABLE" || t === "SERVER_UNREACHABLE" || t === "LOCAL_OFFLINE" || t === "LOCAL_SERVICE_OFFLINE")
    return {
      code: "UNREACHABLE",
      rawCode: t,
      message: c ? "Không thể kết nối máy chủ Cobalt nội bộ (localhost:9000). Vui lòng khởi động scripts\\start-cobalt-windows.bat." : "Không thể kết nối đến máy chủ Cobalt. Vui lòng kiểm tra lại URL hoặc mạng."
    };
  if (t === "API_TIMEOUT")
    return {
      code: "API_TIMEOUT",
      rawCode: t,
      message: "Hết thời gian chờ phản hồi từ máy chủ Cobalt. Vui lòng thử lại sau."
    };
  if (t === "ABORTED")
    return {
      code: "ABORTED",
      rawCode: t,
      message: "Yêu cầu tải đã bị hủy."
    };
  if (t === "error.api.auth.key.missing" || t === "error.api.auth.key.invalid" || t === "auth.key.missing" || t === "auth.key.invalid")
    return {
      code: "AUTH_REQUIRED",
      rawCode: t,
      message: "Yêu cầu API Key hợp lệ. Vui lòng thiết lập trong cài đặt."
    };
  if (t === "error.api.auth.jwt.missing" || t === "error.api.auth.jwt.invalid" || t === "auth.jwt.missing" || t === "auth.jwt.invalid") {
    const a = t.includes("invalid");
    return {
      code: a ? "AUTH_EXPIRED" : "AUTH_REQUIRED",
      rawCode: t,
      message: a ? "Phiên xác thực Turnstile hoặc API Key không hợp lệ hoặc đã hết hạn." : "Máy chủ yêu cầu xác thực phiên Turnstile hoặc API Key."
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
    const a = r.limit || 15;
    return {
      code: "RATE_LIMIT",
      rawCode: t,
      retryAfter: Number(a),
      message: `Đã vượt quá giới hạn tải. Vui lòng thử lại sau ${a} giây.`
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
  let h = K[t] || K["error.api.generic"];
  return r.limit && (h = h.replace("{limit}", String(r.limit))), r.service && (h = h.replace("{service}", String(r.service))), {
    code: "API_ERROR",
    rawCode: t,
    message: h
  };
}
function fe(e, n = "") {
  if (!e || typeof e != "object")
    return {
      success: !1,
      error: "MALFORMED_RESPONSE",
      message: "Dữ liệu phản hồi từ máy chủ không hợp lệ."
    };
  const t = e.status;
  if (t === b.REDIRECT) {
    const r = e.url;
    return !r || typeof r != "string" || !r.startsWith("https://") ? {
      success: !1,
      error: "INVALID_REDIRECT_URL",
      message: "Đường dẫn tải video trả về không phải là URL HTTPS an toàn."
    } : {
      success: !0,
      type: "DOWNLOAD_DIRECT",
      downloadUrl: r,
      filename: e.filename || ""
    };
  }
  if (t === b.TUNNEL) {
    const r = e.url;
    if (!r || typeof r != "string")
      return {
        success: !1,
        error: "INVALID_TUNNEL_URL",
        message: "Đường dẫn tunnel stream không hợp lệ."
      };
    try {
      const c = new URL(r).searchParams;
      if (["id", "exp", "sig", "sec", "iv"].filter((l) => !c.has(l)).length > 0)
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
      downloadUrl: r,
      // 100% preserved query parameters intact
      filename: e.filename || ""
    };
  }
  if (t === b.PICKER) {
    const r = e.picker;
    if (!Array.isArray(r) || r.length === 0)
      return {
        success: !1,
        error: "EMPTY_PICKER",
        message: "Danh sách video trong bài viết trống."
      };
    const i = r.map((c, h) => ({
      index: h,
      type: c.type || "video",
      url: c.url,
      thumb: c.thumb
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
  if (t === b.LOCAL_PROCESSING)
    return {
      success: !1,
      error: "LOCAL_PROCESSING_UNSUPPORTED",
      message: "Máy chủ yêu cầu xử lý cục bộ (local processing), tính năng chưa được hỗ trợ trên trình duyệt."
    };
  if (t === b.ERROR || e.error) {
    const r = V(e);
    return {
      success: !1,
      error: r.code,
      message: r.message,
      retryAfter: r.retryAfter,
      rawCode: r.rawCode
    };
  }
  return {
    success: !1,
    error: "UNKNOWN_STATUS",
    message: `Trạng thái phản hồi "${t}" không được hỗ trợ.`
  };
}
const p = Object.freeze({
  INITIATED: "initiated",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  INTERRUPTED: "interrupted",
  CANCELLED: "cancelled",
  ERROR: "error"
}), O = /* @__PURE__ */ new Map(), v = /* @__PURE__ */ new Map();
let W = !1;
function de(e) {
  return !e || typeof e != "string" ? "" : e.replace(/[\\/:*?"<>|]/g, "_").trim();
}
function U(e, n) {
  var t;
  if (typeof chrome < "u" && typeof ((t = chrome.tabs) == null ? void 0 : t.sendMessage) == "function" && e)
    try {
      chrome.tabs.sendMessage(e, n, () => {
        var r;
        (r = chrome.runtime) != null && r.lastError;
      });
    } catch {
    }
}
function Y() {
  var e, n;
  W || typeof chrome > "u" || !((n = (e = chrome.downloads) == null ? void 0 : e.onChanged) != null && n.addListener) || (chrome.downloads.onChanged.addListener((t) => {
    var c;
    if (!t || !t.id) return;
    const r = t.id, i = v.get(r);
    if (i && (t.filename && t.filename.current && (i.filename = t.filename.current), t.state)) {
      const h = t.state.current;
      if (h === "complete")
        i.state = p.COMPLETED, i.videoKey && O.delete(i.videoKey), v.delete(r), U(i.tabId, {
          type: "DOWNLOAD_STATUS_CHANGED",
          downloadId: r,
          videoKey: i.videoKey,
          state: "complete",
          filename: i.filename
        }), typeof i.onComplete == "function" && i.onComplete({ downloadId: r, state: p.COMPLETED }), typeof i.resolve == "function" && i.resolve({ success: !0, downloadId: r, state: p.COMPLETED });
      else if (h === "interrupted") {
        const o = ((c = t.error) == null ? void 0 : c.current) || "UNKNOWN_ERROR", l = o === "USER_CANCELED";
        if (i.state = l ? p.CANCELLED : p.INTERRUPTED, i.videoKey && O.delete(i.videoKey), v.delete(r), l)
          U(i.tabId, {
            type: "DOWNLOAD_STATUS_CHANGED",
            downloadId: r,
            videoKey: i.videoKey,
            state: "cancelled"
          }), typeof i.onCancel == "function" && i.onCancel({ downloadId: r, state: p.CANCELLED }), typeof i.resolve == "function" && i.resolve({ success: !0, downloadId: r, state: p.CANCELLED, cancelled: !0 });
        else {
          console.error("[X Video Tools] Download interrupted:", {
            downloadId: r,
            videoKey: i.videoKey,
            error: o
          });
          const a = "Quá trình tải video bị gián đoạn do lỗi kết nối mạng.";
          if (U(i.tabId, {
            type: "DOWNLOAD_STATUS_CHANGED",
            downloadId: r,
            videoKey: i.videoKey,
            state: "interrupted",
            error: o,
            message: a
          }), typeof i.onError == "function" && i.onError({ downloadId: r, error: o, message: a }), typeof i.reject == "function") {
            const s = new Error(a);
            Object.assign(s, { downloadId: r, error: o, state: p.INTERRUPTED }), i.reject(s);
          }
        }
      }
    }
  }), W = !0);
}
async function me(e = {}) {
  if (Y(), !e.url || typeof e.url != "string")
    return {
      success: !1,
      error: "INVALID_URL",
      message: "Thiếu đường dẫn tải tệp."
    };
  const n = {
    url: e.url,
    conflictAction: "uniquify",
    saveAs: e.saveAs !== void 0 ? e.saveAs : !1
  };
  let t = e.filename;
  t && typeof t == "string" && (t = de(t), !t.endsWith(".mp4") && !t.endsWith(".gif") && !t.endsWith(".mp3") && (t += ".mp4"), n.filename = t);
  try {
    return {
      success: !0,
      downloadId: await chrome.downloads.download(n),
      filename: t
    };
  } catch (r) {
    return console.error("[X Video Tools] chrome.downloads.download failed:", {
      error: r.message,
      stack: r.stack,
      url: e.url,
      filename: t
    }), {
      success: !1,
      error: "DOWNLOAD_FAILED",
      message: r.message || "Không thể bắt đầu tải tệp."
    };
  }
}
function Ee(e, n = {}) {
  return Y(), new Promise((t, r) => {
    v.set(e, {
      downloadId: e,
      videoKey: n.videoKey,
      tabId: n.tabId,
      filename: n.filename,
      state: p.IN_PROGRESS,
      onComplete: n.onComplete,
      onError: n.onError,
      onCancel: n.onCancel,
      resolve: t,
      reject: r
    });
  });
}
async function G(e, n = {}) {
  if (e && O.has(e)) {
    const r = O.get(e);
    if (r.state === p.IN_PROGRESS || r.state === p.INITIATED)
      return {
        blocked: !0,
        success: !1,
        reason: "DOWNLOAD_IN_PROGRESS",
        message: "Video này đang trong quá trình tải xuống."
      };
  }
  const t = n.correlationId || `${e}_${Date.now()}`;
  e && O.set(e, {
    state: p.INITIATED,
    correlationId: t,
    startTime: Date.now()
  });
  try {
    const r = await me(n);
    if (!r.success)
      return e && O.delete(e), r;
    if (e) {
      const i = O.get(e);
      i && (i.downloadId = r.downloadId, i.state = p.IN_PROGRESS);
    }
    return Ee(r.downloadId, {
      videoKey: e,
      tabId: n.tabId,
      filename: r.filename
    }).catch(() => {
    }), {
      success: !0,
      downloadId: r.downloadId,
      filename: r.filename,
      correlationId: t
    };
  } catch (r) {
    return console.error("[X Video Tools] initiateDownload error:", {
      videoKey: e,
      error: r.message,
      stack: r.stack
    }), e && O.delete(e), {
      success: !1,
      error: "DOWNLOAD_EXCEPTION",
      message: r.message
    };
  }
}
const Te = 15e3;
function pe(e) {
  return !e || typeof e != "object" ? { valid: !1, error: "MALFORMED_SESSION_DATA" } : typeof e.token != "string" || !e.token.trim() ? { valid: !1, error: "INVALID_SESSION_TOKEN" } : typeof e.exp != "number" || Number.isNaN(e.exp) || e.exp <= 0 ? { valid: !1, error: "INVALID_SESSION_EXPIRY" } : { valid: !0 };
}
async function ye(e, n, t = {}) {
  var s, f, m, I;
  if (!e || typeof e != "string" || !e.trim())
    return {
      success: !1,
      error: "UNCONFIGURED",
      code: "UNCONFIGURED",
      message: "Chưa cài đặt Cobalt URL. Vui lòng thiết lập trong cài đặt."
    };
  if (!w(e).valid)
    return {
      success: !1,
      error: "INVALID_URL",
      code: "INVALID_URL",
      message: "URL máy chủ Cobalt không hợp lệ."
    };
  if (!n || typeof n != "string" || !n.trim())
    return {
      success: !1,
      error: "TURNSTILE_RESPONSE_MISSING",
      code: "TURNSTILE_RESPONSE_MISSING",
      message: "Thiếu mã xác thực Turnstile. Vui lòng hoàn thành xác thực."
    };
  const c = `${L(e)}/session`, h = typeof t.timeout == "number" ? t.timeout : Te, o = new AbortController();
  let l = !1;
  const a = setTimeout(() => {
    l = !0, o.abort();
  }, h);
  t.signal && (t.signal.aborted ? o.abort() : t.signal.addEventListener("abort", () => o.abort(), { once: !0 }));
  try {
    const d = await fetch(c, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "cf-turnstile-response": n.trim()
      },
      signal: o.signal
    });
    clearTimeout(a);
    let g;
    try {
      g = await d.json();
    } catch {
      return {
        success: !1,
        error: "MALFORMED_RESPONSE",
        code: "MALFORMED_RESPONSE",
        message: "Máy chủ phản hồi dữ liệu không hợp lệ."
      };
    }
    if (!d.ok || g.status === "error") {
      const E = V(g);
      return {
        success: !1,
        error: E.code || ((s = g.error) == null ? void 0 : s.code) || "AUTH_SESSION_REJECTED",
        code: E.code || ((f = g.error) == null ? void 0 : f.code) || "AUTH_SESSION_REJECTED",
        rawCode: ((m = g.error) == null ? void 0 : m.code) || E.rawCode,
        message: E.message || "Xác thực Turnstile không thành công hoặc bị máy chủ từ chối.",
        httpStatus: d.status
      };
    }
    const u = pe(g);
    return u.valid ? {
      success: !0,
      token: g.token,
      exp: g.exp
    } : {
      success: !1,
      error: u.error,
      code: u.error,
      message: "Phản hồi phiên xác thực từ máy chủ không đúng định dạng chuẩn."
    };
  } catch (d) {
    return clearTimeout(a), l ? {
      success: !1,
      error: "TIMEOUT",
      code: "TIMEOUT",
      message: "Hết thời gian chờ phản hồi xác thực từ máy chủ Cobalt."
    } : (I = t.signal) != null && I.aborted || d.name === "AbortError" ? {
      success: !1,
      error: "ABORTED",
      code: "ABORTED",
      message: "Yêu cầu xác thực đã bị hủy."
    } : {
      success: !1,
      error: "UNREACHABLE",
      code: "UNREACHABLE",
      message: "Không thể kết nối tới máy chủ để xác thực phiên: " + d.message
    };
  }
}
console.log("[X Video Tools] Background Service Worker (ESM) đã khởi động.");
chrome.runtime.onMessage.addListener((e, n, t) => {
  var i, c, h;
  const r = (e == null ? void 0 : e.action) || (e == null ? void 0 : e.type);
  if (r === "FETCH_SYNDICATION" || r === "XVT_FETCH_SYNDICATION") {
    const o = ((i = e.payload) == null ? void 0 : i.tweetId) || e.tweetId;
    return Q(o, e.options).then((l) => t(l)).catch((l) => t({
      success: !1,
      error: "INTERNAL_ERROR",
      message: l.message || "Lỗi xử lý nội bộ Service Worker"
    })), !0;
  }
  if (r === "OPEN_CDN" || r === "OPEN_TAB" || r === "XVT_OPEN_TAB" || r === A.OPEN_CDN) {
    const o = ((c = e.payload) == null ? void 0 : c.url) || e.url;
    return ee(o).then((l) => t(l)).catch((l) => t({
      success: !1,
      error: "INTERNAL_ERROR",
      message: l.message || "Lỗi xử lý mở tab mới"
    })), !0;
  }
  if (r === A.GET_SETTINGS || r === "GET_SETTINGS")
    return P().then((o) => {
      t({
        success: !0,
        data: {
          cobaltUrl: o.cobaltUrl || "",
          hasApiKey: !!o.apiKey,
          videoQuality: o.videoQuality || "max",
          status: o.cobaltUrl ? "Configured" : "Unconfigured"
        }
      });
    }).catch((o) => {
      t({
        success: !1,
        error: "STORAGE_ERROR",
        message: o.message
      });
    }), !0;
  if (r === A.TEST_CONNECTION || r === "TEST_CONNECTION" || r === "XVT_TEST_CONNECTION") {
    const o = e.payload || e, l = o.apiUrl, a = o.apiKey || "";
    return he(l, a).then((s) => t(s)).catch((s) => t({
      healthy: !1,
      success: !1,
      error: "TEST_FAILED",
      message: s.message || "Lỗi khi kiểm tra kết nối"
    })), !0;
  }
  if (r === A.VERIFY_SESSION || r === "VERIFY_SESSION") {
    const o = e.payload || e, { instanceUrl: l, turnstileResponse: a } = o;
    return ye(l, a).then(async (s) => {
      if (!s.success)
        return t(s);
      await te(l, s.token, s.exp), t({
        success: !0,
        exp: s.exp,
        message: "Xác thực phiên làm việc thành công!"
      });
    }).catch((s) => {
      t({
        success: !1,
        error: "SESSION_VERIFY_EXCEPTION",
        message: s.message || "Lỗi ngoại lệ khi gửi xác thực phiên."
      });
    }), !0;
  }
  if (r === A.GET_SESSION_STATUS || r === "GET_SESSION_STATUS") {
    const o = e.payload || e, l = (o == null ? void 0 : o.instanceUrl) || "";
    return ie(l).then((a) => t({ success: !0, ...a })).catch((a) => t({ success: !1, error: "STATUS_ERROR", message: a.message })), !0;
  }
  if (r === A.CLEAR_SESSION || r === "CLEAR_SESSION")
    return M().then(() => t({ success: !0 })).catch((o) => t({ success: !1, error: "CLEAR_ERROR", message: o.message })), !0;
  if (r === A.DOWNLOAD_VIDEO || r === A.COBALT_DOWNLOAD || r === "COBALT_DOWNLOAD" || r === "XVT_COBALT_DOWNLOAD") {
    const o = e.payload || e, { tweetId: l, permalink: a, username: s, videoKey: f, correlationId: m = `req_${Date.now()}`, selectedUrl: I } = o, d = (h = n.tab) == null ? void 0 : h.id;
    return (async () => {
      var g;
      try {
        if (I) {
          const C = await G(f, {
            url: I,
            tweetId: l,
            username: s,
            correlationId: m,
            tabId: d
          });
          return t(C);
        }
        const u = await P();
        if (!u.cobaltUrl)
          return t({
            success: !1,
            error: "UNCONFIGURED",
            message: "Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập."
          });
        const E = z(u.cobaltUrl);
        if (E && ((g = chrome.permissions) != null && g.contains) && !await chrome.permissions.contains({ origins: [E] }))
          return t({
            success: !1,
            error: "PERMISSION_REQUIRED",
            message: "Cần cấp quyền truy cập máy chủ Cobalt trong cài đặt tiện ích."
          });
        const _ = a || (l ? `https://x.com/i/status/${l}` : "");
        if (!_)
          return t({
            success: !1,
            error: "MISSING_URL",
            message: "Thiếu đường dẫn bài viết cần tải."
          });
        let x = "";
        u.apiKey || (x = await ne(u.cobaltUrl) || "");
        const T = await ue({
          url: _,
          apiUrl: u.cobaltUrl,
          apiKey: u.apiKey,
          sessionToken: x,
          videoQuality: u.videoQuality || "max"
        });
        if (!T.success) {
          console.error("[X Video Tools] Cobalt API request failed:", {
            correlationId: m,
            error: T.error,
            code: T.code,
            message: T.message,
            targetUrl: _,
            apiUrl: u.cobaltUrl,
            details: T.details
          });
          const C = V(T.raw || T, u.cobaltUrl);
          return t({
            success: !1,
            error: C.code || T.error,
            code: C.code || T.code,
            rawCode: C.rawCode || T.code,
            message: C.message || T.message || "Lỗi khi kết nối Cobalt API.",
            retryAfter: T.retryAfter
          });
        }
        const N = fe(T.raw || T);
        if (!N.success)
          return console.error("[X Video Tools] Cobalt response parsing failed:", {
            correlationId: m,
            error: N.error,
            message: N.message
          }), t(N);
        if (N.type === "PICKER")
          return t({
            success: !0,
            status: "picker",
            type: "PICKER",
            items: N.items,
            totalItems: N.totalItems,
            correlationId: m
          });
        const $ = await G(f, {
          url: N.downloadUrl,
          tweetId: l,
          username: s,
          correlationId: m,
          tabId: d
        });
        t($);
      } catch (u) {
        console.error("[X Video Tools] Unhandled error in COBALT_DOWNLOAD:", {
          correlationId: m,
          error: u.message,
          stack: u.stack
        }), t({
          success: !1,
          error: "DOWNLOAD_ERROR",
          message: u.message || "Lỗi không xác định trong quá trình tải video."
        });
      }
    })(), !0;
  }
  return !1;
});
