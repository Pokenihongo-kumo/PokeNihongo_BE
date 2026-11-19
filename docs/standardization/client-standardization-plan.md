# Kế hoạch clean src web và mobile đồng bộ với backend

Ngày cập nhật: 2026-11-03. Là phần bắt buộc của master plan v6 trong `BACKEND_STANDARDIZATION_PLAN.md`, không phải chỉ kiểm thử tương thích. Trạng thái: kế hoạch; chưa triển khai refactor client trong lần cập nhật này. Đã chốt test runners, style client, Genymotion và gap API. Approval trước commit chỉ áp dụng BE; FE/mobile tự review/checks rồi commit.

## 1. Phạm vi và nguyên tắc

- Clean toàn bộ src của `PokeNihongo_FE` (web React/Vite) và `PokeNihogo_MO` (Expo/React Native), đồng bộ các concern/feature liên quan với `PokeNihongo_BE`.
- Giữ giao diện, navigation và nghiệp vụ đang có; sửa lỗi có before/after và test. Không coi thay đổi UX, thêm feature hay viết lại UI là điều kiện để đạt clean code.
- Đồng bộ contract, thuật ngữ domain, error semantics và quy trình. Không bắt web/mobile có cây thư mục, component hoặc state library giống nhau.
- Giữ Redux/Saga và React Query hiện có trên web, Zustand và React Query trên mobile. Không thay state manager toàn dự án. Từng state có owner rõ, tránh lưu server data lặp lại mà không có lý do.
- Giữ major dependency: web Zod 4, BE/mobile Zod 3. Không import runtime Zod schema BE vào client. Dùng fixtures/spec contract dùng chung; schema client theo version đang cài.
- Package manager theo lockfile đã xác minh của từng repo; không đổi npm/pnpm hoặc tạo lockfile thứ hai chỉ để đồng bộ lệnh.
- Các thư viện adapter, helper, hook và component tái sử dụng trước hết trong từng repo. Không tạo monorepo/package dùng chung web/native khi chưa chứng minh logic và dependency thực sự độc lập nền tảng.

## 2. Bằng chứng ban đầu, chưa phải audit hoàn chỉnh

| Concern | Web | Mobile | Việc cần chuẩn hóa |
| --- | --- | --- | --- |
| HTTP response | `services/reward/index.ts` trả AxiosResponse; `hooks/useReward/index.tsx` đọc nhiều lớp data; các service khác unwrap khác nhau | `services/attendance.ts` trả data hoặc cả envelope tùy method; dictionary/progress có mapping/schema | Return type rõ và một nơi unwrap/parse cho mỗi API operation |
| Query/cache | React Query trong hooks; auth/language có Redux/Saga | React Query và Zustand; `hooks/useAuth.ts` dùng accessToken trong query key | Query key factory, invalidation và auth-session isolation; không để token thô trong key/log |
| Token/language | axios lấy token từ cookie helper, language từ localStorage; hook reward lấy language từ Redux | axios lấy language/token từ stores, refresh token từ SecureStore; socket có auth riêng | Một nguồn trạng thái hợp lệ cho mỗi concern, persistence adapter; kiểm tra đổi locale và logout |
| Error | Axios interceptors giữ AxiosError trên một số path | Public axios ép message thành string trong new Error; lỗi validation BE trả message là mảng object có thể thành [object Object]; private axios xử lý refresh riêng | ApiError có display message + field errors, lấy HTTP status từ transport, giữ body status riêng |
| Model layout | models/<feature> có entity/request/response/index; một số file .tsx chỉ chứa type | models/<feature> có *.entity.ts/*.response.ts và một số .tsx type-only | Naming nhất quán trong từng repo, loại type/schema trùng và cast chữa lỗi |
| Realtime | N/A hiện tại: package không có socket client; search src chưa thấy WebSocket/socket calls | configs/socket.ts, GlobalSocketManager, listener hooks | Chỉ clean/test socket mobile; không thêm realtime cho web vì muốn đối xứng |
| Tooling | Vite build pass từng được ghi nhận dù tsc -b lỗi | Expo/native cần kiểm tra ngoài TypeScript | Compiler + runtime checks riêng, không coi bundler build là đủ |

Baseline được Claude ghi ở master plan: web 52 lỗi typecheck, 317 lint errors; mobile 19 lỗi typecheck, 41 lint errors. Là số lịch sử, phải chạy lại trước batch; không coi là kết quả mới đã xác minh trong tài liệu này.

### Quyết định tooling, native và nền Git trước C0

| Concern | Quyết định đã chốt | Bằng chứng/điều kiện |
| --- | --- | --- |
| Nền web | Dùng dev đã tạo từ main; kiểm tra lại remote trước task đầu | Local tracking refs ngày 2026-11-03: origin/dev...origin/main = 0/0, không khẳng định remote chưa đổi |
| Nền mobile | Tích hợp main vào dev bằng task/PR chuẩn bị riêng trước task MO đầu tiên | Local tracking refs: origin/dev...origin/main = 0/279. Fetch lại, tự review diff/checks và tuân thủ PR policy; không cần người dùng duyệt từng commit MO, không reset/force-push dev |
| Web tests | Vitest + React Testing Library, DOM Testing Library, user-event và jest-dom; jsdom cho component | Chốt phiên bản tương thích Vite 6/React 19/Node thực, pin vào lockfile trong task tooling; không npm install latest nếu buộc nâng Vite |
| Mobile tests | Jest preset jest-expo + React Native Testing Library | Chọn jest-expo tương thích Expo SDK 53/RN 0.79/React 19; kiểm tra peers/renderer nếu cần, không nâng SDK để cài runner |
| Formatter client | Prettier riêng cho mỗi repo: 4 spaces, semicolon, double quote, JSX double quote, LF, printWidth 100 | Giữ 4 spaces/semicolon theo nền client, không áp 2 spaces/no-semicolon BE. FE chưa có Prettier; MO có plugin Tailwind nhưng chưa có config |
| Git line ending | Thêm .gitattributes/.editorconfig cho từng client, policy LF và binary exceptions theo inventory | Cả hai repo chưa có .gitattributes tại audit này; renormalize/review trên tree không lẫn thay đổi, kiểm chứng checkout Windows như master |
| Native runtime | Dùng Genymotion đã cài, APK development build tương thích với app và ABI máy ảo | Đã thấy C:\Program Files\Genymobile\Genymotion và tools\adb.exe. Chưa chạy thiết bị/app, chưa chứng minh build toolchain đầy đủ |
| CI | Workflow check-only mới .github/workflows/ci.yml cho từng repo, PR vào dev + push dev + workflow_dispatch | Theo review, Actions trên origin mới đang tắt; phải xác minh/bật có kiểm soát. Không bật workflow deploy VPS cũ |

Vitest/Jest-expo là runner khác nhau theo nền tảng, không cần một runner cho cả hai. Config test map cùng alias với runtime, setup cleanup và mock boundary storage/native/router khi cần. Test helper/HTTP mapper không giả vờ render UI; component/hook tests kiểm hành vi thực, không dùng snapshot diện rộng thay assertions. Thiết lập test và test:watch; test CI phải fail nếu không tìm thấy tests thay vì dùng passWithNoTests.

Format-only không nạp plugin tổ chức import hoặc plugin sắp xếp Tailwind classes. MO vẫn giữ dependency plugin Tailwind nhưng không bật trong lượt format đầu; nếu sử dụng sau thì config/lệnh/commit riêng và review className. Chạy compiler/lint/build baseline trước/sau, tách config/tooling và format thành task/commit có review. Chỉ đổi .ts/.tsx và các file config trong danh sách đã chốt, không format assets/generated/native code hàng loạt.

### Native gate cụ thể: Genymotion

1. Khởi động một Android virtual device Genymotion và ghi Android/API level + CPU ABI. Dùng đúng ADB binary đã chọn, kiểm tra adb devices thấy thiết bị; tránh hai ADB server/version xung đột. Không ghi “không có emulator” chỉ vì chưa có Android Studio.
2. APK development build phải chứa native modules của dự án và hỗ trợ ABI/API của virtual device. Không mặc định Expo Go chạy được các dependency như MMKV/Nitro/audio recorder/in-app browser; không dùng Expo Go để chứng minh toàn app pass.
3. Genymotion là runtime, không tự cung cấp toàn bộ Android SDK/JDK/Gradle cần để build. Nếu thiếu SDK/JDK thì lập task build-toolchain hoặc lấy APK dev đã build từ nguồn tin cậy/phương án build được chốt; không bắt cài thêm emulator Android Studio. Không tự chạy build cloud có phí hoặc nâng Expo SDK.
4. Cài APK vào máy ảo, kết nối Metro và BE test. Base URL dùng host reachable từ guest (LAN/Genymotion host route đã xác minh hoặc adb reverse), không giả định localhost của guest là Windows host. Kiểm tra HTTP/WS, permissions và cleartext/network policy theo dev build.
5. Smoke login/logout, query/error/422, screen của batch, đổi locale, background/foreground, reconnect; audio/camera/payment return chỉ đạt khi đã test capability tương ứng. Microphone/emulator hoặc SDK/ABI thiếu thì ghi đúng phần blocked, không bỏ test hoặc dùng browser để thay.

Ghi build ID/commit, Genymotion device/API/ABI và kết quả thực. Typecheck/unit tests vẫn làm được khi runtime bị chặn; gate native pending tới khi chạy app được. iOS vẫn pending nếu chưa có môi trường, không suy từ Android.

### C0 phải xử lý mismatch API trước khi chọn feature mẫu

- Lập bảng từng operation gồm service export → call site màn hình/hook → URL sau ghép baseURL/prefix/version → BE route/handler thực → request/response → mock flag → trạng thái. Không kết luận mọi export trong service đều được dùng; không kết luận route không tồn tại chỉ bằng tìm kiếm literal.
- Các ứng viên gap đã thấy trong MO: dictionary/* ngoài search, /api/v1/quiz/*, conversation/start và submit-speech, hook useLessonExerciseStatus gọi /api/lesson/:id/exercises-status. Kiểm tra cả axios instance, URI versioning và các router/backend khác nếu có. quizService còn USE_MOCK_DATA theo development hoặc thiếu API URL: màn hình chạy mock không chứng minh endpoint thật hoạt động.
- Phân loại: (A) API thực khớp; (B) API có nhưng URL/DTO/field sai — fix adapter/client với before/after tests; (C) không có API nhưng có consumer thật — gap nghiệp vụ; (D) export/dead path không có consumer — candidate cleanup sau khi xác minh. Không tự thêm alias BE hoặc map sang route “gần giống” nếu semantics khác.
- Với C, ghi task tích hợp/chức năng thiếu riêng, tác động web/mobile/BE và đề xuất contract. Không tự implement endpoint mới, xóa màn hình, giấu lỗi 404 bằng mock hay đổi sản phẩm dưới nhãn refactor. C0 hoàn tất inventory khi gap có owner/disposition và ảnh hưởng rõ; feature bị gap chặn chưa được đánh dấu verified/clean hoàn tất.
- Vocabulary chưa bị loại tự động: dictionaryService.search thực gọi /vocabulary/search, BE có @Get('search'). Vì vậy chỉ chốt mẫu dọc CRUD vocabulary → search → kết quả UI nếu request/response và call site đều xác minh được; không đưa dictionary favorites/voice/handwriting hoặc quiz chưa có API vào mẫu để làm nó “đủ”. Nếu search path thực không dùng hoặc shape không phù hợp thì chọn feature khác có endpoint thật sau C0.

### C1 ApiError: contract cần chứng minh bằng fixtures

- Pipe tạo UnprocessableEntityException với mảng `{ message, path }`; I18nHttpExceptionFilter đang chuyển message từ exception response vào body. MO public handleError cast message?: string rồi new Error(message), có thể làm mất chi tiết và hiển thị [object Object]. Đây là bugfix có regression test, không chỉ đổi type annotation.
- ApiError giữ httpStatus từ Axios response.status, bodyStatusCode riêng nếu có, displayMessage là string được normalize an toàn, fieldErrors/validationIssues có path và message, payload gốc dạng unknown và cause khi cần. Phân loại auth/refresh theo HTTP 401 thực, không dùng body.statusCode thay transport status; dữ liệu thiếu/không hợp lệ có fallback có chủ đích.
- Fixtures/test: message là string, string[], object[], body thiếu/null/HTML, network/timeout/cancel, HTTP/body status lệch; UI form nhận field errors đúng, toast không ra [object Object]. Success mapper cũng giữ phân biệt status HTTP và statusCode body vì TransformInterceptor hiện `{ statusCode, ...data }` cho phép service ghi đè field body.
- AppModule hiện đăng ký I18nHttpExceptionFilter. shared/filters/HttpExceptionFilter và CatchEverythingFilter chưa được đăng ký theo search imports; MulterExceptionFilter có @UseFilters tại upload controller, không phải filter chết. Chụp response từ pipeline đang active, không suy shape từ filter chưa dùng. Không bật tất cả filters cùng lúc trong C1 vì có thể đổi payload/status/serialization behavior.

## 3. Convention và ranh giới trách nhiệm

### Luồng dữ liệu đích

`Page/Screen → feature hook/use case → API service → HTTP adapter → BE`

- HTTP adapter: cấu hình transport, auth/locale headers, refresh theo behavior có sẵn, normalize lỗi; không biết UI/toast/router của từng feature.
- API service: path/method/body/query, nhận dữ liệu ngoài dạng unknown khi phù hợp, validate response schema, trả typed result. Sau migration hook không phải đoán response.data.data hay raw AxiosResponse.
- Feature hook: query/mutation, query key/invalidation, điều phối state/use case và presentation mapping. Không lặp parser/error handling trong mọi hook.
- Page/Screen: render, tương tác, loading/empty/error; không tự ghép URL, unwrap envelope hoặc chứa thuật toán nghiệp vụ lớn.
- Component UI dùng chung: props rõ, không tự truy cập API/store domain. Component feature có thể dùng hook feature; không ép mọi component thành generic component.
- Form validation và API validation có mục đích khác nhau: tái dùng field rules thật sự giống nhau, giữ thông báo/constraints của UI và wire payload riêng khi cần.

Chốt API service đích trả envelope hoặc domain data theo loại operation được ghi rõ trong convention mẫu, không trộn ngầm: mặc định detail/mutation trả result có data/message/statusCode cần cho UI; list trả data có results/pagination và metadata thông báo khi UI dùng. Raw response chỉ là ngoại lệ có tên/type rõ cho file/stream/headers. HTTP interceptor không globally unwrap response khi service cũ còn tồn tại.

Không đổi toàn bộ service return type một lượt. Migrate service + hook + model + consumer UI của một operation trong cùng task; adapter giữ consumer khác đến khi migrate hết. Dùng suffix/type hoặc wrapper rõ để tránh nhầm service cũ và mới, xóa adapter khi không còn consumer.

### Naming và cấu trúc

- Giữ web `pages`, `layouts`, `routes`, `services/<feature>/index.ts`, `hooks`, `models`, `components` hiện có; mobile giữ Expo Router `src/app`, services/hooks/models/stores/components.
- Làm inventory rồi chốt naming trong từng repo theo nền hiện có; code thuần type/logic dùng .ts, JSX dùng .tsx, React component PascalCase, hook useX. Chỉ đổi extension sau khi xác minh không JSX và import/tooling đúng.
- Không chuyển hàng loạt sang features/ hoặc đổi toàn bộ index.ts chỉ để hai repo giống nhau. Tách file theo trách nhiệm thực, không theo quota số dòng.
- Alias phải đồng bộ TypeScript, bundler/Metro/Babel, test runner; không sửa tsconfig rồi để runtime resolver hỏng.
- Cấu hình LF/Git attributes, formatter không tổ chức import, staged checks theo từng repo trước commit format riêng. Không áp formatter BE sang client vì plugin Tailwind/JSX/import config có thể khác.

### State, cache, auth và i18n

- Phân biệt server state (React Query), app/session/UI state (store), form/local state (component/form library). Không copy tất cả server data từ Query sang store; kiểm tra consumer trước khi bỏ cache/state cũ.
- Query key có feature/operation, params ảnh hưởng kết quả, locale nếu dữ liệu phụ thuộc locale và user/session identity khi cần. Không đưa access/refresh token thô vào key. Tránh thêm params không ảnh hưởng query để chữa stale cache.
- Mutation invalidate đúng list/detail/summary bị ảnh hưởng; kiểm tra cả admin/list variants. Logout/account switch hủy requests/queries liên quan, clear user-scoped caches/state và socket; không để response tài khoản cũ xuất hiện sau khi đổi user.
- Giữ auth UX của từng client. Mobile refresh concurrent requests có single-flight/retry hữu hạn; web chưa xác minh có refresh tương tự, không thêm feature đó dưới tên refactor.
- Tách lỗi network/timeout/cancel/401/403/422/500; giữ field errors và message dịch từ BE. UI quyết định toast/navigation qua adapter/boundary, không alert ở HTTP utility dùng chung.
- Chốt một nguồn language state trong mỗi client, đồng bộ persistence/i18next/HTTP/socket. Giữ query lang đang có qua adapter trước khi thay bằng Accept-Language. Khi BE chuyển message vi/en/ja, test UI tương ứng.
- Component cleanup: unsubscribe listeners, timer, media và requests theo lifecycle; tránh effect phụ thuộc vòng lặp, stale closure hoặc state update sau unmount.

## 4. Thành phần tái sử dụng có mục tiêu

| Thành phần | Tái sử dụng trong từng repo | Giới hạn |
| --- | --- | --- |
| HTTP/error | Typed request helpers, ApiError mapper, locale/token adapter | Không globally unwrap hoặc redirect/toast mọi lỗi |
| Pagination/filter | Request builder và page metadata type/mapper | UI page/limit mapping khác wire contract được giữ qua adapter; không viết lại qs grammar |
| Query keys | Factory theo feature, invalidation helpers khi dùng thực | Không một key chung cho mọi user/locale và không cache token |
| Form | Field rules, controlled inputs, field-error mapper | Web/native component khác nhau; không ép chung React component |
| Async UI | Loading/empty/error/retry có props và accessibility phù hợp | Giữ pagination/infinite-list state riêng nếu semantics khác |
| Model/schema | Wire response và domain/view mapper có type, fixtures contract | Không đổi enum/nullable/date trong mapper để che contract BE sai |
| Domain formatting | Date, number, currency, translation fallback | Chốt timezone/locale; web và native test cùng ví dụ kỳ vọng |
| Auth/cache lifecycle | Storage adapters, user cache cleanup, request cancellation | Cookies/SecureStore có semantics khác; không chuyển token mobile sang storage không an toàn |
| Socket/media | Typed event adapters, subscription cleanup, recording/playback lifecycle | Native permissions/background không được kiểm chứng bằng web preview |

## 5. Các chặng đồng bộ với master plan

### C0 — Audit và tooling đầy đủ cho cả hai client

1. Inventory toàn src web/mobile, không chỉ services: routes/pages/screens, layouts/components, hooks, models/types, stores/redux, config, i18n, utils, scripts và dead-code candidates.
2. Lập feature mapping ba repo và danh sách API operation/event thực; đọc consumer thay vì kết luận từ path search 0 hit.
3. Reproduce baseline typecheck/lint/build; phân loại lỗi thật/dead code/tooling. Sửa lỗi baseline bằng task nhỏ để gates mới có ý nghĩa; không nới tsconfig hoặc xóa file để làm xanh khi chưa xét consumers.
4. Mỗi repo có nhánh tooling từ dev, attributes/format policy riêng, commit format tách biệt, scripts check không mutation và test harness phù hợp dependency. Không thay lockfile/package manager ngoài chủ đích.
5. Áp các quyết định tooling/native/Git bên trên; chốt convention client từ inventory và thêm tracker cả hai repo. Tích hợp nền main → dev của MO bằng PR riêng trước task MO sau self-review/checks và required review nếu repo có; ghi base/merge commit. C0 không được coi hoàn tất vì BE giai đoạn 0 đã xong.
6. Hoàn thành bảng mismatch API A/B/C/D, truy vết mock/real paths, gap có disposition. Chỉ chốt feature mẫu ba repo sau khi đường API thật và consumer được xác minh.

Gate: baseline lỗi có owner/task và regression threshold; nền dev đúng ở cả hai repo; runners hoạt động có tests thật; formatter/attributes/hook thống nhất; gaps API được phân loại; route mẫu thật được xác minh. Genymotion/runtime còn thiếu gì phải ghi pending, không coi unit test là native pass; không đổi UI/API qua format.

### C1 — Nền HTTP/error/session dùng chung

Theo master giai đoạn 1–2: bỏ log token; typed ApiError theo bảng/fixtures ở trên, locale/persistence adapter, test refresh/auth/cache/session cleanup. Extraction từng phần giữ API service return type hiện có đến khi operation được migrate. Không đổi interceptor toàn cục đồng thời ở hai client mà không có coverage. Fix [object Object] và giữ field errors là task bugfix riêng; không tự đăng ký lại filter BE để ép payload dễ parse hơn.

Gate: login/logout/account switch, request errors và mobile refresh concurrent pass; state/cache không rò giữa user/locale; web auth behavior hiện có được giữ.

### C2 — Feature mẫu xuyên suốt ba repo

- BE WordType + Level vẫn là hai mẫu convention backend. Chỉ migrate web/mobile nếu inventory xác nhận consumer; không thêm màn hình mobile cho WordType chỉ để đủ “ba repo”.
- Chọn thêm một feature có consumer thực ở cả ba repo sau C0. Vocabulary chỉ là ứng viên cho luồng web CRUD → BE → MO search qua /vocabulary/search đã đối chiếu; không giả định toàn dictionary/* hoặc quiz có BE. Gate mapping/gap C0 phải xong trước khi chốt mẫu. Nếu mapping không phù hợp thì chọn feature khác với lý do.
- Trong mẫu: schema/service typed result, query keys/hooks, form validation, loading/error/empty, component tách đúng trách nhiệm và i18n. Giữ contract BE hoặc có bảng before/after + adapter.
- Test một luồng web ghi dữ liệu → BE xử lý/lưu → mobile đọc/hiển thị cùng dữ liệu, thêm failure/validation cases; fixtures từ DB test, không dữ liệu demo.

Gate: có code mẫu thật trong cả ba repo và test e2e/consumer tương ứng; mẫu không chỉ là endpoint test hay UI giả.

### C3 — Rollout theo feature cùng master giai đoạn 3

Lập một backlog chung theo 5 nhóm ở master: danh mục, nội dung học, user/progress, kinh tế/subscription, battle/AI. Với mỗi feature, tracker ghi BE/Web/MO: không dùng hoặc mapped → contract-covered → standardized → verified → merged-dev.

Một batch có thể chia task nhỏ (BE, web service/hooks, mobile service/hooks, UI cleanup), mỗi task đi nhánh riêng và merge dev khi tương thích. Không yêu cầu cả giai đoạn cùng một branch; cũng không merge contract-breaking BE khi client chưa sẵn và không có adapter.

Ưu tiên clean toàn feature dọc trước khi tiếp theo: API contract → service/model → hook/cache → page/screen/components → tests → merge. Không đợi clean xong 81 BE modules mới bắt đầu clean clients. Feature không có consumer ở một nền tảng ghi rõ N/A, không dựng code trống.

Gate mỗi batch: consumer thực đã test; server và client invariants giữ đúng; task nhỏ đã merge dev từng repo có sửa và tracker ghi commit/PR liên kết.

### C4 — Các concern xuyên suốt và phần phức tạp

Theo master giai đoạn 4–6: khi BE đổi ownership/shared/response thì chạy consumer tests; nâng contract adapters/mappers client nếu cần, không đổi public payload chỉ vì BE đổi lớp nội bộ.

Hoàn thành clean các phần ngoài feature: web routing/permission/layout, form/table patterns, reusable components, Redux/Saga responsibility; mobile Expo Router/layout, SecureStore/session, deep link/payment return, list/pagination, GlobalSocketManager, native audio/upload/permissions/background lifecycle. Chỉ xử lý feature thực có trong source; không thêm product behavior mới.

Socket/AI/battle tách transport/domain/UI state; test mount/unmount/reconnect/background/foreground và cancellation/cleanup. Không tối ưu rendering/virtualization mặc định nếu chưa có vấn đề đo được.

Gate: native flow được kiểm trên emulator/thiết bị phù hợp; web navigation/accessibility/responsive behavior không regression; shared UI/utility có consumer thật và không chứa domain coupling ngầm.

### C5 — Hoàn tất toàn src và CI

- Bao phủ mọi bucket src của web/mobile, không chỉ feature có BE endpoint. Xóa adapters/type/utility/components cũ khi hết consumer; rà case-sensitive paths, aliases và generated/native configs bị tác động.
- Mục tiêu final: typecheck/build/lint/format đạt policy đã chốt cả ba repo; lỗi baseline được giải quyết, ngoại lệ có lý do và được ghi rõ, không nới rule để giấu lỗi.
- CI check riêng từng repo và contract fixtures/tests liên kết; test native runtime vẫn có bằng chứng thủ công nếu chưa tự động hóa được, không tuyên bố iOS đã pass khi chỉ có Android.
- Chốt CI-only: tạo mới .github/workflows/ci.yml trong mỗi repo, trigger pull_request đích dev, push dev và workflow_dispatch; jobs chỉ install theo lockfile/typecheck/lint/format/test/build phù hợp. Web dùng Vitest run, mobile Jest-expo CI, BE Jest + DB/Redis test services. Không gọi SSH, migration DB app, payment hoặc deploy.
- Actions đang tắt theo review: xác minh trên origin mới, giữ workflow deploy VPS BE run-ci-cd.yml và FE deploy-fe.yml disabled, chỉ bật ci.yml sau review cấu hình. Nếu bật Actions ở cấp repo thì kiểm tra từng workflow deploy vẫn disabled, không có workflow_run/reusable trigger kéo deploy vào. Không cần chờ C5 để chạy CI sớm nếu sẵn sàng; C5 bắt buộc check-only CI đã chạy thành công. Nếu Actions còn tắt thì ghi CI blocked, không coi local checks là CI pass.
- Docs convention và tracker có trạng thái actual, không coi compile pass là clean toàn src. Một repo chưa đạt thì master plan chưa hoàn tất toàn bộ.

## 6. Quy trình Git và acceptance

Tuân thủ mục 9 master. FE/mobile: dev → task branch → sửa/self-review/checks → tự commit/push → PR/merge dev khi đủ gates/review policy → checks tích hợp; không dừng hỏi người dùng trước mỗi commit. Chỉ BE phải trình diff và chờ người dùng duyệt trước từng commit. Task liên repo giữ gate BE riêng, không merge client phụ thuộc contract BE chưa được duyệt/tích hợp nếu không có adapter tương thích. Branch cùng task ID nếu phối hợp, chỉ tạo ở repo có sửa; không merge main/deploy hoặc bypass required review/CI. Đọc CI trigger FE/MO, không suy từ BE.

Organization triển khai hiện tại là `Pokenihongo-kumo`: origin của web là `Pokenihongo-kumo/PokeNihongo_FE`, mobile là `Pokenihongo-kumo/PokeNihogo_MO`. Repo cũ `SEP490-FALL25` chỉ là upstream để fetch, push URL đã đặt DISABLED. Push/tạo PR vào origin mới, đích dev cùng repo; không tạo PR về upstream theo mặc định của fork. Kiểm tra CI/protection/quyền của origin mới, không suy từ repo cũ. Bảng remote và ghi chú chuyển organization nằm ở mục 9 master.

Mỗi task ghi: feature/concern, thay đổi nội bộ hay behavior, before/after contract nếu có, repo/consumer, kiểm tra thực chạy, platform, branch/commit/PR, migration/rollback và việc còn lại. Không reset hoặc ghi đè công việc Claude/người dùng đang làm.

Checks tối thiểu theo tác động: HTTP/service tests với payload BE thật; parser invalid payload; query key/invalidation/user isolation; error/form states; browser smoke routes bị sửa; Android native smoke cho hook/config/native lifecycle bị sửa. iOS khi có môi trường, nếu thiếu ghi pending. Test không được truy cập DB/Redis demo hoặc payment/AI có phí thật.

## 7. Prompt Claude review phần mở rộng

> Đọc master plan v6 và kế hoạch client. Review phạm vi clean toàn src ba repo, nền MO dev chậm main, CI-only, Vitest/RTL web và Jest-expo/RNTL mobile, style 4 spaces/semicolon/LF, Genymotion, gap API/mock paths, feature mẫu endpoint thật và ApiError 422/status mismatch. Web realtime N/A. Giữ stack/state manager/Zod major và task branch → checks → commit/push/PR dev; chỉ BE chờ người dùng duyệt diff trước mỗi commit, FE/mobile tự review/checks rồi commit. C0–C5 phối hợp master; chưa triển khai code trong lượt review. Dẫn file, phân biệt bằng chứng với gate chưa kiểm chứng và bảo toàn tiến độ/dữ liệu demo.

## 8. Tài liệu đối chiếu cho task tooling

- [Vitest](https://vitest.dev/guide/): đối chiếu engines/peer requirements của phiên bản chọn với Vite/Node hiện có, không mặc định dùng latest.
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/): component tests web theo hành vi người dùng.
- [Expo unit testing](https://docs.expo.dev/develop/unit-testing/): Jest-expo preset và RN Testing Library; dùng phiên bản phù hợp SDK 53 hiện tại.
- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/): build chứa native modules; kiểm chứng APK và ABI của Genymotion trước khi đánh dấu native gate.
