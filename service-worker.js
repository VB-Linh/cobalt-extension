const I = Object.freeze({
  SETTINGS: "xvt_settings",
  JWT_SESSION: "cobalt_jwt_session"
}), R = Object.freeze({
  cobaltUrl: "",
  videoQuality: "1080",
  apiKey: ""
}), O = Object.freeze({
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
async function V() {
  var e, r;
  try {
    if (typeof chrome < "u" && ((r = (e = chrome == null ? void 0 : chrome.storage) == null ? void 0 : e.local) != null && r.get)) {
      const t = await chrome.storage.local.get(I.SETTINGS), n = t == null ? void 0 : t[I.SETTINGS], i = { ...R, ...n || {} };
      return D = i, i;
    }
    return { ...D };
  } catch (t) {
    return console.error("[X Video Tools] Không thể đọc cấu hình từ storage:", t), D = { ...R }, { ...R };
  }
}
var j, H, X, Y;
typeof chrome < "u" && ((H = (j = chrome == null ? void 0 : chrome.storage) == null ? void 0 : j.local) != null && H.get) && (V().catch(() => {
}), (Y = (X = chrome == null ? void 0 : chrome.storage) == null ? void 0 : X.onChanged) != null && Y.addListener && chrome.storage.onChanged.addListener((e, r) => {
  if (r === "local" && e[I.SETTINGS]) {
    const t = e[I.SETTINGS].newValue;
    D = { ...R, ...t || {} };
  }
}));
function C(e) {
  if (!e || typeof e != "string") return "";
  const r = e.trim();
  if (!r) return "";
  try {
    const t = new URL(r), n = t.protocol.toLowerCase(), i = t.host.toLowerCase();
    let l = t.pathname.replace(/\/+$/, "");
    return l === "/" && (l = ""), `${n}//${i}${l}`;
  } catch {
    return r.replace(/\/+$/, "");
  }
}
function w(e) {
  if (!e || typeof e != "string" || !e.trim())
    return { valid: !1, error: "EMPTY_URL" };
  const r = e.trim();
  let t;
  try {
    t = new URL(r);
  } catch {
    return { valid: !1, error: "MALFORMED_URL" };
  }
  const n = t.protocol.toLowerCase();
  return n !== "http:" && n !== "https:" ? { valid: !1, error: "INVALID_PROTOCOL" } : t.hostname ? {
    valid: !0,
    origin: t.origin,
    url: C(r)
  } : { valid: !1, error: "MALFORMED_URL" };
}
function J(e) {
  const r = w(e);
  return !r.valid || !r.origin ? null : `${r.origin}/*`;
}
function Z(e) {
  if (!e)
    return "";
  const r = String(e).trim();
  if (!/^\d+$/.test(r))
    return "";
  const t = Number(r);
  return isNaN(t) || t <= 0 ? "" : (t / 1e15 * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}
async function ee(e, r = {}) {
  var o, a;
  const t = typeof r.timeout == "number" ? r.timeout : 1e4, n = Z(e);
  if (!n)
    return {
      success: !1,
      error: "INVALID_TWEET_ID",
      message: "Mã số bài viết (Tweet ID) không hợp lệ"
    };
  const i = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(e)}&token=${n}&lang=en`, l = new AbortController(), u = setTimeout(() => {
    l.abort();
  }, t);
  try {
    const s = await fetch(i, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: l.signal
    });
    if (clearTimeout(u), s.status === 429)
      return {
        success: !1,
        error: "API_RATE_LIMIT",
        status: 429,
        message: "Bị giới hạn tần suất truy vấn từ X (Rate limited)"
      };
    if (s.status === 404)
      return {
        success: !1,
        error: "TWEET_INACCESSIBLE",
        status: 404,
        message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
      };
    if (s.status === 403)
      return {
        success: !1,
        error: "TWEET_INACCESSIBLE",
        status: 403,
        message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
      };
    if (!s.ok)
      return {
        success: !1,
        error: "HTTP_ERROR",
        status: s.status,
        message: `Lỗi kết nối máy chủ (${s.status})`
      };
    const c = await s.json();
    return c != null && c.tombstone || c != null && c.errors || (c == null ? void 0 : c.__typename) === "TweetTombstone" ? {
      success: !1,
      error: "TWEET_INACCESSIBLE",
      message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
    } : {
      success: !0,
      data: c,
      mediaDetails: (c == null ? void 0 : c.mediaDetails) || []
    };
  } catch (s) {
    return clearTimeout(u), s.name === "AbortError" || (o = s.message) != null && o.includes("aborted") || (a = s.message) != null && a.includes("timeout") ? {
      success: !1,
      error: "API_TIMEOUT",
      message: "Hết thời gian chờ phản hồi từ máy chủ X"
    } : {
      success: !1,
      error: "NETWORK_ERROR",
      message: s.message || "Lỗi kết nối mạng"
    };
  }
}
const te = "video.twimg.com";
function re(e) {
  if (!e || typeof e != "string")
    return !1;
  const r = e.trim();
  if (!r || r.startsWith("blob:") || r.startsWith("data:") || r.startsWith("javascript:"))
    return !1;
  try {
    const t = new URL(r);
    if (t.protocol !== "https:" || t.hostname.toLowerCase() !== te)
      return !1;
    const i = t.pathname;
    if (!i || i === "/" || i.trim() === "")
      return !1;
    const l = i.toLowerCase();
    return !(l.endsWith(".jpg") || l.endsWith(".jpeg") || l.endsWith(".png") || l.endsWith(".webp"));
  } catch {
    return !1;
  }
}
async function ne(e) {
  if (!re(e))
    return {
      success: !1,
      error: "ERR_INVALID_URL",
      message: "URL CDN không hợp lệ hoặc không an toàn"
    };
  try {
    const r = await chrome.tabs.create({ url: e });
    return {
      success: !0,
      tabId: r == null ? void 0 : r.id,
      url: e
    };
  } catch (r) {
    return {
      success: !1,
      error: "TAB_CREATE_FAILED",
      message: r.message || "Không thể mở tab mới"
    };
  }
}
let S = null;
function k() {
  var e, r;
  return typeof chrome < "u" && !!((r = (e = chrome == null ? void 0 : chrome.storage) == null ? void 0 : e.session) != null && r.get);
}
async function ie(e, r, t = 180) {
  if (!r || typeof r != "string" || !r.trim())
    throw new TypeError("JWT token phải là một chuỗi không rỗng.");
  const n = C(e), i = typeof t == "number" && t > 0 ? t : 180, l = Math.floor(Date.now() / 1e3) + i, u = {
    token: r.trim(),
    exp: l,
    instanceUrl: n,
    createdAt: Date.now()
  };
  if (S = u, k())
    try {
      await chrome.storage.session.set({
        [I.JWT_SESSION]: u
      });
    } catch {
    }
  return { success: !0, expiresAt: l };
}
function oe(e = "") {
  if (!S || !S.token) return null;
  if (e && typeof e == "string" && e.trim()) {
    const t = C(e);
    if (S.instanceUrl && S.instanceUrl !== t)
      return null;
  }
  return Math.floor(Date.now() / 1e3) >= S.exp - 3 ? (S = null, null) : S.token;
}
async function se(e = "") {
  let r = S;
  if (k())
    try {
      const n = await chrome.storage.session.get(I.JWT_SESSION);
      n && n[I.JWT_SESSION] && (r = n[I.JWT_SESSION]);
    } catch {
      r = S;
    }
  if (!r || !r.token)
    return null;
  if (e && typeof e == "string" && e.trim()) {
    const n = C(e);
    if (r.instanceUrl && r.instanceUrl !== n)
      return null;
  }
  return Math.floor(Date.now() / 1e3) >= r.exp - 3 ? (await x(), null) : r.token;
}
async function x() {
  if (S = null, k())
    try {
      await chrome.storage.session.remove(I.JWT_SESSION);
    } catch {
    }
}
async function ae(e = "") {
  let r = S;
  if (k())
    try {
      const i = await chrome.storage.session.get(I.JWT_SESSION);
      i && i[I.JWT_SESSION] && (r = i[I.JWT_SESSION]);
    } catch {
      r = S;
    }
  if (!r || !r.token)
    return {
      authenticated: !1,
      expired: !1,
      expiresIn: null,
      instanceUrl: null
    };
  if (e && typeof e == "string" && e.trim()) {
    const i = C(e);
    if (r.instanceUrl && r.instanceUrl !== i)
      return {
        authenticated: !1,
        expired: !1,
        expiresIn: null,
        instanceUrl: r.instanceUrl
      };
  }
  const t = Math.floor(Date.now() / 1e3), n = r.exp - t;
  return n <= 0 ? {
    authenticated: !1,
    expired: !0,
    expiresIn: 0,
    instanceUrl: r.instanceUrl
  } : {
    authenticated: !0,
    expired: !1,
    expiresIn: n,
    instanceUrl: r.instanceUrl
  };
}
const ce = "max", le = 15e3, ue = Object.freeze([
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
]), he = Object.freeze([
  "best",
  "mp3",
  "ogg",
  "wav",
  "opus"
]);
function $(e = "", r = "") {
  const t = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return typeof e == "string" && e.trim().length > 0 ? t.Authorization = `Api-Key ${e.trim()}` : typeof r == "string" && r.trim().length > 0 && (t.Authorization = `Bearer ${r.trim()}`), t;
}
function de(e = {}) {
  if (!e.url || typeof e.url != "string")
    throw new TypeError('Tham số "url" là bắt buộc và phải là chuỗi hợp lệ.');
  let r = e.videoQuality;
  !r || !ue.includes(String(r)) ? r = ce : r = String(r);
  let t = e.audioFormat;
  !t || !he.includes(String(t)) ? t = "mp3" : t = String(t);
  let n = e.downloadMode;
  !n || !["auto", "audio", "mute"].includes(String(n)) ? n = "auto" : n = String(n);
  let i = e.filenameStyle;
  return !i || !["classic", "pretty", "basic", "nerdy"].includes(String(i)) ? i = "basic" : i = String(i), {
    url: e.url.trim(),
    videoQuality: r,
    audioFormat: t,
    downloadMode: n,
    filenameStyle: i,
    localProcessing: "disabled",
    alwaysProxy: !!e.alwaysProxy
  };
}
async function fe(e = {}) {
  var E, _, m;
  const r = e.apiUrl || e.instanceUrl;
  if (!r || typeof r != "string" || !r.trim())
    return {
      success: !1,
      error: "UNCONFIGURED",
      message: "Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập."
    };
  if (!w(r).valid)
    return {
      success: !1,
      error: "INVALID_URL",
      message: "URL máy chủ Cobalt không hợp lệ."
    };
  const i = `${C(r)}/`, l = de({
    url: e.url,
    videoQuality: e.videoQuality,
    audioFormat: e.audioFormat,
    downloadMode: e.downloadMode,
    filenameStyle: e.filenameStyle,
    alwaysProxy: e.alwaysProxy
  }), u = e.sessionToken || (e.apiKey ? "" : oe(r)) || "", o = $(e.apiKey, u), a = typeof e.timeout == "number" ? e.timeout : le, s = new AbortController();
  let c = !1, h = null;
  a > 0 && (h = setTimeout(() => {
    c = !0, s.abort();
  }, a)), e.signal && (e.signal.aborted ? s.abort() : e.signal.addEventListener("abort", () => s.abort(), { once: !0 }));
  try {
    const d = await fetch(i, {
      method: "POST",
      headers: o,
      body: JSON.stringify(l),
      signal: s.signal
    });
    h && clearTimeout(h);
    let f;
    const T = await d.text();
    try {
      f = JSON.parse(T);
    } catch {
      return {
        success: !1,
        error: "MALFORMED_RESPONSE",
        message: "Máy chủ trả về phản hồi không hợp lệ.",
        httpStatus: d.status
      };
    }
    if (!d.ok || f.status === "error") {
      const g = ((E = f.error) == null ? void 0 : E.code) || "API_ERROR";
      if (g === "error.api.auth.jwt.invalid" || g === "error.api.auth.jwt.missing")
        try {
          await x();
        } catch {
        }
      return {
        success: !1,
        status: "error",
        error: g,
        code: g,
        context: ((_ = f.error) == null ? void 0 : _.context) || {},
        httpStatus: d.status,
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
  } catch (d) {
    if (h && clearTimeout(h), c) {
      const T = new Error("Hết thời gian chờ phản hồi từ máy chủ Cobalt.");
      throw Object.assign(T, {
        success: !1,
        error: "API_TIMEOUT",
        code: "API_TIMEOUT"
      }), T;
    }
    if ((m = e.signal) != null && m.aborted || d.name === "AbortError") {
      const T = new Error("Yêu cầu đã bị hủy.");
      throw Object.assign(T, {
        success: !1,
        error: "ABORTED",
        code: "ABORTED",
        cancelled: !0
      }), T;
    }
    return {
      success: !1,
      error: "UNREACHABLE",
      message: !!(r.includes("localhost") || r.includes("127.0.0.1") || r.includes("[::1]")) ? "Không thể kết nối máy chủ Cobalt nội bộ (localhost:9000). Vui lòng khởi động scripts\\start-cobalt-windows.bat." : "Không thể kết nối đến máy chủ Cobalt. Kiểm tra URL hoặc kết nối mạng.",
      details: d.message,
      apiUrl: r
    };
  }
}
async function ge(e, r = "", t = {}) {
  var u, o, a, s;
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
  const i = C(e), l = `${i}/`;
  try {
    const c = await fetch(l, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: t.signal
    });
    if (!c.ok)
      return {
        healthy: !1,
        status: c.status,
        error: "SERVER_ERROR",
        message: `Máy chủ phản hồi với mã lỗi HTTP ${c.status}`
      };
    const h = await c.json(), E = ((u = h.cobalt) == null ? void 0 : u.version) || "unknown", _ = ((o = h.cobalt) == null ? void 0 : o.services) || [];
    let m = null;
    if (r && r.trim().length > 0 && (m = await me(i, r.trim()), m && !m.valid))
      return {
        healthy: !1,
        version: E,
        services: _,
        error: m.error || "AUTH_KEY_INVALID",
        message: "API Key không chính xác hoặc không được chấp nhận bởi máy chủ."
      };
    const d = !!((a = h.cobalt) != null && a.turnstileSitekey), f = ((s = h.cobalt) == null ? void 0 : s.turnstileSitekey) || null;
    return {
      healthy: !0,
      version: E,
      services: _,
      turnstileRequired: d,
      turnstileSitekey: f,
      keyValidation: m,
      raw: h
    };
  } catch (c) {
    return {
      healthy: !1,
      error: "UNREACHABLE",
      message: !!(e.includes("localhost") || e.includes("127.0.0.1") || e.includes("[::1]")) ? "Cobalt local chưa khởi động. Vui lòng chạy file scripts\\start-cobalt-windows.bat" : "Không thể kết nối đến máy chủ Cobalt. Kiểm tra URL hoặc kết nối mạng.",
      details: c.message,
      apiUrl: e
    };
  }
}
async function me(e, r) {
  var t;
  try {
    const i = await (await fetch(`${e}/`, {
      method: "POST",
      headers: $(r),
      body: JSON.stringify({})
    })).json().catch(() => ({})), l = (t = i == null ? void 0 : i.error) == null ? void 0 : t.code;
    return l === "error.api.link.missing" ? { valid: !0 } : l && (l.startsWith("error.api.auth.key.") || l.startsWith("error.api.auth.jwt.")) ? { valid: !1, error: l } : { valid: !0 };
  } catch {
    return { valid: !1, error: "PROBE_FAILED" };
  }
}
function Ee(e, r = {}) {
  if (!Array.isArray(e) || e.length === 0)
    return null;
  const t = (o) => !!(o && (o.type === "video" || o.type === "gif" || o.type === "animated_gif" || !o.type)), n = e.filter(t), i = n.length > 0 ? n : e, l = r == null ? void 0 : r.mediaIndex;
  if (typeof l == "number" && l > 0) {
    const o = e[l - 1];
    if (o && o.url && t(o))
      return o;
    const a = n[l - 1];
    if (a && a.url)
      return a;
  }
  const u = r == null ? void 0 : r.mediaFingerprint;
  if (u && typeof u == "string") {
    const o = u.trim();
    if (o.length > 0) {
      const a = i.filter((s) => {
        const c = s.thumb ? String(s.thumb) : "", h = s.url ? String(s.url) : "";
        return c.includes(o) || h.includes(o);
      });
      if (a.length === 1)
        return a[0];
    }
  }
  return i.length === 1 && i[0].url ? i[0] : null;
}
const b = Object.freeze({
  REDIRECT: "redirect",
  TUNNEL: "tunnel",
  PICKER: "picker",
  LOCAL_PROCESSING: "local-processing",
  ERROR: "error"
}), G = Object.freeze({
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
function K(e, r = "") {
  var o, a;
  let t = "", n = {};
  typeof e == "string" ? t = e : e && typeof e == "object" && (t = e.code || ((o = e.error) == null ? void 0 : o.code) || e.error || "", n = e.context || ((a = e.error) == null ? void 0 : a.context) || {});
  const i = String(r || (e == null ? void 0 : e.apiUrl) || (e == null ? void 0 : e.url) || (n == null ? void 0 : n.url) || ""), l = !!(i.includes("localhost") || i.includes("127.0.0.1") || i.includes("[::1]"));
  if (t === "UNREACHABLE" || t === "SERVER_UNREACHABLE" || t === "LOCAL_OFFLINE" || t === "LOCAL_SERVICE_OFFLINE")
    return {
      code: "UNREACHABLE",
      rawCode: t,
      message: l ? "Không thể kết nối máy chủ Cobalt nội bộ (localhost:9000). Vui lòng khởi động scripts\\start-cobalt-windows.bat." : "Không thể kết nối đến máy chủ Cobalt. Vui lòng kiểm tra lại URL hoặc mạng."
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
    const s = n.limit || 15;
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
  let u = G[t] || G["error.api.generic"];
  return n.limit && (u = u.replace("{limit}", String(n.limit))), n.service && (u = u.replace("{service}", String(n.service))), {
    code: "API_ERROR",
    rawCode: t,
    message: u
  };
}
function Te(e, r = "") {
  if (!e || typeof e != "object")
    return {
      success: !1,
      error: "MALFORMED_RESPONSE",
      message: "Dữ liệu phản hồi từ máy chủ không hợp lệ."
    };
  const t = e.status;
  if (t === b.REDIRECT) {
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
  if (t === b.TUNNEL) {
    const n = e.url;
    if (!n || typeof n != "string")
      return {
        success: !1,
        error: "INVALID_TUNNEL_URL",
        message: "Đường dẫn tunnel stream không hợp lệ."
      };
    try {
      const l = new URL(n).searchParams;
      if (["id", "exp", "sig", "sec", "iv"].filter((a) => !l.has(a)).length > 0)
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
  if (t === b.PICKER) {
    const n = e.picker;
    if (!Array.isArray(n) || n.length === 0)
      return {
        success: !1,
        error: "EMPTY_PICKER",
        message: "Danh sách video trong bài viết trống."
      };
    const i = n.map((l, u) => ({
      index: u,
      type: l.type || "video",
      url: l.url,
      thumb: l.thumb
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
    const n = K(e);
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
    message: `Trạng thái phản hồi "${t}" không được hỗ trợ.`
  };
}
const y = Object.freeze({
  INITIATED: "initiated",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  INTERRUPTED: "interrupted",
  CANCELLED: "cancelled",
  ERROR: "error"
}), L = /* @__PURE__ */ new Map(), v = /* @__PURE__ */ new Map();
let B = !1;
function pe(e) {
  return !e || typeof e != "string" ? "" : e.replace(/[\\/:*?"<>|]/g, "_").trim();
}
function P(e, r) {
  var t;
  if (typeof chrome < "u" && typeof ((t = chrome.tabs) == null ? void 0 : t.sendMessage) == "function" && e)
    try {
      chrome.tabs.sendMessage(e, r, () => {
        var n;
        (n = chrome.runtime) != null && n.lastError;
      });
    } catch {
    }
}
function z() {
  var e, r;
  B || typeof chrome > "u" || !((r = (e = chrome.downloads) == null ? void 0 : e.onChanged) != null && r.addListener) || (chrome.downloads.onChanged.addListener((t) => {
    var l;
    if (!t || !t.id) return;
    const n = t.id, i = v.get(n);
    if (i && (t.filename && t.filename.current && (i.filename = t.filename.current), t.state)) {
      const u = t.state.current;
      if (u === "complete")
        i.state = y.COMPLETED, i.videoKey && L.delete(i.videoKey), v.delete(n), P(i.tabId, {
          type: "DOWNLOAD_STATUS_CHANGED",
          downloadId: n,
          videoKey: i.videoKey,
          state: "complete",
          filename: i.filename
        }), typeof i.onComplete == "function" && i.onComplete({ downloadId: n, state: y.COMPLETED }), typeof i.resolve == "function" && i.resolve({ success: !0, downloadId: n, state: y.COMPLETED });
      else if (u === "interrupted") {
        const o = ((l = t.error) == null ? void 0 : l.current) || "UNKNOWN_ERROR", a = o === "USER_CANCELED";
        if (i.state = a ? y.CANCELLED : y.INTERRUPTED, i.videoKey && L.delete(i.videoKey), v.delete(n), a)
          P(i.tabId, {
            type: "DOWNLOAD_STATUS_CHANGED",
            downloadId: n,
            videoKey: i.videoKey,
            state: "cancelled"
          }), typeof i.onCancel == "function" && i.onCancel({ downloadId: n, state: y.CANCELLED }), typeof i.resolve == "function" && i.resolve({ success: !0, downloadId: n, state: y.CANCELLED, cancelled: !0 });
        else {
          console.error("[X Video Tools] Download interrupted:", {
            downloadId: n,
            videoKey: i.videoKey,
            error: o
          });
          const s = "Quá trình tải video bị gián đoạn do lỗi kết nối mạng.";
          if (P(i.tabId, {
            type: "DOWNLOAD_STATUS_CHANGED",
            downloadId: n,
            videoKey: i.videoKey,
            state: "interrupted",
            error: o,
            message: s
          }), typeof i.onError == "function" && i.onError({ downloadId: n, error: o, message: s }), typeof i.reject == "function") {
            const c = new Error(s);
            Object.assign(c, { downloadId: n, error: o, state: y.INTERRUPTED }), i.reject(c);
          }
        }
      }
    }
  }), B = !0);
}
async function ye(e = {}) {
  if (z(), !e.url || typeof e.url != "string")
    return {
      success: !1,
      error: "INVALID_URL",
      message: "Thiếu đường dẫn tải tệp."
    };
  const r = {
    url: e.url,
    conflictAction: "uniquify",
    saveAs: e.saveAs !== void 0 ? e.saveAs : !1
  };
  let t = e.filename;
  t && typeof t == "string" && (t = pe(t), !t.endsWith(".mp4") && !t.endsWith(".gif") && !t.endsWith(".mp3") && (t += ".mp4"), r.filename = t);
  try {
    return {
      success: !0,
      downloadId: await chrome.downloads.download(r),
      filename: t
    };
  } catch (n) {
    return console.error("[X Video Tools] chrome.downloads.download failed:", {
      error: n.message,
      stack: n.stack,
      url: e.url,
      filename: t
    }), {
      success: !1,
      error: "DOWNLOAD_FAILED",
      message: n.message || "Không thể bắt đầu tải tệp."
    };
  }
}
function Se(e, r = {}) {
  return z(), new Promise((t, n) => {
    v.set(e, {
      downloadId: e,
      videoKey: r.videoKey,
      tabId: r.tabId,
      filename: r.filename,
      state: y.IN_PROGRESS,
      onComplete: r.onComplete,
      onError: r.onError,
      onCancel: r.onCancel,
      resolve: t,
      reject: n
    });
  });
}
async function M(e, r = {}) {
  if (e && L.has(e)) {
    const n = L.get(e);
    if (n.state === y.IN_PROGRESS || n.state === y.INITIATED)
      return {
        blocked: !0,
        success: !1,
        reason: "DOWNLOAD_IN_PROGRESS",
        message: "Video này đang trong quá trình tải xuống."
      };
  }
  const t = r.correlationId || `${e}_${Date.now()}`;
  e && L.set(e, {
    state: y.INITIATED,
    correlationId: t,
    startTime: Date.now()
  });
  try {
    const n = await ye(r);
    if (!n.success)
      return e && L.delete(e), n;
    if (e) {
      const i = L.get(e);
      i && (i.downloadId = n.downloadId, i.state = y.IN_PROGRESS);
    }
    return Se(n.downloadId, {
      videoKey: e,
      tabId: r.tabId,
      filename: n.filename
    }).catch(() => {
    }), {
      success: !0,
      downloadId: n.downloadId,
      filename: n.filename,
      correlationId: t
    };
  } catch (n) {
    return console.error("[X Video Tools] initiateDownload error:", {
      videoKey: e,
      error: n.message,
      stack: n.stack
    }), e && L.delete(e), {
      success: !1,
      error: "DOWNLOAD_EXCEPTION",
      message: n.message
    };
  }
}
const Ie = 15e3;
function _e(e) {
  return !e || typeof e != "object" ? { valid: !1, error: "MALFORMED_SESSION_DATA" } : typeof e.token != "string" || !e.token.trim() ? { valid: !1, error: "INVALID_SESSION_TOKEN" } : typeof e.exp != "number" || Number.isNaN(e.exp) || e.exp <= 0 ? { valid: !1, error: "INVALID_SESSION_EXPIRY" } : { valid: !0 };
}
async function Ae(e, r, t = {}) {
  var c, h, E, _;
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
  if (!r || typeof r != "string" || !r.trim())
    return {
      success: !1,
      error: "TURNSTILE_RESPONSE_MISSING",
      code: "TURNSTILE_RESPONSE_MISSING",
      message: "Thiếu mã xác thực Turnstile. Vui lòng hoàn thành xác thực."
    };
  const l = `${C(e)}/session`, u = typeof t.timeout == "number" ? t.timeout : Ie, o = new AbortController();
  let a = !1;
  const s = setTimeout(() => {
    a = !0, o.abort();
  }, u);
  t.signal && (t.signal.aborted ? o.abort() : t.signal.addEventListener("abort", () => o.abort(), { once: !0 }));
  try {
    const m = await fetch(l, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "cf-turnstile-response": r.trim()
      },
      signal: o.signal
    });
    clearTimeout(s);
    let d;
    try {
      d = await m.json();
    } catch {
      return {
        success: !1,
        error: "MALFORMED_RESPONSE",
        code: "MALFORMED_RESPONSE",
        message: "Máy chủ phản hồi dữ liệu không hợp lệ."
      };
    }
    if (!m.ok || d.status === "error") {
      const T = K(d);
      return {
        success: !1,
        error: T.code || ((c = d.error) == null ? void 0 : c.code) || "AUTH_SESSION_REJECTED",
        code: T.code || ((h = d.error) == null ? void 0 : h.code) || "AUTH_SESSION_REJECTED",
        rawCode: ((E = d.error) == null ? void 0 : E.code) || T.rawCode,
        message: T.message || "Xác thực Turnstile không thành công hoặc bị máy chủ từ chối.",
        httpStatus: m.status
      };
    }
    const f = _e(d);
    return f.valid ? {
      success: !0,
      token: d.token,
      exp: d.exp
    } : {
      success: !1,
      error: f.error,
      code: f.error,
      message: "Phản hồi phiên xác thực từ máy chủ không đúng định dạng chuẩn."
    };
  } catch (m) {
    return clearTimeout(s), a ? {
      success: !1,
      error: "TIMEOUT",
      code: "TIMEOUT",
      message: "Hết thời gian chờ phản hồi xác thực từ máy chủ Cobalt."
    } : (_ = t.signal) != null && _.aborted || m.name === "AbortError" ? {
      success: !1,
      error: "ABORTED",
      code: "ABORTED",
      message: "Yêu cầu xác thực đã bị hủy."
    } : {
      success: !1,
      error: "UNREACHABLE",
      code: "UNREACHABLE",
      message: "Không thể kết nối tới máy chủ để xác thực phiên: " + m.message
    };
  }
}
console.log("[X Video Tools] Background Service Worker (ESM) đã khởi động.");
chrome.runtime.onMessage.addListener((e, r, t) => {
  var i, l, u;
  const n = (e == null ? void 0 : e.action) || (e == null ? void 0 : e.type);
  if (n === "FETCH_SYNDICATION" || n === "XVT_FETCH_SYNDICATION") {
    const o = ((i = e.payload) == null ? void 0 : i.tweetId) || e.tweetId;
    return ee(o, e.options).then((a) => t(a)).catch((a) => t({
      success: !1,
      error: "INTERNAL_ERROR",
      message: a.message || "Lỗi xử lý nội bộ Service Worker"
    })), !0;
  }
  if (n === "OPEN_CDN" || n === "OPEN_TAB" || n === "XVT_OPEN_TAB" || n === O.OPEN_CDN) {
    const o = ((l = e.payload) == null ? void 0 : l.url) || e.url;
    return ne(o).then((a) => t(a)).catch((a) => t({
      success: !1,
      error: "INTERNAL_ERROR",
      message: a.message || "Lỗi xử lý mở tab mới"
    })), !0;
  }
  if (n === O.GET_SETTINGS || n === "GET_SETTINGS")
    return V().then((o) => {
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
  if (n === O.TEST_CONNECTION || n === "TEST_CONNECTION" || n === "XVT_TEST_CONNECTION") {
    const o = e.payload || e, a = o.apiUrl, s = o.apiKey || "";
    return ge(a, s).then((c) => t(c)).catch((c) => t({
      healthy: !1,
      success: !1,
      error: "TEST_FAILED",
      message: c.message || "Lỗi khi kiểm tra kết nối"
    })), !0;
  }
  if (n === O.VERIFY_SESSION || n === "VERIFY_SESSION") {
    const o = e.payload || e, { instanceUrl: a, turnstileResponse: s } = o;
    return Ae(a, s).then(async (c) => {
      if (!c.success)
        return t(c);
      await ie(a, c.token, c.exp), t({
        success: !0,
        exp: c.exp,
        message: "Xác thực phiên làm việc thành công!"
      });
    }).catch((c) => {
      t({
        success: !1,
        error: "SESSION_VERIFY_EXCEPTION",
        message: c.message || "Lỗi ngoại lệ khi gửi xác thực phiên."
      });
    }), !0;
  }
  if (n === O.GET_SESSION_STATUS || n === "GET_SESSION_STATUS") {
    const o = e.payload || e, a = (o == null ? void 0 : o.instanceUrl) || "";
    return ae(a).then((s) => t({ success: !0, ...s })).catch((s) => t({ success: !1, error: "STATUS_ERROR", message: s.message })), !0;
  }
  if (n === O.CLEAR_SESSION || n === "CLEAR_SESSION")
    return x().then(() => t({ success: !0 })).catch((o) => t({ success: !1, error: "CLEAR_ERROR", message: o.message })), !0;
  if (n === O.DOWNLOAD_VIDEO || n === O.COBALT_DOWNLOAD || n === "COBALT_DOWNLOAD" || n === "XVT_COBALT_DOWNLOAD") {
    const o = e.payload || e, { tweetId: a, permalink: s, username: c, videoKey: h, correlationId: E = `req_${Date.now()}`, selectedUrl: _, mediaIndex: m, mediaFingerprint: d } = o, f = (u = r.tab) == null ? void 0 : u.id;
    return (async () => {
      var T;
      try {
        if (_) {
          const A = await M(h, {
            url: _,
            tweetId: a,
            username: c,
            correlationId: E,
            tabId: f
          });
          return t(A);
        }
        const g = await V();
        if (!g.cobaltUrl)
          return t({
            success: !1,
            error: "UNCONFIGURED",
            message: "Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập."
          });
        const W = J(g.cobaltUrl);
        if (W && ((T = chrome.permissions) != null && T.contains) && !await chrome.permissions.contains({ origins: [W] }))
          return t({
            success: !1,
            error: "PERMISSION_REQUIRED",
            message: "Cần cấp quyền truy cập máy chủ Cobalt trong cài đặt tiện ích."
          });
        const U = s || (a ? `https://x.com/i/status/${a}` : "");
        if (!U)
          return t({
            success: !1,
            error: "MISSING_URL",
            message: "Thiếu đường dẫn bài viết cần tải."
          });
        let F = "";
        g.apiKey || (F = await se(g.cobaltUrl) || "");
        const p = await fe({
          url: U,
          apiUrl: g.cobaltUrl,
          apiKey: g.apiKey,
          sessionToken: F,
          videoQuality: g.videoQuality || "max"
        });
        if (!p.success) {
          console.error("[X Video Tools] Cobalt API request failed:", {
            correlationId: E,
            error: p.error,
            code: p.code,
            message: p.message,
            targetUrl: U,
            apiUrl: g.cobaltUrl,
            details: p.details
          });
          const A = K(p.raw || p, g.cobaltUrl);
          return t({
            success: !1,
            error: A.code || p.error,
            code: A.code || p.code,
            rawCode: A.rawCode || p.code,
            message: A.message || p.message || "Lỗi khi kết nối Cobalt API.",
            retryAfter: p.retryAfter
          });
        }
        const N = Te(p.raw || p);
        if (!N.success)
          return console.error("[X Video Tools] Cobalt response parsing failed:", {
            correlationId: E,
            error: N.error,
            message: N.message
          }), t(N);
        if (N.type === "PICKER") {
          const A = Ee(N.items, { mediaIndex: m, mediaFingerprint: d });
          if (A && A.url) {
            const Q = await M(h, {
              url: A.url,
              tweetId: a,
              username: c,
              correlationId: E,
              tabId: f
            });
            return t(Q);
          }
          return t({
            success: !0,
            status: "picker",
            type: "PICKER",
            items: N.items,
            totalItems: N.totalItems,
            correlationId: E
          });
        }
        const q = await M(h, {
          url: N.downloadUrl,
          tweetId: a,
          username: c,
          correlationId: E,
          tabId: f
        });
        t(q);
      } catch (g) {
        console.error("[X Video Tools] Unhandled error in COBALT_DOWNLOAD:", {
          correlationId: E,
          error: g.message,
          stack: g.stack
        }), t({
          success: !1,
          error: "DOWNLOAD_ERROR",
          message: g.message || "Lỗi không xác định trong quá trình tải video."
        });
      }
    })(), !0;
  }
  return !1;
});
