# Prompt xây dựng giao diện Admin cho chức năng Tin tức

Bạn là Senior Frontend Engineer. Hãy phân tích codebase admin hiện tại trước khi triển khai và xây dựng màn hình quản trị nội dung **Tin tức** cho LocalGo. Phải tái sử dụng layout, router, auth guard, permission, design system, form library, API client, upload component, notification, modal xác nhận và coding convention hiện có; không tạo một bộ UI hoặc state-management song song nếu dự án đã có giải pháp tương ứng. Nếu admin đã có màn hình **Giới thiệu** (`ABOUT-ADMIN-UI-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-ADMIN-UI-PROMPT.md`), **Đặc sản** (`SPECIALTIES-ADMIN-UI-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-ADMIN-UI-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-ADMIN-UI-PROMPT.md`), **OCOP** (`OCOP-ADMIN-UI-PROMPT.md`), **Làng nghề** (`CRAFT-VILLAGES-ADMIN-UI-PROMPT.md`), **Ẩm thực** (`CUISINE-ADMIN-UI-PROMPT.md`), **Lễ hội** (`FESTIVALS-ADMIN-UI-PROMPT.md`), **Tour trải nghiệm** (`EXPERIENCE-TOURS-ADMIN-UI-PROMPT.md`) hoặc **Bản đồ** (`MAP-PLACES-ADMIN-UI-PROMPT.md`), hãy tái sử dụng đúng pattern layout/permission/upload/preview đã dựng ở đó thay vì phát minh lại.

## 1. Mục tiêu

Tạo màn hình admin giúp biên tập viên quản lý danh sách bài viết hiển thị ở trang `Tin tức` của Mini App (`news.tsx`/`news-detail.tsx`):

1. Danh sách bài viết: lọc theo danh mục (`Thông báo`/`Hoạt động xã`/`Du lịch`/`Nông nghiệp`/`Chuyển đổi số`), tìm kiếm theo tiêu đề, phân trang, mặc định sắp theo ngày đăng mới nhất, bật/tắt hiển thị.
2. Form tạo mới/chỉnh sửa một bài viết:
   - Thông tin cơ bản: tiêu đề, danh mục, ngày đăng (hỗ trợ đặt ở tương lai để lên lịch), tác giả/đơn vị đăng, ảnh đại diện + alt text.
   - Mô tả ngắn (tóm tắt hiển thị ở danh sách).
   - Nội dung: nhiều đoạn văn, thêm/xóa/sắp xếp.
   - Từ khóa (tags): danh sách chuỗi ngắn, thêm/xóa.
   - Liên quan: danh sách chuỗi ngắn (nhãn hiển thị, hiện không phải link điều hướng thật — xem mục 4), thêm/xóa.
3. Xóa một bài viết (có xác nhận).

**Khác biệt quan trọng so với các màn hình danh sách khác đã dựng (Đền - Chùa - Miếu, Đặc sản, Di tích lịch sử, Nông nghiệp, OCOP, Làng nghề, Ẩm thực, Lễ hội, Tour trải nghiệm, Bản đồ)**: Tin tức là nội dung dạng **feed theo thời gian**, không phải danh sách tĩnh theo địa điểm/sản phẩm. Vì vậy:

- **Không có tính năng kéo thả sắp xếp thứ tự thủ công** (không có `sortOrder`/API reorder). Thứ tự hiển thị luôn theo `publishedAt` giảm dần — admin điều chỉnh thứ tự bằng cách sửa ngày đăng, không phải bằng cách sắp xếp danh sách.
- Field ngày đăng dùng **date/datetime picker**, không phải input text tự do như các trường "thời gian" ở các chức năng khác (`time`, `bestTime`, `workingTime`...).
- Cho phép đặt `publishedAt` ở tương lai để **lên lịch đăng bài** — cần hiển thị rõ trạng thái "Đã đăng" / "Lên lịch" / "Ẩn" trong danh sách admin (khác biệt với chỉ có `isActive` on/off ở các chức năng khác).

## 2. API sử dụng

Tích hợp API thật, không để mock data trong bản bàn giao:

- `GET /api/admin/news`: danh sách đầy đủ (kể cả ẩn và lên lịch tương lai), hỗ trợ phân trang, filter `category`, search theo tiêu đề.
- `GET /api/admin/news/:id`: chi tiết một bài kèm `version`.
- `POST /api/admin/news`: tạo bài mới.
- `PUT /api/admin/news/:id`: cập nhật một bài, gửi kèm `version`.
- `DELETE /api/admin/news/:id`: xóa một bài.
- `PATCH /api/admin/news/:id/status`: bật/tắt hiển thị.
- Media upload: dùng endpoint/component upload có sẵn của hệ thống.

Không có API reorder — thứ tự không phải là dữ liệu chỉnh sửa được, nó suy ra từ `publishedAt`.

Nếu backend dùng prefix hoặc response envelope khác thì adapter theo codebase, nhưng không tự ý thay đổi ý nghĩa contract. Khi backend trả `409 NEWS_ARTICLE_VERSION_CONFLICT`, phải giữ dữ liệu người dùng đang nhập, khóa thao tác lưu và hiển thị lựa chọn tải phiên bản mới; không âm thầm ghi đè.

Kiểu dữ liệu chính:

```ts
type NewsCategory =
  | "Thông báo"
  | "Hoạt động xã"
  | "Du lịch"
  | "Nông nghiệp"
  | "Chuyển đổi số";

type NewsAdminArticle = {
  id: string;
  version: number;
  title: string;
  category: NewsCategory;
  publishedAt: string; // ISO 8601 datetime
  author: string;
  summary: string;
  content: string[];
  tags: string[];
  relatedLinks: string[];
  mediaId?: string;
  imageUrl?: string;
  imageAlt: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string;
};
```

## 3. Route, menu và quyền

- Thêm route theo convention admin hiện tại, đề xuất `/admin/content/news` (danh sách) và `/admin/content/news/:id` (tạo/sửa, hoặc modal/drawer nếu convention dự án dùng inline form).
- Thêm menu `Nội dung → Tin tức` với icon có sẵn trong design system.
- Route phải có auth guard.
- Role có quyền xem chỉ được đọc; role có quyền sửa được tạo/sửa/xóa/bật-tắt hiển thị theo đúng quyền được cấp (không gộp chung một quyền nếu hệ thống phân quyền chi tiết hơn).
- Không chỉ ẩn nút ở UI; vẫn xử lý rõ response `401/403` từ API.

## 4. Bố cục màn hình

### Trang danh sách

- Header: tiêu đề `Quản lý Tin tức`, nút `Viết bài mới`.
- Thanh công cụ: filter theo `category` (`Tất cả`/`Thông báo`/`Hoạt động xã`/`Du lịch`/`Nông nghiệp`/`Chuyển đổi số`), ô tìm kiếm theo tiêu đề, tổng số kết quả.
- Bảng/danh sách card gồm: ảnh thumbnail, tiêu đề, danh mục, ngày đăng, tác giả, badge trạng thái (`Đã đăng`/`Lên lịch`/`Ẩn` — suy ra từ `isActive` kết hợp so sánh `publishedAt` với thời điểm hiện tại), thao tác `Sửa`/`Xóa`.
- Mặc định sắp theo `publishedAt` giảm dần; không có thao tác kéo thả sắp xếp.
- Phân trang theo convention danh sách admin hiện có (tin tức tích lũy liên tục, cần phân trang thay vì tải toàn bộ).
- Loading skeleton khi tải lần đầu, empty state khi chưa có bài nào hoặc không khớp filter/search, retry khi API lỗi.

### Form tạo mới/chỉnh sửa

Chia thành card/section rõ ràng:

1. **Thông tin cơ bản**
   - Input tiêu đề, select danh mục (`Thông báo`/`Hoạt động xã`/`Du lịch`/`Nông nghiệp`/`Chuyển đổi số`), **date/datetime picker** cho ngày đăng (cho phép chọn ngày tương lai để lên lịch, hiển thị cảnh báo/nhãn rõ ràng khi admin chọn ngày tương lai), input tác giả/đơn vị đăng.
   - Upload/đổi/xóa ảnh đại diện, có thumbnail, progress, trạng thái lỗi và nút thử lại.
   - Input alt text.
   - Textarea tóm tắt (summary) hiển thị ở danh sách.

2. **Nội dung**
   - Danh sách textarea đoạn văn; thêm, xóa, kéo thả/sắp xếp.
   - Không dùng rich-text editor nếu Mini App chỉ render plain text.

3. **Từ khóa (tags)**
   - Input dạng tag/chip: gõ và nhấn Enter để thêm, click x để xóa. Nếu dự án chưa có component tag input, dùng editable list đơn giản như các chức năng khác.

4. **Liên quan**
   - Editable list gồm các chuỗi ngắn; thao tác thêm/xóa. Ghi chú trong form (helper text) rằng đây là nhãn hiển thị tự do, không phải link — tránh admin nhầm tưởng đây là URL cần nhập đúng định dạng.

- Toggle `Hiển thị trên Mini App` (map với `isActive`) nằm ở vị trí dễ thấy trong form (ví dụ trong header của form).
- Nút `Lưu` (tạo mới hoặc cập nhật tùy ngữ cảnh) và `Hủy`. Disable nút đúng trạng thái loading/permission/dirty/validation; chống double submit.

## 5. Xem trước

- Nút `Xem trước` mở drawer/modal mô phỏng giao diện mobile của trang chi tiết (tương ứng `news-detail.tsx`), dùng dữ liệu form hiện tại (bao gồm ảnh mới vừa upload nếu có, lấy URL do media API trả về).
- Preview chỉ dành cho admin và không được làm nội dung public thay đổi cho tới khi bấm `Lưu`.

## 6. Validation và UX

Áp dụng cùng giới hạn với backend và hiển thị lỗi sát field:

- Required: tiêu đề, danh mục, ngày đăng, tác giả, ảnh đại diện, tóm tắt, ít nhất một đoạn nội dung.
- Giới hạn đề xuất: tiêu đề 200 ký tự, tác giả 150, tóm tắt 300, mỗi đoạn nội dung 5.000 ký tự, mỗi tag/liên quan 100 ký tự.
- Tối đa 30 đoạn nội dung, tối đa 15 tags, tối đa 15 mục liên quan.
- Trim dữ liệu trước khi gửi nhưng không làm mất xuống dòng hợp lệ trong textarea.
- Confirm trước khi xóa một bài hoặc rời trang khi có thay đổi chưa lưu.
- Toast thành công chỉ hiển thị sau khi API xác nhận; nếu lên lịch tương lai, toast nên nói rõ "Đã lên lịch đăng lúc [ngày giờ]" thay vì ngụ ý bài đã public ngay.
- Khi lưu lỗi, không reset form và không làm mất ảnh/nội dung đang nhập.
- Hiển thị lỗi mạng, `400/422`, `401/403`, `409` và `5xx` bằng thông báo tiếng Việt dễ hiểu.
- Không dùng `window.confirm` nếu dự án đã có modal xác nhận.

## 7. Responsive và accessibility

- Tối ưu desktop admin từ 1280px, vẫn thao tác được ở tablet 768px.
- Label liên kết đúng với input; thứ tự tab hợp lý; focus state rõ ràng.
- Tất cả button có type đúng; icon-only button có accessible name/tooltip.
- Ảnh có alt; lỗi form được liên kết bằng `aria-describedby` khi component hỗ trợ.
- Không chỉ dùng màu để biểu đạt trạng thái `Đã đăng`/`Lên lịch`/`Ẩn` — kèm text/badge rõ ràng.
- Date picker phải dùng được bằng bàn phím (nhập trực tiếp hoặc điều hướng bằng phím mũi tên trong lịch).

## 8. Quản lý state và tích hợp

- Dùng form/state solution có sẵn trong admin.
- Tách DTO mapping khỏi component trình bày; không rải logic response envelope khắp UI.
- Hủy request hoặc bỏ qua response cũ khi component unmount/chuyển route.
- Không gửi lại file binary trong `PUT /news/:id`; upload media trước và gửi `mediaId`.
- Sau lưu thành công, reset dirty state theo response mới và cập nhật `version`; refetch hoặc cập nhật danh sách để phản ánh đúng trạng thái server.
- Sau toggle hiển thị thành công, cập nhật UI theo response server thay vì chỉ optimistic update không đồng bộ lại.
- Gửi `publishedAt` lên API dưới dạng ISO 8601 datetime, không gửi chuỗi định dạng `dd/mm/yyyy`.

## 9. Test bắt buộc

Viết test theo stack hiện tại, tối thiểu:

- Render đúng danh sách từ `GET /api/admin/news`, filter theo danh mục và search hoạt động đúng, sắp đúng theo ngày đăng giảm dần.
- Tạo/sửa/xóa một bài tạo payload đúng (bao gồm `publishedAt` dạng ISO) và cập nhật lại danh sách.
- Thêm/xóa/sửa/reorder đoạn nội dung; thêm/xóa tags và mục liên quan.
- Đặt `publishedAt` ở tương lai hiển thị đúng badge "Lên lịch" trong danh sách admin.
- Upload ảnh thành công/thất bại và retry.
- Validation chặn lưu nhưng không làm mất dữ liệu đã nhập.
- Preview không gọi API public.
- Xóa có modal xác nhận và chống double click.
- `403` khóa đúng thao tác; `409` hiện conflict và không ghi đè form.
- Cảnh báo khi rời trang có unsaved changes.
- Bật/tắt hiển thị phản ánh đúng trạng thái ngay trong danh sách admin.

## 10. Tiêu chí nghiệm thu và bàn giao

- Admin viết/sửa/xóa/ẩn-hiện bài viết mà không cần sửa code Mini App.
- Bài lên lịch tương lai chỉ xuất hiện trên Mini App khi tới đúng thời điểm; admin thấy rõ trạng thái lên lịch trong danh sách quản trị.
- Ảnh được upload qua media service và hiển thị đúng trên môi trường deploy.
- Có xử lý quyền, validation, concurrent edit (`409`), loading/error/empty state và unsaved changes.
- Không còn mock data hoặc TODO cản trở luồng chính.
- Liệt kê file đã tạo/sửa; chạy lint, type-check, test và build, sau đó báo kết quả chính xác.
