# Kiến trúc Hệ thống: X Video Tools (Chrome Extension Manifest V3)

## 1. Tổng quan & Bối cảnh Sản phẩm

**X Video Tools** là một Chrome Extension cá nhân được xây dựng theo chuẩn Manifest V3, nhằm tối ưu hóa triệt để trải nghiệm truy xuất và tải video từ nền tảng X (Twitter).

### Vấn đề cần giải quyết:
Quy trình tải video thủ công thông thường qua website Cobalt gồm 6 bước rườm rà:
1. Sao chép liên kết tweet trên X.
2. Mở tab truy cập website Cobalt.
3. Dán liên kết.
4. Chờ Cobalt phân tích.
5. Truy cập giao diện kết quả.
6. Nhấp tải tệp xuống.

### Giải pháp của X Video Tools:
Tích hợp quy trình này trực tiếp vào dòng thời gian X thông qua một **thanh công cụ nổi (Floating Toolbar)** thông minh gắn trên trình phát video, giảm tối đa thao tác thủ công thành **chỉ 1 cú nhấp chuột ngay trên trang X**.

---

## 2. Hai Luồng Xử Lý Cốt Lõi

```
                                  [Video trên X]
                                        │
                         (Hover chuột vào video player)
                                        │
                             ┌──────────┴──────────┐
                             │   Floating Toolbar  │
                             └──────────┬──────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
       [Chức năng A: TẢI THẲNG]                      [Chức năng B: MỞ CDN]
                 │                                             │
      (Lấy Permalink bài viết)                       (Độc lập 100% với Cobalt)
                 │                                             │
      (Kiểm tra DOM anchor index)                   ┌──────────┴──────────┐
                 │                                  │                     │
                 ▼                                  ▼                     ▼
     (Background Service Worker)            (DOM Direct MP4)       (HLS blob: stream)
                 │                                  │                     │
                 ▼                                  │                     ▼
        [POST / Cobalt API]                         │            [Syndication API]
                 │                                  │                     │
     (Xử lý Response v11.7.1)                       │         (Lọc max resolution/bitrate)
                 │                                  │                     │
     ┌───────────┼───────────┐                      │                     │
     ▼           ▼           ▼                      │                     │
[redirect]   [tunnel]    [picker]                   │          (BẢO TOÀN QUERY PARAMS)
     │           │           │                      │                     │
     │           │           ▼                      │                     │
     │           │     (Mini-picker UI)             │                     │
     └─────┬─────┘           │                      │                     │
           │                 ▼                      │                     │
           ▼           [Chọn media]                 ▼                     ▼
[chrome.downloads API] ──────┘               [chrome.tabs.create: Mở Tab CDN Mới]
```

---

## 3. Phân Tích Chuyên Sâu Từng Chức Năng

### 3.1. Chức năng A: Tải Thẳng Qua Cobalt API (Direct Download)

Cobalt là bộ xử lý media chính, hoạt động như một Headless REST API. Extension đóng vai trò điều phối:

#### A. Trích xuất Permalink & Xử lý Bài đăng Đa Media:
- **Trường hợp chuẩn (Tweet đơn video):** Content Script trích xuất canonical permalink `https://x.com/user/status/${tweetId}`. Đây là trường hợp chiếm đa số (>95%).
- **Trường hợp bài đăng nhiều media (Grid/Carousel):**
  - Quét thẻ neo `<a>` bao quanh video trên DOM để tìm URL chính thức của Twitter có dạng `/video/:index` hoặc `/photo/:index`. Nếu tìm thấy, sử dụng URL chính thức này để Cobalt định tuyến đúng media (1-based index).
  - Nếu không tìm thấy index chính thức từ DOM, gửi canonical permalink gốc. Nếu Cobalt trả về `status: "picker"`, hiển thị mini-picker để người dùng chọn, **tuyệt đối không tự đoán index từ thứ tự DOM**.

#### B. Chuẩn hóa Request theo Strict Schema v11.7.1:
- Headers: `Accept: application/json`, `Content-Type: application/json`.
- Xác thực: Khi instance yêu cầu API key, truyền qua header: `Authorization: Api-Key <token>`.
- Request Body (chỉ chứa các trường hợp lệ, schema `.strict()`):
  ```json
  {
    "url": "https://x.com/user/status/1234567890",
    "videoQuality": "1080",
    "audioFormat": "mp3",
    "downloadMode": "auto",
    "alwaysProxy": false,
    "localProcessing": "disabled"
  }
  ```

#### C. Xử lý Toàn diện Response của Cobalt v11.7.1 với `chrome.downloads`:
- **`status: "redirect"`:** Cobalt trả về URL CDN trực tiếp (`https://video.twimg.com/...`). Extension gọi ngay `chrome.downloads.download({ url, filename })`.
- **`status: "tunnel"`:** Cobalt trả về URL stream proxy qua instance (`https://<instance>/tunnel?id=...&exp=...&sig=...`). Endpoint `/tunnel` là signed URL tự chứa token và hạn dùng `exp`, không đòi hỏi header auth, tải về 100% tương thích qua `chrome.downloads`.
- **`status: "picker"`:** Trả về danh sách `{ picker: [{ type, url, thumb }] }`. Extension hỗ trợ chọn nhanh video phù hợp để tải.
- **`status: "error"`:** Map mã lỗi Cobalt sang thông báo tiếng Việt trên Toolbar kèm nút **Thử lại (Retry)**.

---

### 3.2. Chức năng B: Mở CDN Độc Lập (Open CDN Resolver)

Chức năng Mở CDN hoạt động **độc lập 100% với Cobalt API**, không phụ thuộc vào việc Cobalt instance có đang chạy hay không.

#### A. Điều Kiện URL Đầu Ra Hợp Lệ:
- **Hostname bắt buộc:** Phải có hostname chính xác là `video.twimg.com` và sử dụng giao thức bảo mật `https:`.
- **Không giới hạn đường dẫn con:** URL hợp lệ miễn là thuộc `https://video.twimg.com/...` (chấp nhận `/amplify_video/`, `/tweet_video/`, `/ext_tw_video/`, v.v.; không ép buộc phải chứa `/amplify_video/`).
- **Từ chối tuyệt đối:** Không chấp nhận URL `blob:`, URL trang tweet (`x.com/...`), URL proxy của Cobalt (`/tunnel`) hoặc bất kỳ domain trung gian nào khác.
- **Hành động:** Khi trích xuất thành công, mở URL trong tab mới bằng `chrome.tabs.create({ url: cdnUrl })`.

#### B. Thuật Toán Lựa Chọn Chất Lượng Video Cao Nhất:
- **Ưu tiên độ phân giải cao nhất:** Trích xuất kích thước pixel ($width \times height$) từ URL của biến thể MP4. Phiên bản có diện tích pixel lớn hơn luôn được ưu tiên (hỗ trợ 1440p, 4K hoặc cao hơn nếu X cung cấp, **không tự động hạ xuống 1080p**).
- **Ưu tiên bitrate cao hơn nếu cùng độ phân giải:** Nếu hai biến thể có cùng độ phân giải (hoặc không trích xuất được kích thước từ URL), biến thể có trường `bitrate` lớn hơn sẽ được chọn.
- **Chỉ sử dụng biến thể thực tế:** Chỉ chọn từ danh sách variants thực sự tồn tại trong phản hồi của Twitter; tuyệt đối không tự suy đoán hoặc tự ghép URL cho các mức chất lượng không có thật.

```javascript
// Thuật toán chuẩn hóa lựa chọn chất lượng tối ưu
function selectHighestQualityMp4(variants) {
  const mp4Variants = variants.filter(v => 
    v.content_type === 'video/mp4' && 
    v.url && 
    isValidTwimgCdnUrl(v.url)
  );
  if (!mp4Variants.length) return null;

  return mp4Variants.reduce((best, current) => {
    const resBest = extractResolution(best.url);
    const resCurr = extractResolution(current.url);
    if (resCurr > resBest) return current;
    if (resCurr < resBest) return best;

    const bitrateBest = Number(best.bitrate || 0);
    const bitrateCurr = Number(current.bitrate || 0);
    return bitrateCurr > bitrateBest ? current : best;
  });
}

function isValidTwimgCdnUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:' && url.hostname === 'video.twimg.com';
  } catch {
    return false;
  }
}

function extractResolution(url) {
  const match = url.match(/\/(\d+)x(\d+)\//);
  return match ? Number(match[1]) * Number(match[2]) : 0;
}
```

#### C. Xử Lý URL và Bảo Toàn Query Parameters:
> [!IMPORTANT]
> **Giữ nguyên toàn bộ query parameters gốc:** Giữ nguyên các tham số như `?tag=14`, token, signature truy cập. Tuyệt đối không tự ý loại bỏ, thay đổi hay chuẩn hóa query string, và không ghép URL từ các thành phần suy đoán.

#### D. Thứ Tự Ưu Tiên Nguồn Dữ Liệu:
1. **Kiểm tra DOM trực tiếp:** Đọc `video.src` và `source.src` trên DOM. Nếu là URL MP4 hợp lệ từ `video.twimg.com`, sử dụng ngay.
2. **Fallback qua Twitter Syndication API:** Khi DOM chỉ chứa `blob:` hoặc dữ liệu MSE, Background Service Worker gọi:
   `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=${((Number(tweetId) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')}`
3. **Lọc và chọn chất lượng cao nhất:** Áp dụng hàm `selectHighestQualityMp4` trên mảng `mediaDetails[].video_info.variants`.
4. **Dự phòng HLS:** Nếu không tìm thấy biến thể MP4 nào nhưng có playlist HLS (`content_type === "application/x-mpegURL"`), mở URL `.m3u8` và thông báo rõ cho người dùng đây là playlist HLS, không phải MP4 trực tiếp.

#### E. Xử Lý Lỗi Rõ Ràng:
- Nếu tweet bị khóa, giới hạn độ tuổi (NSFW), API bị rate limit (HTTP 429) hoặc không tìm thấy video: Hiển thị tooltip/toast thông báo lỗi rõ ràng.
- Tuyệt đối không tự chuyển hướng sang URL Cobalt hay URL bài đăng X để giả lập việc mở CDN thành công.

---

## 4. Kiến Trúc UX & Cơ Chế "Hover Bridge"

Chi tiết đầy đủ tại [docs/UX_SPEC.md](file:///d:/repo/cobalt%20tools%20extension/docs/UX_SPEC.md):
1. **Vị trí & Phân cấp Trực quan:**
   - Góc trên bên trái trình phát video (`top: 10px; left: 10px;`).
   - Nút **Tải video (Cobalt)**: Nút chính (Primary), nổi bật.
   - Nút **Mở CDN**: Nút phụ (Secondary).
   - Nút **Đóng / Ẩn**: Nút tiện ích (Utility), mờ nhẹ để không gây phân tâm.
2. **Cầu Nối Hover (Hover Bridge):**
   - Vùng đệm tương tác (`padding: 6px;`).
   - Khi chuột rời video, hệ thống áp dụng độ trễ **300ms (Grace Period)** trước khi ẩn. Nếu chuột di chuyển vào toolbar trong 300ms này, toolbar duy trì hiển thị ổn định.
3. **Độc lập Trạng thái Từng Video (Per-Video State):**
   - Định danh: `${tweetId}_media_${mediaIndex}`.
   - Nút "Đóng / Ẩn" gán cờ `dataset.xvtDismissed = "true"` và lưu vào `Set` trong phiên duyệt. `MutationObserver` không bao giờ phục hồi toolbar trên video đã bị đóng.

---

## 5. Kiến Trúc Quyền Hạn (Manifest V3 Least-Privilege)

| Loại quyền | Khai báo | Phạm vi sử dụng |
|:---|:---|:---|
| **`permissions`** | `["storage", "downloads"]` | Lưu cài đặt và tải video. Không xin quyền `"tabs"` không cần thiết. |
| **`host_permissions`** *(Cố định)* | `"*://twitter.com/*"`, `"*://x.com/*"`, `"*://cdn.syndication.twimg.com/*"` | Inject Content Script và Background fetch dữ liệu CDN từ Syndication API. |
| **`optional_host_permissions`** *(Động)* | `["http://*/*", "https://*/*"]` | Dành riêng cho Cobalt instance do người dùng tự nhập. Xin quyền qua `chrome.permissions.request({ origins: [instanceOrigin] })`. |

---

## 6. Kiến Trúc Build & Đóng Gói (Vite + Rollup Multi-Entry)

1. **Content Script độc lập:** `src/content/index.js` compile thành file duy nhất `dist/content.js`, không sinh shared chunks hay dynamic imports từ bên ngoài.
2. **Service Worker ESM:** `src/background/service-worker.js` compile thành `dist/service-worker.js`.
3. **Popup HTML phẳng:** `src/popup/popup.html` xuất ra `dist/popup.html`.
4. **Icons:** Tệp nguồn đặt tại `assets/icons/`, xuất ra `dist/icons/`.
