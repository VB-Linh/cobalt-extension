# Kế Hoạch Triển Khai Hoàn Thiện Sau Final Technical Review: X Video Tools (Phase 0)

## 1. Goal Description

Dự án **X Video Tools** là một Chrome Extension cá nhân theo chuẩn Manifest V3, nhằm tối ưu hóa trải nghiệm truy xuất và tải video từ nền tảng X (Twitter). Tiện ích giúp người dùng loại bỏ hoàn toàn quy trình 6 bước thủ công khi sử dụng website Cobalt truyền thống, mang lại trải nghiệm **1 cú nhấp chuột trực tiếp trên giao diện X**:

1. **Tải xuống (Direct Download):** Tự động trích xuất permalink của bài viết X, gửi đến Cobalt API instance v11.7.1, tiếp nhận phản hồi (`redirect`, `tunnel`, `picker`) và kích hoạt tải xuống bằng Chrome Downloads API.
2. **Mở CDN (Open CDN Resolver - Yêu cầu bắt buộc):** Module độc lập 100% với Cobalt:
   - **Điều kiện URL đầu ra:** Bắt buộc là URL HTTPS trực tiếp thuộc `video.twimg.com` (ví dụ `https://video.twimg.com/...`). Không bắt buộc chứa `/amplify_video/`, chấp nhận mọi đường dẫn CDN của X (`/tweet_video/`, `/ext_tw_video/`, v.v.). Tuyệt đối không chấp nhận `blob:`, URL tweet hay URL Cobalt trung gian.
   - **Ưu tiên chất lượng cao nhất:** Luôn ưu tiên độ phân giải cao nhất ($width \times height$), nếu cùng độ phân giải thì ưu tiên bitrate cao hơn. Hỗ trợ 1440p, 4K nếu có, không tự động hạ xuống 1080p và không tự suy đoán các biến thể không có thật.
   - **Bảo toàn tham số:** Giữ nguyên 100% query parameters gốc (`tag`, token, chữ ký).
   - **Thứ tự nguồn:** 1. DOM `video.src`/`source.src` -> 2. Fallback Twitter Syndication API -> 3. Lọc max quality MP4 -> 4. Dự phòng HLS `.m3u8` (thông báo rõ) -> 5. Báo lỗi rõ ràng nếu bị giới hạn hoặc rate-limit.
3. **Thanh công cụ nổi (Floating Toolbar UX):** Thiết kế nhỏ gọn dạng viên thuốc (Pill shape, cao 32px), đặt ở góc trên bên trái trình phát video, tích hợp cơ chế **Hover Bridge (độ trễ an toàn 300ms)** chống tắt đột ngột khi rê chuột, phân cấp thị giác rõ ràng và không che khuất thanh điều khiển gốc của X.

### Giới hạn phạm vi nghiêm ngặt của Phase 0 (Project Initialization)
Giai đoạn này **CHỈ GIỚI HẠN** trong việc thiết lập nền tảng dự án:
- Khởi tạo cấu trúc thư mục phát triển chuẩn.
- Thiết lập tệp Manifest V3 hợp lệ với quyền hạn tối thiểu (Least-Privilege).
- Cấu hình công cụ build Vite và test runner Vitest.
- Xây dựng hệ thống tài liệu dự án đầy đủ (`AGENTS.md`, `.agent/rules/project-rules.md`, `IMPLEMENTATION_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/UX_SPEC.md`).
- Tạo bộ icon kích thước chuẩn tại thư mục nguồn `assets/icons/` (16, 48, 128px) và xuất ra `dist/icons/`.
- Tạo Content Script và Background Service Worker dạng **scaffold tối thiểu** (chỉ chứa entrypoint và log khởi tạo).
- Tạo popup giao diện placeholder để kiểm tra nạp extension.
- Kiểm tra quá trình build ra thư mục `dist/` theo 7 tiêu chí kiểm chứng cụ thể và khả năng nạp vào Chrome qua *Developer Mode -> Load unpacked*.

> [!CAUTION]
> **Các tính năng NGHIÊM CẤM triển khai trong Phase 0:**
> - KHÔNG viết mã nguồn logic nghiệp vụ cho Cobalt API Client.
> - KHÔNG viết mã nguồn logic nghiệp vụ cho CDN Resolver.
> - KHÔNG viết mã nguồn logic nghiệp vụ cho Download Manager.
> - KHÔNG viết thuật toán Video Detection trên DOM của X.
> - KHÔNG dựng MutationObserver hoàn chỉnh.
> Tất cả các module nghiệp vụ trên chỉ được mô tả trong tài liệu kiến trúc, đặc tả UX và kế hoạch các Phase tương lai.

---

## 2. Kết Quả Xác Minh Kỹ Thuật Sau Final Review

### 2.1. Cơ chế URL `/video/:index` và Ánh xạ DOM
- **Xác minh từ mã nguồn Cobalt v11.7.1:** `cobalt/api/src/processing/match.js` chuyển đổi `patternMatch.index - 1` (1-based index). Mảng `media` nội bộ của Cobalt phản ánh mảng `extended_entities.media` của Twitter (bao gồm cả ảnh và video).
- **Quyết định kỹ thuật:**
  - Với tweet đơn video (>95% các trường hợp): Dùng canonical permalink chuẩn `https://x.com/user/status/${tweetId}`.
  - Với bài đăng đa media: Quét tìm thẻ neo `<a>` có chứa URL `/video/:index` hoặc `/photo/:index` chính thức của X. Nếu không tìm thấy, gửi canonical permalink gốc; nếu Cobalt trả về `status: "picker"`, hiển thị mini-picker để người dùng chọn, **tuyệt đối không tự đoán index từ thứ tự DOM**.

### 2.2. Khả năng Tương thích của Cobalt Response với `chrome.downloads`
- **`status: "redirect"`:** URL CDN trực tiếp (`video.twimg.com`). Tải xuống 100% tương thích.
- **`status: "tunnel"`:** URL dạng `https://<instance>/tunnel?id=...&exp=...&sig=...`. Đây là signed URL tự chứa token và thời hạn `exp`, không yêu cầu header Authorization. Tải xuống 100% tương thích qua `chrome.downloads.download({ url, filename })`.
- **`status: "picker"`:** Không chứa URL tệp đơn lẻ; extension xử lý chọn media trước khi gọi API tải.
- **`status: "error"`:** Map mã lỗi tiếng Việt kèm nút Thử lại.

### 2.3. Health Check Sạch & Xác thực API Key
- **Endpoint duy nhất:** `GET /` trả về HTTP 200, thông tin phiên bản `response.cobalt.version` và danh sách dịch vụ hỗ trợ `services` (phải có `"twitter"`).
- **Loại bỏ dummy request:** Tuyệt đối không gửi request rác `{"url": "https://x.com"}` để kiểm tra key. API Key được lưu trong storage và kiểm tra trực tiếp khi người dùng thực hiện tải thật, bắt mã lỗi `error.api.auth.key.*` để thông báo.

### 2.4. CDN Resolver Độc lập & Yêu Cầu Bắt Buộc
- **URL hợp lệ:** Bắt buộc HTTPS thuộc `video.twimg.com`.
- **Chất lượng cao nhất:** Thuật toán so sánh độ phân giải (diện tích pixel) trước, bitrate sau. Không giới hạn ở 1080p, hỗ trợ 1440p, 4K nếu X cung cấp.
- **Bảo toàn query parameters:** Giữ nguyên 100% các tham số (`tag`, token, signature).
- **Nguồn:** DOM -> Fallback Syndication API -> Fallback HLS (thông báo rõ) -> Báo lỗi.

### 2.5. Hoàn Thiện UX
- Toolbar cao 32px, bo góc tròn, kính mờ tối màu, neo góc trên bên trái (`top: 10px; left: 10px;`).
- Phân cấp thị giác: Tải video (Primary), Mở CDN (Secondary), Đóng/Ẩn (Utility).
- Hover Bridge với vùng đệm 6px và độ trễ an toàn **300ms (Grace Period)**.
- Quản lý trạng thái Per-video `${tweetId}_media_${mediaIndex}` với 3 lớp trong phiên tab.

---

## 3. Verification Plan

### 3.1. Automated Verification (Kiểm tra tự động Phase 0)
1. `node scripts/generate-icons.js`: Tạo 3 icon `icon-{16,48,128}.png` trong `assets/icons/`.
2. `npm run build`: Tạo thư mục `dist/` thỏa mãn 7 tiêu chí kiểm chứng:
   - Tồn tại `dist/manifest.json`.
   - Tồn tại `dist/icons/` đầy đủ 3 icon.
   - Tồn tại `dist/service-worker.js` (dạng ESM).
   - Tồn tại `dist/content.js` độc lập (**kiểm tra nội dung: không chứa import chunk ngoài**).
   - Tồn tại `dist/popup.html`.
3. `npm run test`: Chạy thành công smoke test Vitest cho storage helper và constants.
4. `git -C cobalt status`: Xác nhận repository `./cobalt/` hoàn toàn sạch (clean working tree).

### 3.2. Manual Verification
1. Mở `chrome://extensions` -> Bật Developer Mode -> Load unpacked thư mục `dist/`.
2. Xác nhận Extension nạp thành công, không có nút đỏ "Errors", icon hiển thị sắc nét.
3. Nhấp vào icon mở Popup kiểm tra giao diện placeholder.
4. Mở `x.com` kiểm tra log console từ `content.js`.
