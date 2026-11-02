# Hợp đồng response chung BE ↔ web ↔ mobile

Trạng thái: **đã chốt** ngày 2026-11-03 (người dùng chọn cả 4 quyết định ở mục 7). Áp dụng cho cả ba repo. Hiện trạng trước khi đổi ghi ở [response-contract-baseline.md](response-contract-baseline.md) và được khóa bằng snapshot `test/contracts/`. Mọi thay đổi theo tài liệu này là **thay đổi hợp đồng có chủ đích**: commit nào đổi response thì cập nhật snapshot và ghi before/after trong cùng commit.

## 1. Response thành công

```json
{
  "statusCode": 200,
  "message": "Lấy danh sách cấp độ thành công",
  "data": { "...": "..." }
}
```

- `statusCode` **luôn bằng HTTP status** của response (200, 201, …). Giá trị do tầng HTTP đặt, service không tự đặt.
- `message` luôn có, là chuỗi đã dịch theo ngôn ngữ của request (mục 4).
- `data` là payload của thao tác; có thể là object, mảng hoặc `null`. Thao tác chỉ trả thông báo thì `data` là `null` hoặc bỏ trống.
- Giữ nguyên shape hiện tại; hai kiểu code A/B đã thống nhất ở điểm này (baseline).

### Danh sách có phân trang

```json
{
  "statusCode": 200,
  "message": "…",
  "data": {
    "results": [],
    "pagination": { "current": 1, "pageSize": 10, "totalItem": 0, "totalPage": 0 }
  }
}
```

- Tham số query chuẩn: `currentPage`, `pageSize` (68/81 module đang dùng). 8 module hiện nhận thêm `page`/`limit` → tiếp tục nhận qua adapter để không vỡ web (26 file web đang gửi `page`/`limit`), không mở rộng `page`/`limit` sang module mới.
- Giá trị mặc định và cách tính `totalPage` giữ theo từng route như hiện tại (snapshot là chuẩn đối chiếu).

## 2. Response lỗi

```json
{
  "statusCode": 422,
  "error": "UNPROCESSABLE_ENTITY",
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    { "field": "levelNumber", "message": "Bắt buộc nhập" },
    { "field": "requiredExp", "message": "Phải là số" }
  ]
}
```

| Field | Quy tắc |
| --- | --- |
| `statusCode` | Bằng HTTP status |
| `error` | Tên `HttpStatus` dạng chữ hoa (`NOT_FOUND`, `UNAUTHORIZED`, …) — giữ như hiện tại |
| `message` | **Luôn là chuỗi**, đã dịch. Với 422 là câu tóm tắt |
| `errors` | Chỉ có ở 422. Mỗi phần tử `{ field, message }`; `field` là đường dẫn Zod nối bằng dấu chấm (`items.0.name`), `message` đã dịch và nói rõ lỗi của field đó |
| `data` | Chỉ có khi exception chủ động công khai dữ liệu (cơ chế `dataRes` hiện có). Không thêm mặc định |

- **Mọi** lỗi đi qua cùng một filter, kể cả lỗi không phải `HttpException`: lỗi ngoài dự kiến trả 500 với `error: "INTERNAL_SERVER_ERROR"` và message chung đã dịch, không lộ chi tiết nội bộ; chi tiết chỉ ghi log phía server.
- Không có "lỗi mềm": không trả HTTP 2xx kèm `statusCode` lỗi trong body. Lỗi nghiệp vụ phải throw exception có HTTP status đúng.
- Không thêm field `code` nghiệp vụ trong đợt này (client hiện dựa vào HTTP status); xem lại nếu có nhu cầu thật.

## 3. Ý nghĩa status

| Status | Khi nào |
| --- | --- |
| 400 | Request sai về nghiệp vụ (không phải lỗi định dạng field) |
| 401 | Thiếu token, token sai/hết hạn, **sai email hoặc mật khẩu** |
| 403 | Đã xác thực nhưng không có quyền / không đủ điều kiện |
| 404 | Tài nguyên không tồn tại, route không tồn tại |
| 409 | Trùng dữ liệu (unique) |
| 422 | Lỗi validation đầu vào (kèm `errors`) |
| 500 | Lỗi ngoài dự kiến |

Mapping lỗi Prisma (P2002/P2003/P2025) vẫn theo ngữ cảnh nghiệp vụ trong service như plan đã chốt; filter chỉ đảm bảo shape, không đoán nghĩa.

## 4. Ngôn ngữ

- Ngôn ngữ lấy từ `Accept-Language` (vi/en/ja, fallback vi) — cả response thành công lẫn lỗi.
- Mọi message (kể cả lỗi từng field) lấy từ i18n key; bỏ dần chuỗi cứng trong `common/constants/message` (đã chốt trong plan: đây là behavior change cho en/ja, có before/after).
- `lesson`, `lesson-content` đang nhận `?lang=` → giữ qua adapter đến khi client chuyển hết sang header.

## 5. Payload

- Không cắt field nội bộ (`createdById`, `deletedAt`, `deletedById`, …) trên toàn hệ thống. Mỗi batch giai đoạn 3 khai báo response schema của feature và chỉ bỏ field sau khi xác minh web/mobile không dùng.
- Giữ kiểu dữ liệu hiện có (date dạng chuỗi ISO, id là number, enum dạng chuỗi).

## 6. Phía client

Mỗi client có **một** lớp adapter dùng chung (không globally unwrap trong interceptor khi service cũ còn tồn tại):

- Thành công: service trả kết quả có type `{ statusCode, message, data }` (list: `data.results`, `data.pagination`); hook không còn đọc `data?.data?.data`.
- Lỗi: chuẩn hóa thành `ApiError { status, error, message, fieldErrors, cause }` — `fieldErrors` lấy từ `errors` (422), tách network/timeout/cancel. HTTP adapter không tự toast/alert/điều hướng.
- Tương thích ngược khi BE đổi: hiện web gọi `messages.join(', ')` và mobile gọi `new Error(message)` trên mảng object → đều hiện "[object Object]". Sau khi BE trả `message` dạng chuỗi, nhánh xử lý chuỗi sẵn có của web và mobile chạy đúng ngay; adapter mới thêm hiển thị lỗi từng field.

## 7. Quyết định đã chốt và thay đổi so với hiện tại

| # | Hiện tại (baseline) | Sau | Ảnh hưởng client | Làm ở |
| --- | --- | --- | --- | --- |
| 1 | 422: `message` là mảng `[{ message, path }]`, câu chung "Định dạng không hợp lệ" | `message` chuỗi tóm tắt + `errors[{ field, message }]` cụ thể | Web 6 hook/page và mobile đang hiện "[object Object]" → sửa được; cập nhật adapter | Pipeline BE **xong** (`00a6ad1`); adapter client ở C1 |
| 2 | 7 chỗ trả HTTP 2xx kèm `statusCode` 400/401/403: `user-exercise-attempt` (`abandon` 400, `getExerciseAttemptReview` 403), `user-test-attempt` (`abandon` 400, `getTestAttemptReview` 403, `getLessonTestAttemptReview` 403), `match-round-participant.choosePokemonWithRound` 400, `auth.checkMailToAction` 401. (Con số "15" ban đầu sai: 8 chỗ trong `user-answer-log`/`user-test-answer-log` là `throw new HttpException` với status đúng, không phải lỗi mềm.) | Throw exception với HTTP status đúng (riêng `check-email`: không phải lỗi mà là bước tiếp theo → `data.requiresOtp`) | Mobile `exercise-history`/`quiz/result` kiểm tra 403 ở cả nhánh thành công lẫn lỗi → tiếp tục chạy; mobile `quiz` (thoát bài tập) coi 400 là "đã đóng", `pick-pokemon` coi 400 là hết giờ chọn, màn đăng nhập đọc `requiresOtp` → đã sửa ở MO trước | **Xong cả 7** (`6b0eaba`, `ff4f91f`, `23c3de6`) |
| 3 | `statusCode` trong body lấy từ service, có thể lệch HTTP status | Tầng HTTP đặt `statusCode` = HTTP status | Chỉ ảnh hưởng chỗ còn lỗi mềm → **làm sau #2** | Sau khi #2 xong hết |
| 4 | Sai mật khẩu: 404 `NOT_FOUND` | 401 `UNAUTHORIZED` | Không client nào kiểm tra 404 ở luồng đăng nhập; login mobile dùng client public nên không kích hoạt refresh — kiểm tra lại khi làm | Task auth — **xong** (`23c3de6`) |
| 5 | Field nội bộ trong payload | Giữ; cắt dần theo feature | Không | Giai đoạn 3 |
| 6 | Lỗi ngoài `HttpException`: `{ statusCode: 500, message: "Internal server error" }`, không dịch, không `error` | Cùng shape lỗi, message dịch | Không đổi status | **Xong** (`00a6ad1`, `ApiExceptionFilter`) |
| 7 | Message kiểu B không theo ngôn ngữ | Mọi message theo `Accept-Language` | en/ja nhận đúng ngôn ngữ (đã chốt là behavior change) | Giai đoạn 3 từng feature |
| 8 | Login thiếu `User-Agent` → 500 | Không còn 500 (ghi thiết bị với user agent mặc định) | Không | Bugfix riêng — **xong** (`23c3de6`, user agent mặc định `'unknown'`) |
| 9 | Thiếu token: message "Phiên đã hết hạn" | Message riêng cho thiếu token, vẫn 401 | Mobile refresh khi gặp 401 → không đổi | Task auth — **xong** (`23c3de6`) |

## 8. Thứ tự triển khai

1. **Lỗi mềm (#2)** — từng module, mỗi module một task: throw exception, cập nhật consumer mobile/web nếu cần, thêm snapshot.
2. **Pipeline lỗi (#1, #6)** — một exception filter cho mọi lỗi, validation pipe trả `errors[]` + câu tóm tắt. Cập nhật snapshot 422/500.
3. **`statusCode` = HTTP status (#3)** — chỉ sau khi bước 1 không còn chỗ nào.
4. **Auth (#4, #8, #9)**.
5. **Client C1** — `ApiError` + adapter thành công ở web và mobile; sau đó mỗi feature chuyển khi đi qua giai đoạn 3/C3.
6. **i18n và payload (#5, #7)** — theo từng feature ở giai đoạn 3.

Feature mẫu giai đoạn 2/C2 dùng hợp đồng này làm chuẩn; các batch sau chỉ áp lại, không thiết kế lại.
