# Prompt BE: phân giải link Google Maps để ghim địa điểm trên bản đồ

Bạn là Backend Engineer của LocalGo-BE. Hãy triển khai việc phân giải các link Google Maps đã được Admin khai báo thành tọa độ đích thật để Mini App đặt ghim. Đọc AGENTS.md, schema, module, DTO, public/admin API, queue và convention hiện có trước khi sửa. Triển khai trong repo BE thực tế, không chỉ mô tả giải pháp.

## 1. Bối cảnh và phạm vi

Mini App hiện tổng hợp địa điểm từ:

- `GET /api/v1/map-places`.
- `GET /api/v1/cuisine`: link cấp món và từng `suggestedPlaceDetails[]`.
- `GET /api/v1/temples`.
- `GET /api/v1/historical-sites`.
- Điểm du lịch trong `src/data/attractions.ts` của FE hiện là dữ liệu nội bộ, chưa có service API. Kiểm tra BE có module tương ứng hay chưa, báo rõ nếu chưa có; không khẳng định BE đã bao phủ dữ liệu chỉ nằm ở FE.

FE hiện chỉ đọc được tọa độ đích có trong một số URL dài. Link `maps.app.goo.gl`, `goo.gl/maps`, link chỉ có Place ID hoặc tên địa điểm vẫn có trong danh sách nhưng chưa có ghim. Không dùng vị trí camera `@lat,lng` làm vị trí địa điểm.

Đầu vào nghiệp vụ tiếp tục là `googleMapsUrl`. Admin không cần nhập tọa độ. Mỗi quán trong một món ăn có link và kết quả định vị độc lập; không dùng link/tọa độ cấp món để bù vào quán thiếu link.

Prompt này thay thế riêng các yêu cầu cũ “không resolve link, không phân tích tọa độ, không thêm dữ liệu tọa độ” trong phạm vi định vị bản đồ. Vẫn giữ nguyên link người dùng nhập và tương thích các payload hiện tại.

## 2. Contract trả về cho FE

Bổ sung field **read-only** `mapLocation` vào list/detail DTO của các nguồn nêu trên và vào từng object `suggestedPlaceDetails[]`. Giữ response envelope, routes, pagination và các field cũ. Các response admin cũng trả field này để kiểm tra trạng thái nếu đã có DTO dùng chung.

```ts
type MapLocation = {
  status: 'pending' | 'resolved' | 'unresolved' | 'failed';
  coordinates: { lat: number; lng: number } | null;
  resolvedAt: string | null; // ISO 8601
};

// Không có link hợp lệ => mapLocation: null.
// Có link, đang chờ xử lý => pending, coordinates: null.
// Xác định được đích chắc chắn => resolved, coordinates hợp lệ.
// Link hợp lệ nhưng chưa xác định được đích => unresolved, coordinates: null.
// Lỗi kết nối/provider sau retry => failed, coordinates: null.
```

Ví dụ một quán ăn trong response `/cuisine`:

```json
{
  "id": "quan-a",
  "name": "Quán A",
  "address": "Địa chỉ đã khai báo",
  "googleMapsUrl": "https://maps.app.goo.gl/example",
  "mapLocation": {
    "status": "resolved",
    "coordinates": { "lat": 11.2418, "lng": 106.2024 },
    "resolvedAt": "2026-10-20T08:00:00.000Z"
  }
}
```

Tọa độ trên chỉ là ví dụ định dạng, không dùng làm seed hoặc fallback. `resolvedAt` chỉ được đặt khi đã xác định thành công tọa độ cho đúng link hiện tại.

`coordinates` cũ của `/map-places` có thể chứa dữ liệu mẫu. Giữ field đó để tương thích, không tự đánh dấu `mapLocation.resolved` từ field cũ khi chưa xác minh được nguồn gốc. FE dùng `mapLocation.coordinates` cho ghim mới.

Không nhận `mapLocation`/trạng thái resolver từ payload Admin như dữ liệu đáng tin cậy. Không làm hỏng optimistic locking hoặc bắt Admin gửi field read-only.

## 3. Cách phân giải

1. Validate và trim link bằng URL parser và allowlist thống nhất với hệ thống hiện có.
2. Nếu URL có tọa độ đích rõ ràng, lấy đúng cặp `lat/lng`; ví dụ `!3d…!4d…`, hoặc `destination`/`query`/`q` chứa đúng một cặp số. Với link chỉ đường, chỉ lấy đích cuối cùng xác định rõ, không lấy điểm xuất phát/điểm trung gian.
3. Với link rút gọn, phân giải redirect tại server theo quy tắc an toàn ở mục 5, sau đó phân tích URL đích. Không trả về trang đăng nhập/consent như một địa điểm hợp lệ.
4. Nếu chỉ có Place ID, dùng API chính thức của provider nếu hệ thống đã có cấu hình phù hợp. Kiểm tra tài liệu và điều kiện dùng hiện hành trước khi tích hợp. Giữ secret/API key hoàn toàn ở BE.
5. Link chỉ chứa tên hoặc kết quả tìm kiếm có thể mơ hồ: không chọn kết quả đầu tiên theo phỏng đoán. Chỉ nhận khi định danh được một địa điểm cụ thể; nếu không, đánh dấu `unresolved`.
6. Không phụ thuộc việc scrape HTML Google Maps hoặc regex trên trang HTML làm cơ chế chính. Không hứa phân giải được mọi link nếu thiếu provider cần thiết; trả trạng thái rõ ràng và báo cấu hình còn thiếu.

Validate tọa độ: số thực hữu hạn, lat trong [-90, 90], lng trong [-180, 180]. Không đảo lat/lng; không coi số 0 là thiếu dữ liệu. Không dùng tọa độ trung tâm xã, tọa độ mẫu hoặc vị trí camera để tạo ghim thay thế.

## 4. Lưu trữ và vòng đời

- Tái sử dụng hạ tầng cache/queue/job sẵn có. Lưu kết quả bền vững để GET không cần gọi Google/provider trực tiếp.
- Giữ association theo module + record ID; quán ăn con thêm suggested-place ID. Không dùng tên quán hoặc chỉ ID cấp món làm khóa.
- Khi tạo/sửa link hợp lệ, lưu link trước, đánh dấu pending và enqueue sau commit bằng cơ chế tin cậy hiện có. Không chặn lưu nội dung vì provider chậm/lỗi.
- Nếu link không đổi, tái sử dụng kết quả đã có. Chuẩn hóa cache key thận trọng: không bỏ query/path có thể quyết định đích đến.
- Khi link thay đổi hoặc xóa, vô hiệu tọa độ cũ ngay. Kết quả job cũ chỉ được ghi khi URL/hash hoặc revision vẫn khớp; tránh ghi tọa độ của link trước vào link mới.
- Với `suggestedPlaceDetails` lưu JSON: merge kết quả theo ID + link/revision hiện tại, không ghi đè toàn bộ mảng cũ làm mất chỉnh sửa hoặc reorder của Admin. Có thể dùng bảng resolver riêng nếu phù hợp schema để tránh sửa JSON từ worker.
- Quán bị xóa hoặc record bị xóa/ẩn không được xuất hiện thành ghim công khai. Giữ đúng điều kiện publish/isActive của từng module.
- Retry hữu hạn với backoff cho lỗi mạng/429/5xx; phân biệt lỗi tạm thời và `unresolved`. Một link lỗi không chặn các link khác.
- Cache chung theo link được phép nhưng chỉ gắn kết quả với đúng nội dung hiện hành. Không gộp hai địa điểm chỉ vì tên hoặc tọa độ gần nhau.

## 5. An toàn khi server mở link

- Chỉ HTTPS, hostname chính xác: `google.com`, `www.google.com`, `maps.google.com`, `maps.app.goo.gl`, `goo.gl`. Với google.com/www.google.com/goo.gl, yêu cầu path `/maps` hoặc `/maps/...` như validator hiện tại. Nếu cần hostname Google khác cho redirect thật, liệt kê rõ và giới hạn path; không dùng wildcard rộng.
- Từ chối credentials, port ngoài 443, ký tự điều khiển, backslash, URL hỏng hoặc dài hơn 2.048 ký tự.
- Không tự follow redirect không kiểm soát. Kiểm tra lại protocol/host/path và DNS cho **từng hop**, tối đa 5 hop; relative Location phải resolve rồi validate lại.
- Chặn localhost, loopback, mạng private, link-local, metadata service và IP đặc biệt cho cả IPv4/IPv6; tránh DNS rebinding bằng cách kiểm tra và kết nối đúng IP đã kiểm tra, hoặc dùng cơ chế outbound an toàn hiện có.
- Timeout tối đa 5 giây mỗi request và 10 giây cho toàn lần phân giải, giới hạn response body 256 KB; hủy request khi vượt giới hạn. Không tải body bản đồ không cần thiết; không gửi cookie/Authorization nội bộ đến Google.
- Không cung cấp endpoint public nhận URL tùy ý để fetch hộ. Job backfill/admin re-resolve nếu cần phải theo permission và convention hiện có.
- Log lỗi có mã và source ID, không lộ API key/cookie hoặc toàn bộ URL có dữ liệu nhạy cảm.

## 6. Dữ liệu đã khai báo

Tạo command/job backfill có thể chạy lại an toàn, chia batch và giới hạn concurrency để phân giải tất cả link hợp lệ hiện có, gồm từng quán ăn con. Không cần Admin nhập lại link.

Có chế độ dry-run hoặc báo số bản ghi sẽ xử lý nếu hạ tầng đã hỗ trợ. Báo số pending/resolved/unresolved/failed, hỗ trợ chạy lại bản ghi failed/unresolved có kiểm soát. Không overwrite link gốc, dữ liệu nội dung, ID, thứ tự hoặc timestamp/version nghiệp vụ vì chỉ cập nhật cache định vị.

GET list/detail luôn đọc kết quả đã lưu, không phát sinh hàng loạt request phân giải. Giữ pagination hiện có và nêu rõ cách FE lấy đủ các trang khi tích hợp.

## 7. Bàn giao

Không tạo hoặc chạy test tự động trong đợt này; người dùng sẽ tự test. Không tự deploy, gọi provider tính phí hoặc chạy backfill production.

Sau khi sửa code, bàn giao:

- Danh sách file/schema/migration thay đổi, endpoint và ví dụ response thực tế.
- Biến môi trường mới nếu thực sự cần, cách chạy worker và lệnh backfill/retry theo framework thực tế.
- Cách rollback an toàn; các link chưa phân giải được và lý do.
- Checklist kiểm tra thủ công: link dài, link rút gọn, link mơ hồ, lỗi mạng, cập nhật link khi job đang chạy, xóa link/quán, các quán độc lập và dữ liệu cũ được backfill.
- Nêu rõ phần FE cần nối tiếp: thêm `mapLocation` vào types/mappers của từng nguồn; ưu tiên `status === 'resolved'` và chuyển `{lat,lng}` thành `[lat,lng]` cho Leaflet; khi chưa có tọa độ vẫn giữ địa điểm trong danh sách và mở link gốc bằng icon chỉ đường. FE hiện **chưa đọc** field mới này, nên chỉ hoàn thành BE chưa làm toàn bộ ghim tự xuất hiện trong phiên bản FE hiện tại.
