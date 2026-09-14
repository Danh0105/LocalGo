# Prompt xây dựng BE service cho chức năng Đặc sản

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Đặc sản** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`) hoặc **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết Đặc sản nhưng dữ liệu đang hard-code ở frontend (`src/data/specialties.ts`). Mỗi đặc sản gồm:

1. Danh mục: `Món ăn`, `Trái cây` hoặc `Quà mang về`.
2. Thông tin cơ bản: tên, giá (dạng khoảng/đơn vị tự do), mùa vụ, ảnh đại diện.
3. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và mô tả chi tiết gồm nhiều đoạn văn.
4. Địa điểm mua: danh sách chuỗi mô tả nơi có thể mua.

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu), cùng dạng dữ liệu với Đền - Chùa - Miếu nhưng khác field nghiệp vụ. Người dùng Mini App chỉ được đọc các đặc sản đang **hiển thị (active)**; đặc sản đang ẩn/nháp tuyệt đối không được lộ qua public API.

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách đặc sản (hỗ trợ lọc theo danh mục) và chi tiết một đặc sản theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự các đặc sản.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng đặc sản để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 6 đặc sản hiện có trong `src/data/specialties.ts`, validation, phân quyền, test và tài liệu API.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ (specialty + specialty_buy_place con, hoặc `buyPlaces`/`description` dạng JSON) theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "banh-trang-phoi-suong",
  "name": "Bánh tráng phơi sương",
  "category": "Món ăn",
  "price": "35.000 - 50.000đ/xấp",
  "season": "Quanh năm",
  "summary": "Bánh tráng dẻo mềm phơi qua sương đêm...",
  "description": [
    "Đoạn mô tả thứ nhất.",
    "Đoạn mô tả thứ hai."
  ],
  "buyPlaces": [
    "Các lò bánh tráng ấp Thuận Bình",
    "Chợ Truông Mít",
    "Cửa hàng OCOP xã"
  ],
  "imageUrl": "https://cdn.example.com/specialties/banh-trang-phoi-suong.jpg",
  "imageAlt": "Bánh tráng phơi sương",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `category` là enum cố định `Món ăn | Trái cây | Quà mang về`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/specialties/:id`); nếu cho phép đổi tên hiển thị, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `price` và `season` là chuỗi tự do (hỗ trợ khoảng giá, đơn vị, mùa vụ dạng "Tháng 6 - tháng 9"...), không ép kiểu số/ngày.
- `buyPlaces` là mảng chuỗi đơn giản (không cần bản ghi con có ID riêng trừ khi dự án muốn quản lý địa điểm mua như entity độc lập).
- `sortOrder` là số nguyên không âm; public API trả theo `sortOrder` tăng dần kèm tie-breaker ổn định (ví dụ `createdAt`).
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị.
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở `ABOUT-BE-SERVICE-PROMPT.md`/`TEMPLES-BE-SERVICE-PROMPT.md` nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/specialties`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `category` (`Món ăn`/`Trái cây`/`Quà mang về`) để lọc, mặc định trả tất cả danh mục.
  - Chỉ trả bản ghi đang hiển thị, sắp xếp theo `sortOrder`.
- `GET /api/v1/specialties/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `description` và `buyPlaces`.
  - Nếu đặc sản không tồn tại hoặc đang ẩn, trả `404 SPECIALTY_NOT_FOUND` theo error format chung (không tiết lộ đặc sản đang ẩn tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/specialties`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, lọc theo `category`, tìm kiếm theo tên, sắp theo `sortOrder`.
- `GET /api/admin/specialties/:id`: chi tiết một đặc sản kèm `version`.
- `POST /api/admin/specialties`: tạo đặc sản mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/specialties/:id`: cập nhật toàn bộ một đặc sản; nhận `version` để optimistic locking.
- `DELETE /api/admin/specialties/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/specialties/:id/status`: bật/tắt hiển thị (`isActive`).
- `PATCH /api/admin/specialties/reorder`: nhận danh sách `{ id, sortOrder }` để cập nhật thứ tự hàng loạt trong một transaction.

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/specialties/:id`:

```json
{
  "version": 2,
  "name": "Bánh tráng phơi sương",
  "category": "Món ăn",
  "price": "35.000 - 50.000đ/xấp",
  "season": "Quanh năm",
  "summary": "Bánh tráng dẻo mềm phơi qua sương đêm...",
  "description": ["Đoạn 1", "Đoạn 2"],
  "buyPlaces": ["Các lò bánh tráng ấp Thuận Bình", "Chợ Truông Mít"],
  "mediaId": "uuid",
  "imageAlt": "Bánh tráng phơi sương"
}
```

Khi `version` cũ, trả HTTP `409` với code `SPECIALTY_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `name`, `price`, `season`, `summary` không được rỗng sau khi trim.
- Giới hạn đề xuất: `name` 150 ký tự, `price` 100, `season` 100, `summary` 300, mỗi đoạn `description` 5.000 ký tự, mỗi phần tử `buyPlaces` 200 ký tự.
- Giới hạn số phần tử: tối đa 20 đoạn `description`, tối đa 20 `buyPlaces`.
- `category` phải thuộc enum `Món ăn | Trái cây | Quà mang về`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- Slug/`id` khi tạo mới: sinh tự động từ `name` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 6 đặc sản hiện có trong `src/data/specialties.ts` để sau deploy trang không bị trống:

- Bánh tráng phơi sương, Muối ớt tôm, Mãng cầu (na) dai, Sầu riêng Thuận Bình, Bò tơ nướng, Nem bưởi chay.
- Giữ nguyên `id`/slug hiện tại của từng đặc sản (ví dụ `banh-trang-phoi-suong`) để không phá vỡ URL đang được liên kết trong app.
- Giữ nguyên toàn bộ `description` và `buyPlaces` hiện có của từng đặc sản.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (hiện dùng chung 2 ảnh placeholder `fried-rice.png`/`restaurant.png` cho nhiều đặc sản). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng đặc sản, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả đặc sản ẩn và trả đúng thứ tự theo `sortOrder`.
- Public list API lọc đúng theo `category`.
- Public detail API trả `404 SPECIALTY_NOT_FOUND` cho đặc sản không tồn tại hoặc đang ẩn.
- Người không có quyền bị `401/403` ở admin API.
- Tạo mới sinh `id`/slug hợp lệ và từ chối trùng slug.
- Cập nhật một đặc sản không làm thay đổi `sortOrder` của đặc sản khác.
- Hai admin cập nhật cùng `version` gây conflict `409` cho request đến sau.
- Reorder hàng loạt cập nhật đúng `sortOrder` trong một transaction, rollback hoàn toàn nếu một phần tử lỗi.
- Bật/tắt hiển thị phản ánh đúng ngay trên public API.
- Xóa đặc sản loại bỏ đúng dữ liệu liên quan theo convention (cascade hoặc soft delete).
- Media không tồn tại/sai loại bị từ chối.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/specialties` và `GET /api/v1/specialties/:id` trả đúng dữ liệu tương đương `src/data/specialties.ts` hiện tại.
- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp mà không cần sửa code Mini App.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation, optimistic locking và xử lý concurrent update rõ ràng.
- Contract đủ để frontend Mini App thay dữ liệu hard-code trong `src/pages/specialties.tsx`, `src/pages/specialty-detail.tsx` và `src/data/specialties.ts` bằng gọi API.
