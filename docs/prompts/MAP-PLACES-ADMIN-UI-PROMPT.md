# Prompt xây dựng giao diện Admin cho chức năng Bản đồ

Bạn là Senior Frontend Engineer. Hãy phân tích codebase admin hiện tại trước khi triển khai và xây dựng màn hình quản trị nội dung **Bản đồ** (điểm trên bản đồ) cho LocalGo. Phải tái sử dụng layout, router, auth guard, permission, design system, form library, API client, upload component, notification, modal xác nhận và coding convention hiện có; không tạo một bộ UI hoặc state-management song song nếu dự án đã có giải pháp tương ứng. Nếu admin đã có màn hình **Giới thiệu** (`ABOUT-ADMIN-UI-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-ADMIN-UI-PROMPT.md`), **Đặc sản** (`SPECIALTIES-ADMIN-UI-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-ADMIN-UI-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-ADMIN-UI-PROMPT.md`), **OCOP** (`OCOP-ADMIN-UI-PROMPT.md`), **Làng nghề** (`CRAFT-VILLAGES-ADMIN-UI-PROMPT.md`), **Ẩm thực** (`CUISINE-ADMIN-UI-PROMPT.md`), **Lễ hội** (`FESTIVALS-ADMIN-UI-PROMPT.md`) hoặc **Tour trải nghiệm** (`EXPERIENCE-TOURS-ADMIN-UI-PROMPT.md`), hãy tái sử dụng đúng pattern layout/permission/upload/preview/reorder đã dựng ở đó thay vì phát minh lại — màn hình Bản đồ có cùng hình dạng CRUD danh sách, cộng thêm việc nhập tọa độ địa lý.

## 1. Mục tiêu

Tạo màn hình admin giúp biên tập viên quản lý danh sách các điểm hiển thị ở trang `Bản đồ` của Mini App (`map-places.tsx`/`map-place-detail.tsx`):

1. Danh sách điểm: lọc theo danh mục (`Hành chính`/`Du lịch`/`Di tích`/`Ẩm thực`/`Dịch vụ`), tìm kiếm theo tên/địa chỉ, phân trang, sắp xếp thứ tự hiển thị, bật/tắt hiển thị.
2. Form tạo mới/chỉnh sửa một điểm:
   - Thông tin cơ bản: tên, danh mục, địa chỉ, **tọa độ (vĩ độ/kinh độ)**, giờ mở cửa, khoảng cách từ trung tâm, ảnh đại diện + alt text.
   - Mô tả ngắn (tóm tắt hiển thị ở danh sách).
   - Mô tả chi tiết: nhiều đoạn văn, thêm/xóa/sắp xếp.
   - Điểm nổi bật: danh sách chuỗi ngắn, thêm/xóa/sắp xếp.
   - Ghi chú chỉ đường: textarea một đoạn văn tự do.
3. Xóa một điểm (có xác nhận).

Đây là màn hình **CRUD danh sách**, giống cấu trúc các chức năng danh sách khác đã có, cộng thêm phần nhập tọa độ: không cần workflow lưu nháp → xuất bản cho toàn trang, nhưng mỗi điểm cập nhật vẫn phải chống ghi đè khi hai admin sửa cùng lúc (optimistic locking qua `version`).

**Lưu ý UX quan trọng**: đây là màn hình đầu tiên trong nhóm cần nhập **tọa độ địa lý**. Kiểm tra trước xem admin đã có sẵn map picker component (chọn điểm trên bản đồ để lấy lat/lng) chưa — nếu có, tái sử dụng; nếu chưa có, tối thiểu cung cấp 2 input số riêng cho `lat`/`lng` kèm validate khoảng giá trị ngay trên client, và cân nhắc thêm liên kết "Xem trên Google Maps" bằng URL dựng từ tọa độ để admin kiểm tra nhanh vị trí đã nhập có đúng không.

## 2. API sử dụng

Tích hợp API thật, không để mock data trong bản bàn giao:

- `GET /api/admin/map-places`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, filter `category`, search theo tên/địa chỉ.
- `GET /api/admin/map-places/:id`: chi tiết một điểm kèm `version`.
- `POST /api/admin/map-places`: tạo điểm mới.
- `PUT /api/admin/map-places/:id`: cập nhật một điểm, gửi kèm `version`.
- `DELETE /api/admin/map-places/:id`: xóa một điểm.
- `PATCH /api/admin/map-places/:id/status`: bật/tắt hiển thị.
- `PATCH /api/admin/map-places/reorder`: cập nhật thứ tự hàng loạt.
- Media upload: dùng endpoint/component upload có sẵn của hệ thống.

Nếu backend dùng prefix hoặc response envelope khác thì adapter theo codebase, nhưng không tự ý thay đổi ý nghĩa contract. Khi backend trả `409 MAP_PLACE_VERSION_CONFLICT`, phải giữ dữ liệu người dùng đang nhập, khóa thao tác lưu và hiển thị lựa chọn tải phiên bản mới; không âm thầm ghi đè.

Kiểu dữ liệu chính:

```ts
type MapPlaceCategory =
  | "Hành chính"
  | "Du lịch"
  | "Di tích"
  | "Ẩm thực"
  | "Dịch vụ";

type MapPlaceAdminItem = {
  id: string;
  version: number;
  name: string;
  category: MapPlaceCategory;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  openTime: string;
  distanceFromCenter: string;
  summary: string;
  description: string[];
  highlights: string[];
  directionNote: string;
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

- Thêm route theo convention admin hiện tại, đề xuất `/admin/content/map-places` (danh sách) và `/admin/content/map-places/:id` (tạo/sửa, hoặc modal/drawer nếu convention dự án dùng inline form).
- Thêm menu `Nội dung → Bản đồ` với icon có sẵn trong design system.
- Route phải có auth guard.
- Role có quyền xem chỉ được đọc; role có quyền sửa được tạo/sửa/xóa/sắp xếp/bật-tắt hiển thị theo đúng quyền được cấp (không gộp chung một quyền nếu hệ thống phân quyền chi tiết hơn).
- Không chỉ ẩn nút ở UI; vẫn xử lý rõ response `401/403` từ API.

## 4. Bố cục màn hình

### Trang danh sách

- Header: tiêu đề `Quản lý điểm Bản đồ`, nút `Thêm điểm mới`.
- Thanh công cụ: filter theo `category` (`Tất cả`/`Hành chính`/`Du lịch`/`Di tích`/`Ẩm thực`/`Dịch vụ`), ô tìm kiếm theo tên/địa chỉ, tổng số kết quả.
- Bảng/danh sách card gồm: ảnh thumbnail, tên, danh mục, địa chỉ, tọa độ rút gọn (ví dụ `11.2418, 106.2024`), trạng thái hiển thị (toggle), thao tác `Sửa`/`Xóa`.
- Sắp xếp thứ tự hiển thị bằng kéo thả nếu dự án đã có thư viện; luôn cung cấp nút `Lên/Xuống` làm phương án accessible. Sau reorder phải chuẩn hóa `sortOrder` thành `0..n-1` trước khi gửi API.
- Phân trang hoặc infinite scroll theo convention danh sách admin hiện có.
- Loading skeleton khi tải lần đầu, empty state khi chưa có điểm nào hoặc không khớp filter/search, retry khi API lỗi.

### Form tạo mới/chỉnh sửa

Chia thành card/section rõ ràng:

1. **Thông tin cơ bản**
   - Input tên, select danh mục (`Hành chính`/`Du lịch`/`Di tích`/`Ẩm thực`/`Dịch vụ`), input địa chỉ, input giờ mở cửa, input khoảng cách từ trung tâm.
   - Tọa độ: map picker nếu có sẵn component, hoặc 2 input số `Vĩ độ (lat)`/`Kinh độ (lng)` kèm validate khoảng `[-90, 90]`/`[-180, 180]` ngay trên client; hiển thị link kiểm tra vị trí trên bản đồ ngoài (mở tab mới) để admin xác nhận trực quan.
   - Upload/đổi/xóa ảnh đại diện, có thumbnail, progress, trạng thái lỗi và nút thử lại.
   - Input alt text.
   - Textarea tóm tắt (summary) hiển thị ở danh sách.

2. **Mô tả chi tiết**
   - Danh sách textarea đoạn văn; thêm, xóa, kéo thả/sắp xếp.
   - Không dùng rich-text editor nếu Mini App chỉ render plain text.

3. **Điểm nổi bật**
   - Editable list gồm các chuỗi ngắn; thao tác thêm/xóa/sắp xếp.

4. **Ghi chú chỉ đường**
   - Textarea một đoạn văn tự do.

- Toggle `Hiển thị trên Mini App` (map với `isActive`) nằm ở vị trí dễ thấy trong form (ví dụ trong header của form).
- Nút `Lưu` (tạo mới hoặc cập nhật tùy ngữ cảnh) và `Hủy`. Disable nút đúng trạng thái loading/permission/dirty/validation; chống double submit.

## 5. Xem trước

- Nút `Xem trước` mở drawer/modal mô phỏng giao diện mobile của trang chi tiết (tương ứng `map-place-detail.tsx`), dùng dữ liệu form hiện tại (bao gồm ảnh mới vừa upload nếu có, lấy URL do media API trả về).
- Preview chỉ dành cho admin và không được làm nội dung public thay đổi cho tới khi bấm `Lưu`.

## 6. Validation và UX

Áp dụng cùng giới hạn với backend và hiển thị lỗi sát field:

- Required: tên, danh mục, địa chỉ, tọa độ (cả `lat` và `lng`), giờ mở cửa, khoảng cách từ trung tâm, ảnh đại diện, tóm tắt, ít nhất một đoạn mô tả chi tiết.
- Giới hạn đề xuất: tên 150 ký tự, địa chỉ 255, giờ mở cửa 150, khoảng cách từ trung tâm 100, tóm tắt 300, ghi chú chỉ đường 2.000 ký tự, mỗi đoạn mô tả 5.000 ký tự, mỗi điểm nổi bật 200 ký tự.
- Tọa độ: `lat` phải nằm trong `[-90, 90]`, `lng` phải nằm trong `[-180, 180]`; chặn submit nếu để trống, không phải số, hoặc ngoài khoảng — báo lỗi ngay tại field, không đợi API trả về.
- Tối đa 20 đoạn mô tả, tối đa 20 điểm nổi bật.
- Trim dữ liệu trước khi gửi nhưng không làm mất xuống dòng hợp lệ trong textarea.
- Confirm trước khi xóa một điểm hoặc rời trang khi có thay đổi chưa lưu.
- Toast thành công chỉ hiển thị sau khi API xác nhận.
- Khi lưu lỗi, không reset form và không làm mất ảnh/nội dung/tọa độ đang nhập.
- Hiển thị lỗi mạng, `400/422`, `401/403`, `409` và `5xx` bằng thông báo tiếng Việt dễ hiểu.
- Không dùng `window.confirm` nếu dự án đã có modal xác nhận.

## 7. Responsive và accessibility

- Tối ưu desktop admin từ 1280px, vẫn thao tác được ở tablet 768px.
- Label liên kết đúng với input; thứ tự tab hợp lý; focus state rõ ràng.
- Tất cả button có type đúng; icon-only button có accessible name/tooltip.
- Ảnh có alt; lỗi form được liên kết bằng `aria-describedby` khi component hỗ trợ.
- Không chỉ dùng màu để biểu đạt trạng thái hiển thị/ẩn.
- Nếu dùng map picker dạng kéo-thả marker, vẫn phải có input số lat/lng song song để nhập bằng bàn phím (không bắt buộc dùng chuột/cảm ứng để xác định vị trí).
- Drag handle dùng được bằng bàn phím hoặc có nút Lên/Xuống tương đương.

## 8. Quản lý state và tích hợp

- Dùng form/state solution có sẵn trong admin.
- Giữ ID của điểm đã có; item mới dùng temporary client ID an toàn rồi thay bằng ID backend trả về nếu contract yêu cầu.
- Tách DTO mapping khỏi component trình bày; không rải logic response envelope khắp UI.
- Hủy request hoặc bỏ qua response cũ khi component unmount/chuyển route.
- Không gửi lại file binary trong `PUT /map-places/:id`; upload media trước và gửi `mediaId`.
- Sau lưu thành công, reset dirty state theo response mới và cập nhật `version`; refetch hoặc cập nhật danh sách để phản ánh đúng trạng thái server.
- Sau reorder/toggle hiển thị thành công, cập nhật UI theo response server thay vì chỉ optimistic update không đồng bộ lại.
- Gửi `lat`/`lng` lên API dưới dạng số (không phải chuỗi) để tránh lỗi parse phía backend.

## 9. Test bắt buộc

Viết test theo stack hiện tại, tối thiểu:

- Render đúng danh sách từ `GET /api/admin/map-places`, filter theo danh mục và search hoạt động đúng.
- Tạo/sửa/xóa một điểm tạo payload đúng (bao gồm `coordinates` dạng số) và cập nhật lại danh sách.
- Thêm/xóa/sửa/reorder đoạn mô tả và điểm nổi bật trong form.
- Validation chặn lưu khi tọa độ trống, không hợp lệ hoặc ngoài khoảng, nhưng không làm mất dữ liệu đã nhập.
- Upload ảnh thành công/thất bại và retry.
- Preview không gọi API public.
- Xóa có modal xác nhận và chống double click.
- `403` khóa đúng thao tác; `409` hiện conflict và không ghi đè form.
- Cảnh báo khi rời trang có unsaved changes.
- Bật/tắt hiển thị phản ánh đúng trạng thái ngay trong danh sách admin.

## 10. Tiêu chí nghiệm thu và bàn giao

- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp đầy đủ các điểm Bản đồ mà không cần sửa code Mini App.
- Tọa độ nhập vào hiển thị đúng vị trí thực tế khi kiểm tra trên bản đồ.
- Thứ tự và trạng thái ẩn/hiện được giữ đúng sau reload.
- Ảnh được upload qua media service và hiển thị đúng trên môi trường deploy.
- Có xử lý quyền, validation (bao gồm tọa độ), concurrent edit (`409`), loading/error/empty state và unsaved changes.
- Không còn mock data hoặc TODO cản trở luồng chính.
- Liệt kê file đã tạo/sửa; chạy lint, type-check, test và build, sau đó báo kết quả chính xác.
