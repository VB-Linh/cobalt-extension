# Đặc Tả Trải Nghiệm Người Dùng (UX Specification): X Video Tools

Tài liệu này quy định chi tiết về thiết kế giao diện, phân cấp thị giác, hành vi tương tác và trạng thái phản hồi của thanh công cụ nổi (**Floating Toolbar**) và các thành phần giao diện của tiện ích **X Video Tools**.

---

## 1. Triết Lý Thiết Kế & Mục Tiêu Trải Nghiệm

1. **Tối Giản Thao Tác (Frictionless):**
   - Loại bỏ hoàn toàn quy trình 6 bước thủ công khi tải qua web Cobalt (Copy link -> Mở tab Cobalt -> Dán link -> Chờ phân tích -> Mở trang kết quả -> Tải xuống).
   - Người dùng thực hiện tải xuống hoặc mở CDN ngay trên dòng thời gian X với **chỉ 1 cú nhấp chuột**.
2. **Không Gây Cản Trở (Non-Intrusive & Native Feel):**
   - Toolbar nhỏ gọn (dạng pill), sử dụng tông màu tối mờ (Dark glassmorphism) hài hòa với thiết kế gốc của X.
   - Tuyệt đối không che khuất thanh điều khiển video gốc của X (thanh tua, nút play/pause, thời lượng, âm lượng, cài đặt tốc độ, chế độ toàn màn hình).
3. **Phản Hồi Trực Quan & Rõ Ràng (Deterministic Feedback):**
   - Mọi thao tác đều có phản hồi trạng thái tức thì (đang gửi API, đang tải về máy, hoàn thành, hoặc thông báo lỗi kèm nút thử lại).

---

## 2. Vị Trí, Kích Thước & Bố Cục Toolbar (Positioning & Layout)

### 2.1. Vị trí Neo (Anchor Position)
- **Vị trí chuẩn:** Góc trên bên trái của vùng hiển thị video (`top: 10px; left: 10px; position: absolute;`).
- **Lý do lựa chọn:**
  - Cạnh dưới là nơi chứa toàn bộ thanh điều khiển player của X.
  - Góc dưới bên phải chứa menu bánh răng và điều chỉnh tốc độ.
  - Góc trên bên phải thường có nhãn quảng cáo ("Ad"), nút bookmark hoặc menu bài viết.
  - **Góc trên bên trái là vị trí an toàn và trống trải nhất trên video player của X.**
- **Z-Index:** Thiết lập `z-index: 9999;` (cao hơn video và lớp phủ click của X, nhưng thấp hơn modal phóng to toàn màn hình của trình duyệt).

### 2.2. Kích thước & Kiểu dáng (Styling Anatomy)
- **Hình khối:** Dạng viên thuốc thuôn gọn (**Pill shape**), bo góc tròn `border-radius: 9999px;`.
- **Kích thước:** Chiều cao cố định `height: 32px;`, khoảng đệm `padding: 2px 6px;`.
- **Màu sắc & Hiệu ứng:**
  - Nền: `background: rgba(15, 20, 25, 0.85);` kết hợp `backdrop-filter: blur(8px);` (hiệu ứng kính mờ tối màu chuẩn X Dark Theme).
  - Viền: `border: 1px solid rgba(255, 255, 255, 0.15);`.
  - Đổ bóng nhẹ: `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);`.
  - Icon: SVG kích thước `16x16 px`, màu trắng hoặc xám nhạt (`#E7E9EA`).

---

## 3. Phân Cấp Thị Giác & Cấu Trúc Các Nút Bấm (Visual Hierarchy)

Toolbar bao gồm 3 nút bấm được phân cấp rõ ràng theo mức độ ưu tiên sử dụng:

```
┌────────────────────────────────────────────────────────┐
│  [ ↓ Tải video ]   │   [ ↗ Mở CDN ]   │   [ ✕ ]       │
└────────────────────────────────────────────────────────┘
```

### 3.1. Nút "Tải video" (Primary Action - Hành động chính)
- **Mức độ ưu tiên:** Cao nhất (Primary).
- **Thiết kế thị giác:** Có nền nổi bật hơn (subtle accent background hoặc hover highlight màu xanh Cobalt `#1d9bf0`), chữ kèm icon tải xuống.
- **Label / Tooltip:** "Tải video (Cobalt)".
- **Hành vi khi nhấp:**
  1. Kiểm tra cấu hình: Nếu chưa nhập Cobalt Instance URL, hiển thị tooltip cảnh báo: *"Chưa cài đặt Cobalt URL. Bấm vào icon tiện ích để thiết lập."*
  2. Kích hoạt tải: Gửi permalink bài viết đến Background Service Worker.
  3. Đổi icon nút sang vòng xoay tải (**Loading Spinner**) với hiệu ứng xoay mượt mà.
  4. Khi Cobalt xử lý xong và `chrome.downloads` bắt đầu tải: Đổi icon sang dấu tích xanh (**Checkmark**) trong 2.5 giây.
  5. Nếu gặp lỗi: Chuyển sang icon chấm than đỏ kèm tooltip thông báo lỗi và cho phép nhấp lại để **Thử lại (Retry)**.

### 3.2. Nút "Mở CDN" (Secondary Action - Hành động phụ)
- **Mức độ ưu tiên:** Thứ hai (Secondary).
- **Thiết kế thị giác:** Dạng icon nút trong suốt/nhẹ nhàng, không lấn át nút chính.
- **Icon:** Mũi tên chéo thoát ra ngoài (`External Link`).
- **Label / Tooltip:** "Mở link CDN gốc".
- **Hành vi & Phản hồi khi nhấp:**
  1. **Điều kiện đầu ra:** Bắt buộc mở URL HTTPS thuộc `video.twimg.com`. Tuyệt đối không mở URL `blob:`, URL trang tweet hay URL Cobalt trung gian.
  2. **Chất lượng:** Tự động chọn biến thể có độ phân giải lớn nhất (hỗ trợ cả 1440p, 4K), nếu cùng độ phân giải thì ưu tiên bitrate cao hơn.
  3. **Tham số:** Bảo toàn 100% query parameters gốc.
  4. **Xử lý ngoại lệ:**
     - Nếu chỉ có HLS `.m3u8`: Mở playlist và hiển thị thông báo ngắn: *"Đang mở luồng HLS (.m3u8)"*.
     - Nếu lỗi (tweet bị khóa, NSFW, rate-limit): Hiển thị tooltip đỏ: *"Không tìm thấy URL CDN hợp lệ (Tweet bị giới hạn hoặc API bị chặn)"*. Không mở bất kỳ URL hỏng nào.
  5. *Tương tác mở rộng:* Nhấn `Shift + Click` sẽ tự động copy URL CDN vào Clipboard thay vì mở tab mới.

### 3.3. Nút "Đóng / Ẩn" (Utility Action - Tiện ích hỗ trợ)
- **Mức độ ưu tiên:** Thấp nhất (Utility/Tertiary).
- **Thiết kế thị giác:** Dấu nhân nhỏ (`✕`), màu xám nhạt mờ (`color: rgba(231, 233, 234, 0.6);`), được ngăn cách bởi một đường kẻ dọc mảnh (`1px solid rgba(255, 255, 255, 0.15)`).
- **Tooltip:** "Ẩn trên video này".
- **Hành vi khi nhấp:**
  1. Toolbar mờ dần và biến mất ngay lập tức (`opacity: 0; transition: opacity 0.15s ease;`).
  2. Gán thuộc tính `videoWrapper.dataset.xvtDismissed = "true"`.
  3. Thêm khóa `${tweetId}_media_${mediaIndex}` vào Session Set của tab hiện tại.
  4. Toolbar sẽ không bao giờ xuất hiện lại trên video này trong suốt phiên duyệt.

---

## 4. Cơ Chế Hover & "Cầu Nối Con Trỏ" (Hover Bridge & Anti-Flicker)

1. **Vùng Đệm Tương Tác (Hit-Box Padding):**
   - Toolbar được đặt trong một thẻ container cha có phần đệm vô hình (`padding: 6px;` hoặc pseudo-element `::before` phủ kín khoảng cách giữa mép video và các nút bấm).
   - Con trỏ chuột khi di chuyển qua vùng đệm này vẫn nằm trong sự kiện hover của hệ thống.
2. **Độ Trễ An Toàn Khi Rời Chuột (Grace Period / Leeway Delay):**
   - Khi sự kiện `mouseleave` được kích hoạt trên vùng video, hệ thống **không ẩn toolbar ngay lập tức**, mà khởi tạo một bộ đếm thời gian an toàn `300ms`.
   - Nếu trong `300ms` đó, con trỏ chuột đi vào toolbar (kích hoạt `mouseenter` trên toolbar), bộ đếm bị hủy bỏ và toolbar tiếp tục duy trì trạng thái hiển thị 100%.
   - Chỉ khi con trỏ rời khỏi cả video lẫn toolbar quá `300ms`, toolbar mới thực hiện hiệu ứng mờ dần (`fade-out 0.2s`).
3. **Chống Trùng Lặp Khi X Re-render (Idempotency):**
   - Mỗi video wrapper chỉ được gắn đúng một instance của toolbar element.
   - Thuộc tính `data-xvt-mounted="true"` được gán vào phần tử để `MutationObserver` tuyệt đối không bao giờ chèn đúp toolbar.

---

## 5. Bảng Trạng Thái & Xử Lý Ngoại Lệ (State Machine & Edge Cases)

| Trạng thái | Biểu hiện giao diện | Hành động tiếp theo |
|:---|:---|:---|
| **Idle (Chờ)** | Ẩn hoàn toàn khi không hover. | Khi chuột vào video -> Hiển thị dạng viên thuốc nhỏ gọn. |
| **Hovered (Rê chuột)** | Toolbar hiển thị rõ nét, nút Tải video nổi bật, nút Mở CDN và Đóng hiển thị tinh tế. | Sẵn sàng nhận lệnh Click từ người dùng. |
| **Processing (Đang tải)** | Nút tải chuyển thành spinner xoay tròn, tạm vô hiệu hóa click lặp lại. | Chờ phản hồi từ Cobalt API và Chrome Downloads API. |
| **Success (Thành công)** | Hiển thị icon tích xanh `✓` trong 2.5 giây. | Tự động quay về trạng thái Hovered bình thường. |
| **Error (Lỗi)** | Icon chuyển sang chấm than `!` màu đỏ, tooltip hiển thị tóm tắt lỗi (ví dụ: "Instance offline" hoặc "Lỗi mạng"). | Cho phép người dùng bấm lại nút để Thử lại (Retry). |
| **Unconfigured** | Tooltip hiển thị: "Vui lòng cấu hình Cobalt URL trong popup". | Nhấp vào thông báo sẽ mở hướng dẫn thiết lập. |
| **Dismissed (Đã ẩn)** | Toolbar biến mất hoàn toàn. | Bỏ qua hoàn toàn trong các lần quét DOM tiếp theo của MutationObserver. |
