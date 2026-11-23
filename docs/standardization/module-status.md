# Trạng thái module backend — giai đoạn 7 (Z2)

File sinh tự động bằng `node scripts/inventory/module-status.mjs` (đọc tĩnh `src/` và `test/`). Không sửa tay; đếm lại khi source đổi. Bảng gốc giai đoạn 0 (81 module, 616 endpoint): [inventory.md](inventory.md).

## 1. Tổng quan

- **85 module** trong `src/modules` (81 module cũ + `gemini`, `mail`, `speech`, `upload` chuyển từ `3rdService` ở giai đoạn 4), **626 endpoint**, 695 file code (không tính spec), 106361 dòng.
- Bucket ngoài modules: `app.module.ts`, `common`, `config`, `cronjobs`, `i18n`, `infrastructure`, `main.ts`, `shared`, `websockets`.
- Trạng thái: inventoried 85/85 · contract-covered 68 (+1 module không có route) · standardized 8 (+1 ngoại lệ đã ghi) · extracted-if-needed: đã tách 9, không cần 73, còn mở 3 · verified 8.
- Tín hiệu toàn modules: `console.*` 31, `any` 1131, `eslint-disable` 0, import `common/constants/message` 10, import `src/...` 106.

## 2. Quy tắc trạng thái

- **inventoried**: có mặt trong bảng này với số đếm từ source hiện tại.
- **contract-covered**: ít nhất một `test/**/*.e2e-spec.ts` chứa đường dẫn bắt đầu bằng prefix `@Controller` của module (chuỗi `'/prefix`). Là tín hiệu tĩnh: không chứng minh mọi route đều có test. `—` = module không có controller.
- **standardized**: không có lỗ hổng nào trong cột "Còn lệch": repo tên `XRepo` trong `*.repo.ts`; file entity `.entity.ts`; có `*.zod-dto.ts` nếu có route; mọi route có `@ZodSerializerDto` hoặc là route `@Res()` (stream/redirect/multi-status); không `console.*`; không import `common/constants/message`; không import `src/...`; không mục `arch:deps` ngoài baseline. `ngoại lệ` = chỉ còn mục `arch:deps` đã ghi lý do trong baseline (backend-convention mục 9).
- **extracted-if-needed**: theo giai đoạn 6 (tách theo trách nhiệm, không theo số dòng). `✓ Xn` = đã tách; `không cần` = không có file nào trên 1000 dòng và không nằm trong danh sách tách; `cần xét` = có file trên 1000 dòng chưa được xét; `✗` = việc tách còn mở trong tracker.
- **verified**: contract-covered (hoặc không có route), standardized hoặc ngoại lệ, extracted không còn mở, và có ít nhất một unit spec hoặc e2e spec chạm module.

## 3. Module

### catalog (19)

| Module | Route | Serializer | Unit | E2e | File lớn nhất (dòng) | any | Contract | Standardized | Extracted | Verified | Còn lệch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| achievement-group | 5 | 5 | 0 | 0 | achievement-group.service.ts (407) | 29 | ✗ | ✗ | không cần | ✗ | import src/ ×1 |
| attendence-config | 5 | 5 | 0 | 2 | attendence-config.repo.ts (130) | 0 | ✓ | ✓ | không cần | ✓ |  |
| elemental-type | 6 | 6 | 0 | 1 | elemental-type.repo.ts (137) | 0 | ✓ | ✗ | không cần | ✗ | constants/message |
| feature | 5 | 5 | 0 | 0 | feature.service.ts (387) | 32 | ✗ | ✗ | không cần | ✗ | import src/ ×1 |
| gemini-config | 24 | 12 | 1 | 0 | gemini-config.service.ts (379) | 32 | ✗ | ✗ | không cần | ✗ | serializer thiếu 12; import src/ ×5 |
| grammar | 5 | 2 | 1 | 1 | grammar.repo.ts (252) | 0 | ✓ | ✗ | không cần | ✗ | serializer thiếu 3 |
| grammar-usage | 5 | 5 | 1 | 1 | dto/grammar-usage.dto.ts (183) | 0 | ✓ | ✓ | không cần | ✓ |  |
| kanji-reading | 10 | 4 +2 msg | 1 | 1 | kanji-reading.controller.ts (246) | 0 | ✓ | ✗ | không cần | ✗ | serializer thiếu 4 |
| languages | 10 | 6 +2 msg | 1 | 3 | languages.controller.ts (340) | 0 | ✓ | ✗ | không cần | ✗ | serializer thiếu 2 |
| lesson-category | 7 | 6 | 1 | 2 | lesson-category.service.ts (324) | 0 | ✓ | ✗ | không cần | ✗ | serializer thiếu 1 |
| level | 5 | 5 | 1 | 3 | level.repo.ts (182) | 0 | ✓ | ✗ | không cần | ✗ | constants/message |
| meaning | 6 | 3 +1 msg | 1 | 1 | meaning.controller.ts (218) | 0 | ✓ | ✗ | không cần | ✗ | serializer thiếu 2 |
| permission | 5 | 5 | 0 | 0 | permission.repo.ts (119) | 0 | ✗ | ✗ | không cần | ✗ | thiếu zod-dto; import src/ ×17 |
| pokemon | 8 | 8 | 0 | 0 | pokemon.repo.ts (1037) | 18 | ✗ | ✗ | cần xét (1037 dòng) | ✗ | console ×4; constants/message; import src/ ×2 |
| role | 5 | 5 | 0 | 0 | role.repo.ts (157) | 5 | ✗ | ✗ | không cần | ✗ | thiếu zod-dto; import src/ ×21 |
| shop-rarity-price | 5 | 5 | 0 | 1 | shop-rarity-price.service.ts (176) | 2 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| translation | 9 | 0 +1 msg | 1 | 1 | translation.repo.ts (438) | 0 | ✓ | ✗ | không cần | ✗ | serializer thiếu 8; console ×1 |
| type-effectiveness | 9 | 5 | 1 | 1 | type-effectiveness.repo.ts (216) | 0 | ✓ | ✗ | không cần | ✗ | serializer thiếu 4; constants/message |
| wordtype | 8 | 5 +2 msg | 1 | 3 | wordtype.service.ts (399) | 1 | ✓ | ✗ | không cần | ✗ | serializer thiếu 1 |

### content (12)

| Module | Route | Serializer | Unit | E2e | File lớn nhất (dòng) | any | Contract | Standardized | Extracted | Verified | Còn lệch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| answer | 6 | 6 | 2 | 1 | answer.service.ts (591) | 1 | ✓ | ngoại lệ | không cần | ✓ |  |
| exercises | 7 | 0 +1 msg | 1 | 1 | exercises.service.ts (258) | 0 | ✓ | ✗ | không cần | ✗ | serializer thiếu 6 |
| flashcard | 14 | 14 | 0 | 1 | flashcard.service.ts (857) | 15 | ✓ | ✓ | không cần | ✓ |  |
| kanji | 11 | 6 +1 msg | 2 | 2 | kanji-import.service.ts (417) | 20 | ✓ | ✗ | ✓ X5 | ✗ | serializer thiếu 4 |
| lesson | 7 | 7 | 1 | 1 | dto/lesson.dto.ts (288) | 0 | ✓ | ✓ | không cần | ✓ |  |
| lesson-content | 6 | 2 | 0 | 0 | lesson-content.service.ts (828) | 1 | ✗ | ✗ | không cần | ✗ | tên repo; file entity; serializer thiếu 4 |
| question-bank | 7 | 2 +1 @Res | 1 | 1 | question-bank.repo.ts (497) | 5 | ✓ | ✗ | không cần | ✗ | serializer thiếu 4 |
| speaking | 8 | 8 | 0 | 0 | speaking.service.ts (319) | 9 | ✗ | ✗ | không cần | ✗ | tên repo; file entity |
| test | 15 | 1 | 1 | 1 | test-question-picker.service.ts (875) | 45 | ✓ | ✗ | ✓ X4 | ✗ | serializer thiếu 14 |
| testset | 9 | 2 | 1 | 1 | dto/testset.dto.ts (859) | 0 | ✓ | ✗ | không cần | ✗ | serializer thiếu 7 |
| testset-questionbank | 11 | 0 +1 @Res +1 msg | 1 | 1 | testset-questionbank.service.ts (342) | 4 | ✓ | ✗ | không cần | ✗ | serializer thiếu 9 |
| vocabulary | 13 | 9 | 1 | 3 | vocabulary.service.ts (935) | 31 | ✓ | ✗ | ✓ X5 | ✗ | serializer thiếu 4; constants/message |

### user (20)

| Module | Route | Serializer | Unit | E2e | File lớn nhất (dòng) | any | Contract | Standardized | Extracted | Verified | Còn lệch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| achievement | 5 | 5 | 0 | 1 | achievement.service.ts (522) | 42 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| ai-conversation-room | 6 | 4 | 0 | 1 | ai-conversation-room.service.ts (118) | 0 | ✓ | ✗ | ✓ X7 (gateway) | ✗ | serializer thiếu 2 |
| attendance | 6 | 6 | 0 | 1 | attendance.service.ts (377) | 2 | ✓ | ✗ | không cần | ✗ | console ×6; import src/ ×5 |
| auth | 17 | 13 +1 @Res | 2 | 9 | auth.service.ts (620) | 0 | ✓ | ✗ | không cần | ✗ | tên repo; file entity; serializer thiếu 3; constants/message; import src/ ×5 |
| daily-request | 7 | 7 | 0 | 1 | daily-request.service.ts (469) | 64 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| dashboard | 20 | 0 | 0 | 1 | dashboard.repo.ts (1778) | 7 | ✓ | ✗ | cần xét (1778 dòng) | ✗ | serializer thiếu 20; import src/ ×2 |
| notification | 8 | 8 | 0 | 1 | notification.service.ts (198) | 3 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| user | 9 | 8 | 0 | 1 | user.service.ts (680) | 31 | ✓ | ✗ | không cần | ✗ | serializer thiếu 1; constants/message; import src/ ×6 |
| user-achievement | 7 | 7 | 0 | 1 | user-achievement.service.ts (416) | 13 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| user-ai-conversation | 7 | 4 | 0 | 1 | dto/user-ai-conversation.dto.ts (196) | 0 | ✓ | ✗ | ✓ X7 (gateway) | ✗ | serializer thiếu 3 |
| user-answer-log | 6 | 6 | 1 | 1 | user-answer-log.controller.ts (144) | 0 | ✓ | ✓ | không cần | ✓ |  |
| user-daily-request | 6 | 6 | 0 | 1 | user-daily-request.service.ts (468) | 20 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| user-exercise-attempt | 13 | 9 | 1 | 1 | user-exercise-attempt.service.ts (880) | 40 | ✓ | ✗ | không cần | ✗ | serializer thiếu 4 |
| user-history | 5 | 5 | 0 | 1 | user-history.service.ts (851) | 15 | ✓ | ✓ | không cần | ✓ |  |
| user-pokemon | 10 | 9 | 0 | 2 | user-pokemon.service.ts (733) | 32 | ✓ | ✗ | không cần | ✗ | serializer thiếu 1; constants/message; import src/ ×2 |
| user-progress | 10 | 8 | 0 | 1 | user-progress.service.ts (611) | 13 | ✓ | ✗ | không cần | ✗ | serializer thiếu 2 |
| user-srs-review | 5 | 0 | 1 | 1 | user-srs-review.service.ts (251) | 0 | ✓ | ✗ | không cần | ✗ | serializer thiếu 5 |
| user-test | 8 | 2 +1 msg | 0 | 1 | user-test.service.ts (431) | 9 | ✓ | ✗ | không cần | ✗ | serializer thiếu 5 |
| user-test-answer-log | 6 | 6 | 1 | 1 | user-test-answer-log.controller.ts (145) | 0 | ✓ | ✓ | không cần | ✓ |  |
| user-test-attempt | 13 | 7 | 2 | 1 | test-attempt-grading.service.ts (690) | 63 | ✓ | ✗ | ✓ X3 | ✗ | serializer thiếu 6 |

### economy (19)

| Module | Route | Serializer | Unit | E2e | File lớn nhất (dòng) | any | Contract | Standardized | Extracted | Verified | Còn lệch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gacha-banner | 7 | 7 | 0 | 1 | gacha-banner.service.ts (682) | 54 | ✓ | ✗ | không cần | ✗ | console ×2; import src/ ×1 |
| gacha-item | 8 | 8 | 0 | 1 | gacha-item.repo.ts (457) | 6 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| gacha-item-rate | 5 | 5 | 0 | 0 | gacha-item-rate.repo.ts (133) | 0 | ✗ | ✗ | không cần | ✗ | import src/ ×1 |
| gacha-purchase | 4 | 4 | 0 | 1 | gacha-purchase.service.ts (429) | 7 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| gacha-roll-history | 6 | 6 | 0 | 0 | gacha-roll-history.repo.ts (188) | 0 | ✗ | ✗ | không cần | ✗ | import src/ ×1 |
| invoice | 4 | 4 | 0 | 2 | invoice.service.ts (322) | 4 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| payment | 5 | 0 +2 @Res +1 msg | 1 | 5 | payment.service.ts (448) | 2 | ✓ | ✗ | không cần | ✗ | file entity; thiếu zod-dto; serializer thiếu 2; console ×2 |
| reward | 8 | 8 | 1 | 2 | reward.service.ts (1062) | 41 | ✓ | ✗ | ✓ X6 | ✗ | constants/message; import src/ ×1 |
| shop-banner | 8 | 8 | 0 | 1 | shop-banner.service.ts (720) | 64 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| shop-item | 8 | 8 | 0 | 1 | shop-item.service.ts (470) | 7 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| shop-purchase | 6 | 6 | 0 | 1 | shop-purchase.service.ts (302) | 2 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| subscription | 7 | 7 | 0 | 1 | subscription.service.ts (726) | 52 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| subscription-feature | 4 | 4 | 0 | 0 | subscription-feature.service.ts (244) | 0 | ✗ | ✗ | không cần | ✗ | import src/ ×1 |
| subscription-plan | 7 | 7 | 0 | 0 | subscription-plan.repo.ts (296) | 20 | ✗ | ✗ | không cần | ✗ | console ×1; import src/ ×1 |
| user-gacha-pity | 6 | 6 | 1 | 0 | user-gacha-pity.service.ts (172) | 0 | ✗ | ✗ | không cần | ✗ | file entity; import src/ ×1 |
| user-reward-history | 6 | 6 | 0 | 1 | dto/user-reward-history.dto.ts (358) | 5 | ✓ | ✗ | không cần | ✗ | tên repo; file entity |
| user-subscription | 7 | 7 | 0 | 1 | user-subscription.repo.ts (524) | 17 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| wallet | 7 | 7 | 1 | 1 | wallet.service.ts (273) | 2 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| wallet-transaction | 4 | 4 | 0 | 1 | wallet-transaction.repo.ts (157) | 0 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |

### battle (11)

| Module | Route | Serializer | Unit | E2e | File lớn nhất (dòng) | any | Contract | Standardized | Extracted | Verified | Còn lệch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| debuff-round | 5 | 5 | 0 | 0 | debuff-round.service.ts (354) | 19 | ✗ | ✗ | không cần | ✗ | console ×1; constants/message; import src/ ×1 |
| leaderboard-season | 7 | 7 | 0 | 1 | leaderboard-season.service.ts (778) | 46 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| match | 6 | 6 | 0 | 2 | match.repo.ts (672) | 44 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| match-participant | 5 | 5 | 0 | 2 | match-participant.service.ts (499) | 3 | ✓ | ✗ | không cần | ✗ | import src/ ×3 |
| match-queue | 2 | 2 | 0 | 2 | match-queue.service.ts (372) | 3 | ✓ | ✗ | không cần | ✗ | console ×1; import src/ ×3 |
| match-round | 6 | 6 | 0 | 2 | match-round.service.ts (450) | 15 | ✓ | ✗ | không cần | ✗ | console ×1; import src/ ×1 |
| match-round-participant | 6 | 6 | 2 | 2 | match-round-participant-timeout.processor.ts (725) | 19 | ✓ | ✗ | ✓ X2 | ✗ | import src/ ×2 |
| round-question | 6 | 5 | 0 | 1 | round-question.service.ts (516) | 9 | ✓ | ✗ | ✓ X1 | ✗ | serializer thiếu 1; console ×6; import src/ ×1 |
| round-question-answerlog | 5 | 5 | 0 | 0 | round-question-answerlog.repo.ts (128) | 0 | ✗ | ✗ | không cần | ✗ | import src/ ×1 |
| season-rank-reward | 6 | 6 | 0 | 1 | season-rank-reward.service.ts (269) | 2 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |
| user-season-history | 7 | 7 | 0 | 1 | user-season-history.service.ts (285) | 3 | ✓ | ✗ | không cần | ✗ | import src/ ×1 |

### integration (4)

| Module | Route | Serializer | Unit | E2e | File lớn nhất (dòng) | any | Contract | Standardized | Extracted | Verified | Còn lệch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gemini | 7 | 1 | 0 | 1 | gemini.service.ts (1276) | 72 | ✓ | ✗ | ✗ I5 dở: tách GeminiService | ✗ | thiếu zod-dto; serializer thiếu 6; console ×3 |
| mail | 0 | 0 | 0 | 0 | mail.service.ts (114) | 1 | — | ✓ | không cần | ✗ |  |
| speech | 4 | 0 | 1 | 0 | dto/speech.dto.ts (324) | 6 | ✗ | ✗ | không cần | ✗ | thiếu zod-dto; serializer thiếu 4 |
| upload | 7 | 2 | 1 | 1 | upload.controller.ts (462) | 2 | ✓ | ✗ | không cần | ✗ | thiếu zod-dto; serializer thiếu 5; console ×3 |

## 4. Ngoài `src/modules`

| Bucket | File | Dòng | File lớn nhất (dòng) | console | any | eslint-disable | Mục arch:deps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| app.module.ts | 1 | 229 | src/app.module.ts (229) | 0 | 0 | 0 | 0 |
| common | 47 | 1944 | src/common/constants/promt.constant.ts (229) | 0 | 14 | 0 | 0 |
| config | 2 | 176 | src/config/env.config.ts (132) | 5 | 0 | 0 | 0 |
| cronjobs | 3 | 1024 | src/cronjobs/handle-leaderboard-season.cronjob.ts (492) | 0 | 9 | 0 | 0 |
| i18n | 9 | 6156 | src/i18n/message-keys.ts (1513) | 0 | 1 | 0 | 0 |
| infrastructure | 29 | 1348 | src/infrastructure/integrations/storage/cloudinary-file-storage.adapter.ts (110) | 3 | 1 | 0 | 0 |
| main.ts | 1 | 73 | src/main.ts (73) | 3 | 0 | 0 | 0 |
| shared | 23 | 1292 | src/shared/services/firebase.service.ts (248) | 0 | 16 | 0 | 1 |
| websockets | 11 | 3671 | src/websockets/kaiwa.gateway.ts (1392) | 2 | 37 | 0 | 0 |
