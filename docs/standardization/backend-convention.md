# Convention backend — rút ra từ hai mẫu giai đoạn 2

Viết từ code đang chạy trên `dev` @ `706e231`: **Level** (kiểu A: message i18n, audit fields, soft delete) và **WordType** (kiểu B: message cứng cũ, xóa cứng, seed lúc khởi động). Mục 3 của [BACKEND_STANDARDIZATION_PLAN.md](../../BACKEND_STANDARDIZATION_PLAN.md) là nguyên tắc; tài liệu này là cách áp dụng cụ thể và checklist cho giai đoạn 3. Hợp đồng response: [response-contract.md](response-contract.md).

## 1. Cấu trúc module

```text
src/modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts     # route, auth, validation, serializer; không Prisma, không nghiệp vụ
  <feature>.service.ts        # nghiệp vụ, transaction, map lỗi, envelope { data, message }
  <feature>.repo.ts           # class <Feature>Repo: query Prisma, mapping persistence
  <feature>.service.spec.ts   # unit test logic riêng của feature
  dto/<feature>.zod-dto.ts    # class XDTO extends createZodDto(schema)
  dto/<feature>.dto.ts        # Swagger DTO khi Zod không tự sinh đủ (multipart, ví dụ)
  dto/<feature>.error.ts      # exception class của feature
  entities/<feature>.entity.ts # Zod schema + type infer
```

- Tên: `XRepo`, `XDTO` (hậu tố in hoa), file kebab-case, `.entity.ts` số ít. Đổi tên file/class là **commit riêng, chỉ cơ học** (mẫu: `f51127d`, `161bcbb`), trước commit đổi logic.
- Import giữa feature/shared dùng `@/...`; trong feature dùng relative. Không dùng `src/...`.
- Dependency inject: `private readonly`.

## 2. Schema, DTO, serializer

- Một nguồn: Zod schema trong `entities/`, DTO là `createZodDto(schema)`. Swagger DTO riêng chỉ khi cần (multipart, envelope chưa có Zod) và phải khớp response thật — có test đọc OpenAPI sinh ra (`test/docs/wordtype-openapi.e2e-spec.ts`).
- **Mọi route trả JSON có `@ZodSerializerDto` với schema của cả envelope**, không phải schema entity trần (lỗi cũ: `GET /wordtype/name-key/:nameKey` luôn 500).
  - Chi tiết/tạo/sửa: `z.object({ statusCode, message, data: XSchema })`.
  - List: `paginatedResSchema(ItemSchema)` (`@/shared/utils/pagination`).
- Tham số id: `checkIdSchema(XMessage.INVALID_ID)` (`@/common/utils/id.validation`) → id sai là 422 có `errors[]`, không phải 500 từ `parseInt` + Prisma.
- Message validation trong schema là **i18n key** (`LevelMessage.LEVEL_NUMBER_MIN`), không phải câu tiếng Việt; pipe chuyển key, `ApiExceptionFilter` dịch theo request.

## 3. Lỗi

- Mỗi lỗi nghiệp vụ là một class, **tạo mới mỗi lần throw** (`throw new WordTypeNotFoundException()`), không dùng instance dùng chung.

  ```ts
  export class WordTypeNotFoundException extends NotFoundException {
    constructor() {
      super({ message: WordTypeMessage.NOT_FOUND, errorKey: WordTypeMessage.NOT_FOUND })
    }
  }
  ```

- `errorKey` được filter dịch theo `Accept-Language`. Khi chuyển message cứng sang key: câu tiếng Việt cũ là giá trị `vi`, bổ sung `en` và `ja` trong cùng commit (thay đổi hành vi có chủ đích, snapshot en đổi theo).
- Phân loại lỗi theo **type/code**, không theo text message. Predicates ở `@/shared/utils/prisma-errors`:
  - `isUniqueConstraintPrismaError` (P2002) → 409 "đã tồn tại" của feature
  - `isNotFoundPrismaError` (P2025) → 404 của feature
  - `isForeignKeyConstraintPrismaError` (P2003), `isRestrictViolationPrismaError` (Postgres 23001, xóa bị `onDelete: Restrict` chặn) → 409 theo ngữ cảnh
  - `HttpException` của mình: ném lại nguyên vẹn
  - Lỗi khác: không đổi 500 thành 400 nếu trước đó không phải vậy. WordType giữ 400 "invalid data" vì đó là hành vi cũ (`toWordTypeError`).
- Một hàm map lỗi trong service khi nhiều method dùng chung (`WordTypeService.toWordTypeError`).

## 4. Repo, type, pagination, transaction

- Kiểu trả về lấy từ Prisma: `Prisma.LevelGetPayload<{ include: typeof WITH_RELATIONS }>` với một hằng include dùng chung (`LevelRepo`). Không `any` cho `where`/`data`/row: `Prisma.XWhereInput`, `Prisma.XCreateInput`, model type từ `@prisma/client`.
- Pagination: `toSkipTake(page, pageSize)` và `toPaginationMeta(page, pageSize, totalItem)`. Mỗi feature giữ tên query và default của nó (WordType `page/limit`, mặc định 10; Level `currentPage/pageSize`, 15).
- Transaction: service quyết định ranh giới; các ghi phải cùng thành công/thất bại thì nằm trong một `$transaction`, repo nhận client tx và **dùng nó** (lỗi cũ ở reward: repo bỏ qua tx client). Không "rollback" bằng tay ngoài transaction.
- Insert với id tường minh phải đồng bộ sequence (`WordTypeRepo.syncIdSequence`).

## 5. Service

- Giữ envelope `{ data, message }` (và `statusCode` khi đang có) ở service — bỏ envelope khỏi service là giai đoạn 5.
- Message thành công dịch bằng `I18nService.translate(key, lang)`, `lang` từ `@I18nLang()` (cùng `resolveLanguage` với filter).
- Log bằng Nest `Logger` của class; không `console.*`. Việc best-effort (Level `autoLinkLevels`) log lỗi rõ ràng, có test chứng minh không làm hỏng thao tác chính.

## 6. Test

| Loại | Khi nào | Mẫu |
| --- | --- | --- |
| Contract snapshot | Trước khi refactor một feature: mọi route, thành công + lỗi, lỗi ở vi và en | `test/contracts/wordtype-level.e2e-spec.ts` |
| Unit service | Logic riêng của feature, map lỗi | `level.service.spec.ts`, `wordtype.service.spec.ts` |
| E2e hành vi | Bug có tái hiện qua HTTP/DB (transaction, sequence, locale) | `test/reward/*`, `test/contracts/wordtype-id-sequence.e2e-spec.ts` |

- Test bug phải **fail trên code cũ** trước khi sửa.
- Spec e2e tự xóa dữ liệu nó tạo (`afterAll`), chỉ chạy trên DB `_test`; e2e chạy tuần tự (`maxWorkers: 1`) vì dùng chung DB.
- Snapshot đổi chỉ khi có chủ đích và nằm cùng commit với thay đổi.

## 7. Checklist chuẩn hóa một module (giai đoạn 3)

1. Đối chiếu consumer web/mobile ([client-inventory.md](client-inventory.md)); ghi route nào có client đọc field nào.
2. Thêm contract snapshot cho mọi route của module (commit test riêng); ghi bug thấy được vào message commit.
3. Commit đổi tên cơ học (file/class/DTO) nếu lệch convention.
4. Commit refactor/fix:
   - [ ] `@ZodSerializerDto` envelope cho mọi route JSON
   - [ ] id/param qua `checkIdSchema`, query/body qua Zod DTO
   - [ ] exception class + `errorKey`, tạo mới mỗi lần; vi/en/ja đủ cho key mới
   - [ ] map lỗi Prisma theo code, không theo text; không đổi 500 ↔ 400 ngoài chủ đích
   - [ ] type Prisma thay `any`; `private readonly`; import `@/`
   - [ ] pagination qua helper; transaction có ranh giới rõ, repo dùng tx client
   - [ ] `Logger` thay `console.*`
   - [ ] unit test logic riêng; e2e cho bug tái hiện được
5. Snapshot chỉ đổi ở chỗ có chủ đích; client đọc route đó được kiểm hoặc cập nhật cùng batch.
6. Checks: typecheck 0, unit, e2e, format, ESLint file đã sửa không tăng.
7. Ghi tracker (commit, merge, phần để lại).

## 8. Chưa làm ở hai mẫu (để batch tương ứng)

- WordType list dịch tên từng dòng (N+1); seed tra ngôn ngữ từng loại từ.
- Level: tạo/sửa và tự liên kết level liền kề là hai lần ghi riêng (best effort, có log).
- `helpers.ts` vẫn re-export Prisma predicates cho các module chưa migrate.
- Message Vocabulary vẫn là hằng số tiếng Việt.
