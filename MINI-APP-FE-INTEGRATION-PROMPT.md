# Prompt hoàn thiện tích hợp API thật cho Mini App LocalGo (Frontend)

Bạn là Senior Frontend Engineer phụ trách Zalo Mini App LocalGo (`f:\LocalGo`). Backend (`f:\LocalGo-BE`) đã có đầy đủ REST API thật cho 13 chức năng danh sách/chi tiết + 1 luồng ticket. Ở bước trước, lớp `src/services/*.ts` tương ứng của từng chức năng **đã được đổi sang gọi API thật** (giữ nguyên chữ ký hàm cũ), nhưng các trang `src/pages/*.tsx` **chưa được rà soát lại** cho phù hợp với hành vi của lệnh gọi mạng thật (có thể lỗi, có thể chậm, có thể rỗng, có thể bị rate-limit...). Nhiệm vụ của bạn là rà soát và hoàn thiện phần UI/UX cho đúng với thực tế này — **không cần** viết lại kiến trúc service, **không cần** đổi API contract, chỉ hoàn thiện tầng hiển thị.

Không tự bịa layout/component mới nếu trang đã có pattern chuẩn — trang `src/pages/temples.tsx` + `src/pages/temple-detail.tsx` hiện là cặp trang làm đúng chuẩn nhất (dùng `async/await` + `try/catch` + `AbortController`, phân biệt lỗi "không tìm thấy" với lỗi "gọi API thất bại", có nút "Thử lại"). Hãy nhân rộng đúng pattern này cho các trang còn thiếu, thay vì phát minh cách làm khác.

## 1. Vá lỗ hổng nghiêm trọng: `feedback.tsx` nuốt lỗi khi gửi phản hồi

`src/pages/feedback.tsx` (hàm `handleSubmit`) hiện gọi:

```ts
submitFeedback({...}).then((result) => {
  setSubmitMessage(`Đã ghi nhận phản hồi mẫu: ${result.ticketCode}`);
  event.currentTarget.reset();
});
```

`submitFeedback` (trong `src/services/feedback.ts`) giờ `throw` thật khi API trả lỗi (400 do `phone`/`content` sai định dạng, 429 do vượt rate limit 5 request/phút, 500, mất mạng...). Vì không có `.catch()`, đây là **unhandled promise rejection** — người dùng bấm "Gửi phản hồi" khi lỗi xảy ra sẽ thấy **không có gì xảy ra**, không có thông báo lỗi nào.

Việc cần làm:
- Thêm state lỗi riêng cho form gửi phản hồi (tách khỏi `error` của phần danh sách kênh), và bắt lỗi ở `handleSubmit`.
- Phân biệt tối thiểu 2 loại thông báo cho người dùng:
  - Lỗi do vượt rate limit (429): thông báo kiểu "Bạn gửi phản hồi quá nhanh, vui lòng thử lại sau ít phút."
  - Lỗi khác (400 validate sai, 500, mất mạng): thông báo chung "Không thể gửi phản hồi, vui lòng kiểm tra lại thông tin hoặc thử lại sau."
- `submitFeedback` hiện chỉ `throw new Error(message)` chung, không phân biệt status code. Nếu cần phân biệt 429 ở UI, cân nhắc bổ sung thông tin status vào lỗi ném ra từ `src/services/feedback.ts` (ví dụ gắn thêm `status` vào object `Error`) — đây là thay đổi tối thiểu ở service, không đổi chữ ký hàm `submitFeedback`.
- Thêm validate phía client trước khi gọi API để giảm round-trip lỗi 400 không cần thiết:
  - `phone`: chỉ chữ số, khoảng trắng, tối đa một dấu `+` ở đầu (khớp đúng regex `^\+?[0-9\s]+$` mà backend đang dùng).
  - `content`: tối thiểu 5 ký tự sau khi trim (khớp giới hạn backend).
  - Validate nhẹ, không chặn hoàn toàn nếu regex sai lệch — chỉ là UX phụ trợ, backend vẫn là nguồn xác thực cuối cùng.

## 2. Đưa 12 trang chi tiết còn lại lên chuẩn `temple-detail.tsx`

Các trang sau đang gọi `getXxxById(id).then((data) => {...})` **không có `.catch()`**, nhưng service tương ứng (ví dụ `src/services/agriculture.ts`) đã tự nuốt mọi lỗi (404, 500, mất mạng, abort) thành `return undefined` — nghĩa là một lỗi 500/mất mạng thật sự bị hiển thị giống hệt "không tìm thấy dữ liệu", không có cách nào để người dùng phân biệt hay thử lại:

- `agriculture-detail.tsx`
- `contact-detail.tsx`
- `cuisine-detail.tsx`
- `craft-village-detail.tsx`
- `experience-tour-detail.tsx`
- `feedback-detail.tsx`
- `festival-detail.tsx`
- `historical-site-detail.tsx`
- `map-place-detail.tsx`
- `news-detail.tsx`
- `ocop-detail.tsx`
- `specialty-detail.tsx`

Việc cần làm cho **mỗi trang** trong danh sách trên (đối chiếu trực tiếp với `temple-detail.tsx` để copy đúng pattern):

1. Đổi service tương ứng (`getXxxById`) để **không nuốt lỗi mạng/server thành `undefined`** nữa — chỉ trả `undefined` khi thực sự là 404 (không tìm thấy/đang ẩn), còn lỗi khác (mất mạng, 500, abort) phải `throw` để trang phân biệt được. Đây là thay đổi tối thiểu, không đổi chữ ký `getXxxById(id): Promise<T | undefined>`.
2. Trong trang, đổi `useEffect` sang `async/await` + `try/catch` + `AbortController` giống `temple-detail.tsx`, với 2 nhánh lỗi:
   - Không tìm thấy (`undefined` trả về bình thường) → hiển thị màn "Không tìm thấy [tên nội dung]" như hiện tại.
   - Lỗi khi gọi API (network/server) → hiển thị màn lỗi riêng kèm nút "Thử lại" (gọi lại đúng request).
3. Nhớ cleanup `AbortController` khi unmount/đổi `id`, đúng như `temple-detail.tsx` đang làm.

## 3. Tin tức: thêm UI phân trang (backend đã hỗ trợ, frontend chưa dùng)

Backend `/api/v1/news` giờ trả kết quả phân trang thật (`{ data, meta: { page, limit, total, totalPages } }`), nhưng:

- `src/services/news.ts` hiện gọi cứng `limit=100` trong một lần fetch duy nhất, bỏ qua `meta`.
- `src/pages/news.tsx` không có bất kỳ UI phân trang/tải thêm nào.

Nếu số bài tin vượt quá 100, người dùng sẽ không bao giờ thấy các bài cũ hơn.

Việc cần làm:
- Đổi `getNewsArticles(query)` trong `src/services/news.ts` để hỗ trợ tải thêm theo trang (giữ nguyên chữ ký hàm `getNewsArticles(query: NewsQuery): Promise<NewsArticle[]>` cho tương thích ngược, nhưng bổ sung cơ chế nội bộ để `news.tsx` có thể yêu cầu trang tiếp theo — ví dụ thêm một hàm mới `getNewsArticlesPage(query, page)` riêng mà `news.tsx` dùng trực tiếp thay vì `getNewsArticles`, không bắt buộc phải giữ đúng hàm cũ nếu đổi cách gọi trong trang).
- Thêm nút "Xem thêm tin tức" (khớp phong cách UI hiện có của trang, không cần infinite scroll phức tạp) ở cuối `news-list`, ẩn đi khi đã tải hết (`page >= meta.totalPages`).
- Reset về trang 1 khi đổi filter danh mục.

## 4. Cấu hình `VITE_API_BASE_URL` cho môi trường thật

Hiện tại **chưa có cách nào** để trỏ Mini App vào một backend đã triển khai thật:
- `f:\LocalGo\.env` phải có `VITE_API_BASE_URL=https://api.localgo.skilltripx.com.vn/api/v1`.
- Không tồn tại `.env.example` trong `f:\LocalGo`.
- Mọi service phải fallback về `https://api.localgo.skilltripx.com.vn/api/v1` nếu biến này không được set; production không được gọi API localhost.

Việc cần làm:
- `f:\LocalGo\.env.example` phải liệt kê `VITE_API_BASE_URL=https://api.localgo.skilltripx.com.vn/api/v1` kèm comment giải thích.
- Xác nhận `VITE_API_BASE_URL` được đọc đúng qua `import.meta.env` trong cấu hình build của Zalo Mini App (kiểm tra `zmp-cli`/`vite.config` nếu có ràng buộc riêng về prefix biến môi trường được phép expose ra client).
- Ghi chú trong README hoặc tài liệu bàn giao: khi deploy, phải set `VITE_API_BASE_URL` trỏ đúng domain backend thật, nếu không toàn bộ 13 chức năng sẽ fail âm thầm.

## 5. `about.tsx` chưa từng được nối vào API thật — xác nhận lại phạm vi

`src/pages/about.tsx` hiện **vẫn là dữ liệu tĩnh 100%** (hero, số liệu, timeline hard-code trong JSX), không có `src/services/about.ts`, không gọi API nào — khác với 13 chức năng còn lại đã có service gọi API thật. Nếu backend đã có API `/api/v1/about` (theo `ABOUT-BE-SERVICE-PROMPT.md`), đây là phần còn sót lại chưa migrate.

Việc cần làm:
- Kiểm tra backend `f:\LocalGo-BE\src\modules\about` xem endpoint public đã sẵn sàng chưa.
- Nếu đã sẵn sàng: tạo `src/services/about.ts` gọi API thật theo đúng convention của 13 service còn lại (cùng `API_BASE_URL`, cùng cách unwrap envelope `{success, data}`), rồi sửa `about.tsx` dùng service này thay vì JSX tĩnh — có thể cần đổi cấu trúc trang nhiều hơn các trang khác vì đây là "trang đơn" (singleton content), không phải danh sách.
- Nếu ngoài phạm vi đợt này, ghi rõ trong báo cáo bàn giao là "cố ý bỏ qua, cần prompt riêng" để không bị hiểu nhầm là đã hoàn thành.

## 6. Rà soát toàn bộ nhãn danh mục (category labels) còn lại

Đã spot-check 4/13 module (OCOP, Làng nghề, Di tích lịch sử, Lễ hội) và khớp chính xác giữa chuỗi hiển thị filter chip trên FE với enum label backend. 9 module còn lại **chưa được đối chiếu từng chuỗi**: Ẩm thực, Nông nghiệp, Liên hệ, Tour trải nghiệm, Bản đồ, Đặc sản, Đền - Chùa - Miếu, Phản hồi, Tin tức.

Việc cần làm: đối chiếu từng union type category trong `src/data/<module>.ts` với file `*.constants.ts` tương ứng trong `f:\LocalGo-BE\src\modules\<module>\`, xác nhận chuỗi tiếng Việt có dấu khớp tuyệt đối (kể cả khoảng trắng, chữ hoa/thường) — sai lệch dù nhỏ sẽ khiến query `?category=...` luôn trả rỗng.

## 7. (Không bắt buộc, cân nhắc nếu còn thời gian) Cache/ETag cho trang chi tiết

Toàn bộ API chi tiết (festivals, experience-tours, map-places, contacts, news...) đã trả `ETag`/`Cache-Control` từ backend, nhưng chưa service nào ở frontend gửi `If-None-Match` hay tận dụng cache trình duyệt. Đây là tối ưu hiệu năng, không phải lỗi — chỉ làm nếu các mục 1-6 đã xong và còn dư thời gian. Nếu làm, áp dụng thống nhất cho cả 13 hàm `getXxxById`, không làm lẻ tẻ vài module.

## 8. Kiểm thử và bàn giao

- Chạy Mini App ở chế độ dev với backend thật đang chạy (`f:\LocalGo-BE`, `npm run start:dev`), test thủ công tối thiểu:
  - Tắt backend giữa chừng → xác nhận trang chi tiết hiển thị đúng màn lỗi "Thử lại" thay vì màn "không tìm thấy" (mục 2).
  - Gửi phản hồi liên tục >5 lần trong 1 phút → xác nhận thấy thông báo rate-limit thay vì im lặng (mục 1).
  - Gửi phản hồi với số điện thoại sai định dạng → xác nhận có phản hồi lỗi rõ ràng (mục 1).
  - Build với `VITE_API_BASE_URL=https://api.localgo.skilltripx.com.vn/api/v1` → xác nhận app gọi đúng host mới (mục 4).
- Liệt kê chính xác file đã tạo/sửa cho từng mục (1-7).
- Không cần sửa lại BE, không đổi API contract — nếu phát hiện cần đổi hành vi service (ví dụ mục 2, 3) thì chỉ sửa tối thiểu trong `src/services/*.ts`, giữ nguyên các hàm public mà `pages/*.tsx` khác đang phụ thuộc.
