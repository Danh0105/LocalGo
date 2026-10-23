# Bộ tin giao thương mẫu xã Truông Mít

Đã chuẩn bị 6 tin cho 4 hồ sơ hội viên giả lập, kèm 3 ảnh AI trong `images/`.
Chưa xóa hoặc nhập bất kỳ dữ liệu nào lên API. Bộ này không được nối vào frontend để che các tin đang có.

`trade-posts.json` là manifest để nhập backend, không phải body gửi trực tiếp cho API.
Mỗi `payload` theo cấu trúc `TradePostPayload` tại `src/services/trade-posts.ts`.
`ownerRef` tham chiếu khóa hồ sơ mẫu trong `members`, chưa phải ID hội viên thực.
`images` là đường dẫn tương đối tính từ thư mục này, chưa phải media ID.
Số điện thoại `0000000000` phải thay bằng thông tin của tài khoản demo trước khi nhập.

## Cơ sở nội dung

- Nhãn và sầu riêng lấy cảm hứng từ vùng cây ăn trái Truông Mít: https://nongthon.vietnamtourism.gov.vn/tay-ninh-de-san-pham-ocop-phat-trien-ben-vung/
- Địa chỉ dùng xã Truông Mít, tỉnh Tây Ninh; khu vực Bàu Đồn thuộc xã sau sáp nhập: https://baotayninh.vn/xa-truong-mit-so-ket-1-nam-thuc-hien-mo-hinh-chinh-quyen-dia-phuong-2-cap-147897.html
- Cơm quê và dịch vụ thu hoạch là kịch bản giả lập cho giao thương địa phương. Không khẳng định có cơ sở thật, giá thật, chứng nhận hoặc hàng hóa đang sẵn có.

## Phần cần thực hiện trên backend

1. Xác định đúng môi trường và ánh xạ 4 `ownerRef` sang tài khoản hội viên demo hợp lệ; thay thông tin liên hệ giữ chỗ.
2. Sao lưu tin giao thương của tất cả hội viên, gồm mọi trạng thái và các bản ghi liên quan, trước khi reset.
3. Tải 3 ảnh lên hệ thống media, ánh xạ đường dẫn trong manifest sang media ID. API frontend hiện dùng `POST /media/images` với multipart field `file`.
4. Kiểm tra đầy đủ dữ liệu và media trước khi xóa; thực hiện reset bằng transaction/seed ở backend theo schema thật. Phải xử lý quan hệ của tin cũ theo schema; không xóa tài khoản hội viên hoặc dữ liệu ngoài phạm vi giao thương.
5. Nhập 6 `payload`, bổ sung `imageIds` và gắn đúng chủ tin. `POST /trade-posts` hiện tạo tin theo tài khoản trong token, không cho phép truyền `ownerRef` để đổi chủ tin.
6. Nếu dùng API hội viên, gửi duyệt bằng `PATCH /trade-posts/:id/submit`, rồi duyệt qua luồng quản trị có sẵn. Kiểm tra cả danh sách công khai, danh sách của mọi hội viên và chi tiết tin để xác nhận không còn tin cũ.

Không thể dùng riêng danh sách công khai để xác định đã xóa toàn bộ: nó không bao gồm tất cả tin nháp, chờ duyệt, ẩn và các trạng thái khác. Repo hiện tại không có backend/schema hay thông tin xác thực quản trị để hoàn thành bước reset.

## Hình ảnh

Tạo bằng công cụ imagegen tích hợp, đã xem và kiểm tra ảnh ở kích thước 1536 × 1024.
Ảnh là minh họa theo bối cảnh địa phương, không phải ảnh chụp xác thực tại một hộ kinh doanh cụ thể.
Prompt đầy đủ được lưu trong `image-prompts.json`.
