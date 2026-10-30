const l = Object.freeze({
  DOWNLOAD_VIDEO: "DOWNLOAD_VIDEO",
  OPEN_CDN: "OPEN_CDN",
  GET_SETTINGS: "GET_SETTINGS"
});
function T(t) {
  if (!t)
    return "";
  const e = String(t).trim();
  if (!/^\d+$/.test(e))
    return "";
  const r = Number(e);
  return isNaN(r) || r <= 0 ? "" : (r / 1e15 * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}
async function f(t, e = {}) {
  var c, h;
  const r = typeof e.timeout == "number" ? e.timeout : 1e4, i = T(t);
  if (!i)
    return {
      success: !1,
      error: "INVALID_TWEET_ID",
      message: "Mã số bài viết (Tweet ID) không hợp lệ"
    };
  const a = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(t)}&token=${i}&lang=en`, o = new AbortController(), u = setTimeout(() => {
    o.abort();
  }, r);
  try {
    const n = await fetch(a, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: o.signal
    });
    if (clearTimeout(u), n.status === 429)
      return {
        success: !1,
        error: "API_RATE_LIMIT",
        status: 429,
        message: "Bị giới hạn tần suất truy vấn từ X (Rate limited)"
      };
    if (n.status === 404)
      return {
        success: !1,
        error: "TWEET_INACCESSIBLE",
        status: 404,
        message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
      };
    if (n.status === 403)
      return {
        success: !1,
        error: "TWEET_INACCESSIBLE",
        status: 403,
        message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
      };
    if (!n.ok)
      return {
        success: !1,
        error: "HTTP_ERROR",
        status: n.status,
        message: `Lỗi kết nối máy chủ (${n.status})`
      };
    const s = await n.json();
    return s != null && s.tombstone || s != null && s.errors || (s == null ? void 0 : s.__typename) === "TweetTombstone" ? {
      success: !1,
      error: "TWEET_INACCESSIBLE",
      message: "Tweet không tồn tại hoặc bị giới hạn quyền riêng tư"
    } : {
      success: !0,
      data: s,
      mediaDetails: (s == null ? void 0 : s.mediaDetails) || []
    };
  } catch (n) {
    return clearTimeout(u), n.name === "AbortError" || (c = n.message) != null && c.includes("aborted") || (h = n.message) != null && h.includes("timeout") ? {
      success: !1,
      error: "API_TIMEOUT",
      message: "Hết thời gian chờ phản hồi từ máy chủ X"
    } : {
      success: !1,
      error: "NETWORK_ERROR",
      message: n.message || "Lỗi kết nối mạng"
    };
  }
}
const m = "video.twimg.com";
function E(t) {
  if (!t || typeof t != "string")
    return !1;
  const e = t.trim();
  if (!e || e.startsWith("blob:") || e.startsWith("data:") || e.startsWith("javascript:"))
    return !1;
  try {
    const r = new URL(e);
    if (r.protocol !== "https:" || r.hostname.toLowerCase() !== m)
      return !1;
    const a = r.pathname;
    if (!a || a === "/" || a.trim() === "")
      return !1;
    const o = a.toLowerCase();
    return !(o.endsWith(".jpg") || o.endsWith(".jpeg") || o.endsWith(".png") || o.endsWith(".webp"));
  } catch {
    return !1;
  }
}
async function I(t) {
  if (!E(t))
    return {
      success: !1,
      error: "ERR_INVALID_URL",
      message: "URL CDN không hợp lệ hoặc không an toàn"
    };
  try {
    const e = await chrome.tabs.create({ url: t });
    return {
      success: !0,
      tabId: e == null ? void 0 : e.id,
      url: t
    };
  } catch (e) {
    return {
      success: !1,
      error: "TAB_CREATE_FAILED",
      message: e.message || "Không thể mở tab mới"
    };
  }
}
console.log("[X Video Tools] Background Service Worker (ESM) đã khởi động.");
chrome.runtime.onMessage.addListener((t, e, r) => {
  var a, o;
  const i = (t == null ? void 0 : t.action) || (t == null ? void 0 : t.type);
  if (i === "FETCH_SYNDICATION" || i === "XVT_FETCH_SYNDICATION") {
    const u = ((a = t.payload) == null ? void 0 : a.tweetId) || t.tweetId;
    return f(u, t.options).then((c) => r(c)).catch((c) => r({
      success: !1,
      error: "INTERNAL_ERROR",
      message: c.message || "Lỗi xử lý nội bộ Service Worker"
    })), !0;
  }
  if (i === "OPEN_CDN" || i === "OPEN_TAB" || i === "XVT_OPEN_TAB" || i === l.OPEN_CDN) {
    const u = ((o = t.payload) == null ? void 0 : o.url) || t.url;
    return I(u).then((c) => r(c)).catch((c) => r({
      success: !1,
      error: "INTERNAL_ERROR",
      message: c.message || "Lỗi xử lý mở tab mới"
    })), !0;
  }
  return i === l.GET_SETTINGS && r({ success: !0, data: { status: "Phase 3 Active" } }), !1;
});
