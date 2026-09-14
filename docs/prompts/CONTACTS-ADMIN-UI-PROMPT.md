# Prompt xây dựng giao diện Admin cho chức năng Liên hệ

Bạn là Senior Frontend Engineer. Hãy phân tích codebase admin hiện tại trước khi triển khai và xây dựng màn hình quản trị nội dung **Liên hệ** cho LocalGo. Phải tái sử dụng layout, router, auth guard, permission, design system, form library, API client, upload component, notification, modal xác nhận và coding convention hiện có; không tạo một bộ UI hoặc state-management song song nếu dự án đã có giải pháp tương ứng. Nếu admin đã có màn hình **Giới thiệu** (`ABOUT-ADMIN-UI-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-ADMIN-UI-PROMPT.md`), **Đặc sản** (`SPECIALTIES-ADMIN-UI-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-ADMIN-UI-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-ADMIN-UI-PROMPT.md`), **OCOP** (`OCOP-ADMIN-UI-PROMPT.md`), **Làng nghề** (`CRAFT-VILLAGES-ADMIN-UI-PROMPT.md`), **Ẩm thực** (`CUISINE-ADMIN-UI-PROMPT.md`), **Lễ hội** (`FESTIVALS-ADMIN-UI-PROMPT.md`), **Tour trải nghiệm** (`EXPERIENCE-TOURS-ADMIN-UI-PROMPT.md`), **Bản đồ** (`MAP-PLACES-ADMIN-UI-PROMPT.md`) hoặc **Tin tức** (`NEWS-ADMIN-UI-PROMPT.md`), hãy tái sử dụng đúng pattern layout/permission/upload/preview/reorder đã dựng ở đó thay vì phát minh lại — màn hình Liên hệ có cùng hình dạng CRUD danh sách, cộng thêm việc nhập số điện thoại/email theo định dạng có thể bấm gọi/gửi mail được.

## 1. Mục tiêu

Tạo màn hình admin giúp biên tập viên quản lý danh sách các đầu mối hiển thị ở trang `Liên hệ` của Mini App (`contacts.tsx`/`contact-detail.tsx`):

1. Danh sách liên hệ: lọc theo danh mục (`Hành chính`/`Khẩn cấp`/`Du lịch`/`Nông nghiệp`/`Phản ánh`), tìm kiếm theo tên/số điện thoại, phân trang, sắp xếp thứ tự hiển thị, bật/tắt hiển thị.
2. Form tạo mới/chỉnh sửa một đầu mối:
   - Thông tin cơ bản: tên, danh mục, vai trò/chức năng, số điện thoại, email (tùy chọn), địa chỉ, giờ làm việc, ảnh đại diện + alt text.
   - Mô tả ngắn (tóm tắt hiển thị ở danh sách).
   - Mô tả chi tiết: nhiều đoạn văn, thêm/xóa/sắp xếp.
   - Nội dung hỗ trợ: danh sách chuỗi ngắn, thêm/xóa/sắp xếp.
   - Lưu ý: textarea một đoạn văn tự do.
3. Xóa một đầu mối (có xác nhận).

Đây là màn hình **CRUD danh sách**, giống cấu trúc các chức năng danh sách khác đã có: không cần workflow lưu nháp → xuất bản cho toàn trang, nhưng mỗi đầu mối cập nhật vẫn phải chống ghi đè khi hai admin sửa cùng lúc (optimistic locking qua `version`).

**Lưu ý nghiệp vụ quan trọng**: khác các trường chuỗi tự do ở những màn hình trước, `phone` và `email` ở đây **có tác dụng thực tế** — `contact-detail.tsx` dựng link `tel:`/`mailto:` trực tiếp từ hai trường này để hiển thị nút "Gọi ngay"/"Gửi email". Vì vậy input phải validate định dạng ngay trên client (không chỉ required), và preview nên thử hiển thị nút gọi/email y như Mini App để admin phát hiện lỗi nhập trước khi lưu.

## 2. API sử dụng

Tích hợp API thật, không để mock data trong bản bàn giao:

- `GET /api/admin/contacts`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, filter `category`, search theo tên/số điện thoại.
- `GET /api/admin/contacts/:id`: chi tiết một đầu mối kèm `version`.
- `POST /api/admin/contacts`: tạo đầu mối mới.
- `PUT /api/admin/contacts/:id`: cập nhật một đầu mối, gửi kèm `version`.
- `DELETE /api/admin/contacts/:id`: xóa một đầu mối.
- `PATCH /api/admin/contacts/:id/status`: bật/tắt hiển thị.
- `PATCH /api/admin/contacts/reorder`: cập nhật thứ tự hàng loạt.
- Media upload: dùng endpoint/component upload có sẵn của hệ thống.

Nếu backend dùng prefix hoặc response envelope khác thì adapter theo codebase, nhưng không tự ý thay đổi ý nghĩa contract. Khi backend trả `409 CONTACT_VERSION_CONFLICT`, phải giữ dữ liệu người dùng đang nhập, khóa thao tác lưu và hiển thị lựa chọn tải phiên bản mới; không âm thầm ghi đè.

Kiểu dữ liệu chính:

```ts
type ContactCategory =
  | "Hành chính"
  | "Khẩn cấp"
  | "Du lịch"
  | "Nông nghiệp"
  | "Phản ánh";

type ContactAdminItem = {
  id: string;
  version: number;
  name: string;
  category: ContactCategory;
  role: string;
  phone: string;
  email?: string;
  address: string;
  workingTime: string;
  summary: string;
  description: string[];
  supportTopics: string[];
  note: string;
  mediaId?: string;
  imageUrl?: string;
  imageAlt: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string;
};
```

## 3. Route, menu và quyền

- Thêm route theo convention admin hiện tại, đề xuất `/admin/content/contacts` (danh sách) và `/admin/content/contacts/:id` (tạo/sửa, hoặc modal/drawer nếu convention dự án dùng inline form).
- Thêm menu `Nội dung → Liên hệ` với icon có sẵn trong design system.
- Route phải có auth guard.
- Role có quyền xem chỉ được đọc; role có quyền sửa được tạo/sửa/xóa/sắp xếp/bật-tắt hiển thị theo đúng quyền được cấp (không gộp chung một quyền nếu hệ thống phân quyền chi tiết hơn).
- Không chỉ ẩn nút ở UI; vẫn xử lý rõ response `401/403` từ API.

## 4. Bố cục màn hình

### Trang danh sách

- Header: tiêu đề `Quản lý Liên hệ`, nút `Thêm liên hệ mới`.
- Thanh công cụ: filter theo `category` (`Tất cả`/`Hành chính`/`Khẩn cấp`/`Du lịch`/`Nông nghiệp`/`Phản ánh`), ô tìm kiếm theo tên/số điện thoại, tổng số kết quả.
- Bảng/danh sách card gồm: ảnh thumbnail, tên, danh mục, số điện thoại, trạng thái hiển thị (toggle), thao tác `Sửa`/`Xóa`.
- Sắp xếp thứ tự hiển thị bằng kéo thả nếu dự án đã có thư viện; luôn cung cấp nút `Lên/Xuống` làm phương án accessible. Sau reorder phải chuẩn hóa `sortOrder` thành `0..n-1` trước khi gửi API.
- Phân trang hoặc infinite scroll theo convention danh sách admin hiện có.
- Loading skeleton khi tải lần đầu, empty state khi chưa có đầu mối nào hoặc không khớp filter/search, retry khi API lỗi.

### Form tạo mới/chỉnh sửa

Chia thành card/section rõ ràng:

1. **Thông tin cơ bản**
   - Input tên, select danh mục (`Hành chính`/`Khẩn cấp`/`Du lịch`/`Nông nghiệp`/`Phản ánh`), input vai trò/chức năng, input số điện thoại (validate chỉ số/khoảng trắng/dấu `+` đầu chuỗi), input email tùy chọn (validate định dạng email nếu có nhập), input địa chỉ, input giờ làm việc.
   - Upload/đổi/xóa ảnh đại diện, có thumbnail, progress, trạng thái lỗi và nút thử lại.
   - Input alt text.
   - Textarea tóm tắt (summary) hiển thị ở danh sách.

2. **Mô tả chi tiết**
   - Danh sách textarea đoạn văn; thêm, xóa, kéo thả/sắp xếp.
   - Không dùng rich-text editor nếu Mini App chỉ render plain text.

3. **Nội dung hỗ trợ**
   - Editable list gồm các chuỗi ngắn; thao tác thêm/xóa/sắp xếp.

4. **Lưu ý**
   - Textarea một đoạn văn tự do.

- Toggle `Hiển thị trên Mini App` (map với `isActive`) nằm ở vị trí dễ thấy trong form (ví dụ trong header của form).
- Nút `Lưu` (tạo mới hoặc cập nhật tùy ngữ cảnh) và `Hủy`. Disable nút đúng trạng thái loading/permission/dirty/validation; chống double submit.

## 5. Xem trước

- Nút `Xem trước` mở drawer/modal mô phỏng giao diện mobile của trang chi tiết (tương ứng `contact-detail.tsx`), dùng dữ liệu form hiện tại (bao gồm ảnh mới vừa upload nếu có, lấy URL do media API trả về), **hiển thị đúng nút "Gọi ngay"/"Gửi email" như Mini App thật** để admin kiểm tra số điện thoại/email đã nhập đúng trước khi lưu.
- Preview chỉ dành cho admin và không được làm nội dung public thay đổi cho tới khi bấm `Lưu`.

## 6. Validation và UX

Áp dụng cùng giới hạn với backend và hiển thị lỗi sát field:

- Required: tên, danh mục, vai trò, số điện thoại, địa chỉ, giờ làm việc, ảnh đại diện, tóm tắt, ít nhất một đoạn mô tả chi tiết. `email` là tùy chọn.
- Giới hạn đề xuất: tên 150 ký tự, vai trò 255, số điện thoại 30, email 255, địa chỉ 255, giờ làm việc 150, tóm tắt 300, lưu ý 2.000 ký tự, mỗi đoạn mô tả 5.000 ký tự, mỗi nội dung hỗ trợ 200 ký tự.
- Số điện thoại: chỉ chấp nhận chữ số, khoảng trắng và tối đa một dấu `+` ở đầu; báo lỗi rõ ràng nếu admin gõ ký tự chữ hoặc ký hiệu khác.
- Email: nếu có nhập, phải đúng định dạng email chuẩn; để trống là hợp lệ.
- Tối đa 20 đoạn mô tả, tối đa 20 nội dung hỗ trợ.
- Trim dữ liệu trước khi gửi nhưng không làm mất xuống dòng hợp lệ trong textarea.
- Confirm trước khi xóa một đầu mối hoặc rời trang khi có thay đổi chưa lưu.
- Toast thành công chỉ hiển thị sau khi API xác nhận.
- Khi lưu lỗi, không reset form và không làm mất ảnh/nội dung đang nhập.
- Hiển thị lỗi mạng, `400/422`, `401/403`, `409` và `5xx` bằng thông báo tiếng Việt dễ hiểu.
- Không dùng `window.confirm` nếu dự án đã có modal xác nhận.

## 7. Responsive và accessibility

- Tối ưu desktop admin từ 1280px, vẫn thao tác được ở tablet 768px.
- Label liên kết đúng với input; thứ tự tab hợp lý; focus state rõ ràng.
- Tất cả button có type đúng; icon-only button có accessible name/tooltip.
- Ảnh có alt; lỗi form được liên kết bằng `aria-describedby` khi component hỗ trợ.
- Input số điện thoại nên dùng `type="tel"`, input email nên dùng `type="email"` để tận dụng validate/bàn phím phù hợp của trình duyệt, nhưng vẫn phải validate lại ở JS vì `type` HTML không đủ chặt.
- Không chỉ dùng màu để biểu đạt trạng thái hiển thị/ẩn.
- Drag handle dùng được bằng bàn phím hoặc có nút Lên/Xuống tương đương.

## 8. Quản lý state và tích hợp

- Dùng form/state solution có sẵn trong admin.
- Giữ ID của đầu mối đã có; item mới dùng temporary client ID an toàn rồi thay bằng ID backend trả về nếu contract yêu cầu.
- Tách DTO mapping khỏi component trình bày; không rải logic response envelope khắp UI.
- Hủy request hoặc bỏ qua response cũ khi component unmount/chuyển route.
- Không gửi lại file binary trong `PUT /contacts/:id`; upload media trước và gửi `mediaId`.
- Sau lưu thành công, reset dirty state theo response mới và cập nhật `version`; refetch hoặc cập nhật danh sách để phản ánh đúng trạng thái server.
- Sau reorder/toggle hiển thị thành công, cập nhật UI theo response server thay vì chỉ optimistic update không đồng bộ lại.
- Gửi `email` là `undefined`/không có field trong payload khi để trống, không gửi chuỗi rỗng, để khớp đúng optional field phía backend.

## 9. Test bắt buộc

Viết test theo stack hiện tại, tối thiểu:

- Render đúng danh sách từ `GET /api/admin/contacts`, filter theo danh mục và search hoạt động đúng.
- Tạo/sửa/xóa một đầu mối tạo payload đúng và cập nhật lại danh sách.
- Thêm/xóa/sửa/reorder đoạn mô tả và nội dung hỗ trợ trong form.
- Validation chặn lưu khi số điện thoại/email sai định dạng, nhưng không làm mất dữ liệu đã nhập; email để trống vẫn lưu được.
- Upload ảnh thành công/thất bại và retry.
- Preview hiển thị đúng link gọi/email tương ứng dữ liệu đang nhập và không gọi API public.
- Xóa có modal xác nhận và chống double click.
- `403` khóa đúng thao tác; `409` hiện conflict và không ghi đè form.
- Cảnh báo khi rời trang có unsaved changes.
- Bật/tắt hiển thị phản ánh đúng trạng thái ngay trong danh sách admin.

## 10. Tiêu chí nghiệm thu và bàn giao

- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp đầy đủ các đầu mối liên hệ mà không cần sửa code Mini App.
- Số điện thoại và email nhập từ admin hoạt động đúng với nút "Gọi ngay"/"Gửi email" trên Mini App.
- Thứ tự và trạng thái ẩn/hiện được giữ đúng sau reload.
- Ảnh được upload qua media service và hiển thị đúng trên môi trường deploy.
- Có xử lý quyền, validation (bao gồm định dạng phone/email), concurrent edit (`409`), loading/error/empty state và unsaved changes.
- Không còn mock data hoặc TODO cản trở luồng chính.
- Liệt kê file đã tạo/sửa; chạy lint, type-check, test và build, sau đó báo kết quả chính xác.
