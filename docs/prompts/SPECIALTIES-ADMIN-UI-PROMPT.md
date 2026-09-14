# Prompt xây dựng giao diện Admin cho chức năng Đặc sản

Bạn là Senior Frontend Engineer. Hãy phân tích codebase admin hiện tại trước khi triển khai và xây dựng màn hình quản trị nội dung **Đặc sản** cho LocalGo. Phải tái sử dụng layout, router, auth guard, permission, design system, form library, API client, upload component, notification, modal xác nhận và coding convention hiện có; không tạo một bộ UI hoặc state-management song song nếu dự án đã có giải pháp tương ứng. Nếu admin đã có màn hình **Giới thiệu** (`ABOUT-ADMIN-UI-PROMPT.md`) hoặc **Đền - Chùa - Miếu** (`TEMPLES-ADMIN-UI-PROMPT.md`), hãy tái sử dụng đúng pattern layout/permission/upload/preview/reorder đã dựng ở đó thay vì phát minh lại — màn hình Đặc sản có cùng hình dạng CRUD danh sách với Đền - Chùa - Miếu, chỉ khác field nghiệp vụ.

## 1. Mục tiêu

Tạo màn hình admin giúp biên tập viên quản lý danh sách các đặc sản hiển thị ở trang `Đặc sản` của Mini App (`specialties.tsx`/`specialty-detail.tsx`):

1. Danh sách đặc sản: lọc theo danh mục (`Món ăn`/`Trái cây`/`Quà mang về`), tìm kiếm theo tên, phân trang, sắp xếp thứ tự hiển thị, bật/tắt hiển thị.
2. Form tạo mới/chỉnh sửa một đặc sản:
   - Thông tin cơ bản: tên, danh mục, giá, mùa vụ, ảnh đại diện + alt text.
   - Mô tả ngắn (tóm tắt hiển thị ở danh sách).
   - Mô tả chi tiết: nhiều đoạn văn, thêm/xóa/sắp xếp.
   - Địa điểm mua: danh sách chuỗi, thêm/xóa/sắp xếp.
3. Xóa một đặc sản (có xác nhận).

Đây là màn hình **CRUD danh sách**, giống cấu trúc `Đền - Chùa - Miếu`: không cần workflow lưu nháp → xuất bản cho toàn trang, nhưng mỗi đặc sản cập nhật vẫn phải chống ghi đè khi hai admin sửa cùng lúc (optimistic locking qua `version`).

## 2. API sử dụng

Tích hợp API thật, không để mock data trong bản bàn giao:

- `GET /api/admin/specialties`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, filter `category`, search theo tên.
- `GET /api/admin/specialties/:id`: chi tiết một đặc sản kèm `version`.
- `POST /api/admin/specialties`: tạo đặc sản mới.
- `PUT /api/admin/specialties/:id`: cập nhật một đặc sản, gửi kèm `version`.
- `DELETE /api/admin/specialties/:id`: xóa một đặc sản.
- `PATCH /api/admin/specialties/:id/status`: bật/tắt hiển thị.
- `PATCH /api/admin/specialties/reorder`: cập nhật thứ tự hàng loạt.
- Media upload: dùng endpoint/component upload có sẵn của hệ thống.

Nếu backend dùng prefix hoặc response envelope khác thì adapter theo codebase, nhưng không tự ý thay đổi ý nghĩa contract. Khi backend trả `409 SPECIALTY_VERSION_CONFLICT`, phải giữ dữ liệu người dùng đang nhập, khóa thao tác lưu và hiển thị lựa chọn tải phiên bản mới; không âm thầm ghi đè.

Kiểu dữ liệu chính:

```ts
type SpecialtyCategory = "Món ăn" | "Trái cây" | "Quà mang về";

type SpecialtyAdminItem = {
  id: string;
  version: number;
  name: string;
  category: SpecialtyCategory;
  price: string;
  season: string;
  summary: string;
  description: string[];
  buyPlaces: string[];
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

- Thêm route theo convention admin hiện tại, đề xuất `/admin/content/specialties` (danh sách) và `/admin/content/specialties/:id` (tạo/sửa, hoặc modal/drawer nếu convention dự án dùng inline form).
- Thêm menu `Nội dung → Đặc sản` với icon có sẵn trong design system.
- Route phải có auth guard.
- Role có quyền xem chỉ được đọc; role có quyền sửa được tạo/sửa/xóa/sắp xếp/bật-tắt hiển thị theo đúng quyền được cấp (không gộp chung một quyền nếu hệ thống phân quyền chi tiết hơn).
- Không chỉ ẩn nút ở UI; vẫn xử lý rõ response `401/403` từ API.

## 4. Bố cục màn hình

### Trang danh sách

- Header: tiêu đề `Quản lý Đặc sản`, nút `Thêm đặc sản mới`.
- Thanh công cụ: filter theo `category` (`Tất cả`/`Món ăn`/`Trái cây`/`Quà mang về`), ô tìm kiếm theo tên, tổng số kết quả.
- Bảng/danh sách card gồm: ảnh thumbnail, tên, danh mục, giá, trạng thái hiển thị (toggle), thao tác `Sửa`/`Xóa`.
- Sắp xếp thứ tự hiển thị bằng kéo thả nếu dự án đã có thư viện; luôn cung cấp nút `Lên/Xuống` làm phương án accessible. Sau reorder phải chuẩn hóa `sortOrder` thành `0..n-1` trước khi gửi API.
- Phân trang hoặc infinite scroll theo convention danh sách admin hiện có.
- Loading skeleton khi tải lần đầu, empty state khi chưa có đặc sản nào hoặc không khớp filter/search, retry khi API lỗi.

### Form tạo mới/chỉnh sửa

Chia thành card/section rõ ràng:

1. **Thông tin cơ bản**
   - Input tên, select danh mục (`Món ăn`/`Trái cây`/`Quà mang về`), input giá, input mùa vụ.
   - Upload/đổi/xóa ảnh đại diện, có thumbnail, progress, trạng thái lỗi và nút thử lại.
   - Input alt text.
   - Textarea tóm tắt (summary) hiển thị ở danh sách.

2. **Mô tả chi tiết**
   - Danh sách textarea đoạn văn; thêm, xóa, kéo thả/sắp xếp.
   - Không dùng rich-text editor nếu Mini App chỉ render plain text.

3. **Địa điểm mua**
   - Editable list gồm các chuỗi mô tả địa điểm; thao tác thêm/xóa/sắp xếp.

- Toggle `Hiển thị trên Mini App` (map với `isActive`) nằm ở vị trí dễ thấy trong form (ví dụ trong header của form).
- Nút `Lưu` (tạo mới hoặc cập nhật tùy ngữ cảnh) và `Hủy`. Disable nút đúng trạng thái loading/permission/dirty/validation; chống double submit.

## 5. Xem trước

- Nút `Xem trước` mở drawer/modal mô phỏng giao diện mobile của trang chi tiết đặc sản (tương ứng `specialty-detail.tsx`), dùng dữ liệu form hiện tại (bao gồm ảnh mới vừa upload nếu có, lấy URL do media API trả về).
- Preview chỉ dành cho admin và không được làm nội dung public thay đổi cho tới khi bấm `Lưu`.

## 6. Validation và UX

Áp dụng cùng giới hạn với backend và hiển thị lỗi sát field:

- Required: tên, danh mục, giá, mùa vụ, ảnh đại diện, tóm tắt, ít nhất một đoạn mô tả chi tiết.
- Giới hạn đề xuất: tên 150 ký tự, giá 100, mùa vụ 100, tóm tắt 300, mỗi đoạn mô tả 5.000 ký tự, mỗi địa điểm mua 200 ký tự.
- Tối đa 20 đoạn mô tả, tối đa 20 địa điểm mua.
- Trim dữ liệu trước khi gửi nhưng không làm mất xuống dòng hợp lệ trong textarea.
- Confirm trước khi xóa một đặc sản hoặc rời trang khi có thay đổi chưa lưu.
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
- Giữ ID của đặc sản đã có; item mới dùng temporary client ID an toàn rồi thay bằng ID backend trả về nếu contract yêu cầu.
- Tách DTO mapping khỏi component trình bày; không rải logic response envelope khắp UI.
- Hủy request hoặc bỏ qua response cũ khi component unmount/chuyển route.
- Không gửi lại file binary trong `PUT /specialties/:id`; upload media trước và gửi `mediaId`.
- Sau lưu thành công, reset dirty state theo response mới và cập nhật `version`; refetch hoặc cập nhật danh sách để phản ánh đúng trạng thái server.
- Sau reorder/toggle hiển thị thành công, cập nhật UI theo response server thay vì chỉ optimistic update không đồng bộ lại.

## 9. Test bắt buộc

Viết test theo stack hiện tại, tối thiểu:

- Render đúng danh sách từ `GET /api/admin/specialties`, filter theo danh mục và search hoạt động đúng.
- Tạo/sửa/xóa một đặc sản tạo payload đúng và cập nhật lại danh sách.
- Thêm/xóa/sửa/reorder đoạn mô tả và địa điểm mua trong form.
- Upload ảnh thành công/thất bại và retry.
- Validation chặn lưu nhưng không làm mất dữ liệu đã nhập.
- Preview không gọi API public.
- Xóa có modal xác nhận và chống double click.
- `403` khóa đúng thao tác; `409` hiện conflict và không ghi đè form.
- Cảnh báo khi rời trang có unsaved changes.
- Bật/tắt hiển thị phản ánh đúng trạng thái ngay trong danh sách admin.

## 10. Tiêu chí nghiệm thu và bàn giao

- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp đầy đủ các đặc sản mà không cần sửa code Mini App.
- Thứ tự và trạng thái ẩn/hiện được giữ đúng sau reload.
- Ảnh được upload qua media service và hiển thị đúng trên môi trường deploy.
- Có xử lý quyền, validation, concurrent edit (`409`), loading/error/empty state và unsaved changes.
- Không còn mock data hoặc TODO cản trở luồng chính.
- Liệt kê file đã tạo/sửa; chạy lint, type-check, test và build, sau đó báo kết quả chính xác.
