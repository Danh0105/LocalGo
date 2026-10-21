# Backend: Khách hàng trả lời công khai phản hồi của chủ tin giao thương

Frontend đã có giao diện và phần gọi API theo contract đề xuất dưới đây. Repo frontend không chứa backend; cần triển khai API này ở backend trước khi chức năng gửi có thể hoạt động thực tế. Không tái sử dụng endpoint `PUT /trade-management/reviews/:id/reply` của chủ tin cho khách hàng.

## Nghiệp vụ

- Giữ đánh giá, số sao và `replyContent` / `repliedAt` của chủ tin như hiện tại.
- Khi đánh giá `PUBLISHED` có phản hồi của chủ tin, khách hàng đã đăng nhập có thể gửi nhiều câu trả lời công khai bên dưới. Khách hàng ở đây là người dùng khác chủ tin, không chỉ người viết đánh giá ban đầu.
- Người chưa đăng nhập vẫn đọc được câu trả lời. Frontend yêu cầu đăng nhập khi gửi.
- Nội dung được trim, dài 1–500 ký tự. Backend phải tự xác định người gửi từ access token; không nhận userId/author từ client.
- Kiểm tra tin còn hiển thị công khai, đánh giá thuộc đúng tin, trạng thái PUBLISHED và có phản hồi chủ tin. Từ chối chủ tin dùng endpoint này; chủ tin tiếp tục dùng luồng quản lý phản hồi hiện có.
- Câu trả lời là dữ liệu riêng, không ghi đè nội dung đánh giá/phản hồi chủ tin và không làm tăng số đánh giá hay thay đổi điểm trung bình.

## Contract frontend đang sử dụng (mới, cần backend triển khai)

### Gửi trả lời

`POST /api/v1/trade-posts/:tradePostId/reviews/:reviewId/replies`

Authorization: Bearer token của khách hàng.

Body:

```json
{ "content": "Cảm ơn chủ tin, mình đã nhận được hỗ trợ." }
```

Trả về HTTP 201, envelope chuẩn:

```json
{
  "success": true,
  "data": {
    "id": "reply-id",
    "reviewId": "review-id",
    "userId": "customer-id",
    "content": "Cảm ơn chủ tin, mình đã nhận được hỗ trợ.",
    "createdAt": "2026-10-21T03:00:00.000Z",
    "author": {
      "id": "customer-id",
      "displayName": "Khách hàng",
      "avatarUrl": null
    }
  }
}
```

Lỗi dùng envelope chuẩn `{ success: false, error: { code, message } }` với 400 khi nội dung không hợp lệ, 401 khi chưa đăng nhập, 403 khi chủ tin gửi, 404 khi tin/đánh giá không tồn tại hoặc không công khai, 409 khi phản hồi chủ tin đã bị xóa, 429 khi quá giới hạn gửi.

### Đọc trả lời

Bổ sung `customerReplies` vào từng `TradeReviewResponse` trong cả:

- `GET /api/v1/trade-posts/:id/reviews` (public).
- `GET /api/v1/trade-management/reviews` (chủ tin).
- Các response trả về review khi chủ tin thêm/sửa/xóa phản hồi, để không làm mất câu trả lời đang hiển thị trên frontend.

`customerReplies` là mảng object theo cấu trúc `data` ở trên, thứ tự `createdAt ASC, id ASC`, mặc định `[]`. `author` có thể null nếu tài khoản đã bị xóa. Không trả thông tin cá nhân khác. Không thay đổi pagination của danh sách đánh giá. Frontend hiện đọc mảng này trong response review, chưa gọi endpoint lấy danh sách replies riêng.

Nếu chủ tin xóa phản hồi: giữ các câu trả lời cũ để không mất lịch sử, chặn tạo câu trả lời mới cho đến khi chủ tin phản hồi lại. Nếu đánh giá/tin bị ẩn hoặc xóa: các câu trả lời phải tuân theo cùng quyền hiển thị; không được lộ qua API công khai.

## Triển khai và kiểm thử backend

Đọc AGENTS.md và convention repo backend trước khi sửa; giữ các thay đổi không liên quan. Thêm model/migration liên kết review và tác giả, index phục vụ truy vấn, DTO validation và Swagger. Tái sử dụng auth guard, envelope lỗi và rate limit của dự án. Tạo trả lời phải kiểm tra quyền/trạng thái trong cùng transaction phù hợp để xử lý trường hợp phản hồi chủ tin vừa bị xóa.

Kiểm thử persistence sau khi tải lại, quyền truy cập và các lỗi nêu trên, nhiều khách hàng trả lời cùng đánh giá, hai đánh giá không lẫn dữ liệu, nội dung tiếng Việt/xuống dòng, chủ tin đọc được trả lời trong quản lý, ẩn/xóa tin hoặc đánh giá, và điểm/số lượt đánh giá không thay đổi.
