# Prompt BE sửa lỗi Zalo Mini App `Failed to fetch` và bật xác thực Zalo thật trên Production

Bạn là Senior Backend/DevOps Engineer phụ trách LocalGo Backend tại `F:\LocalGo-BE`. Hãy sửa lỗi đăng nhập từ Zalo Mini App production vào API:

```text
https://api.localgo.skilltripx.com.vn/api/v1
```

Mục tiêu là để Mini App gọi được `POST /auth/zalo`, xác thực bằng Zalo access token thật, nhận LocalGo access token và tiếp tục gọi `GET /users/me` thành công.

Không xây lại module auth, không thay đổi response contract, không tạo endpoint mới và không migration database. Source hiện tại đã có `RealZaloAuthProvider`; công việc chính là rà soát cấu hình CORS, biến môi trường production, artifact deploy và quá trình restart dịch vụ.

## 1. Bằng chứng lỗi hiện tại

Bundle Mini App đang chạy từ origin:

```text
https://h5.zadn.vn
```

Stack trace có cả tài nguyên wrapper từ:

```text
https://h5.zdn.vn
```

Khi gửi preflight tới:

```text
OPTIONS https://api.localgo.skilltripx.com.vn/api/v1/auth/zalo
Origin: https://h5.zadn.vn
```

API trả `204` nhưng không có header `Access-Control-Allow-Origin`, nên WebView chặn request và frontend chỉ nhận lỗi mạng `TypeError: Failed to fetch`.

Preflight từ `https://h5.zdn.vn` cũng chưa nhận được `Access-Control-Allow-Origin`, trong khi các origin localhost đang được cho phép.

Ngoài ra, thử gọi `POST /auth/zalo` trên production bằng token không hợp lệ đang nhận thông báo:

```text
Access token Zalo (mock) không hợp lệ. Định dạng: mock::...
```

Điều này cho thấy bản production hiện vẫn chạy `ZALO_AUTH_MODE=mock`, hoặc đang dùng artifact/biến môi trường cũ chưa được restart.

## 2. Source of truth phải đọc trước khi sửa

Đọc trực tiếp các file hiện có:

- `src/main.ts` hoặc nơi khởi tạo CORS cho NestJS.
- `src/config/auth.config.ts`.
- `src/config/env.validation.ts`.
- `src/modules/auth/auth.module.ts`.
- `src/modules/auth/auth.service.ts`.
- `src/modules/auth/providers/real-zalo-auth.provider.ts`.
- `src/modules/auth/providers/mock-zalo-auth.provider.ts`.
- `src/modules/auth/providers/real-zalo-auth.provider.spec.ts`.
- `.env.example`.
- Dockerfile, compose, PM2, systemd, CI/CD hoặc cấu hình nền tảng đang thực sự deploy production.

Xác định rõ biến `CORS_ORIGINS`, `ZALO_AUTH_MODE` và `ZALO_APP_SECRET` được đọc ở thời điểm build hay runtime. Không giả định sửa `.env.example` là đủ để thay đổi production.

## 3. Cấu hình CORS production

Cho phép chính xác các origin đáng tin cậy của hệ thống, tối thiểu gồm:

```text
https://h5.zadn.vn
https://h5.zdn.vn
```

`https://h5.zadn.vn` là origin thực tế của bundle Mini App trong stack trace và là giá trị bắt buộc phải kiểm tra. Giữ lại các origin Admin/web production hiện có; không ghi đè hoặc làm mất chúng khi bổ sung origin Mini App.

Yêu cầu:

- Parse `CORS_ORIGINS` thành allowlist chính xác, trim khoảng trắng và bỏ phần tử rỗng.
- So khớp toàn bộ origin, không dùng kiểm tra chuỗi lỏng như `includes()` hoặc `endsWith()` có thể chấp nhận domain giả.
- Không dùng `Access-Control-Allow-Origin: *` nếu API bật credentials.
- Preflight `OPTIONS` không được yêu cầu Bearer token.
- Response preflight phải trả đúng `Access-Control-Allow-Origin` theo request origin được phép.
- Cho phép ít nhất các method `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS` theo nhu cầu API hiện có.
- Cho phép các request header cần thiết, tối thiểu `Content-Type` và `Authorization`.
- Chỉ bật `Access-Control-Allow-Credentials: true` nếu frontend thực sự dùng cookie/credentials; Bearer token trong `Authorization` không tự động yêu cầu cookie credentials.
- Origin không có trong allowlist phải tiếp tục bị từ chối.

Cập nhật `.env.example` để tài liệu hóa đúng, ví dụ:

```dotenv
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:2999,https://h5.zadn.vn,https://h5.zdn.vn
```

Nếu production có domain Admin hoặc web khác, phải nối thêm vào danh sách trên thay vì thay toàn bộ bằng ví dụ này.

## 4. Bật Real Zalo Auth trên production

Source hiện tại đã có `RealZaloAuthProvider`, gọi:

```text
GET https://graph.zalo.me/v2.0/me
```

với query `access_token`, `fields=id,name,picture` và header `secret_key`. Giữ nguyên contract provider và mapping hiện có trừ khi kiểm thử staging chứng minh Zalo yêu cầu điều chỉnh.

Thiết lập trong biến môi trường thực sự của production:

```dotenv
ZALO_AUTH_MODE=real
ZALO_APP_SECRET=<ZALO_APP_SECRET_THẬT>
```

Yêu cầu bảo mật:

- Không commit secret thật vào Git, `.env.example`, tài liệu, test fixture hoặc log CI/CD.
- Không log Zalo access token, LocalGo access token, refresh token hoặc `ZALO_APP_SECRET`.
- Secret phải lấy từ secret manager/biến môi trường của nền tảng deploy.
- Kiểm tra `ZALO_APP_SECRET` thuộc đúng Zalo App/Mini App đang phát hành.
- Validation phải fail fast khi `ZALO_AUTH_MODE=real` nhưng thiếu secret.
- Mode `mock` vẫn dùng được cho local/test, nhưng tuyệt đối không được bật trên production.

Giữ đúng phân loại lỗi hiện có:

- Zalo token rỗng, sai hoặc hết hạn: `401 INVALID_CREDENTIALS`.
- Zalo Graph API timeout, không phản hồi hoặc trả response hỏng: `502 INTERNAL_ERROR`.
- Không trả chi tiết lỗi mạng nội bộ, token hoặc secret ra client.

## 5. Kiểm tra artifact và restart dịch vụ

Rà soát toàn bộ đường deploy để tránh tình trạng source đã có Real provider nhưng production vẫn chạy bundle cũ:

1. Xác định commit/image tag đang chạy.
2. Build lại backend từ commit có `RealZaloAuthProvider` và wiring trong `AuthModule`.
3. Cập nhật biến môi trường tại đúng nơi runtime đọc cấu hình.
4. Redeploy/recreate container hoặc restart PM2/systemd/service tương ứng.
5. Nếu có nhiều replica, đảm bảo tất cả replica nhận cùng image và env mới.
6. Kiểm tra reverse proxy/CDN/API gateway không xóa header CORS do NestJS trả về.
7. Không chỉ restart proxy nếu process backend vẫn giữ env cũ.

Trong báo cáo bàn giao, ghi rõ:

- Nơi đã cấu hình env: Docker Compose, Kubernetes Secret, PM2, systemd hay nền tảng cloud nào.
- Commit/image tag đã deploy.
- Lệnh hoặc thao tác restart/redeploy đã thực hiện.
- Số replica đã cập nhật.

Không ghi giá trị secret thật vào báo cáo.

## 6. Kiểm thử bắt buộc

### 6.1. Test tự động

Chạy các test auth hiện có, bao gồm test của `RealZaloAuthProvider`, rồi chạy lint/build/test theo scripts thực tế của repo.

Đảm bảo tối thiểu:

- Token rỗng bị từ chối mà không gọi Zalo.
- Request Zalo gửi đúng query/header.
- Response hợp lệ được map đúng `zaloId`, `name`, `avatarUrl`.
- Token Zalo không hợp lệ trả `401 INVALID_CREDENTIALS`.
- Lỗi upstream/response hỏng trả `502 INTERNAL_ERROR`.
- Local/test mode mock vẫn pass.
- Env validation chỉ bắt buộc `ZALO_APP_SECRET` khi mode là `real`.
- CORS allowlist chấp nhận đúng `h5.zadn.vn`, từ chối origin giả như `https://h5.zadn.vn.evil.example`.

### 6.2. Smoke test preflight production

Sau khi deploy, chạy tương đương:

```bash
curl -i -X OPTIONS "https://api.localgo.skilltripx.com.vn/api/v1/auth/zalo" \
  -H "Origin: https://h5.zadn.vn" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
```

Kết quả phải có:

```text
Access-Control-Allow-Origin: https://h5.zadn.vn
```

và cho phép `POST`, `Content-Type`, `Authorization` theo cấu hình. Thực hiện thêm một lượt với `https://h5.zdn.vn` nếu domain này vẫn tham gia luồng WebView.

Kiểm tra negative case với một origin không được phép; response không được cấp `Access-Control-Allow-Origin` cho origin đó.

### 6.3. Smoke test xác thực thật

Thử ở staging trước, sau đó production bằng một Zalo access token thật lấy trực tiếp từ Mini App đúng app ID:

1. `POST /api/v1/auth/zalo` với body `{ "accessToken": "<token thật>" }`.
2. Xác nhận response trả LocalGo `accessToken`, `refreshToken`, `expiresAt` theo contract hiện tại.
3. Gọi `GET /api/v1/users/me` với `Authorization: Bearer <LocalGo accessToken>`.
4. Xác nhận hồ sơ người dùng trả đúng và frontend không còn báo `Failed to fetch`.
5. Nếu hệ thống có refresh/logout, smoke test tiếp flow hiện có.

Không đưa token thật vào source, command history dùng chung, ticket, ảnh chụp hoặc log bàn giao.

Thử thêm một token giả sau deploy. Response có thể là `401`, nhưng tuyệt đối không còn thông báo chứa `(mock)` hoặc hướng dẫn định dạng `mock::...`.

## 7. Quan sát và xử lý lỗi sau deploy

Log có cấu trúc ở mức an toàn cho các trường sau:

- endpoint và HTTP status;
- provider mode đang chạy (`real`/`mock`) nhưng không log secret;
- loại lỗi Zalo ở mức đã chuẩn hóa;
- thời gian gọi upstream;
- request/correlation ID nếu hệ thống đã có.

Nếu smoke test thất bại, phân biệt rõ:

- Không có `Access-Control-Allow-Origin`: lỗi allowlist/backend/proxy.
- Browser báo CORS nhưng curl backend đúng: kiểm tra CDN/API gateway/cache và request origin thực tế.
- API trả message `(mock)`: env chưa cập nhật, artifact cũ hoặc replica cũ.
- API trả `401 INVALID_CREDENTIALS` với token thật: kiểm tra token thuộc đúng Zalo App, token hết hạn hoặc `ZALO_APP_SECRET` sai.
- API trả `502 INTERNAL_ERROR`: kiểm tra outbound network/DNS/TLS tới `graph.zalo.me` và response upstream, không đổi lỗi này thành `401`.

## 8. Rollback

Chuẩn bị rollback về image/commit backend gần nhất nếu deployment gây lỗi ngoài phạm vi auth. Khi rollback:

- Không rollback allowlist `https://h5.zadn.vn` nếu cấu hình CORS mới đã được xác nhận an toàn.
- Không chuyển production về `mock` như một cách khắc phục tạm thời.
- Nếu Real Zalo Auth chưa hoạt động do secret/upstream, giữ API fail đóng và báo lỗi chuẩn; không chấp nhận token giả trên production.

## 9. Tiêu chí nghiệm thu

- Preflight từ `https://h5.zadn.vn` nhận đúng `Access-Control-Allow-Origin`.
- Origin Admin/web production hiện có vẫn hoạt động.
- Origin giả/không nằm trong allowlist không được cấp quyền CORS.
- Production chạy `ZALO_AUTH_MODE=real` trên mọi replica.
- `POST /auth/zalo` với token thật trả LocalGo tokens theo contract hiện có.
- `GET /users/me` bằng LocalGo Bearer token trả hồ sơ hiện tại.
- Token sai trả `401 INVALID_CREDENTIALS`; lỗi Zalo upstream trả `502 INTERNAL_ERROR`.
- Không còn response production chứa `(mock)` hoặc `mock::`.
- Không lộ Zalo token, LocalGo token hoặc app secret trong source/log/báo cáo.
- Không đổi endpoint, response envelope, role/user contract và không có migration database.
- Báo chính xác kết quả test, lint, build, preflight production và smoke test thực tế; liệt kê file/config đã sửa cùng commit/image tag đã deploy.
