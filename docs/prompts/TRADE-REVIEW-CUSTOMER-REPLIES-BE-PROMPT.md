# Backend: Khách hàng trả lời công khai phản hồi của chủ tin giao thương

Bạn là Senior Backend Engineer phụ trách LocalGo. Hãy triển khai hoàn chỉnh service backend cho chức năng **khách hàng trả lời công khai ngay dưới phản hồi của chủ tin trong phần đánh giá tin giao thương**. Thực hiện thay đổi code, migration và kiểm thử trong repo backend hiện tại; không chỉ đưa ra kế hoạch hoặc pseudo-code.

Frontend đã có giao diện và phần gọi API theo contract đề xuất dưới đây. Repo frontend không chứa backend; cần triển khai API này ở backend trước khi chức năng gửi có thể hoạt động thực tế. Không tái sử dụng endpoint `PUT /trade-management/reviews/:id/reply` của chủ tin cho khách hàng.

## Đọc repo trước khi triển khai

- Đọc các `AGENTS.md` áp dụng và kiểm tra git status; bảo toàn thay đổi không liên quan.
- Tìm module trade, model đánh giá, service/repository/controller public và quản lý, DTO response, auth guard, response interceptor, error codes và test hiện tại.
- Dùng đúng stack và convention của repo. Nếu repo dùng NestJS/Prisma/PostgreSQL, mở rộng module trade hiện có, thêm migration Prisma và tái sử dụng dependency injection/repository pattern hiện tại.
- Frontend tham chiếu ở `D:\LocalGo\LocalGo`, nếu đường dẫn này truy cập được. Đối chiếu `src/services/trade-posts.ts` (`TradeReviewCustomerReply`, `TradeReviewResponse`, `replyToTradeReviewOwner`) và `src/components/trade/trade-review-customer-replies.tsx`. Không tự ý sửa frontend để né contract.
- Các đường dẫn API bên dưới đã bao gồm `/api/v1`; không khai báo lặp prefix nếu backend dùng global prefix.

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

Tổ chức phần triển khai theo convention sẵn có:

- Model câu trả lời riêng gồm ID, reviewId, userId, content, createdAt; khóa ngoại tới đánh giá/tác giả, index `(reviewId, createdAt, id)`. Chính sách xóa tài khoản phải cho phép `author: null` mà không làm lộ hoặc gán nhầm tác giả; đối chiếu cách repo đang lưu/xóa tài khoản để chọn quan hệ phù hợp.
- DTO tạo câu trả lời: chỉ nhận content, trim trước validation, kiểm tra kiểu string và độ dài. Không spread request body vào dữ liệu ghi database.
- Service tạo câu trả lời: xác thực người gửi, kiểm tra quyền và trạng thái tin/đánh giá/phản hồi, ghi database thật rồi trả DTO theo contract.
- Repository/query: tải `customerReplies` cùng author theo batch/include khi đọc danh sách đánh giá, tránh query từng reply/review. Cập nhật mapper dùng chung cho public và quản lý.
- Controller: thêm POST endpoint với auth guard và rate limit hiện có; mô tả request, response và lỗi trong Swagger. Tái sử dụng mã lỗi dự án, bổ sung mã mới nếu cần.
- Không tự tạo endpoint sửa/xóa câu trả lời, hệ thống chat hoặc loại thông báo mới trong phạm vi này.

Kiểm thử persistence sau khi tải lại, quyền truy cập và các lỗi nêu trên, nhiều khách hàng trả lời cùng đánh giá, hai đánh giá không lẫn dữ liệu, nội dung tiếng Việt/xuống dòng, chủ tin đọc được trả lời trong quản lý, ẩn/xóa tin hoặc đánh giá, và điểm/số lượt đánh giá không thay đổi.

Kiểm thử thêm: người dùng khác người viết đánh giá ban đầu vẫn được trả lời nếu không phải chủ tin; giả mạo userId không thay đổi tác giả; chuỗi rỗng/chỉ khoảng trắng và nội dung trên 500 ký tự bị từ chối; review thuộc tin khác bị từ chối; xóa phản hồi chủ tin không xóa lịch sử khách hàng; các response thêm/sửa/xóa phản hồi chủ tin vẫn trả `customerReplies`.

## Tiêu chí hoàn thành và bàn giao

1. Migration, service, repository, controller, DTO và mapper được triển khai bằng code chạy được, không mock dữ liệu.
2. Gửi qua POST thành công, sau đó GET public và GET quản lý đều thấy cùng câu trả lời; tải lại trang vẫn còn dữ liệu.
3. Đánh giá cũ trả `customerReplies: []`, các endpoint hiện tại tiếp tục hoạt động, điểm trung bình và số lượt đánh giá không đổi.
4. Chạy generate/build/typecheck/lint/test phù hợp theo scripts repo và kiểm tra migration trên database kiểm thử nếu có. Không reset database hoặc chạy migration lên production. Nếu môi trường thiếu dependency hoặc database, nêu rõ phần chưa xác minh, không báo đã pass.
5. Khi hoàn tất, liệt kê ngắn gọn file đã thay đổi, migration mới, API đã bổ sung, kết quả kiểm thử và lệnh cần chạy để áp dụng migration theo convention repo. Cung cấp ví dụ request/response thực tế hoặc test fixture; không đưa token thật vào báo cáo.
