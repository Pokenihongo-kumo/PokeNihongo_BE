# Inventory backend PokeNihongo — Giai đoạn 0

Ngày 2026-11-02, trên `dev` @ `8fe80d0`. Bảng sinh bằng script tìm kiếm tĩnh (regex trên source BE/FE/MO), không chạy app. Các cột là **tín hiệu để lên batch**, không phải kết luận về hành vi; mỗi batch phải đọc lại code và consumer trước khi sửa. Đếm lại khi source đổi.

## 1. Tổng quan

- `src`: `modules` 625 file, `common` 47, `3rdService` 44, `shared` 34, `websockets` 9, `i18n` 7, `cronjobs` 5, `config` 2, cùng `app.module.ts` và `main.ts`.
- **81 module, 616 endpoint** (đếm `@Get/@Post/@Put/@Patch/@Delete` trong controller).
- Nạp module: 80 module được import trực tiếp trong `AppModule`; `kanji-reading` được nạp gián tiếp qua module khác. Không có module nào trong `src/modules` bị bỏ rơi.
- Kiểu code (định nghĩa ở mục 4): **A 36**, **B 32**, **lai 13**.

| Tín hiệu | Phân bố |
| --- | --- |
| Hậu tố repo | `XRepo` 48 · `XRepository` 32 · không có repo 1 (`notification`) |
| File schema | `.entity.ts` 45 · `.entities.ts` 32 · `.model.ts` 3 (`payment`, `permission`, `role`) · lỗi tên 1 (`user-gacha-pity/entities/user-gacha-pityentity.ts`) |
| Zod DTO | `*.zod-dto.ts` 50 · `*.dto.ts` dùng `createZodDto` 28 · không có 3 (`ai-conversation-room`, `dashboard`, `payment`) |
| Thư mục `dto/zod/` lồng | 6: `kanji`, `kanji-reading`, `languages`, `meaning`, `translation`, `wordtype` |
| Swagger | 34 module có `@ApiTags/@ApiOperation`; 35 module có DTO Swagger khai báo tay (`@ApiProperty`) tách khỏi Zod |
| Message | chỉ i18n 41 · chỉ `constants/message` 12 · cả hai 11 · không dùng hệ message 17 |
| Ngôn ngữ | `@I18nLang` 67 · `@Query('lang')` 2 (`lesson`, `lesson-content`) · không xử lý 12 |
| Pagination | `currentPage/pageSize` 68 · có thêm `page/limit` 8 · không phân trang 5 (`auth`, `match-queue`, `notification`, `payment`, `testset-questionbank`) |
| Guard cục bộ | 24 module dùng `@UseGuards` dù đã có `AuthenticationGuard` global (`APP_GUARD`) |
| Bắt lỗi theo câu chữ | `error.message.includes(...)`: `kanji` ×6, `kanji-reading` ×4, `wordtype` ×4 |
| `console.log/debug` | nhiều nhất: `round-question` 27, `shop-banner` 9, `gacha-banner` 8, `invoice` 8, `user-pokemon` 7, `attendance` 7 |

## 2. Ngoài `src/modules`

| Thư mục | Nội dung | Ghi chú cho các giai đoạn sau |
| --- | --- | --- |
| `3rdService/bull` | `BullQueueModule`, `queue-config` (parser Redis URL + kiểm tra cô lập test) | Đã chuẩn hóa ở giai đoạn 0 |
| `3rdService/gemini` | `gemini.service.ts` 1936 dòng, `vertex-ai.service.ts` 973 dòng, controller, config/presets | File lớn → giai đoạn 6 |
| `3rdService/mail`, `speech`, `upload` (+cloudinary), `redis` | Integration đang được nạp | Config đọc env rải rác → giai đoạn 4 |
| `3rdService/payos` | **Dead code**: `payos.service.ts` comment toàn bộ (105/105 dòng); `PayosModule`, `payosProvider` không được import ở đâu | `PayOSService` đang chạy nằm ở `shared/services/payos.service.ts`. Xóa ở task dọn riêng sau khi kiểm tra scripts/build |
| `3rdService/microservices` (RabbitMQ) | **Không được nạp**: `MicroservicesModule`, `RabbitmqModule` và các service không được import ngoài thư mục | `@nestjs/microservices` chỉ dùng trong 3 file này. Xác nhận với người dùng trước khi xóa |
| `common/constants` | 26 file; `message.ts` 454 dòng là nguồn message cứng | Thu hẹp dần khi chuyển sang i18n (giai đoạn 3) |
| `common/decorators` | `auth.decorator.ts` (`IsPublic`, dùng 48 lần) và `custom.ts` (`Public` + `IS_PUBLIC_KEY`, **0 lần dùng**, guard không đọc key này) | `Public`/`IS_PUBLIC_KEY` là code chết, dễ gây nhầm → dọn ở giai đoạn 4 (auth) |
| `common/{guards,filters,interceptor,middleware,pipes}` | Pipeline HTTP chung: access-token/api-key/authentication/rate-limit guard, i18n exception filter, transform interceptor, request-context middleware, Zod validation pipe | Request context → giai đoạn 1; response ownership → giai đoạn 5 |
| `common/utils` | `qs-parser.ts`, `prase.utils.ts` (sai chính tả "parse"), `id.validation.ts`, `algorithm.ts` | Khóa grammar qs bằng test trước khi sửa |
| `shared` | `shared.module.ts` (APP_GUARD + provider nghiệp vụ), `helpers.ts`, 3 filter, models, 3 repo, 8 service (data-access, firebase, hashing, payos, prisma, notification, token, user-subscription) | Thu nhỏ theo ownership → giai đoạn 4 |
| `shared/workers` | 6 processor; `round-question-timeout` 1332 dòng, `match-round-participant-timeout` 1076 dòng | Giai đoạn 6, giữ job name/payload/retry |
| `websockets` | `kaiwa.gateway.ts` 2393 dòng, `matching.gateway.ts` 663, `user.gateway.ts`, adapter, socket-server service | Giai đoạn 6 |
| `cronjobs` | 5 cronjob (gacha banner, leaderboard season, matchmaking, shop banner, user subscription), đăng ký trong `app.module.ts` | Chuyển về module sở hữu ở giai đoạn 4 |
| `i18n` | `message-keys.ts` 771 dòng; `vi/en/ja` ~780 dòng mỗi file; decorator `I18nLang` | Đích của migration message |
| `config` | `env.config.ts` (Zod), `swagger.config.ts` | — |

Dependency chưa thấy dùng trong `src`/`initialScript`: `typeorm`, `@nestjs/typeorm` (0 import). `class-validator`, `class-transformer`: 2 file mỗi package. Chỉ gỡ ở giai đoạn 7 sau khi xét scripts/build/test.

## 3. Cách đọc bảng module

- **Kiểu A**: `XRepo` + `.entity.ts` + không dùng `constants/message`. **Kiểu B**: `XRepository` + `.entities.ts`. **Lai**: phần còn lại (trộn quy ước, hoặc thiếu repo/entity).
- **Zod DTO**: `zod-dto` = có file `*.zod-dto.ts`; `dto` = class `createZodDto` nằm trong `*.dto.ts` (kể cả `dto/zod/*-zod.dto.ts`).
- **Message**: `i18n` = gọi `i18nService.translate`; `const` = import `common/constants/message`.
- **Tx**: số lần xuất hiện `$transaction`/`withTransaction`.
- **FE/MO file**: số file trong `src` của web/mobile chứa path controller (dạng `'/path`). **0 không có nghĩa là không dùng**: URL có thể được dựng động hoặc nằm trong hằng số. Phải xác minh consumer trước mỗi batch.
- WordType và Level là hai module mẫu của giai đoạn 2, không nằm trong rollout giai đoạn 3.

## 4. Module theo nhóm rollout (giai đoạn 3)

### 1. Danh mục / cấu hình (19 module)

| Module | Kiểu | Endpoint | Repo | Entity | Zod DTO | Swagger DTO riêng | Message | Lang | Tx | Soft delete | Translation | Pagination | FE/MO file | Ghi chú |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| languages | B | 10 | Repository | entities | dto | ✓ | const | - |  |  |  | cp/ps | 0/0 | thư mục zod/ lồng; chưa thấy consumer FE/MO theo path |
| meaning | B | 6 | Repository | entities | dto | ✓ | - | - |  |  |  | cp/ps+page/limit | 1/2 | có page/limit; thư mục zod/ lồng |
| translation | B | 9 | Repository | entities | zod-dto | ✓ | - | - |  | ✓ | ✓ | cp/ps+page/limit | 1/0 | có page/limit; thư mục zod/ lồng |
| wordtype | B | 8 | Repository | entities | dto | ✓ | i18n | I18nLang |  |  | ✓ | cp/ps+page/limit | 1/0 | mẫu giai đoạn 2; bắt lỗi bằng message.includes ×4; @UseGuards ×1; có page/limit; thư mục zod/ lồng |
| kanji-reading | B | 10 | Repository | entities | dto | ✓ | - | - |  |  |  | cp/ps+page/limit | 0/0 | nạp gián tiếp (indirect); bắt lỗi bằng message.includes ×4; có page/limit; thư mục zod/ lồng; chưa thấy consumer FE/MO theo path |
| level | lai | 5 | Repo | entity | zod-dto |  | i18n+const | I18nLang |  | ✓ |  | cp/ps | 4/2 | mẫu giai đoạn 2 |
| elemental-type | lai | 6 | Repo | entity | zod-dto |  | i18n+const | I18nLang |  | ✓ |  | cp/ps | 1/1 |  |
| type-effectiveness | lai | 9 | Repo | entity | dto |  | i18n+const | I18nLang |  | ✓ |  | cp/ps | 0/0 | chưa thấy consumer FE/MO theo path |
| pokemon | lai | 12 | Repo | entity | zod-dto | ✓ | i18n+const | I18nLang |  | ✓ |  | cp/ps | 12/27 |  |
| grammar | B | 5 | Repository | entities | zod-dto | ✓ | - | - | 1 |  | ✓ | cp/ps | 1/0 | @UseGuards ×1 |
| grammar-usage | B | 5 | Repository | entities | zod-dto | ✓ | - | - |  |  |  | cp/ps+page/limit | 0/0 | @UseGuards ×1; có page/limit; chưa thấy consumer FE/MO theo path |
| lesson-category | B | 7 | Repository | entities | zod-dto | ✓ | - | I18nLang |  |  | ✓ | cp/ps+page/limit | 1/2 | @UseGuards ×1; có page/limit |
| role | lai | 5 | Repo | model | dto |  | i18n | I18nLang |  | ✓ |  | cp/ps | 1/0 | dùng *.model.ts |
| permission | lai | 5 | Repo | model | dto |  | i18n | I18nLang |  | ✓ |  | cp/ps | 0/0 | dùng *.model.ts; chưa thấy consumer FE/MO theo path |
| feature | A | 5 | Repo | entity | zod-dto |  | i18n | I18nLang | 4 | ✓ | ✓ | cp/ps | 0/0 | @UseGuards ×1; chưa thấy consumer FE/MO theo path |
| achievement-group | A | 5 | Repo | entity | zod-dto |  | i18n | I18nLang | 4 | ✓ | ✓ | cp/ps | 0/0 | @UseGuards ×1; chưa thấy consumer FE/MO theo path |
| attendence-config | A | 5 | Repo | entity | zod-dto |  | i18n | I18nLang |  | ✓ |  | cp/ps | 0/1 |  |
| gemini-config | A | 24 | Repo | entity | zod-dto | ✓ | i18n | I18nLang |  | ✓ |  | cp/ps | 2/0 |  |
| shop-rarity-price | A | 5 | Repo | entity | dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 2/0 |  |

### 2. Nội dung học (12 module)

| Module | Kiểu | Endpoint | Repo | Entity | Zod DTO | Swagger DTO riêng | Message | Lang | Tx | Soft delete | Translation | Pagination | FE/MO file | Ghi chú |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| vocabulary | B | 13 | Repository | entities | zod-dto | ✓ | const | I18nLang | 2 |  | ✓ | cp/ps | 6/10 |  |
| kanji | B | 11 | Repository | entities | zod-dto | ✓ | const | - | 1 |  | ✓ | cp/ps | 5/13 | bắt lỗi bằng message.includes ×6; thư mục zod/ lồng |
| lesson | B | 7 | Repository | entities | zod-dto | ✓ | const | query |  |  | ✓ | cp/ps | 2/3 | @UseGuards ×1; lang qua @Query('lang') |
| lesson-content | B | 7 | Repository | entities | zod-dto | ✓ | - | query |  |  | ✓ | cp/ps+page/limit | 2/1 | @UseGuards ×1; lang qua @Query('lang'); có page/limit |
| exercises | B | 7 | Repository | entities | zod-dto | ✓ | const | I18nLang |  |  | ✓ | cp/ps | 4/2 | @UseGuards ×1 |
| answer | B | 6 | Repository | entities | zod-dto | ✓ | - | I18nLang |  |  | ✓ | cp/ps | 1/1 | @UseGuards ×1 |
| question-bank | B | 8 | Repository | entities | zod-dto | ✓ | const | I18nLang | 3 |  | ✓ | cp/ps | 2/0 |  |
| testset | B | 9 | Repository | entities | zod-dto | ✓ | const | I18nLang | 5 |  | ✓ | cp/ps | 1/0 |  |
| testset-questionbank | B | 11 | Repository | entities | zod-dto | ✓ | const | I18nLang |  |  |  | - | 1/0 |  |
| test | B | 15 | Repository | entities | zod-dto | ✓ | const | I18nLang | 5 |  | ✓ | cp/ps | 6/14 |  |
| speaking | B | 8 | Repository | entities | zod-dto | ✓ | - | I18nLang |  |  |  | cp/ps | 7/4 |  |
| flashcard | B | 13 | Repository | entities | zod-dto | ✓ | - | I18nLang | 7 | ✓ |  | cp/ps | 0/4 |  |

### 3. User / tiến độ (20 module)

| Module | Kiểu | Endpoint | Repo | Entity | Zod DTO | Swagger DTO riêng | Message | Lang | Tx | Soft delete | Translation | Pagination | FE/MO file | Ghi chú |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| auth | B | 16 | Repository | entities | zod-dto | ✓ | i18n+const | I18nLang |  | ✓ |  | - | 7/21 | @UseGuards ×3 |
| user | lai | 9 | Repo | entity | zod-dto |  | i18n+const | I18nLang |  | ✓ |  | cp/ps | 6/33 |  |
| user-progress | B | 12 | Repository | entities | zod-dto | ✓ | - | - |  |  |  | cp/ps | 0/1 |  |
| user-history | B | 5 | Repository | entities | zod-dto | ✓ | i18n | I18nLang |  |  | ✓ | cp/ps | 0/4 |  |
| user-exercise-attempt | B | 13 | Repository | entities | zod-dto | ✓ | i18n+const | I18nLang |  |  |  | cp/ps | 0/13 |  |
| user-answer-log | B | 6 | Repository | entities | zod-dto | ✓ | - | - |  |  |  | cp/ps | 0/3 |  |
| user-test | B | 8 | Repository | entities | zod-dto | ✓ | const | I18nLang |  | ✓ |  | cp/ps+page/limit | 0/7 | có page/limit |
| user-test-attempt | B | 13 | Repository | entities | zod-dto | ✓ | i18n+const | I18nLang |  |  |  | cp/ps | 0/1 |  |
| user-test-answer-log | B | 6 | Repository | entities | zod-dto | ✓ | const | - |  |  |  | cp/ps | 0/2 |  |
| user-srs-review | B | 5 | Repository | entities | zod-dto | ✓ | const | I18nLang |  |  |  | cp/ps | 0/5 |  |
| user-achievement | A | 7 | Repo | entity | dto |  | i18n | I18nLang | 3 | ✓ |  | cp/ps | 0/1 |  |
| achievement | A | 5 | Repo | entity | zod-dto |  | i18n | I18nLang | 4 | ✓ | ✓ | cp/ps | 0/3 | @UseGuards ×1 |
| daily-request | A | 7 | Repo | entity | zod-dto |  | i18n | I18nLang | 4 | ✓ | ✓ | cp/ps | 1/0 | @UseGuards ×1 |
| user-daily-request | A | 6 | Repo | entity | zod-dto |  | i18n | I18nLang |  | ✓ | ✓ | cp/ps | 0/0 | @UseGuards ×1; chưa thấy consumer FE/MO theo path |
| attendance | A | 6 | Repo | entity | zod-dto | ✓ | i18n | I18nLang |  | ✓ |  | cp/ps | 0/2 | console.log ×7; file rỗng: create-attendence.swagger.ts |
| notification | lai | 8 | - | entity | dto |  | - | I18nLang |  | ✓ |  | - | 0/5 | không có repo |
| dashboard | A | 20 | Repo | entity | - |  | - | I18nLang | 2 | ✓ |  | cp/ps | 5/0 | file rỗng: dashboard.entity.ts |
| user-pokemon | lai | 11 | Repo | entity | dto |  | i18n+const | I18nLang |  | ✓ |  | cp/ps | 0/14 | console.log ×7 |
| ai-conversation-room | B | 6 | Repository | entities | - |  | - | - |  | ✓ |  | cp/ps | 0/1 |  |
| user-ai-conversation | B | 7 | Repository | entities | zod-dto | ✓ | - | - |  | ✓ |  | cp/ps | 0/0 | chưa thấy consumer FE/MO theo path |

### 4. Kinh tế / subscription (19 module)

| Module | Kiểu | Endpoint | Repo | Entity | Zod DTO | Swagger DTO riêng | Message | Lang | Tx | Soft delete | Translation | Pagination | FE/MO file | Ghi chú |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| reward | lai | 8 | Repo | entity | zod-dto | ✓ | i18n+const | I18nLang | 4 | ✓ | ✓ | cp/ps | 10/5 | @UseGuards ×1 |
| user-reward-history | B | 6 | Repository | entities | zod-dto | ✓ | - | I18nLang |  |  | ✓ | cp/ps | 0/1 |  |
| wallet | A | 7 | Repo | entity | zod-dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 0/4 | @UseGuards ×1 |
| wallet-transaction | A | 4 | Repo | entity | zod-dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 0/0 | @UseGuards ×1; chưa thấy consumer FE/MO theo path |
| shop-banner | A | 8 | Repo | entity | zod-dto |  | i18n | I18nLang | 4 | ✓ | ✓ | cp/ps | 1/3 | console.log ×9; @UseGuards ×1 |
| shop-item | A | 8 | Repo | entity | dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 1/0 |  |
| shop-purchase | A | 6 | Repo | entity | dto |  | i18n | I18nLang | 5 | ✓ |  | cp/ps | 0/3 |  |
| gacha-banner | A | 7 | Repo | entity | zod-dto |  | i18n | I18nLang | 4 | ✓ | ✓ | cp/ps | 1/1 | console.log ×8; @UseGuards ×1 |
| gacha-item | A | 8 | Repo | entity | dto |  | i18n | I18nLang | 4 | ✓ |  | cp/ps | 1/1 |  |
| gacha-item-rate | A | 5 | Repo | entity | dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 0/0 | chưa thấy consumer FE/MO theo path |
| gacha-purchase | A | 6 | Repo | entity | dto |  | i18n | I18nLang | 3 | ✓ |  | cp/ps | 0/1 |  |
| gacha-roll-history | A | 6 | Repo | entity | dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 0/1 |  |
| user-gacha-pity | lai | 6 | Repo | - | dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 0/1 | tên file thiếu dấu chấm: user-gacha-pityentity.ts |
| invoice | A | 5 | Repo | entity | dto |  | i18n | I18nLang | 4 | ✓ |  | cp/ps | 0/3 | console.log ×8 |
| payment | lai | 3 | Repo | model | - |  | i18n | I18nLang | 1 | ✓ |  | - | 0/1 | dùng *.model.ts |
| subscription | A | 7 | Repo | entity | zod-dto |  | i18n | I18nLang | 4 | ✓ | ✓ | cp/ps | 2/10 | @UseGuards ×1 |
| subscription-plan | A | 7 | Repo | entity | dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 0/0 | chưa thấy consumer FE/MO theo path |
| subscription-feature | A | 4 | Repo | entity | dto |  | i18n | I18nLang | 3 | ✓ |  | cp/ps | 0/0 | chưa thấy consumer FE/MO theo path |
| user-subscription | A | 7 | Repo | entity | dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 0/4 |  |

### 5. Battle / realtime (11 module)

| Module | Kiểu | Endpoint | Repo | Entity | Zod DTO | Swagger DTO riêng | Message | Lang | Tx | Soft delete | Translation | Pagination | FE/MO file | Ghi chú |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| match | A | 6 | Repo | entity | zod-dto |  | i18n | I18nLang | 4 | ✓ |  | cp/ps | 0/2 | @UseGuards ×1 |
| match-queue | A | 2 | Repo | entity | zod-dto |  | i18n | I18nLang | 1 | ✓ |  | - | 0/1 |  |
| match-participant | A | 5 | Repo | entity | dto |  | i18n | I18nLang | 3 | ✓ |  | cp/ps | 0/1 |  |
| match-round | A | 6 | Repo | entity | zod-dto |  | i18n | I18nLang | 4 | ✓ |  | cp/ps | 0/1 | @UseGuards ×1 |
| match-round-participant | A | 6 | Repo | entity | dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 0/1 |  |
| round-question | A | 6 | Repo | entity | dto |  | i18n | I18nLang | 3 | ✓ |  | cp/ps | 0/1 | console.log ×27 |
| round-question-answerlog | A | 5 | Repo | entity | dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 0/0 | chưa thấy consumer FE/MO theo path |
| debuff-round | lai | 5 | Repo | entity | zod-dto |  | i18n+const | I18nLang | 4 | ✓ | ✓ | cp/ps | 0/0 | @UseGuards ×1; chưa thấy consumer FE/MO theo path |
| leaderboard-season | A | 7 | Repo | entity | zod-dto |  | i18n | I18nLang | 4 | ✓ | ✓ | cp/ps | 2/1 | @UseGuards ×1 |
| season-rank-reward | A | 6 | Repo | entity | dto |  | i18n | I18nLang | 3 | ✓ |  | cp/ps | 1/0 |  |
| user-season-history | A | 7 | Repo | entity | dto |  | i18n | I18nLang | 2 | ✓ |  | cp/ps | 0/1 |  |

