# Prompt xây dựng BE service cho chức năng Ẩm thực

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Ẩm thực** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`), **Đặc sản** (`SPECIALTIES-BE-SERVICE-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-BE-SERVICE-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-BE-SERVICE-PROMPT.md`), **OCOP** (`OCOP-BE-SERVICE-PROMPT.md`) hoặc **Làng nghề** (`CRAFT-VILLAGES-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết Ẩm thực nhưng dữ liệu đang hard-code ở frontend (`src/data/cuisine.ts`). Giống Di tích lịch sử, Nông nghiệp, OCOP và Làng nghề, trang này **đã có sẵn lớp service trung gian** (`src/services/cuisine.ts` với `getCuisineItems(query)` và `getCuisineItemById(id)`, hiện chỉ đang lọc mảng local và trả `Promise`) — khi làm BE, chỉ cần giữ đúng chữ ký hai hàm này và đổi phần triển khai bên trong để gọi API thật, không cần sửa `cuisine.tsx`/`cuisine-detail.tsx`.

Mỗi món ăn gồm:

1. Danh mục: `Món nước`, `Món nướng`, `Món cuốn`, `Ăn vặt` hoặc `Món chay`.
2. Thông tin cơ bản: tên, khoảng giá, thời điểm nên ăn, ảnh đại diện.
3. Địa điểm gợi ý: danh sách chuỗi mô tả nơi có thể thưởng thức.
4. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và mô tả chi tiết gồm nhiều đoạn văn.
5. Điểm nổi bật: danh sách chuỗi ngắn.
6. Mẹo thưởng thức: một đoạn văn tự do.

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu). Người dùng Mini App chỉ được đọc các món đang **hiển thị (active)**; món đang ẩn/nháp tuyệt đối không được lộ qua public API.

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách món ăn (hỗ trợ lọc theo danh mục) và chi tiết một món theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự các món.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng món để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 5 món hiện có trong `src/data/cuisine.ts`, validation, phân quyền, test và tài liệu API.
- Cập nhật `src/services/cuisine.ts` để gọi API thật thay vì lọc mảng local, giữ nguyên chữ ký `getCuisineItems(query)`/`getCuisineItemById(id)` để không phải sửa các trang đang dùng.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ hoặc lưu `description`/`highlights`/`suggestedPlaces` dạng JSON theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "banh-canh-trang-bang",
  "name": "Bánh canh Trảng Bàng",
  "category": "Món nước",
  "priceRange": "35.000đ - 55.000đ/tô",
  "bestTime": "Buổi sáng hoặc chiều tối",
  "suggestedPlaces": [
    "Quán ăn khu trung tâm xã",
    "Các điểm ăn sáng dọc tỉnh lộ 784"
  ],
  "summary": "Tô bánh canh nóng với sợi mềm, nước dùng ngọt thanh...",
  "description": [
    "Đoạn mô tả thứ nhất.",
    "Đoạn mô tả thứ hai."
  ],
  "highlights": [
    "Phù hợp ăn sáng, ăn nhẹ hoặc dùng sau khi tham quan",
    "Hương vị dễ ăn với nhiều nhóm khách"
  ],
  "tip": "Nên ăn lúc còn nóng; nếu đi theo nhóm đông nên gọi trước.",
  "imageUrl": "https://cdn.example.com/cuisine/banh-canh-trang-bang.jpg",
  "imageAlt": "Bánh canh Trảng Bàng",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `category` là enum cố định `Món nước | Món nướng | Món cuốn | Ăn vặt | Món chay`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/cuisine/:id`); nếu cho phép đổi tên hiển thị, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `priceRange`, `bestTime`, `tip` là chuỗi tự do, không ép kiểu số/ngày.
- `suggestedPlaces` và `highlights` là mảng chuỗi đơn giản (không cần bản ghi con có ID riêng trừ khi dự án muốn quản lý như entity độc lập).
- `sortOrder` là số nguyên không âm; public API trả theo `sortOrder` tăng dần kèm tie-breaker ổn định (ví dụ `createdAt`).
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị.
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.
- Lưu ý dữ liệu mẫu có `id` "nem-buoi-chay" khác với `id` "nem-buoi" bên Đặc sản dù mô tả món tương tự — đây là hai bảng độc lập, giữ nguyên `id` riêng của từng chức năng, không gộp hay dùng khóa ngoại chéo trừ khi có yêu cầu tường minh khác.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở các prompt trước nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/cuisine`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `category` (`Món nước`/`Món nướng`/`Món cuốn`/`Ăn vặt`/`Món chay`) để lọc, mặc định trả tất cả danh mục.
  - Chỉ trả bản ghi đang hiển thị, sắp xếp theo `sortOrder`.
- `GET /api/v1/cuisine/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `description`, `highlights`, `suggestedPlaces` và `tip`.
  - Nếu món không tồn tại hoặc đang ẩn, trả `404 CUISINE_ITEM_NOT_FOUND` theo error format chung (không tiết lộ món đang ẩn tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/cuisine`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, lọc theo `category`, tìm kiếm theo tên, sắp theo `sortOrder`.
- `GET /api/admin/cuisine/:id`: chi tiết một món kèm `version`.
- `POST /api/admin/cuisine`: tạo món mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/cuisine/:id`: cập nhật toàn bộ một món; nhận `version` để optimistic locking.
- `DELETE /api/admin/cuisine/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/cuisine/:id/status`: bật/tắt hiển thị (`isActive`).
- `PATCH /api/admin/cuisine/reorder`: nhận danh sách `{ id, sortOrder }` để cập nhật thứ tự hàng loạt trong một transaction.

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/cuisine/:id`:

```json
{
  "version": 2,
  "name": "Bánh canh Trảng Bàng",
  "category": "Món nước",
  "priceRange": "35.000đ - 55.000đ/tô",
  "bestTime": "Buổi sáng hoặc chiều tối",
  "suggestedPlaces": ["Quán ăn khu trung tâm xã"],
  "summary": "Tô bánh canh nóng với sợi mềm...",
  "description": ["Đoạn 1", "Đoạn 2"],
  "highlights": ["Phù hợp ăn sáng, ăn nhẹ hoặc dùng sau khi tham quan"],
  "tip": "Nên ăn lúc còn nóng.",
  "mediaId": "uuid",
  "imageAlt": "Bánh canh Trảng Bàng"
}
```

Khi `version` cũ, trả HTTP `409` với code `CUISINE_ITEM_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `name`, `priceRange`, `bestTime`, `summary` không được rỗng sau khi trim.
- Giới hạn đề xuất: `name` 150 ký tự, `priceRange` 100, `bestTime` 100, `summary` 300, `tip` 2.000 ký tự, mỗi đoạn `description` 5.000 ký tự, mỗi phần tử `highlights`/`suggestedPlaces` 200 ký tự.
- Giới hạn số phần tử: tối đa 20 đoạn `description`, tối đa 20 `highlights`, tối đa 20 `suggestedPlaces`.
- `category` phải thuộc enum `Món nước | Món nướng | Món cuốn | Ăn vặt | Món chay`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- Slug/`id` khi tạo mới: sinh tự động từ `name` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 5 món hiện có trong `src/data/cuisine.ts` để sau deploy trang không bị trống:

- Bánh canh Trảng Bàng, Bò tơ nướng cuốn rau rừng, Gỏi cuốn bánh tráng phơi sương, Bánh tráng trộn, Nem bưởi chay.
- Giữ nguyên `id`/slug hiện tại của từng món (ví dụ `banh-canh-trang-bang`) để không phá vỡ URL đang được liên kết trong app.
- Giữ nguyên toàn bộ `description`, `highlights`, `suggestedPlaces` và `tip` hiện có của từng món.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (hiện dùng chung một ảnh placeholder `fried-rice.png` cho tất cả món). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng món, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả món ẩn và trả đúng thứ tự theo `sortOrder`.
- Public list API lọc đúng theo `category`.
- Public detail API trả `404 CUISINE_ITEM_NOT_FOUND` cho món không tồn tại hoặc đang ẩn.
- Người không có quyền bị `401/403` ở admin API.
- Tạo mới sinh `id`/slug hợp lệ và từ chối trùng slug.
- Cập nhật một món không làm thay đổi `sortOrder` của món khác.
- Hai admin cập nhật cùng `version` gây conflict `409` cho request đến sau.
- Reorder hàng loạt cập nhật đúng `sortOrder` trong một transaction, rollback hoàn toàn nếu một phần tử lỗi.
- Bật/tắt hiển thị phản ánh đúng ngay trên public API.
- Xóa món loại bỏ đúng dữ liệu liên quan theo convention (cascade hoặc soft delete).
- Media không tồn tại/sai loại bị từ chối.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Cập nhật `src/services/cuisine.ts` để gọi API thật, giữ nguyên chữ ký hàm hiện có.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/cuisine` và `GET /api/v1/cuisine/:id` trả đúng dữ liệu tương đương `src/data/cuisine.ts` hiện tại.
- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp mà không cần sửa code Mini App.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation, optimistic locking và xử lý concurrent update rõ ràng.
- `src/pages/cuisine.tsx` và `src/pages/cuisine-detail.tsx` hoạt động đúng mà không cần sửa, chỉ nhờ `src/services/cuisine.ts` đổi sang gọi API thật.
