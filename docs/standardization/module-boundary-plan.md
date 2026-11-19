# Plan ranh giới module backend (chi tiết hóa giai đoạn 4)

Trạng thái: **design-approved** (D-MB1–D-MB4 chốt 2026-11-17). Viết từ code `dev` @ `5ec0e64` (2026-11-17), chỉ đọc code. Tài liệu này chi tiết hóa mục 1–3 của giai đoạn 4 và bổ sung giai đoạn 6 trong [BACKEND_STANDARDIZATION_PLAN.md](../../BACKEND_STANDARDIZATION_PLAN.md). Mục 3 của plan chính ("capability nằm trong module sở hữu, import/export rõ") là nguyên tắc; ở đây là quy tắc đo được, baseline, thứ tự batch và gate. Không đổi route, response contract, job name, queue name, schedule hay socket event.

## 1. Vấn đề

Kiến trúc đích là feature module 3 lớp (controller → service → repo). Lớp trong từng module đã đúng: controller không gọi Prisma hay Repo. Sai ở **ranh giới giữa các module**:

1. Service inject thẳng Repo của module khác → bỏ qua validate, i18n, transaction và invariant của module sở hữu (ví dụ trừ ví có điều kiện ở T7 chỉ an toàn khi mọi nơi đi qua cùng một đường).
2. `SharedModule` là `@Global` và export Repo nghiệp vụ, nên module nào cũng inject được mà không cần `imports` → phụ thuộc không hiện ra trong module graph.
3. Phụ thuộc vòng giữa module, che bằng `forwardRef`.
4. Cronjob, processor, gateway và một số service gọi Prisma trực tiếp, nghiệp vụ không có owner.

## 2. Baseline (đo ngày 2026-11-17, `dev` @ `5ec0e64`)

Số đo bằng phân tích import tĩnh (không tính `*.spec.ts`). Số query Prisma là số lần khớp regex, chỉ để so sánh tương đối.

### 2.1 Import Repo của module khác

- **167** câu import, trong **67** file, thuộc **52** owner. Theo loại file: service 143, module 13, gateway 4, cronjob 3, processor 3, repo 1.
- Repo bị import chéo nhiều nhất:

| Repo đích                                 | Số import | Ghi chú                                                                      |
| ----------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| languages                                 | 29        | Chủ yếu `getIdByCode` (51 lần gọi), `getWithListCode`, `getWithListId`       |
| translation                               | 12        | `validateTranslationRecords`, `deleteByKey`, `createOrUpdateWithTransaction` |
| shared-user.repo                          | 12        | Repo user nằm ở `shared/`, thực chất thuộc user                              |
| pokemon                                   | 9         | Đọc catalog                                                                  |
| user-pokemon                              | 8         | Cấp pokemon từ shop, gacha, reward                                           |
| leaderboard-season, wallet, question-bank | 7 mỗi cái |                                                                              |
| wallet-transaction                        | 6         | Luôn đi cùng wallet                                                          |
| match                                     | 5         | Trong nhóm battle                                                            |

`LanguagesService` và `TranslationService` đã có sẵn và đã được `user-reward-history` dùng, nên 41 import đầu bảng là thay thế gần như cơ học.

- Module tự khai báo Repo của module khác trong `providers` (tạo instance thứ hai): `lesson-content` ← `GrammarRepo`; `test` ← `UserTestRepo`, `UserTestAttemptRepo`; `user` ← `LevelRepo`, `UserPokemonRepo`; `user-test-attempt` ← `UserTestRepo`.
- `SharedModule` (`@Global`) export Repo nghiệp vụ: `LanguagesRepo`, `QuestionBankRepo`, `PokemonRepo`, `InvoiceRepo`, `UserSubscriptionRepo`, `WalletRepo`, `WalletTransactionRepo`, cùng `UserGateway`, `SharedUserSubscriptionService`, `SharedNotificationService` và `InvoiceExpirationProcessor`.

### 2.2 Phụ thuộc vòng

17 file module dùng `forwardRef`, 8 file dùng `@Inject(forwardRef(...))`:

| Cụm         | Vòng                                                                                                      | Nguyên nhân đọc được                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Billing     | invoice ↔ payment                                                                                        | `InvoiceService` gọi `PaymentService` và ngược lại                                         |
| Kinh tế lõi | user ↔ wallet                                                                                            | `WalletService` dùng `UserRepo`, `UserService` dùng `WalletService`                        |
| Reward      | reward ↔ user, wallet, user-reward-history; user-season-history → reward                                 | `user-reward-history` đọc `RewardRepo` để lấy tên; `reward` gọi `UserRewardHistoryService` |
| Shop        | shop-item, shop-purchase, shop-rarity-price ↔ shop-banner                                                | Bốn service inject Repo của nhau                                                           |
| Gacha       | gacha-item ↔ gacha-banner                                                                                | Như shop                                                                                   |
| Battle      | match-round ↔ match-round-participant; match-participant → cả hai; match → leaderboard-season, languages | Luồng trận chia ra nhiều module nhưng là một quy trình                                     |
| Hạ tầng     | shared ↔ websockets → gemini-config                                                                      | `SharedModule` export `UserGateway` và import `WebsocketsModule`                           |

### 2.3 Prisma ngoài Repo

| Nhóm                         | File (số query ước lượng)                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cronjob                      | `handle-leaderboard-season` (20), `handle-shop-banner` (10), `handle-gacha-banner` (9), `handle-user-subscription` (3)                                                                                                                                                                                                                                                                              |
| Processor (`shared/workers`) | `match-round-participant-timeout` (36), `round-question-timeout` (19), `user-deletion` (1); `invoice-expiration`, `match-participant-timeout` dùng `$transaction`                                                                                                                                                                                                                                   |
| Service                      | `test` (35), `match-round-participant` (24), `round-question` (21), `vocabulary.helper` (19), `user-history` (18), `dashboard` (9), `leaderboard-season` (9), `user-test-attempt` (9), `user-achievement` (5), `user-srs-review` (4), `pokemon`, `user-pokemon` (3), `match`, `user-test` (2), `speaking` (1); `achievement`, `achievement-group`, `user-subscription` inject nhưng chưa thấy query |
| Gateway                      | `user.gateway` (4)                                                                                                                                                                                                                                                                                                                                                                                  |
| 3rdService                   | `vertex-ai.service` (4), `gemini.service` (1)                                                                                                                                                                                                                                                                                                                                                       |

## 3. Quy tắc đích

- **R1 — Repo là private.** Chỉ service/provider của chính module inject Repo của nó. `exports` của module là service (hoặc service truy vấn hẹp), không phải Repo.
- **R2 — Phụ thuộc chéo đi qua service đã export.** Module A `imports` module B và inject service của B. Ghi vào bảng của B **chỉ** qua service của B.
- **R3 — Transaction xuyên module.** Service điều phối mở `$transaction`; method của module sở hữu nhận tham số `tx?: Prisma.TransactionClient` và dùng nó (convention mục 4). Không tách một transaction thành nhiều transaction khi chuyển sang gọi service.
- **R4 — Ngoại lệ read model.** Repo của module báo cáo (`dashboard`, bảng xếp hạng) được đọc nhiều bảng qua Prisma relation hoặc include, **chỉ đọc**, ghi chú ngay trong repo. `include` quan hệ để hiển thị (ví dụ lịch sử thưởng kèm tên reward) cũng được, miễn là không ghi.
- **R5 — Không Prisma ngoài Repo.** Service, gateway, cronjob, processor gọi Repo của module mình hoặc service của module khác. Cronjob/processor nằm trong module sở hữu (giai đoạn 4.3), giữ nguyên job name, queue name, schedule.
- **R6 — Không vòng.** Hướng phụ thuộc từ trên xuống, tầng dưới không biết tầng trên:

```text
Tầng 4  Điều phối  : reward, shop-purchase, gacha-purchase, payment/checkout, match flow, user (profile tổng hợp), dashboard
Tầng 3  Tiến độ    : user-progress, user-test-*, user-srs-review, user-reward-history, user-season-history, ...
Tầng 2  Kinh tế lõi: wallet (+ wallet-transaction), user-pokemon, user-subscription, invoice
Tầng 1  Catalog    : pokemon, level, question-bank, lesson/vocabulary/kanji/grammar, leaderboard-season, banner/item
Tầng 0  Kernel     : languages, translation, user-core (đọc/ghi bảng User), role/permission
Hạ tầng            : PrismaService, config, queue, mail, PayOS, Gemini, socket server
```

Cách gỡ vòng, theo thứ tự ưu tiên: (a) chuyển phần dùng chung xuống tầng dưới; (b) đưa luồng điều phối lên module tầng trên. Không gộp module (D-MB1), hướng từng cụm ở mục 5. Không thêm event bus (`@nestjs/event-emitter` chưa cài) trừ khi có ADR riêng.

- **R7 — SharedModule chỉ còn hạ tầng.** `PrismaService`, hashing, token, guard. Không Repo, service hay gateway nghiệp vụ.

## 4. Thứ tự batch

Mỗi batch: nhánh từ `dev`, merge `dev`, cập nhật tracker mục 12. Không đổi behavior, nên **contract snapshot e2e giữ nguyên là bằng chứng chính**. Sửa lỗi phát hiện trong lúc làm thì tách commit có regression test riêng.

| Batch | Phạm vi                                                                                                                                                                                                                                                                                                 | Giảm dự kiến                             | Điều kiện bắt đầu                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| B0    | Thêm `scripts/arch/module-deps.mjs` + `npm run arch:deps`, lưu baseline JSON; script fail nếu bất kỳ chỉ số nào tăng so với baseline (ratchet). Không đổi code src                                                                                                                                      | 0, nhưng chặn tăng                       | Ngay                                                                |
| B1    | Kernel i18n: thay `LanguagesRepo`/`TranslationRepo` bằng `LanguagesService`/`TranslationService` (bổ sung method thiếu, giữ chữ ký); bỏ `LanguagesRepo` khỏi `SharedModule`; bỏ `forwardRef(LanguagesModule)` ở match                                                                                   | ~41 import                               | Sau B0                                                              |
| B2    | User core: đưa `SharedUserRepository`, `SharedRoleRepository` về module sở hữu, export `UserCoreService`/`RoleService` không phụ thuộc gì ở tầng trên; module tự khai báo Repo khác (2.1) chuyển sang import module                                                                                     | ~14 import + 6 provider trùng            | Sau B1                                                              |
| B3    | Catalog: `PokemonService`, `LevelService`, `QuestionBankService`, `LeaderboardSeasonService` (truy vấn); bỏ `PokemonRepo`, `QuestionBankRepo` khỏi `SharedModule`                                                                                                                                       | ~27 import                               | Sau B2                                                              |
| B4    | Kinh tế lõi: `WalletService.debit/credit(tx, ...)` gói cả ghi `wallet-transaction` và trừ có điều kiện (T7); `UserPokemonService.grant(tx, ...)`; `UserSubscriptionService`, `InvoiceService` cho truy vấn. Gỡ vòng user ↔ wallet (wallet không đọc `UserRepo`). Bỏ 4 Repo kinh tế khỏi `SharedModule` | ~30 import, 1 vòng                       | Sau B3; contract baseline admin nhóm 4 (6b–6d) xong                 |
| B5    | Gỡ vòng kinh tế: shop và gacha theo hướng ở mục 5; reward ↔ user-reward-history/user-season-history theo R4 + R6; invoice ↔ payment                                                                                                                                                                   | 7 vòng                                   | Sau B4; invoice ↔ payment cần duyệt thiết kế vì chạm ADR D1        |
| B6    | Battle (match, match-queue, match-participant, match-round, match-round-participant, round-question, round-question-answerlog, debuff-round) theo hướng ở mục 5; chuyển 3 timeout processor và cron matchmaking về; tách `UserGateway` khỏi `SharedModule`, gỡ vòng shared ↔ websockets                | 4 vòng + phần lớn Prisma trong processor | Sau Phase 3 nhóm 5 (Battle) có contract baseline và test socket/job |
| B7    | Quét Prisma còn lại: cronjob banner/leaderboard/subscription về module sở hữu; service ở 2.3 chuyển query vào repo của mình hoặc gọi service owner; `user.gateway`; `vertex-ai`/`gemini` qua `GeminiConfigService`                                                                                      | Prisma ngoài repo → 0 (trừ R4)           | Song song B3–B6 theo module đang chạm                               |
| B8    | Đóng: `SharedModule` chỉ còn hạ tầng (R7); chỉ số = 0 hoặc nằm trong danh sách ngoại lệ có lý do; cập nhật [backend-convention.md](backend-convention.md) với R1–R7                                                                                                                                     |                                          | Sau B1–B7                                                           |

Sau B8 mới làm giai đoạn 6 (tách service lớn). Lúc đó ranh giới đã rõ, nên tách theo use case dễ hơn. Bổ sung `round-question.service.ts` (1273 dòng) vào danh sách giai đoạn 6.

## 5. Gỡ vòng giữ nguyên cấu trúc module

D-MB1: giữ nguyên các module hiện có, không gộp, không di chuyển thư mục. Shop, gacha, battle cũng theo R1–R2 như mọi module khác. Hướng phụ thuộc dự kiến cho từng cụm (chốt lại khi đọc kỹ code ở đầu mỗi batch, ghi vào tracker nếu khác):

| Cụm     | Tầng dưới (không phụ thuộc ngược)                                                | Tầng trên (điều phối)                                                                                      |
| ------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Shop    | shop-rarity-price, shop-item                                                     | shop-banner đọc item qua `ShopItemService`; shop-purchase đứng trên cùng                                   |
| Gacha   | gacha-item-rate, gacha-item                                                      | gacha-banner đọc item qua service; gacha-purchase đứng trên cùng                                           |
| Reward  | user-reward-history (chỉ ghi/đọc lịch sử, lấy tên reward bằng `include` theo R4) | reward cấp thưởng; user-season-history gọi `RewardService`                                                 |
| Billing | invoice (dữ liệu hóa đơn)                                                        | payment tạo link và xử lý callback; `InvoiceService` không gọi `PaymentService` (cần duyệt vì chạm ADR D1) |
| Battle  | match-round, round-question (dữ liệu)                                            | match-round-participant, match-participant và timeout processor điều phối luồng trận                       |

Nếu một cặp không gỡ được bằng (a) hoặc (b) mà không đổi behavior, giữ `forwardRef` và ghi lý do vào danh sách ngoại lệ, không ép.

## 6. Gate

Mỗi batch:

- Typecheck 0, unit pass, e2e pass với **snapshot không đổi**. e2e boot `AppModule` nên lỗi DI (thiếu provider sau khi bỏ `@Global` export) lộ ra ở đây.
- `npm run arch:deps` không tăng chỉ số nào, và giảm đúng phần của batch. Cập nhật baseline JSON trong cùng commit.
- Không provider, cron, queue hay socket gateway nào bị đăng ký hai lần (kiểm bằng log khởi động hoặc test).
- B4, B5: test đồng thời đã có (`test/wallet`, `test/shop`, `test/gacha`, `test/invoice`, `test/payment`, `test/reward`) phải pass. Không đổi thứ tự ghi trong transaction.
- B6: test timeout đối đầu submit, retry/duplicate job (giai đoạn 6 của plan chính) phải có trước khi chuyển processor.

Gate cuối (B8): import Repo chéo = 0, `forwardRef` = 0 hoặc có lý do ghi rõ, Prisma ngoài repo chỉ còn ngoại lệ R4, `SharedModule` không còn provider nghiệp vụ.

## 7. Rủi ro

| Rủi ro                                                                                        | Giảm thiểu                                                                             |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Bỏ export khỏi `SharedModule` (global) làm module khác không resolve được dependency lúc boot | Bỏ từng Repo một; e2e boot `AppModule`; thêm `imports` tường minh trước khi xóa export |
| Tách transaction khi chuyển từ Repo sang service                                              | R3: method service nhận `tx`; review từng chỗ có `$transaction`; test đồng thời B4–B5  |
| Service owner có validate/side effect mà chỗ gọi cũ không có (đổi behavior ngầm)              | Thêm method truy vấn hẹp không side effect; snapshot e2e phát hiện thay đổi response   |
| Thêm query thừa (service gọi thêm `findById` để kiểm tồn tại)                                 | Method truy vấn hẹp, không kiểm lại những gì caller đã kiểm                            |
| Vòng import mức file TypeScript (khác vòng module Nest)                                       | Import theo `@/modules/<owner>/<owner>.service`, không qua barrel                      |
| Diff lớn khó review                                                                           | Batch nhỏ theo bảng ở mục 4; commit di chuyển file tách khỏi commit đổi logic          |

## 8. Quyết định

- **D-MB1 — chốt 2026-11-17: giữ nguyên module.** Không gộp shop, gacha, battle, billing; gỡ vòng theo mục 5.
- **D-MB2 — chốt 2026-11-17: import tường minh.** `LanguagesModule`/`TranslationModule` không `@Global`; mỗi module dùng thì khai báo `imports` và inject `LanguagesService`/`TranslationService`. Module graph phản ánh đúng phụ thuộc. Global chỉ còn cho hạ tầng (R7).
- **D-MB3 — chốt 2026-11-17: chấp nhận ngoại lệ R4.** Repo `dashboard` và truy vấn xếp hạng được đọc thẳng nhiều bảng, chỉ đọc, có ghi chú trong repo; mọi thao tác ghi vẫn theo R1–R2. Bối cảnh: `dashboard` là trang thống kê admin (20 route GET: doanh thu gói, tăng trưởng user, streak, battle, gacha, mùa xếp hạng), repo của nó đọc 17 bảng thuộc khoảng 12 module khác. Nếu không có ngoại lệ, mỗi module đó phải thêm method thống kê riêng chỉ để dashboard gọi.
- **D-MB4 — chốt 2026-11-17: theo đề xuất.** B0 làm ngay; B1–B3 chạy xen với phần còn lại của phase 3 (không chạm nhóm 5); B4–B5 sau contract baseline admin nhóm 4; B6 sau nhóm 5. Giai đoạn 4 vẫn không làm cùng lúc với response rewrite (giai đoạn 5).
