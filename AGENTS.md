# Hướng Dẫn Tổng Thể Dành Cho AI Agent (AGENTS.md)

Chào mừng AI Agent tham gia phát triển dự án **X Video Tools**. Tài liệu này đóng vai trò là "kim chỉ nam" quy định bối cảnh, kiến trúc, quy tắc phát triển và ranh giới trách nhiệm khi thực hiện các nhiệm vụ trong dự án.

---

## 1. Bối cảnh & Mục tiêu Sản phẩm

- **Tên dự án:** X Video Tools.
- **Loại ứng dụng:** Chrome Extension chuẩn Manifest V3.
- **Mục tiêu:** Cung cấp trải nghiệm tải video trực quan trên nền tảng X (Twitter) qua thanh công cụ nổi 3 nút (Đóng/Ẩn, Tải thẳng qua Cobalt API, Mở CDN).
- **Repository tham chiếu:** `./cobalt/` (đã được clone tại thư mục gốc, phiên bản Cobalt API v11.7.1).

---

## 2. Nguyên tắc Phát triển Bắt buộc (Non-Negotiable Rules)

1. **Bảo tồn Repository `./cobalt/`:**
   - Tuyệt đối **KHÔNG** chỉnh sửa, xóa hoặc thêm bất kỳ file nào bên trong thư mục `./cobalt/`.
   - Tuyệt đối **KHÔNG** đóng gói toàn bộ thư mục `./cobalt/` vào bundle của extension.
   - Thư mục `./cobalt/` là một git repository độc lập và phải luôn được giữ ở trạng thái sạch (`clean working tree`).
2. **Tuân thủ Chuẩn Manifest V3 & Least-Privilege:**
   - Chỉ sử dụng các quyền cần thiết: `permissions: ["storage", "downloads"]`.
   - `host_permissions` chỉ gồm `*://twitter.com/*`, `*://x.com/*`, và `*://cdn.syndication.twimg.com/*`.
   - Các Cobalt instance URL do người dùng tự cấu hình phải được xin quyền động thông qua `optional_host_permissions` và `chrome.permissions.request`.
   - Không sử dụng `eval()`, không nạp remote script, không inline script/event handler trong HTML.
3. **Kiến trúc Headless API:**
   - Tận dụng Cobalt hoàn toàn qua HTTP REST API (`POST /`, `GET /`).
   - Không sao chép hay tái sử dụng mã nguồn backend của Cobalt vào extension (vì backend Cobalt sử dụng Node.js, Express, FFmpeg binary, isolated-vm).
4. **Độc lập của Tính năng CDN Resolver:**
   - Tính năng "Mở CDN" là module độc lập 100% với Cobalt. Sử dụng DOM trực tiếp hoặc Twitter Syndication API (`cdn.syndication.twimg.com`).

---

## 3. Quy định Phạm vi Theo Phase (Strict Scope Control)

Quá trình phát triển được chia thành 7 Phase chặt chẽ. Mỗi Agent khi nhận nhiệm vụ **CHỈ ĐƯỢC PHÉP** thực hiện đúng phạm vi của Phase được giao:

- **Phase 0 – Project Initialization:** Khởi tạo cấu trúc thư mục, Manifest V3, cấu hình Vite/Vitest, tài liệu dự án, bộ icon, scaffold rỗng. **Nghiêm cấm viết code logic của Phase 1+.**
- **Phase 1 – Video Detection:** Xác định bài viết X, trích xuất permalink, quản lý MutationObserver và định danh per-video.
- **Phase 2 – Floating Toolbar UI:** Xây dựng giao diện thanh công cụ nổi 3 nút, hiệu ứng hover, vị trí neo.
- **Phase 3 – CDN Resolver:** Trích xuất URL CDN chất lượng cao nhất (`video.twimg.com`) qua DOM hoặc Syndication API và mở tab mới.
- **Phase 4 – Cobalt Integration:** Tích hợp Cobalt API Client (v11.7.1), quản lý `chrome.downloads`, xử lý lỗi và rate limit.
- **Phase 5 – Settings & UX:** Xây dựng Settings Popup, Health Check kiểm tra instance, thông báo trạng thái.
- **Phase 6 – Testing & Release:** Kiểm thử toàn diện trên các kịch bản thực tế, hoàn thiện tài liệu phát hành.

---

## 4. Quy trình Triển khai và Nghiệm thu của Agent

Mỗi khi Agent nhận một Task hoặc Phase:
1. **Khảo sát & Lập Kế hoạch:** Đọc kỹ tài liệu kiến trúc tại `docs/ARCHITECTURE.md` và quy tắc tại `.agent/rules/project-rules.md`.
2. **Thực thi trong Phạm vi:** Chỉ tạo/chỉnh sửa các tệp nằm trong phạm vi của Task.
3. **Kiểm tra Tự động:**
   - Chạy `npm run build` để xác nhận đóng gói thành công.
   - Chạy `npm run test` để đảm bảo toàn bộ unit test vượt qua.
   - Kiểm tra `git -C cobalt status` để đảm bảo repository Cobalt không bị ảnh hưởng.
4. **Báo cáo Kết quả Rõ ràng:** Cung cấp báo cáo ngắn gọn bao gồm danh sách file đã chỉnh sửa, kết quả test và tiêu chí nghiệm thu.
