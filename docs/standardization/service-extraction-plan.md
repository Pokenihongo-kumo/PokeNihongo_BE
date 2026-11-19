# Plan tách service/gateway/worker nhiều trách nhiệm (giai đoạn 6)

Trạng thái: **proposal** (chờ duyệt D-X1–D-X4). Viết từ code `dev` @ `f0df082a` (2026-11-19), chỉ đọc code. Chi tiết hóa giai đoạn 6 trong [BACKEND_STANDARDIZATION_PLAN.md](../../BACKEND_STANDARDIZATION_PLAN.md).

## 1. Mục tiêu

1. **Một hành vi nghiệp vụ có một bản code.** Trận đấu hiện có hai cặp bản sao (service và processor timeout mỗi bên một bản) đã lệch nhau; sửa lỗi ở một bên thì bên kia vẫn lỗi.
2. **Mỗi class mới có một trách nhiệm nói được bằng một câu** (chấm bài, dựng review, chọn câu hỏi, import file, phát thưởng một loại…). Không tách theo số dòng.
3. **Hành vi ngoài giữ nguyên**: REST, socket event (tên, room, dạng payload), job Bull, dữ liệu ghi DB và thứ tự ghi/emit. Đổi hành vi (nếu cần) là bước riêng, có snapshot before/after.
4. **Không thêm retry/idempotency mới** khi tách; transaction boundary giữ như cũ, external call không bị kéo vào transaction DB.

## 2. Hiện trạng (đo trên `dev` @ `f0df082a`)

| File                                           | Dòng | Method lớn (dòng)                                                                                                                                                                                                                                      | Vấn đề                                                                                                                                              |
| ---------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `websockets/kaiwa.gateway.ts`                  | 2381 | `handleUserAudioChunk` (804), `generateRoomTitle` (181), `parseAudioPayload` (180), `processSpeechToText` (138)                                                                                                                                        | Transport, session, STT, LLM, TTS, upload, lưu tin nhắn, đặt tên phòng chung một class. REST có contract (5h), luồng socket audio **chưa có test**. |
| `user-test-attempt.service.ts`                 | 1868 | `getTestAttemptReview` (298), `submitTestCompletion` (278), `submitPlacementTestCompletion` (250), `getLessonTestAttemptReview` (245), `getTestAttemptByTestId` (211), `checkTestCompletion` (128), `updateUserProgressOnLessonReviewCompletion` (102) | Chấm bài, dựng review (hai bản gần giống), đánh giá placement, cập nhật tiến độ, phát thưởng.                                                       |
| `vocabulary.service.ts`                        | 1728 | `createSampleVocabularies` (284), `importFromTxt` (265), `findOneDetail` (207), `createFullVocabularyWithFiles` (202), `importFromXlsxFiles` (162)                                                                                                     | Import/sample trộn với CRUD và tra cứu.                                                                                                             |
| `test.service.ts`                              | 1232 | `generateLessonReviewTest` (236), `getRandomQuestionsForPlacementTest` (205), `findFullByIdForUser` (125), `getRandomQuestionsByLevel` (124), `findFullById` (121)                                                                                     | Chọn câu hỏi ngẫu nhiên/dựng đề trộn với CRUD test.                                                                                                 |
| `round-question.service.ts`                    | 1003 | `answerQuestion` (325), `completeMatch` (319), `checkAndCompleteRound` (112)                                                                                                                                                                           | **Bản sao 1** (xem dưới).                                                                                                                           |
| `round-question-timeout.processor.ts`          | 1075 | `completeMatch` (335), `handleQuestionTimeout` (243), `checkAndCompleteRound` (148)                                                                                                                                                                    | **Bản sao 1**.                                                                                                                                      |
| `match-round-participant.service.ts`           | 850  | `choosePokemonWithRound` (296), `handleQuestionsAndDebuffForCompletedSelection` (296), `moveToNextRound` (76)                                                                                                                                          | **Bản sao 2**.                                                                                                                                      |
| `match-round-participant-timeout.processor.ts` | 1041 | `handlePokemonSelectionTimeout` (360), `generateQuestionsDebuffAndMaybeStartRound` (228), `handleStartRound` (163), `moveToNextRound` (64)                                                                                                             | **Bản sao 2**.                                                                                                                                      |
| `reward.service.ts`                            | 1029 | `convertRewardsWithUser` (552)                                                                                                                                                                                                                         | Mọi loại thưởng (coin, sparkles, exp, pokemon, …), lịch sử, notification trong một hàm.                                                             |
| `kanji.service.ts`                             | 719  | `importFromXlsx` (185), `importFromTxt` (171)                                                                                                                                                                                                          | Import trộn CRUD.                                                                                                                                   |

**Bản sao 1** — `calculatePointsEarned`, `checkAndCompleteRound`, `scheduleNextRound`, `completeMatch` có ở cả `RoundQuestionService` (trả lời câu hỏi) và `RoundQuestionTimeoutProcessor` (hết giờ câu hỏi). So từng hàm (bỏ khoảng trắng): `calculatePointsEarned` giống hệt; ba hàm còn lại lệch 61–122 dòng. Phần lớn là log (`console.log` ở service, `this.logger` ở processor) nhưng có lệch hành vi thật, ví dụ `scheduleNextRound` ở processor nuốt lỗi (`try/catch` chỉ log), ở service lỗi đi tiếp lên trên. Hai bản đã từng phải sửa riêng (batch 7c: `round-starting` truyền ms thay vì giây).

**Bản sao 2** — chuyển round và sinh câu hỏi/debuff khi chọn xong Pokemon có ở `MatchRoundParticipantService` (người chơi chọn) và processor timeout (hết giờ chọn, tự chọn).

Test sẵn có: contract 5c/5d (làm bài exercise/test, review, placement), 7a/7b/7c (mùa, ghép trận, chọn Pokemon, round đấu, hết giờ chọn và hết giờ câu hỏi — có ghi lại socket event và gọi thẳng processor), `test/reward/*`, `test/vocabulary/*`, 4c (vocab/kanji). Chưa có: luồng socket kaiwa (audio → STT → LLM → TTS).

## 3. Thiết kế đích

Class mới nằm trong module sở hữu, là provider thường (không module mới, không export ra ngoài nếu chỉ module đó dùng). Service/processor/gateway cũ giữ nguyên chữ ký public và gọi sang class mới, nên controller, job và module khác không đổi.

| Nhóm         | Class mới (đề xuất tên)                                                                     | Trách nhiệm                                                                                                                   | Ai gọi                                                                 |
| ------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Round đấu    | `RoundCompletionService` (round-question)                                                   | tính điểm, chốt round, xếp round kế, chốt trận (elo, mùa, emit)                                                               | `RoundQuestionService.answerQuestion`, `RoundQuestionTimeoutProcessor` |
| Chọn Pokemon | `RoundStartService` (match-round-participant)                                               | chuyển round, sinh câu hỏi + debuff, bắt đầu round                                                                            | `MatchRoundParticipantService`, processor timeout chọn                 |
| Bài test     | `TestAttemptGrading`, `TestAttemptReviewBuilder`, `PlacementEvaluation` (user-test-attempt) | chấm/kiểm hoàn thành (kể cả quy tắc LESSON_REVIEW 10 câu), dựng review (một bản cho test và lesson review), đánh giá trình độ | `UserTestAttemptService` (giữ làm façade)                              |
| Đề test      | `TestQuestionPicker` (test)                                                                 | chọn câu cho placement, theo level, sinh đề lesson review, dựng đề đầy đủ                                                     | `TestService`                                                          |
| Import       | `VocabularyImportService`, `KanjiImportService`                                             | đọc xlsx/txt, tạo/cập nhật, dữ liệu mẫu                                                                                       | service tương ứng                                                      |
| Thưởng       | một hàm phát thưởng cho mỗi loại trong `RewardService` hoặc `RewardGrantService`            | phát một loại thưởng trong transaction; lịch sử và notification sau khi commit như hiện tại                                   | `convertRewardsWithUser`                                               |
| Kaiwa        | `KaiwaTurnService`, `KaiwaTitleService` (ai-conversation-room hoặc user-ai-conversation)    | một lượt nói: audio → STT → LLM → TTS → lưu/upload; đặt tên phòng                                                             | `KaiwaGateway` giữ transport, session, stream, cancel, reconnect       |

Không làm trong giai đoạn này: lesson-content (chờ ADR D1/D2), gợi ý Gemini (I5 đang làm), payment (đã tách ở A1/D1/I2).

## 4. Quyết định cần duyệt

- **D-X1 — Gộp bản sao battle theo hành vi nào.** Đề xuất: bước đầu của X1/X2 là bảng so sánh từng điểm lệch (không tính log) kèm test tái hiện; điểm lệch là lỗi (vd một bên quên emit) thì theo bản đúng và ghi snapshot before/after; điểm lệch là chính sách gọi (vd processor nuốt lỗi để job không retry, service ném lỗi cho HTTP) thì class mới ném lỗi, **chính sách bắt lỗi giữ ở nơi gọi**. Bảng này đưa duyệt trước khi gộp.
- **D-X2 — Kaiwa cần test trước khi tách.** Đề xuất X0 viết test socket kaiwa với driver giả sẵn có (LLM, STT, TTS, storage — không gọi dịch vụ thật), ghi lại event như spec 7b; chỉ tách gateway khi test đó chạy ổn định nhiều lần.
- **D-X3 — Không dựng base class chung exercise/test.** Hai luồng giống dáng nhưng khác quy tắc (LESSON_REVIEW 10 câu, placement, thưởng). Đề xuất chỉ gộp trong từng module (hai bản review của test thành một), không kế thừa chéo module.
- **D-X4 — Giữ façade.** Đề xuất service cũ giữ chữ ký public (controller, job, module khác không đổi); không đổi tên route, event, job.

## 5. Thứ tự batch

Mỗi batch một nhánh từ `dev`, merge `--no-ff`.

| Batch | Nội dung                                                                   | Gate riêng                                                                                       |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| X0    | Test socket kaiwa (driver giả, ghi event); bảng lệch bản sao 1 và 2 (D-X1) | chạy lặp ≥ 8 lần ổn định; bảng lệch được duyệt                                                   |
| X1    | `RoundCompletionService`, xóa bản sao 1                                    | 7b/7c pass, event ghi lại giống trước (trừ điểm lệch đã duyệt); không chốt trận/cộng elo hai lần |
| X2    | `RoundStartService`, xóa bản sao 2                                         | 7b/7c pass; hết giờ chọn đối đầu người chọn không sinh câu hỏi hai lần                           |
| X3    | user-test-attempt: grading, review builder, placement                      | 5d pass; không phát thưởng/ghi tiến độ hai lần                                                   |
| X4    | `TestQuestionPicker`                                                       | 4b/5d pass (đề chọn ngẫu nhiên nên so dạng và số lượng, không so từng câu)                       |
| X5    | Import vocabulary/kanji                                                    | 4c + `test/vocabulary/*` pass; import cùng file cho cùng kết quả                                 |
| X6    | Phát thưởng theo loại                                                      | `test/reward/*`, 5f (thành tựu), 7a (thưởng mùa) pass; ví/lịch sử/notification giống trước       |
| X7    | Kaiwa turn + title                                                         | test X0 pass; stream/cancel/lỗi/reconnect giữ như cũ                                             |

Gate chung mỗi batch: typecheck 0, unit, e2e toàn bộ, 132 contract snapshot + OpenAPI không đổi, `arch:deps` không tăng, lint không thêm warning, DB/Redis test sạch sau khi chạy.

## 6. Ước lượng

8 batch. X1, X2, X7 lớn nhất (mỗi cái có thể chia 2 commit). Bản sao 1 và 2 gộp xong bỏ khoảng 700–900 dòng trùng.
