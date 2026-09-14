# Prompt xây dựng giao diện Admin cho chức năng Ẩm thực

Bạn là Senior Frontend Engineer. Hãy phân tích codebase admin hiện tại trước khi triển khai và xây dựng màn hình quản trị nội dung **Ẩm thực** cho LocalGo. Phải tái sử dụng layout, router, auth guard, permission, design system, form library, API client, upload component, notification, modal xác nhận và coding convention hiện có; không tạo một bộ UI hoặc state-management song song nếu dự án đã có giải pháp tương ứng. Nếu admin đã có màn hình **Giới thiệu** (`ABOUT-ADMIN-UI-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-ADMIN-UI-PROMPT.md`), **Đặc sản** (`SPECIALTIES-ADMIN-UI-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-ADMIN-UI-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-ADMIN-UI-PROMPT.md`), **OCOP** (`OCOP-ADMIN-UI-PROMPT.md`) hoặc **Làng nghề** (`CRAFT-VILLAGES-ADMIN-UI-PROMPT.md`), hãy tái sử dụng đúng pattern layout/permission/upload/preview/reorder đã dựng ở đó thay vì phát minh lại — màn hình Ẩm thực có cùng hình dạng CRUD danh sách, chỉ khác field nghiệp vụ.

## 1. Mục tiêu

Tạo màn hình admin giúp biên tập viên quản lý danh sách các món hiển thị ở trang `Ẩm thực` của Mini App (`cuisine.tsx`/`cuisine-detail.tsx`):

1. Danh sách món ăn: lọc theo danh mục (`Món nước`/`Món nướng`/`Món cuốn`/`Ăn vặt`/`Món chay`), tìm kiếm theo tên, phân trang, sắp xếp thứ tự hiển thị, bật/tắt hiển thị.
2. Form tạo mới/chỉnh sửa một món:
   - Thông tin cơ bản: tên, danh mục, khoảng giá, thời điểm nên ăn, ảnh đại diện + alt text.
   - Địa điểm gợi ý: danh sách chuỗi, thêm/xóa/sắp xếp.
   - Mô tả ngắn (tóm tắt hiển thị ở danh sách).
   - Mô tả chi tiết: nhiều đoạn văn, thêm/xóa/sắp xếp.
   - Điểm nổi bật: danh sách chuỗi ngắn, thêm/xóa/sắp xếp.
   - Mẹo thưởng thức: textarea một đoạn văn tự do.
3. Xóa một món (có xác nhận).

Đây là màn hình **CRUD danh sách**, giống cấu trúc `Đền - Chùa - Miếu`, `Đặc sản`, `Di tích lịch sử`, `Nông nghiệp`, `OCOP` và `Làng nghề`: không cần workflow lưu nháp → xuất bản cho toàn trang, nhưng mỗi món cập nhật vẫn phải chống ghi đè khi hai admin sửa cùng lúc (optimistic locking qua `version`).

## 2. API sử dụng

Tích hợp API thật, không để mock data trong bản bàn giao:

- `GET /api/admin/cuisine`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, filter `category`, search theo tên.
- `GET /api/admin/cuisine/:id`: chi tiết một món kèm `version`.
- `POST /api/admin/cuisine`: tạo món mới.
- `PUT /api/admin/cuisine/:id`: cập nhật một món, gửi kèm `version`.
- `DELETE /api/admin/cuisine/:id`: xóa một món.
- `PATCH /api/admin/cuisine/:id/status`: bật/tắt hiển thị.
- `PATCH /api/admin/cuisine/reorder`: cập nhật thứ tự hàng loạt.
- Media upload: dùng endpoint/component upload có sẵn của hệ thống.

Nếu backend dùng prefix hoặc response envelope khác thì adapter theo codebase, nhưng không tự ý thay đổi ý nghĩa contract. Khi backend trả `409 CUISINE_ITEM_VERSION_CONFLICT`, phải giữ dữ liệu người dùng đang nhập, khóa thao tác lưu và hiển thị lựa chọn tải phiên bản mới; không âm thầm ghi đè.

Kiểu dữ liệu chính:

```ts
type CuisineCategory =
  | "Món nước"
  | "Món nướng"
  | "Món cuốn"
  | "Ăn vặt"
  | "Món chay";

type CuisineAdminItem = {
  id: string;
  version: number;
  name: string;
  category: CuisineCategory;
  priceRange: string;
  bestTime: string;
  suggestedPlaces: string[];
  summary: string;
  description: string[];
  highlights: string[];
  tip: string;
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

- Thêm route theo convention admin hiện tại, đề xuất `/admin/content/cuisine` (danh sách) và `/admin/content/cuisine/:id` (tạo/sửa, hoặc modal/drawer nếu convention dự án dùng inline form).
- Thêm menu `Nội dung → Ẩm thực` với icon có sẵn trong design system.
- Route phải có auth guard.
- Role có quyền xem chỉ được đọc; role có quyền sửa được tạo/sửa/xóa/sắp xếp/bật-tắt hiển thị theo đúng quyền được cấp (không gộp chung một quyền nếu hệ thống phân quyền chi tiết hơn).
- Không chỉ ẩn nút ở UI; vẫn xử lý rõ response `401/403` từ API.

## 4. Bố cục màn hình

### Trang danh sách

- Header: tiêu đề `Quản lý Ẩm thực`, nút `Thêm món mới`.
- Thanh công cụ: filter theo `category` (`Tất cả`/`Món nước`/`Món nướng`/`Món cuốn`/`Ăn vặt`/`Món chay`), ô tìm kiếm theo tên, tổng số kết quả.
- Bảng/danh sách card gồm: ảnh thumbnail, tên, danh mục, khoảng giá, trạng thái hiển thị (toggle), thao tác `Sửa`/`Xóa`.
- Sắp xếp thứ tự hiển thị bằng kéo thả nếu dự án đã có thư viện; luôn cung cấp nút `Lên/Xuống` làm phương án accessible. Sau reorder phải chuẩn hóa `sortOrder` thành `0..n-1` trước khi gửi API.
- Phân trang hoặc infinite scroll theo convention danh sách admin hiện có.
- Loading skeleton khi tải lần đầu, empty state khi chưa có món nào hoặc không khớp filter/search, retry khi API lỗi.

### Form tạo mới/chỉnh sửa

Chia thành card/section rõ ràng:

1. **Thông tin cơ bản**
   - Input tên, select danh mục (`Món nước`/`Món nướng`/`Món cuốn`/`Ăn vặt`/`Món chay`), input khoảng giá, input thời điểm nên ăn.
   - Upload/đổi/xóa ảnh đại diện, có thumbnail, progress, trạng thái lỗi và nút thử lại.
   - Input alt text.
   - Textarea tóm tắt (summary) hiển thị ở danh sách.

2. **Địa điểm gợi ý**
   - Editable list gồm các chuỗi ngắn; thao tác thêm/xóa/sắp xếp.

3. **Mô tả chi tiết**
   - Danh sách textarea đoạn văn; thêm, xóa, kéo thả/sắp xếp.
   - Không dùng rich-text editor nếu Mini App chỉ render plain text.

4. **Điểm nổi bật**
   - Editable list gồm các chuỗi ngắn; thao tác thêm/xóa/sắp xếp.

5. **Mẹo thưởng thức**
   - Textarea một đoạn văn tự do.

- Toggle `Hiển thị trên Mini App` (map với `isActive`) nằm ở vị trí dễ thấy trong form (ví dụ trong header của form).
- Nút `Lưu` (tạo mới hoặc cập nhật tùy ngữ cảnh) và `Hủy`. Disable nút đúng trạng thái loading/permission/dirty/validation; chống double submit.

## 5. Xem trước

- Nút `Xem trước` mở drawer/modal mô phỏng giao diện mobile của trang chi tiết (tương ứng `cuisine-detail.tsx`), dùng dữ liệu form hiện tại (bao gồm ảnh mới vừa upload nếu có, lấy URL do media API trả về).
- Preview chỉ dành cho admin và không được làm nội dung public thay đổi cho tới khi bấm `Lưu`.

## 6. Validation và UX

Áp dụng cùng giới hạn với backend và hiển thị lỗi sát field:

- Required: tên, danh mục, khoảng giá, thời điểm nên ăn, ảnh đại diện, tóm tắt, ít nhất một đoạn mô tả chi tiết.
- Giới hạn đề xuất: tên 150 ký tự, khoảng giá 100, thời điểm nên ăn 100, tóm tắt 300, mẹo thưởng thức 2.000 ký tự, mỗi đoạn mô tả 5.000 ký tự, mỗi điểm nổi bật/địa điểm gợi ý 200 ký tự.
- Tối đa 20 đoạn mô tả, tối đa 20 điểm nổi bật, tối đa 20 địa điểm gợi ý.
- Trim dữ liệu trước khi gửi nhưng không làm mất xuống dòng hợp lệ trong textarea.
- Confirm trước khi xóa một món hoặc rời trang khi có thay đổi chưa lưu.
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
- Giữ ID của món đã có; item mới dùng temporary client ID an toàn rồi thay bằng ID backend trả về nếu contract yêu cầu.
- Tách DTO mapping khỏi component trình bày; không rải logic response envelope khắp UI.
- Hủy request hoặc bỏ qua response cũ khi component unmount/chuyển route.
- Không gửi lại file binary trong `PUT /cuisine/:id`; upload media trước và gửi `mediaId`.
- Sau lưu thành công, reset dirty state theo response mới và cập nhật `version`; refetch hoặc cập nhật danh sách để phản ánh đúng trạng thái server.
- Sau reorder/toggle hiển thị thành công, cập nhật UI theo response server thay vì chỉ optimistic update không đồng bộ lại.

## 9. Test bắt buộc

Viết test theo stack hiện tại, tối thiểu:

- Render đúng danh sách từ `GET /api/admin/cuisine`, filter theo danh mục và search hoạt động đúng.
- Tạo/sửa/xóa một món tạo payload đúng và cập nhật lại danh sách.
- Thêm/xóa/sửa/reorder đoạn mô tả, điểm nổi bật và địa điểm gợi ý trong form.
- Upload ảnh thành công/thất bại và retry.
- Validation chặn lưu nhưng không làm mất dữ liệu đã nhập.
- Preview không gọi API public.
- Xóa có modal xác nhận và chống double click.
- `403` khóa đúng thao tác; `409` hiện conflict và không ghi đè form.
- Cảnh báo khi rời trang có unsaved changes.
- Bật/tắt hiển thị phản ánh đúng trạng thái ngay trong danh sách admin.

## 10. Tiêu chí nghiệm thu và bàn giao

- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp đầy đủ các món Ẩm thực mà không cần sửa code Mini App.
- Thứ tự và trạng thái ẩn/hiện được giữ đúng sau reload.
- Ảnh được upload qua media service và hiển thị đúng trên môi trường deploy.
- Có xử lý quyền, validation, concurrent edit (`409`), loading/error/empty state và unsaved changes.
- Không còn mock data hoặc TODO cản trở luồng chính.
- Liệt kê file đã tạo/sửa; chạy lint, type-check, test và build, sau đó báo kết quả chính xác.
