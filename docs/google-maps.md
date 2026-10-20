# Google Maps trong Mini App

Cả 12 phân hệ dùng `googleMapsUrl?: string | null` từ public API và
`DirectionsButton` trên màn hình chi tiết. `null` được giữ để tương thích dữ liệu
API hiện hữu. Không tự tạo URL từ tên, địa chỉ hoặc tọa độ khi thiếu link.

`isValidGoogleMapsUrl` chỉ chấp nhận HTTPS, hostname chính xác trong allowlist,
và `/maps` hoặc `/maps/…` đối với `google.com`, `www.google.com`, `goo.gl`.
Hai hostname `maps.google.com`, `maps.app.goo.gl` không cần tiền tố đường dẫn.
URL có credentials, port khác mặc định, control characters, dấu backslash hoặc
dài quá 2.048 ký tự bị từ chối. Link được trim trước khi mở.

CTA dùng `openOutApp` trong Zalo mobile. Trên trình duyệt/simulator, mở
`window.open` với `noopener,noreferrer` ngay trong sự kiện click; không gọi SDK
vì SDK có thể resolve mà không mở gì trên localhost. Nếu mở ngoài lỗi hoặc
không phản hồi sau 5 giây, gọi `openWebview` toàn màn hình bằng cùng URL HTTPS.
Đây là fallback khi mở ngoài không khả dụng, không phải phương thức mặc định.
Nếu cả hai API đều lỗi, hiển thị mã hỗ trợ `externalCode/webviewCode` và link
HTTPS để người dùng bấm mở lại bằng một thao tác mới, tránh popup bị chặn sau
khi chờ Promise. Mỗi API có timeout 5 giây. Sau callback thành công,
vẫn có link mở trực tiếp nếu Android không chuyển ứng dụng; callback native
không xác nhận Google Maps thực sự đã hiển thị. Không dùng router để điều
hướng sang Google Maps. Cần kiểm tra thực tế trên Zalo Android/iOS
trước khi phát hành; unit test mock SDK và không xác minh đích cuối của link rút gọn.

## Ẩm thực

- `googleMapsUrl`: link chính của món.
- `suggestedPlaceDetails`: các object `{ id, name, address, googleMapsUrl? }`.
- `suggestedPlaces: string[]`: fallback tên địa điểm từ API cũ.

Ưu tiên `suggestedPlaceDetails` khi có, kể cả mảng rỗng. Mỗi địa điểm dùng URL
của chính nó; không lấy URL cấp món để bù vào địa điểm thiếu link.

## Tạo/cập nhật nội dung

Repo này chỉ có GET cho 12 phân hệ nội dung, không chứa form tạo/cập nhật,
admin preview hoặc API mutation của chúng. Theo tài liệu trong `docs/prompts`,
phần quản trị nằm ở LocalGo-Admin và backend nằm ở LocalGo-BE.
Các dự án đó cần giữ `googleMapsUrl` trong DTO, form mapper và payload POST/PUT,
đồng thời giữ `suggestedPlaceDetails[].googleMapsUrl` độc lập ở Ẩm thực.
Thay đổi Mini App không triển khai hoặc xác minh luồng ghi của hai repo riêng này.

## Kiểm thử

Trang `/map` tổng hợp các link hợp lệ từ `/map-places`, `/cuisine` (cả link
của món và từng `suggestedPlaceDetails`), `/temples`, `/historical-sites`,
và danh sách điểm du lịch nội bộ nếu được khai báo `googleMapsUrl`.
Link trùng chính xác sau khi trim được gộp, giữ các nhóm tương ứng.
Tìm kiếm không dấu và lọc nhóm thực hiện trên toàn bộ dữ liệu đã tải.
Mỗi nguồn có thời gian chờ tối đa 15 giây; lỗi một nguồn không làm mất
dữ liệu các nguồn khác, giao diện có thông báo và nút thử lại.

Bản đồ tương tác dùng Leaflet và nền OpenStreetMap, có attribution.
Cả bốn nguồn và từng `suggestedPlaceDetails[]` đọc `mapLocation` từ BE.
Chỉ tạo ghim khi `status === "resolved"` và tọa độ là số hữu hạn trong khoảng
hợp lệ; chuyển `{ lat, lng }` thành `[lat, lng]` cho Leaflet, chấp nhận cả số 0.
Không dùng tọa độ legacy của `/map-places` hoặc tự phân tích link để bỏ qua
trạng thái từ BE. Link rút gọn được đặt ghim khi BE trả kết quả resolved.
Trạng thái pending/unresolved/failed/null vẫn giữ địa điểm trong danh sách
và dùng link gốc cho icon chỉ đường; không lấy tọa độ cấp món bù vào từng quán.
Mỗi thẻ hiện trạng thái vị trí. Nút `Cập nhật vị trí` tải lại dữ liệu mà không
ẩn danh sách hiện tại; khi còn pending, trang tự tải lại sau 15 giây.
Nếu tất cả kết quả là failed/unresolved/null thì không có ghim để vẽ. Xem
`docs/prompts/MAP-PINS-RESOLVER-FIX-BE-PROMPT.md` để xử lý resolver BE và dạng
redirect `/maps/search/<lat>,<lng>` đã quan sát từ các link hiện tại.
Nguồn attractions nội bộ chưa có contract BE nên chỉ hiện danh sách khi có link.
Public API hiện dùng danh sách mảng; phân trang admin không áp dụng tại Mini App.
Nền bản đồ dùng `https://tile.openstreetmap.org`, tự chuyển sang ảnh vệ tinh
Esri tại `https://services.arcgisonline.com` nếu nguồn chính không tải được.
Cần cho phép truy cập cả hai hostname khi phát hành. Mỗi nguồn có thời gian
chờ 8 giây khi không nhận được ô ảnh nào; lỗi cả hai nguồn sẽ hiện nút tải lại.
Thông báo lỗi được xóa khi ô ảnh tải thành công, không giữ lỗi từ một ô ảnh cũ.

Chạy `npm test`, `npm run typecheck`, `npm run build`.
`src/pages/content-directions.test.tsx` kiểm tra từ response API giả lập qua
mapper thật đến UI của cả 12 trang và thao tác mở SDK, gồm các trạng thái thiếu,
rỗng, HTTP, sai domain và nhiều link độc lập của món/địa điểm.
