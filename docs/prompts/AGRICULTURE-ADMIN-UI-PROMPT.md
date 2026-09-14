# Prompt xây dựng giao diện Admin cho chức năng Nông nghiệp

Bạn là Senior Frontend Engineer. Hãy phân tích codebase admin hiện tại trước khi triển khai và xây dựng màn hình quản trị nội dung **Nông nghiệp** cho LocalGo. Phải tái sử dụng layout, router, auth guard, permission, design system, form library, API client, upload component, notification, modal xác nhận và coding convention hiện có; không tạo một bộ UI hoặc state-management song song nếu dự án đã có giải pháp tương ứng. Nếu admin đã có màn hình **Giới thiệu** (`ABOUT-ADMIN-UI-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-ADMIN-UI-PROMPT.md`), **Đặc sản** (`SPECIALTIES-ADMIN-UI-PROMPT.md`) hoặc **Di tích lịch sử** (`HISTORICAL-SITES-ADMIN-UI-PROMPT.md`), hãy tái sử dụng đúng pattern layout/permission/upload/preview/reorder đã dựng ở đó thay vì phát minh lại — màn hình Nông nghiệp có cùng hình dạng CRUD danh sách, chỉ khác field nghiệp vụ.

## 1. Mục tiêu

Tạo màn hình admin giúp biên tập viên quản lý danh sách các mục hiển thị ở trang `Nông nghiệp` của Mini App (`agriculture.tsx`/`agriculture-detail.tsx`):

1. Danh sách mục: lọc theo danh mục (`Cây trồng chủ lực`/`Chăn nuôi`/`Thủy lợi`/`Mô hình sản xuất`), tìm kiếm theo tên/khu vực, phân trang, sắp xếp thứ tự hiển thị, bật/tắt hiển thị.
2. Form tạo mới/chỉnh sửa một mục:
   - Thông tin cơ bản: tên, danh mục, khu vực/vị trí, mùa vụ, quy mô, ảnh đại diện + alt text.
   - Mô tả ngắn (tóm tắt hiển thị ở danh sách).
   - Thông tin mô hình: nhiều đoạn văn, thêm/xóa/sắp xếp.
   - Điểm nổi bật: danh sách chuỗi ngắn, thêm/xóa/sắp xếp.
   - Hỗ trợ người dân: textarea một đoạn văn tự do.
3. Xóa một mục (có xác nhận).

Đây là màn hình **CRUD danh sách**, giống cấu trúc `Đền - Chùa - Miếu`, `Đặc sản` và `Di tích lịch sử`: không cần workflow lưu nháp → xuất bản cho toàn trang, nhưng mỗi mục cập nhật vẫn phải chống ghi đè khi hai admin sửa cùng lúc (optimistic locking qua `version`).

## 2. API sử dụng

Tích hợp API thật, không để mock data trong bản bàn giao:

- `GET /api/admin/agriculture`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, filter `category`, search theo tên/khu vực.
- `GET /api/admin/agriculture/:id`: chi tiết một mục kèm `version`.
- `POST /api/admin/agriculture`: tạo mục mới.
- `PUT /api/admin/agriculture/:id`: cập nhật một mục, gửi kèm `version`.
- `DELETE /api/admin/agriculture/:id`: xóa một mục.
- `PATCH /api/admin/agriculture/:id/status`: bật/tắt hiển thị.
- `PATCH /api/admin/agriculture/reorder`: cập nhật thứ tự hàng loạt.
- Media upload: dùng endpoint/component upload có sẵn của hệ thống.

Nếu backend dùng prefix hoặc response envelope khác thì adapter theo codebase, nhưng không tự ý thay đổi ý nghĩa contract. Khi backend trả `409 AGRICULTURE_ITEM_VERSION_CONFLICT`, phải giữ dữ liệu người dùng đang nhập, khóa thao tác lưu và hiển thị lựa chọn tải phiên bản mới; không âm thầm ghi đè.

Kiểu dữ liệu chính:

```ts
type AgricultureCategory =
  | "Cây trồng chủ lực"
  | "Chăn nuôi"
  | "Thủy lợi"
  | "Mô hình sản xuất";

type AgricultureAdminItem = {
  id: string;
  version: number;
  name: string;
  category: AgricultureCategory;
  location: string;
  season: string;
  scale: string;
  summary: string;
  description: string[];
  highlights: string[];
  support: string;
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

- Thêm route theo convention admin hiện tại, đề xuất `/admin/content/agriculture` (danh sách) và `/admin/content/agriculture/:id` (tạo/sửa, hoặc modal/drawer nếu convention dự án dùng inline form).
- Thêm menu `Nội dung → Nông nghiệp` với icon có sẵn trong design system.
- Route phải có auth guard.
- Role có quyền xem chỉ được đọc; role có quyền sửa được tạo/sửa/xóa/sắp xếp/bật-tắt hiển thị theo đúng quyền được cấp (không gộp chung một quyền nếu hệ thống phân quyền chi tiết hơn).
- Không chỉ ẩn nút ở UI; vẫn xử lý rõ response `401/403` từ API.

## 4. Bố cục màn hình

### Trang danh sách

- Header: tiêu đề `Quản lý Nông nghiệp`, nút `Thêm mục mới`.
- Thanh công cụ: filter theo `category` (`Tất cả`/`Cây trồng chủ lực`/`Chăn nuôi`/`Thủy lợi`/`Mô hình sản xuất`), ô tìm kiếm theo tên/khu vực, tổng số kết quả.
- Bảng/danh sách card gồm: ảnh thumbnail, tên, danh mục, khu vực, quy mô, trạng thái hiển thị (toggle), thao tác `Sửa`/`Xóa`.
- Sắp xếp thứ tự hiển thị bằng kéo thả nếu dự án đã có thư viện; luôn cung cấp nút `Lên/Xuống` làm phương án accessible. Sau reorder phải chuẩn hóa `sortOrder` thành `0..n-1` trước khi gửi API.
- Phân trang hoặc infinite scroll theo convention danh sách admin hiện có.
- Loading skeleton khi tải lần đầu, empty state khi chưa có mục nào hoặc không khớp filter/search, retry khi API lỗi.

### Form tạo mới/chỉnh sửa

Chia thành card/section rõ ràng:

1. **Thông tin cơ bản**
   - Input tên, select danh mục (`Cây trồng chủ lực`/`Chăn nuôi`/`Thủy lợi`/`Mô hình sản xuất`), input khu vực/vị trí, input mùa vụ, input quy mô.
   - Upload/đổi/xóa ảnh đại diện, có thumbnail, progress, trạng thái lỗi và nút thử lại.
   - Input alt text.
   - Textarea tóm tắt (summary) hiển thị ở danh sách.

2. **Thông tin mô hình**
   - Danh sách textarea đoạn văn; thêm, xóa, kéo thả/sắp xếp.
   - Không dùng rich-text editor nếu Mini App chỉ render plain text.

3. **Điểm nổi bật**
   - Editable list gồm các chuỗi ngắn; thao tác thêm/xóa/sắp xếp.

4. **Hỗ trợ người dân**
   - Textarea một đoạn văn tự do (thông tin liên hệ/hướng dẫn hỗ trợ).

- Toggle `Hiển thị trên Mini App` (map với `isActive`) nằm ở vị trí dễ thấy trong form (ví dụ trong header của form).
- Nút `Lưu` (tạo mới hoặc cập nhật tùy ngữ cảnh) và `Hủy`. Disable nút đúng trạng thái loading/permission/dirty/validation; chống double submit.

## 5. Xem trước

- Nút `Xem trước` mở drawer/modal mô phỏng giao diện mobile của trang chi tiết (tương ứng `agriculture-detail.tsx`), dùng dữ liệu form hiện tại (bao gồm ảnh mới vừa upload nếu có, lấy URL do media API trả về).
- Preview chỉ dành cho admin và không được làm nội dung public thay đổi cho tới khi bấm `Lưu`.

## 6. Validation và UX

Áp dụng cùng giới hạn với backend và hiển thị lỗi sát field:

- Required: tên, danh mục, khu vực/vị trí, mùa vụ, quy mô, ảnh đại diện, tóm tắt, hỗ trợ người dân, ít nhất một đoạn thông tin mô hình.
- Giới hạn đề xuất: tên 150 ký tự, khu vực 255, mùa vụ 150, quy mô 150, tóm tắt 300, hỗ trợ người dân 2.000 ký tự, mỗi đoạn mô tả 5.000 ký tự, mỗi điểm nổi bật 200 ký tự.
- Tối đa 20 đoạn mô tả, tối đa 20 điểm nổi bật.
- Trim dữ liệu trước khi gửi nhưng không làm mất xuống dòng hợp lệ trong textarea.
- Confirm trước khi xóa một mục hoặc rời trang khi có thay đổi chưa lưu.
- Toast thành công chỉ hiển thị sau khi API xác nhận.
- Khi lưu lỗi, không reset form và không làm mất ảnh/nội dung đang nhập.
- Hiển thị lỗi mạng, `400/422`, `401/403`, `409` và `5xx` bằng thông báo tiếng Việt dễ hiểu.
- Không dùng `window.confirm` nếu dự án đã có modal xác nhận.

## 7. Responsive và accessibility

- Tối ưu desktop admin từ 1280px, vẫn thao tác được ở tablet 768px.
- Label liên kết đúng với input; thứ tự tab hợp lý; focus state rõ ràng.
- Tất cả button có type đúng; icon-only button có accessible name/tooltip.
- Ảnh có alt; lỗi form được liên kết bằng `aria-describedby` khi component hỗ trợ.
- Không chỉ dùng màu để biểu đạt trạng thái hiển thị/ẩn.
- Drag handle dùng được bằng bàn phím hoặc có nút Lên/Xuống tương đương.

## 8. Quản lý state và tích hợp

- Dùng form/state solution có sẵn trong admin.
- Giữ ID của mục đã có; item mới dùng temporary client ID an toàn rồi thay bằng ID backend trả về nếu contract yêu cầu.
- Tách DTO mapping khỏi component trình bày; không rải logic response envelope khắp UI.
- Hủy request hoặc bỏ qua response cũ khi component unmount/chuyển route.
- Không gửi lại file binary trong `PUT /agriculture/:id`; upload media trước và gửi `mediaId`.
- Sau lưu thành công, reset dirty state theo response mới và cập nhật `version`; refetch hoặc cập nhật danh sách để phản ánh đúng trạng thái server.
- Sau reorder/toggle hiển thị thành công, cập nhật UI theo response server thay vì chỉ optimistic update không đồng bộ lại.

## 9. Test bắt buộc

Viết test theo stack hiện tại, tối thiểu:

- Render đúng danh sách từ `GET /api/admin/agriculture`, filter theo danh mục và search hoạt động đúng.
- Tạo/sửa/xóa một mục tạo payload đúng và cập nhật lại danh sách.
- Thêm/xóa/sửa/reorder đoạn mô tả và điểm nổi bật trong form.
- Upload ảnh thành công/thất bại và retry.
- Validation chặn lưu nhưng không làm mất dữ liệu đã nhập.
- Preview không gọi API public.
- Xóa có modal xác nhận và chống double click.
- `403` khóa đúng thao tác; `409` hiện conflict và không ghi đè form.
- Cảnh báo khi rời trang có unsaved changes.
- Bật/tắt hiển thị phản ánh đúng trạng thái ngay trong danh sách admin.

## 10. Tiêu chí nghiệm thu và bàn giao

- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp đầy đủ các mục Nông nghiệp mà không cần sửa code Mini App.
- Thứ tự và trạng thái ẩn/hiện được giữ đúng sau reload.
- Ảnh được upload qua media service và hiển thị đúng trên môi trường deploy.
- Có xử lý quyền, validation, concurrent edit (`409`), loading/error/empty state và unsaved changes.
- Không còn mock data hoặc TODO cản trở luồng chính.
- Liệt kê file đã tạo/sửa; chạy lint, type-check, test và build, sau đó báo kết quả chính xác.
