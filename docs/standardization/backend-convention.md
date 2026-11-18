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
  dto/<feature>.zod-dto.ts    # hợp đồng HTTP: body/query/params/res schema + type + class XDTO
  dto/<feature>.dto.ts        # Swagger DTO khi Zod không tự sinh đủ (multipart, ví dụ)
  dto/<feature>.error.ts      # exception class của feature
  entities/<feature>.entity.ts # hình dạng dữ liệu: XSchema, XWithRelationsSchema, type X, X_FIELDS
```

- Tên: `XRepo`, `XDTO` (hậu tố in hoa), file kebab-case, `.entity.ts` số ít. Đổi tên file/class là **commit riêng, chỉ cơ học** (mẫu: `f51127d`, `161bcbb`), trước commit đổi logic.
- Import giữa feature/shared dùng `@/...`; trong feature dùng relative. Không dùng `src/...`.
- Dependency inject: `private readonly`.

## 2. Schema, DTO, serializer

- Bố cục theo [schema-dto-layout-plan](schema-dto-layout-plan.md) (giai đoạn 7, mẫu: module **level**):
  - `entities/` chỉ giữ hình dạng dữ liệu dùng lại ở nhiều response hoặc trong service/repo. Không có schema request/response, không có envelope.
  - Mọi schema thuộc HTTP (body, query, params, response) nằm trong `dto/<feature>.zod-dto.ts`, đặt theo thứ tự schema, type, class: phụ thuộc một chiều `dto → entity`. File quá lớn thì tách theo use case trong `dto/`.
  - Tên: `XSchema` (giá trị Zod), `X` (type suy ra, **không hậu tố** `Type`), `XDTO` (class). Ví dụ `CreateLevelBodySchema`, `CreateLevelBody`, `CreateLevelBodyDTO`. Trong repo cần cả type dòng Prisma cùng tên thì import Prisma với alias `PrismaX`.
  - Service/repo dùng type suy ra từ schema HTTP (`CreateLevelBody`), import từ `dto/`; không thêm lớp input riêng chỉ để map 1–1.
  - `arch:deps` chặn tái phát: `httpSchemasInEntities` = 0, `handWrittenEnvelopes` chỉ còn 2 ngoại lệ đã ghi trong baseline.
- DTO là `createZodDto(schema)`. Swagger DTO riêng chỉ khi cần (multipart, envelope chưa có Zod) và phải khớp response thật — có test đọc OpenAPI sinh ra (`test/docs/wordtype-openapi.e2e-spec.ts`). Toàn bộ tài liệu OpenAPI bị chụp ở `test/docs/openapi-snapshot.e2e-spec.ts`; đổi API có chủ đích thì chạy với `UPDATE_OPENAPI=1` và nêu trong commit.
- **Mọi route trả JSON có `@ZodSerializerDto` với schema của cả envelope**, không phải schema entity trần (lỗi cũ: `GET /wordtype/name-key/:nameKey` luôn 500).
  - Chi tiết/tạo/sửa: `resSchema(XSchema)` (`@/shared/utils/res-schema`), không viết tay `z.object({ statusCode, message, data })`.
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

## 9. Ranh giới module (giai đoạn 4)

Chi tiết và lý do: [module-boundary-plan.md](module-boundary-plan.md). Tóm tắt quy tắc:

| | Quy tắc |
| --- | --- |
| R1 | Repo là private: chỉ service/provider của chính module inject Repo của nó. `exports` của module là service, không phải Repo. |
| R2 | Module khác đi qua service đã export: module A `imports` module B và inject service của B. Ghi vào bảng của B chỉ qua service của B. |
| R3 | Transaction xuyên module: service điều phối mở transaction (qua `withTransaction` của repo của chính nó); method của module khác nhận `prismaTx`/`tx` và dùng nó, cùng thứ tự ghi. Không tách một transaction thành nhiều. |
| R4 | Ngoại lệ read model: repo của dashboard và truy vấn xếp hạng/lịch sử được đọc nhiều bảng, **chỉ đọc**, có ghi chú trong repo. |
| R5 | Không Prisma ngoài Repo: service, gateway, cronjob, processor, guard gọi repo của module mình hoặc service sở hữu. Cronjob/processor nằm trong thư mục module sở hữu. |
| R6 | Không vòng phụ thuộc mới: gỡ bằng cách dời use case lên module điều phối hoặc để module dưới sở hữu dòng dữ liệu. Vòng thật ở mức use case giữ `forwardRef` và ghi lý do (bảng dưới). |
| R7 | `SharedModule` (global) chỉ chứa hạ tầng: Prisma, hashing, token, JWT, Bull `forRoot`, guard. Không Repo hay service nghiệp vụ. |

Method cho module khác (mẫu dùng ở B1–B8): đặt ở cuối service dưới chú thích `// ---- For other modules ... ----`, giữ nguyên tham số và kết quả của repo (kể cả client transaction):

```ts
findByUserAndPokemon(...args: Parameters<UserPokemonRepo['findByUserAndPokemon']>) {
  return this.userPokemonRepo.findByUserAndPokemon(...args)
}
```

Nếu service đã có method cùng tên cho route HTTP (trả envelope, ném lỗi), method cho module khác đổi tên (`getById`, `updateMatch`, `createParticipant`...) và ghi chú tên gốc trong repo.

Kiểm tra: `npm run arch:deps` đo các chỉ số trong `scripts/arch/module-deps.baseline.json` và fail khi một chỉ số tăng hoặc có mục mới. Sau một thay đổi làm chỉ số giảm (hoặc chỉ dời đường dẫn), chạy `npm run arch:deps -- --update` và commit baseline cùng thay đổi.

### Ngoại lệ còn lại (sau B8)

| Chỉ số | Mục | Lý do |
| --- | --- | --- |
| Repo chéo module (16) | shop: banner ↔ item, item ↔ rarity price, banner ↔ purchase, rarity price → item/banner (8) | Use case tạo/random item và đổi giá gọi chéo nhau; gỡ cần dời use case lên module trên (giai đoạn 6) |
| | gacha: item ↔ banner (2) | Như shop |
| | test ↔ user-test-attempt: `test.module` cung cấp `UserTestAttemptRepo`, test đọc `UserTestRepo`/`UserTestAttemptRepo`, attempt đọc `TestRepo` (4) | `UserTestAttemptModule` import `TestModule`; import ngược là vòng; gỡ khi tách test/attempt |
| | `UserService` → `UserSeasonHistoryRepo` | Inject service khép vòng user → season history → reward → user (Nest không dựng được) |
| | `UserRewardHistoryService` → `RewardRepo` | Ghi lịch sử chụp reward vào `meta` (là ghi, không dùng R4); reward gọi lại user-reward-history |
| `forwardRef` (8 module, 6 inject) | shop, gacha, reward ↔ user-reward-history, match-participant/match, processor round-question | Cùng các vòng trên; battle: luồng trận là một quy trình trải trên nhiều module |
| Prisma ngoài repo (1) | `cronjobs/handle-leaderboard-season.cronjob.ts` | Chốt mùa (reset elo, finalRank, thưởng) chưa có test nào chạy qua; cần test đối chứng trước khi chuyển |
| Battle (không đo) | round-question đọc/ghi round và participant trong repo của mình; match-round-participant đọc `matchParticipant` trong repo của mình | match-round, match-round-participant import round-question; match-participant import match-round-participant |

## 10. Dịch vụ ngoài (port và driver)

Mọi dịch vụ trả phí nằm sau một port trong `src/infrastructure/integrations/` (mail, storage, speech, LLM, payment), mỗi port có adapter thật và adapter giả, chọn bằng biến `*_DRIVER` (bảng trong README). Service gọi port, không gọi SDK; SDK chỉ nằm trong adapter. App không khởi động với adapter giả khi `NODE_ENV=production`. Test và demo không cần key dùng adapter giả (`.env.test` đặt cả năm driver ở giá trị giả); kết quả với adapter giả không chứng minh gì về nhà cung cấp thật.

Hạ tầng không phải nhà cung cấp (Bull: `src/infrastructure/queue`, Redis: `src/infrastructure/redis`) không có port. Không còn thư mục `3rdService/`: route và nghiệp vụ dùng dịch vụ ngoài (mail, speech, upload, gemini) là module trong `src/modules/`.
