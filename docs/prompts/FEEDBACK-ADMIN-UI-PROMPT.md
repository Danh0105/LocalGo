# Prompt xây dựng giao diện Admin cho chức năng Phản hồi

Bạn là Senior Frontend Engineer. Hãy phân tích codebase admin hiện tại trước khi triển khai và xây dựng màn hình quản trị cho chức năng **Phản hồi** của LocalGo. Phải tái sử dụng layout, router, auth guard, permission, design system, form library, API client, upload component, notification, modal xác nhận và coding convention hiện có; không tạo một bộ UI hoặc state-management song song nếu dự án đã có giải pháp tương ứng. Nếu admin đã có màn hình **Giới thiệu** (`ABOUT-ADMIN-UI-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-ADMIN-UI-PROMPT.md`), **Đặc sản** (`SPECIALTIES-ADMIN-UI-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-ADMIN-UI-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-ADMIN-UI-PROMPT.md`), **OCOP** (`OCOP-ADMIN-UI-PROMPT.md`), **Làng nghề** (`CRAFT-VILLAGES-ADMIN-UI-PROMPT.md`), **Ẩm thực** (`CUISINE-ADMIN-UI-PROMPT.md`), **Lễ hội** (`FESTIVALS-ADMIN-UI-PROMPT.md`), **Tour trải nghiệm** (`EXPERIENCE-TOURS-ADMIN-UI-PROMPT.md`), **Bản đồ** (`MAP-PLACES-ADMIN-UI-PROMPT.md`), **Tin tức** (`NEWS-ADMIN-UI-PROMPT.md`) hoặc **Liên hệ** (`CONTACTS-ADMIN-UI-PROMPT.md`), hãy tái sử dụng đúng pattern layout/permission/upload/preview/reorder đã dựng ở đó thay vì phát minh lại.

## 0. Bối cảnh: đây là hai màn hình khác bản chất, không phải một CRUD đơn thuần

Khác toàn bộ 13 chức năng danh sách đã dựng trước đó, `Phản hồi` gồm **hai phần độc lập**:

- **Phần A — Kênh phản hồi**: nội dung tĩnh admin quản trị (title, danh mục, thời gian phản hồi, thông tin cần cung cấp, mô tả, ví dụ, lưu ý, ảnh) — **đúng hệt pattern CRUD danh sách** của `Đền - Chùa - Miếu`/`Đặc sản`/... Áp dụng y nguyên cách làm đó cho phần này.
- **Phần B — Hộp thư phản hồi (Ticket Inbox)**: một màn hình **hoàn toàn mới**, chưa có tiền lệ trong 13 chức năng trước — hiển thị danh sách phản hồi thật do người dân gửi từ Mini App (`feedback.tsx` có form thật gửi họ tên/SĐT/nội dung), cho phép admin xem chi tiết và cập nhật trạng thái xử lý. Đây là màn hình dạng **hàng đợi hỗ trợ (support queue)**, không phải trình biên tập nội dung — không có "Thêm mới", không có ảnh, không có `sortOrder`/reorder, không có preview lên Mini App.

Xây dựng cả hai; không được bỏ sót Phần B chỉ vì nó không giống các chức năng trước.

## PHẦN A — Kênh phản hồi (CRUD danh sách, theo pattern đã có)

### A.1 Mục tiêu

Quản lý danh sách kênh hiển thị ở trang `Phản hồi` của Mini App (`feedback.tsx`/`feedback-detail.tsx`): lọc theo danh mục (`Góp ý chung`/`Phản ánh hạ tầng`/`Dịch vụ công`/`Du lịch`/`Mini App`), tìm kiếm theo tiêu đề, sắp xếp thứ tự hiển thị, bật/tắt hiển thị. Form tạo/sửa gồm: tiêu đề, danh mục, thời gian phản hồi dự kiến, ảnh đại diện + alt text, tóm tắt, mô tả chi tiết (nhiều đoạn), thông tin cần cung cấp (danh sách chuỗi), ví dụ nội dung (danh sách chuỗi), lưu ý (textarea).

### A.2 API sử dụng

- `GET /api/admin/feedback/channels`, `GET /api/admin/feedback/channels/:id`, `POST /api/admin/feedback/channels`, `PUT /api/admin/feedback/channels/:id` (kèm `version`), `DELETE /api/admin/feedback/channels/:id`, `PATCH /api/admin/feedback/channels/:id/status`, `PATCH /api/admin/feedback/channels/reorder`.
- `409 FEEDBACK_CHANNEL_VERSION_CONFLICT` khi `version` cũ — giữ dữ liệu nhập, khóa lưu, cho tải bản mới.

### A.3 Bố cục, validation, accessibility, state

Áp dụng **y nguyên** các mục 3–9 trong các prompt admin UI trước đó (route/menu/quyền, danh sách có filter/search/reorder/toggle, form chia section, preview drawer mô phỏng `feedback-detail.tsx`, validate độ dài field tương tự Liên hệ/Lễ hội, quản lý `version`/dirty-state/hủy request khi unmount). Không lặp lại chi tiết ở đây — tham chiếu các file đã liệt kê ở đầu prompt này để giữ đồng nhất.

## PHẦN B — Hộp thư phản hồi (màn hình mới, dạng hàng đợi hỗ trợ)

### B.1 Mục tiêu

Cho phép cán bộ xem và xử lý các phản hồi thật do người dân gửi qua form trên Mini App:

1. Danh sách ticket: lọc theo trạng thái (`Mới`/`Đang xử lý`/`Đã xử lý`/`Đã đóng`), lọc theo kênh, lọc theo khoảng thời gian gửi, tìm kiếm theo họ tên/số điện thoại/mã ticket, phân trang.
2. Xem chi tiết một ticket: họ tên, số điện thoại, kênh liên quan (nếu có), nội dung, thời gian gửi, lịch sử đổi trạng thái nếu dự án có audit trail.
3. Đổi trạng thái xử lý và ghi chú nội bộ (`adminNote`) — không được sửa nội dung gốc người dân đã gửi.

### B.2 API sử dụng

- `GET /api/admin/feedback/tickets`: danh sách, phân trang, filter `status`/`channelId`/khoảng thời gian, search theo `fullName`/`phone`/`ticketCode`.
- `GET /api/admin/feedback/tickets/:id`: chi tiết.
- `PATCH /api/admin/feedback/tickets/:id/status`: đổi trạng thái (`new → in_progress → resolved/closed`), kèm `adminNote` tùy chọn.

Không có API tạo/sửa/xóa ticket từ phía admin — ticket chỉ được tạo bởi người dùng cuối qua Mini App.

### B.3 Bố cục màn hình

- Route đề xuất `/admin/feedback/tickets`, menu riêng `Phản hồi → Hộp thư phản hồi` (tách khỏi menu `Phản hồi → Kênh phản hồi` của Phần A).
- Header: tiêu đề `Hộp thư phản hồi`, không có nút "Thêm mới" (ticket không được tạo thủ công từ admin).
- Thanh công cụ: filter theo trạng thái (dạng tab hoặc dropdown, hiển thị số lượng mỗi trạng thái nếu API hỗ trợ đếm), filter theo kênh, bộ lọc khoảng ngày gửi, ô tìm kiếm theo tên/SĐT/mã ticket.
- Bảng/danh sách gồm: mã ticket, họ tên, số điện thoại (cân nhắc che một phần số nếu dự án có yêu cầu bảo vệ dữ liệu cá nhân ở tầng hiển thị danh sách, hiện đầy đủ khi vào chi tiết), kênh liên quan, tóm tắt nội dung (rút gọn), thời gian gửi, badge trạng thái, nút xem chi tiết.
- Mặc định sắp theo thời gian gửi mới nhất trước; **không có** thao tác kéo thả sắp xếp (giống Tin tức, không giống các chức năng danh sách nội dung khác).
- Loading skeleton, empty state ("Chưa có phản hồi nào" / "Không có phản hồi khớp bộ lọc"), retry khi lỗi API.

### B.4 Màn hình chi tiết ticket

- Hiển thị đầy đủ: mã ticket, trạng thái hiện tại, họ tên, số điện thoại (có nút gọi nhanh `tel:` tương tự Liên hệ nếu phù hợp nghiệp vụ), kênh liên quan (link sang xem kênh ở Phần A nếu có), nội dung đầy đủ, thời gian gửi, người xử lý gần nhất.
- Khu vực đổi trạng thái: control chọn trạng thái mới (chỉ cho phép chuyển đúng luồng hợp lệ do BE quy định, disable các lựa chọn không hợp lệ thay vì để chọn rồi báo lỗi), ô nhập `adminNote`, nút `Cập nhật`.
- Sau khi cập nhật trạng thái thành công, phản ánh ngay trên UI và đồng bộ lại danh sách khi quay về trang danh sách (không yêu cầu người dùng tự refresh).

### B.5 Validation và UX

- Không có form tạo/sửa nội dung ticket nên không cần validate input tạo mới ở phần này; chỉ validate lựa chọn trạng thái hợp lệ trước khi gửi `PATCH`.
- `adminNote` giới hạn độ dài hợp lý (ví dụ 2.000 ký tự), không bắt buộc.
- Toast xác nhận sau khi đổi trạng thái thành công; hiển thị lỗi `400/401/403/404/5xx` bằng thông báo tiếng Việt rõ ràng.
- Chống double-submit khi bấm `Cập nhật` liên tiếp.

### B.6 Quyền và bảo mật

- Route yêu cầu auth guard; chỉ role được cấp quyền xử lý phản hồi (ví dụ `ADMIN`, `SUPPORT`) mới truy cập được — đây là dữ liệu cá nhân của người dân, phải xử lý phân quyền nghiêm ngặt hơn nội dung CMS thông thường.
- Không hiển thị số điện thoại/họ tên ở bất kỳ nơi nào ngoài phạm vi màn hình có xác thực quyền phù hợp.
- Không log nội dung ticket ra console/analytics phía frontend.

### B.7 Responsive và accessibility

- Tối ưu desktop admin từ 1280px, thao tác được ở tablet 768px.
- Trạng thái phải có text/badge rõ ràng, không chỉ dựa vào màu.
- Nút gọi nhanh (nếu có) phải có accessible label rõ (ví dụ "Gọi cho Nguyễn Văn A").

### B.8 Test bắt buộc

- Render đúng danh sách ticket, filter theo trạng thái/kênh/khoảng thời gian và search hoạt động đúng.
- Sắp xếp mặc định theo thời gian gửi giảm dần; không có UI kéo thả sắp xếp.
- Xem chi tiết ticket hiển thị đầy đủ thông tin đúng dữ liệu API trả về.
- Đổi trạng thái thành công cập nhật UI ngay và đồng bộ danh sách; đổi trạng thái không hợp lệ bị chặn ở UI hoặc hiển thị lỗi rõ ràng nếu BE từ chối.
- `403` chặn truy cập màn hình với role không đủ quyền.
- Không có request nào gửi dữ liệu ticket ra ngoài phạm vi API admin đã định nghĩa.

## Tiêu chí nghiệm thu chung (cả hai phần)

- Phần A: admin quản lý đầy đủ kênh phản hồi (tạo/sửa/xóa/ẩn-hiện/sắp xếp) mà không cần sửa code Mini App, đúng chất lượng như các chức năng danh sách đã bàn giao trước.
- Phần B: cán bộ xem được toàn bộ phản hồi người dân gửi từ Mini App, lọc/tìm kiếm được, và cập nhật trạng thái xử lý đúng luồng.
- `src/pages/feedback.tsx`/`feedback-detail.tsx` tiếp tục hoạt động đúng, chỉ nhờ `src/services/feedback.ts` đổi sang gọi API thật cho cả `getFeedbackChannels`/`getFeedbackChannelById`/`submitFeedback`.
- Dữ liệu cá nhân của người gửi phản hồi được bảo vệ đúng phạm vi quyền truy cập.
- Liệt kê file đã tạo/sửa; chạy lint, type-check, test và build cho cả hai phần, sau đó báo kết quả chính xác.
