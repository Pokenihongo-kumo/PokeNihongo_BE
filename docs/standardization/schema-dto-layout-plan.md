# Plan bố cục schema và DTO

Trạng thái: **design-approved** (hướng tổ chức và đặt tên chốt 2026-11-17; `@ZodResponse` là quyết định riêng ở mục 6). Viết từ code `dev` @ `84bba0d`, chỉ đọc code. Thuộc giai đoạn 7 của [BACKEND_STANDARDIZATION_PLAN.md](../../BACKEND_STANDARDIZATION_PLAN.md), thay cho dòng "giữ `entities/` cho mọi schema" trong mục 3 của plan chính và mục 1–2 của [backend-convention.md](backend-convention.md) sau khi hoàn tất. Không đổi route, response contract hay OpenAPI.

## 1. Vấn đề

`entities/<feature>.entity.ts` đang chứa **mọi** schema Zod của feature: hình dạng dữ liệu, body, query, params và response. `dto/<feature>.zod-dto.ts` chỉ chứa class `createZodDto(...)` bọc các schema đó. Hệ quả:

- Hợp đồng HTTP (request + response) nằm ở thư mục tên là `entities`, trong khi class DTO lại ở `dto/`. Review một thay đổi API phải mở hai nơi.
- Envelope `{ statusCode, message, data }` được viết tay lại ở từng module.
- Một số module dùng cùng một tên cho schema và type (`export const LessonType = z.object(...)` và `export type LessonType = z.infer<...>`), đọc dễ nhầm schema với type.

## 2. Tham khảo bên ngoài (2026-11-17)

| Nguồn                                                                                                           | Cách làm                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod) (thư viện đang dùng)                                    | Đặt tên `XSchema` cho schema, `XDto` cho class. Example chính thức `packages/example/src/people/` chỉ có `people.controller.ts` và `people.dto.ts`, trong đó có cả request lẫn response; type suy ra bỏ hậu tố (`Person`, `PersonList`). README khuyên `@ZodResponse` thay cho `@ZodSerializerDto` |
| [awesome-nest-boilerplate](https://narhakobyan.github.io/awesome-nest-boilerplate/nestjs-code-style-guide.html) | `dtos/` chứa input DTO, response DTO và DTO phân trang; `feature.entity.ts` riêng; controller trả DTO, không trả entity                                                                                                                                                                            |
| [Brocoders nestjs-boilerplate](https://brocoders.github.io/nestjs-boilerplate/architecture.html)                | Hexagonal: `domain/`, `dto/`, `infrastructure/persistence/` (entity DB + mapper). Nặng hơn nhu cầu dự án, không theo                                                                                                                                                                               |

Đa số tách response khỏi entity và đặt cùng request trong `dto/`. Dự án chỉ khác ở điểm này; tổ chức theo feature module đã đúng.

## 3. Baseline (`dev` @ `84bba0d`)

- 80 file `entities/*.ts`; 764 hằng `*Schema` trong đó.
- Response schema: 260 hằng trong **72** file `entities/`, chỉ 8 file đặt ở `dto/`.
- Envelope viết tay (`statusCode: z.number()`): **77** file.
- Đặt tên `XType` cho schema: 50 hằng trong **8** file (phần còn lại đã dùng `XSchema`).
- 153 file service/repo import từ `entities/` (phần lớn là type body/query).
- 454 chỗ dùng `@ZodSerializerDto`; 56 file `dto/*.zod-dto.ts`, 68 file Swagger `dto/*.dto.ts`.

## 4. Quy tắc đích

```text
modules/<feature>/
  entities/<feature>.entity.ts   # hình dạng dữ liệu: XSchema, XWithRelationsSchema + type X
  dto/<feature>.zod-dto.ts       # hợp đồng HTTP: Body/Query/Params/Res schema + class XDTO + type suy ra
  dto/<feature>.dto.ts           # Swagger DTO chỉ khi Zod không tự sinh đủ (multipart...), như hiện tại
```

- **S-R1 — Entity chỉ giữ hình dạng dữ liệu** dùng lại ở nhiều response hoặc trong service/repo. Không có schema request/response, không có envelope. Ưu tiên type Prisma khi đủ (convention mục 4); entity Zod chỉ cần khi phải serialize.
- **S-R2 — Mọi schema thuộc HTTP nằm trong `dto/`**, cùng class DTO của nó. Phụ thuộc một chiều `dto → entity`. File quá lớn thì tách theo use case trong `dto/` (ví dụ `dto/lesson-list.zod-dto.ts`), không tách mỗi class một file.
- **S-R3 — Đặt tên:** `XSchema` (giá trị Zod), `X` (type suy ra, không hậu tố), `XDTO` (class; giữ `DTO` in hoa theo convention đã chốt).

  ```ts
  export const CreateLessonBodySchema = z.object({...})
  export type CreateLessonBody = z.infer<typeof CreateLessonBodySchema>
  export class CreateLessonBodyDTO extends createZodDto(CreateLessonBodySchema) {}
  ```

- **S-R4 — Envelope dùng chung:** thêm `resSchema(data)` cạnh `paginatedResSchema` ở `shared/utils`; không module nào viết tay `statusCode: z.number()`.

  ```ts
  export const LessonResSchema = resSchema(LessonWithRelationsSchema)
  export const LessonListResSchema = paginatedResSchema(LessonWithRelationsSchema)
  ```

- **S-R5 — Service/repo** được dùng type suy ra từ schema HTTP (`CreateLessonBody`) và import từ `dto/`. Không thêm lớp input domain riêng chỉ để map 1–1.

## 5. Cách làm

Thay đổi thuần cơ học (dời code, đổi tên, đổi import), làm **một lần cho toàn bộ module** bằng codemod, không sửa lẻ để tránh hai kiểu song song. Codemod viết bằng TypeScript compiler API (đã có) hoặc `ts-morph` (thêm devDependency, cần duyệt), đặt ở `scripts/codemods/`, chạy lại được.

| Batch | Phạm vi                                                                                                                                                                                                | Ước lượng                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| S0    | Làm tay một module mẫu theo mục 4: **level** (mẫu kiểu A của giai đoạn 2, có list, detail, envelope, i18n). Review và chốt mẫu trước khi viết codemod; codemod phải sinh ra đúng hình dạng của mẫu này | 1 module                               |
| S1    | Thêm `resSchema()`; thay envelope viết tay                                                                                                                                                             | 77 file                                |
| S2    | Đổi tên `XType` → `XSchema`/`X`                                                                                                                                                                        | 8 file + nơi import                    |
| S3    | Dời schema request/response từ `entities/` sang `dto/<feature>.zod-dto.ts`; cập nhật import ở controller, service, repo                                                                                | 72 file entity, khoảng 150 file import |
| S4    | Cập nhật [backend-convention.md](backend-convention.md) mục 1–2 và mục 3 plan chính; thêm chỉ số vào `arch:deps` (response schema trong `entities/` = 0, envelope viết tay = 0) để chặn tái phát       |                                        |

Mỗi batch là commit riêng, chỉ cơ học; không gộp với sửa logic.

### Mẫu tham khảo khi làm

Trước mỗi batch và khi review, mở mẫu ra đối chiếu thay vì làm theo trí nhớ:

| Mẫu                                                                                                                                 | Xem để làm gì                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module **level** sau S0 (trong repo)                                                                                                | Mẫu chuẩn của dự án: bố cục `entities/` và `dto/`, tên `XSchema`/`X`/`XDTO`, dùng `resSchema`/`paginatedResSchema`, import ở service/repo. Mọi module khác phải giống mẫu này; khác thì sửa codemod hoặc ghi ngoại lệ |
| [nestjs-zod example `people.dto.ts`](https://github.com/BenLorantfy/nestjs-zod/blob/main/packages/example/src/people/people.dto.ts) | Request và response chung một file DTO; tái dùng schema qua `XDTO.schema`; type suy ra không hậu tố                                                                                                                   |
| [nestjs-zod README](https://github.com/BenLorantfy/nestjs-zod)                                                                      | Cách dùng `createZodDto`, `ZodSerializerDto`, `ZodResponse` theo bản đang cài; kiểm tra lại khi nâng cấp                                                                                                              |
| [awesome-nest-boilerplate code style](https://narhakobyan.github.io/awesome-nest-boilerplate/nestjs-code-style-guide.html)          | Ranh giới entity/DTO: controller trả DTO, entity thuộc một module                                                                                                                                                     |
| [backend-convention.md](backend-convention.md)                                                                                      | Quy ước hiện hành của dự án (lỗi, pagination, transaction); bố cục mới không được làm lệch các phần này                                                                                                               |

Mẫu ngoài chỉ để tham khảo ý tưởng; khi khác với quy ước đã chốt ở mục 4 (ví dụ `DTO` in hoa, `zod-dto.ts`), theo mục 4.

**Thời điểm:** sau khi phase 3 chuẩn hóa xong các nhóm còn lại và trước giai đoạn 5 (response ownership), để giai đoạn 5 chỉ phải sửa một helper envelope. Không làm khi còn nhánh feature dài đang mở, vì sẽ conflict import hàng loạt; chốt thời điểm bằng cách merge hết nhánh đang dở trước.

## 6. Gate

- Typecheck 0, unit và e2e pass, **snapshot không đổi**.
- **OpenAPI không đổi:** xuất JSON Swagger trước và sau mỗi batch rồi so khớp (mở rộng cách `test/docs/wordtype-openapi.e2e-spec.ts` đang làm cho toàn app). Đây là kiểm tra chính cho 454 chỗ `@ZodSerializerDto`.
- `arch:deps` không tăng chỉ số nào.

## 7. Để sau: `@ZodResponse`

`nestjs-zod` khuyên `@ZodResponse({ type: XDTO })` thay cho `@ZodSerializerDto`, vì một decorator lo cả serializer, schema OpenAPI và kiểu trả về. Bản đang cài (4.3.1) chưa có decorator này. Cân nhắc khi nâng cấp `nestjs-zod`, làm cùng giai đoạn 5 vì liên quan thứ tự `TransformInterceptor`/`ZodSerializerInterceptor`. Cần quyết định riêng (D-SD1) trước khi làm.
