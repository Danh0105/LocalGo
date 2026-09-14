# Prompt xây dựng BE service cho chức năng Liên hệ

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Liên hệ** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`), **Đặc sản** (`SPECIALTIES-BE-SERVICE-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-BE-SERVICE-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-BE-SERVICE-PROMPT.md`), **OCOP** (`OCOP-BE-SERVICE-PROMPT.md`), **Làng nghề** (`CRAFT-VILLAGES-BE-SERVICE-PROMPT.md`), **Ẩm thực** (`CUISINE-BE-SERVICE-PROMPT.md`), **Lễ hội** (`FESTIVALS-BE-SERVICE-PROMPT.md`), **Tour trải nghiệm** (`EXPERIENCE-TOURS-BE-SERVICE-PROMPT.md`), **Bản đồ** (`MAP-PLACES-BE-SERVICE-PROMPT.md`) hoặc **Tin tức** (`NEWS-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết Liên hệ nhưng dữ liệu đang hard-code ở frontend (`src/data/contacts.ts`). Giống các chức năng danh sách khác, trang này **đã có sẵn lớp service trung gian** (`src/services/contacts.ts` với `getContacts(query)` và `getContactById(id)`, hiện chỉ đang lọc mảng local và trả `Promise`) — khi làm BE, chỉ cần giữ đúng chữ ký hai hàm này và đổi phần triển khai bên trong để gọi API thật, không cần sửa `contacts.tsx`/`contact-detail.tsx`.

Mỗi đầu mối liên hệ gồm:

1. Danh mục: `Hành chính`, `Khẩn cấp`, `Du lịch`, `Nông nghiệp` hoặc `Phản ánh`.
2. Thông tin cơ bản: tên đơn vị/đầu mối, vai trò/chức năng, số điện thoại, email (tùy chọn), địa chỉ, giờ làm việc, ảnh đại diện.
3. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và mô tả chi tiết gồm nhiều đoạn văn.
4. Nội dung hỗ trợ: danh sách chuỗi ngắn.
5. Lưu ý: một đoạn văn tự do.

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu). Người dùng Mini App chỉ được đọc các đầu mối đang **hiển thị (active)**; đầu mối đang ẩn/nháp tuyệt đối không được lộ qua public API.

**Lưu ý nghiệp vụ quan trọng**: `phone` và `email` không phải chuỗi trưng bày thuần túy — `contact-detail.tsx` dựng trực tiếp link `tel:{phone}` (đã strip khoảng trắng) và `mailto:{email}` từ hai trường này để tạo nút "Gọi ngay"/"Gửi email". Vì vậy hai trường này cần validate đúng định dạng thay vì chỉ trim như các trường tự do khác. Ngoài ra dữ liệu mẫu có `id` "ubnd-xa-truong-mit" trùng với bản ghi bên chức năng Bản đồ (cùng mô tả UBND xã nhưng phục vụ hai mục đích khác nhau: liên hệ vs. định vị trên bản đồ) — đây là hai bảng độc lập, giữ nguyên `id` riêng của từng chức năng, không gộp hay dùng khóa ngoại chéo trừ khi có yêu cầu tường minh khác.

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách đầu mối liên hệ (hỗ trợ lọc theo danh mục) và chi tiết một đầu mối theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự các đầu mối.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng đầu mối để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 6 đầu mối hiện có trong `src/data/contacts.ts`, validation, phân quyền, test và tài liệu API.
- Cập nhật `src/services/contacts.ts` để gọi API thật thay vì lọc mảng local, giữ nguyên chữ ký `getContacts(query)`/`getContactById(id)` để không phải sửa các trang đang dùng.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ hoặc lưu `description`/`supportTopics` dạng JSON theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "ubnd-xa-truong-mit",
  "name": "UBND xã Truông Mít",
  "category": "Hành chính",
  "role": "Tiếp nhận thông tin hành chính, thủ tục và liên hệ chung",
  "phone": "0276 000 000",
  "email": "ubnd.truongmit@example.vn",
  "address": "Trung tâm xã Truông Mít",
  "workingTime": "Thứ 2 - Thứ 6, 07:00 - 17:00",
  "summary": "Kênh liên hệ chung cho người dân khi cần hỏi thông tin thủ tục...",
  "description": [
    "Đoạn mô tả thứ nhất.",
    "Đoạn mô tả thứ hai."
  ],
  "supportTopics": [
    "Hỏi thông tin thủ tục hành chính",
    "Lịch tiếp công dân"
  ],
  "note": "Nên gọi trong giờ hành chính để được hỗ trợ nhanh hơn.",
  "imageUrl": "https://cdn.example.com/contacts/ubnd-xa-truong-mit.jpg",
  "imageAlt": "UBND xã Truông Mít",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `category` là enum cố định `Hành chính | Khẩn cấp | Du lịch | Nông nghiệp | Phản ánh`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/contacts/:id`); nếu cho phép đổi tên hiển thị, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `phone` lưu nguyên định dạng hiển thị có khoảng trắng (ví dụ `"0276 000 000"`) để giữ khả năng đọc, nhưng phải validate chỉ chứa số, khoảng trắng, và tùy chọn dấu `+` ở đầu (hỗ trợ số quốc tế nếu cần) — không chấp nhận ký tự chữ hay đặc biệt khác.
- `email` là trường tùy chọn (`nullable`); nếu có giá trị thì phải là định dạng email hợp lệ.
- `role`, `address`, `workingTime`, `note` là chuỗi tự do, không ép kiểu.
- `supportTopics` là mảng chuỗi đơn giản (không cần bản ghi con có ID riêng trừ khi dự án muốn quản lý như entity độc lập).
- `sortOrder` là số nguyên không âm; public API trả theo `sortOrder` tăng dần kèm tie-breaker ổn định (ví dụ `createdAt`).
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị.
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở các prompt trước nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/contacts`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `category` (`Hành chính`/`Khẩn cấp`/`Du lịch`/`Nông nghiệp`/`Phản ánh`) để lọc, mặc định trả tất cả danh mục.
  - Chỉ trả bản ghi đang hiển thị, sắp xếp theo `sortOrder`.
- `GET /api/v1/contacts/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `description`, `supportTopics` và `note`.
  - Nếu đầu mối không tồn tại hoặc đang ẩn, trả `404 CONTACT_NOT_FOUND` theo error format chung (không tiết lộ đầu mối đang ẩn tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/contacts`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, lọc theo `category`, tìm kiếm theo tên/số điện thoại, sắp theo `sortOrder`.
- `GET /api/admin/contacts/:id`: chi tiết một đầu mối kèm `version`.
- `POST /api/admin/contacts`: tạo đầu mối mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/contacts/:id`: cập nhật toàn bộ một đầu mối; nhận `version` để optimistic locking.
- `DELETE /api/admin/contacts/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/contacts/:id/status`: bật/tắt hiển thị (`isActive`).
- `PATCH /api/admin/contacts/reorder`: nhận danh sách `{ id, sortOrder }` để cập nhật thứ tự hàng loạt trong một transaction.

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/contacts/:id`:

```json
{
  "version": 2,
  "name": "UBND xã Truông Mít",
  "category": "Hành chính",
  "role": "Tiếp nhận thông tin hành chính, thủ tục và liên hệ chung",
  "phone": "0276 000 000",
  "email": "ubnd.truongmit@example.vn",
  "address": "Trung tâm xã Truông Mít",
  "workingTime": "Thứ 2 - Thứ 6, 07:00 - 17:00",
  "summary": "Kênh liên hệ chung cho người dân...",
  "description": ["Đoạn 1", "Đoạn 2"],
  "supportTopics": ["Hỏi thông tin thủ tục hành chính"],
  "note": "Nên gọi trong giờ hành chính để được hỗ trợ nhanh hơn.",
  "mediaId": "uuid",
  "imageAlt": "UBND xã Truông Mít"
}
```

Khi `version` cũ, trả HTTP `409` với code `CONTACT_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `name`, `role`, `phone`, `address`, `workingTime`, `summary` không được rỗng sau khi trim.
- Giới hạn đề xuất: `name` 150 ký tự, `role` 255, `phone` 30, `email` 255, `address` 255, `workingTime` 150, `summary` 300, `note` 2.000 ký tự, mỗi đoạn `description` 5.000 ký tự, mỗi phần tử `supportTopics` 200 ký tự.
- `phone` phải khớp pattern chỉ gồm chữ số, khoảng trắng và tối đa một dấu `+` ở đầu; từ chối ký tự khác với `400 VALIDATION_ERROR` (để đảm bảo `tel:` link ở frontend luôn hợp lệ).
- `email` nếu có giá trị phải đúng định dạng email chuẩn (regex hoặc validator có sẵn của framework); để trống/`null` là hợp lệ.
- Giới hạn số phần tử: tối đa 20 đoạn `description`, tối đa 20 `supportTopics`.
- `category` phải thuộc enum `Hành chính | Khẩn cấp | Du lịch | Nông nghiệp | Phản ánh`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- Slug/`id` khi tạo mới: sinh tự động từ `name` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 6 đầu mối hiện có trong `src/data/contacts.ts` để sau deploy trang không bị trống:

- UBND xã Truông Mít, Công an xã, Trạm y tế xã, Tổ hỗ trợ du lịch cộng đồng, Cán bộ khuyến nông, Đường dây tiếp nhận phản ánh.
- Giữ nguyên `id`/slug hiện tại của từng đầu mối (ví dụ `ubnd-xa-truong-mit`) để không phá vỡ URL đang được liên kết trong app.
- Giữ nguyên toàn bộ `description`, `supportTopics` và `note` hiện có của từng đầu mối; số điện thoại/email trong seed là dữ liệu mẫu, cần thay bằng thông tin thật trước khi vận hành chính thức — ghi rõ điều này trong tài liệu bàn giao.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (hiện dùng chung một ảnh placeholder `phone.png` cho tất cả đầu mối). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng đầu mối, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả đầu mối ẩn và trả đúng thứ tự theo `sortOrder`.
- Public list API lọc đúng theo `category`.
- Public detail API trả `404 CONTACT_NOT_FOUND` cho đầu mối không tồn tại hoặc đang ẩn.
- Người không có quyền bị `401/403` ở admin API.
- Tạo mới sinh `id`/slug hợp lệ và từ chối trùng slug.
- Tạo/cập nhật với `phone` chứa ký tự không hợp lệ hoặc `email` sai định dạng bị từ chối; `email` để trống vẫn được chấp nhận.
- Cập nhật một đầu mối không làm thay đổi `sortOrder` của đầu mối khác.
- Hai admin cập nhật cùng `version` gây conflict `409` cho request đến sau.
- Reorder hàng loạt cập nhật đúng `sortOrder` trong một transaction, rollback hoàn toàn nếu một phần tử lỗi.
- Bật/tắt hiển thị phản ánh đúng ngay trên public API.
- Xóa đầu mối loại bỏ đúng dữ liệu liên quan theo convention (cascade hoặc soft delete).
- Media không tồn tại/sai loại bị từ chối.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Cập nhật `src/services/contacts.ts` để gọi API thật, giữ nguyên chữ ký hàm hiện có.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Cảnh báo rõ trong tài liệu bàn giao rằng số điện thoại/email trong seed là dữ liệu mẫu, cần được đơn vị vận hành xác nhận và cập nhật lại trước khi phát hành chính thức.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/contacts` và `GET /api/v1/contacts/:id` trả đúng dữ liệu tương đương `src/data/contacts.ts` hiện tại.
- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp mà không cần sửa code Mini App.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation (bao gồm định dạng `phone`/`email`), optimistic locking và xử lý concurrent update rõ ràng.
- `src/pages/contacts.tsx` và `src/pages/contact-detail.tsx` hoạt động đúng mà không cần sửa, chỉ nhờ `src/services/contacts.ts` đổi sang gọi API thật — nút `Gọi ngay`/`Gửi email` vẫn hoạt động đúng vì `phone`/`email` giữ đúng định dạng mong đợi.
