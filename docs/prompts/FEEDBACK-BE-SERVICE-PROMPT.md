# Prompt xây dựng BE service cho chức năng Phản hồi

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Phản hồi** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`), **Đặc sản** (`SPECIALTIES-BE-SERVICE-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-BE-SERVICE-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-BE-SERVICE-PROMPT.md`), **OCOP** (`OCOP-BE-SERVICE-PROMPT.md`), **Làng nghề** (`CRAFT-VILLAGES-BE-SERVICE-PROMPT.md`), **Ẩm thực** (`CUISINE-BE-SERVICE-PROMPT.md`), **Lễ hội** (`FESTIVALS-BE-SERVICE-PROMPT.md`), **Tour trải nghiệm** (`EXPERIENCE-TOURS-BE-SERVICE-PROMPT.md`), **Bản đồ** (`MAP-PLACES-BE-SERVICE-PROMPT.md`), **Tin tức** (`NEWS-BE-SERVICE-PROMPT.md`) hoặc **Liên hệ** (`CONTACTS-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang `Phản hồi` (`src/pages/feedback.tsx`/`feedback-detail.tsx`) với **hai phần khác bản chất**, không phải một CRUD danh sách đơn thuần như các chức năng trước:

**Phần A — Kênh phản hồi** (`src/data/feedback.ts`, hard-code): danh sách các "kênh" mô tả loại phản hồi mà người dân có thể gửi (Góp ý chung, Phản ánh hạ tầng, Dịch vụ công, Du lịch, Báo lỗi Mini App), mỗi kênh gồm tiêu đề, danh mục, thời gian phản hồi dự kiến, thông tin cần cung cấp, mô tả, ví dụ nội dung và lưu ý. Đây **là** nội dung admin quản trị theo đúng pattern CRUD danh sách như các chức năng trước — trang đã có sẵn lớp service trung gian (`src/services/feedback.ts` với `getFeedbackChannels(query)`/`getFeedbackChannelById(id)`).

**Phần B — Tiếp nhận phản hồi thật** (`submitFeedback()` trong `src/services/feedback.ts`, hiện đang mock bằng `console.info` và trả `ticketCode` giả `PH-{timestamp}`): `feedback.tsx` có **form thật** cho người dùng cuối nhập họ tên, số điện thoại và nội dung để gửi phản hồi. Đây là một **hệ thống ticket**, không phải nội dung tĩnh — cần lưu trữ, có trạng thái xử lý, và một màn hình admin riêng để cán bộ xem/xử lý (khác hẳn CRUD nội dung của Phần A và của tất cả 13 chức năng đã làm trước đó).

**Lưu ý bảo mật quan trọng**: endpoint tiếp nhận phản hồi (Phần B) là **public, không yêu cầu đăng nhập**, và nhận dữ liệu cá nhân (họ tên, số điện thoại) từ người dùng ẩn danh. Phải có rate limiting chống spam/abuse, không được để endpoint này bị lợi dụng để gửi hàng loạt. Dữ liệu cá nhân trong ticket chỉ được xem bởi admin có quyền phù hợp — không lộ qua bất kỳ API public nào.

## 2. Kết quả cần đạt

### Phần A — Kênh phản hồi

- Có public API để Mini App lấy danh sách kênh phản hồi (hỗ trợ lọc theo danh mục) và chi tiết một kênh theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn), tạo mới, cập nhật, xóa, ẩn/hiện và sắp xếp thứ tự các kênh.
- Có optimistic locking theo từng kênh; migration + seed từ 5 kênh hiện có trong `src/data/feedback.ts`.
- Cập nhật `src/services/feedback.ts` để `getFeedbackChannels`/`getFeedbackChannelById` gọi API thật, giữ nguyên chữ ký hàm.

### Phần B — Tiếp nhận & xử lý phản hồi

- Có public API để Mini App gửi một phản hồi (tương ứng `submitFeedback`), trả về mã ticket thật (không phải giả lập từ `Date.now()`).
- Có admin API để xem danh sách ticket đã gửi (phân trang, lọc theo trạng thái/kênh, tìm theo tên/SĐT/mã ticket), xem chi tiết một ticket, và cập nhật trạng thái xử lý.
- Rate limit endpoint gửi phản hồi theo IP/session để chống spam.
- Cập nhật `src/services/feedback.ts` để `submitFeedback` gọi API thật, giữ nguyên chữ ký hàm và shape trả về `{ success: true, ticketCode: string }`.

## 3. Mô hình dữ liệu/DTO đề xuất

### Phần A — `FeedbackChannel`

Public DTO:

```json
{
  "id": "gop-y-chung",
  "title": "Góp ý chung cho địa phương",
  "category": "Góp ý chung",
  "responseTime": "Tiếp nhận trong giờ hành chính",
  "requiredInfo": ["Họ tên", "Số điện thoại", "Nội dung góp ý"],
  "summary": "Kênh tiếp nhận ý kiến đóng góp về hoạt động cộng đồng...",
  "description": ["Đoạn mô tả thứ nhất.", "Đoạn mô tả thứ hai."],
  "examples": ["Đề xuất bổ sung thông tin về lịch sinh hoạt cộng đồng"],
  "note": "Nội dung nên rõ ràng, ngắn gọn và có thông tin liên hệ để tiện phản hồi.",
  "imageUrl": "https://cdn.example.com/feedback/gop-y-chung.jpg",
  "imageAlt": "Góp ý chung cho địa phương",
  "sortOrder": 0,
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `category` là enum cố định `Góp ý chung | Phản ánh hạ tầng | Dịch vụ công | Du lịch | Mini App`.
- `id`/slug duy nhất, ổn định qua thời gian.
- `requiredInfo` và `examples` là mảng chuỗi tự do.
- `sortOrder`, `isActive`, `version`, `createdAt`/`updatedAt`/`createdBy`/`updatedBy` theo đúng convention các chức năng trước.

### Phần B — `FeedbackTicket`

Đây là entity mới, không có trong dữ liệu mẫu cũ (dữ liệu mẫu chỉ mock, chưa định nghĩa schema lưu trữ). Đề xuất:

```json
{
  "id": "uuid",
  "ticketCode": "PH-A1B2C3",
  "channelId": "gop-y-chung",
  "fullName": "Nguyễn Văn A",
  "phone": "0900 123 456",
  "content": "Nội dung phản hồi của người dân.",
  "status": "new",
  "adminNote": null,
  "handledBy": null,
  "createdAt": "2026-07-15T10:00:00.000Z",
  "updatedAt": "2026-07-15T10:00:00.000Z",
  "resolvedAt": null
}
```

Yêu cầu mô hình nội bộ:

- `ticketCode` là mã hiển thị cho người dùng, sinh duy nhất, không đoán được tuần tự (không dùng `Date.now()` thô như mock hiện tại — dùng random/hash đủ entropy để tránh người khác đoán mã tra cứu ticket của người khác, nếu sau này có tính năng tra cứu công khai theo mã).
- `channelId` là tham chiếu tùy chọn đến `FeedbackChannel` (người dùng có thể gửi phản hồi không qua kênh cụ thể nào, xem `feedback.tsx` — form gửi nhanh không bắt buộc chọn kênh); nếu có giá trị, phải xác minh kênh tồn tại nhưng không bắt buộc kênh đang `isActive` (không chặn xử lý ticket cũ nếu kênh sau này bị ẩn).
- `status` là enum `new | in_progress | resolved | closed`, mặc định `new` khi tạo.
- `adminNote` là ghi chú nội bộ, chỉ admin thấy, không bao giờ trả về public API (không có public API nào cho ticket).
- `handledBy` lưu người phụ trách xử lý gần nhất theo convention audit của dự án.
- Không cần `sortOrder` — danh sách ticket sắp theo `createdAt` giảm dần (mới nhất trước), tương tự Tin tức.
- Cân nhắc chính sách lưu trữ dữ liệu cá nhân (retention) theo yêu cầu của dự án/pháp lý; nếu chưa có quyết định, ít nhất đảm bảo dữ liệu chỉ truy cập được bởi role được cấp quyền.

## 4. API contract

### Phần A — Public

- `GET /api/v1/feedback/channels`: lọc theo `category`, chỉ trả kênh đang hiển thị, sắp theo `sortOrder`.
- `GET /api/v1/feedback/channels/:id`: chi tiết một kênh; `404 FEEDBACK_CHANNEL_NOT_FOUND` nếu không tồn tại/đang ẩn.

### Phần A — Admin

- `GET /api/admin/feedback/channels`, `GET /api/admin/feedback/channels/:id`, `POST /api/admin/feedback/channels`, `PUT /api/admin/feedback/channels/:id` (kèm `version`), `DELETE /api/admin/feedback/channels/:id`, `PATCH /api/admin/feedback/channels/:id/status`, `PATCH /api/admin/feedback/channels/reorder` — theo đúng convention CRUD của các chức năng danh sách trước đó. `409 FEEDBACK_CHANNEL_VERSION_CONFLICT` khi `version` cũ.

### Phần B — Public

- `POST /api/v1/feedback/tickets`
  - Không yêu cầu đăng nhập.
  - Body: `{ channelId?: string, fullName: string, phone: string, content: string }`.
  - Validate và lưu ticket mới với `status = "new"`.
  - Trả về `{ success: true, ticketCode: string }` — **không** trả về `id` nội bộ hay các trường quản trị khác.
  - Áp dụng rate limit theo IP (ví dụ tối đa N request/phút, theo hạ tầng rate-limit hiện có của dự án).

### Phần B — Admin

- `GET /api/admin/feedback/tickets`: danh sách ticket, phân trang, lọc theo `status`/`channelId`/khoảng thời gian, tìm kiếm theo `fullName`/`phone`/`ticketCode`, mặc định sắp theo `createdAt` giảm dần.
- `GET /api/admin/feedback/tickets/:id`: chi tiết một ticket.
- `PATCH /api/admin/feedback/tickets/:id/status`: cập nhật `status` (theo luồng hợp lệ `new → in_progress → resolved/closed`, từ chối chuyển trạng thái không hợp lệ ví dụ từ `closed` quay lại `new` nếu dự án không cho phép reopen), có thể kèm `adminNote`.

Không có endpoint `DELETE`/sửa nội dung ticket cho admin — ticket là bản ghi phản ánh những gì người dân đã gửi, không nên bị chỉnh sửa nội dung gốc; chỉ trạng thái xử lý và ghi chú nội bộ được thay đổi. Nếu dự án cần xóa vì lý do pháp lý/spam, dùng soft delete có audit rõ ràng thay vì xóa cứng.

## 5. Validation và bảo mật

### Phần A

Áp dụng đúng như các chức năng danh sách trước: `title` 200 ký tự, `responseTime` 150, `summary` 300, `note` 2.000, mỗi đoạn `description` 5.000, mỗi phần tử `requiredInfo`/`examples` 200 ký tự, tối đa 20 phần tử mỗi mảng, `category` enum bắt buộc, chống XSS, media validate như các prompt trước.

### Phần B

- `fullName`: bắt buộc, trim, tối đa 150 ký tự.
- `phone`: bắt buộc, chỉ chấp nhận chữ số/khoảng trắng/dấu `+` đầu chuỗi (đồng nhất với validate `phone` ở `CONTACTS-BE-SERVICE-PROMPT.md`), tối đa 30 ký tự.
- `content`: bắt buộc, trim, tối thiểu vài ký tự có nghĩa (ví dụ tối thiểu 5 ký tự sau trim để chặn spam rỗng), tối đa 5.000 ký tự.
- `channelId`: tùy chọn; nếu có, phải tồn tại trong bảng kênh (không cần đang active).
- Chống spam: rate limit theo IP là bắt buộc; cân nhắc thêm honeypot field hoặc captcha nếu hạ tầng dự án đã hỗ trợ, không tự dựng giải pháp captcha mới nếu chưa có.
- Không log `phone`/`content` dạng plaintext ra log tập trung nếu hệ thống logging không được kiểm soát truy cập chặt; nếu cần log để debug, che (mask) một phần số điện thoại.
- Chỉ role được cấp quyền (ví dụ `ADMIN`, `SUPPORT`) mới gọi được API admin ticket; ghi audit log ai xem/xử lý ticket nào nếu dự án đã có cơ chế audit.
- Không tin `channelId` không xác minh; validate tồn tại trước khi lưu.

## 6. Migration và dữ liệu khởi tạo

- Migration + seed cho `FeedbackChannel` từ 5 kênh hiện có trong `src/data/feedback.ts` (Góp ý chung, Phản ánh hạ tầng, Dịch vụ công, Du lịch, Báo lỗi Mini App), giữ nguyên `id`/slug và toàn bộ nội dung — theo đúng cách làm như các chức năng danh sách trước.
- Migration cho bảng `FeedbackTicket` **không cần seed dữ liệu mẫu** (đây là dữ liệu người dùng thật phát sinh sau khi launch, không phải nội dung tĩnh cần khởi tạo).
- Không hard-code CDN/đường dẫn local cho ảnh kênh (hiện dùng chung `customer-service.png`).

## 7. Test bắt buộc

### Phần A

Theo đúng bộ test chuẩn của các chức năng danh sách trước: public API không trả kênh ẩn, lọc đúng theo `category`, `404` cho kênh không tồn tại, phân quyền `401/403`, `409` conflict version, reorder transaction, toggle hiển thị.

### Phần B

- Gửi ticket hợp lệ trả về `ticketCode` duy nhất và lưu đúng dữ liệu.
- Thiếu `fullName`/`phone`/`content` hoặc sai định dạng `phone` bị từ chối `400`.
- Gửi `channelId` không tồn tại bị từ chối.
- Vượt rate limit bị từ chối (ví dụ `429`).
- Admin list API trả đúng ticket, lọc theo `status`/`channelId`, tìm kiếm theo tên/SĐT/mã ticket hoạt động đúng.
- Người không có quyền bị `401/403` khi gọi admin ticket API.
- Chuyển trạng thái hợp lệ (`new → in_progress → resolved`) thành công; chuyển trạng thái không hợp lệ bị từ chối.
- Không có public API nào trả về danh sách/chi tiết ticket của người khác.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger cho cả hai phần, phân biệt rõ endpoint public vs. admin.
- Cập nhật `src/services/feedback.ts`: `getFeedbackChannels`/`getFeedbackChannelById` gọi API thật; `submitFeedback` gọi API thật, giữ nguyên chữ ký và shape kết quả `{ success: true, ticketCode }`.
- Ghi rõ chính sách rate limit đã áp dụng cho endpoint gửi phản hồi và quyền cần gán cho role xử lý ticket.
- Liệt kê file đã tạo/sửa; chạy lint, test, build; báo kết quả chính xác.
- Không viết pseudo-code hoặc mock endpoint cho cả hai phần.

## 9. Tiêu chí nghiệm thu

- `src/pages/feedback.tsx`/`feedback-detail.tsx` hoạt động đúng mà không cần sửa, chỉ nhờ `src/services/feedback.ts` đổi sang gọi API thật.
- Gửi phản hồi từ Mini App tạo ticket thật trong hệ thống, trả mã ticket hợp lệ cho người dùng.
- Admin quản lý được kênh phản hồi (CRUD đầy đủ như các chức năng danh sách khác) và xem/xử lý được ticket người dân gửi (danh sách, chi tiết, đổi trạng thái).
- Endpoint gửi phản hồi có chống spam cơ bản (rate limit) và không lộ dữ liệu cá nhân của người này cho người khác.
- API có phân quyền, validation, xử lý concurrent update (Phần A) rõ ràng.
- Refresh/restart service không làm mất dữ liệu kênh lẫn ticket.
