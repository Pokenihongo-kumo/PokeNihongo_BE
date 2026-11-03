# Inventory web + mobile PokeNihongo — C0

Ngày 2026-11-03, trên `dev`: FE @ `b49d730`, MO @ `7d19aa0`, BE @ `a31a7ce`. Số liệu lấy bằng script đọc source (không chạy app). Kế hoạch: [client-standardization-plan.md](client-standardization-plan.md).

## 1. Tổng quan

| | Web (FE) | Mobile (MO) |
| --- | --- | --- |
| Stack | Vite + React, Redux/Saga (auth, language), React Query, Zod 4, Tailwind 4 | Expo 53 + Expo Router, Zustand, React Query, Zod 3, NativeWind |
| File `.ts/.tsx` trong `src` | 321 | 425 |
| Màn hình | 31 route (`routes/index.tsx`), 97 file `pages/` (32k dòng) | 54 screen trong `app/` (32k dòng) |
| Test | Vitest, 8 test (2 file) | jest-expo, 9 test (2 file) |
| Typecheck baseline | 52 lỗi (`npm run typecheck`) | 19 lỗi |
| ESLint baseline | 316 error / 9 warning | 41 error / 156 warning |
| Format | Prettier 3, tab 4, printWidth 120, `format:check` sạch | Prettier 3, tab 2, printWidth 120, `format:check` sạch |
| Line ending | `.gitattributes` LF, index đã LF | như FE |

Kích thước từng bucket (file / dòng):

| Bucket | FE | MO |
| --- | --- | --- |
| pages / app (screens) | 97 / 32 374 | 62 / 32 053 |
| components | 69 / 5 009 | 166 / 26 087 |
| hooks | 30 / 4 066 | 48 / 3 253 |
| services | 25 / 1 602 | 34 / 2 162 |
| models | 55 / 2 465 | 58 / 2 818 |
| state | redux 10 / 118 | stores 15 / 399 |
| utils | 9 / 578 | 17 / 1 091 |
| configs, constants, routes, types, layouts, libs, styles | 23 / 1 259 | 25 / 1 023 |

Dấu hiệu nợ (đếm thô trong `src`):

| | FE | MO |
| --- | ---: | ---: |
| `any` (`: any`, `as any`, `<any>`) | 263 | 404 |
| `console.log/debug/info` | 37 | 65 |
| `data.data` (hook/screen tự unwrap envelope) | 4 | 28 |
| `TODO/FIXME` | 32 | 2 |
| `eslint-disable` / `@ts-ignore` | 2 / 0 | 11 / 2 |
| `.tsx` không chứa JSX | 31 (hầu hết `hooks/*/index.tsx`, 2 service) | 4 |

File lớn nhất (ứng viên tách theo trách nhiệm ở C3/C4, không tách theo quota dòng):

- FE: `Lesson/CreateLesson` 1026, `AICustom/CustomAIDetail` 989, `TestSetManagement` 938, `LessonContentStep` 917, `QuestionBank/CreateEditDialog` 875, `Tournaments/LeaderboardDetail` 820, `Vocabulary/CreateVocabulary` 808, `hooks/useQuestionBank` 804.
- MO: `content-list/index` 2065, `(tabs)/home` 1949, `ai-conversation` 1874, `(battle)/pick-pokemon` 1261, `content-list/scramble` 1158, `content-list/flashcard` 1121, `(me)/flashcards/[deckId]` 1030, `(me)/dictionary/index` 1021.

## 2. Đối chiếu API: client → BE

Cách làm: script trích mọi lời gọi `axiosPrivate/axiosClient/axios.<method>(url)` trong `src`, chuẩn hóa tham số (`${x}` → `:id`, bỏ query string), so với 642 route lấy từ `@Controller` + `@Get/@Post/...` của BE (`API_PREFIX` rỗng, URI versioning bật nhưng không controller nào khai version). Đếm consumer bằng tham chiếu tên operation ở file khác, rồi kiểm tay từng case lệch (hook có được screen dùng không). Không kiểm DTO/field — phần đó thuộc C3 theo từng feature.

Phân loại theo plan: **A** khớp route thật; **B** route có nhưng URL/DTO sai; **C** consumer thật nhưng không có API (gap nghiệp vụ); **D** export/đường chết không có consumer.

| | Operations | A | B | C | D (route lệch) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Web | 140 | 137 | 0 | 0 | 3 |
| Mobile | 130 | 105 | 0 | 0 | 25 |

Kết luận chính: **không có gap C**. Mọi lời gọi tới route không tồn tại đều nằm trong service/hook không có màn hình nào dùng.

### 2.1 Route lệch — tất cả là D

| App | Operation | Gọi | BE thực tế | Vì sao D |
| --- | --- | --- | --- | --- |
| FE | `questionBankService.createMultipleQuestions` | POST `/question-bank/bulk` | chỉ có DELETE `/question-bank/bulk` | không consumer |
| FE | `questionBankService.updateMultipleQuestions` | PUT `/question-bank/bulk` | rơi vào PUT `/question-bank/:id` với id `bulk` → 422 | không consumer |
| FE | `shopService.getRandomPokemon` | POST `/shop-banner/random-pokemon` | không có | không consumer (dialog random dùng API khác) |
| MO | `dictionaryService` kanji, voice-search, handwriting-search, favorites (6 ops) | `/dictionary/*` | BE chỉ có `/vocabulary/search` mà `dictionaryService.search` dùng | hook `useKanjiDetails`, `useFavorites`, `useAdd/RemoveFromFavorites`, `useVoiceSearch`, `useHandwritingSearch` không screen nào gọi |
| MO | `flashcardService` deleteDeck, getWords, removeWord, updateDeckCard | DELETE `/flashcards/decks/:id`, `/decks/:id/words…`, PATCH `/decks/:id/cards/:id` | BE dùng PUT/DELETE `decks/cards` | hook `useDeleteFlashcardDeck`, `useFlashcardDeckWords`, `useRemoveWordFromFlashcardDeck`, `useUpdateFlashcardDeckCard` không được dùng; màn hình dùng bản `…WithMetadata` / `deleteDeckCards` khớp BE |
| MO | `quizService` (8 ops) | `/api/v1/quiz/*` | không có; service còn `USE_MOCK_DATA` khi development | toàn bộ hook `useQuiz*` không được dùng; màn `quiz/` chạy bằng `user-exercise-attempt` |
| MO | `lessonService.updateLessonProgress` | PUT `/api/v1/lessons/:id/progress` | không có | `useUpdateLessonProgress` không được dùng |
| MO | `useLessonExerciseStatus` | `axios.get('/api/lesson/:id/exercises-status')` (axios gốc, không baseURL/token) | không có | hook không được dùng |
| MO | `startConversation`, `submitUserSpeech` | `/conversation/start`, `/conversation/submit-speech` | không có; hội thoại AI đi qua socket `kaiwa` | không file nào import |
| MO | `userAnswerLogService.checkCompletion` | PUT `/user-exercise-attempt/:id/completion` | BE: GET `:id/check-completion`, PUT `:id/submit-completion` | không consumer; `useCheckCompletion` gọi `userExerciseAttemptService.checkCompleted` (khớp) |
| MO | `userService.updateSettings` | PUT `/user/settings` | rơi vào PUT `/user/:userId` | không consumer |

### 2.2 Route khớp nhưng không có consumer (ứng viên D, xác minh khi dọn feature)

- FE: `answerService.getAnswerById`, `authService.getMe`, `dailyRequestService.update/deleteDailyRequest`, `elementService.getElementalTypeById`, `lessonService.getLessonContentList`, `lessonCategoriesService.getLessonCategories`, `questionBankService.getQuestionById`, `deleteMultipleQuestions`.
- MO: `authService.resendOtp`, `lessonService.getAllLessons`, phần còn lại của `services/conversation.ts` ngoài `getConversationRooms/deleteConversationRoom/getAvailableVoices/previewVoice`.

Disposition: xóa trong task C3 của feature tương ứng (service + hook + model cùng lúc, sau khi grep lại consumer); không cần task BE. Không xóa hàng loạt ở C0.

### 2.3 Gọi ra ngoài BE

| App | Chỗ | Đích | Ghi chú |
| --- | --- | --- | --- |
| MO | `app/(app)/conversation.tsx` (màn được mở từ Speaking) | `generativelanguage.googleapis.com` với `EXPO_PUBLIC_GEMINI_API_KEY` | **Rủi ro bảo mật**: biến `EXPO_PUBLIC_*` được nhúng vào bundle, ai có APK đều lấy được key. BE đã có module Gemini/`gemini-config` và socket `kaiwa`. Disposition: task riêng (BE proxy + MO đổi call), không đổi trong refactor; tạm thời không cấp key thật cho build phát hành. |
| MO | `components/KanjiWriter.tsx` | `cdn.jsdelivr.net/npm/hanzi-writer-data` | dữ liệu nét chữ công khai, giữ nguyên |

### 2.4 Socket (MO; FE không dùng socket)

- MO dùng khoảng 30 tên event (gồm event built-in `connect/disconnect/error` và event tour `stepChange/stop` của copilot, không phải socket). Các event `join-*`, `matching-event`, `round-*`, `question-*`, `select-pokemon`, `match-completed`, `user-audio-chunk`, `text-response*`, `transcription`, `audio-response`, `notification` khớp tên trong BE.
- BE phát nhưng MO không nghe: `pokemon-selection-expired` (đã ghi ở C1), `opponent-completed`. BE `@SubscribeMessage` mà MO không emit: `round-pokes-selected`, `leave-kaiwa-room`, `leave-matching-room`, `leave-searching-room`, `leave-user-room`. Kiểm khi làm battle/kaiwa ở C4 (rời phòng có thể đang dựa vào disconnect).
- MO nghe `next-question` (`(battle)/arena.tsx`) mà BE không phát — ứng viên D, kiểm ở C4.
- BE `common/constants/event-socket.constant.ts` còn event của dự án khác (`send-order-to-chef`, `call-staff`, `order-ready-for-delivery`, `order-delivered`, `update-order`) — dead code BE, đưa vào danh sách dọn BE.

### 2.5 Bảng theo service


**Web**

| File | Ops | Khớp route BE | Không có route / sai method |
| --- | ---: | ---: | --- |
| `services/ai/index.ts` | 17 | 17 | — |
| `services/answer/index.ts` | 5 | 5 | — |
| `services/auth/index.ts` | 2 | 2 | — |
| `services/battle/index.ts` | 5 | 5 | — |
| `services/dailyRequest/index.ts` | 4 | 4 | — |
| `services/dashboard/index.ts` | 17 | 17 | — |
| `services/element/index.ts` | 2 | 2 | — |
| `services/exercise/index.ts` | 4 | 4 | — |
| `services/gacha/index.tsx` | 8 | 8 | — |
| `services/grammar/index.ts` | 4 | 4 | — |
| `services/kanji/index.ts` | 5 | 5 | — |
| `services/lesson/index.ts` | 11 | 11 | — |
| `services/lessonCategories/index.ts` | 1 | 1 | — |
| `services/media/index.ts` | 1 | 1 | — |
| `services/permission/index.ts` | 3 | 3 | — |
| `services/pokemon/index.ts` | 3 | 3 | — |
| `services/questionBank/index.ts` | 8 | 6 | POST `/question-bank/bulk`, PUT `/question-bank/bulk` |
| `services/reward/index.ts` | 6 | 6 | — |
| `services/shop/index.ts` | 9 | 8 | POST `/shop-banner/random-pokemon` |
| `services/shopRarityPrice/index.tsx` | 2 | 2 | — |
| `services/test/index.ts` | 7 | 7 | — |
| `services/testSet/index.ts` | 8 | 8 | — |
| `services/user/index.ts` | 2 | 2 | — |
| `services/vocabulary/index.ts` | 5 | 5 | — |
| `services/wordType/index.ts` | 1 | 1 | — |

**Mobile**

| File | Ops | Khớp route BE | Không có route / sai method |
| --- | ---: | ---: | --- |
| `configs/axios.ts` | 1 | 1 | — |
| `hooks/useLessonExerciseStatus.ts` | 1 | 0 | GET `/api/lesson/:id/exercises-status` |
| `services/achievement.ts` | 1 | 1 | — |
| `services/attendance.ts` | 3 | 3 | — |
| `services/auth.ts` | 9 | 9 | — |
| `services/battle.ts` | 11 | 11 | — |
| `services/conversation.ts` | 6 | 4 | GET `/conversation/start`, POST `/conversation/submit-speech` |
| `services/dictionary.ts` | 9 | 3 | GET `/dictionary/kanji/:id`, POST `/dictionary/voice-search`, POST `/dictionary/handwriting-search`, POST `/dictionary/favorites`, DELETE `/dictionary/favorites/:id`, GET `/dictionary/favorites` |
| `services/elemental.ts` | 1 | 1 | — |
| `services/exercise.ts` | 1 | 1 | — |
| `services/flashcard.ts` | 14 | 10 | DELETE `/flashcards/decks/:id`, GET `/flashcards/decks/:id/words`, DELETE `/flashcards/decks/:id/words/:id`, PATCH `/flashcards/decks/:id/cards/:id` |
| `services/gacha.ts` | 5 | 5 | — |
| `services/gemini.ts` | 1 | 1 | — |
| `services/invoice.ts` | 1 | 1 | — |
| `services/leaderboard.ts` | 2 | 2 | — |
| `services/lesson-categories.ts` | 1 | 1 | — |
| `services/lesson.ts` | 3 | 2 | PUT `/api/v1/lessons/:id/progress` |
| `services/notification.ts` | 3 | 3 | — |
| `services/payos.ts` | 1 | 1 | — |
| `services/pokemon.ts` | 2 | 2 | — |
| `services/quiz.ts` | 9 | 1 | POST `/api/v1/quiz/session`, GET `/api/v1/quiz/session/:id`, GET `/api/v1/quiz/:id/questions`, POST `/api/v1/quiz/:id/answer`, POST `/api/v1/quiz/:id/complete`, GET `/api/v1/quiz/stats`, GET `/api/v1/quiz/history`, GET `/api/v1/quiz/session/:id/review` |
| `services/reward.ts` | 1 | 1 | — |
| `services/season.ts` | 1 | 1 | — |
| `services/shop-banner.ts` | 1 | 1 | — |
| `services/shop-purchase.ts` | 1 | 1 | — |
| `services/subscription.ts` | 3 | 3 | — |
| `services/upload.ts` | 1 | 1 | — |
| `services/user-answer-log.ts` | 2 | 1 | PUT `/user-exercise-attempt/:id/completion` |
| `services/user-exercise-attempt.ts` | 9 | 9 | — |
| `services/user-history.ts` | 3 | 3 | — |
| `services/user-pokemon.ts` | 5 | 5 | — |
| `services/user-progres.ts` | 1 | 1 | — |
| `services/user-srs-review.ts` | 1 | 1 | — |
| `services/user-test.ts` | 12 | 12 | — |
| `services/user.ts` | 3 | 2 | PUT `/user/settings` |
| `services/wallet.ts` | 1 | 1 | — |

## 3. Hiện trạng theo lớp (đầu vào cho convention)

- **HTTP adapter**: FE `configs/axios` (2 instance, `Accept-Language` từ localStorage `language`, chưa có refresh token); MO `configs/axios.ts` (2 instance, refresh single-flight, logout khi refresh lỗi). Lỗi chuẩn hóa qua `utils/api-error` (FE) / `utils/api-error.utils.ts` (MO); success qua `toApiResult` — mới dùng ở FE wordType, MO attendance.
- **Service**: phần lớn trả `AxiosResponse` thô hoặc `response.data` (envelope). MO có vài service parse Zod (`achievement`, `subscription`, `user-progres`, `user-test`). `BackendResponseModel` của cả hai client có `refine` sai (chỉ nhận success khi `statusCode === 201`), chỉ dùng để suy type.
- **Hook**: FE `hooks/<feature>/index.tsx` (đa số không có JSX), MO `hooks/useX.ts`. Query key là mảng string tự do, chưa có factory; MO có `clearUserCache` liệt kê tay ~50 key.
- **State**: FE Redux chỉ còn `auth` + `language` (saga); MO Zustand `auth`, `global` (language), `matching`, `notification`, `user`, `wallet` (wallet đồng bộ từ query).
- **i18n**: FE `locales/{vi,en,ja}.json`, MO `i18n/{vi,en,ja}.json`; một nguồn language mỗi app (đã chốt ở C1).
- **Tests**: mới có test cho adapter lỗi/success. Chưa có RN Testing Library — thêm khi task cần test component/hook.

## 4. Convention chốt cho client (áp dụng khi migrate, không đổi hàng loạt)

1. Service trả `ApiResult<T>` qua `toApiResult(response, schema)`; list dùng `pageSchema(item)`; schema chỉ khai field UI dùng (MO dùng `.passthrough()` khi cần giữ field khác). Raw `AxiosResponse` chỉ cho file/stream.
2. Hook chọn phần dữ liệu cần (`select`) và lo invalidate; screen không đọc `data.data`.
3. Lỗi hiển thị qua `getApiErrorMessage(error, fallback)`; form đọc `fieldErrors`.
4. Tên giữ theo repo: FE `services/<feature>/index.ts`, `models/<feature>/index.ts`, `hooks/use<Feature>/index.tsx`; MO `services/<feature>.ts`, `models/<feature>/…`, `hooks/use<Feature>.ts`. Đổi `.tsx` → `.ts` cho hook không JSX khi chạm vào file đó, không đổi hàng loạt.
5. Xóa service/hook D cùng task với feature, sau khi grep lại consumer.

## 5. Việc mở từ inventory

| Việc | Repo | Khi nào |
| --- | --- | --- |
| Gemini gọi trực tiếp từ MO với key public | BE + MO | Task riêng (security), cần quyết định của người dùng |
| Dọn 28 operation gọi route lệch (2.1) và ứng viên ở 2.2, cùng hook liên quan | FE, MO | C3 theo feature |
| Event socket thiếu/thừa (2.4) | MO, BE | C4 battle/kaiwa |
| Event của dự án khác trong `event-socket.constant.ts` | BE | dọn dead code BE |
| Baseline tsc 52/19, ESLint 316/41 error | FE, MO | task sửa baseline nhỏ, theo file khi chạm |
| Feature mẫu C2: Vocabulary | 3 repo | `dictionaryService.search` → `/vocabulary/search` khớp (A); FE CRUD vocabulary khớp (A) → đủ điều kiện làm mẫu C2 |
