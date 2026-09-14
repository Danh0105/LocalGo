# Prompt xây dựng BE service cho chức năng Tour trải nghiệm

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Tour trải nghiệm** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`), **Đặc sản** (`SPECIALTIES-BE-SERVICE-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-BE-SERVICE-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-BE-SERVICE-PROMPT.md`), **OCOP** (`OCOP-BE-SERVICE-PROMPT.md`), **Làng nghề** (`CRAFT-VILLAGES-BE-SERVICE-PROMPT.md`), **Ẩm thực** (`CUISINE-BE-SERVICE-PROMPT.md`) hoặc **Lễ hội** (`FESTIVALS-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết Tour trải nghiệm nhưng dữ liệu đang hard-code ở frontend (`src/data/experience-tours.ts`). Giống các chức năng danh sách khác, trang này **đã có sẵn lớp service trung gian** (`src/services/experience-tours.ts` với `getExperienceTours(query)` và `getExperienceTourById(id)`, hiện chỉ đang lọc mảng local và trả `Promise`) — khi làm BE, chỉ cần giữ đúng chữ ký hai hàm này và đổi phần triển khai bên trong để gọi API thật, không cần sửa `experience-tours.tsx`/`experience-tour-detail.tsx`.

Mỗi tour trải nghiệm gồm:

1. Danh mục: `Nửa ngày`, `Một ngày`, `Gia đình`, `Học sinh` hoặc `Nông nghiệp`.
2. Thông tin cơ bản: tên, thời lượng, khung giờ khởi hành, khoảng giá, điểm hẹn, ảnh đại diện.
3. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và mô tả chi tiết gồm nhiều đoạn văn.
4. Lịch trình: danh sách chuỗi theo thứ tự các bước trong tour.
5. Bao gồm: danh sách chuỗi mô tả những gì tour cung cấp.
6. Ghi chú: một đoạn văn tự do.

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu). Người dùng Mini App chỉ được đọc các tour đang **hiển thị (active)**; tour đang ẩn/nháp tuyệt đối không được lộ qua public API.

**Lưu ý nghiệp vụ quan trọng**: khác các danh sách chuỗi khác (`highlights`, `activities`), trường `itinerary` (lịch trình) có tính **thứ tự nội tại bắt buộc** — mỗi phần tử là một bước diễn ra tuần tự trong tour, thứ tự trong mảng chính là thứ tự thực hiện và phải được giữ nguyên qua các lần cập nhật, không được sắp xếp lại tự động theo tiêu chí khác (ví dụ alphabet).

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách tour (hỗ trợ lọc theo danh mục) và chi tiết một tour theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự hiển thị các tour.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng tour để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 5 tour hiện có trong `src/data/experience-tours.ts`, validation, phân quyền, test và tài liệu API.
- Cập nhật `src/services/experience-tours.ts` để gọi API thật thay vì lọc mảng local, giữ nguyên chữ ký `getExperienceTours(query)`/`getExperienceTourById(id)` để không phải sửa các trang đang dùng.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ hoặc lưu `description`/`itinerary`/`included` dạng JSON theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "mot-ngay-lam-nong-dan",
  "name": "Một ngày làm nông dân Truông Mít",
  "category": "Nông nghiệp",
  "duration": "1 ngày",
  "startTime": "07:30 - 16:30",
  "priceRange": "250.000đ - 380.000đ/người",
  "meetingPoint": "Trung tâm xã Truông Mít",
  "summary": "Tour trải nghiệm làm vườn, tham quan kênh tưới, dùng bữa quê...",
  "description": [
    "Đoạn mô tả thứ nhất.",
    "Đoạn mô tả thứ hai."
  ],
  "itinerary": [
    "Đón khách tại trung tâm xã, giới thiệu chương trình",
    "Tham quan vườn cây ăn trái hoặc vùng mía theo mùa"
  ],
  "included": [
    "Hướng dẫn viên địa phương",
    "Bữa trưa quê"
  ],
  "note": "Cập nhật ngày khởi hành, số chỗ còn lại và form đặt tour.",
  "imageUrl": "https://cdn.example.com/experience-tours/mot-ngay-lam-nong-dan.jpg",
  "imageAlt": "Một ngày làm nông dân Truông Mít",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `category` là enum cố định `Nửa ngày | Một ngày | Gia đình | Học sinh | Nông nghiệp`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/experience-tours/:id`); nếu cho phép đổi tên hiển thị, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `duration`, `startTime`, `priceRange`, `meetingPoint`, `note` là chuỗi tự do, không ép kiểu số/ngày (`priceRange` có thể là "Theo số lượng đoàn").
- `itinerary` là mảng chuỗi có **thứ tự cố định theo trình tự thực hiện** (khác `sortOrder` cấp bản ghi, đây là thứ tự nội bộ trong 1 tour) — nếu chuẩn hóa thành bảng con, phải có cột `stepOrder` riêng và giữ nguyên khi trả về.
- `included` là mảng chuỗi đơn giản, không yêu cầu thứ tự chặt như `itinerary` nhưng vẫn nên giữ thứ tự nhập của admin.
- `sortOrder` là số nguyên không âm ở cấp bản ghi (thứ tự tour trong danh sách); public API trả theo `sortOrder` tăng dần kèm tie-breaker ổn định (ví dụ `createdAt`).
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị.
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở các prompt trước nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/experience-tours`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `category` (`Nửa ngày`/`Một ngày`/`Gia đình`/`Học sinh`/`Nông nghiệp`) để lọc, mặc định trả tất cả danh mục.
  - Chỉ trả bản ghi đang hiển thị, sắp xếp theo `sortOrder`.
- `GET /api/v1/experience-tours/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `description`, `itinerary`, `included` và `note`, giữ đúng thứ tự các bước trong `itinerary`.
  - Nếu tour không tồn tại hoặc đang ẩn, trả `404 EXPERIENCE_TOUR_NOT_FOUND` theo error format chung (không tiết lộ tour đang ẩn tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/experience-tours`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, lọc theo `category`, tìm kiếm theo tên/điểm hẹn, sắp theo `sortOrder`.
- `GET /api/admin/experience-tours/:id`: chi tiết một tour kèm `version`.
- `POST /api/admin/experience-tours`: tạo tour mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/experience-tours/:id`: cập nhật toàn bộ một tour; nhận `version` để optimistic locking.
- `DELETE /api/admin/experience-tours/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/experience-tours/:id/status`: bật/tắt hiển thị (`isActive`).
- `PATCH /api/admin/experience-tours/reorder`: nhận danh sách `{ id, sortOrder }` để cập nhật thứ tự hiển thị hàng loạt trong một transaction (không liên quan tới thứ tự bước trong `itinerary`).

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/experience-tours/:id`:

```json
{
  "version": 2,
  "name": "Một ngày làm nông dân Truông Mít",
  "category": "Nông nghiệp",
  "duration": "1 ngày",
  "startTime": "07:30 - 16:30",
  "priceRange": "250.000đ - 380.000đ/người",
  "meetingPoint": "Trung tâm xã Truông Mít",
  "summary": "Tour trải nghiệm làm vườn...",
  "description": ["Đoạn 1", "Đoạn 2"],
  "itinerary": ["Đón khách tại trung tâm xã, giới thiệu chương trình", "Tham quan vườn cây ăn trái"],
  "included": ["Hướng dẫn viên địa phương", "Bữa trưa quê"],
  "note": "Cập nhật ngày khởi hành và số chỗ còn lại.",
  "mediaId": "uuid",
  "imageAlt": "Một ngày làm nông dân Truông Mít"
}
```

Khi `version` cũ, trả HTTP `409` với code `EXPERIENCE_TOUR_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `name`, `duration`, `startTime`, `priceRange`, `meetingPoint`, `summary` không được rỗng sau khi trim.
- Giới hạn đề xuất: `name` 150 ký tự, `duration` 100, `startTime` 100, `priceRange` 100, `meetingPoint` 255, `summary` 300, `note` 2.000 ký tự, mỗi đoạn `description` 5.000 ký tự, mỗi phần tử `itinerary`/`included` 300 ký tự.
- Giới hạn số phần tử: tối đa 20 đoạn `description`, tối đa 30 bước `itinerary`, tối đa 20 `included`.
- Yêu cầu tối thiểu 1 bước `itinerary` khi publish/kích hoạt (không cho tour hiển thị mà không có lịch trình).
- `category` phải thuộc enum `Nửa ngày | Một ngày | Gia đình | Học sinh | Nông nghiệp`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- Slug/`id` khi tạo mới: sinh tự động từ `name` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 5 tour hiện có trong `src/data/experience-tours.ts` để sau deploy trang không bị trống:

- Một ngày làm nông dân Truông Mít, Đạp xe ven kênh Đông, Làm bánh tráng và thưởng thức ẩm thực, Học sinh khám phá quê hương, Check-in hoàng hôn đồng quê.
- Giữ nguyên `id`/slug hiện tại của từng tour (ví dụ `mot-ngay-lam-nong-dan`) để không phá vỡ URL đang được liên kết trong app.
- Giữ nguyên toàn bộ `description`, `itinerary` (đúng thứ tự), `included` và `note` hiện có của từng tour.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (hiện dùng chung một ảnh placeholder `world-tour.png` cho tất cả tour). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng tour, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả tour ẩn và trả đúng thứ tự theo `sortOrder`.
- Public list API lọc đúng theo `category`.
- Public detail API trả `404 EXPERIENCE_TOUR_NOT_FOUND` cho tour không tồn tại hoặc đang ẩn.
- Public detail API trả `itinerary` đúng thứ tự bước như đã lưu, không bị sắp xếp lại.
- Người không có quyền bị `401/403` ở admin API.
- Tạo mới sinh `id`/slug hợp lệ và từ chối trùng slug.
- Cập nhật một tour không làm thay đổi `sortOrder` của tour khác.
- Hai admin cập nhật cùng `version` gây conflict `409` cho request đến sau.
- Reorder hàng loạt cập nhật đúng `sortOrder` (cấp bản ghi) trong một transaction, rollback hoàn toàn nếu một phần tử lỗi.
- Bật/tắt hiển thị phản ánh đúng ngay trên public API.
- Xóa tour loại bỏ đúng dữ liệu liên quan theo convention (cascade hoặc soft delete).
- Media không tồn tại/sai loại bị từ chối.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Cập nhật `src/services/experience-tours.ts` để gọi API thật, giữ nguyên chữ ký hàm hiện có.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/experience-tours` và `GET /api/v1/experience-tours/:id` trả đúng dữ liệu tương đương `src/data/experience-tours.ts` hiện tại, kể cả thứ tự `itinerary`.
- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp mà không cần sửa code Mini App.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation, optimistic locking và xử lý concurrent update rõ ràng.
- `src/pages/experience-tours.tsx` và `src/pages/experience-tour-detail.tsx` hoạt động đúng mà không cần sửa, chỉ nhờ `src/services/experience-tours.ts` đổi sang gọi API thật.
