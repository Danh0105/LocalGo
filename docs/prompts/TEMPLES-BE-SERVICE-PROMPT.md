# Prompt xây dựng BE service cho chức năng Điểm du lịch Đền - Chùa - Miếu

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Đền - Chùa - Miếu** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho chức năng **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết Đền - Chùa - Miếu nhưng dữ liệu đang hard-code ở frontend (`src/data/temples.ts`). Mỗi điểm gồm:

1. Loại: `Đình`, `Chùa` hoặc `Miếu`.
2. Thông tin cơ bản: tên, địa chỉ, giờ mở cửa, ảnh đại diện.
3. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và mô tả chi tiết gồm nhiều đoạn văn.
4. Lễ hội - sự kiện: danh sách gồm thời điểm (âm lịch hoặc mô tả tự do) và tên sự kiện.

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu). Người dùng Mini App chỉ được đọc các điểm đang **hiển thị (active)**; điểm đang ẩn/nháp tuyệt đối không được lộ qua public API.

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách điểm (hỗ trợ lọc theo loại) và chi tiết một điểm theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự các điểm.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng điểm để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 6 điểm hiện có trong `src/data/temples.ts`, validation, phân quyền, test và tài liệu API.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ (temple + temple_event con) hoặc lưu `events`/`description` dạng JSON theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "dinh-truong-mit",
  "name": "Đình Truông Mít",
  "type": "Đình",
  "address": "Ấp Thuận Bình, xã Truông Mít",
  "openHours": "05:00 - 18:00 hằng ngày",
  "summary": "Ngôi đình cổ hơn 100 năm tuổi...",
  "description": [
    "Đoạn mô tả thứ nhất.",
    "Đoạn mô tả thứ hai."
  ],
  "events": [
    { "id": "uuid", "time": "16/3 âm lịch", "name": "Lễ Kỳ Yên (cầu an)" }
  ],
  "imageUrl": "https://cdn.example.com/temples/dinh-truong-mit.jpg",
  "imageAlt": "Đình Truông Mít",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `type` là enum cố định `Đình | Chùa | Miếu`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/temples/:id`); nếu cho phép đổi tên hiển thị, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `events` là bản ghi con có ID bền vững để admin sửa/xóa/sắp xếp chính xác; `time` là chuỗi tự do (hỗ trợ âm lịch, "Chủ nhật hằng tuần"...), không ép kiểu ngày giờ.
- `sortOrder` là số nguyên không âm; public API trả theo `sortOrder` tăng dần kèm tie-breaker ổn định (ví dụ `createdAt`).
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị.
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở `ABOUT-BE-SERVICE-PROMPT.md` nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/temples`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `type` (`Đình`/`Chùa`/`Miếu`) để lọc, mặc định trả tất cả loại.
  - Chỉ trả bản ghi đang hiển thị, sắp xếp theo `sortOrder`.
  - Không trả `description` chi tiết/`events` đầy đủ ở list nếu payload dự án tách list/detail để tối ưu băng thông; nếu dự án không có tiền lệ tách, trả full object là chấp nhận được.
- `GET /api/v1/temples/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `description` và `events`.
  - Nếu điểm không tồn tại hoặc đang ẩn, trả `404 TEMPLE_NOT_FOUND` theo error format chung (không tiết lộ điểm đang ẩn tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/temples`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, lọc theo `type`, tìm kiếm theo tên/địa chỉ, sắp theo `sortOrder`.
- `GET /api/admin/temples/:id`: chi tiết một điểm kèm `version`.
- `POST /api/admin/temples`: tạo điểm mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/temples/:id`: cập nhật toàn bộ một điểm; nhận `version` để optimistic locking.
- `DELETE /api/admin/temples/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/temples/:id/status`: bật/tắt hiển thị (`isActive`).
- `PATCH /api/admin/temples/reorder`: nhận danh sách `{ id, sortOrder }` để cập nhật thứ tự hàng loạt trong một transaction.

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/temples/:id`:

```json
{
  "version": 2,
  "name": "Đình Truông Mít",
  "type": "Đình",
  "address": "Ấp Thuận Bình, xã Truông Mít",
  "openHours": "05:00 - 18:00 hằng ngày",
  "summary": "Ngôi đình cổ hơn 100 năm tuổi...",
  "description": ["Đoạn 1", "Đoạn 2"],
  "events": [{ "id": "uuid-hoặc-null-nếu-mới", "time": "16/3 âm lịch", "name": "Lễ Kỳ Yên" }],
  "mediaId": "uuid",
  "imageAlt": "Đình Truông Mít"
}
```

Khi `version` cũ, trả HTTP `409` với code `TEMPLE_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `name`, `address`, `summary` không được rỗng sau khi trim.
- Giới hạn đề xuất: `name` 150 ký tự, `address` 255, `openHours` 100, `summary` 300, mỗi đoạn `description` 5.000 ký tự, `event.time` 50 ký tự, `event.name` 150 ký tự.
- Giới hạn số phần tử: tối đa 20 đoạn `description`, tối đa 30 `events`.
- `type` phải thuộc enum `Đình | Chùa | Miếu`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- Slug/`id` khi tạo mới: sinh tự động từ `name` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 6 điểm hiện có trong `src/data/temples.ts` để sau deploy trang không bị trống:

- Đình Truông Mít, Chùa Phước Lâm, Chùa Long Thọ, Miếu Bà Chúa Xứ, Miếu Ông Tà, Đình Thuận Lợi.
- Giữ nguyên `id`/slug hiện tại của từng điểm (ví dụ `dinh-truong-mit`) để không phá vỡ URL đang được liên kết trong app.
- Giữ nguyên toàn bộ `description` và `events` hiện có của từng điểm.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (`temple.png` hiện dùng chung một ảnh placeholder cho tất cả điểm). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng điểm, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả điểm ẩn và trả đúng thứ tự theo `sortOrder`.
- Public list API lọc đúng theo `type`.
- Public detail API trả `404 TEMPLE_NOT_FOUND` cho điểm không tồn tại hoặc đang ẩn.
- Người không có quyền bị `401/403` ở admin API.
- Tạo mới sinh `id`/slug hợp lệ và từ chối trùng slug.
- Cập nhật điểm không làm thay đổi `sortOrder`/`events` của điểm khác.
- Hai admin cập nhật cùng `version` gây conflict `409` cho request đến sau.
- Reorder hàng loạt cập nhật đúng `sortOrder` trong một transaction, rollback hoàn toàn nếu một phần tử lỗi.
- Bật/tắt hiển thị phản ánh đúng ngay trên public API.
- Xóa điểm loại bỏ đúng bản ghi con (`events`) liên quan theo convention (cascade hoặc soft delete).
- Media không tồn tại/sai loại bị từ chối.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/temples` và `GET /api/v1/temples/:id` trả đúng dữ liệu tương đương `src/data/temples.ts` hiện tại.
- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp mà không cần sửa code Mini App.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation, optimistic locking và xử lý concurrent update rõ ràng.
- Contract đủ để frontend Mini App thay dữ liệu hard-code trong `src/pages/temples.tsx`, `src/pages/temple-detail.tsx` và `src/data/temples.ts` bằng gọi API.
