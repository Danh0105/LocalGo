# Prompt xây dựng giao diện Admin cho chức năng Di tích lịch sử

Bạn là Senior Frontend Engineer. Hãy phân tích codebase admin hiện tại trước khi triển khai và xây dựng màn hình quản trị nội dung **Di tích lịch sử** cho LocalGo. Phải tái sử dụng layout, router, auth guard, permission, design system, form library, API client, upload component, notification, modal xác nhận và coding convention hiện có; không tạo một bộ UI hoặc state-management song song nếu dự án đã có giải pháp tương ứng. Nếu admin đã có màn hình **Giới thiệu** (`ABOUT-ADMIN-UI-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-ADMIN-UI-PROMPT.md`) hoặc **Đặc sản** (`SPECIALTIES-ADMIN-UI-PROMPT.md`), hãy tái sử dụng đúng pattern layout/permission/upload/preview/reorder đã dựng ở đó thay vì phát minh lại — màn hình Di tích lịch sử có cùng hình dạng CRUD danh sách, chỉ khác field nghiệp vụ.

## 1. Mục tiêu

Tạo màn hình admin giúp biên tập viên quản lý danh sách các di tích hiển thị ở trang `Di tích lịch sử` của Mini App (`historical-sites.tsx`/`historical-site-detail.tsx`):

1. Danh sách di tích: lọc theo xếp hạng (`Cấp quốc gia`/`Cấp tỉnh`/`Chưa xếp hạng`), tìm kiếm theo tên/địa chỉ, phân trang, sắp xếp thứ tự hiển thị, bật/tắt hiển thị.
2. Form tạo mới/chỉnh sửa một di tích:
   - Thông tin cơ bản: tên, xếp hạng, địa chỉ, năm công nhận (tùy chọn), ảnh đại diện + alt text.
   - Mô tả ngắn (tóm tắt hiển thị ở danh sách).
   - Lịch sử di tích: nhiều đoạn văn, thêm/xóa/sắp xếp.
   - Điểm nổi bật: danh sách chuỗi ngắn, thêm/xóa/sắp xếp.
3. Xóa một di tích (có xác nhận).

Đây là màn hình **CRUD danh sách**, giống cấu trúc `Đền - Chùa - Miếu` và `Đặc sản`: không cần workflow lưu nháp → xuất bản cho toàn trang, nhưng mỗi di tích cập nhật vẫn phải chống ghi đè khi hai admin sửa cùng lúc (optimistic locking qua `version`).

## 2. API sử dụng

Tích hợp API thật, không để mock data trong bản bàn giao:

- `GET /api/admin/historical-sites`: danh sách đầy đủ (kể cả ẩn), hỗ trợ phân trang, filter `rank`, search theo tên/địa chỉ.
- `GET /api/admin/historical-sites/:id`: chi tiết một di tích kèm `version`.
- `POST /api/admin/historical-sites`: tạo di tích mới.
- `PUT /api/admin/historical-sites/:id`: cập nhật một di tích, gửi kèm `version`.
- `DELETE /api/admin/historical-sites/:id`: xóa một di tích.
- `PATCH /api/admin/historical-sites/:id/status`: bật/tắt hiển thị.
- `PATCH /api/admin/historical-sites/reorder`: cập nhật thứ tự hàng loạt.
- Media upload: dùng endpoint/component upload có sẵn của hệ thống.

Nếu backend dùng prefix hoặc response envelope khác thì adapter theo codebase, nhưng không tự ý thay đổi ý nghĩa contract. Khi backend trả `409 HISTORICAL_SITE_VERSION_CONFLICT`, phải giữ dữ liệu người dùng đang nhập, khóa thao tác lưu và hiển thị lựa chọn tải phiên bản mới; không âm thầm ghi đè.

Kiểu dữ liệu chính:

```ts
type HistoricalSiteRank = "Cấp quốc gia" | "Cấp tỉnh" | "Chưa xếp hạng";

type HistoricalSiteAdminItem = {
  id: string;
  version: number;
  name: string;
  rank: HistoricalSiteRank;
  address: string;
  recognizedYear?: number;
  summary: string;
  history: string[];
  highlights: string[];
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

- Thêm route theo convention admin hiện tại, đề xuất `/admin/content/historical-sites` (danh sách) và `/admin/content/historical-sites/:id` (tạo/sửa, hoặc modal/drawer nếu convention dự án dùng inline form).
- Thêm menu `Nội dung → Di tích lịch sử` với icon có sẵn trong design system.
- Route phải có auth guard.
- Role có quyền xem chỉ được đọc; role có quyền sửa được tạo/sửa/xóa/sắp xếp/bật-tắt hiển thị theo đúng quyền được cấp (không gộp chung một quyền nếu hệ thống phân quyền chi tiết hơn).
- Không chỉ ẩn nút ở UI; vẫn xử lý rõ response `401/403` từ API.

## 4. Bố cục màn hình

### Trang danh sách

- Header: tiêu đề `Quản lý Di tích lịch sử`, nút `Thêm di tích mới`.
- Thanh công cụ: filter theo `rank` (`Tất cả`/`Cấp quốc gia`/`Cấp tỉnh`/`Chưa xếp hạng`), ô tìm kiếm theo tên/địa chỉ, tổng số kết quả.
- Bảng/danh sách card gồm: ảnh thumbnail, tên, xếp hạng, địa chỉ, năm công nhận (nếu có), trạng thái hiển thị (toggle), thao tác `Sửa`/`Xóa`.
- Sắp xếp thứ tự hiển thị bằng kéo thả nếu dự án đã có thư viện; luôn cung cấp nút `Lên/Xuống` làm phương án accessible. Sau reorder phải chuẩn hóa `sortOrder` thành `0..n-1` trước khi gửi API.
- Phân trang hoặc infinite scroll theo convention danh sách admin hiện có.
- Loading skeleton khi tải lần đầu, empty state khi chưa có di tích nào hoặc không khớp filter/search, retry khi API lỗi.

### Form tạo mới/chỉnh sửa

Chia thành card/section rõ ràng:

1. **Thông tin cơ bản**
   - Input tên, select xếp hạng (`Cấp quốc gia`/`Cấp tỉnh`/`Chưa xếp hạng`), input địa chỉ.
   - Input năm công nhận (số, tùy chọn) — chỉ hiện/bắt buộc hợp lý khi xếp hạng khác `Chưa xếp hạng`, nhưng không chặn cứng nếu admin muốn để trống.
   - Upload/đổi/xóa ảnh đại diện, có thumbnail, progress, trạng thái lỗi và nút thử lại.
   - Input alt text.
   - Textarea tóm tắt (summary) hiển thị ở danh sách.

2. **Lịch sử di tích**
   - Danh sách textarea đoạn văn; thêm, xóa, kéo thả/sắp xếp.
   - Không dùng rich-text editor nếu Mini App chỉ render plain text.

3. **Điểm nổi bật**
   - Editable list gồm các chuỗi ngắn; thao tác thêm/xóa/sắp xếp.

- Toggle `Hiển thị trên Mini App` (map với `isActive`) nằm ở vị trí dễ thấy trong form (ví dụ trong header của form).
- Nút `Lưu` (tạo mới hoặc cập nhật tùy ngữ cảnh) và `Hủy`. Disable nút đúng trạng thái loading/permission/dirty/validation; chống double submit.

## 5. Xem trước

- Nút `Xem trước` mở drawer/modal mô phỏng giao diện mobile của trang chi tiết di tích (tương ứng `historical-site-detail.tsx`), dùng dữ liệu form hiện tại (bao gồm ảnh mới vừa upload nếu có, lấy URL do media API trả về).
- Preview chỉ dành cho admin và không được làm nội dung public thay đổi cho tới khi bấm `Lưu`.

## 6. Validation và UX

Áp dụng cùng giới hạn với backend và hiển thị lỗi sát field:

- Required: tên, xếp hạng, địa chỉ, ảnh đại diện, tóm tắt, ít nhất một đoạn lịch sử di tích.
- Giới hạn đề xuất: tên 150 ký tự, địa chỉ 255, tóm tắt 300, mỗi đoạn lịch sử 5.000 ký tự, mỗi điểm nổi bật 200 ký tự.
- Năm công nhận nếu nhập phải là số nguyên hợp lệ, không lớn hơn năm hiện tại.
- Tối đa 20 đoạn lịch sử, tối đa 20 điểm nổi bật.
- Trim dữ liệu trước khi gửi nhưng không làm mất xuống dòng hợp lệ trong textarea.
- Confirm trước khi xóa một di tích hoặc rời trang khi có thay đổi chưa lưu.
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
- Giữ ID của di tích đã có; item mới dùng temporary client ID an toàn rồi thay bằng ID backend trả về nếu contract yêu cầu.
- Tách DTO mapping khỏi component trình bày; không rải logic response envelope khắp UI.
- Hủy request hoặc bỏ qua response cũ khi component unmount/chuyển route.
- Không gửi lại file binary trong `PUT /historical-sites/:id`; upload media trước và gửi `mediaId`.
- Sau lưu thành công, reset dirty state theo response mới và cập nhật `version`; refetch hoặc cập nhật danh sách để phản ánh đúng trạng thái server.
- Sau reorder/toggle hiển thị thành công, cập nhật UI theo response server thay vì chỉ optimistic update không đồng bộ lại.

## 9. Test bắt buộc

Viết test theo stack hiện tại, tối thiểu:

- Render đúng danh sách từ `GET /api/admin/historical-sites`, filter theo xếp hạng và search hoạt động đúng.
- Tạo/sửa/xóa một di tích tạo payload đúng và cập nhật lại danh sách.
- Thêm/xóa/sửa/reorder đoạn lịch sử và điểm nổi bật trong form.
- Upload ảnh thành công/thất bại và retry.
- Validation chặn lưu nhưng không làm mất dữ liệu đã nhập (bao gồm năm công nhận không hợp lệ).
- Preview không gọi API public.
- Xóa có modal xác nhận và chống double click.
- `403` khóa đúng thao tác; `409` hiện conflict và không ghi đè form.
- Cảnh báo khi rời trang có unsaved changes.
- Bật/tắt hiển thị phản ánh đúng trạng thái ngay trong danh sách admin.

## 10. Tiêu chí nghiệm thu và bàn giao

- Admin tạo/sửa/xóa/ẩn-hiện/sắp xếp đầy đủ các di tích mà không cần sửa code Mini App.
- Thứ tự và trạng thái ẩn/hiện được giữ đúng sau reload.
- Ảnh được upload qua media service và hiển thị đúng trên môi trường deploy.
- Có xử lý quyền, validation, concurrent edit (`409`), loading/error/empty state và unsaved changes.
- Không còn mock data hoặc TODO cản trở luồng chính.
- Liệt kê file đã tạo/sửa; chạy lint, type-check, test và build, sau đó báo kết quả chính xác.
