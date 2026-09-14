# Prompt xây dựng giao diện Admin cho chức năng Giới thiệu

Bạn là Senior Frontend Engineer. Hãy phân tích codebase admin hiện tại trước khi triển khai và xây dựng màn hình quản trị nội dung **Giới thiệu** cho LocalGo. Phải tái sử dụng layout, router, auth guard, permission, design system, form library, API client, upload component, notification, modal xác nhận và coding convention hiện có; không tạo một bộ UI hoặc state-management song song nếu dự án đã có giải pháp tương ứng.

## 1. Mục tiêu

Tạo màn hình admin giúp biên tập viên quản lý toàn bộ dữ liệu hiển thị ở trang `Giới thiệu` của Mini App:

1. Hero: tiêu đề, ảnh nền, alt text.
2. Tổng quan: tiêu đề mục và danh sách đoạn văn.
3. Các chỉ số: giá trị, đơn vị, nhãn, trạng thái hiển thị và thứ tự.
4. Điểm nổi bật: ảnh/icon, alt text, tiêu đề, mô tả, trạng thái và thứ tự.
5. Dấu mốc phát triển: năm/thời điểm, tiêu đề tùy chọn, nội dung, trạng thái và thứ tự.

Màn hình phải hỗ trợ workflow **lưu nháp → xem trước → xuất bản**. Lưu nháp không được làm thay đổi nội dung đang hiển thị trên Mini App.

## 2. API sử dụng

Tích hợp API thật, không để mock data trong bản bàn giao:

- `GET /api/admin/about`: lấy draft, metadata bản published và `hasUnpublishedChanges`.
- `PUT /api/admin/about`: lưu toàn bộ draft, gửi kèm `version`.
- `GET /api/admin/about/preview`: lấy dữ liệu preview đã resolve media từ draft.
- `POST /api/admin/about/publish`: xuất bản draft.
- `POST /api/admin/about/discard-draft`: hủy thay đổi chưa xuất bản.
- Media upload: dùng endpoint/component upload có sẵn của hệ thống.

Nếu backend dùng prefix hoặc response envelope khác thì adapter theo codebase, nhưng không tự ý thay đổi ý nghĩa contract. Khi backend trả `409 ABOUT_VERSION_CONFLICT`, phải giữ dữ liệu người dùng đang nhập, khóa thao tác publish và hiển thị lựa chọn tải phiên bản mới; không âm thầm ghi đè.

Kiểu dữ liệu chính:

```ts
type AboutStatusItem = {
  id: string;
  sortOrder: number;
  isActive: boolean;
};

type AboutDraft = {
  id: "about";
  version: number;
  title: string;
  hero: {
    mediaId?: string;
    imageUrl?: string;
    imageAlt: string;
  };
  overview: {
    title: string;
    paragraphs: string[];
  };
  statistics: Array<
    AboutStatusItem & {
      value: string;
      unit: string;
      label: string;
    }
  >;
  highlightsSectionTitle: string;
  highlights: Array<
    AboutStatusItem & {
      title: string;
      description: string;
      mediaId?: string;
      imageUrl?: string;
      imageAlt: string;
    }
  >;
  milestonesSectionTitle: string;
  milestones: Array<
    AboutStatusItem & {
      year: string;
      title?: string;
      description: string;
    }
  >;
  hasUnpublishedChanges: boolean;
  publishedAt?: string;
  publishedBy?: string;
  updatedAt: string;
  updatedBy?: string;
};
```

## 3. Route, menu và quyền

- Thêm route theo convention admin hiện tại, đề xuất `/admin/content/about`.
- Thêm menu `Nội dung → Giới thiệu` với icon có sẵn trong design system.
- Route phải có auth guard.
- Role có quyền xem chỉ được đọc/preview; role có quyền sửa được lưu draft; chỉ role có quyền publish mới thấy hoặc dùng được nút Xuất bản.
- Không chỉ ẩn nút ở UI; vẫn xử lý rõ response `401/403` từ API.

## 4. Bố cục màn hình

### Header cố định hoặc sticky

- Tiêu đề `Quản lý nội dung Giới thiệu`.
- Badge trạng thái: `Đã xuất bản`, `Có thay đổi chưa xuất bản`, hoặc `Chưa xuất bản`.
- Hiển thị lần cập nhật gần nhất và người cập nhật nếu API có dữ liệu.
- Các nút: `Xem trước`, `Hủy thay đổi`, `Lưu nháp`, `Xuất bản`.
- Disable nút đúng trạng thái loading/permission/dirty/validation; chống double submit.

### Nội dung form

Chia thành card/accordion rõ ràng:

1. **Hero**
   - Input tiêu đề.
   - Upload/đổi/xóa ảnh, có thumbnail, progress, trạng thái lỗi và nút thử lại.
   - Input alt text.
   - Gợi ý tỉ lệ/kích thước ảnh phù hợp với hero mobile; không crop phá hủy file gốc nếu hệ thống chưa hỗ trợ.

2. **Tổng quan**
   - Input tiêu đề mục.
   - Danh sách textarea đoạn văn; thêm, xóa, kéo thả/sắp xếp.
   - Không dùng rich-text editor nếu Mini App chỉ render plain text.

3. **Chỉ số**
   - Editable list/table gồm `Giá trị`, `Đơn vị`, `Nhãn`, `Hiển thị`, thao tác sắp xếp/xóa.
   - Có nút `Thêm chỉ số`.

4. **Điểm nổi bật**
   - Mỗi item có thumbnail/upload ảnh, alt text, tiêu đề, mô tả, toggle hiển thị.
   - Có thêm, xóa, thu gọn/mở rộng và sắp xếp.

5. **Dấu mốc phát triển**
   - Mỗi item có `Năm/Thời điểm` dạng text, tiêu đề tùy chọn, mô tả và toggle hiển thị.
   - Có thêm, xóa và sắp xếp.

Ưu tiên drag-and-drop nếu dự án đã có thư viện. Luôn cung cấp nút `Lên/Xuống` làm phương án accessible và dùng được trên thiết bị không kéo thả tốt. Sau reorder phải chuẩn hóa `sortOrder` thành `0..n-1` trước khi gửi API.

## 5. Xem trước

- Nút `Xem trước` mở drawer/modal/tab riêng mô phỏng giao diện mobile của trang Giới thiệu.
- Preview phải dùng dữ liệu form hiện tại. Nếu có ảnh mới vừa upload thì dùng URL do media API trả về.
- Nếu backend yêu cầu lưu draft trước khi preview, khi người dùng đồng ý hãy lưu draft rồi gọi preview API; thông báo rõ hành động này.
- Trong preview, thể hiện đúng item đang active, thứ tự, hero, tổng quan, chỉ số, điểm nổi bật và timeline.
- Preview chỉ dành cho admin và không được làm nội dung public thay đổi.

## 6. Validation và UX

Áp dụng cùng giới hạn với backend và hiển thị lỗi sát field:

- Required: tiêu đề trang, ảnh hero, tiêu đề Tổng quan, ít nhất một đoạn Tổng quan, tiêu đề section và các field chính của item đang active.
- Giới hạn đề xuất: title 150 ký tự, label 120, value 50, unit 30, alt 255, paragraph/description 5.000 ký tự.
- Tối đa 20 statistics, 50 highlights, 100 milestones, 20 paragraphs.
- Trim dữ liệu trước khi gửi nhưng không làm mất xuống dòng hợp lệ trong textarea.
- Item inactive có thể được lưu thiếu một số nội dung để biên tập sau, nhưng phải hợp lệ đầy đủ trước khi bật active/publish.
- Confirm trước khi xóa item đã tồn tại, hủy draft hoặc rời trang khi có thay đổi chưa lưu.
- Có loading skeleton khi tải lần đầu, empty state phù hợp và retry khi API lỗi.
- Toast thành công chỉ hiển thị sau khi API xác nhận.
- Khi save/publish lỗi, không reset form và không làm mất ảnh/nội dung đang nhập.
- Hiển thị lỗi mạng, `400/422`, `401/403`, `409` và `5xx` bằng thông báo tiếng Việt dễ hiểu.
- Không dùng `window.confirm` nếu dự án đã có modal xác nhận.

## 7. Responsive và accessibility

- Tối ưu desktop admin từ 1280px, vẫn thao tác được ở tablet 768px.
- Label liên kết đúng với input; thứ tự tab hợp lý; focus state rõ ràng.
- Tất cả button có type đúng; icon-only button có accessible name/tooltip.
- Ảnh có alt; lỗi form được liên kết bằng `aria-describedby` khi component hỗ trợ.
- Không chỉ dùng màu để biểu đạt trạng thái.
- Drag handle dùng được bằng bàn phím hoặc có nút Lên/Xuống tương đương.

## 8. Quản lý state và tích hợp

- Dùng form/state solution có sẵn trong admin.
- Giữ ID của item đã có; item mới dùng temporary client ID an toàn rồi thay bằng ID backend trả về nếu contract yêu cầu.
- Tách DTO mapping khỏi component trình bày; không rải logic response envelope khắp UI.
- Hủy request hoặc bỏ qua response cũ khi component unmount/chuyển route.
- Không gửi lại file binary trong `PUT /about`; upload media trước và gửi `mediaId`.
- Sau save thành công, reset dirty state theo response mới và cập nhật `version`.
- Sau publish thành công, refetch dữ liệu/metadata để UI phản ánh đúng trạng thái server.

## 9. Test bắt buộc

Viết test theo stack hiện tại, tối thiểu:

- Render đúng dữ liệu từ `GET /api/admin/about`.
- Thêm/xóa/sửa/reorder từng nhóm và tạo payload đúng.
- Upload ảnh thành công/thất bại và retry.
- Validation chặn publish nhưng không làm mất dữ liệu.
- Lưu draft gọi đúng API và cập nhật version.
- Preview không gọi public publish API.
- Publish có modal xác nhận và chống double click.
- `403` khóa đúng thao tác; `409` hiện conflict và không ghi đè form.
- Cảnh báo khi rời trang có unsaved changes.
- Item inactive không xuất hiện trong preview public-like.

## 10. Tiêu chí nghiệm thu và bàn giao

- Admin sửa đầy đủ tất cả section hiện có của trang Giới thiệu mà không cần sửa code Mini App.
- Lưu nháp, refresh trang và tiếp tục chỉnh sửa được.
- Lưu nháp không ảnh hưởng bản public; chỉ Publish mới làm thay đổi nội dung người dùng thấy.
- Thứ tự và trạng thái ẩn/hiện được giữ đúng sau reload.
- Ảnh được upload qua media service và hiển thị đúng trên môi trường deploy.
- Có xử lý quyền, validation, concurrent edit, loading/error/empty state và unsaved changes.
- Không còn mock data hoặc TODO cản trở luồng chính.
- Liệt kê file đã tạo/sửa; chạy lint, type-check, test và build, sau đó báo kết quả chính xác.
