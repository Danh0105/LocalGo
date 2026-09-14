# Prompt BE: Đưa danh mục tin Giao thương vào database

Bạn là Senior Backend Engineer phụ trách backend LocalGo tại `F:\LocalGo-BE`. Hãy **triển khai hoàn chỉnh**, không chỉ phân tích hoặc viết pseudo-code, để danh mục tin Giao thương được quản lý trong PostgreSQL thay vì hard-code bằng Prisma enum.

Frontend tham chiếu nằm tại `F:\LocalGo`, nhưng phạm vi chính của nhiệm vụ này là backend. Chỉ đọc frontend để đối chiếu contract; không tự ý sửa frontend trong task này.

## 1. Đọc repo và giữ convention hiện có

Trước khi sửa:

- Đọc toàn bộ `AGENTS.md` áp dụng cho các file sẽ thay đổi.
- Kiểm tra working tree và giữ nguyên mọi thay đổi không liên quan của người dùng.
- Đọc các file hiện tại:
  - `prisma/schema.prisma`
  - `prisma/seed.ts`
  - `src/modules/trade/trade.module.ts`
  - `src/modules/trade/posts/dto/create-trade-post.dto.ts`
  - `src/modules/trade/posts/dto/update-trade-post.dto.ts`
  - `src/modules/trade/posts/dto/query-trade-post.dto.ts`
  - `src/modules/trade/posts/dto/trade-post-response.dto.ts`
  - `src/modules/trade/posts/entities/trade-post.entity.ts`
  - `src/modules/trade/posts/repositories/trade-post.repository.ts`
  - `src/modules/trade/posts/services/trade-post.service.ts`
  - `src/modules/trade/posts/utils/trade-post-business-rules.util.ts`
  - controller public/admin và các test liên quan.
- Giữ đúng stack hiện tại: NestJS 11, Prisma 7, PostgreSQL, `class-validator`, Swagger, `AppException`, `ErrorCode`, auth/role guard, response envelope, pagination và audit convention của dự án.
- Tái sử dụng pattern module CRUD hiện có trong repo; không tạo kiến trúc thứ hai.

## 2. Hiện trạng cần thay đổi

Hiện backend đang có:

```prisma
enum TradePostCategory {
  PRODUCT
  SERVICE
  BUY_REQUEST
  PROMOTION
}

model TradePost {
  // ...
  category TradePostCategory
}
```

DTO dùng `@IsEnum(TradePostCategory)`, query lọc trực tiếp enum, response trả `category` là enum, và business rule kiểm tra trực tiếp `TradePostCategory.PROMOTION`.

Frontend hiện vẫn gửi/lọc bằng 4 mã sau:

- `PRODUCT` — Sản phẩm
- `SERVICE` — Dịch vụ
- `BUY_REQUEST` — Cần mua
- `PROMOTION` — Khuyến mãi

Không được làm mất dữ liệu tin hiện có và không được phá contract đang chạy trong lúc chuyển đổi.

## 3. Kết quả bắt buộc

Sau khi hoàn thành:

1. Danh mục là entity trong database, có migration và seed idempotent.
2. Tin đăng tham chiếu danh mục bằng foreign key.
3. Public API có endpoint lấy danh sách danh mục đang hoạt động, đúng thứ tự hiển thị.
4. Admin có API tạo, sửa, ẩn/hiện, sắp xếp và xóa danh mục theo quyền.
5. API tin đăng vẫn chấp nhận query/body `category` bằng mã ổn định như `PRODUCT` để tương thích frontend hiện tại.
6. Response tin đăng vẫn giữ trường `category: string`, đồng thời bổ sung `categoryInfo` để client có metadata từ DB.
7. Không còn `TradePostCategory` Prisma enum trong domain tin đăng sau khi migration hoàn tất.
8. Quy tắc khuyến mãi dựa trên thuộc tính của bản ghi danh mục, không hard-code so sánh enum `PROMOTION` trong service/util.

## 4. Thiết kế dữ liệu

Tạo model Prisma mới theo naming convention của dự án, tối thiểu tương đương:

```prisma
model TradePostCategory {
  id                       String      @id @default(uuid())
  code                     String      @unique @db.VarChar(50)
  name                     String      @db.VarChar(120)
  description              String?     @db.VarChar(300)
  sortOrder                Int         @default(0)
  isActive                 Boolean     @default(true)
  requiresPromotionDetails Boolean     @default(false)
  version                  Int         @default(1)
  createdAt                DateTime    @default(now())
  updatedAt                DateTime    @updatedAt
  deletedAt                DateTime?
  createdById              String?
  updatedById              String?

  posts                    TradePost[]
  createdBy                User?       @relation(/* đặt relation name rõ ràng */)
  updatedBy                User?       @relation(/* đặt relation name rõ ràng */)

  @@index([isActive, sortOrder])
  @@index([deletedAt])
}
```

Điều chỉnh chính xác relation với `User` theo schema hiện tại; bổ sung relation ngược và relation name rõ ràng để Prisma generate thành công.

Đổi `TradePost` sang:

```prisma
categoryId String
category   TradePostCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)

@@index([categoryId])
```

Yêu cầu dữ liệu:

- `code` là mã API ổn định, trim, uppercase, chỉ nhận regex `^[A-Z][A-Z0-9_]{1,49}$`.
- Không cho đổi `code` sau khi danh mục đã được tạo. Tên và mô tả có thể sửa.
- `sortOrder` là số nguyên không âm.
- `version` dùng optimistic locking cho admin update/status.
- Dùng soft delete/audit convention hiện có.
- Không xóa cứng danh mục đang được bất kỳ tin nào tham chiếu.
- `requiresPromotionDetails=true` nghĩa là tin thuộc danh mục đó bắt buộc có đủ `promotionPercent`, `promotionStartAt`, `promotionEndAt`.
- Danh mục không yêu cầu thông tin khuyến mãi thì không được nhận ba trường trên, giữ đúng hành vi hiện tại.

Nếu qua việc đọc repo thấy tên field audit hoặc soft-delete khác convention trên, ưu tiên convention hiện có nhưng vẫn phải đảm bảo đủ hành vi.

## 5. Migration không mất dữ liệu

Viết Prisma migration có SQL chuyển đổi an toàn. Không dựa vào việc chạy `db:seed` sau migration để backfill dữ liệu production.

Migration phải thực hiện theo thứ tự tương đương:

1. Tạo bảng danh mục.
2. Insert/upsert trực tiếp 4 danh mục mặc định trong migration:

| code | name | description | sortOrder | requiresPromotionDetails |
|---|---|---|---:|---:|
| `PRODUCT` | `Sản phẩm` | `Đặc sản và sản phẩm địa phương` | 0 | false |
| `SERVICE` | `Dịch vụ` | `Kết nối dịch vụ và tiện ích` | 1 | false |
| `BUY_REQUEST` | `Cần mua` | `Tìm sản phẩm, dịch vụ và đối tác` | 2 | false |
| `PROMOTION` | `Khuyến mãi` | `Ưu đãi và chương trình khuyến mãi` | 3 | true |

3. Thêm `categoryId` tạm thời nullable vào `TradePost`.
4. Backfill `categoryId` theo giá trị enum cũ của từng tin.
5. Kiểm tra không còn dòng nào `categoryId IS NULL`.
6. Đặt `categoryId NOT NULL`, thêm foreign key và index.
7. Xóa cột enum cũ và PostgreSQL enum type cũ sau khi dữ liệu đã được chuyển thành công.

Migration phải chạy được bằng `npm run prisma:deploy` trên database đã có tin cũ. Không sửa hoặc squash migration lịch sử đã deploy.

Ngoài migration, thêm seed idempotent trong `prisma/seed.ts` hoặc file seed riêng để 4 bản ghi trên luôn tồn tại ở môi trường dev/test. Seed dùng `upsert` theo `code`, không tạo trùng và không ghi đè tùy chỉnh admin một cách ngoài ý muốn. Migration là nguồn bảo đảm dữ liệu production; seed là nguồn khởi tạo/rà soát môi trường mới.

## 6. Public API danh mục

Thêm module/controller/service/repository/DTO phù hợp dưới `src/modules/trade/categories` hoặc vị trí khớp cấu trúc hiện tại.

### `GET /api/v1/trade-post-categories`

- Public, không yêu cầu đăng nhập.
- Chỉ trả danh mục `isActive=true` và chưa soft-delete.
- Sắp xếp `sortOrder ASC`, sau đó `name ASC` hoặc `createdAt ASC` làm tie-breaker ổn định.
- Không phân trang vì số danh mục nhỏ.
- Không trả audit field nội bộ.
- Có Swagger đầy đủ.
- Có cache header hợp lý; mọi mutation admin phải làm kết quả mới xuất hiện ngay hoặc cache được invalidate đúng cách.

Response sau khi qua envelope chung:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "PRODUCT",
      "name": "Sản phẩm",
      "description": "Đặc sản và sản phẩm địa phương",
      "sortOrder": 0,
      "requiresPromotionDetails": false
    }
  ]
}
```

## 7. Admin API danh mục

Mutation chỉ dành cho `ADMIN`. Nếu convention hiện tại cho phép `MODERATOR` xem danh sách thì có thể cho đọc, nhưng không tự mở quyền mutation cho `MODERATOR`.

Thêm tối thiểu:

- `GET /api/v1/admin/trade-post-categories`
  - Có phân trang, search theo `code`/`name`, lọc `isActive`, hiển thị cả mục ẩn.
  - Có thể trả `postCount` bằng aggregate, không chạy N+1.
- `GET /api/v1/admin/trade-post-categories/:id`
- `POST /api/v1/admin/trade-post-categories`
- `PATCH /api/v1/admin/trade-post-categories/:id`
  - Không cho sửa `code`.
  - Nhận `version`, update theo optimistic locking.
- `PATCH /api/v1/admin/trade-post-categories/:id/status`
  - Body tối thiểu `{ "isActive": false, "version": 2 }`.
- `PATCH /api/v1/admin/trade-post-categories/reorder`
  - Body chứa danh sách `{ id, sortOrder, version? }`.
  - Cập nhật toàn bộ trong một transaction; một item lỗi phải rollback toàn bộ.
- `DELETE /api/v1/admin/trade-post-categories/:id`
  - Nếu đang có tin tham chiếu, trả `409 TRADE_POST_CATEGORY_IN_USE` và hướng dẫn ẩn danh mục thay vì xóa.
  - Nếu chưa được dùng, soft-delete theo convention.

Admin mutation phải ghi `AuditLog` với actor, resource type/id và old/new data phù hợp pattern repo.

## 8. Contract tin đăng và tương thích ngược

Không bắt frontend hiện tại phải gửi UUID danh mục. Giữ mã danh mục là public identifier.

### Create/update

Giữ request:

```json
{
  "category": "PRODUCT"
}
```

Thay `@IsEnum(TradePostCategory)` bằng validation chuỗi code. Service phải:

1. Trim/validate format code.
2. Query category theo `code` trong DB.
3. Chỉ chấp nhận danh mục đang active và chưa bị xóa khi tạo tin hoặc đổi danh mục.
4. Lưu `categoryId` vào `TradePost`.
5. Nếu code không tồn tại hoặc không active, trả `400 TRADE_POST_CATEGORY_INVALID`; không để lỗi foreign key/Prisma thô lọt ra ngoài.

Nếu update không đổi category thì tin cũ vẫn có thể sửa các field khác theo rule hiện tại. Nếu danh mục của tin đã bị admin ẩn, cần nêu rõ và test hành vi đã chọn; ưu tiên không cho submit/publish mới dưới danh mục ẩn nhưng vẫn cho chủ tin đọc bản nháp và admin xử lý dữ liệu cũ.

### Query list

Giữ query tương thích:

```http
GET /api/v1/trade-posts?category=PRODUCT
```

Đổi validation enum sang validation mã chuỗi và lọc quan hệ `category.code`. Không trả 500 cho code lạ; trả `400 TRADE_POST_CATEGORY_INVALID` hoặc danh sách rỗng theo convention hiện tại, nhưng phải chọn một hành vi nhất quán, mô tả Swagger và test. Ưu tiên `400` để client phát hiện dữ liệu sai.

Public list/detail phải loại tin thuộc category inactive/soft-deleted. Owner/admin API vẫn phải xem được tin cũ và metadata danh mục để quản trị.

### Response tin đăng

Giữ trường cũ để frontend không gãy:

```json
{
  "category": "PRODUCT"
}
```

Đồng thời bổ sung:

```json
{
  "category": "PRODUCT",
  "categoryInfo": {
    "id": "uuid",
    "code": "PRODUCT",
    "name": "Sản phẩm",
    "description": "Đặc sản và sản phẩm địa phương",
    "sortOrder": 0,
    "requiresPromotionDetails": false
  }
}
```

Repository phải include/select category ngay trong query list/detail; không phát sinh N+1. Entity và response DTO map `category` từ `category.code`, không map từ enum cũ.

## 9. Business rule khuyến mãi

Refactor `trade-post-business-rules.util.ts` để không import hoặc so sánh `TradePostCategory.PROMOTION`.

Utility/service phải nhận thông tin capability của danh mục, ví dụ `requiresPromotionDetails`, rồi áp dụng:

- Nếu `true`: bắt buộc đủ `promotionPercent`, `promotionStartAt`, `promotionEndAt` và `start < end`.
- Nếu `false`: từ chối khi có bất kỳ promotion field nào.
- Khi update, validate trạng thái cuối cùng sau khi merge DTO với dữ liệu hiện tại, giữ hành vi đúng như test cũ.

Đổi category của một tin từ category khuyến mãi sang category thường phải yêu cầu xóa các promotion field trong cùng request hoặc service phải có quy tắc rõ ràng, không để dữ liệu khuyến mãi treo trên category thường.

## 10. Error code bắt buộc

Bổ sung vào `ErrorCode` và dùng thống nhất:

- `TRADE_POST_CATEGORY_NOT_FOUND` — 404 admin detail.
- `TRADE_POST_CATEGORY_INVALID` — 400 khi create/update/filter dùng code không hợp lệ hoặc category inactive.
- `TRADE_POST_CATEGORY_CODE_EXISTS` — 409 khi tạo trùng code.
- `TRADE_POST_CATEGORY_IN_USE` — 409 khi xóa category đã có tin.
- `TRADE_POST_CATEGORY_VERSION_CONFLICT` — 409 optimistic locking; trả bản ghi mới nhất trong details theo convention của các CMS module khác.

Không để lộ Prisma error, SQL, stack trace hoặc internal ID không cần thiết trong message public.

## 11. Test bắt buộc

Viết/cập nhật unit và integration/e2e test, tối thiểu gồm:

### Migration/seed

- Bốn category mặc định tồn tại đúng code, label, thứ tự và capability.
- Tin cũ của cả 4 enum được backfill đúng categoryId, không mất bản ghi.
- Seed chạy hai lần không tạo trùng.

### Public category

- Chỉ trả category active, chưa xóa và đúng thứ tự.
- Không yêu cầu access token.

### Admin category

- USER/BUSINESS/MODERATOR không được mutation nếu policy là ADMIN-only.
- Tạo category hợp lệ thành công.
- Từ chối code sai format và code trùng.
- Không cho đổi code ở update.
- Optimistic locking trả 409 cho request version cũ.
- Reorder transaction rollback toàn bộ khi một item sai.
- Xóa category đang có tin trả `TRADE_POST_CATEGORY_IN_USE`.
- Ẩn/hiện category phản ánh đúng trên public endpoint.

### Trade post

- Create/update nhận category code từ DB, kể cả một code mới do admin tạo.
- Từ chối category không tồn tại, inactive hoặc soft-deleted.
- `GET /trade-posts?category=<code>` lọc đúng bằng quan hệ.
- List/detail response giữ `category` string và trả đúng `categoryInfo` mà không N+1.
- Public API không trả tin thuộc category inactive; owner/admin vẫn xem được dữ liệu cần quản trị.
- Category có `requiresPromotionDetails=true` áp dụng đúng toàn bộ rule khuyến mãi.
- Category thường từ chối promotion fields.
- Đổi category trong update không để trạng thái dữ liệu không hợp lệ.

Giữ và cập nhật toàn bộ test trạng thái tin, quyền BUSINESS, review, media và moderation hiện có; refactor category không được làm regression các luồng này.

## 12. Swagger, bàn giao và kiểm tra

- Cập nhật Swagger cho public/admin category API và toàn bộ DTO tin đăng bị ảnh hưởng.
- Tài liệu hóa rõ rằng `code` là public stable identifier, `id` là internal DB identifier.
- Ghi migration/deploy/seed command cần chạy.
- Chạy tối thiểu:

```bash
npx prisma format
npx prisma validate
npx prisma generate
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

- Nếu full test suite có lỗi tồn tại từ trước, vẫn chạy test tập trung cho module trade/category và báo tách biệt chính xác.
- Liệt kê đầy đủ file tạo/sửa, migration name, API contract cuối cùng và kết quả từng lệnh.
- Không báo hoàn thành nếu chỉ có schema/API mà chưa có migration dữ liệu, validation, test và Swagger.

## 13. Tiêu chí nghiệm thu

Task chỉ được coi là hoàn thành khi:

- Admin có thể thêm một category mới trong DB mà không sửa enum/code backend.
- Public endpoint trả category mới; create trade post dùng code mới thành công.
- Frontend cũ dùng 4 code hiện tại không bị gãy contract.
- Bốn category hiện tại và tất cả tin cũ được migration nguyên vẹn.
- Category inactive không xuất hiện hoặc rò rỉ tin trên public API.
- Quy tắc khuyến mãi hoạt động bằng metadata category trong DB.
- Build, Prisma validation/generate và test module liên quan đều đạt.
