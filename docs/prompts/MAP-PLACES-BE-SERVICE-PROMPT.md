# Prompt xây dựng BE service cho chức năng Bản đồ

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Bản đồ** (điểm trên bản đồ) của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`), **Đặc sản** (`SPECIALTIES-BE-SERVICE-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-BE-SERVICE-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-BE-SERVICE-PROMPT.md`), **OCOP** (`OCOP-BE-SERVICE-PROMPT.md`), **Làng nghề** (`CRAFT-VILLAGES-BE-SERVICE-PROMPT.md`), **Ẩm thực** (`CUISINE-BE-SERVICE-PROMPT.md`), **Lễ hội** (`FESTIVALS-BE-SERVICE-PROMPT.md`) hoặc **Tour trải nghiệm** (`EXPERIENCE-TOURS-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết các điểm trên Bản đồ nhưng dữ liệu đang hard-code ở frontend (`src/data/map-places.ts`). Giống các chức năng danh sách khác, trang này **đã có sẵn lớp service trung gian** (`src/services/map-places.ts` với `getMapPlaces(query)` và `getMapPlaceById(id)`, hiện chỉ đang lọc mảng local và trả `Promise`) — khi làm BE, chỉ cần giữ đúng chữ ký hai hàm này và đổi phần triển khai bên trong để gọi API thật, không cần sửa `map-places.tsx`/`map-place-detail.tsx`.

Mỗi điểm trên bản đồ gồm:

1. Danh mục: `Hành chính`, `Du lịch`, `Di tích`, `Ẩm thực` hoặc `Dịch vụ`.
2. Thông tin cơ bản: tên, địa chỉ, **tọa độ (vĩ độ/kinh độ)**, giờ mở cửa, khoảng cách từ trung tâm, ảnh đại diện.
3. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và mô tả chi tiết gồm nhiều đoạn văn.
4. Điểm nổi bật: danh sách chuỗi ngắn.
5. Ghi chú chỉ đường: một đoạn văn tự do.

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu). Người dùng Mini App chỉ được đọc các điểm đang **hiển thị (active)**; điểm đang ẩn/nháp tuyệt đối không được lộ qua public API.

**Lưu ý nghiệp vụ quan trọng**: đây là chức năng đầu tiên trong nhóm danh sách có trường tọa độ địa lý (`coordinates: { lat, lng }`) dùng để hiển thị marker trên bản đồ — cần validate chặt khoảng giá trị hợp lệ và không được nhầm với các trường chuỗi tự do khác. Đồng thời, dữ liệu mẫu hiện có `id` "dia-dao-truong-mit" trùng với bản ghi bên chức năng Di tích lịch sử (cùng mô tả một địa danh nhưng khác mục đích hiển thị: bản đồ vs. trang di tích) — đây là hai bảng độc lập, giữ nguyên `id` riêng của từng chức năng, không gộp hay dùng khóa ngoại chéo trừ khi có yêu cầu tường minh khác (ví dụ liên kết điều hướng sang trang Di tích lịch sử chỉ nên qua slug tham chiếu tùy chọn, không ép buộc).

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách điểm bản đồ (hỗ trợ lọc theo danh mục) và chi tiết một điểm theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự các điểm.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng điểm để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 6 điểm hiện có trong `src/data/map-places.ts`, validation, phân quyền, test và tài liệu API.
- Cập nhật `src/services/map-places.ts` để gọi API thật thay vì lọc mảng local, giữ nguyên chữ ký `getMapPlaces(query)`/`getMapPlaceById(id)` để không phải sửa các trang đang dùng.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ hoặc lưu `description`/`highlights` dạng JSON theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "ubnd-xa-truong-mit",
  "name": "UBND xã Truông Mít",
  "category": "Hành chính",
  "address": "Trung tâm xã Truông Mít",
  "coordinates": {
    "lat": 11.2418,
    "lng": 106.2024
  },
  "openTime": "Thứ 2 - Thứ 6, 07:00 - 17:00",
  "distanceFromCenter": "0 km",
  "summary": "Điểm trung tâm hành chính, phù hợp làm mốc xuất phát...",
  "description": [
    "Đoạn mô tả thứ nhất.",
    "Đoạn mô tả thứ hai."
  ],
  "highlights": [
    "Mốc trung tâm xã",
    "Gần các điểm dịch vụ cơ bản"
  ],
  "directionNote": "Cần thay bằng tọa độ chính xác khi tích hợp bản đồ thật.",
  "imageUrl": "https://cdn.example.com/map-places/ubnd-xa-truong-mit.jpg",
  "imageAlt": "UBND xã Truông Mít",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `category` là enum cố định `Hành chính | Du lịch | Di tích | Ẩm thực | Dịch vụ`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/map-places/:id`); nếu cho phép đổi tên hiển thị, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `coordinates.lat` là số thực trong khoảng `[-90, 90]`, `coordinates.lng` là số thực trong khoảng `[-180, 180]`; lưu ở độ chính xác đủ cho hiển thị bản đồ (khuyến nghị tối thiểu 6 chữ số thập phân). Nếu dự án dùng kiểu geospatial riêng (PostGIS point...) thì dùng đúng convention đó, miễn public DTO vẫn trả về đúng cấu trúc `{ lat, lng }`.
- `openTime`, `distanceFromCenter`, `directionNote` là chuỗi tự do, không ép kiểu số/ngày (`distanceFromCenter` là mô tả ước lượng, không phải số chính xác để tính toán).
- `highlights` là mảng chuỗi đơn giản (không cần bản ghi con có ID riêng trừ khi dự án muốn quản lý như entity độc lập).
- `sortOrder` là số nguyên không âm; public API trả theo `sortOrder` tăng dần kèm tie-breaker ổn định (ví dụ `createdAt`).
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị.
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở các prompt trước nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/map-places`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `category` (`Hành chính`/`Du lịch`/`Di tích`/`Ẩm thực`/`Dịch vụ`) để lọc, mặc định trả tất cả danh mục.
  - Chỉ trả bản ghi đang hiển thị, sắp xếp theo `sortOrder`.
  - Cân nhắc hỗ trợ bounding-box query (`bbox` hoặc `lat`/`lng`/`radius`) nếu dự án cần hiển thị marker theo vùng nhìn thấy trên bản đồ; nếu chưa cần, trả toàn bộ danh sách active là đủ cho quy mô dữ liệu hiện tại.
- `GET /api/v1/map-places/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `description`, `highlights` và `directionNote`.
  - Nếu điểm không tồn tại hoặc đang ẩn, trả `404 MAP_PLACE_NOT_FOUND` theo error format chung (không tiết lộ điểm đang ẩn tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/map-places`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, lọc theo `category`, tìm kiếm theo tên/địa chỉ, sắp theo `sortOrder`.
- `GET /api/admin/map-places/:id`: chi tiết một điểm kèm `version`.
- `POST /api/admin/map-places`: tạo điểm mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/map-places/:id`: cập nhật toàn bộ một điểm; nhận `version` để optimistic locking.
- `DELETE /api/admin/map-places/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/map-places/:id/status`: bật/tắt hiển thị (`isActive`).
- `PATCH /api/admin/map-places/reorder`: nhận danh sách `{ id, sortOrder }` để cập nhật thứ tự hàng loạt trong một transaction.

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/map-places/:id`:

```json
{
  "version": 2,
  "name": "UBND xã Truông Mít",
  "category": "Hành chính",
  "address": "Trung tâm xã Truông Mít",
  "coordinates": { "lat": 11.2418, "lng": 106.2024 },
  "openTime": "Thứ 2 - Thứ 6, 07:00 - 17:00",
  "distanceFromCenter": "0 km",
  "summary": "Điểm trung tâm hành chính...",
  "description": ["Đoạn 1", "Đoạn 2"],
  "highlights": ["Mốc trung tâm xã"],
  "directionNote": "Cần thay bằng tọa độ chính xác khi tích hợp bản đồ thật.",
  "mediaId": "uuid",
  "imageAlt": "UBND xã Truông Mít"
}
```

Khi `version` cũ, trả HTTP `409` với code `MAP_PLACE_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `name`, `address`, `openTime`, `distanceFromCenter`, `summary` không được rỗng sau khi trim.
- Giới hạn đề xuất: `name` 150 ký tự, `address` 255, `openTime` 150, `distanceFromCenter` 100, `summary` 300, `directionNote` 2.000 ký tự, mỗi đoạn `description` 5.000 ký tự, mỗi phần tử `highlights` 200 ký tự.
- Giới hạn số phần tử: tối đa 20 đoạn `description`, tối đa 20 `highlights`.
- `category` phải thuộc enum `Hành chính | Du lịch | Di tích | Ẩm thực | Dịch vụ`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- `coordinates.lat`/`coordinates.lng` bắt buộc, phải là số hợp lệ trong khoảng `[-90, 90]`/`[-180, 180]`; từ chối `NaN`, chuỗi, hoặc thiếu một trong hai trục với `400 VALIDATION_ERROR`.
- Slug/`id` khi tạo mới: sinh tự động từ `name` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 6 điểm hiện có trong `src/data/map-places.ts` để sau deploy trang không bị trống:

- UBND xã Truông Mít, Khu vực hồ Dầu Tiếng, Tuyến kênh Đông, Địa đạo Truông Mít, Chợ Truông Mít, Cụm quán bò tơ tỉnh lộ 784.
- Giữ nguyên `id`/slug hiện tại của từng điểm (ví dụ `ubnd-xa-truong-mit`) để không phá vỡ URL đang được liên kết trong app.
- Giữ nguyên toàn bộ `coordinates`, `description`, `highlights` và `directionNote` hiện có của từng điểm — lưu ý dữ liệu mẫu ghi rõ tọa độ hiện là giả định, nên khi có tọa độ thật thì cập nhật qua admin UI, không cần sửa lại migration.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (hiện dùng chung một ảnh placeholder `map.png` cho tất cả điểm). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng điểm, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả điểm ẩn và trả đúng thứ tự theo `sortOrder`.
- Public list API lọc đúng theo `category`.
- Public detail API trả `404 MAP_PLACE_NOT_FOUND` cho điểm không tồn tại hoặc đang ẩn.
- Public detail API trả đúng `coordinates` với đủ hai trục `lat`/`lng`.
- Người không có quyền bị `401/403` ở admin API.
- Tạo mới sinh `id`/slug hợp lệ và từ chối trùng slug.
- Tạo/cập nhật điểm với `lat`/`lng` ngoài khoảng hợp lệ hoặc thiếu trục bị từ chối.
- Cập nhật một điểm không làm thay đổi `sortOrder` của điểm khác.
- Hai admin cập nhật cùng `version` gây conflict `409` cho request đến sau.
- Reorder hàng loạt cập nhật đúng `sortOrder` trong một transaction, rollback hoàn toàn nếu một phần tử lỗi.
- Bật/tắt hiển thị phản ánh đúng ngay trên public API.
- Xóa điểm loại bỏ đúng dữ liệu liên quan theo convention (cascade hoặc soft delete).
- Media không tồn tại/sai loại bị từ chối.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Cập nhật `src/services/map-places.ts` để gọi API thật, giữ nguyên chữ ký hàm hiện có.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/map-places` và `GET /api/v1/map-places/:id` trả đúng dữ liệu tương đương `src/data/map-places.ts` hiện tại, kể cả tọa độ.
- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp mà không cần sửa code Mini App.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation (bao gồm validate tọa độ), optimistic locking và xử lý concurrent update rõ ràng.
- `src/pages/map-places.tsx` và `src/pages/map-place-detail.tsx` hoạt động đúng mà không cần sửa, chỉ nhờ `src/services/map-places.ts` đổi sang gọi API thật.
