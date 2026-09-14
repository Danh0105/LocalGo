# Prompt BE quản lý link Google Maps cho địa điểm Ẩm thực

Bạn là Senior Backend Engineer phụ trách LocalGo Backend tại `F:\LocalGo-BE`. Hãy nâng cấp module **Ẩm thực** hiện có để mỗi địa điểm gợi ý lưu một đường dẫn Google Maps do Admin sao chép và dán. Admin không nhập `lat/lng`; Backend không gọi Geocoding API và không tự phân tích tọa độ từ URL.

Đây là thay đổi trên module hiện hữu, không tạo module/endpoint/versioning/audit/auth mới. Giữ nguyên route, response envelope, permission, media, reorder và optimistic locking đang dùng.

## 1. Source of truth hiện tại

Đọc trực tiếp:

- `prisma/schema.prisma` và `prisma/cuisine-seed-data.ts`.
- `src/modules/cuisine/dto/upsert-cuisine.dto.ts`.
- `src/modules/cuisine/dto/cuisine-response.dto.ts`.
- `src/modules/cuisine/services/cuisine.service.ts`.
- `src/modules/cuisine/controllers/*` và Swagger hiện có.
- `test/cuisine.e2e-spec.ts` cùng test Cuisine liên quan.

Hiện `CuisineItem.suggestedPlaces` là JSON nhưng DTO/service/public response đang dùng `string[]`. Mini App cũng chỉ hiển thị tên địa điểm. Không tạo bảng địa điểm riêng; tiếp tục dùng JSON hiện có nhưng chuyển dữ liệu chuẩn sang object array.

Nếu branch đang có bản triển khai trung gian dùng `coordinates.lat/lng`, hãy thay contract đó bằng `googleMapsUrl`; không duy trì đồng thời URL và tọa độ cho cùng chức năng.

## 2. Contract mới

```ts
export interface CuisineSuggestedPlace {
  id: string;
  name: string;
  address: string;
  googleMapsUrl: string;
}
```

Thêm field vào payload và response:

```ts
suggestedPlaceDetails: CuisineSuggestedPlace[];
```

Ví dụ:

```json
{
  "suggestedPlaceDetails": [
    {
      "id": "cho-thu-dau-mot",
      "name": "Chợ Thủ Dầu Một",
      "address": "Đường Hùng Vương, phường Phú Cường",
      "googleMapsUrl": "https://maps.app.goo.gl/example"
    }
  ]
}
```

Không thêm `lat`, `lng`, `coordinates`, Google API key hoặc field URL thứ hai.

## 3. Validation link Google Maps

`googleMapsUrl` phải được trim và có tối đa 2.048 ký tự. Với dữ liệu mới hoặc khi bật `isActive`, mỗi địa điểm phải có URL hợp lệ.

Chỉ chấp nhận HTTPS và các dạng link Google Maps phổ biến:

- `https://www.google.com/maps/...` hoặc `https://google.com/maps/...`;
- `https://maps.google.com/...`;
- `https://maps.app.goo.gl/...`;
- `https://goo.gl/maps/...` để tương thích link chia sẻ cũ.

Dùng parser URL chuẩn, kiểm tra hostname chính xác theo allowlist; không dùng `includes("google")`. Từ chối:

- `http`, `javascript:`, `data:` hoặc protocol khác HTTPS;
- domain giả như `google.com.evil.example`;
- URL có username/password;
- URL rỗng, không parse được hoặc vượt quá giới hạn.

Backend chỉ lưu URL đã trim và trả lại nguyên link. Không follow/resolve link rút gọn, không gọi Google và không kiểm tra URL bằng request mạng trong create/update.

## 4. DTO, lưu trữ và response

- Tạo nested DTO cho `CuisineSuggestedPlace` và giới hạn tối đa 20 địa điểm.
- `id`: required, trim, tối đa 100 ký tự và duy nhất trong cùng một món.
- `name`: required, trim, tối đa 200 ký tự.
- `address`: trim, tối đa 255 ký tự; required khi `isActive` nếu rule này đã được áp dụng ở Admin.
- `googleMapsUrl`: validation như mục 3.
- Giữ đúng thứ tự mảng khi create/update/read.
- Lưu object array vào chính JSON `CuisineItem.suggestedPlaces`; không cần migration schema chỉ vì đổi cấu trúc JSON.
- Public detail và Admin detail/create/update response trả `suggestedPlaceDetails`.
- `suggestedPlaces: string[]` legacy, nếu còn cần trong rollout, phải derive từ `suggestedPlaceDetails[].name`, không là nguồn dữ liệu thứ hai.
- Không làm thay đổi response envelope, pagination, `version`, audit hoặc error-code convention.

## 5. Tương thích dữ liệu cũ

Parser phải đọc được cả:

```json
["Chợ Thủ Dầu Một", "Quán B"]
```

và object array mới. Với chuỗi legacy, giữ nguyên tên/thứ tự, tạo ID ổn định và map tạm thành:

```ts
{ id, name, address: '', googleMapsUrl: '' }
```

Không tự tạo link tìm kiếm Google Maps từ tên và không điền link giả. Record legacy vẫn đọc được trong phase migration; Admin sẽ bổ sung link thật. Không cho lưu/bật active bằng Admin mới nếu một địa điểm còn thiếu link hợp lệ. Nếu cần giữ client cũ trong thời gian rollout, tiếp tục nhận `suggestedPlaces: string[]` có thời hạn và ghi rõ kế hoạch loại bỏ.

Nếu branch đã lưu object có `coordinates`, migration phải giữ `id`, `name`, `address`, bỏ tọa độ sau khi Admin đã bổ sung `googleMapsUrl`; tuyệt đối không suy đoán URL từ tọa độ nếu nghiệp vụ đã chọn cách dán link.

## 6. Lỗi và optimistic locking

- `400/422`: trả field path nested rõ, ví dụ `suggestedPlaceDetails.1.googleMapsUrl`.
- `409 CUISINE_ITEM_VERSION_CONFLICT`: giữ flow hiện tại và trả bản mới nhất; không ghi đè dữ liệu của Admin khác.
- `401/403/404`: giữ nguyên convention hiện có.
- Không log hoặc fetch nội dung URL do Admin nhập.

## 7. Seed, docs và rollout

- Cập nhật seed sang object array chỉ khi có link Google Maps thật đã xác nhận; không dùng link ví dụ trong dữ liệu chạy thật.
- Cập nhật Swagger và `docs/cuisine-api.md` với field mới, allowlist URL và field legacy deprecated.
- Thứ tự rollout:
  1. Deploy BE đọc được string legacy và object mới.
  2. Deploy Admin nhập/dán `googleMapsUrl`.
  3. Admin bổ sung link thật cho dữ liệu cũ.
  4. Deploy Mini App hiển thị tên/địa chỉ và mở trực tiếp `googleMapsUrl`.
  5. Chỉ bỏ contract legacy khi client cũ không còn sử dụng.

## 8. Test và tiêu chí nghiệm thu

Test bắt buộc:

- Chấp nhận link đầy đủ `google.com/maps`, `maps.google.com`, link rút gọn `maps.app.goo.gl` và `goo.gl/maps`.
- Từ chối HTTP, protocol nguy hiểm, domain giả, URL có credentials, URL hỏng và dài quá 2.048 ký tự.
- Create/update/read giữ đúng `id`, `name`, `address`, `googleMapsUrl` và thứ tự.
- Parser đọc đúng string array cũ; legacy không bị mất tên/thứ tự.
- Không cho active khi địa điểm thiếu link hợp lệ theo rule migration đã chọn.
- `409` và các test CRUD, visibility, reorder, media, auth hiện có vẫn pass.

Nghiệm thu:

- Backend lưu và trả đúng link Google Maps do Admin cung cấp, không yêu cầu tọa độ.
- Mini App có thể mở trực tiếp link bằng trình duyệt/Zalo webview.
- Không có open redirect sang domain ngoài allowlist.
- Chạy Prisma validation/generate, focused tests, lint và build; báo chính xác kết quả, file đã sửa và dependency rollout.
