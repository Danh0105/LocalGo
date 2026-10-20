# Sửa BE: link Google Maps chưa phân giải được nên FE không có ghim

Bạn đang làm trong repo LocalGo-BE. Đọc AGENTS.md và implementation resolver/worker hiện tại rồi sửa nguyên nhân thực tế. Không tạo worker hay contract mới. Giữ `mapLocation` đã bàn giao và các biện pháp chống SSRF, chống ghi kết quả job cũ.

## Dữ liệu quan sát từ public API đang dùng bởi Mini App

Ở thời điểm kiểm tra:

- `/api/v1/map-places`: UBND xã Truông Mít có `mapLocation.status = failed`, tọa độ null; chợ chưa có link.
- `/api/v1/cuisine`: quán Gà Đồng và Tám Hoà Farm có suggested place ở trạng thái `failed`; quán 2 Hằng có suggested place `unresolved`. Link cấp món đều rỗng.
- `/api/v1/temples`: các link đều rỗng, `mapLocation = null`.
- `/api/v1/historical-sites`: mảng rỗng.

Hiện không có bản ghi `resolved`, nên sửa giao diện không thể tự tạo ghim thật. FE đã đọc `mapLocation` độc lập của từng quán, chỉ tạo ghim từ kết quả resolved hợp lệ. Không trả tọa độ mẫu hoặc đổi failed thành resolved để che lỗi.

## Redirect thực tế đã đọc được

GET với redirect thủ công, chỉ đọc HTTP header:

1. `https://maps.app.goo.gl/6Zd7k6zJku9ht6jK6`
   - HTTP 302.
   - Location bắt đầu bằng `https://www.google.com/maps/place/231%2F1+Nguy...`.
   - Có tọa độ đích `!3d10.8251303!4d106.6390232` trong pathname, ngoài tọa độ camera `@...`.
2. `https://maps.app.goo.gl/17MQvAuLt1pAwyxM6`
   - HTTP 302.
   - Location bắt đầu bằng `https://www.google.com/maps/search/11.173045,+106.313223?entry=tts...`.
3. `https://maps.app.goo.gl/YD8mjMbzdvCLkSov6`
   - HTTP 302.
   - Location bắt đầu bằng `https://www.google.com/maps/search/11.205226,+106.321081?entry=tts...`.

Đây là quan sát từ môi trường FE, không chứng minh môi trường BE có cùng kết nối. Không khẳng định cả ba failed có cùng nguyên nhân nếu chưa xem error code/log của worker.

## Việc cần sửa

1. Tra `MapLocationResolution` theo đúng source/sourceId/subId. Xem mã lỗi, attempts, thời điểm claim/hoàn tất và điều kiện retry. Kiểm tra worker đang bật, DNS/outbound/TLS/timeout của môi trường deploy và cách HTTP client thực hiện redirect thủ công. Không log secret hoặc full URL tùy tiện.
2. Khi đã nhận Location hợp lệ có tọa độ đích, validate URL rồi phân tích ngay. Không bắt buộc GET trang Google Maps cuối cùng mới công nhận tọa độ đã nằm trong URL; việc GET thêm có thể gặp consent/rate limit hoặc lỗi mạng không cần thiết.
3. Bổ sung parser dạng **`/maps/search/<lat>,<lng>`** nếu còn thiếu. Decode pathname an toàn, xử lý dấu `+` làm khoảng trắng trong link thực tế trên; chỉ chấp nhận segment là đúng cặp tọa độ số, có thể có khoảng trắng/dấu âm. Không suy tọa độ từ tên địa điểm, kết quả tìm kiếm tự do hoặc `@camera`.
4. Giữ parser tọa độ đích `!3d…!4d…` và destination/query/q đúng cặp số. Validate hữu hạn, lat [-90,90], lng [-180,180]. Không đảo trục.
5. Mỗi redirect nếu cần request tiếp vẫn phải qua giới hạn hop, hostname/path/protocol và kiểm tra DNS/IP chống SSRF hiện có. Không mở rộng allowlist bừa để hết lỗi.
6. Kết quả worker phải gắn đúng URL hash/revision hiện tại, đặc biệt suggested place con của cuisine. Không copy tọa độ cấp món sang quán.
7. Sau khi sửa, bàn giao lệnh retry/backfill phù hợp để xử lý lại các bản ghi failed ở trên. Không tự chạy mutation/backfill production hoặc deploy nếu chưa được yêu cầu. GET phải đọc kết quả đã lưu và trả mapLocation resolved với tọa độ đích thật.
8. Quán 2 Hằng hiện dùng link có `ftid`, không có cặp tọa độ đích: giữ unresolved nếu chưa có cách định danh hợp lệ theo thiết kế đã chọn. Không dựng tọa độ từ ftid hay chọn kết quả theo tên.

## Một link cần Admin kiểm tra riêng

Link đang gắn cho **UBND xã Truông Mít** redirect tới địa chỉ **231/1 Nguyễn Phúc Chu, Tân Sơn, Hồ Chí Minh**, tọa độ 10.8251303,106.6390232. Đây là điểm dữ liệu cần Admin xác nhận/sửa link. Worker phải trả đích thực của URL; tuyệt đối không thay bằng trung tâm xã vì tên bản ghi khác tên trên Google Maps.

## Bàn giao

- Nêu nguyên nhân từng nhóm lỗi dựa trên code/log, file đã sửa và lệnh retry theo implementation thực tế.
- Bàn giao response list cuisine có mapLocation của từng quán, và response map-places tương ứng sau khi đã vận hành retry theo quyền được cấp.
- Không tạo hoặc chạy test tự động trong đợt này; người dùng tự test. Không tự deploy hoặc tự chỉnh nội dung/link Admin.
- Không báo đã hết lỗi nếu chỉ sửa parser mà chưa có kết quả worker thực tế; phân biệt phần code đã sửa với bước vận hành còn chờ.
