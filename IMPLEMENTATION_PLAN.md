# Kế hoạch Triển khai Dự án: X Video Tools (Implementation Plan)

---

## 1. Mục Tiêu Dự Án & Định Hướng Tối Ưu Hóa

**X Video Tools** là một Chrome Extension cá nhân nhằm loại bỏ hoàn toàn quy trình 6 bước thủ công khi tải video qua website Cobalt (Copy link -> Mở web Cobalt -> Dán link -> Chờ xử lý -> Xem kết quả -> Tải xuống). 

Mục tiêu cốt lõi:
- Mang lại trải nghiệm **1 cú nhấp chuột trực tiếp ngay trên trang X** (Twitter).
- Cung cấp thanh công cụ nổi (**Floating Toolbar**) nhỏ gọn, mượt mà, phân cấp thị giác rõ ràng, không che khuất trình điều khiển video gốc.
- Hai tính năng trọng tâm:
  1. **Tải xuống (Direct Download):** Gọi Cobalt API v11.7.1, tải video qua `chrome.downloads`.
  2. **Mở CDN (Open CDN):** Module độc lập 100% với Cobalt, trích xuất URL HTTPS thuộc `video.twimg.com` có chất lượng cao nhất, bảo toàn đầy đủ query parameters gốc.

---

## 2. Lộ Trình Triển Khai 7 Phase (Roadmap)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 0 – Project Initialization (Cấu trúc, Manifest V3, Vite, Icons)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 1 – Video Detection & State (Nhận diện video, tweet ID, DOM link) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2 – Floating Toolbar UI (Hover Bridge, 3 nút, Feedback States)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 3 – Independent CDN Resolver (video.twimg.com, Max Quality, Params)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 4 – Cobalt Integration (POST /, Strict Schema, chrome.downloads) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 5 – Settings, Health Check & UX (Popup, Xin quyền host, GET /)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 6 – Testing & Release (14 Kịch bản kiểm thử thực tế, Đóng gói)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Kế Hoạch Chi Tiết Từng Phase

### Phase 0 – Project Initialization
> **Phạm vi nghiêm ngặt:** Chỉ khởi tạo cấu trúc, config, tài liệu, icon và scaffold tối thiểu. Không viết code nghiệp vụ.

- **Task P0-1: Cấu hình Dự án & Dependencies**
  - Tạo `package.json` (`vite`, `vitest`, `@types/chrome`).
  - Tạo `.gitignore` (bỏ qua `node_modules/`, `dist/`, `.vite/`, và `cobalt/`).
  - Tạo `manifest.json` chuẩn MV3 Least-Privilege:
    - `permissions`: `["storage", "downloads"]` (không xin `"tabs"`).
    - `host_permissions`: `["*://twitter.com/*", "*://x.com/*", "*://cdn.syndication.twimg.com/*"]`.
    - `optional_host_permissions`: `["http://*/*", "https://*/*"]`.
- **Task P0-2: Thiết lập Vite & Vitest**
  - Cấu hình Rollup Multi-Entry đảm bảo `dist/content.js` là file độc lập duy nhất, không có shared chunks hay external dynamic imports.
  - Xuất `dist/service-worker.js` (ESM) và `dist/popup.html`.
  - Cấu hình Vitest với mock environment.
- **Task P0-3: Bộ Icon Chuẩn**
  - Viết `scripts/generate-icons.js` tạo `assets/icons/icon-16.png`, `icon-48.png`, `icon-128.png`.
- **Task P0-4: Scaffold Mã Nguồn Tối Thiểu**
  - Tạo entrypoint rỗng cho `src/content/index.js`, `src/background/service-worker.js`, `src/popup/*`, `src/shared/*`.
- **Task P0-5: Kiểm Chứng Build & Nạp vào Chrome**
  - Kiểm tra 7 tiêu chí nghiệm thu của thư mục `dist/` và Load unpacked vào Chrome Developer Mode.

---

### Phase 1 – Video Detection & Per-Video State Management
- **Task P1-1: Nhận Diện Phần Tử Video & Bài Đăng**
  - Bắt các phần tử `<video>` trên viewport trong dòng thời gian và trang chi tiết tweet (`article[data-testid="tweet"]`).
- **Task P1-2: Trích Xuất Permalink & Xử lý URL**
  - Trích xuất canonical permalink (`/username/status/123456...`).
  - Quét thẻ neo `<a>` bao quanh video trên DOM để tìm URL chính thức có `/video/:index` nếu có. Nếu không có, sử dụng canonical permalink chuẩn.
- **Task P1-3: Bộ Quản Lý Trạng Thái Per-Video (3 Lớp Trong Phiên)**
  - Quản lý khóa định danh `${tweetId}_media_${mediaIndex}`.
  - Sử dụng DOM `dataset.xvtDismissed`, `WeakSet<Element>` và tab session `Set<string>` để kiểm soát việc ẩn toolbar.
- **Task P1-4: DOM MutationObserver Tối Ưu**
  - Theo dõi lazy load và infinite scroll, áp dụng debounce và batching với `requestAnimationFrame`. Bỏ qua các video đã bị ẩn.

---

### Phase 2 – Floating Toolbar UI & UX Mechanics
- **Task P2-1: Thiết Kế Giao Diện Toolbar (Pill Shape)**
  - Thiết kế theo [docs/UX_SPEC.md](file:///d:/repo/cobalt%20tools%20extension/docs/UX_SPEC.md): kích thước 32px, bo tròn, kính mờ tối màu, định vị góc trên bên trái (`top: 10px; left: 10px;`).
  - Phân cấp thị giác: Nút Tải video (Primary), Mở CDN (Secondary), Đóng/Ẩn (Utility).
- **Task P2-2: Cơ Chế Hover Bridge & Anti-Flicker**
  - Thiết lập vùng đệm tương tác (`padding: 6px;`).
  - Áp dụng độ trễ **300ms (Grace Period)** khi chuột rời video, cho phép di chuyển mượt mà từ video sang toolbar mà không bị tắt toolbar đột ngột.
- **Task P2-3: Xử Lý Trạng Thái Phản Hồi (Feedback States)**
  - Hiển thị spinner khi đang tải, tích xanh khi hoàn tất, icon đỏ kèm nút Thử lại khi gặp lỗi.
- **Task P2-4: Tương Tác Nút Đóng / Ẩn**
  - Nhấp "Đóng / Ẩn" sẽ làm mờ dần toolbar, đánh dấu cờ dismissed và ngăn chặn phục hồi toolbar trong suốt phiên duyệt.

---

### Phase 3 – Independent CDN Resolver (Yêu Cầu Bắt Buộc)
- **Task P3-1: Quét Nhanh URL MP4 Trực Tiếp Trên DOM**
  - Kiểm tra `video.src` và `source.src`. Nếu là URL hợp lệ có hostname `video.twimg.com` và giao thức `https:`, sử dụng ngay URL này.
- **Task P3-2: Fallback Qua Twitter Syndication API**
  - Khi DOM chỉ chứa `blob:` hoặc dữ liệu MSE, Background Service Worker gọi:
    `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=${calcToken(tweetId)}`
- **Task P3-3: Thuật Toán Lựa Chọn Chất Lượng Video Cao Nhất**
  - Lọc mảng `video_info.variants` chỉ lấy biến thể `video/mp4` thuộc `https://video.twimg.com/...`.
  - So sánh độ phân giải (pixel count $width \times height$) trước; nếu bằng nhau hoặc không có thì so sánh `bitrate`. Ưu tiên 1440p, 4K nếu có, không tự hạ xuống 1080p.
  - Tuyệt đối không tự suy đoán hoặc ghép URL cho các mức chất lượng không tồn tại trong API.
- **Task P3-4: Bảo Toàn Toàn Bộ Query Parameters Gốc**
  - Giữ nguyên toàn bộ query string (`?tag=...`, token, signature) từ URL gốc, không tự ý xóa hay chuẩn hóa.
- **Task P3-5: Mở Tab & Xử Lý Lỗi Rõ Ràng**
  - Mở tab mới qua `chrome.tabs.create({ url: cdnUrl })`.
  - Nếu chỉ có HLS `.m3u8`: mở playlist và thông báo rõ cho người dùng.
  - Nếu lỗi (bị giới hạn, rate limit 429, không có video): hiển thị thông báo lỗi, tuyệt đối không chuyển hướng sang URL Cobalt hay URL bài viết X.

---

### Phase 4 – Cobalt API Integration (v11.7.1)
- **Task P4-1: Cobalt API Client Chuẩn Hóa**
  - Gửi `POST /` với strict schema: `url`, `videoQuality`, `alwaysProxy: false`, `localProcessing: "disabled"`.
  - Truyền header `Authorization: Api-Key <token>` khi có cấu hình.
- **Task P4-2: Xử Lý Đầy Đủ Phản Hồi Cobalt v11.7.1**
  - `status: "redirect"`: Tải trực tiếp qua URL CDN của X.
  - `status: "tunnel"`: Tải qua URL proxy tunnel của instance (gọi ngay qua `chrome.downloads` trước khi hết hạn `exp`).
  - `status: "picker"`: Xử lý danh sách nhiều media (hiển thị mini-picker).
  - `status: "error"`: Bắt mã lỗi, hiển thị thông báo tiếng Việt kèm nút Thử lại.
- **Task P4-3: Tích Hợp Download Manager**
  - Khởi tạo tải tệp qua `chrome.downloads.download()`, xử lý đặt tên tệp sạch (`twitter_[id].mp4`).

---

### Phase 5 – Settings, Health Check & UX
- **Task P5-1: Giao Diện Settings Popup**
  - Input Cobalt Instance URL (mặc định để trống), API Key, lựa chọn chất lượng video.
- **Task P5-2: Quy Trình Xin Quyền Host Động**
  - Kích hoạt `chrome.permissions.request({ origins: [instanceOrigin] })` khi người dùng lưu URL.
- **Task P5-3: Giao Thức Health Check Sạch**
  - Gửi `GET /` kiểm tra phiên bản và dịch vụ `twitter`.
  - Bắt lỗi xác thực API Key trong request thật để cảnh báo người dùng.

---

### Phase 6 – Testing & Release
- **Task P6-1: Thực Thi Ma Trận Kiểm Thử Thực Tế (14 Kịch Bản)**
  - Thực thi toàn diện các kịch bản bao gồm cả bài đăng đa media, tweet trích dẫn và nội dung nhạy cảm.
- **Task P6-2: Tối Ưu Hiệu Năng & Rà Soát Bảo Mật**
  - Rà soát memory leak với `WeakSet`, kiểm tra CSP.
- **Task P6-3: Đóng Gói Bản Phát Hành & Tài Liệu README**

---

## 4. Ma Trận Kịch Bản Kiểm Thử Thực Tế (Live Test Matrix)

| STT | Kịch bản kiểm thử | Mô tả chi tiết | Cấp độ | Tiêu chí nghiệm thu |
|:---:|:---|:---|:---:|:---|
| 1 | **Video trong Timeline chính** | Rê chuột qua video khi lướt feed trang chủ (`x.com/home`). | Manual Live | Toolbar xuất hiện đúng góc trên bên trái; rê chuột ra ngoài thì ẩn; không làm lệch layout tweet. |
| 2 | **Cầu nối Hover (Hover Bridge)** | Di chuyển con trỏ từ video sang toolbar qua khoảng đệm. | Manual Live | Toolbar duy trì hiển thị ổn định trong thời gian grace period 300ms, không bị tắt giật. |
| 3 | **Video trong trang chi tiết Tweet** | Truy cập trực tiếp link permalink (`x.com/[user]/status/[id]`). | Manual Live | Toolbar nhận diện chính xác video trong tweet chính; trích xuất đúng permalink bài viết. |
| 4 | **DOM tải động (Infinite Scroll)** | Cuộn chuột liên tục để nạp thêm các tweet và video mới. | Manual Live | `MutationObserver` phát hiện video mới mà không gây giật lag (batching qua rAF); không gắn đúp toolbar vào video cũ. |
| 5 | **Nhiều video cùng hiển thị** | Màn hình hiển thị 2-3 tweet video cùng lúc. | Manual Live | Trạng thái từng video độc lập hoàn toàn; thao tác tải video A không làm thay đổi trạng thái video B. |
| 6 | **Đóng / Ẩn toolbar trên video** | Nhấp nút "Đóng / Ẩn" trên video 1. | Manual Live | Toolbar video 1 bị ẩn; video 2 vẫn có toolbar bình thường; khi cuộn trang lên xuống rồi quay lại video 1, toolbar **không được tự động hiện lại**. |
| 7 | **Tweet chứa nhiều video (Grid)** | Tweet chứa 2-4 video kết hợp. | Manual Live | Nhận diện đúng từng phần tử video con; nếu có link anchor chính thức thì tải đúng video, nếu không thì hiển thị picker để chọn. |
| 8 | **Tweet hỗn hợp (1 ảnh + 1 video)** | Tweet chứa 1 ảnh và 1 video. | Manual Live | Extension không bị nhầm lẫn index; tải đúng phần tử video thay vì tải ảnh. |
| 9 | **Tweet trích dẫn (Quoted Tweet)** | Tweet A trích dẫn tweet B chứa video. | Manual Live | Nhận diện đúng tweet B chứa video và trích xuất permalink của tweet B thay vì tweet A. |
| 10 | **Video dạng HLS stream (CDN Resolver)** | Video X sử dụng MSE / HLS (`blob:https://x.com/...`). | Integration / Live | Background truy vấn Syndication API, chọn URL MP4 có độ phân giải/bitrate cao nhất thuộc `https://video.twimg.com/...`, bảo toàn query parameters và mở tab mới. |
| 11 | **Video dạng MP4 trực tiếp (CDN Resolver)** | Video ngắn hoặc Twitter GIF có thẻ `<video src="https://video.twimg.com/...mp4">`. | Integration / Live | CDN Resolver trích xuất được link MP4 trực tiếp ngay từ DOM, bảo toàn query parameters và mở tab mới thành công. |
| 12 | **Cobalt Instance Offline / Lỗi Mạng** | Cấu hình Cobalt URL không thể kết nối hoặc server sập. | Integration / Unit | Nút tải chuyển sang icon chấm than đỏ kèm tooltip lỗi rõ ràng; người dùng có thể nhấp để thử lại. |
| 13 | **Cobalt API Rate Limit (HTTP 429)** | Gửi yêu cầu vượt quá giới hạn của instance. | Integration / Unit | Nhận diện mã lỗi `429` và headers `RateLimit-*`; hiển thị thông báo giới hạn lượt tải trên toolbar. |
| 14 | **Tweet giới hạn độ tuổi (NSFW / 403)** | Video trong tweet gắn cờ nhạy cảm không đăng nhập. | Manual Live | Syndication API trả về 403; extension hiển thị thông báo lỗi rõ ràng trên toolbar, không mở tab URL hỏng. |
