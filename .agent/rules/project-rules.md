# Quy chuẩn Kỹ thuật Dự án: X Video Tools

Tài liệu này định nghĩa các quy tắc kỹ thuật bắt buộc áp dụng cho toàn bộ quá trình phát triển mã nguồn tiện ích **X Video Tools**.

---

## 1. Quy chuẩn Phân chia Module & Ranh giới Trách nhiệm

1. **Content Script (`src/content/`):**
   - **Chỉ làm việc trong ngữ cảnh trang web X:** Phát hiện DOM video, lấy canonical tweet permalink, thu thập thông tin media hiển thị trên DOM.
   - **Tuyệt đối KHÔNG gọi trực tiếp Cobalt API:** Mọi request ngoại vi phải ủy quyền qua Background Service Worker thông qua Message Passing.
   - **Cô lập giao diện:** Thanh công cụ nổi (Floating Toolbar) phải được cô lập style bằng scoped class hoặc Shadow DOM để không gây xung đột với layout của Twitter.
   - **Bảo vệ DOM:** Không can thiệp, sửa đổi cấu trúc DOM gốc của X gây lỗi ứng dụng React của trang web.

2. **Background Service Worker (`src/background/`):**
   - **Đóng vai trò điều phối trung tâm:** Gọi Cobalt API, quản lý `chrome.downloads`, xử lý mở tab CDN.
   - **Không lưu trạng thái toàn cục trong bộ nhớ biến:** Service Worker trong Manifest V3 là ephemeral (tự hủy sau ~30 giây không hoạt động). Trạng thái bắt buộc phải lưu trữ qua `chrome.storage.local`.
   - **Không giả định quyền truy cập DOM:** Không được giả định Service Worker có thể tự đọc các `blob:` URL tạo bởi Media Source Extensions trên trang web.

---

## 2. Quy chuẩn Quyền hạn & Bảo mật (Manifest V3 Least-Privilege)

1. **Quyền API (`permissions`):**
   - Chỉ khai báo: `["storage", "downloads"]`.
   - **Không khai báo quyền `"tabs"`** trừ khi có yêu cầu nghiệp vụ bắt buộc phải đọc `tab.url` hoặc `tab.title`. Thao tác mở tab mới `chrome.tabs.create({ url })` hoàn toàn không cần quyền `tabs`.

2. **Quyền Host Cố định (`host_permissions`):**
   - Chỉ khai báo các domain thiết yếu:
     - `*://twitter.com/*`
     - `*://x.com/*`
     - `*://cdn.syndication.twimg.com/*` (Phục vụ truy vấn metadata CDN độc lập)
   - **Tuyệt đối cấm sử dụng mặc định `http://*/*` hoặc `https://*/*` trong `host_permissions`.**

3. **Quyền Host Động (`optional_host_permissions`):**
   - Khai báo `["http://*/*", "https://*/*"]`.
   - Chỉ được kích hoạt thông qua `chrome.permissions.request({ origins: [instanceOrigin] })` khi người dùng nhập Cobalt API instance URL trong Popup.
   - Luôn kiểm tra quyền bằng `chrome.permissions.contains()` trước khi thực hiện request đến Cobalt instance.

---

## 3. Quy chuẩn Quản lý Trạng thái Từng Video (Per-Video State)

1. **Khóa định danh video:** Bắt buộc sử dụng format `${tweetId}_media_${mediaIndex}` để phân biệt từng video ngay cả khi trong cùng một bài đăng có nhiều media.
2. **Nút "Đóng / Ẩn":**
   - Chỉ áp dụng trên đúng video được bấm.
   - Gán `dataset.xvtDismissed = "true"` trên DOM wrapper.
   - Lưu trữ phần tử vào `WeakSet` và lưu khóa chuỗi vào `Set` của phiên tab hiện tại.
   - `MutationObserver` bắt buộc phải kiểm tra cờ này trước khi xem xét gắn toolbar. Tuyệt đối không để toolbar tự động hiện lại khi người dùng cuộn feed.

---

## 4. Quy tắc Giao tiếp Giữa Content Script và Background (Message Passing)

1. **Cấu trúc Message:**
   Mọi tin nhắn gửi qua `chrome.runtime.sendMessage` phải tuân theo cấu trúc chuẩn:
   ```typescript
   interface ExtensionMessage<T = unknown> {
     action: string;
     payload: T;
   }
   ```
2. **Cấu trúc Response:**
   ```typescript
   interface ExtensionResponse<T = unknown> {
     success: boolean;
     data?: T;
     error?: {
       code: string;
       message: string;
     };
   }
   ```
3. **Async Listener:** Mọi listener `chrome.runtime.onMessage.addListener` có xử lý bất đồng bộ bắt buộc phải trả về `return true;` để giữ kênh kết nối mở.
4. **Không dùng `.then()` chaining:** Bắt buộc sử dụng `async / await` và khối `try / catch` nhất quán.

---

## 5. Quy chuẩn Tích hợp Cobalt API (v11.7.1)

1. **Không hard-code endpoint:** Giá trị mặc định `cobaltInstanceUrl` luôn là chuỗi rỗng `""`. Người dùng phải tự cấu hình.
2. **Strict Schema:** Request gửi lên `POST /` của Cobalt phải tuân thủ nghiêm ngặt schema của Cobalt (`schema.js` có cờ `.strict()`). Tuyệt đối không gửi thừa thuộc tính lạ gây lỗi HTTP 400.
3. **Format Authentication Header:** Khi có API Key, truyền theo đúng định dạng `Authorization: Api-Key <token>` (chữ K viết hoa).
4. **Xác thực Instance & Health Check:**
   - Dùng `GET ${baseUrl}/` để đọc `response.cobalt.version` và kiểm tra dịch vụ `"twitter"` trong `services`.
   - Dùng probe `POST ${baseUrl}/` với `{"url": "https://x.com"}` để kiểm tra tính hợp lệ của API Key mà không gây tải cho server.

---

## 6. Quy chuẩn Đóng gói (Build & Dependencies)

1. **Vite Output:**
   - Content script phải được bundle thành **một file duy nhất** `dist/content.js`. Không tạo dynamic chunk hoặc import bên ngoài.
   - Background service worker sử dụng native ES Module (`dist/service-worker.js`).
   - Popup xuất ra đúng `dist/popup.html`.
2. **Icons:**
   - Nguồn: `assets/icons/icon-16.png`, `icon-48.png`, `icon-128.png`.
   - Xuất ra: `dist/icons/`. Kích thước pixel phải khớp chính xác với khai báo.
3. **Cô lập Repository `./cobalt/`:**
   - Không đưa `./cobalt/` vào gói build extension.
   - Khai báo `cobalt/` trong `.gitignore` để không ảnh hưởng đến git tracking độc lập của repository Cobalt.
