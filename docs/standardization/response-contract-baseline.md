# Baseline hợp đồng response — Giai đoạn 0 (bước 7)

Ngày 2026-11-03. Ghi lại response HTTP **thực tế** mà web/mobile đang nhận, trước mọi thay đổi chuẩn hóa. Nguồn: test `test/contracts/response-shapes.e2e-spec.ts` chạy app thật trên DB/Redis test; snapshot ở `test/contracts/__snapshots__/`. Đổi hợp đồng có chủ đích thì phải cập nhật snapshot trong cùng commit.

Chạy lại: `pnpm test:e2e` (cần Docker Postgres/Redis, `.env.test` từ `.env.test.example`, DB `pokenihongo_test` đã migrate).

## 1. Pipeline response hiện tại (đọc code)

| Thành phần | File | Hành vi |
| --- | --- | --- |
| `TransformInterceptor` (global) | `src/common/interceptor/transform.interceptor.ts` | Nếu service trả object có `data` + `message` thì trả `{ statusCode, ...data }` — **`statusCode` của service ghi đè HTTP status** trong body; ngược lại bọc `{ statusCode, data }` |
| `ZodSerializerInterceptor` (global) | `app.module.ts` | Serialize theo `@ZodSerializerDto` của route |
| `CustomZodValidationPipe` (global) | `src/common/pipes/custom-zod-validation.pipe.ts` | Lỗi validation → `UnprocessableEntityException(mảng issue)` |
| `I18nHttpExceptionFilter` (global, chỉ `HttpException`) | `src/common/filters/i18n-http-exception.filter.ts` | Body lỗi `{ statusCode, message, error: HttpStatus[status], data? }`; dịch `errorKey` theo `Accept-Language`; nối `: ${data}` vào message nếu exception có `data` |
| Lỗi không phải `HttpException` | — | Rơi về handler mặc định của Nest: `{ statusCode: 500, message: 'Internal server error' }` |
| `CatchEverythingFilter`, `HttpExceptionFilter` | `src/shared/filters/` | **Không được đăng ký** ở đâu → code chết |

## 2. Response quan sát được

### Thành công — hai kiểu code đã cùng envelope

```text
{ statusCode: number, message: string, data: ... }
list: data = { results: T[], pagination: { current, pageSize, totalItem, totalPage } }
```

Đã xác nhận trên `GET /level` (kiểu A, message i18n), `GET /languages` (kiểu B, message hằng số) và `POST /auth/login`. Response chứa cả field nội bộ (`createdById`, `deletedAt`, `deletedById`, …).

### Lỗi

| Trường hợp | HTTP | Body |
| --- | --- | --- |
| Route không tồn tại | 404 | `{ statusCode: 404, message: "Cannot GET /…", error: "NOT_FOUND" }` |
| Thiếu bearer token | 401 | message "Phiên đã hết hạn, vui lòng đăng nhập lại" (dù chưa từng đăng nhập) |
| Sai mật khẩu | **404** | `error: "NOT_FOUND"`, message "Sai email hoặc mật khẩu" |
| Not found kiểu A (`/level/999999`) | 404 | vi "Không tìm thấy bản ghi" · en "Record not found" (dịch đúng) |
| Not found kiểu B (`/languages/999999`) | 404 | **vi và en đều** "Ngôn ngữ không tồn tại" (bỏ qua `Accept-Language`) |
| Validation (kiểu A và B) | 422 | **`message` là mảng** `[{ message, path }]`; mọi field cùng câu chung "Định dạng không hợp lệ" |

## 3. Client đang đọc response thế nào

- **Web** (`src/configs/axios/index.ts`, 143 lời gọi trong 25 file `services/`): không unwrap ở interceptor; service trả nguyên `AxiosResponse`, hook tự đọc (`hooks/useReward` đọc `data?.data?.data`). Không có refresh token.
- **Mobile** (`src/configs/axios.ts`, 132 lời gọi trong 36 file `services/`): refresh token qua `POST auth/refresh-token` đọc `response.data.data.accessToken`; client public đổi lỗi thành `new Error(error.response.data.message)` → với 422 (`message` là mảng) người dùng thấy **"[object Object]"**. Service trả lẫn lộn `data.data` và cả envelope (`services/attendance.ts`). 10 file đọc `statusCode` trong body.
- **Mobile gọi endpoint không tồn tại trong BE**, đang được màn hình dùng: `dictionary/kanji/:id`, `dictionary/voice-search`, `dictionary/handwriting-search`, `dictionary/favorites` (`(me)/dictionary`), `quiz/*` (`useQuiz`, `usePlacementTest`), `conversation/start`, `conversation/submit-speech` (AI conversation), `lesson/:id/exercises-status` (`useLessonExerciseStatus`).

## 4. Vấn đề cần quyết khi chốt hợp đồng chung

| # | Vấn đề | Loại khi sửa |
| --- | --- | --- |
| 1 | 422 trả `message` dạng mảng, các lỗi khác dạng chuỗi; client không xử lý thống nhất | Breaking change cho client → cần adapter/migration phối hợp |
| 2 | Message kiểu B không theo ngôn ngữ | Behavior change có chủ đích (đã chốt ở plan: migration i18n vi/en/ja) |
| 3 | Câu validation chung chung, không nói field nào sai | Behavior change (message) |
| 4 | Sai mật khẩu trả 404 thay vì 401 | Breaking change nhẹ (client có thể dựa vào status) |
| 5 | `statusCode` trong body lấy từ service, có thể lệch HTTP status | Có thể giữ field, chỉ đổi nguồn giá trị |
| 6 | Response lộ field nội bộ (`createdById`, `deletedAt`, …) | Thu hẹp payload = breaking nếu client đang đọc |
| 7 | Lỗi ngoài `HttpException` không đi qua filter i18n → shape khác (`message` không dịch, không có `error`) | Bugfix |
| 8 | Login thiếu header `User-Agent` → 500 (`device.create` thiếu `userAgent`) | Bugfix |

Hướng đề xuất (chờ người dùng chốt, xem tracker): giữ envelope thành công hiện tại; một shape lỗi duy nhất với `message` luôn là chuỗi đã dịch và chi tiết field nằm trong field riêng; mỗi client một adapter parse duy nhất. Chốt trên feature mẫu ở giai đoạn 2/C1 để các batch sau chỉ áp một lần.

## 5. Chưa làm trong bước này

- Xuất file OpenAPI đầy đủ (616 endpoint): để task riêng, dùng `setupSwagger` hiện có.
- Snapshot mới bao phủ 2 module + pipeline chung; mỗi batch giai đoạn 3 bổ sung snapshot cho route của mình.
