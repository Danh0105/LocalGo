# Prompt xây dựng BE service cho chức năng Giới thiệu

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Giới thiệu** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang `Giới thiệu` nhưng dữ liệu đang hard-code ở frontend. Trang gồm:

1. Hero: tiêu đề và ảnh nền.
2. Tổng quan: tiêu đề mục và nhiều đoạn văn.
3. Chỉ số địa phương: danh sách các thẻ gồm giá trị, đơn vị và nhãn (ví dụ diện tích, dân số, số ấp, năm thành lập).
4. Điểm nổi bật: danh sách gồm ảnh/icon, tiêu đề và mô tả.
5. Dấu mốc phát triển: danh sách gồm năm/thời điểm và nội dung.

Nội dung phải được quản trị từ trang admin. Người dùng Mini App chỉ được đọc **phiên bản đã xuất bản**; nội dung đang chỉnh sửa hoặc bản nháp tuyệt đối không được lộ qua public API.

## 2. Kết quả cần đạt

- Có public API để Mini App lấy toàn bộ nội dung Giới thiệu trong một request.
- Có admin API để xem bản đang chỉnh sửa, lưu nháp, xem trước, xuất bản và hủy thay đổi nháp.
- Hỗ trợ thêm/xóa/sửa/ẩn/hiện và thay đổi thứ tự các chỉ số, điểm nổi bật, dấu mốc.
- Quản lý ảnh hero và ảnh của điểm nổi bật bằng media service hiện có; không lưu base64 vào database.
- Có lịch sử phiên bản hoặc cơ chế snapshot bảo đảm sửa bản nháp không làm thay đổi bản public cho tới khi bấm Xuất bản.
- Có migration, seed dữ liệu khởi tạo, validation, phân quyền, test và tài liệu API.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành các bảng quan hệ hoặc lưu snapshot JSON theo convention hiện tại, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "about",
  "title": "Giới thiệu",
  "hero": {
    "imageUrl": "https://cdn.example.com/about/hero.jpg",
    "imageAlt": "Toàn cảnh địa phương"
  },
  "overview": {
    "title": "Tổng quan",
    "paragraphs": [
      "Đoạn giới thiệu thứ nhất.",
      "Đoạn giới thiệu thứ hai."
    ]
  },
  "statistics": [
    {
      "id": "uuid",
      "value": "4.870",
      "unit": "ha",
      "label": "Diện tích tự nhiên",
      "sortOrder": 0,
      "isActive": true
    }
  ],
  "highlightsSectionTitle": "Điểm nổi bật",
  "highlights": [
    {
      "id": "uuid",
      "title": "Văn hóa - Tín ngưỡng",
      "description": "Nội dung mô tả",
      "imageUrl": "https://cdn.example.com/about/highlight.jpg",
      "imageAlt": "Văn hóa địa phương",
      "sortOrder": 0,
      "isActive": true
    }
  ],
  "milestonesSectionTitle": "Dấu mốc phát triển",
  "milestones": [
    {
      "id": "uuid",
      "year": "1979",
      "title": "",
      "description": "Nội dung dấu mốc",
      "sortOrder": 0,
      "isActive": true
    }
  ],
  "publishedAt": "2026-07-15T10:00:00.000Z",
  "updatedAt": "2026-07-15T10:00:00.000Z",
  "version": 3
}
```

Yêu cầu mô hình nội bộ:

- Đây là nội dung singleton, sử dụng khóa ổn định `about`; không tạo nhiều trang Giới thiệu độc lập.
- Mỗi bản ghi con có ID bền vững để admin cập nhật/reorder chính xác.
- `sortOrder` là số nguyên không âm; khi trả dữ liệu phải sắp xếp tăng dần và có tie-breaker ổn định.
- Public response chỉ trả phần tử `isActive = true`.
- Lưu được `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `publishedAt`, `publishedBy` và `version` hoặc metadata tương đương.
- Dùng revision/snapshot (draft và published tách biệt). Thao tác publish phải atomic trong transaction.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có.

## 4. API contract

Giữ prefix và response envelope theo dự án. Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/about`
  - Không yêu cầu đăng nhập.
  - Chỉ trả snapshot đã xuất bản.
  - Chỉ trả item đang active và đã được sort.
  - Nếu chưa từng xuất bản, trả `404 ABOUT_NOT_PUBLISHED` theo error format chung.
  - Hỗ trợ `ETag` hoặc cache header phù hợp; cache phải được invalidated sau publish.

### Admin

- `GET /api/admin/about`: trả draft hiện tại, metadata bản published gần nhất và cờ `hasUnpublishedChanges`.
- `PUT /api/admin/about`: tạo/cập nhật toàn bộ draft theo transaction; nhận `version` để optimistic locking.
- `POST /api/admin/about/publish`: validate lại draft rồi tạo snapshot published mới trong transaction.
- `POST /api/admin/about/discard-draft`: đưa draft về đúng snapshot published gần nhất.
- `GET /api/admin/about/preview`: trả DTO đã resolve media giống public response nhưng lấy từ draft; endpoint này vẫn bắt buộc quyền admin.

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention của hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/about`:

```json
{
  "version": 3,
  "title": "Giới thiệu",
  "hero": {
    "mediaId": "uuid",
    "imageAlt": "Toàn cảnh địa phương"
  },
  "overview": {
    "title": "Tổng quan",
    "paragraphs": ["Đoạn 1", "Đoạn 2"]
  },
  "statistics": [],
  "highlightsSectionTitle": "Điểm nổi bật",
  "highlights": [],
  "milestonesSectionTitle": "Dấu mốc phát triển",
  "milestones": []
}
```

Khi `version` cũ, trả HTTP `409` với code `ABOUT_VERSION_CONFLICT` và metadata phiên bản mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; không nhận title/label rỗng sau khi trim.
- Giới hạn đề xuất: title 150 ký tự, label 120, value 50, unit 30, alt 255, paragraph/description 5.000 ký tự; tổng payload tối đa theo chuẩn dự án.
- `year` là chuỗi tối đa 30 ký tự để hỗ trợ `1979`, `2025`, `Tháng 7/2026`; không ép kiểu number.
- Giới hạn số phần tử hợp lý, ví dụ tối đa 20 statistics, 50 highlights, 100 milestones và 20 overview paragraphs.
- Chống stored XSS. Nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ nội dung Giới thiệu hiện tại của LocalGo để sau deploy trang không bị trống. Seed cần có:

- Tiêu đề `Giới thiệu`.
- Mục `Tổng quan` với các đoạn văn hiện tại.
- Bốn chỉ số hiện tại.
- Các điểm nổi bật: Văn hóa - Tín ngưỡng, Nông nghiệp, Làng nghề truyền thống, Lễ hội.
- Các mốc 1979, 2015, 2021, 2025.

Không hard-code domain CDN hoặc đường dẫn máy local. Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public API không trả draft và không trả item inactive.
- Public API trả đúng thứ tự.
- Người không có quyền bị `401/403` ở admin API.
- Lưu draft thành công không làm đổi public response.
- Publish thành công làm public response đổi đúng một lần và lưu audit metadata.
- Publish lỗi validation không thay đổi snapshot cũ.
- Hai admin cập nhật cùng version gây conflict `409` cho request đến sau.
- Discard draft khôi phục đúng bản published.
- Media không tồn tại/sai loại bị từ chối.
- Transaction rollback hoàn toàn khi một bước publish lỗi.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Admin lưu nháp nhiều lần mà người dùng vẫn thấy bản published cũ.
- Sau khi publish, `GET /api/v1/about` trả đúng nội dung mới, đúng thứ tự và không chứa item ẩn.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation, audit và xử lý concurrent update rõ ràng.
- Contract đủ để frontend Mini App thay dữ liệu hard-code trong `src/pages/about.tsx` bằng một lần gọi API.
