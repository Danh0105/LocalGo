# Prompt xây dựng BE service cho chức năng OCOP

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **OCOP** (One Commune One Product) của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`), **Đặc sản** (`SPECIALTIES-BE-SERVICE-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-BE-SERVICE-PROMPT.md`) hoặc **Nông nghiệp** (`AGRICULTURE-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết sản phẩm OCOP nhưng dữ liệu đang hard-code ở frontend (`src/data/ocop.ts`). Giống Di tích lịch sử và Nông nghiệp, trang này **đã có sẵn lớp service trung gian** (`src/services/ocop.ts` với `getOcopProducts(query)` và `getOcopProductById(id)`, hiện chỉ đang lọc mảng local và trả `Promise`) — khi làm BE, chỉ cần giữ đúng chữ ký hai hàm này và đổi phần triển khai bên trong để gọi API thật, không cần sửa `ocop.tsx`/`ocop-detail.tsx`. Dữ liệu mẫu hiện tại có nhiều `contactNote` ghi chú rõ đây là dữ liệu mẫu chờ API, xác nhận đúng hướng thiết kế này.

Mỗi sản phẩm OCOP gồm:

1. Danh mục: `Thực phẩm`, `Đồ uống`, `Nông sản tươi` hoặc `Sản phẩm chế biến`.
2. Hạng sao OCOP: `3`, `4` hoặc `5` sao — đây là hạng chứng nhận chính thức theo chương trình OCOP, không phải rating do người dùng đánh giá.
3. Thông tin cơ bản: tên, nhà sản xuất, địa chỉ, khoảng giá, ảnh đại diện.
4. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và giới thiệu sản phẩm gồm nhiều đoạn văn.
5. Điểm nổi bật: danh sách chuỗi ngắn.
6. Ghi chú kết nối: một đoạn văn tự do.

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu). Người dùng Mini App chỉ được đọc các sản phẩm đang **hiển thị (active)**; sản phẩm đang ẩn/nháp tuyệt đối không được lộ qua public API.

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách sản phẩm OCOP (hỗ trợ lọc theo danh mục và hạng sao) và chi tiết một sản phẩm theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự các sản phẩm.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng sản phẩm để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 5 sản phẩm hiện có trong `src/data/ocop.ts`, validation, phân quyền, test và tài liệu API.
- Cập nhật `src/services/ocop.ts` để gọi API thật thay vì lọc mảng local, giữ nguyên chữ ký `getOcopProducts(query)`/`getOcopProductById(id)` để không phải sửa các trang đang dùng.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ hoặc lưu `description`/`highlights` dạng JSON theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "mat-ong-rung-truong-mit",
  "name": "Mật ong rừng Truông Mít",
  "category": "Thực phẩm",
  "rating": 4,
  "producer": "Tổ hợp tác ong mật Thuận Bình",
  "address": "Ấp Thuận Bình, xã Truông Mít",
  "priceRange": "120.000đ - 180.000đ/chai",
  "summary": "Mật ong khai thác theo mùa, vị ngọt thanh...",
  "description": [
    "Đoạn mô tả thứ nhất.",
    "Đoạn mô tả thứ hai."
  ],
  "highlights": [
    "Đóng chai tiện lợi, dễ trưng bày tại điểm bán",
    "Có thể phát triển tem truy xuất nguồn gốc"
  ],
  "contactNote": "Liên hệ tổ hợp tác để đặt hàng số lượng lớn.",
  "imageUrl": "https://cdn.example.com/ocop/mat-ong-rung-truong-mit.jpg",
  "imageAlt": "Mật ong rừng Truông Mít",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `category` là enum cố định `Thực phẩm | Đồ uống | Nông sản tươi | Sản phẩm chế biến`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `rating` là enum số cố định `3 | 4 | 5` (hạng sao OCOP chính thức), không phải thang điểm tự do 1-5 hay rating trung bình do người dùng bình chọn; từ chối giá trị khác `3/4/5`.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/ocop/:id`); nếu cho phép đổi tên hiển thị, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `producer`, `address`, `priceRange`, `contactNote` là chuỗi tự do, không ép kiểu số/ngày (`priceRange` có thể là khoảng giá hoặc "Theo mùa vụ").
- `highlights` là mảng chuỗi đơn giản (không cần bản ghi con có ID riêng trừ khi dự án muốn quản lý như entity độc lập).
- `sortOrder` là số nguyên không âm; public API trả theo `sortOrder` tăng dần kèm tie-breaker ổn định (ví dụ `createdAt`).
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị.
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở các prompt trước nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/ocop`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `category` (`Thực phẩm`/`Đồ uống`/`Nông sản tươi`/`Sản phẩm chế biến`) và `rating` (`3`/`4`/`5`) để lọc, mặc định trả tất cả.
  - Chỉ trả bản ghi đang hiển thị, sắp xếp theo `sortOrder`.
- `GET /api/v1/ocop/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `description`, `highlights` và `contactNote`.
  - Nếu sản phẩm không tồn tại hoặc đang ẩn, trả `404 OCOP_PRODUCT_NOT_FOUND` theo error format chung (không tiết lộ sản phẩm đang ẩn tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/ocop`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, lọc theo `category`/`rating`, tìm kiếm theo tên/nhà sản xuất, sắp theo `sortOrder`.
- `GET /api/admin/ocop/:id`: chi tiết một sản phẩm kèm `version`.
- `POST /api/admin/ocop`: tạo sản phẩm mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/ocop/:id`: cập nhật toàn bộ một sản phẩm; nhận `version` để optimistic locking.
- `DELETE /api/admin/ocop/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/ocop/:id/status`: bật/tắt hiển thị (`isActive`).
- `PATCH /api/admin/ocop/reorder`: nhận danh sách `{ id, sortOrder }` để cập nhật thứ tự hàng loạt trong một transaction.

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/ocop/:id`:

```json
{
  "version": 2,
  "name": "Mật ong rừng Truông Mít",
  "category": "Thực phẩm",
  "rating": 4,
  "producer": "Tổ hợp tác ong mật Thuận Bình",
  "address": "Ấp Thuận Bình, xã Truông Mít",
  "priceRange": "120.000đ - 180.000đ/chai",
  "summary": "Mật ong khai thác theo mùa...",
  "description": ["Đoạn 1", "Đoạn 2"],
  "highlights": ["Đóng chai tiện lợi, dễ trưng bày tại điểm bán"],
  "contactNote": "Liên hệ tổ hợp tác để đặt hàng số lượng lớn.",
  "mediaId": "uuid",
  "imageAlt": "Mật ong rừng Truông Mít"
}
```

Khi `version` cũ, trả HTTP `409` với code `OCOP_PRODUCT_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `name`, `producer`, `address`, `priceRange`, `summary` không được rỗng sau khi trim.
- Giới hạn đề xuất: `name` 150 ký tự, `producer` 150, `address` 255, `priceRange` 100, `summary` 300, `contactNote` 2.000 ký tự, mỗi đoạn `description` 5.000 ký tự, mỗi phần tử `highlights` 200 ký tự.
- Giới hạn số phần tử: tối đa 20 đoạn `description`, tối đa 20 `highlights`.
- `category` phải thuộc enum `Thực phẩm | Đồ uống | Nông sản tươi | Sản phẩm chế biến`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- `rating` phải thuộc tập `{3, 4, 5}`, từ chối giá trị khác (kể cả 1, 2 hoặc số thập phân) với `400 VALIDATION_ERROR`.
- Slug/`id` khi tạo mới: sinh tự động từ `name` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 5 sản phẩm hiện có trong `src/data/ocop.ts` để sau deploy trang không bị trống:

- Mật ong rừng Truông Mít, Trà lá sa kê sấy khô, Sầu riêng Thuận Bình, Muối ớt xanh Truông Mít, Bánh tráng phơi sương.
- Giữ nguyên `id`/slug hiện tại của từng sản phẩm (ví dụ `mat-ong-rung-truong-mit`) để không phá vỡ URL đang được liên kết trong app. Lưu ý sản phẩm `sau-rieng-thuan-binh` và `banh-trang-phoi-suong` trùng `id` với hai bản ghi tương ứng bên chức năng Đặc sản — đây là hai bảng dữ liệu độc lập, giữ nguyên `id` riêng của từng chức năng, không gộp chung hay dùng khóa ngoại chéo trừ khi có yêu cầu tường minh khác.
- Giữ nguyên toàn bộ `description`, `highlights` và `contactNote` hiện có của từng sản phẩm.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (hiện dùng chung một ảnh placeholder `icon-13.png` cho tất cả sản phẩm). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng sản phẩm, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả sản phẩm ẩn và trả đúng thứ tự theo `sortOrder`.
- Public list API lọc đúng theo `category` và theo `rating`.
- Public detail API trả `404 OCOP_PRODUCT_NOT_FOUND` cho sản phẩm không tồn tại hoặc đang ẩn.
- Người không có quyền bị `401/403` ở admin API.
- Tạo mới sinh `id`/slug hợp lệ và từ chối trùng slug.
- Tạo/cập nhật sản phẩm với `rating` ngoài tập `{3,4,5}` bị từ chối.
- Cập nhật một sản phẩm không làm thay đổi `sortOrder` của sản phẩm khác.
- Hai admin cập nhật cùng `version` gây conflict `409` cho request đến sau.
- Reorder hàng loạt cập nhật đúng `sortOrder` trong một transaction, rollback hoàn toàn nếu một phần tử lỗi.
- Bật/tắt hiển thị phản ánh đúng ngay trên public API.
- Xóa sản phẩm loại bỏ đúng dữ liệu liên quan theo convention (cascade hoặc soft delete).
- Media không tồn tại/sai loại bị từ chối.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Cập nhật `src/services/ocop.ts` để gọi API thật, giữ nguyên chữ ký hàm hiện có.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/ocop` và `GET /api/v1/ocop/:id` trả đúng dữ liệu tương đương `src/data/ocop.ts` hiện tại.
- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp mà không cần sửa code Mini App.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation, optimistic locking và xử lý concurrent update rõ ràng.
- `src/pages/ocop.tsx` và `src/pages/ocop-detail.tsx` hoạt động đúng mà không cần sửa, chỉ nhờ `src/services/ocop.ts` đổi sang gọi API thật.
