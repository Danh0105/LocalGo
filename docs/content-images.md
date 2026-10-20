# Ảnh đại diện và thư viện ảnh nội dung

Áp dụng cho festivals, news, experience-tours, craft-villages, contacts,
agriculture, historical-sites và specialties.

## Public Mini App

- Model của tám nhóm dùng `ContentImageFields`; mapper API giữ `imageUrl`,
  `imageAlt`, mặc định `galleryImages` thiếu/null thành `[]` và sắp theo `sortOrder`.
- Field `image` hiện tại vẫn giữ nguyên cách chọn ảnh đại diện/fallback cho card.
  List không render gallery hoặc phát sinh request detail để lấy ảnh phụ.
- Tám trang chi tiết dùng `ContentGallery`. Ảnh đầu tiên luôn là ảnh đại diện
  hoặc placeholder cũ, kể cả khi chỉ có ảnh phụ. Không tự đổi ảnh phụ thành cover.
- Nhiều ảnh có thumbnail, bộ đếm, chọn ảnh, skeleton và fallback cục bộ khi ảnh lỗi.
  Thumbnail dùng `thumbnailUrl ?? imageUrl`; ảnh lớn chỉ tải khi được chọn.
- `PreviewableImage` mở ảnh đang chọn ở chế độ toàn màn hình, hỗ trợ vuốt,
  phím mũi tên và Escape. Khi mở gallery, chỉ ảnh lớn đang xem có URL tải;
  các thumbnail dùng URL ảnh nhỏ nếu được cung cấp.
- Nội dung một ảnh không có thanh thumbnail hoặc bộ đếm dư thừa.

## Upload và phạm vi quản trị

Repo này không có form hoặc endpoint tạo/cập nhật quản trị cho tám nhóm nội dung.
Không thêm trang Admin, payload PUT thiếu field/version hoặc đổi luồng tin đăng,
đăng ký kinh doanh, phản ánh để giả lập việc quản trị các module này.

Hàm `uploadContentImages(accessToken, files, signal?)` tại `src/services/media.ts`:

- POST `/media/images/batch` bằng FormData với field `files` lặp lại.
- Tối đa 10 ảnh/request, JPG/PNG/WebP, tối đa 5 MB/ảnh theo giới hạn upload sẵn có.
- Không tự đặt Content-Type; trả `response.data` theo đúng thứ tự của BE.
- Lỗi API giữ HTTP status và mã BE bằng `AuthRequestError` để caller dùng luồng
  đăng nhập/refresh hiện có. Không tự refresh bằng một token lưu riêng.
- Giữ nguyên API upload ảnh đơn hiện tại ở các module đang sử dụng.

Khi tích hợp với repo Admin thực tế, form cần quản lý cover + gallery riêng,
chặn ID trùng, ảnh cover không nằm trong gallery; state chỉ lưu media ID/URL sau
upload thành công. PUT phải gửi đầy đủ nội dung/version và toàn bộ mảng
`galleryMediaIds`, kể cả `[]` khi xóa hết. Phần form/payload đó chưa có trong repo này.

## Kiểm tra

`npm test`, `npm run typecheck`, `npm run build`.
Repo chưa có script/config lint riêng. Kiểm thử bao gồm mapper cả tám nguồn,
gallery cũ/nhiều ảnh, đổi ảnh, vuốt trong viewer, fallback và upload batch.
