const I = Object.freeze({
  SETTINGS: "xvt_settings",
  JWT_SESSION: "cobalt_jwt_session"
}), w = Object.freeze({
  cobaltUrl: "",
  videoQuality: "1080",
  apiKey: ""
}), C = Object.freeze({
  DOWNLOAD_VIDEO: "DOWNLOAD_VIDEO",
  COBALT_DOWNLOAD: "COBALT_DOWNLOAD",
  OPEN_CDN: "OPEN_CDN",
  GET_SETTINGS: "GET_SETTINGS",
  TEST_CONNECTION: "TEST_CONNECTION",
  VERIFY_SESSION: "VERIFY_SESSION",
  GET_SESSION_STATUS: "GET_SESSION_STATUS",
  CLEAR_SESSION: "CLEAR_SESSION"
});
let k = { ...w };
async function x() {
  var e, r;
  try {
    if (typeof chrome < "u" && ((r = (e = chrome == null ? void 0 : chrome.storage) == null ? void 0 : e.local) != null && r.get)) {
      const t = await chrome.storage.local.get(I.SETTINGS), n = t == null ? void 0 : t[I.SETTINGS], i = { ...w, ...n || {} };
      return k = i, i;
    }
    return { ...k };
  } catch (t) {
    return console.error("[X Video Tools] Không thể đọc cấu hình từ storage:", t), k = { ...w }, { ...w };
  }
}
var z, X, $, Y;
typeof chrome < "u" && ((X = (z = chrome == null ? void 0 : chrome.storage) == null ? void 0 : z.local) != null && X.get) && (x().catch(() => {
}), (Y = ($ = chrome == null ? void 0 : chrome.storage) == null ? void 0 : $.onChanged) != null && Y.addListener && chrome.storage.onChanged.addListener((e, r) => {
  if (r === "local" && e[I.SETTINGS]) {
    const t = e[I.SETTINGS].newValue;
    k = { ...w, ...t || {} };
  }
}));
function L(e) {
  if (!e || typeof e != "string") return "";
  const r = e.trim();
  if (!r) return "";
  try {
    const t = new URL(r), n = t.protocol.toLowerCase(), i = t.host.toLowerCase();
    let a = t.pathname.replace(/\/+$/, "");
    return a === "/" && (a = ""), `${n}//${i}${a}`;
  } catch {
    return r.replace(/\/+$/, "");
  }
}
function U(e) {
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
    url: L(r)
  } : { valid: !1, error: "MALFORMED_URL" };
}
function ee(e) {
  const r = U(e);
  return !r.valid || !r.origin ? null : `${r.origin}/*`;
}
function te(e) {
  if (!e)
    return "";
  const r = String(e).trim();
  if (!/^\d+$/.test(r))
    return "";
  const t = Number(r);
  return isNaN(t) || t <= 0 ? "" : (t / 1e15 * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}
async function re(e, r = {}) {
  var o, s;
  const t = typeof r.timeout == "number" ? r.timeout : 1e4, n = te(e);
  if (!n)
    return {
      success: !1,
      error: "INVALID_TWEET_ID",
      message: "Mã số bài viết (Tweet ID) không hợp lệ"
    };
  const i = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(e)}&token=${n}&lang=en`, a = new AbortController(), u = setTimeout(() => {
    a.abort();
  }, t);
  try {
    const l = await fetch(i, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: a.signal
    });
    if (clearTimeout(u), l.status === 429)
      return {
        success: !1,
        error: "API_RATE_LIMIT",
        status: 429,
        message: "Bị giới hạn tần suất truy vấn từ X (Rate limited)"
      };
    if (l.status === 404)
      return {
        success: !1,
        error: "TWEET_INACCESSIBLE",
        status: 404,
        message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
      };
    if (l.status === 403)
      return {
        success: !1,
        error: "TWEET_INACCESSIBLE",
        status: 403,
        message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
      };
    if (!l.ok)
      return {
        success: !1,
        error: "HTTP_ERROR",
        status: l.status,
        message: `Lỗi kết nối máy chủ (${l.status})`
      };
    const c = await l.json();
    return c != null && c.tombstone || c != null && c.errors || (c == null ? void 0 : c.__typename) === "TweetTombstone" ? {
      success: !1,
      error: "TWEET_INACCESSIBLE",
      message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
    } : {
      success: !0,
      data: c,
      mediaDetails: (c == null ? void 0 : c.mediaDetails) || []
    };
  } catch (l) {
    return clearTimeout(u), l.name === "AbortError" || (o = l.message) != null && o.includes("aborted") || (s = l.message) != null && s.includes("timeout") ? {
      success: !1,
      error: "API_TIMEOUT",
      message: "Hết thời gian chờ phản hồi từ máy chủ X"
    } : {
      success: !1,
      error: "NETWORK_ERROR",
      message: l.message || "Lỗi kết nối mạng"
    };
  }
}
const ne = "video.twimg.com";
function ie(e) {
  if (!e || typeof e != "string")
    return !1;
  const r = e.trim();
  if (!r || r.startsWith("blob:") || r.startsWith("data:") || r.startsWith("javascript:"))
    return !1;
  try {
    const t = new URL(r);
    if (t.protocol !== "https:" || t.hostname.toLowerCase() !== ne)
      return !1;
    const i = t.pathname;
    if (!i || i === "/" || i.trim() === "")
      return !1;
    const a = i.toLowerCase();
    return !(a.endsWith(".jpg") || a.endsWith(".jpeg") || a.endsWith(".png") || a.endsWith(".webp"));
  } catch {
    return !1;
  }
}
async function oe(e) {
  if (!ie(e))
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
let T = null;
function P() {
  var e, r;
  return typeof chrome < "u" && !!((r = (e = chrome == null ? void 0 : chrome.storage) == null ? void 0 : e.session) != null && r.get);
}
async function se(e, r, t = 180) {
  if (!r || typeof r != "string" || !r.trim())
    throw new TypeError("JWT token phải là một chuỗi không rỗng.");
  const n = L(e), i = typeof t == "number" && t > 0 ? t : 180, a = Math.floor(Date.now() / 1e3) + i, u = {
    token: r.trim(),
    exp: a,
    instanceUrl: n,
    createdAt: Date.now()
  };
  if (T = u, P())
    try {
      await chrome.storage.session.set({
        [I.JWT_SESSION]: u
      });
    } catch {
    }
  return { success: !0, expiresAt: a };
}
function ae(e = "") {
  if (!T || !T.token) return null;
  if (e && typeof e == "string" && e.trim()) {
    const t = L(e);
    if (T.instanceUrl && T.instanceUrl !== t)
      return null;
  }
  return Math.floor(Date.now() / 1e3) >= T.exp - 3 ? (T = null, null) : T.token;
}
async function ce(e = "") {
  let r = T;
  if (P())
    try {
      const n = await chrome.storage.session.get(I.JWT_SESSION);
      n && n[I.JWT_SESSION] && (r = n[I.JWT_SESSION]);
    } catch {
      r = T;
    }
  if (!r || !r.token)
    return null;
  if (e && typeof e == "string" && e.trim()) {
    const n = L(e);
    if (r.instanceUrl && r.instanceUrl !== n)
      return null;
  }
  return Math.floor(Date.now() / 1e3) >= r.exp - 3 ? (await K(), null) : r.token;
}
async function K() {
  if (T = null, P())
    try {
      await chrome.storage.session.remove(I.JWT_SESSION);
    } catch {
    }
}
async function le(e = "") {
  let r = T;
  if (P())
    try {
      const i = await chrome.storage.session.get(I.JWT_SESSION);
      i && i[I.JWT_SESSION] && (r = i[I.JWT_SESSION]);
    } catch {
      r = T;
    }
  if (!r || !r.token)
    return {
      authenticated: !1,
      expired: !1,
      expiresIn: null,
      instanceUrl: null
    };
  if (e && typeof e == "string" && e.trim()) {
    const i = L(e);
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
const ue = "max", he = 15e3, fe = Object.freeze([
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
]), ge = Object.freeze([
  "best",
  "mp3",
  "ogg",
  "wav",
  "opus"
]);
function q(e = "", r = "") {
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
  !r || !fe.includes(String(r)) ? r = ue : r = String(r);
  let t = e.audioFormat;
  !t || !ge.includes(String(t)) ? t = "mp3" : t = String(t);
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
async function me(e = {}) {
  var f, _, m;
  const r = e.apiUrl || e.instanceUrl;
  if (!r || typeof r != "string" || !r.trim())
    return {
      success: !1,
      error: "UNCONFIGURED",
      message: "Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập."
    };
  if (!U(r).valid)
    return {
      success: !1,
      error: "INVALID_URL",
      message: "URL máy chủ Cobalt không hợp lệ."
    };
  const i = `${L(r)}/`, a = de({
    url: e.url,
    videoQuality: e.videoQuality,
    audioFormat: e.audioFormat,
    downloadMode: e.downloadMode,
    filenameStyle: e.filenameStyle,
    alwaysProxy: e.alwaysProxy
  }), u = e.sessionToken || (e.apiKey ? "" : ae(r)) || "", o = q(e.apiKey, u), s = typeof e.timeout == "number" ? e.timeout : he, l = new AbortController();
  let c = !1, h = null;
  s > 0 && (h = setTimeout(() => {
    c = !0, l.abort();
  }, s)), e.signal && (e.signal.aborted ? l.abort() : e.signal.addEventListener("abort", () => l.abort(), { once: !0 }));
  try {
    const g = await fetch(i, {
      method: "POST",
      headers: o,
      body: JSON.stringify(a),
      signal: l.signal
    });
    h && clearTimeout(h);
    let d;
    const p = await g.text();
    try {
      d = JSON.parse(p);
    } catch {
      return {
        success: !1,
        error: "MALFORMED_RESPONSE",
        message: "Máy chủ trả về phản hồi không hợp lệ.",
        httpStatus: g.status
      };
    }
    if (!g.ok || d.status === "error") {
      const E = ((f = d.error) == null ? void 0 : f.code) || "API_ERROR";
      if (E === "error.api.auth.jwt.invalid" || E === "error.api.auth.jwt.missing")
        try {
          await K();
        } catch {
        }
      return {
        success: !1,
        status: "error",
        error: E,
        code: E,
        context: ((_ = d.error) == null ? void 0 : _.context) || {},
        httpStatus: g.status,
        raw: d
      };
    }
    return {
      success: !0,
      status: d.status,
      url: d.url,
      filename: d.filename,
      picker: d.picker,
      raw: d
    };
  } catch (g) {
    if (h && clearTimeout(h), c) {
      const p = new Error("Hết thời gian chờ phản hồi từ máy chủ Cobalt.");
      throw Object.assign(p, {
        success: !1,
        error: "API_TIMEOUT",
        code: "API_TIMEOUT"
      }), p;
    }
    if ((m = e.signal) != null && m.aborted || g.name === "AbortError") {
      const p = new Error("Yêu cầu đã bị hủy.");
      throw Object.assign(p, {
        success: !1,
        error: "ABORTED",
        code: "ABORTED",
        cancelled: !0
      }), p;
    }
    return {
      success: !1,
      error: "UNREACHABLE",
      message: !!(r.includes("localhost") || r.includes("127.0.0.1") || r.includes("[::1]")) ? "Không thể kết nối máy chủ Cobalt nội bộ (localhost:9000). Vui lòng khởi động scripts\\start-cobalt-windows.bat." : "Không thể kết nối đến máy chủ Cobalt. Kiểm tra URL hoặc kết nối mạng.",
      details: g.message,
      apiUrl: r
    };
  }
}
async function Ee(e, r = "", t = {}) {
  var u, o, s, l;
  if (!e || typeof e != "string" || !e.trim())
    return {
      healthy: !1,
      error: "UNCONFIGURED",
      message: "Chưa cấu hình URL máy chủ Cobalt."
    };
  if (!U(e).valid)
    return {
      healthy: !1,
      error: "INVALID_URL",
      message: "URL máy chủ Cobalt không hợp lệ."
    };
  const i = L(e), a = `${i}/`;
  try {
    const c = await fetch(a, {
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
    const h = await c.json(), f = ((u = h.cobalt) == null ? void 0 : u.version) || "unknown", _ = ((o = h.cobalt) == null ? void 0 : o.services) || [];
    let m = null;
    if (r && r.trim().length > 0 && (m = await pe(i, r.trim()), m && !m.valid))
      return {
        healthy: !1,
        version: f,
        services: _,
        error: m.error || "AUTH_KEY_INVALID",
        message: "API Key không chính xác hoặc không được chấp nhận bởi máy chủ."
      };
    const g = !!((s = h.cobalt) != null && s.turnstileSitekey), d = ((l = h.cobalt) == null ? void 0 : l.turnstileSitekey) || null;
    return {
      healthy: !0,
      version: f,
      services: _,
      turnstileRequired: g,
      turnstileSitekey: d,
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
async function pe(e, r) {
  var t;
  try {
    const i = await (await fetch(`${e}/`, {
      method: "POST",
      headers: q(r),
      body: JSON.stringify({})
    })).json().catch(() => ({})), a = (t = i == null ? void 0 : i.error) == null ? void 0 : t.code;
    return a === "error.api.link.missing" ? { valid: !0 } : a && (a.startsWith("error.api.auth.key.") || a.startsWith("error.api.auth.jwt.")) ? { valid: !1, error: a } : { valid: !0 };
  } catch {
    return { valid: !1, error: "PROBE_FAILED" };
  }
}
function ye(e, r = {}) {
  if (!Array.isArray(e) || e.length === 0)
    return null;
  const t = (o) => !!(o && (o.type === "video" || o.type === "gif" || o.type === "animated_gif" || !o.type)), n = e.filter(t), i = n.length > 0 ? n : e, a = r == null ? void 0 : r.mediaIndex;
  if (typeof a == "number" && a > 0) {
    const o = e[a - 1];
    if (o && o.url && t(o))
      return o;
    const s = n[a - 1];
    if (s && s.url)
      return s;
  }
  const u = r == null ? void 0 : r.mediaFingerprint;
  if (u && typeof u == "string") {
    const o = u.trim();
    if (o.length > 0) {
      const s = i.filter((l) => {
        const c = l.thumb ? String(l.thumb) : "", h = l.url ? String(l.url) : "";
        return c.includes(o) || h.includes(o);
      });
      if (s.length === 1)
        return s[0];
    }
  }
  return i.length === 1 && i[0].url ? i[0] : null;
}
function A(e) {
  return typeof e != "string" ? e : e.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]").replace(/Api-Key\s+[A-Za-z0-9._~+/-]+=*/gi, "Api-Key [REDACTED]").replace(/\b(api[_-]?key|session[_-]?token|token|jwt|secret|password|auth)=([^&\s]+)/gi, "$1=[REDACTED]").replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]*)?\b/g, "[REDACTED_JWT]");
}
function J(e, r = "Lỗi không xác định.") {
  if (e == null || e === "")
    return r;
  if (typeof e == "string") {
    const t = e.trim();
    return A(t) || r;
  }
  if (typeof e == "number" || typeof e == "boolean")
    return String(e);
  if (typeof e == "object") {
    if (typeof e.message == "string" && e.message.trim())
      return A(e.message.trim());
    if (typeof e.error == "string" && e.error.trim())
      return A(e.error.trim());
    if (e.error && typeof e.error == "object") {
      if (typeof e.error.message == "string" && e.error.message.trim())
        return A(e.error.message.trim());
      if (typeof e.error.code == "string" && e.error.code.trim())
        return A(e.error.code.trim());
    }
    if (typeof e.code == "string" && e.code.trim())
      return A(e.code.trim());
    if (typeof e.rawCode == "string" && e.rawCode.trim())
      return A(e.rawCode.trim());
    if (typeof e.statusText == "string" && e.statusText.trim())
      return A(e.statusText.trim());
    if (typeof e.details == "string" && e.details.trim())
      return A(e.details.trim());
    try {
      if (Object.keys(e).length > 0) {
        const n = { ...e };
        for (const a of Object.keys(n)) {
          const u = a.toLowerCase();
          (u.includes("key") || u.includes("token") || u.includes("secret") || u.includes("jwt") || u.includes("auth") || u.includes("pass")) && delete n[a];
        }
        const i = JSON.stringify(n);
        if (i && i !== "{}") return A(i);
      }
    } catch {
    }
  }
  return r;
}
const D = Object.freeze({
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
function W(e, r = "") {
  var l, c, h;
  let t = "", n = {}, i = "";
  typeof e == "string" ? t = e.trim() : e && typeof e == "object" && (typeof e.code == "string" ? t = e.code.trim() : typeof ((l = e.error) == null ? void 0 : l.code) == "string" ? t = e.error.code.trim() : typeof e.error == "string" ? t = e.error.trim() : typeof e.rawCode == "string" && (t = e.rawCode.trim()), typeof e.message == "string" && e.message.trim() ? i = e.message.trim() : typeof ((c = e.error) == null ? void 0 : c.message) == "string" && e.error.message.trim() && (i = e.error.message.trim()), n = e.context || ((h = e.error) == null ? void 0 : h.context) || {});
  const a = String(r || (e == null ? void 0 : e.apiUrl) || (e == null ? void 0 : e.url) || (n == null ? void 0 : n.url) || ""), u = !!(a.includes("localhost") || a.includes("127.0.0.1") || a.includes("[::1]")), o = typeof t == "string" ? t.toUpperCase() : "";
  if (o === "UNREACHABLE" || o === "SERVER_UNREACHABLE" || o === "LOCAL_OFFLINE" || o === "LOCAL_SERVICE_OFFLINE" || t === "error.api.unreachable")
    return {
      code: "UNREACHABLE",
      rawCode: t,
      message: u ? "Không thể kết nối máy chủ Cobalt nội bộ (localhost:9000). Vui lòng khởi động scripts\\start-cobalt-windows.bat." : "Không thể kết nối đến máy chủ Cobalt. Vui lòng kiểm tra lại URL hoặc mạng."
    };
  if (t === "API_TIMEOUT" || t === "timed_out" || t === "error.api.timed_out")
    return {
      code: "API_TIMEOUT",
      rawCode: t,
      message: "Hết thời gian chờ phản hồi từ máy chủ Cobalt. Vui lòng thử lại sau."
    };
  if (t === "ABORTED" || t === "aborted")
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
    const f = t.includes("invalid");
    return {
      code: f ? "AUTH_EXPIRED" : "AUTH_REQUIRED",
      rawCode: t,
      message: f ? "Phiên xác thực Turnstile hoặc API Key không hợp lệ hoặc đã hết hạn." : "Máy chủ yêu cầu xác thực phiên Turnstile hoặc API Key."
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
  if (t === "error.api.rate_exceeded" || t === "rate_exceeded" || t === "error.api.rate_limit" || t === "rate_limit" || o === "RATE_LIMIT") {
    const f = n.limit || 15;
    return {
      code: "RATE_LIMIT",
      rawCode: t,
      retryAfter: Number(f),
      message: `Đã vượt quá giới hạn tải. Vui lòng thử lại sau ${f} giây.`
    };
  }
  if (t === "capacity" || t === "error.api.capacity")
    return {
      code: "CAPACITY",
      rawCode: t,
      message: "Máy chủ Cobalt hiện đang quá tải. Vui lòng thử lại sau ít giây."
    };
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
  let s = G[t] || i || G["error.api.generic"];
  return n.limit && typeof s == "string" && (s = s.replace(/\{\{\s*limit\s*\}\}|\{limit\}/g, String(n.limit))), n.service && typeof s == "string" && (s = s.replace(/\{\{\s*service\s*\}\}|\{service\}/g, String(n.service))), {
    code: "API_ERROR",
    rawCode: typeof t == "string" ? t : "",
    message: typeof s == "string" ? s : J(s)
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
  if (t === D.REDIRECT) {
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
  if (t === D.TUNNEL) {
    const n = e.url;
    if (!n || typeof n != "string")
      return {
        success: !1,
        error: "INVALID_TUNNEL_URL",
        message: "Đường dẫn tunnel stream không hợp lệ."
      };
    try {
      const a = new URL(n).searchParams;
      if (["id", "exp", "sig", "sec", "iv"].filter((s) => !a.has(s)).length > 0)
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
  if (t === D.PICKER) {
    const n = e.picker;
    if (!Array.isArray(n) || n.length === 0)
      return {
        success: !1,
        error: "EMPTY_PICKER",
        message: "Danh sách video trong bài viết trống."
      };
    const i = n.map((a, u) => ({
      index: u,
      type: a.type || "video",
      url: a.url,
      thumb: a.thumb
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
  if (t === D.LOCAL_PROCESSING)
    return {
      success: !1,
      error: "LOCAL_PROCESSING_UNSUPPORTED",
      message: "Máy chủ yêu cầu xử lý cục bộ (local processing), tính năng chưa được hỗ trợ trên trình duyệt."
    };
  if (t === D.ERROR || e.error) {
    const n = W(e);
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
}), b = /* @__PURE__ */ new Map(), v = /* @__PURE__ */ new Map();
let H = !1;
function Se(e) {
  return !e || typeof e != "string" ? "" : e.replace(/[\\/:*?"<>|]/g, "_").trim();
}
function M(e, r) {
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
function Q() {
  var e, r;
  H || typeof chrome > "u" || !((r = (e = chrome.downloads) == null ? void 0 : e.onChanged) != null && r.addListener) || (chrome.downloads.onChanged.addListener((t) => {
    var a;
    if (!t || !t.id) return;
    const n = t.id, i = v.get(n);
    if (i && (t.filename && t.filename.current && (i.filename = t.filename.current), t.state)) {
      const u = t.state.current;
      if (u === "complete")
        i.state = y.COMPLETED, i.videoKey && b.delete(i.videoKey), v.delete(n), M(i.tabId, {
          type: "DOWNLOAD_STATUS_CHANGED",
          downloadId: n,
          videoKey: i.videoKey,
          state: "complete",
          filename: i.filename
        }), typeof i.onComplete == "function" && i.onComplete({ downloadId: n, state: y.COMPLETED }), typeof i.resolve == "function" && i.resolve({ success: !0, downloadId: n, state: y.COMPLETED });
      else if (u === "interrupted") {
        const o = ((a = t.error) == null ? void 0 : a.current) || "UNKNOWN_ERROR", s = o === "USER_CANCELED";
        if (i.state = s ? y.CANCELLED : y.INTERRUPTED, i.videoKey && b.delete(i.videoKey), v.delete(n), s)
          M(i.tabId, {
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
          const l = "Quá trình tải video bị gián đoạn do lỗi kết nối mạng.";
          if (M(i.tabId, {
            type: "DOWNLOAD_STATUS_CHANGED",
            downloadId: n,
            videoKey: i.videoKey,
            state: "interrupted",
            error: o,
            message: l
          }), typeof i.onError == "function" && i.onError({ downloadId: n, error: o, message: l }), typeof i.reject == "function") {
            const c = new Error(l);
            Object.assign(c, { downloadId: n, error: o, state: y.INTERRUPTED }), i.reject(c);
          }
        }
      }
    }
  }), H = !0);
}
async function Ie(e = {}) {
  if (Q(), !e.url || typeof e.url != "string")
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
  t && typeof t == "string" && (t = Se(t), !t.endsWith(".mp4") && !t.endsWith(".gif") && !t.endsWith(".mp3") && (t += ".mp4"), r.filename = t);
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
function _e(e, r = {}) {
  return Q(), new Promise((t, n) => {
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
async function V(e, r = {}) {
  if (e && b.has(e)) {
    const n = b.get(e);
    if (n.state === y.IN_PROGRESS || n.state === y.INITIATED)
      return {
        blocked: !0,
        success: !1,
        reason: "DOWNLOAD_IN_PROGRESS",
        message: "Video này đang trong quá trình tải xuống."
      };
  }
  const t = r.correlationId || `${e}_${Date.now()}`;
  e && b.set(e, {
    state: y.INITIATED,
    correlationId: t,
    startTime: Date.now()
  });
  try {
    const n = await Ie(r);
    if (!n.success)
      return e && b.delete(e), n;
    if (e) {
      const i = b.get(e);
      i && (i.downloadId = n.downloadId, i.state = y.IN_PROGRESS);
    }
    return _e(n.downloadId, {
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
    }), e && b.delete(e), {
      success: !1,
      error: "DOWNLOAD_EXCEPTION",
      message: n.message
    };
  }
}
const Ae = 15e3;
function Ne(e) {
  return !e || typeof e != "object" ? { valid: !1, error: "MALFORMED_SESSION_DATA" } : typeof e.token != "string" || !e.token.trim() ? { valid: !1, error: "INVALID_SESSION_TOKEN" } : typeof e.exp != "number" || Number.isNaN(e.exp) || e.exp <= 0 ? { valid: !1, error: "INVALID_SESSION_EXPIRY" } : { valid: !0 };
}
async function Oe(e, r, t = {}) {
  var c, h, f, _;
  if (!e || typeof e != "string" || !e.trim())
    return {
      success: !1,
      error: "UNCONFIGURED",
      code: "UNCONFIGURED",
      message: "Chưa cài đặt Cobalt URL. Vui lòng thiết lập trong cài đặt."
    };
  if (!U(e).valid)
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
  const a = `${L(e)}/session`, u = typeof t.timeout == "number" ? t.timeout : Ae, o = new AbortController();
  let s = !1;
  const l = setTimeout(() => {
    s = !0, o.abort();
  }, u);
  t.signal && (t.signal.aborted ? o.abort() : t.signal.addEventListener("abort", () => o.abort(), { once: !0 }));
  try {
    const m = await fetch(a, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "cf-turnstile-response": r.trim()
      },
      signal: o.signal
    });
    clearTimeout(l);
    let g;
    try {
      g = await m.json();
    } catch {
      return {
        success: !1,
        error: "MALFORMED_RESPONSE",
        code: "MALFORMED_RESPONSE",
        message: "Máy chủ phản hồi dữ liệu không hợp lệ."
      };
    }
    if (!m.ok || g.status === "error") {
      const p = W(g);
      return {
        success: !1,
        error: p.code || ((c = g.error) == null ? void 0 : c.code) || "AUTH_SESSION_REJECTED",
        code: p.code || ((h = g.error) == null ? void 0 : h.code) || "AUTH_SESSION_REJECTED",
        rawCode: ((f = g.error) == null ? void 0 : f.code) || p.rawCode,
        message: p.message || "Xác thực Turnstile không thành công hoặc bị máy chủ từ chối.",
        httpStatus: m.status
      };
    }
    const d = Ne(g);
    return d.valid ? {
      success: !0,
      token: g.token,
      exp: g.exp
    } : {
      success: !1,
      error: d.error,
      code: d.error,
      message: "Phản hồi phiên xác thực từ máy chủ không đúng định dạng chuẩn."
    };
  } catch (m) {
    return clearTimeout(l), s ? {
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
  var i, a, u;
  const n = (e == null ? void 0 : e.action) || (e == null ? void 0 : e.type);
  if (n === "FETCH_SYNDICATION" || n === "XVT_FETCH_SYNDICATION") {
    const o = ((i = e.payload) == null ? void 0 : i.tweetId) || e.tweetId;
    return re(o, e.options).then((s) => t(s)).catch((s) => t({
      success: !1,
      error: "INTERNAL_ERROR",
      message: s.message || "Lỗi xử lý nội bộ Service Worker"
    })), !0;
  }
  if (n === "OPEN_CDN" || n === "OPEN_TAB" || n === "XVT_OPEN_TAB" || n === C.OPEN_CDN) {
    const o = ((a = e.payload) == null ? void 0 : a.url) || e.url;
    return oe(o).then((s) => t(s)).catch((s) => t({
      success: !1,
      error: "INTERNAL_ERROR",
      message: s.message || "Lỗi xử lý mở tab mới"
    })), !0;
  }
  if (n === C.GET_SETTINGS || n === "GET_SETTINGS")
    return x().then((o) => {
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
  if (n === C.TEST_CONNECTION || n === "TEST_CONNECTION" || n === "XVT_TEST_CONNECTION") {
    const o = e.payload || e, s = o.apiUrl, l = o.apiKey || "";
    return Ee(s, l).then((c) => t(c)).catch((c) => t({
      healthy: !1,
      success: !1,
      error: "TEST_FAILED",
      message: c.message || "Lỗi khi kiểm tra kết nối"
    })), !0;
  }
  if (n === C.VERIFY_SESSION || n === "VERIFY_SESSION") {
    const o = e.payload || e, { instanceUrl: s, turnstileResponse: l } = o;
    return Oe(s, l).then(async (c) => {
      if (!c.success)
        return t(c);
      await se(s, c.token, c.exp), t({
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
  if (n === C.GET_SESSION_STATUS || n === "GET_SESSION_STATUS") {
    const o = e.payload || e, s = (o == null ? void 0 : o.instanceUrl) || "";
    return le(s).then((l) => t({ success: !0, ...l })).catch((l) => t({ success: !1, error: "STATUS_ERROR", message: l.message })), !0;
  }
  if (n === C.CLEAR_SESSION || n === "CLEAR_SESSION")
    return K().then(() => t({ success: !0 })).catch((o) => t({ success: !1, error: "CLEAR_ERROR", message: o.message })), !0;
  if (n === C.DOWNLOAD_VIDEO || n === C.COBALT_DOWNLOAD || n === "COBALT_DOWNLOAD" || n === "XVT_COBALT_DOWNLOAD") {
    const o = e.payload || e, { tweetId: s, permalink: l, username: c, videoKey: h, correlationId: f = `req_${Date.now()}`, selectedUrl: _, mediaIndex: m, mediaFingerprint: g } = o, d = (u = r.tab) == null ? void 0 : u.id;
    return (async () => {
      var p;
      try {
        if (_) {
          const O = await V(h, {
            url: _,
            tweetId: s,
            username: c,
            correlationId: f,
            tabId: d
          });
          return t(O);
        }
        const E = await x();
        if (!E.cobaltUrl)
          return t({
            success: !1,
            error: "UNCONFIGURED",
            message: "Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập."
          });
        const B = ee(E.cobaltUrl);
        if (B && ((p = chrome.permissions) != null && p.contains) && !await chrome.permissions.contains({ origins: [B] }))
          return t({
            success: !1,
            error: "PERMISSION_REQUIRED",
            message: "Cần cấp quyền truy cập máy chủ Cobalt trong cài đặt tiện ích."
          });
        const j = l || (s ? `https://x.com/i/status/${s}` : "");
        if (!j)
          return t({
            success: !1,
            error: "MISSING_URL",
            message: "Thiếu đường dẫn bài viết cần tải."
          });
        let F = "";
        E.apiKey || (F = await ce(E.cobaltUrl) || "");
        const S = await me({
          url: j,
          apiUrl: E.cobaltUrl,
          apiKey: E.apiKey,
          sessionToken: F,
          videoQuality: E.videoQuality || "max"
        });
        if (!S.success) {
          const O = J(S.message || S.error || "Lỗi kết nối Cobalt");
          console.warn(`[X Video Tools] Cobalt API request notice: ${O}`);
          const R = W(S.raw || S, E.cobaltUrl);
          return t({
            success: !1,
            error: R.code || S.error,
            code: R.code || S.code,
            rawCode: R.rawCode || S.code,
            message: R.message || S.message || "Lỗi khi kết nối Cobalt API.",
            retryAfter: S.retryAfter
          });
        }
        const N = Te(S.raw || S);
        if (!N.success)
          return console.error("[X Video Tools] Cobalt response parsing failed:", {
            correlationId: f,
            error: N.error,
            message: N.message
          }), t(N);
        if (N.type === "PICKER") {
          const O = ye(N.items, { mediaIndex: m, mediaFingerprint: g });
          if (O && O.url) {
            const R = await V(h, {
              url: O.url,
              tweetId: s,
              username: c,
              correlationId: f,
              tabId: d
            });
            return t(R);
          }
          return t({
            success: !0,
            status: "picker",
            type: "PICKER",
            items: N.items,
            totalItems: N.totalItems,
            correlationId: f
          });
        }
        const Z = await V(h, {
          url: N.downloadUrl,
          tweetId: s,
          username: c,
          correlationId: f,
          tabId: d
        });
        t(Z);
      } catch (E) {
        console.error("[X Video Tools] Unhandled error in COBALT_DOWNLOAD:", {
          correlationId: f,
          error: E.message,
          stack: E.stack
        }), t({
          success: !1,
          error: "DOWNLOAD_ERROR",
          message: E.message || "Lỗi không xác định trong quá trình tải video."
        });
      }
    })(), !0;
  }
  return !1;
});
