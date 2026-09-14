# Prompt xây dựng BE service cho chức năng Làng nghề

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Làng nghề** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`), **Đặc sản** (`SPECIALTIES-BE-SERVICE-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-BE-SERVICE-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-BE-SERVICE-PROMPT.md`) hoặc **OCOP** (`OCOP-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết Làng nghề nhưng dữ liệu đang hard-code ở frontend (`src/data/craft-villages.ts`). Giống Di tích lịch sử, Nông nghiệp và OCOP, trang này **đã có sẵn lớp service trung gian** (`src/services/craft-villages.ts` với `getCraftVillages(query)` và `getCraftVillageById(id)`, hiện chỉ đang lọc mảng local và trả `Promise`) — khi làm BE, chỉ cần giữ đúng chữ ký hai hàm này và đổi phần triển khai bên trong để gọi API thật, không cần sửa các trang đang dùng service này.

Mỗi làng nghề/cơ sở gồm:

1. Danh mục: `Thủ công truyền thống`, `Chế biến nông sản`, `Dịch vụ trải nghiệm` hoặc `Sản phẩm gia đình`.
2. Thông tin cơ bản: tên, địa chỉ, thời gian hoạt động, sản phẩm chính, ảnh đại diện.
3. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và mô tả chi tiết gồm nhiều đoạn văn.
4. Điểm nổi bật: danh sách chuỗi ngắn.
5. Ghi chú cho khách tham quan: một đoạn văn tự do.

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu). Người dùng Mini App chỉ được đọc các mục đang **hiển thị (active)**; mục đang ẩn/nháp tuyệt đối không được lộ qua public API.

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách làng nghề (hỗ trợ lọc theo danh mục) và chi tiết một mục theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự các mục.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng mục để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 5 mục hiện có trong `src/data/craft-villages.ts`, validation, phân quyền, test và tài liệu API.
- Cập nhật `src/services/craft-villages.ts` để gọi API thật thay vì lọc mảng local, giữ nguyên chữ ký `getCraftVillages(query)`/`getCraftVillageById(id)` để không phải sửa các trang đang dùng.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ hoặc lưu `description`/`highlights` dạng JSON theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "banh-trang-truong-mit",
  "name": "Nghề làm bánh tráng Truông Mít",
  "category": "Thủ công truyền thống",
  "address": "Các hộ sản xuất tại trung tâm xã Truông Mít",
  "workingTime": "05:00 - 15:00 hằng ngày",
  "mainProducts": "Bánh tráng phơi sương, bánh tráng nhúng, bánh tráng cuốn",
  "summary": "Nghề làm bánh tráng quy mô hộ gia đình, giữ nét thủ công...",
  "description": [
    "Đoạn mô tả thứ nhất.",
    "Đoạn mô tả thứ hai."
  ],
  "highlights": [
    "Có thể tham quan quy trình tráng và phơi bánh",
    "Dễ kết nối với sản phẩm OCOP và đặc sản"
  ],
  "visitorNote": "Nên liên hệ trước với hộ sản xuất để sắp xếp thời gian tham quan.",
  "imageUrl": "https://cdn.example.com/craft-villages/banh-trang-truong-mit.jpg",
  "imageAlt": "Nghề làm bánh tráng Truông Mít",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `category` là enum cố định `Thủ công truyền thống | Chế biến nông sản | Dịch vụ trải nghiệm | Sản phẩm gia đình`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/craft-villages/:id`); nếu cho phép đổi tên hiển thị, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `address`, `workingTime`, `mainProducts`, `visitorNote` là chuỗi tự do, không ép kiểu số/ngày (`workingTime` có thể là khung giờ cố định hoặc "Theo đơn đặt hàng"/"Theo mùa trái cây").
- `highlights` là mảng chuỗi đơn giản (không cần bản ghi con có ID riêng trừ khi dự án muốn quản lý như entity độc lập).
- `sortOrder` là số nguyên không âm; public API trả theo `sortOrder` tăng dần kèm tie-breaker ổn định (ví dụ `createdAt`).
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị.
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở các prompt trước nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/craft-villages`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `category` (`Thủ công truyền thống`/`Chế biến nông sản`/`Dịch vụ trải nghiệm`/`Sản phẩm gia đình`) để lọc, mặc định trả tất cả danh mục.
  - Chỉ trả bản ghi đang hiển thị, sắp xếp theo `sortOrder`.
- `GET /api/v1/craft-villages/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `description`, `highlights` và `visitorNote`.
  - Nếu mục không tồn tại hoặc đang ẩn, trả `404 CRAFT_VILLAGE_NOT_FOUND` theo error format chung (không tiết lộ mục đang ẩn tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/craft-villages`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, lọc theo `category`, tìm kiếm theo tên/địa chỉ, sắp theo `sortOrder`.
- `GET /api/admin/craft-villages/:id`: chi tiết một mục kèm `version`.
- `POST /api/admin/craft-villages`: tạo mục mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/craft-villages/:id`: cập nhật toàn bộ một mục; nhận `version` để optimistic locking.
- `DELETE /api/admin/craft-villages/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/craft-villages/:id/status`: bật/tắt hiển thị (`isActive`).
- `PATCH /api/admin/craft-villages/reorder`: nhận danh sách `{ id, sortOrder }` để cập nhật thứ tự hàng loạt trong một transaction.

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/craft-villages/:id`:

```json
{
  "version": 2,
  "name": "Nghề làm bánh tráng Truông Mít",
  "category": "Thủ công truyền thống",
  "address": "Các hộ sản xuất tại trung tâm xã Truông Mít",
  "workingTime": "05:00 - 15:00 hằng ngày",
  "mainProducts": "Bánh tráng phơi sương, bánh tráng nhúng, bánh tráng cuốn",
  "summary": "Nghề làm bánh tráng quy mô hộ gia đình...",
  "description": ["Đoạn 1", "Đoạn 2"],
  "highlights": ["Có thể tham quan quy trình tráng và phơi bánh"],
  "visitorNote": "Nên liên hệ trước với hộ sản xuất để sắp xếp thời gian tham quan.",
  "mediaId": "uuid",
  "imageAlt": "Nghề làm bánh tráng Truông Mít"
}
```

Khi `version` cũ, trả HTTP `409` với code `CRAFT_VILLAGE_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `name`, `address`, `workingTime`, `mainProducts`, `summary` không được rỗng sau khi trim.
- Giới hạn đề xuất: `name` 150 ký tự, `address` 255, `workingTime` 100, `mainProducts` 255, `summary` 300, `visitorNote` 2.000 ký tự, mỗi đoạn `description` 5.000 ký tự, mỗi phần tử `highlights` 200 ký tự.
- Giới hạn số phần tử: tối đa 20 đoạn `description`, tối đa 20 `highlights`.
- `category` phải thuộc enum `Thủ công truyền thống | Chế biến nông sản | Dịch vụ trải nghiệm | Sản phẩm gia đình`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- Slug/`id` khi tạo mới: sinh tự động từ `name` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 5 mục hiện có trong `src/data/craft-villages.ts` để sau deploy trang không bị trống:

- Nghề làm bánh tráng Truông Mít, Cơ sở làm muối ớt gia đình, Đan lát tre trúc, Sấy trái cây Thuận Bình, Trải nghiệm làm bánh dân gian.
- Giữ nguyên `id`/slug hiện tại của từng mục (ví dụ `banh-trang-truong-mit`) để không phá vỡ URL đang được liên kết trong app.
- Giữ nguyên toàn bộ `description`, `highlights` và `visitorNote` hiện có của từng mục.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (hiện dùng chung một ảnh placeholder `pottery.png` cho tất cả mục). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng mục, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả mục ẩn và trả đúng thứ tự theo `sortOrder`.
- Public list API lọc đúng theo `category`.
- Public detail API trả `404 CRAFT_VILLAGE_NOT_FOUND` cho mục không tồn tại hoặc đang ẩn.
- Người không có quyền bị `401/403` ở admin API.
- Tạo mới sinh `id`/slug hợp lệ và từ chối trùng slug.
- Cập nhật một mục không làm thay đổi `sortOrder` của mục khác.
- Hai admin cập nhật cùng `version` gây conflict `409` cho request đến sau.
- Reorder hàng loạt cập nhật đúng `sortOrder` trong một transaction, rollback hoàn toàn nếu một phần tử lỗi.
- Bật/tắt hiển thị phản ánh đúng ngay trên public API.
- Xóa mục loại bỏ đúng dữ liệu liên quan theo convention (cascade hoặc soft delete).
- Media không tồn tại/sai loại bị từ chối.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Cập nhật `src/services/craft-villages.ts` để gọi API thật, giữ nguyên chữ ký hàm hiện có.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/craft-villages` và `GET /api/v1/craft-villages/:id` trả đúng dữ liệu tương đương `src/data/craft-villages.ts` hiện tại.
- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp mà không cần sửa code Mini App.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation, optimistic locking và xử lý concurrent update rõ ràng.
- `src/pages/craft-villages.tsx` và `src/pages/craft-village-detail.tsx` hoạt động đúng mà không cần sửa, chỉ nhờ `src/services/craft-villages.ts` đổi sang gọi API thật.
