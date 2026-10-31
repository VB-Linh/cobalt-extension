# Nghiên Cứu Kỹ Thuật API Cobalt v11.7.1 (COBALT_API_RESEARCH.md)

Tài liệu kỹ thuật tổng hợp toàn bộ đặc tả API của Cobalt v11.7.1, được khảo sát trực tiếp từ mã nguồn `./cobalt/` phục vụ tích hợp Phase 4 (Cobalt API Integration & Download Manager) của X Video Tools.

---

## Section 1: Tổng Quan Kiến Trúc (Architecture Overview)

- **Phiên bản API**: Cobalt v11.7.1 (`@imput/cobalt-api`).
- **Nền tảng công nghệ**: Node.js (>=18.17), Express 4.22, Zod 4.2, Undici 6.24, FFmpeg Static 5.3, Isolated-vm 6.0.
- **Kiến trúc mạng**:
  - Headless HTTP REST API.
  - Xử lý đơn lẻ hoặc phân tán qua Node.js cluster / Redis.
  - Hỗ trợ reverse proxy (Nginx / Cloudflare) qua cấu hình Express `trust proxy: ['loopback', 'uniquelocal']`.
- **Ranh giới tích hợp Chrome Extension**:
  - Extension giao tiếp với Cobalt hoàn toàn qua HTTP REST API từ Background Service Worker (`src/background/clients/cobaltClient.js`).
  - Không nhúng mã nguồn backend Cobalt vào extension.
  - Tuyệt đối không chỉnh sửa thư mục mã nguồn tham chiếu `./cobalt/`.

---

## Section 2: Endpoints & Phương Thức HTTP (Endpoints & Methods)

Cobalt v11.7.1 cung cấp 4 endpoint chính:

### 1. `POST /` — Endpoint xử lý chính (Main Processing Endpoint)
- **Mục đích**: Tiếp nhận URL bài viết mạng xã hội (Twitter/X) và các tham số cấu hình để trích xuất hoặc chuyển đổi media.
- **Headers bắt buộc**:
  - `Accept: application/json` (hoặc `application/json; charset=utf-8`)
  - `Content-Type: application/json` (hoặc `application/json; charset=utf-8`)
  - `Authorization: Api-Key <UUID>` (khi instance yêu cầu xác thực)
- **Giới hạn body**: Tối đa 1024 bytes (1 KB). Vượt quá sẽ trả về HTTP 400 `error.api.invalid_body`.
- **Mã phản hồi HTTP**:
  - `200 OK`: Trích xuất thành công (trả về trạng thái `redirect`, `tunnel`, `picker`, hoặc `local-processing`).
  - `400 Bad Request`: Lỗi payload, schema, URL không hợp lệ hoặc lỗi trích xuất nghiệp vụ.
  - `429 Too Many Requests`: Vượt quá hạn mức rate limit của API.
  - `500 Internal Server Error`: Lỗi hệ thống nội bộ hoặc lỗi xử lý stream nghiêm trọng.

### 2. `GET /` — Endpoint siêu dữ liệu & Kiểm tra trạng thái (Server Metadata & Health Check)
- **Mục đích**: Cung cấp thông tin phiên bản, trạng thái hoạt động, danh sách dịch vụ được kích hoạt.
- **Headers**: `Accept: application/json`.
- **Xác thực**: Không yêu cầu (Public).
- **Rate Limit**: Không áp dụng rate limit.
- **Cấu trúc phản hồi (200 OK)**:
  ```json
  {
    "cobalt": {
      "version": "11.7.1",
      "url": "https://cobalt.example.com/",
      "startTime": "1730332800000",
      "turnstileSitekey": "0x4AAAAAA...",
      "services": [
        "bilibili", "bluesky", "dailymotion", "instagram", "facebook",
        "loom", "newgrounds", "ok.ru", "pinterest", "reddit", "rutube",
        "snapchat", "soundcloud", "streamable", "tiktok", "tumblr",
        "twitch clips", "twitter/x", "vimeo", "vk videos & clips", "youtube"
      ]
    },
    "git": {
      "branch": "main",
      "commit": "abcdef123456...",
      "remote": "https://github.com/imputnet/cobalt"
    }
  }
  ```

### 3. `GET /tunnel` — Endpoint truyền luồng tệp tin (Media Tunnel Streaming)
- **Mục đích**: Truyền tải luồng tệp tin đã được Cobalt proxy, remux hoặc chuyển đổi định dạng.
- **Cơ chế xác thực luồng**: Xác thực chữ ký mã hóa thông qua query parameters:
  - `id`: Định danh stream dạng nanoid (độ dài chính xác 21 ký tự).
  - `exp`: Timestamp hết hạn tính bằng mili-giây (độ dài chính xác 13 ký tự).
  - `sig`: Chữ ký HMAC SHA-256 base64url (độ dài chính xác 43 ký tự).
  - `sec`: Khóa bí mật giải mã stream base64url (độ dài chính xác 43 ký tự).
  - `iv`: Vector khởi tạo base64url (độ dài chính xác 22 ký tự).
  - `p`: (Tùy chọn) Ping/Probe stream; trả về 200 OK rỗng nếu chữ ký hợp lệ.
- **Headers trả về**:
  - `Content-Disposition`: Chứa tên tệp tin chuẩn (`attachment; filename="..."`).
  - `Content-Length`: Kích thước tệp tin thực tế (nếu xác định được).
  - `Estimated-Content-Length`: Kích thước tệp tin ước tính (khi đang remux/transcode).

### 4. `POST /session` — Tạo phiên Turnstile JWT (Session Generation)
- **Mục đích**: Cấp JWT token cho client vượt qua thử thách Cloudflare Turnstile.
- **Header bắt buộc**: `cf-turnstile-response: <token>`.
- **Phản hồi**: `{ "token": "<JWT>", "exp": 120 }`. (Không áp dụng cho extension client tự động).

---

## Section 3: Cơ Chế Xác Thực (Authentication)

### 3.1 Định dạng Header API Key
Cobalt v11.7.1 hỗ trợ xác thực bằng API Key thông qua HTTP Header chuẩn:
```http
Authorization: Api-Key 12345678-1234-4234-8234-123456789abc
```
- **Tên header**: `Authorization`.
- **Cú pháp scheme**: `Api-Key` (không phân biệt hoa thường khi parse: `api-key`, nhưng chuẩn tài liệu khuyến nghị `Api-Key`).
- **Phân tách**: Đúng một khoảng trắng duy nhất giữa scheme và chuỗi khóa.
- **Định dạng khóa**: Chuỗi UUIDv4 chính xác theo regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/` (36 ký tự).
- **Ràng buộc nghiêm ngặt**: Cobalt kiểm tra `${authType} ${keyString} === authHeader`. Bất kỳ khoảng trắng thừa hoặc ký tự đặc biệt nào ở đầu/cuối header đều bị coi là không hợp lệ.

### 3.2 Quy trình xác thực của máy chủ
1. Nếu server không cấu hình biến môi trường `API_KEY_URL`: Tính năng xác thực khóa tắt; mọi request đều được phép xử lý nặc danh.
2. Nếu server có cấu hình `API_KEY_URL`:
   - Nếu header đúng cú pháp và khóa tồn tại trong danh sách: Request được gán định danh rate-limit theo API Key và áp dụng hạn mức riêng (hoặc `unlimited`).
   - Nếu header thiếu, sai scheme hoặc sai định dạng:
     - Nếu `API_AUTH_REQUIRED=0`: Cho phép tiếp tục xử lý nặc danh (áp dụng rate-limit IP).
     - Nếu `API_AUTH_REQUIRED=1`: Từ chối ngay lập tức với mã lỗi tương ứng.

### 3.3 Danh sách mã lỗi xác thực (Auth Error Codes)
- `error.api.auth.key.missing`: Thiếu header `Authorization` khi máy chủ yêu cầu bắt buộc có key.
- `error.api.auth.key.not_api_key`: Header Authorization không sử dụng tiền tố `Api-Key`.
- `error.api.auth.key.invalid`: Khóa API không đúng định dạng UUIDv4.
- `error.api.auth.key.not_found`: Khóa API không tồn tại hoặc đã bị thu hồi trên máy chủ.
- `error.api.auth.key.invalid_ip`: Không xác định được địa chỉ IP của client.
- `error.api.auth.key.ip_not_allowed`: IP của client bị giới hạn bởi cấu hình của API Key (`ips`).
- `error.api.auth.key.ua_not_allowed`: User-Agent của client không khớp với biểu thức chính quy cho phép của API Key (`userAgents`).

---

## Section 4: Lược Đồ Yêu Cầu (Request Schema)

Được định nghĩa bằng Zod tại `api/src/processing/schema.js` với cờ `.strict()`:

| Trường (Key) | Kiểu dữ liệu | Giá trị hợp lệ / Enum | Mặc định | Ý nghĩa & Ghi chú |
|---|---|---|---|---|
| `url` | `string` | URL hợp lệ (min 1 ký tự) | *Bắt buộc* | URL bài viết Twitter/X (hỗ trợ `x.com`, `twitter.com`, `vxtwitter.com`, `fixvx.com`). |
| `videoQuality` | `string` | `"max"`, `"4320"`, `"2160"`, `"1440"`, `"1080"`, `"720"`, `"480"`, `"360"`, `"240"`, `"144"` | `"1080"` | Mức chất lượng video mong muốn. Để lấy chất lượng cao nhất, cấu hình `"max"`. |
| `audioFormat` | `string` | `"best"`, `"mp3"`, `"ogg"`, `"wav"`, `"opus"` | `"mp3"` | Định dạng âm thanh đầu ra khi tải audio. |
| `audioBitrate` | `string` | `"320"`, `"256"`, `"128"`, `"96"`, `"64"`, `"8"` | `"128"` | Bitrate âm thanh (kbps). |
| `downloadMode` | `string` | `"auto"`, `"audio"`, `"mute"` | `"auto"` | Chế độ tải: `"auto"` (video + audio), `"audio"` (chỉ audio), `"mute"` (tắt tiếng). |
| `filenameStyle` | `string` | `"classic"`, `"pretty"`, `"basic"`, `"nerdy"` | `"basic"` | Quy tắc đặt tên tệp tin của Cobalt. |
| `disableMetadata` | `boolean` | `true`, `false` | `false` | Bỏ qua gắn siêu dữ liệu ID3/mp4 tags. |
| `alwaysProxy` | `boolean` | `true`, `false` | `false` | Luôn chuyển tiếp luồng tải qua Tunnel thay vì redirect về CDN gốc. |
| `localProcessing` | `string` | `"disabled"`, `"preferred"`, `"forced"` | `"disabled"` | Yêu cầu máy chủ xử lý toàn bộ (chọn `"disabled"` để tránh tải file thô về trình duyệt mux). |
| `convertGif` | `boolean` | `true`, `false` | `true` | Tự động chuyển đổi Twitter Animated GIF sang định dạng tệp tin `.gif`. |
| `subtitleLang` | `string` | Mã ngôn ngữ ISO 639-1 (regex `/^[0-9a-zA-Z\-]+$/`) | Không có | Ngôn ngữ phụ đề cần nhúng nếu video có phụ đề. |
| `allowH265` | `boolean` | `true`, `false` | `false` | Áp dụng cho TikTok. |
| `tiktokFullAudio` | `boolean` | `true`, `false` | `false` | Áp dụng cho TikTok. |
| `youtubeVideoCodec` | `string` | `"h264"`, `"av1"`, `"vp9"` | `"h264"` | Áp dụng cho YouTube. |
| `youtubeVideoContainer` | `string` | `"auto"`, `"mp4"`, `"webm"`, `"mkv"` | `"auto"` | Áp dụng cho YouTube. |
| `youtubeDubLang` | `string` | Mã ngôn ngữ ISO 639-1 | Không có | Áp dụng cho YouTube. |
| `youtubeBetterAudio` | `string` | `true`, `false` | `false` | Áp dụng cho YouTube. |
| `youtubeHLS` | `boolean` | `true`, `false` | `false` | Áp dụng cho YouTube. |

### Cảnh báo quan trọng về Payload:
1. **Quy tắc Strict Mode**: Không gửi thêm bất kỳ trường tùy biến nào ngoài các trường trên. Bất kỳ trường lạ nào (ví dụ `clientVersion`, `timestamp`, `apiKey`) sẽ khiến Zod schema validation thất bại và Cobalt trả về lỗi 400 `error.api.invalid_body`.
2. **Kích thước payload**: Phải nhỏ hơn 1024 bytes.
3. **Cấu hình tối ưu cho Twitter/X trong Extension**:
   ```json
   {
     "url": "https://x.com/username/status/1234567890",
     "videoQuality": "max",
     "audioFormat": "best",
     "downloadMode": "auto",
     "filenameStyle": "basic",
     "localProcessing": "disabled",
     "alwaysProxy": false
   }
   ```

---

## Section 5: Tùy Chọn Chất Lượng Video (Video Quality Options)

### 5.1 Các mức chất lượng được hỗ trợ
Các giá trị hợp lệ trong Zod schema:
- `"max"`: Mức chất lượng cao nhất khả dụng của nội dung gốc.
- `"4320"`: 8K UHD.
- `"2160"`: 4K UHD.
- `"1440"`: 2K QHD (1440p).
- `"1080"`: Full HD (1080p) — Mặc định của schema.
- `"720"`: HD (720p).
- `"480"`: SD (480p).
- `"360"`, `"240"`, `"144"`: Chất lượng thấp/tiết kiệm băng thông.

### 5.2 Cơ chế lựa chọn chất lượng đối với Twitter/X
Khảo sát mã nguồn hàm `bestQuality` trong `api/src/processing/services/twitter.js`:
```javascript
function bestQuality(arr) {
    return stripVideoURL(
        arr.filter(v => v.content_type === "video/mp4")
        .reduce((a, b) => Number(a?.bitrate) > Number(b?.bitrate) ? a : b)
        .url
    );
}
```
- **Hành vi thực tế**: Đối với Twitter, module trích xuất của Cobalt tự động lọc các biến thể có `content_type === "video/mp4"` và chọn biến thể có `bitrate` lớn nhất bằng thuật toán `reduce`.
- **Cấu hình chuẩn**: Thiết lập `"videoQuality": "max"` trong payload vừa kích hoạt cơ chế ưu tiên cao nhất, vừa đảm bảo tính tương thích và tuân thủ chặt chẽ tiêu chuẩn của Cobalt.

---

## Section 6: Lược Đồ Phản Hồi & Phân Loại Xử Lý (Response Schema & Handling)

Phản hồi từ `POST /` luôn là đối tượng JSON có thuộc tính `status`:

### 1. Phản hồi `redirect` (Direct Download)
- Xuất hiện khi Cobalt tìm thấy URL MP4 trực tiếp trên CDN Twitter (`video.twimg.com`) và `alwaysProxy: false`.
- Cấu trúc:
  ```json
  {
    "status": "redirect",
    "url": "https://video.twimg.com/ext_tw_video/12345/pu/vid/avc1/1280x720/xyz.mp4",
    "filename": "twitter_123456789.mp4"
  }
  ```
- **Xử lý**: Xác thực protocol HTTPS, chuyển giao trực tiếp cho `chrome.downloads.download`.

### 2. Phản hồi `tunnel` (Proxied / Remuxed Stream)
- Xuất hiện khi `alwaysProxy: true`, hoặc khi video Twitter cần sửa container lỗi thời gian (`needsFixing`), hoặc khi người dùng yêu cầu tách âm thanh / chuyển đổi GIF.
- Cấu trúc:
  ```json
  {
    "status": "tunnel",
    "url": "https://cobalt.example.com/tunnel?id=AbCdEfGhIjK1234567890&exp=1730332890000&sig=XyZ...&sec=123...&iv=456...",
    "filename": "twitter_123456789.mp4"
  }
  ```
- **Xử lý**: Bảo toàn 100% URL bao gồm đầy đủ query parameters (`id`, `exp`, `sig`, `sec`, `iv`). Tuyệt đối không xóa bớt tham số vì server sẽ từ chối với HTTP 400.

### 3. Phản hồi `picker` (Multi-Media Post)
- Xuất hiện khi tweet chứa nhiều video/ảnh và URL không có chỉ số `/video/:index`.
- Cấu trúc:
  ```json
  {
    "status": "picker",
    "picker": [
      {
        "type": "video",
        "url": "https://video.twimg.com/...",
        "thumb": "https://cobalt.example.com/tunnel?id=...&exp=..."
      },
      {
        "type": "photo",
        "url": "https://pbs.twimg.com/media/xyz?name=4096x4096",
        "thumb": "https://cobalt.example.com/tunnel?id=...&exp=..."
      }
    ]
  }
  ```
- **Xử lý**: Hiển thị giao diện Media Picker cho người dùng lựa chọn media muốn tải, không tự ý mặc định chọn phần tử đầu tiên.

### 4. Phản hồi `local-processing`
- Xuất hiện khi client yêu cầu `localProcessing: "forced"`. Extension cấu hình `localProcessing: "disabled"` để Cobalt xử lý hoàn chỉnh trên server. Nếu gặp trạng thái này ngoài ý muốn, thông báo người dùng phiên bản hiện tại chưa hỗ trợ local processing trên browser extension.

### 5. Phản hồi `error`
- Xuất hiện khi có lỗi xảy ra.
- Cấu trúc:
  ```json
  {
    "status": "error",
    "error": {
      "code": "error.api.fetch.empty",
      "context": {
        "service": "twitter/x"
      }
    }
  }
  ```

---

## Section 7: Bảng Mã Lỗi & Bản Dịch Tiếng Việt Thân Thiện (Error Codes & Handling)

| Mã lỗi (Error Code) | HTTP Status | Context kèm theo | Nguyên nhân kỹ thuật | Thông báo Tiếng Việt thân thiện cho người dùng |
|---|---|---|---|---|
| `error.api.rate_exceeded` | 429 | `{ limit }` (giây) | Tần suất gửi yêu cầu vượt quá giới hạn rate limit của instance. | Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ {limit} giây trước khi thử lại. |
| `error.api.header.accept` | 400 | - | Header Accept thiếu hoặc không phải `application/json`. | Yêu cầu không hợp lệ (header Accept phải là application/json). |
| `error.api.header.content_type` | 400 | - | Header Content-Type thiếu hoặc không phải `application/json`. | Yêu cầu không hợp lệ (header Content-Type phải là application/json). |
| `error.api.invalid_body` | 400 | - | JSON body không hợp lệ, chứa trường lạ (strict validation) hoặc vượt quá 1KB. | Dữ liệu yêu cầu không hợp lệ hoặc cấu trúc payload không đúng chuẩn Cobalt. |
| `error.api.link.missing` | 400 | - | Thiếu trường `url` trong body. | Thiếu liên kết bài viết cần tải. |
| `error.api.link.invalid` | 400 | - | URL không đúng định dạng hoặc không thuộc dịch vụ được hỗ trợ. | Đường dẫn bài viết không hợp lệ hoặc không được Cobalt hỗ trợ. |
| `error.api.link.unsupported` | 400 | `{ service }` | Mẫu liên kết bài viết không khớp với bất kỳ pattern nào của dịch vụ. | Định dạng liên kết bài viết {service} này chưa được hỗ trợ. |
| `error.api.service.disabled` | 400 | - | Dịch vụ này đã bị tắt trên cấu hình máy chủ Cobalt (`DISABLED_SERVICES`). | Dịch vụ này hiện đang bị vô hiệu hóa trên máy chủ Cobalt đã cấu hình. |
| `error.api.service.unsupported` | 400 | - | Dịch vụ không được hỗ trợ bởi hệ thống. | Dịch vụ này không nằm trong danh sách hỗ trợ của Cobalt. |
| `error.api.service.audio_not_supported` | 400 | - | Dịch vụ không hỗ trợ tải âm thanh riêng biệt. | Dịch vụ này không hỗ trợ chế độ chỉ tải âm thanh. |
| `error.api.auth.key.missing` | 400 | - | Máy chủ yêu cầu API Key nhưng request không có header Authorization. | Máy chủ Cobalt yêu cầu API Key. Vui lòng cấu hình API Key trong cài đặt extension. |
| `error.api.auth.key.not_api_key` | 400 | - | Header Authorization không dùng tiền tố `Api-Key`. | Phương thức xác thực không đúng chuẩn (cần dùng tiền tố 'Api-Key'). |
| `error.api.auth.key.invalid` | 400 | - | Khóa API Key không phải định dạng UUIDv4 hợp lệ. | Định dạng API Key không hợp lệ (phải là chuỗi UUID chuẩn 36 ký tự). |
| `error.api.auth.key.not_found` | 400 | - | API Key không tồn tại trên máy chủ. | API Key không chính xác hoặc đã bị vô hiệu hóa trên máy chủ Cobalt. |
| `error.api.auth.key.invalid_ip` | 400 | - | Không xác định được địa chỉ IP của client. | Địa chỉ IP của bạn không hợp lệ đối với máy chủ Cobalt. |
| `error.api.auth.key.ip_not_allowed` | 400 | - | IP của client không nằm trong dải IP được phép của khóa API này. | Địa chỉ IP hiện tại không được phép sử dụng API Key này. |
| `error.api.auth.key.ua_not_allowed` | 400 | - | Trình duyệt / User-Agent không được phép sử dụng API Key này. | User-Agent của trình duyệt không được phép sử dụng API Key này. |
| `error.api.auth.jwt.missing` | 400 | - | Phiên làm việc (Session) yêu cầu Bearer JWT nhưng không có. | Phiên xác thực người dùng bị thiếu mã phiên (JWT token). |
| `error.api.auth.jwt.invalid` | 400 | - | Bearer JWT token không hợp lệ hoặc đã hết hạn. | Phiên xác thực người dùng đã hết hạn hoặc không hợp lệ. |
| `error.api.auth.not_configured` | 400 | - | Endpoint /session được gọi nhưng server không bật session. | Máy chủ không bật tính năng xác thực phiên Turnstile. |
| `error.api.auth.turnstile.missing` | 400 | - | Thiếu header xác thực cf-turnstile-response. | Thiếu mã xác thực Cloudflare Turnstile. |
| `error.api.auth.turnstile.invalid` | 400 | - | Mã xác thực Turnstile không hợp lệ. | Xác thực bảo vệ chống bot Turnstile thất bại. |
| `error.api.fetch.empty` | 400 | - | Không tìm thấy video hoặc tệp phương tiện nào (tweet chỉ có chữ, tweet bị xóa, v.v.). | Không tìm thấy video hoặc tệp phương tiện nào trong bài viết này. |
| `error.api.fetch.fail` | 400 / 500 | `{ service }` | Lỗi khi kết nối hoặc trích xuất dữ liệu từ API nền tảng gốc. | Không thể lấy thông tin video từ {service}. Vui lòng thử lại sau hoặc dùng Mở CDN. |
| `error.api.fetch.rate` | 400 | `{ service }` | Máy chủ Cobalt bị nền tảng gốc chặn do vượt quá tần suất (upstream rate limit). | Máy chủ Cobalt đang bị nền tảng {service} giới hạn lượt truy cập. Vui lòng thử lại sau. |
| `error.api.fetch.critical` | 400 / 500 | `{ service }` | Lỗi nghiêm trọng khi trích xuất dữ liệu từ nền tảng. | Đã xảy ra lỗi nghiêm trọng khi xử lý video từ {service}. |
| `error.api.fetch.critical.core` | 500 | - | Lỗi nội bộ trong lõi xử lý stream của Cobalt. | Lỗi nội bộ hệ thống xử lý tệp của máy chủ Cobalt. |
| `error.api.fetch.short_link` | 400 | - | Không thể giải mã liên kết rút gọn. | Không thể mở rộng liên kết rút gọn của bài viết. |
| `error.api.content.too_long` | 400 | `{ limit }` (phút) | Video vượt quá thời lượng tối đa cho phép trên máy chủ Cobalt. | Video vượt quá giới hạn thời lượng cho phép của máy chủ ({limit} phút). |
| `error.api.content.post.private` | 400 | - | Bài viết/tweet ở chế độ riêng tư (tài khoản được bảo vệ). | Bài viết hoặc tài khoản này được đặt ở chế độ riêng tư, không thể tải. |
| `error.api.content.post.age` | 400 | - | Bài viết bị giới hạn độ tuổi và máy chủ không có cookie đăng nhập. | Bài viết bị giới hạn độ tuổi người xem (yêu cầu cookie xác thực trên máy chủ). |
| `error.api.content.post.unavailable` | 400 | - | Bài viết không khả dụng (đã bị xóa hoặc bị ẩn). | Bài viết không còn khả dụng hoặc đã bị người đăng xóa. |
| `error.api.content.video.private` | 400 | - | Video ở chế độ riêng tư. | Video này là video riêng tư. |
| `error.api.content.video.age` | 400 | - | Video bị giới hạn độ tuổi. | Video yêu cầu xác thực độ tuổi người xem. |
| `error.api.content.video.unavailable` | 400 | `{ service }` | Video trên nền tảng gốc không khả dụng hoặc bị xóa. | Video không khả dụng trên {service}. |
| `error.api.content.video.live` | 400 | - | Video là luồng phát trực tiếp (livestream). | Không hỗ trợ tải luồng phát trực tiếp (livestream). |
| `error.api.content.video.region` | 400 | - | Video bị chặn địa lý tại quốc gia đặt máy chủ. | Video bị chặn tại khu vực địa lý của máy chủ Cobalt. |
| `error.api.youtube.disabled_main_instance` | 400 | - | YouTube bị tắt trên instance chính thức. | Tải video YouTube bị tắt trên máy chủ chính thức. |
| `error.api.generic` | 400 / 500 | - | Lỗi không xác định trên máy chủ Cobalt. | Đã xảy ra lỗi không xác định trên máy chủ Cobalt. Vui lòng thử lại sau. |

---

## Section 8: Kiểm Tra Kết Nối & Health Check (Health Check & Connection Testing)

### 8.1 Kiểm tra trạng thái máy chủ (Server Reachability & Compatibility)
- **Phương thức & Endpoint**: `GET /`
- **Header**: `Accept: application/json`
- **Tiêu chuẩn nghiệm thu thành công**:
  1. HTTP Status code trả về đúng `200`.
  2. Phản hồi parse được dưới dạng JSON và có thuộc tính `data.cobalt.version`.
  3. Giá trị `version` khớp với phiên bản tương thích (bắt đầu bằng `11.`).
  4. Mảng `data.cobalt.services` chứa `"twitter/x"` hoặc `"twitter"`.

### 8.2 Kiểm tra tính hợp lệ của API Key (Key Validation Probe)
Do `GET /` là endpoint công khai và không xác thực API Key, để kiểm tra tính hợp lệ của API Key người dùng nhập vào mà không cần tải video thật:
- Gửi yêu cầu probe:
  - **Phương thức**: `POST /`
  - **Headers**:
    - `Accept: application/json`
    - `Content-Type: application/json`
    - `Authorization: Api-Key <user-api-key>`
  - **Body**: `{}` (rỗng)
- **Cơ chế hoạt động dựa trên luồng middleware của Cobalt**:
  1. Middleware xác thực `APIKeys.validateAuthorization` chạy trước route handler.
  2. Nếu API Key sai cú pháp, không tìm thấy, hoặc bị từ chối: Cobalt trả về mã lỗi `error.api.auth.key.*` (HTTP 400).
  3. Nếu API Key hợp lệ (hoặc máy chủ không yêu cầu key): Middleware xác thực thành công, chuyển tiếp tới route handler; lúc này route handler kiểm tra thấy thiếu trường `url` và trả về mã lỗi `error.api.link.missing` (HTTP 400).
- **Kết luận**: Nhận được `error.api.link.missing` đồng nghĩa API Key hoàn toàn hợp lệ!

---

## Section 9: Rate Limiting & Bảo Mật (Rate Limiting & Security)

### 9.1 Cơ chế Rate Limiting
- **Thư viện áp dụng**: `express-rate-limit` (chuẩn IETF draft-6).
- **Hạn mức mặc định**:
  - API endpoint (`POST /`): Cấu hình qua `RATELIMIT_WINDOW` (mặc định 60 giây) và `RATELIMIT_MAX` (mặc định 20 yêu cầu).
  - Khóa định danh rate limit: Băm HMAC của địa chỉ IP client, hoặc chuỗi API Key (nếu client sử dụng API Key). API Key có thể được cấu hình hạn mức riêng hoặc `unlimited`.
  - Tunnel endpoint (`GET /tunnel`): Cấu hình qua `TUNNEL_RATELIMIT_WINDOW` (60 giây) và `TUNNEL_RATELIMIT_MAX` (40 yêu cầu).
- **Headers trả về trong mọi phản hồi**:
  - `Ratelimit-Limit`: Tổng số lượt cho phép trong một chu kỳ.
  - `Ratelimit-Remaining`: Số lượt còn lại trước khi bị giới hạn.
  - `Ratelimit-Reset`: Thời gian còn lại (tính bằng giây) trước khi hạn mức được làm mới.
- **Phản hồi khi vượt quá giới hạn**: HTTP 429 Too Many Requests kèm JSON body `error.api.rate_exceeded`.

### 9.2 Các quy tắc an ninh cho Extension (Security Rules)
1. **Lưu trữ an toàn**: API Key và Instance URL phải lưu trong `chrome.storage.local`. Không lưu vào `manifest.json`, không hardcode vào mã nguồn, không đính kèm vào URL query parameters.
2. **Che thông tin nhạy cảm trên UI**: Popup Settings phải có cơ chế che API Key (dạng password `••••••••`) kèm nút bật/tắt hiển thị.
3. **Không ghi log nhạy cảm**: Tuyệt đối không `console.log` khóa API Key hoặc toàn bộ URL Tunnel đã ký trong môi trường production.
4. **Least-Privilege Host Permissions**: Yêu cầu người dùng cấp quyền truy cập origin thông qua `chrome.permissions.request({ origins: [instanceOrigin + "/*"] })`. Tuyệt đối không xin quyền toàn bộ website (`http://*/*`, `https://*/*`).

---

## Section 10: Ma Trận Xác Minh (Matrix of Verification)

| Hạng mục kiểm tra | Trạng thái xác minh | Nguồn chứng cứ từ mã nguồn `./cobalt/` | Ghi chú & Khuyến nghị thực thi |
|---|---|---|---|
| HTTP Endpoints (`POST /`, `GET /`, `GET /tunnel`) | **Đã xác nhận từ mã nguồn (Confirmed)** | `cobalt/api/src/core/api.js:125,288,319` | Tuyệt đối tuân thủ đường dẫn route `/` thay vì `/api/json` cũ của v7. |
| Header `Accept` & `Content-Type` | **Đã xác nhận từ mã nguồn (Confirmed)** | `cobalt/api/src/core/api.js:126-131` | Bắt buộc phải là `application/json` (hoặc kèm `charset=utf-8`). |
| Giới hạn Body 1024 bytes | **Đã xác nhận từ mã nguồn (Confirmed)** | `cobalt/api/src/core/api.js:196` | Giữ payload gọn gàng, không nhồi nhét dữ liệu thừa. |
| Zod Schema `.strict()` | **Đã xác nhận từ mã nguồn (Confirmed)** | `cobalt/api/src/processing/schema.js:64` | Tuyệt đối không gửi trường ngoài schema chuẩn. |
| Cú pháp Auth `Authorization: Api-Key <UUID>` | **Đã xác nhận từ mã nguồn (Confirmed)** | `cobalt/api/src/security/api-keys.js:187-206` | Đúng tiền tố `Api-Key` và UUIDv4 không có khoảng trắng thừa. |
| Các mã lỗi Auth (`missing`, `invalid`, `not_found`,...) | **Đã xác nhận từ mã nguồn (Confirmed)** | `cobalt/api/src/security/api-keys.js:187-238` | Đã ánh xạ 100% sang thông báo tiếng Việt thân thiện. |
| Lựa chọn video chất lượng cao nhất cho Twitter | **Đã xác nhận từ mã nguồn (Confirmed)** | `cobalt/api/src/processing/services/twitter.js:39-45` | Cobalt tự lọc MP4 bitrate cao nhất; client gửi `"videoQuality": "max"`. |
| Cấu trúc Response `redirect`, `tunnel`, `picker`, `error` | **Đã xác nhận từ mã nguồn (Confirmed)** | `cobalt/api/src/processing/request.js:29-111` | Client xử lý đầy đủ cả 4 trạng thái phản hồi. |
| Tunnel URL Query Parameters (`id`, `exp`, `sig`, `sec`, `iv`) | **Đã xác nhận từ mã nguồn (Confirmed)** | `cobalt/api/src/core/api.js:289-301`, `stream/manage.js:61-73` | Phải bảo toàn 100% URL đã ký, không sửa đổi query parameters. |
| Server Health Check qua `GET /` | **Đã xác nhận từ mã nguồn (Confirmed)** | `cobalt/api/src/core/api.js:51-64,319-322` | Trả về 200 OK kèm `cobalt.version` và mảng `services`. |
| Kỹ thuật Probe kiểm tra API Key qua `POST /` với `{}` | **Suy luận logic vững chắc (Inferred)** | Suy luận từ thứ tự middleware trong `api.js:140` và `api.js:240` | Cho phép kiểm tra tính hợp lệ của key mà không cần tải media. |
| Thời hạn sống của URL Tunnel là 90 giây | **Suy luận dựa trên cấu hình mặc định (Inferred)** | `cobalt/docs/api-env-variables.md:39` (`TUNNEL_LIFESPAN=90`) | Client cần bắt đầu quá trình tải ngay sau khi nhận được tunnel URL. |
| Cấu hình mạng thực tế của từng server người dùng | **Chưa xác định / Phụ thuộc môi trường (Unknown)** | Tùy thuộc người dùng cấu hình Docker / Nginx / Reverse Proxy | Cần hỗ trợ tùy biến URL và xử lý lỗi mạng kết nối linh hoạt. |
