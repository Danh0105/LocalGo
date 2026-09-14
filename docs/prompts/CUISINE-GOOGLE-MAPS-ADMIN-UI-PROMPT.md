# Prompt Admin UI nhập link Google Maps cho địa điểm Ẩm thực

Bạn là Senior Frontend Engineer phụ trách LocalGo Admin tại `F:\LocalGo-Admin`. Hãy đơn giản hóa phần **Địa điểm gợi ý** trong CRUD Ẩm thực: Admin chỉ nhập tên, địa chỉ và dán link Google Maps đã sao chép; không nhập `Vĩ độ (lat)` hoặc `Kinh độ (lng)`.

Không xây lại module, không tạo route, API client, form framework, upload component, state-management hoặc bộ UI mới. Tiếp tục dùng React Query, React Hook Form, Zod, Ant Design, permission, optimistic locking, preview drawer và unsaved-changes flow hiện có.

## 1. Source of truth hiện tại

Đọc trực tiếp:

- `src/types/cuisine.ts`.
- `src/api/cuisine.ts`.
- `src/pages/content/cuisine/CuisineFormPage.tsx`.
- `src/pages/content/cuisine/CuisinePreviewDrawer.tsx`.
- `src/pages/content/cuisine/cuisine.schema.ts`.
- `src/pages/content/cuisine/cuisine-errors.ts`.
- `src/pages/content/cuisine/google-maps.ts`.
- `src/pages/content/cuisine/__tests__/*`.

Branch hiện tại có thể đã triển khai form `address`, `lat`, `lng` theo contract cũ. Hãy refactor ngay repeatable section hiện có: bỏ hoàn toàn hai input tọa độ và thay bằng một input `Link Google Maps`. Không tạo màn CRUD địa điểm riêng.

## 2. Contract phải dùng

```ts
export interface CuisineSuggestedPlace {
  id: string;
  name: string;
  address: string;
  googleMapsUrl: string;
}
```

Trong `CuisineAdminItem` và `CuisinePayload` dùng:

```ts
suggestedPlaceDetails: CuisineSuggestedPlace[];
```

Xóa `coordinates`, `lat`, `lng` khỏi type/form/payload/helper/test của phần Cuisine. Backend có thể tạm trả `suggestedPlaces: string[]` cho client cũ; mapper Admin phải:

- ưu tiên `suggestedPlaceDetails`;
- nếu chỉ có string legacy, giữ tên và map `address: ''`, `googleMapsUrl: ''`, ID tạm ổn định;
- nếu gặp object trung gian có `coordinates`, giữ `id/name/address` nhưng map link thành rỗng để Admin dán link thật;
- khi lưu chỉ gửi `suggestedPlaceDetails`, không gửi hai nguồn dữ liệu mâu thuẫn.

## 3. Schema và validation

Form item:

```ts
{
  id: string;
  name: string;
  address: string;
  googleMapsUrl: string;
}
```

Quy tắc:

- Tối đa 20 địa điểm.
- `name`: required sau trim, tối đa 200 ký tự.
- `address`: trim, tối đa 255 ký tự; required khi món bật `isActive` nếu giữ rule hiện tại.
- `googleMapsUrl`: trim, tối đa 2.048 ký tự, required khi món bật `isActive`.
- Dùng `new URL()` hoặc helper tương đương để validate.
- Chỉ chấp nhận HTTPS với hostname/path Google Maps hợp lệ:
  - `www.google.com/maps/...`, `google.com/maps/...`;
  - `maps.google.com/...`;
  - `maps.app.goo.gl/...`;
  - `goo.gl/maps/...`.
- Từ chối HTTP, `javascript:`, domain giả như `google.com.evil.example`, URL có username/password và chuỗi không parse được.
- Không dùng kiểm tra lỏng kiểu `url.includes('google')`.

Mapper form → payload trim chuỗi, giữ nguyên URL hợp lệ, ID và thứ tự. Không follow link rút gọn, không gọi Google API và không cố lấy tọa độ từ URL.

## 4. Giao diện Địa điểm gợi ý

Mỗi card/row chỉ cần:

- `Tên địa điểm`.
- `Địa chỉ`.
- `Link Google Maps` dùng Ant Design `Input`, `type="url"`, placeholder `Dán link đã sao chép từ Google Maps`, `autoComplete="off"`.
- Nút `Mở thử trên Google Maps`.
- Nút Lên/Xuống/Xóa theo flow hiện có.

Loại bỏ hai input `Vĩ độ (lat)` và `Kinh độ (lng)` cùng mọi hướng dẫn nhập tọa độ. Có thể thêm help text ngắn: `Mở Google Maps → Chia sẻ → Sao chép đường liên kết → Dán vào đây`.

Nút mở thử dùng chính URL đã nhập sau trim, `target="_blank"`, `rel="noopener noreferrer"`; disable nếu URL chưa hợp lệ. Không tự thêm protocol, không sửa link và không sinh URL từ tên/địa chỉ.

Nút thêm tạo item rỗng có ID tạm ổn định. Giữ giới hạn 20 item, reorder và responsive desktop/tablet. Icon-only button phải có tooltip/accessible name và mọi nút thao tác dùng `htmlType="button"`.

## 5. Preview và danh sách

Cập nhật `CuisinePreviewDrawer`:

- Hiển thị tên và địa chỉ từng địa điểm.
- URL hợp lệ: hiện `Mở trên Google Maps` hoặc `Chỉ đường bằng Google Maps` và mở đúng link Admin đã dán.
- Thiếu/sai URL: hiện `Chưa có link Google Maps`, không render thẻ `<a>` rỗng hoặc sai domain.
- Preview đọc trực tiếp dữ liệu form, không gọi public API và không lưu khi chỉ xem trước.

Không bắt buộc thêm cột link vào danh sách món. Có thể hiển thị badge `Đủ link` / `Thiếu link` nếu dữ liệu list đã có sẵn, không tạo request N+1.

## 6. Migration, lỗi và optimistic locking

- Record legacy vẫn mở được, giữ nguyên tên/thứ tự.
- Hiển thị cảnh báo nếu còn địa điểm thiếu link; không cho bật `isActive` hoặc submit active cho tới khi mỗi địa điểm có link hợp lệ.
- Dữ liệu chưa active có thể lưu thiếu link nếu Backend cho phép migration.
- API `400/422`: map `suggestedPlaceDetails.1.googleMapsUrl` về đúng row/field.
- API `409 CUISINE_ITEM_VERSION_CONFLICT`: giữ nguyên tên, địa chỉ, link và thứ tự đang nhập; dùng flow tải phiên bản mới nhất hiện có, không reset âm thầm.
- Upload/media hoặc save lỗi không được làm mất form state.
- Cập nhật hoặc thay helper `google-maps.ts` để validate/normalize link; không còn helper tạo URL từ lat/lng.

## 7. Test bắt buộc

- Schema chấp nhận link đầy đủ và link chia sẻ rút gọn từ Google Maps.
- Schema từ chối URL rỗng khi active, HTTP, protocol nguy hiểm, domain giả, credentials, URL lỗi và quá 2.048 ký tự.
- Form không còn input lat/lng và có input `Link Google Maps`.
- Mapper legacy giữ tên/thứ tự, tạo `googleMapsUrl: ''`; mapper object trung gian không làm mất name/address.
- Payload trim và gửi đúng `googleMapsUrl`, ID và thứ tự sau reorder.
- Add/remove/reorder không làm mất link ở row khác.
- Nút mở thử/preview dùng chính URL đã dán, disable khi URL sai và có `noopener noreferrer`.
- `400/422` map đúng field; `409` không làm mất link đang nhập.
- Các test upload, permission, unsaved changes, create/update, preview và validation hiện có vẫn pass sau khi bỏ test tọa độ cũ.

## 8. Tiêu chí nghiệm thu

- Admin chỉ cần sao chép link từ Google Maps và dán vào form, không nhập tọa độ.
- Link đầy đủ và `maps.app.goo.gl` đều lưu/mở được.
- Payload chỉ dùng `suggestedPlaceDetails[].googleMapsUrl`; không còn `coordinates`, `lat`, `lng` trong module Cuisine.
- Preview phản ánh dữ liệu form hiện tại trước khi lưu.
- Record cũ không mất tên/thứ tự; Admin được hướng dẫn bổ sung link thật.
- Không thay đổi route, auth, API client, media, reorder cấp món hoặc optimistic-locking convention.
- Chạy focused tests Cuisine, lint và production build; báo chính xác kết quả, file đã sửa và dependency rollout BE/Mini App.
