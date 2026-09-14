# Prompt Admin UI chỉnh sửa số điện thoại liên hệ cho OCOP và Tour trải nghiệm

Bạn là Senior Frontend Engineer phụ trách LocalGo Admin tại `F:\LocalGo-Admin`. Hãy **nâng cấp hai màn CRUD hiện có** là OCOP và Tour trải nghiệm để Admin nhập/chỉnh sửa số điện thoại liên hệ mà Mini App sẽ dùng cho thao tác gọi nhanh.

Không tạo route, form framework, API client, component upload, state-management hay bộ UI mới. Phải tiếp tục dùng React Query, React Hook Form, Zod, Ant Design, auth/permission, optimistic locking, preview drawer và unsaved-changes flow đang có trong chính hai module.

## 1. Source of truth hiện tại

### OCOP

- `src/types/ocop.ts`
- `src/api/ocop.ts`
- `src/pages/content/ocop/OcopFormPage.tsx`
- `src/pages/content/ocop/OcopPreviewDrawer.tsx`
- `src/pages/content/ocop/ocop.schema.ts`
- `src/pages/content/ocop/__tests__/*`

### Tour trải nghiệm

- `src/types/experience-tour.ts`
- `src/api/experience-tours.ts`
- `src/pages/content/experience-tours/ExperienceTourFormPage.tsx`
- `src/pages/content/experience-tours/ExperienceTourPreviewDrawer.tsx`
- `src/pages/content/experience-tours/experience-tour.schema.ts`
- `src/pages/content/experience-tours/__tests__/*`

Tham khảo cách module Contacts hiện quản lý `phone` trong `src/types/contact.ts`, `src/pages/content/contacts/contact.schema.ts` và form Contacts; tái sử dụng cùng giới hạn/UX nếu phù hợp.

## 2. Contract phải dùng

Backend bổ sung cùng một field cho OCOP và Tour:

```ts
contactPhone: string;
```

- `contactPhone` là số gọi để hỏi/đặt sản phẩm hoặc liên hệ/đặt tour.
- Không map field này vào `contactNote` của OCOP hoặc `note` của Tour.
- Trong giai đoạn migration, response cũ có thể chưa có field; mapper form phải chịu được `undefined/null` bằng cách dùng chuỗi rỗng, nhưng form phải yêu cầu nhập trước khi lưu.

## 3. Cập nhật type và payload

Trong `src/types/ocop.ts`:

- Thêm `contactPhone: string` vào `OcopAdminProduct`.
- Thêm `contactPhone: string` vào `OcopPayload`.

Trong `src/types/experience-tour.ts`:

- Thêm `contactPhone: string` vào `ExperienceTourAdminItem`.
- Thêm `contactPhone: string` vào `ExperienceTourPayload`.

Giữ nguyên API paths và API client; `create`/`update` tự gửi field qua payload hiện có. Không tạo endpoint riêng chỉ để sửa số điện thoại.

## 4. Cập nhật schema và mapping form

Trong cả `ocop.schema.ts` và `experience-tour.schema.ts`:

- Thêm `contactPhone` vào Zod schema:
  - trim;
  - required, không chấp nhận chuỗi rỗng;
  - tối đa 30 ký tự;
  - cho phép số có `+`, khoảng trắng, `.`, `-`, `(`, `)`; không cho chữ cái hoặc chuỗi không có chữ số.
- Thêm `contactPhone: ''` vào empty form.
- Mapper API → form dùng `item.contactPhone ?? ''` để tương thích dữ liệu cũ.
- Mapper form → payload gửi `contactPhone.trim()`.
- Không làm mất dirty state, dữ liệu nhập hoặc số điện thoại khi server trả `409`.

## 5. Cập nhật giao diện chỉnh sửa

Trong card **Thông tin cơ bản** của cả hai form:

- Thêm field label `Số điện thoại liên hệ`.
- Dùng Ant Design `Input`, `maxLength={30}`, `inputMode="tel"`, `autoComplete="tel"`, có `showCount` nếu phù hợp pattern form.
- Hiển thị required marker và lỗi Zod sát field.
- Placeholder ví dụ chỉ minh họa format như `0900 123 456`; không tự điền số giả.
- Tôn trọng `disabled`/read-only permission hiện có.
- Bố cục responsive: không làm vỡ grid ở tablet; có thể đặt cạnh `Nhà sản xuất`/`Khoảng giá` của OCOP và cạnh `Điểm hẹn`/`Khoảng giá` của Tour.

Không gộp field này với textarea ghi chú. Admin phải nhìn thấy và chỉnh sửa nó như một field độc lập.

## 6. Preview và danh sách

- `OcopPreviewDrawer`: hiển thị `Số điện thoại liên hệ` gần nhà sản xuất/địa chỉ/khoảng giá; dùng link `tel:` hoặc biểu tượng điện thoại nếu preview hiện có hỗ trợ, đồng thời vẫn hiện text số đầy đủ.
- `ExperienceTourPreviewDrawer`: hiển thị số gần điểm hẹn/thời lượng/khoảng giá.
- Nếu giá trị đang rỗng ở dữ liệu legacy, preview hiển thị trạng thái rõ `Chưa có số liên hệ`, không hiển thị link `tel:` rỗng.
- Có thể thêm cột số điện thoại ở trang danh sách nếu bảng còn đủ chỗ; đây không phải điều kiện bắt buộc. Form edit và preview là bắt buộc.

## 7. Xử lý lỗi và migration UX

- API `400/422`: giữ nguyên dữ liệu form và đặt lỗi đúng field khi response có field path `contactPhone`.
- API `409`: giữ số đang nhập, khóa lưu và dùng flow `Tải phiên bản mới nhất` hiện có; không reset form âm thầm.
- API `401/403`: giữ cách xử lý permission hiện tại.
- Khi load record cũ chưa có số, form vẫn mở được nhưng nút lưu phải bị validation chặn cho tới khi nhập số hợp lệ.
- Không tự động copy số từ module Contacts vì một sản phẩm/tour có thể dùng đầu mối khác.

## 8. Test bắt buộc

Cập nhật test OCOP và Tour tương ứng:

- Schema chấp nhận `0900 123 456` và `+84 900 123 456`.
- Schema từ chối rỗng, chỉ khoảng trắng, không có chữ số, chứa chữ cái và dài hơn 30 ký tự.
- Empty form có `contactPhone: ''`.
- API → form prefill đúng số; dữ liệu legacy `null/undefined` map thành chuỗi rỗng.
- Form → payload trim và gửi đúng `contactPhone` khi create/update.
- Form hiển thị field, required error và tôn trọng read-only permission.
- Preview hiển thị đúng số, không tạo `tel:` rỗng.
- Khi `409`, giá trị số đang nhập không bị mất.
- Các test reorder, status, upload, dynamic arrays và unsaved changes hiện có vẫn pass.

## 9. Tiêu chí nghiệm thu

- Admin có thể tạo/sửa số điện thoại độc lập cho từng sản phẩm OCOP và từng Tour.
- Reload trang edit vẫn prefill đúng số từ backend.
- Payload create/update luôn có `contactPhone` hợp lệ.
- Preview phản ánh dữ liệu form hiện tại trước khi lưu.
- Không làm thay đổi route, response envelope, permission hoặc optimistic-locking convention.
- Chạy focused tests của hai module, lint và production build; báo chính xác kết quả.
- Liệt kê file đã sửa và mọi dependency với rollout migration của backend.

