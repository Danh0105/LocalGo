# Prompt BE bổ sung số điện thoại liên hệ cho OCOP và Tour trải nghiệm

Bạn là Senior Backend Engineer phụ trách backend LocalGo tại `F:\LocalGo-BE`. Hãy **nâng cấp hai module đã tồn tại** là OCOP và Experience Tours để mỗi sản phẩm/tour có một số điện thoại liên hệ có thể chỉnh sửa từ Admin và trả về cho Mini App.

Không xây lại module, không đổi route, response envelope, auth, media, optimistic locking hoặc convention hiện có. Trước khi sửa, đọc trực tiếp code hiện tại và tái sử dụng đúng pattern của module Contacts cho trường số điện thoại.

## 1. Source of truth hiện tại

Các module đã chạy đầy đủ CRUD:

- Prisma: `prisma/schema.prisma`, models `OcopProduct` và `ExperienceTour`.
- OCOP:
  - `src/modules/ocop/dto/upsert-ocop.dto.ts`
  - `src/modules/ocop/dto/ocop-response.dto.ts`
  - `src/modules/ocop/services/ocop.service.ts`
  - `prisma/ocop-seed-data.ts`
  - `test/ocop.e2e-spec.ts`
  - `docs/ocop-api.md`
- Tour:
  - `src/modules/experience-tours/dto/upsert-experience-tour.dto.ts`
  - `src/modules/experience-tours/dto/experience-tour-response.dto.ts`
  - `src/modules/experience-tours/services/experience-tour.service.ts`
  - `prisma/experience-tour-seed-data.ts`
  - `test/experience-tours.e2e-spec.ts`
  - `docs/experience-tours-api.md`
- Tham khảo quy tắc số điện thoại hiện có trong module `src/modules/contacts/**`; không tạo validator hoặc format response song song nếu module Contacts đã có convention dùng lại được.

Mini App đã chuẩn bị nhận field thống nhất:

```ts
contactPhone?: string;
```

Các trang `src/pages/ocop-detail.tsx` và `src/pages/experience-tour-detail.tsx` chỉ hiện nút gọi khi field có giá trị, nhằm tương thích trong giai đoạn migration.

## 2. Contract bắt buộc

Dùng đúng một tên field cho cả hai module:

```ts
contactPhone: string;
```

Ý nghĩa: số điện thoại mà người dùng gọi để hỏi sản phẩm, đặt mua sản phẩm OCOP hoặc liên hệ/đặt tour. Không dùng `contactNote` hay `note` để nhét số điện thoại; hai field ghi chú hiện tại vẫn giữ nguyên.

Ví dụ response chi tiết OCOP:

```json
{
  "id": "mat-ong-rung-truong-mit",
  "name": "Mật ong rừng Truông Mít",
  "contactPhone": "0900 123 456",
  "contactNote": "Liên hệ trước khi đặt số lượng lớn."
}
```

Ví dụ response chi tiết Tour:

```json
{
  "id": "mot-ngay-lam-nong-dan",
  "name": "Một ngày làm nông dân Truông Mít",
  "contactPhone": "0900 123 456",
  "note": "Nên đặt trước ít nhất một ngày."
}
```

Các số trên chỉ minh họa format, **không được dùng làm dữ liệu seed thật**.

## 3. Việc cần triển khai

### 3.1 Prisma và migration

- Thêm `contactPhone` vào `OcopProduct` và `ExperienceTour`, giới hạn tương đương `VarChar(30)` theo convention hiện tại.
- Tạo migration mới, không sửa migration cũ đã chạy.
- Không bịa số điện thoại để backfill.
- Thực hiện rollout an toàn theo một trong hai cách:
  1. Nếu đã có danh sách số điện thoại thật được nghiệp vụ xác nhận: add column, backfill đầy đủ, rồi đặt `NOT NULL` trong migration phù hợp.
  2. Nếu chưa có dữ liệu thật: add column nullable ở phase 1, cho Admin nhập dữ liệu, chặn tạo mới/cập nhật/activate bản ghi nếu thiếu số, sau khi toàn bộ bản ghi active đã được điền thì tạo phase 2 đặt `NOT NULL`.
- Không được để trạng thái cuối cùng có sản phẩm/tour active nhưng không có số liên hệ.

### 3.2 DTO và validation

- Bổ sung `contactPhone` vào `OcopContentDto` và `ExperienceTourContentDto`.
- Trim ở server, required sau khi trim, tối đa 30 ký tự.
- Chấp nhận format số thực tế như `0900 123 456`, `+84 900 123 456`, dấu `-`, `.`, `(`, `)` nếu module Contacts đang cho phép; từ chối chữ cái và chuỗi chỉ có ký tự phân cách.
- Không tự chuẩn hóa làm mất số `0` đầu. Lưu chuỗi hiển thị do Admin nhập; Mini App sẽ tự loại ký tự phân cách khi tạo `tel:` URI.
- Swagger phải mô tả rõ field và có ví dụ hợp lệ.

### 3.3 Service và response

- Khi create/update OCOP hoặc Tour, map `dto.contactPhone` vào Prisma data trong cùng transaction hiện có.
- Bổ sung field vào public detail DTO và admin DTO của cả hai module.
- Admin list/detail/create/update response phải trả `contactPhone` để form edit được prefill đúng.
- Public detail:
  - `GET /api/v1/ocop/:id`
  - `GET /api/v1/experience-tours/:id`
  phải trả `contactPhone`.
- Public list có thể trả field này nếu convention dùng chung DTO; không bắt buộc Mini App hiển thị số ở card danh sách.
- Giữ nguyên optimistic locking: update số điện thoại phải kiểm tra `version`, tăng version và trả conflict `409` theo code hiện có.
- Không đổi ý nghĩa `contactNote`, `note`, `producer`, `meetingPoint` hoặc các field đang có.

### 3.4 Seed và tài liệu

- Mở rộng `prisma/ocop-seed-data.ts` và `prisma/experience-tour-seed-data.ts` khi đã có số thật được xác nhận.
- Nếu chưa có số thật, ghi rõ dữ liệu cần bổ sung trong checklist rollout thay vì seed số giả.
- Cập nhật `docs/ocop-api.md`, `docs/experience-tours-api.md` và OpenAPI/Swagger cho request/response mới.
- Nếu repo có `.env.example` hay script import dữ liệu nghiệp vụ thì chỉ cập nhật khi thực sự cần, không đưa số điện thoại nội dung vào biến môi trường.

## 4. Test bắt buộc

Bổ sung unit/e2e test cho cả hai module:

- Public detail trả đúng `contactPhone` của OCOP và Tour.
- Admin detail trả field để form chỉnh sửa có thể prefill.
- Create/update lưu và trả đúng số điện thoại sau khi trim.
- Thiếu hoặc chỉ nhập khoảng trắng bị từ chối.
- Chuỗi dài hơn 30 ký tự hoặc chứa chữ cái bị từ chối.
- Update chỉ riêng số điện thoại vẫn tăng `version`.
- Request với `version` cũ trả đúng `409 OCOP_PRODUCT_VERSION_CONFLICT` hoặc `409 EXPERIENCE_TOUR_VERSION_CONFLICT` và không ghi đè số mới hơn.
- Không làm hỏng filter, reorder, status, media và public visibility hiện có.
- Nếu dùng migration hai phase, test/chốt guard không cho activate bản ghi thiếu số điện thoại.

## 5. Tiêu chí nghiệm thu

- Hai API detail public trả số điện thoại thật đã được Admin quản lý.
- Admin create/edit response nhận và trả đúng `contactPhone`.
- Không còn bản ghi active thiếu số điện thoại khi hoàn tất rollout.
- Không có số giả được đưa vào seed hoặc migration.
- Migration chạy được trên database đã có dữ liệu và có hướng rollback/roll-forward rõ ràng.
- Swagger, docs và test được cập nhật.
- Chạy migration check/generate, lint, test và build của backend; báo chính xác lệnh và kết quả.
- Bàn giao danh sách file đã sửa và lưu ý vận hành cần thực hiện trước khi đặt column `NOT NULL`.

