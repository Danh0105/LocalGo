# Prompt xây dựng BE service cho chức năng Nông nghiệp

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Nông nghiệp** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`), **Đặc sản** (`SPECIALTIES-BE-SERVICE-PROMPT.md`) hoặc **Di tích lịch sử** (`HISTORICAL-SITES-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết Nông nghiệp nhưng dữ liệu đang hard-code ở frontend (`src/data/agriculture.ts`). Giống Di tích lịch sử, trang này **đã có sẵn lớp service trung gian** (`src/services/agriculture.ts` với `getAgricultureItems(query)` và `getAgricultureItemById(id)`, hiện chỉ đang lọc mảng local và trả `Promise`) — khi làm BE, chỉ cần giữ đúng chữ ký hai hàm này và đổi phần triển khai bên trong để gọi API thật, không cần sửa `agriculture.tsx`/`agriculture-detail.tsx`. Dữ liệu mẫu hiện tại còn ghi chú tường minh trong item "Tổ hợp tác nông sản sạch" rằng nội dung là placeholder chờ API, xác nhận đúng hướng thiết kế này.

Mỗi mô hình/nội dung nông nghiệp gồm:

1. Danh mục: `Cây trồng chủ lực`, `Chăn nuôi`, `Thủy lợi` hoặc `Mô hình sản xuất`.
2. Thông tin cơ bản: tên, khu vực/vị trí, mùa vụ, quy mô, ảnh đại diện.
3. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và thông tin mô hình gồm nhiều đoạn văn.
4. Điểm nổi bật: danh sách chuỗi ngắn.
5. Hỗ trợ người dân: một đoạn văn tự do (thông tin liên hệ/hướng dẫn hỗ trợ).

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu). Người dùng Mini App chỉ được đọc các mục đang **hiển thị (active)**; mục đang ẩn/nháp tuyệt đối không được lộ qua public API.

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách nội dung nông nghiệp (hỗ trợ lọc theo danh mục) và chi tiết một mục theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự các mục.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng mục để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 5 mục hiện có trong `src/data/agriculture.ts`, validation, phân quyền, test và tài liệu API.
- Cập nhật `src/services/agriculture.ts` để gọi API thật thay vì lọc mảng local, giữ nguyên chữ ký `getAgricultureItems(query)`/`getAgricultureItemById(id)` để không phải sửa các trang đang dùng.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ hoặc lưu `description`/`highlights` dạng JSON theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "vung-nguyen-lieu-mia",
  "name": "Vùng nguyên liệu mía Lộc Trung",
  "category": "Cây trồng chủ lực",
  "location": "Ấp Lộc Trung và các khu sản xuất lân cận",
  "season": "Trồng mới từ tháng 4 - 6, thu hoạch tháng 11 - 3",
  "scale": "Khoảng 420 ha",
  "summary": "Vùng mía tập trung của xã, cung cấp nguyên liệu ổn định...",
  "description": [
    "Đoạn mô tả thứ nhất.",
    "Đoạn mô tả thứ hai."
  ],
  "highlights": [
    "Có vùng sản xuất tập trung, thuận lợi liên kết tiêu thụ",
    "Ứng dụng tưới tiết kiệm ở một số diện tích"
  ],
  "support": "Khuyến khích hộ dân đăng ký tham gia tổ liên kết để được cập nhật lịch thu mua...",
  "imageUrl": "https://cdn.example.com/agriculture/vung-nguyen-lieu-mia.jpg",
  "imageAlt": "Vùng nguyên liệu mía Lộc Trung",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `category` là enum cố định `Cây trồng chủ lực | Chăn nuôi | Thủy lợi | Mô hình sản xuất`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/agriculture/:id`); nếu cho phép đổi tên hiển thị, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `location`, `season`, `scale`, `support` là chuỗi tự do, không ép kiểu số/ngày (ví dụ `scale` có thể là diện tích, quy mô hộ, hoặc mô tả định tính).
- `highlights` là mảng chuỗi đơn giản (không cần bản ghi con có ID riêng trừ khi dự án muốn quản lý như entity độc lập).
- `sortOrder` là số nguyên không âm; public API trả theo `sortOrder` tăng dần kèm tie-breaker ổn định (ví dụ `createdAt`).
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị.
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở các prompt trước nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/agriculture`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `category` (`Cây trồng chủ lực`/`Chăn nuôi`/`Thủy lợi`/`Mô hình sản xuất`) để lọc, mặc định trả tất cả danh mục.
  - Chỉ trả bản ghi đang hiển thị, sắp xếp theo `sortOrder`.
- `GET /api/v1/agriculture/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `description`, `highlights` và `support`.
  - Nếu mục không tồn tại hoặc đang ẩn, trả `404 AGRICULTURE_ITEM_NOT_FOUND` theo error format chung (không tiết lộ mục đang ẩn tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/agriculture`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, lọc theo `category`, tìm kiếm theo tên/khu vực, sắp theo `sortOrder`.
- `GET /api/admin/agriculture/:id`: chi tiết một mục kèm `version`.
- `POST /api/admin/agriculture`: tạo mục mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/agriculture/:id`: cập nhật toàn bộ một mục; nhận `version` để optimistic locking.
- `DELETE /api/admin/agriculture/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/agriculture/:id/status`: bật/tắt hiển thị (`isActive`).
- `PATCH /api/admin/agriculture/reorder`: nhận danh sách `{ id, sortOrder }` để cập nhật thứ tự hàng loạt trong một transaction.

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/agriculture/:id`:

```json
{
  "version": 2,
  "name": "Vùng nguyên liệu mía Lộc Trung",
  "category": "Cây trồng chủ lực",
  "location": "Ấp Lộc Trung và các khu sản xuất lân cận",
  "season": "Trồng mới từ tháng 4 - 6, thu hoạch tháng 11 - 3",
  "scale": "Khoảng 420 ha",
  "summary": "Vùng mía tập trung của xã...",
  "description": ["Đoạn 1", "Đoạn 2"],
  "highlights": ["Có vùng sản xuất tập trung, thuận lợi liên kết tiêu thụ"],
  "support": "Khuyến khích hộ dân đăng ký tham gia tổ liên kết...",
  "mediaId": "uuid",
  "imageAlt": "Vùng nguyên liệu mía Lộc Trung"
}
```

Khi `version` cũ, trả HTTP `409` với code `AGRICULTURE_ITEM_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `name`, `location`, `season`, `scale`, `summary`, `support` không được rỗng sau khi trim.
- Giới hạn đề xuất: `name` 150 ký tự, `location` 255, `season` 150, `scale` 150, `summary` 300, `support` 2.000 ký tự, mỗi đoạn `description` 5.000 ký tự, mỗi phần tử `highlights` 200 ký tự.
- Giới hạn số phần tử: tối đa 20 đoạn `description`, tối đa 20 `highlights`.
- `category` phải thuộc enum `Cây trồng chủ lực | Chăn nuôi | Thủy lợi | Mô hình sản xuất`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- Slug/`id` khi tạo mới: sinh tự động từ `name` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 5 mục hiện có trong `src/data/agriculture.ts` để sau deploy trang không bị trống:

- Vùng nguyên liệu mía Lộc Trung, Vườn cây ăn trái Thuận Bình, Mô hình chăn nuôi bò sinh sản, Hệ thống kênh tưới nội đồng, Tổ hợp tác nông sản sạch.
- Giữ nguyên `id`/slug hiện tại của từng mục (ví dụ `vung-nguyen-lieu-mia`) để không phá vỡ URL đang được liên kết trong app.
- Giữ nguyên toàn bộ `description`, `highlights` và `support` hiện có của từng mục.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (hiện dùng chung một ảnh placeholder `tractor.png` cho tất cả mục). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng mục, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả mục ẩn và trả đúng thứ tự theo `sortOrder`.
- Public list API lọc đúng theo `category`.
- Public detail API trả `404 AGRICULTURE_ITEM_NOT_FOUND` cho mục không tồn tại hoặc đang ẩn.
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
- Cập nhật `src/services/agriculture.ts` để gọi API thật, giữ nguyên chữ ký hàm hiện có.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/agriculture` và `GET /api/v1/agriculture/:id` trả đúng dữ liệu tương đương `src/data/agriculture.ts` hiện tại.
- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp mà không cần sửa code Mini App.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation, optimistic locking và xử lý concurrent update rõ ràng.
- `src/pages/agriculture.tsx` và `src/pages/agriculture-detail.tsx` hoạt động đúng mà không cần sửa, chỉ nhờ `src/services/agriculture.ts` đổi sang gọi API thật.
