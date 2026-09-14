# Prompt xây dựng BE service cho chức năng Di tích lịch sử

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Di tích lịch sử** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`) hoặc **Đặc sản** (`SPECIALTIES-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết Di tích lịch sử nhưng dữ liệu đang hard-code ở frontend (`src/data/historical-sites.ts`). Khác với Đền - Chùa - Miếu và Đặc sản, trang này **đã có sẵn lớp service trung gian** (`src/services/historical-sites.ts` với `getHistoricalSites(query)` và `getHistoricalSiteById(id)`, hiện chỉ đang lọc mảng local và trả `Promise`) — khi làm BE, chỉ cần giữ đúng chữ ký hai hàm này và đổi phần triển khai bên trong để gọi API thật, không cần sửa `historical-sites.tsx`/`historical-site-detail.tsx`.

Mỗi di tích gồm:

1. Xếp hạng: `Cấp quốc gia`, `Cấp tỉnh` hoặc `Chưa xếp hạng`.
2. Thông tin cơ bản: tên, địa chỉ, năm công nhận (tùy chọn, chỉ có khi đã xếp hạng), ảnh đại diện.
3. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và lịch sử di tích gồm nhiều đoạn văn.
4. Điểm nổi bật: danh sách chuỗi ngắn.

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu). Người dùng Mini App chỉ được đọc các di tích đang **hiển thị (active)**; di tích đang ẩn/nháp tuyệt đối không được lộ qua public API.

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách di tích (hỗ trợ lọc theo xếp hạng) và chi tiết một di tích theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự các di tích.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng di tích để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 4 di tích hiện có trong `src/data/historical-sites.ts`, validation, phân quyền, test và tài liệu API.
- Cập nhật `src/services/historical-sites.ts` để gọi API thật thay vì lọc mảng local, giữ nguyên chữ ký `getHistoricalSites(query)`/`getHistoricalSiteById(id)` để không phải sửa các trang đang dùng.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ hoặc lưu `history`/`highlights` dạng JSON theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "dia-dao-truong-mit",
  "name": "Địa đạo Truông Mít",
  "rank": "Cấp tỉnh",
  "address": "Ấp Thuận Bình, xã Truông Mít",
  "recognizedYear": 2014,
  "summary": "Hệ thống địa đạo từng là nơi trú ẩn...",
  "history": [
    "Đoạn lịch sử thứ nhất.",
    "Đoạn lịch sử thứ hai."
  ],
  "highlights": [
    "Đoạn địa đạo được phục dựng",
    "Không gian trưng bày hiện vật"
  ],
  "imageUrl": "https://cdn.example.com/historical-sites/dia-dao-truong-mit.jpg",
  "imageAlt": "Địa đạo Truông Mít",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `rank` là enum cố định `Cấp quốc gia | Cấp tỉnh | Chưa xếp hạng`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `recognizedYear` là số nguyên, nullable/optional — chỉ hợp lệ khi có giá trị hợp lý (ví dụ 1900 đến năm hiện tại); không bắt buộc khi `rank = Chưa xếp hạng`.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/historical-sites/:id`); nếu cho phép đổi tên hiển thị, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `highlights` là mảng chuỗi đơn giản (không cần bản ghi con có ID riêng trừ khi dự án muốn quản lý như entity độc lập).
- `sortOrder` là số nguyên không âm; public API trả theo `sortOrder` tăng dần kèm tie-breaker ổn định (ví dụ `createdAt`).
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị.
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở các prompt trước nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/historical-sites`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `rank` (`Cấp quốc gia`/`Cấp tỉnh`/`Chưa xếp hạng`) để lọc, mặc định trả tất cả xếp hạng.
  - Chỉ trả bản ghi đang hiển thị, sắp xếp theo `sortOrder`.
- `GET /api/v1/historical-sites/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `history` và `highlights`.
  - Nếu di tích không tồn tại hoặc đang ẩn, trả `404 HISTORICAL_SITE_NOT_FOUND` theo error format chung (không tiết lộ di tích đang ẩn tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/historical-sites`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, lọc theo `rank`, tìm kiếm theo tên/địa chỉ, sắp theo `sortOrder`.
- `GET /api/admin/historical-sites/:id`: chi tiết một di tích kèm `version`.
- `POST /api/admin/historical-sites`: tạo di tích mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/historical-sites/:id`: cập nhật toàn bộ một di tích; nhận `version` để optimistic locking.
- `DELETE /api/admin/historical-sites/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/historical-sites/:id/status`: bật/tắt hiển thị (`isActive`).
- `PATCH /api/admin/historical-sites/reorder`: nhận danh sách `{ id, sortOrder }` để cập nhật thứ tự hàng loạt trong một transaction.

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/historical-sites/:id`:

```json
{
  "version": 2,
  "name": "Địa đạo Truông Mít",
  "rank": "Cấp tỉnh",
  "address": "Ấp Thuận Bình, xã Truông Mít",
  "recognizedYear": 2014,
  "summary": "Hệ thống địa đạo từng là nơi trú ẩn...",
  "history": ["Đoạn 1", "Đoạn 2"],
  "highlights": ["Đoạn địa đạo được phục dựng", "Không gian trưng bày hiện vật"],
  "mediaId": "uuid",
  "imageAlt": "Địa đạo Truông Mít"
}
```

Khi `version` cũ, trả HTTP `409` với code `HISTORICAL_SITE_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `name`, `address`, `summary` không được rỗng sau khi trim.
- Giới hạn đề xuất: `name` 150 ký tự, `address` 255, `summary` 300, mỗi đoạn `history` 5.000 ký tự, mỗi phần tử `highlights` 200 ký tự.
- Giới hạn số phần tử: tối đa 20 đoạn `history`, tối đa 20 `highlights`.
- `rank` phải thuộc enum `Cấp quốc gia | Cấp tỉnh | Chưa xếp hạng`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- `recognizedYear` nếu có phải là số nguyên hợp lệ trong khoảng cho phép; từ chối năm ở tương lai.
- Slug/`id` khi tạo mới: sinh tự động từ `name` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 4 di tích hiện có trong `src/data/historical-sites.ts` để sau deploy trang không bị trống:

- Địa đạo Truông Mít, Bia tưởng niệm Lộc Trung, Căn cứ Bàu Bầu, Nhà truyền thống Truông Mít.
- Giữ nguyên `id`/slug hiện tại của từng di tích (ví dụ `dia-dao-truong-mit`) để không phá vỡ URL đang được liên kết trong app.
- Giữ nguyên toàn bộ `history` và `highlights` hiện có của từng di tích; các di tích chưa có `recognizedYear` (Căn cứ Bàu Bầu, Nhà truyền thống Truông Mít) seed với giá trị null/không set.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (hiện dùng chung một ảnh placeholder `icon-12.png` cho tất cả di tích). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng di tích, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả di tích ẩn và trả đúng thứ tự theo `sortOrder`.
- Public list API lọc đúng theo `rank`.
- Public detail API trả `404 HISTORICAL_SITE_NOT_FOUND` cho di tích không tồn tại hoặc đang ẩn.
- Người không có quyền bị `401/403` ở admin API.
- Tạo mới sinh `id`/slug hợp lệ và từ chối trùng slug.
- Tạo/cập nhật di tích với `recognizedYear` không hợp lệ (âm, ở tương lai) bị từ chối.
- Cập nhật một di tích không làm thay đổi `sortOrder` của di tích khác.
- Hai admin cập nhật cùng `version` gây conflict `409` cho request đến sau.
- Reorder hàng loạt cập nhật đúng `sortOrder` trong một transaction, rollback hoàn toàn nếu một phần tử lỗi.
- Bật/tắt hiển thị phản ánh đúng ngay trên public API.
- Xóa di tích loại bỏ đúng dữ liệu liên quan theo convention (cascade hoặc soft delete).
- Media không tồn tại/sai loại bị từ chối.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Cập nhật `src/services/historical-sites.ts` để gọi API thật, giữ nguyên chữ ký hàm hiện có.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/historical-sites` và `GET /api/v1/historical-sites/:id` trả đúng dữ liệu tương đương `src/data/historical-sites.ts` hiện tại.
- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp mà không cần sửa code Mini App.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation, optimistic locking và xử lý concurrent update rõ ràng.
- `src/pages/historical-sites.tsx` và `src/pages/historical-site-detail.tsx` hoạt động đúng mà không cần sửa, chỉ nhờ `src/services/historical-sites.ts` đổi sang gọi API thật.
