# Prompt xây dựng BE service cho chức năng Tin tức

Bạn là Senior Backend Engineer. Hãy phân tích codebase backend hiện tại trước khi triển khai và xây dựng đầy đủ service/API cho chức năng **Tin tức** của LocalGo. Không tạo một kiến trúc hoặc chuẩn response mới nếu dự án đã có convention tương ứng; ưu tiên tái sử dụng authentication, authorization, ORM, migration, validation, upload media, logging, error handler và response envelope đang có. Nếu dự án đã xây dựng service tương tự cho **Giới thiệu** (`ABOUT-BE-SERVICE-PROMPT.md`), **Đền - Chùa - Miếu** (`TEMPLES-BE-SERVICE-PROMPT.md`), **Đặc sản** (`SPECIALTIES-BE-SERVICE-PROMPT.md`), **Di tích lịch sử** (`HISTORICAL-SITES-BE-SERVICE-PROMPT.md`), **Nông nghiệp** (`AGRICULTURE-BE-SERVICE-PROMPT.md`), **OCOP** (`OCOP-BE-SERVICE-PROMPT.md`), **Làng nghề** (`CRAFT-VILLAGES-BE-SERVICE-PROMPT.md`), **Ẩm thực** (`CUISINE-BE-SERVICE-PROMPT.md`), **Lễ hội** (`FESTIVALS-BE-SERVICE-PROMPT.md`), **Tour trải nghiệm** (`EXPERIENCE-TOURS-BE-SERVICE-PROMPT.md`) hoặc **Bản đồ** (`MAP-PLACES-BE-SERVICE-PROMPT.md`), hãy tái sử dụng đúng convention response/error/phân quyền/upload media/optimistic locking đã thống nhất ở đó.

## 1. Bối cảnh nghiệp vụ

Mini App LocalGo hiện có trang danh sách và trang chi tiết Tin tức nhưng dữ liệu đang hard-code ở frontend (`src/data/news.ts`). Giống các chức năng danh sách khác, trang này **đã có sẵn lớp service trung gian** (`src/services/news.ts` với `getNewsArticles(query)` và `getNewsArticleById(id)`, hiện chỉ đang lọc mảng local và trả `Promise`) — khi làm BE, chỉ cần giữ đúng chữ ký hai hàm này và đổi phần triển khai bên trong để gọi API thật, không cần sửa `news.tsx`/`news-detail.tsx`.

Mỗi bài viết gồm:

1. Danh mục: `Thông báo`, `Hoạt động xã`, `Du lịch`, `Nông nghiệp` hoặc `Chuyển đổi số`.
2. Thông tin cơ bản: tiêu đề, ngày đăng, tác giả/đơn vị đăng, ảnh đại diện.
3. Mô tả ngắn (tóm tắt hiển thị ở danh sách) và nội dung gồm nhiều đoạn văn.
4. Từ khóa (tags): danh sách chuỗi ngắn.
5. Liên quan: danh sách chuỗi — hiện tại chỉ là **nhãn hiển thị dạng text** (ví dụ "Giới thiệu", "Bản đồ"), không phải link điều hướng thật (xem `news-detail.tsx` — render bằng `<span>`, không có `onClick`/`navigate`). Giữ nguyên hành vi này trừ khi được yêu cầu tường minh nâng cấp thành deep-link.

Đây là một **danh sách nhiều bản ghi** (không phải trang đơn như Giới thiệu). Người dùng Mini App chỉ được đọc các bài đang **hiển thị (active)**; bài đang ẩn/nháp tuyệt đối không được lộ qua public API.

**Khác biệt quan trọng so với các chức năng danh sách trước đó (Đền - Chùa - Miếu, Đặc sản, ...v.v.)**: Tin tức là nội dung **theo dòng thời gian (feed)**, không phải danh sách địa điểm/sản phẩm tĩnh. Vì vậy:

- Thứ tự hiển thị mặc định trên public API là **`publishedAt` giảm dần (mới nhất trước)**, không phải `sortOrder` thủ công như các chức năng khác. Không cần API `reorder` hàng loạt.
- `publishedAt` trong dữ liệu mẫu hiện ở dạng chuỗi hiển thị `dd/mm/yyyy` (ví dụ `"09/07/2026"`) — đây là định dạng trình bày của frontend cũ, **không phải kiểu dữ liệu chuẩn**. Khi thiết kế DTO/DB, lưu `publishedAt` dưới dạng ISO 8601 datetime để sort/so sánh chính xác; nếu Mini App cần hiển thị `dd/mm/yyyy`, format ở tầng frontend, không lưu chuỗi định dạng sẵn ở DB.

## 2. Kết quả cần đạt

- Có public API để Mini App lấy danh sách bài viết (hỗ trợ lọc theo danh mục), sắp xếp theo `publishedAt` giảm dần, và chi tiết một bài theo `id`.
- Có admin API để xem danh sách đầy đủ (kể cả ẩn/lên lịch), tạo mới, cập nhật, xóa, ẩn/hiện bài viết.
- Quản lý ảnh đại diện bằng media service hiện có; không lưu base64 vào database.
- Có optimistic locking theo từng bài để tránh hai admin ghi đè lẫn nhau.
- Có migration, seed dữ liệu khởi tạo từ 5 bài hiện có trong `src/data/news.ts` (chuyển đổi đúng `publishedAt` từ `dd/mm/yyyy` sang ISO datetime), validation, phân quyền, test và tài liệu API.
- Cập nhật `src/services/news.ts` để gọi API thật thay vì lọc mảng local, giữ nguyên chữ ký `getNewsArticles(query)`/`getNewsArticleById(id)` để không phải sửa các trang đang dùng — hàm phía frontend chịu trách nhiệm format `publishedAt` sang `dd/mm/yyyy` khi trả về `NewsArticle` nếu type hiện tại yêu cầu string hiển thị sẵn.

## 3. Mô hình dữ liệu/DTO đề xuất

Có thể chuẩn hóa thành bảng quan hệ hoặc lưu `content`/`tags`/`relatedLinks` dạng JSON theo convention hiện tại của dự án, nhưng public DTO phải ổn định như sau:

```json
{
  "id": "ra-mat-mini-app-truong-mit",
  "title": "Ra mắt Mini App giới thiệu xã Truông Mít",
  "category": "Chuyển đổi số",
  "publishedAt": "2026-07-09T00:00:00.000Z",
  "author": "Ban biên tập xã Truông Mít",
  "summary": "Mini App hỗ trợ người dân và du khách tra cứu thông tin địa phương...",
  "content": [
    "Đoạn nội dung thứ nhất.",
    "Đoạn nội dung thứ hai."
  ],
  "tags": ["Mini App", "Chuyển đổi số", "Truông Mít"],
  "relatedLinks": ["Giới thiệu", "Bản đồ", "Tin tức"],
  "imageUrl": "https://cdn.example.com/news/ra-mat-mini-app-truong-mit.jpg",
  "imageAlt": "Ra mắt Mini App giới thiệu xã Truông Mít",
  "updatedAt": "2026-07-15T10:00:00.000Z"
}
```

Yêu cầu mô hình nội bộ:

- `category` là enum cố định `Thông báo | Hoạt động xã | Du lịch | Nông nghiệp | Chuyển đổi số`; lưu dưới dạng constrained value (enum/check constraint), không free text.
- `id`/slug phải duy nhất, dùng để tạo URL chi tiết (`/news/:id`); nếu cho phép đổi tiêu đề, `id`/slug vẫn giữ ổn định trừ khi có endpoint đổi slug tường minh.
- `publishedAt` là datetime chuẩn ISO 8601, dùng làm khóa sắp xếp chính của public API; không nhận chuỗi tự do.
- `tags` và `relatedLinks` là mảng chuỗi tự do đơn giản, không cần bản ghi con có ID riêng; `relatedLinks` hiện chỉ là nhãn hiển thị, không validate theo URL hay route thật.
- Có cờ hiển thị (`isActive`/`status`) theo convention dự án; public response chỉ trả bản ghi đang hiển thị **và** có `publishedAt` không ở tương lai (tránh lộ bài lên lịch trước giờ).
- Lưu `createdAt`, `updatedAt`, `createdBy`, `updatedBy` và một trường `version` (hoặc tương đương) để optimistic locking.
- Nếu dự án có soft delete/audit log thì áp dụng convention sẵn có thay vì xóa cứng.
- Không cần trường `sortOrder` cấp bản ghi cho chức năng này — thứ tự đến từ `publishedAt`, không phải sắp xếp thủ công.

## 4. API contract

Giữ prefix và response envelope theo dự án (đồng bộ với convention đã dùng ở các prompt trước nếu có). Nếu dự án chưa có convention, dùng các endpoint sau.

### Public

- `GET /api/v1/news`
  - Không yêu cầu đăng nhập.
  - Hỗ trợ query `category` (`Thông báo`/`Hoạt động xã`/`Du lịch`/`Nông nghiệp`/`Chuyển đổi số`) để lọc, mặc định trả tất cả danh mục.
  - Hỗ trợ phân trang (ví dụ `page`/`pageSize` hoặc cursor theo convention dự án) vì tin tức tích lũy theo thời gian, không giới hạn cố định như các danh sách địa điểm khác.
  - Chỉ trả bản ghi đang hiển thị và `publishedAt <= now`, sắp xếp theo `publishedAt` giảm dần.
- `GET /api/v1/news/:id`
  - Không yêu cầu đăng nhập.
  - Trả đầy đủ `content`, `tags` và `relatedLinks`.
  - Nếu bài không tồn tại, đang ẩn, hoặc `publishedAt` ở tương lai, trả `404 NEWS_ARTICLE_NOT_FOUND` theo error format chung (không tiết lộ bài đang ẩn/lên lịch tồn tại).
  - Hỗ trợ `ETag`/cache header phù hợp; cache phải được invalidate sau khi admin cập nhật.

### Admin

- `GET /api/admin/news`: danh sách đầy đủ (kể cả ẩn và lên lịch tương lai), hỗ trợ phân trang, lọc theo `category`, tìm kiếm theo tiêu đề, mặc định sắp theo `publishedAt` giảm dần.
- `GET /api/admin/news/:id`: chi tiết một bài kèm `version`.
- `POST /api/admin/news`: tạo bài mới, trả về bản ghi kèm `id`/slug và `version` khởi tạo.
- `PUT /api/admin/news/:id`: cập nhật toàn bộ một bài; nhận `version` để optimistic locking.
- `DELETE /api/admin/news/:id`: xóa (hoặc soft delete theo convention).
- `PATCH /api/admin/news/:id/status`: bật/tắt hiển thị (`isActive`).

Nếu dự án đã có media API thì tái sử dụng. Nếu chưa có, bổ sung endpoint upload theo convention hệ thống, tối thiểu hỗ trợ JPEG, PNG và WebP; kiểm tra MIME thực, kích thước file, quyền truy cập và trả về media ID cùng URL. Khi lưu nội dung nên tham chiếu media ID thay vì chỉ lưu URL tùy ý.

Ví dụ body của `PUT /api/admin/news/:id`:

```json
{
  "version": 2,
  "title": "Ra mắt Mini App giới thiệu xã Truông Mít",
  "category": "Chuyển đổi số",
  "publishedAt": "2026-07-09T00:00:00.000Z",
  "author": "Ban biên tập xã Truông Mít",
  "summary": "Mini App hỗ trợ người dân và du khách tra cứu thông tin địa phương...",
  "content": ["Đoạn 1", "Đoạn 2"],
  "tags": ["Mini App", "Chuyển đổi số"],
  "relatedLinks": ["Giới thiệu", "Bản đồ"],
  "mediaId": "uuid",
  "imageAlt": "Ra mắt Mini App giới thiệu xã Truông Mít"
}
```

Khi `version` cũ, trả HTTP `409` với code `NEWS_ARTICLE_VERSION_CONFLICT` và bản ghi mới nhất để giao diện cảnh báo người dùng tải lại, không âm thầm ghi đè.

## 5. Validation và bảo mật

- Chỉ role quản trị nội dung phù hợp (ví dụ `ADMIN`, `CONTENT_MANAGER`) được gọi admin API.
- Chuỗi phải trim; `title`, `author`, `summary` không được rỗng sau khi trim.
- Giới hạn đề xuất: `title` 200 ký tự, `author` 150, `summary` 300, mỗi đoạn `content` 5.000 ký tự, mỗi phần tử `tags`/`relatedLinks` 100 ký tự.
- Giới hạn số phần tử: tối đa 30 đoạn `content`, tối đa 15 `tags`, tối đa 15 `relatedLinks`.
- `category` phải thuộc enum `Thông báo | Hoạt động xã | Du lịch | Nông nghiệp | Chuyển đổi số`, từ chối giá trị khác với `400 VALIDATION_ERROR`.
- `publishedAt` phải là datetime hợp lệ; cho phép admin đặt ở tương lai để lên lịch đăng bài (scheduled publish), nhưng public API phải lọc đúng như mô tả ở mục 3.
- Slug/`id` khi tạo mới: sinh tự động từ `title` (không dấu, kebab-case) hoặc cho nhập tường minh, nhưng phải kiểm tra trùng và ký tự hợp lệ (`a-z0-9-`).
- Chống stored XSS: nếu chỉ hỗ trợ plain text thì lưu/trả plain text; nếu dự án dùng rich text, sanitize bằng allowlist ở server.
- Không tin URL/media ID do client gửi; xác minh media tồn tại và người dùng có quyền sử dụng.
- Không ghi token, nội dung file hoặc thông tin nhạy cảm vào log.
- Rate limit admin upload/public endpoint theo hạ tầng hiện có.

## 6. Migration và dữ liệu khởi tạo

Tạo migration đúng chuẩn dự án và một seed idempotent từ 5 bài hiện có trong `src/data/news.ts` để sau deploy trang không bị trống:

- Ra mắt Mini App giới thiệu xã Truông Mít, Thông báo lịch tiếp công dân trong tuần, Chuẩn bị tổ chức ngày hội nông sản địa phương, Gợi ý lịch trình cuối tuần tại Truông Mít, Ra quân vệ sinh môi trường các tuyến đường chính.
- Giữ nguyên `id`/slug hiện tại của từng bài (ví dụ `ra-mat-mini-app-truong-mit`) để không phá vỡ URL đang được liên kết trong app.
- Chuyển `publishedAt` từ chuỗi `dd/mm/yyyy` sang ISO 8601 datetime tương ứng (ví dụ `"09/07/2026"` → `2026-07-09T00:00:00.000Z`), giữ đúng thứ tự thời gian gốc của 5 bài (mới nhất là bài đầu tiên trong file).
- Giữ nguyên toàn bộ `content`, `tags` và `relatedLinks` hiện có của từng bài.

Không hard-code domain CDN hoặc đường dẫn máy local cho ảnh (hiện dùng chung một ảnh placeholder `icon-07.png` cho tất cả bài). Import ảnh qua media/storage convention của môi trường hoặc cung cấp script mapping asset rõ ràng; nếu ảnh gốc chưa có cho từng bài, seed vẫn phải chạy được với ảnh placeholder hợp lệ.

## 7. Test bắt buộc

Viết unit/integration test theo framework đang dùng, tối thiểu gồm:

- Public list API không trả bài ẩn, không trả bài có `publishedAt` ở tương lai, và sắp xếp đúng theo `publishedAt` giảm dần.
- Public list API lọc đúng theo `category`.
- Public detail API trả `404 NEWS_ARTICLE_NOT_FOUND` cho bài không tồn tại, đang ẩn, hoặc chưa tới giờ đăng.
- Người không có quyền bị `401/403` ở admin API.
- Admin list API vẫn thấy được bài ẩn và bài lên lịch tương lai.
- Tạo mới sinh `id`/slug hợp lệ và từ chối trùng slug.
- Hai admin cập nhật cùng `version` gây conflict `409` cho request đến sau.
- Bật/tắt hiển thị phản ánh đúng ngay trên public API.
- Xóa bài loại bỏ đúng dữ liệu liên quan theo convention (cascade hoặc soft delete).
- `publishedAt` không hợp lệ (chuỗi không parse được thành datetime) bị từ chối.
- Media không tồn tại/sai loại bị từ chối.

## 8. Tài liệu và bàn giao

- Cập nhật OpenAPI/Swagger với schema, ví dụ request/response và error code.
- Cập nhật `src/services/news.ts` để gọi API thật, giữ nguyên chữ ký hàm hiện có; format `publishedAt` sang hiển thị `dd/mm/yyyy` tại tầng service/frontend nếu type `NewsArticle` không đổi.
- Ghi rõ migration/seed command, biến môi trường media/storage và quyền cần gán.
- Liệt kê file đã tạo/sửa.
- Chạy lint, test và build; báo chính xác kết quả.
- Không chỉ viết pseudo-code hoặc mock endpoint: phải triển khai code chạy được trong backend hiện tại.

## 9. Tiêu chí nghiệm thu

- Sau khi seed, `GET /api/v1/news` và `GET /api/v1/news/:id` trả đúng dữ liệu tương đương `src/data/news.ts` hiện tại, đúng thứ tự thời gian.
- Admin tạo/sửa/xóa/ẩn-hiện bài viết mà không cần sửa code Mini App.
- Admin có thể lên lịch đăng bài trong tương lai; bài chỉ xuất hiện ở public API khi tới đúng thời điểm.
- Refresh/restart service không làm mất dữ liệu.
- Upload/thay ảnh hoạt động trên môi trường triển khai, không phụ thuộc file local.
- API có phân quyền, validation, optimistic locking và xử lý concurrent update rõ ràng.
- `src/pages/news.tsx` và `src/pages/news-detail.tsx` hoạt động đúng mà không cần sửa, chỉ nhờ `src/services/news.ts` đổi sang gọi API thật.
