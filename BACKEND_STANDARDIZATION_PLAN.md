# Kế hoạch clean toàn bộ backend PokeNihongo — review cùng Claude

Phiên bản 4 — 2026-11-02, bổ sung quy trình nhánh công việc → dev. Tiến độ triển khai thực tế ghi tại mục 12. Giữ các quyết định v3 (migration message có chủ đích, cô lập Bull/Redis, AsyncLocalStorage native, format không tổ chức import); bổ sung LF ổn định trên Windows và Redis URL parser hỗ trợ default port/ACL username.

## 1. Mục tiêu đã chốt

Clean toàn bộ `src` theo lộ trình dài hạn: thống nhất hai phong cách viết, gom logic có thể tái sử dụng, làm rõ trách nhiệm và giảm phụ thuộc giữa các phần. Người dùng chấp nhận làm lâu dài; không thu hẹp công việc chỉ còn các luồng demo phỏng vấn. Tối ưu hiệu năng không phải mục tiêu mặc định.

Backend là phạm vi refactor chính. Web và mobile là hai consumer bắt buộc phải audit và kiểm tra tương thích trong từng đợt. Có thể sửa client khi một thay đổi contract đã được xác định rõ và lập kế hoạch đồng bộ; không tự mở rộng thành viết lại giao diện hoặc kiến trúc toàn bộ client.

Ba repository nằm cạnh nhau:

- Backend: `PokeNihongo_BE`.
- Web: `PokeNihongo_FE` — React/Vite.
- Mobile: `PokeNihogo_MO` — Expo/React Native; giữ đúng tên thư mục hiện tại.

Giữ phiên bản dependency hiện tại theo lockfile: BE đang dùng NestJS 11, Prisma 6, Zod 3, nestjs-zod 4. Không gộp nâng major dependency, đổi DB schema hoặc thiết kế lại nghiệp vụ vào đợt clean code.

Hướng kiến trúc: module theo feature, Controller → Service → Repo, tái sử dụng bằng composition và hàm có type. Không dựng BaseService/BaseRepository CRUD tổng quát, không thêm CQRS/microservice/cache/outbox chỉ vì muốn code “chuẩn”.

Các thay đổi lớn như thu nhỏ SharedModule, tách service/gateway/worker và chuẩn hóa ownership response vẫn thuộc lộ trình dài hạn. Chúng nằm sau test và các module mẫu, không phải bước đầu và không tự động bỏ khỏi phạm vi.

## 2. Phạm vi bằng chứng và baseline

Audit hiện tại gồm tìm kiếm cấu trúc toàn BE, đọc pipeline chung, các module đại diện và consumer quan trọng trên web/mobile. Chưa xác minh hành vi runtime của mọi endpoint. Các đường dẫn `src/...` dưới đây thuộc BE trừ nơi ghi rõ web/mobile.

### Phát hiện đã đối chiếu

| Mức | Phát hiện và tác động thực tế | Bằng chứng | Hướng xử lý |
| --- | --- | --- | --- |
| P1 | Biến global có race khi chọn ngôn ngữ lỗi validation; chưa có bằng chứng nó làm lẫn dữ liệu người dùng | `common/middleware/request-context.middleware.ts`; `common/pipes/custom-zod-validation.pipe.ts` | Context riêng theo request, test xen kẽ hai locale |
| P1 | Reward hard delete và xóa translation chạy song song ngoài transaction, có nguy cơ chỉ thành công một bên | `modules/reward/reward.service.ts`, `delete`; nhánh reward đã soft-delete | Transaction bao cả hai thao tác; giữ semantics soft/hard delete |
| P2, sửa cùng transaction | Repo hard delete dùng PrismaService gốc thay vì tx; hiện hai call site đã tìm thấy không truyền tx nên chưa kích hoạt lỗi thoát transaction này | `reward.repo.ts`, `delete`; `reward.service.ts` tại create catch và delete | Sửa lựa chọn client trước khi đưa delete service vào transaction |
| P1 | Create Reward đã có transaction nhưng catch ngoài vẫn hard-delete để “rollback thủ công” rồi nuốt rollbackError | `reward.service.ts`, `create` | Xác minh mọi write nằm trong cùng tx, dùng rollback của DB, bỏ compensation thừa |
| P1 | Swagger WordType yêu cầu tag trong khi runtime schema nhận nameKey | `wordtype/dto/wordtype.dto.ts`; `wordtype/entities/wordtype.entities.ts` | Một nguồn định nghĩa DTO/schema; kiểm tra cả client |
| P1 | Bắt lỗi bằng câu tiếng Việt; lỗi không nhận diện có thể bị đổi thành 400 | `wordtype/wordtype.service.ts` | Phân loại bằng type/code, giữ lỗi ngoài dự kiến là 500 |
| P1 | Hai phong cách message: chuỗi cứng và I18nService | service lesson, test, testset, vocabulary, kanji, question-bank và các consumer `common/constants/message`; đối chiếu reward/level | Thống nhất message key + I18nService + I18nLang, kiểm tra client có so sánh câu chữ không |
| P1 | Pagination/query/response khác nhau, client phụ thuộc các field cụ thể | `shared/models/request.model.ts`, WordType, các repo; web/mobile services/hooks | Chuẩn nội bộ chung, adapter giữ contract hiện tại |
| P2 | Ngôn ngữ bị parse ở nhiều nơi; có debug log trong đường validate | decorator I18nLang, HTTP filter, validation pipe; pipe có 4 console.log | Resolver thuần dùng chung; bỏ debug log mặc định |
| P1 trước khi chạy integration test | Queue mặc định dùng prefix bull_production; cấu hình Bull parse URL nhưng không truyền DB index sang redis.db | `3rdService/bull/bull-queue.module.ts`, registerQueue; đối chiếu `3rdService/redis/redis.module.ts` dùng URL trực tiếp | Test đặt prefix và DB index riêng; sửa parser/config và validate cấu hình cuối trước khi boot |
| P2 | SharedModule chứa nhiều provider nghiệp vụ và phụ thuộc vòng | `shared/shared.module.ts` | Audit ownership, tách từng nhóm sau khi có test khởi động và DI |
| P2 | helpers.ts trộn Prisma errors, OTP, filename, date, display name, ELO | `shared/helpers.ts` | Tách theo trách nhiệm; domain logic nằm ở domain |
| P2 | Translation có nhiều format/fallback, không phải tất cả đều tương đương | `shared/utils/translation-helper.ts`, `translation.helper.service.ts`, `common/utils/prase.utils.ts` | Dùng chung lookup/mapping đúng ngữ nghĩa, giữ adapter cho format khác nhau |
| P2 | Global guard và guard cục bộ cùng tồn tại | SharedModule, WordType controller | Test ma trận auth trước khi bỏ guard trùng |
| P2 | File lớn có nhiều trách nhiệm | kaiwa.gateway, test/user-test-attempt/vocabulary service, Gemini, timeout processors | Tách theo use case; bảo vệ event/job/transaction trước |
| P1 | Client đang log access token | web `src/configs/axios/index.ts`; mobile `src/configs/axios.ts` | Bỏ log token trong commit nhỏ riêng; không thay cơ chế auth kèm theo |

Không xếp P0 cho các phát hiện trên chỉ vì chúng nằm ở lớp dùng chung. Mức ưu tiên phản ánh tác động đã quan sát/đọc được, không khẳng định lỗi đã xảy ra trên môi trường chạy.

### Số liệu và checks

- Inventory ban đầu: 81 thư mục module, 773 file TypeScript trong src; phải đếm lại nếu source thay đổi.
- Đã xác minh 48 file repo khai báo class hậu tố `Repo`, 32 file khai báo `Repository`. Chọn `XRepo` và `.repo.ts` để giảm chi phí đổi tên.
- 35 file `.repo.ts` chứa `withTransaction`, 57 file repo chứa `Math.ceil`, 196 file TypeScript chứa từ `any`. Đây là số file khớp tìm kiếm, không phải số lỗi.
- Có `test/app.e2e-spec.ts` scaffold, expect `Hello World!`; chưa tìm thấy unit test trong src. Ghi “chưa có test nghiệp vụ bảo vệ”, không ghi tuyệt đối “0 file test”.
- Typecheck từng chạy: TS2349 ở `test/app.e2e-spec.ts:20`, namespace import supertest không callable.
- ESLint --quiet trên hai file mẫu từng exit 0; chưa chứng minh toàn repo sạch lint/warning.
- Jest config trong package và `test/jest-e2e.json` chưa map alias `@/` theo rootDir riêng.
- lint-staged đang gọi lint/format toàn repo thay vì chỉ file staged.
- Đã kiểm tra BE: core.autocrlf=true, chưa có .gitattributes, các file tracked trong src phần lớn có working-copy CRLF. Không chỉ đổi endOfLine của Prettier: cần policy Git để checkout tiếp theo vẫn giữ LF. Số file EOL thay đổi theo phạm vi/checkout, phải đo lại bằng git ls-files --eol thay vì cố định số từ review.
- Claude review báo 43.942 cảnh báo Prettier và 25 module dùng 4 spaces. Đây là số liệu từ review, chưa được chạy lại trong audit này; giai đoạn 0 ghi baseline thực, không dùng con số này làm acceptance cố định.
- Theo thông tin người dùng, Postgres và Redis đã chạy bằng Docker. Chưa thực hiện kiểm tra kết nối hay tạo database test trong đợt lập plan này.

## 3. Convention thống nhất

### Naming và cấu trúc: tận dụng nền hiện có

```text
src/modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts
  <feature>.service.ts
  <feature>.repo.ts                 # class XRepo
  dto/<feature>.zod-dto.ts          # class XDTO extends createZodDto
  dto/<feature>.error.ts
  entities/<feature>.entity.ts      # Zod schema và inferred types theo nền hiện tại
  ...                              # tách use case/mapper khi có trách nhiệm thực
```

- Giữ hậu tố `DTO` in hoa, `.repo.ts`, thư mục `dto/` và `entities/`. Chuẩn đích chọn singular `.entity.ts`; rename `.entities.ts` theo từng module trong commit mechanical, không đổi mọi file ngay đầu.
- Không bắt cả repo chuyển sang `.repository.ts`, `schemas/`, `<operation>.dto.ts` hoặc `Dto`.
- Với schema/DTO quá lớn, được tách file theo use case trong cùng thư mục; không tách một lớp một file chỉ để đủ cấu trúc.
- Hợp nhất DTO Zod/Swagger trùng ý nghĩa. DTO metadata cho file/multipart có thể giữ riêng và phải có lý do; không ép tất cả response thành JSON.
- Class PascalCase, file kebab-case, constants UPPER_SNAKE_CASE. Feature name, URL và DB field là contract; không sửa chính tả tên public cùng rename nội bộ.
- Import giữa feature dùng alias `@/`, nội bộ feature dùng relative import. Tránh barrel tạo circular dependency.
- Dependency không gán lại dùng `private readonly`. Ưu tiên Prisma-generated types, z.input/z.output đúng ngữ nghĩa; dùng unknown cho dữ liệu ngoài và lỗi chưa phân loại.
- Nâng lint/TypeScript strict theo phần đã migrate. Không chữa lỗi bằng any/cast/disable hàng loạt.

### Trách nhiệm

- Controller giữ route/auth/validation và gọi service; không chứa query Prisma hoặc nghiệp vụ.
- Service điều phối nghiệp vụ và transaction; Repo chứa query/persistence mapping. Không dịch thông báo HTTP trong Repo.
- Giai đoạn đầu giữ cấu trúc service trả `{ statusCode, data, message }` đang có. Việc bỏ envelope khỏi service chỉ thực hiện ở giai đoạn response riêng khi test pipeline và consumer đầy đủ.
- Lớp mapper/presenter chỉ thêm khi có logic mapping hoặc khi chuyển ownership response; tránh thêm lớp rỗng.
- Hàm thuần ở common không phụ thuộc request, Nest provider hay domain. Capability cần DI nằm trong module sở hữu và được import/export rõ.
- Tách shared/helper theo trách nhiệm thực. Không tạo thư mục utilities chung rồi chuyển toàn bộ code lặp vào đó.

### Format

2 spaces, single quote, không semicolon, width 90, thống nhất LF. Format toàn source BE và các file test/script/config do repo quản lý trong một commit riêng tại giai đoạn 0. Loại node_modules, dist, generated code, dump, binary và dữ liệu import.

Trước khi format, commit tooling phải chốt line ending ở cấp repository:

- Thêm `.gitattributes` với `* text=auto eol=lf`; inventory file nhị phân và đánh dấu `binary` cho các pattern/path thực có (ảnh, audio/video, archive, PDF/font...). Kiểm tra nested attributes; ngoại lệ bắt buộc CRLF nếu có phải khai báo theo path và có lý do. Không áp LF lên binary.
- Khi index/working tree không lẫn thay đổi chưa commit, stage `.gitattributes`, chạy `git add --renormalize .`, review staged diff rồi commit cùng policy/tooling. Lệnh này có thể stage mọi sửa đổi tracked đang có: nếu working tree đang bẩn, phải tách/bảo toàn công việc trước, không chạy mù và không tự stash/reset thay đổi của người dùng.
- `git add --renormalize .` chuẩn hóa nội dung index, không tự viết lại working copy. Prettier sẽ đổi các file được format sang LF, nhưng để kiểm chứng checkout bền vững, tạo fresh clone hoặc worktree sạch từ commit chứa attributes và kiểm tra trên Windows với core.autocrlf=true. Không dùng checkout/reset hàng loạt trên working copy đang làm việc.
- Sau checkout sạch, chạy `git ls-files --eol`: file source text có newline thuộc policy phải là `i/lf`, `w/lf` và attribute eol=lf. File rỗng/không newline có thể là `none`; binary và ngoại lệ có chủ đích không tính là lỗi. Chạy format:check/lint trên checkout có cả commit format để chứng minh Git và Prettier thống nhất.
- Ghi hướng dẫn team: pull commit policy rồi dùng fresh clone/worktree sạch hoặc refresh checkout có kiểm soát sau khi bảo toàn mọi thay đổi cá nhân. Pull hoặc renormalize đơn thuần không bảo đảm mọi file hiện có được viết lại sang LF. Không yêu cầu mọi máy đổi core.autocrlf toàn cục để né vấn đề.
- Chỉ áp policy/renormalize cho BE trong batch này. FE/MO kiểm tra riêng trước khi cần chuẩn hóa line ending ở các repo đó; không tạo diff hàng loạt ngoài phạm vi.

Quy trình cụ thể vì `.prettierrc` đang có prettier-plugin-organize-imports:

1. Tạo `.prettierrc.format-only.json` tạm từ nội dung `.prettierrc`, bỏ thuộc tính `plugins`, đặt `endOfLine` thành `lf`; giữ các tùy chọn format còn lại. Kiểm tra overrides nếu có để không còn plugin tổ chức import được nạp.
2. Chạy Prettier bằng CLI trực tiếp với `--config .prettierrc.format-only.json`, không qua script/hook đang nạp config cũ. Ví dụ cho src: `pnpm exec prettier --config .prettierrc.format-only.json --write "src/**/*.{ts,tsx}"`; làm tương tự cho danh sách test/script/config đã chốt ở inventory, áp ignore cho generated/data.
3. Review diff và build/typecheck trước/sau; xác minh không xóa, sắp xếp hoặc chuyển import, nhất là side-effect imports và import dùng cho decorator metadata. Prettier có thể đổi dấu nháy/dấu phẩy/dấu ngoặc và xuống dòng: đây là commit chỉ đổi định dạng, không mô tả tuyệt đối là chỉ đổi khoảng trắng.
4. Xóa file config tạm sau lượt format; commit tooling trước đó phải làm cho lint-staged/format:check thường ngày không tự chạy organize-imports và không đưa lại thay đổi import vào commit format. Giữ config format chính tương ứng với kết quả format-only; tổ chức import dùng lệnh/config riêng, review và commit riêng, kiểm tra build và side-effect imports. Không bỏ qua hook để che một cấu hình còn mâu thuẫn.

### Message, validation và lỗi

- Thống nhất I18nService + message keys + I18nLang ở HTTP boundary. Chuyển các chuỗi cứng trong constants/message theo từng feature, giữ câu tiếng Việt hiện tại làm baseline.
- Chốt phương án (a): khi migrate feature, bổ sung/xác minh đủ bản dịch vi/en/ja cho các key được chuyển; en/ja nhận thông báo đúng ngôn ngữ ngay trong batch đó. Đây là thay đổi hành vi có chủ đích, không phải extraction giữ nguyên behavior. Không giữ tiếng Việt cho en/ja như trạng thái đích.
- Mỗi batch lập bảng constant cũ → message key → câu vi/en/ja → endpoint → consumer. Giữ nguyên câu vi và cấu trúc/status lỗi; test en/ja và các tham số nội suy/nội dung động nếu có. I18nService hiện fallback requested language → vi → key; giữ fallback này cho key thiếu/locale không hỗ trợ, nhưng không dùng fallback để che thiếu bản dịch của key vừa migrate.
- Rà toàn bộ import constants/message, gồm service/controller/helper/error files, không chỉ danh sách module chính. Review v2 báo khoảng 12 module và 35 file import; đếm lại lúc triển khai. Nếu web/mobile so sánh message text để quyết định hành vi, cập nhật consumer theo mục 4 trước khi bật message mới; không âm thầm đổi error shape hoặc thêm code công khai chỉ để giải quyết việc này.
- Validation/type/Swagger cho JSON DTO xuất phát từ Zod tương thích phiên bản đang cài. Không copy API Zod/nestjs-zod mới hơn.
- Tạo exception mới mỗi lần throw; phân loại bằng type/code. P2002/P2003/P2025 ánh xạ theo ngữ cảnh nghiệp vụ, không map mù mọi lỗi sang cùng status.
- Không thay error công khai từ string thành array/object, đổi validation 422 thành 400 hoặc thêm code field mặc định trong refactor. Nếu cần, đi qua quy trình đổi contract ở mục 4.

## 4. Web + mobile: quy trình tương thích bắt buộc

### Consumer cụ thể đã đọc

| Phần | Web | Mobile | Ràng buộc với BE |
| --- | --- | --- | --- |
| HTTP/auth | `src/configs/axios/index.ts`: bearer từ cookie helper, Accept-Language từ localStorage, withCredentials | `src/configs/axios.ts`: bearer từ store, refresh token từ SecureStore, xử lý các 401 đồng thời | Giữ header, status, auth requirements, URL prefix/version và refresh semantics |
| Refresh | Cần audit thêm auth service/saga; không suy ra web có flow giống mobile | Đọc `response.data.data.accessToken` và refreshToken | Envelope/field name/nullable phải giữ tương thích |
| Response | hooks useDashboard/useReward parse `response.data.data`; nhiều service unwrap khác nhau | dictionary đọc `data.results`, `data.pagination`, `statusCode`; subscription/progress có schema parse | Không sửa toàn cục interceptor hoặc bỏ field theo suy đoán |
| Pagination | hooks useTestSet và nhiều màn hình dùng currentPage/pageSize/pagination.current | reward history gửi currentPage/pageSize | So sánh request thực từng endpoint, giữ default và output shape |
| Socket | Inventory xác định consumer thực; chưa kết luận web có hoặc không có realtime | `src/configs/socket.ts` gửi bearer và Accept-Language trong `auth`, namespace theo room, websocket transport | Phân biệt handshake.auth với headers; giữ event/ack/payload và reconnect |
| Schema version | package web khai báo Zod 4 | package mobile khai báo Zod 3; BE cũng Zod 3 | Không import schema runtime BE trực tiếp vào hai client hoặc buộc nâng major để chia sẻ |

### Contract inventory

Mỗi route/event/job có dòng mapping: BE handler → request/response schema → web service/hook/page → mobile service/hook/screen → tests → trạng thái. Nếu một client không dùng, ghi “không có consumer được tìm thấy” kèm phạm vi search; không bịa coverage.

Ghi nhận cả method/path/version, query/body/params, auth/role/ownership, HTTP status và statusCode trong body, message/error shape, data nesting, null/optional, dates/enums/ID types, sort/filter/pagination defaults, multipart field names, file/content-type, timezone và locale fallback. Socket bổ sung namespace, auth source, event name, payload, ack, room và reconnect. Job bổ sung name/payload/retry/delay/idempotency đang có.

Mặc định refactor giữ wire contract: test backend trả fixture thật qua pipeline, rồi fixture phải qua parser/mapper của consumer web và mobile tương ứng. Không chỉ so OpenAPI; client có thể phụ thuộc khác tài liệu.

Với thay đổi hành vi có chủ đích:

1. Ghi before/after, endpoint, lý do, consumer bị ảnh hưởng và cách chuyển đổi. Siết validation, đổi mặc định pagination hoặc dịch message khác cũng tính là thay đổi hành vi.
2. Ưu tiên adapter BE giữ client cũ khi chuẩn hóa nội bộ. Không sửa client chỉ để che breaking change không cần thiết.
3. Nếu cần thay public contract, cập nhật DTO/parser/service/hook/UI/error handling của cả consumer có dùng; chia commit BE/FE/MO liên kết cùng một batch và test cả ba.
4. BE hỗ trợ contract cũ và mới trong khoảng chuyển tiếp nếu mobile cũ còn được dùng. Không giả định web/mobile cập nhật cùng lúc. Chỉ bỏ adapter khi có bằng chứng consumer cũ đã hết hoặc một mốc chuyển đổi được chốt.
5. Ghi thứ tự tích hợp và rollback cho cả ba repo. Push nhánh công việc và merge vào dev theo mục 9; không tự deploy hoặc merge vào main/production.

Không đổi response toàn cục trước khi hoàn thành ma trận này. Web build hoặc mobile typecheck pass không chứng minh UI/runtime tương thích.

## 5. Các phần nên gom để tái sử dụng

| Thành phần | Chuẩn đích và nơi đặt ban đầu | Giới hạn |
| --- | --- | --- |
| Pagination | Shared type/helper tính skip/take/meta, schema factory theo item; dùng WordType + Level làm mẫu | Không tự query/filter/soft-delete; giữ page/limit qua adapter, default từng route |
| ID/query validation | Tái dùng checkIdSchema; sort/field whitelist do feature khai báo | Không dùng whitelist chung cho mọi Prisma model |
| Language/context | Một resolver thuần tại i18n + provider singleton dùng AsyncLocalStorage từ node:async_hooks | Không Scope.REQUEST, không thêm nestjs-cls; HTTP/socket/job có context riêng rõ ràng |
| Prisma errors | Predicates nhận unknown và mapping có ngữ cảnh, tách khỏi helpers.ts | Không nuốt lỗi không dự kiến hoặc đổi 500 thành 400 |
| Transaction | Prisma.TransactionClient, cách chọn tx nhất quán; runner chỉ khi nhiều consumer thực cần | Service xác định boundary; không nested transaction hoặc rơi về client gốc |
| Message | I18nService/message keys; bổ sung vi/en/ja cùng batch migrate | Đổi ngôn ngữ en/ja là behavior change có fixture trước/sau; giữ semantics lỗi và baseline tiếng Việt |
| Translation | Capability lookup/upsert của TranslationModule, mapping có type; batch lookup khi loại bỏ được logic lặp | Giữ riêng key translations, JSON display_name và composite labels/fallback |
| Response | Generic schema/types và mapping có type trước; ownership envelope chuyển ở giai đoạn riêng | Giữ statusCode/message/data công khai, 201/204/raw response/serializer |
| qs parser | Một parser có test grammar cũ, config field/operator riêng từng feature | Không viết lại grammar cùng refactor; không override userId/deletedAt |
| Auth principal | Typed ActiveUser; hợp nhất aliases dần sau khi có auth tests | Không mất API key/bearer/AND/OR/permission checks |
| Date/time | Hàm UTC/day boundary có timezone tường minh, tách khỏi helpers.ts | Không đổi ngày tính attendance/thưởng theo timezone host |
| Config/logging | Validate config một nơi; Nest Logger theo context, bỏ log token/debug | Không kéo hết integration vào refactor config cùng lúc |

Domain logic như reward/wallet, grading, ELO, SRS, quota, timeout/finalization ở module nghiệp vụ. Có thể chia sẻ domain service giữa consumer nhưng không biến chúng thành generic utils.

Không bắt buộc tối ưu query, cache hoặc benchmark từng module. Khi extraction làm đổi số query/transaction hoặc phát hiện N+1 rõ ràng, ghi và kiểm tra tác động; tối ưu khác là task riêng có bằng chứng.

## 6. Môi trường test và dữ liệu

Postgres/Redis Docker đã có theo thông tin người dùng. Trước khi test, kiểm tra kết nối và cấu hình thực; không đọc/in secret vào report.

- Tạo database riêng, ví dụ `pokenihongo_test`; tuyệt đối không chạy test cleanup/reset/migrate/seed lên `pokenihongo` chứa dữ liệu đã nạp.
- Dùng cấu hình test tách biệt, validate tên database/target trước khi chạy thao tác ghi hoặc cleanup. Fail fast nếu trỏ nhầm DB hoặc dùng nhầm env production.
- Apply migration hiện có và seed fixtures tối thiểu lên DB test; test transaction dùng DB thật, không chỉ mock để tuyên bố rollback đúng.
- Ưu tiên Redis container riêng cho test. Trong mọi cấu hình test, khai báo rõ cả `QUEUE_PREFIX` riêng (ví dụ `bull_test`, hoặc `bull_test_<runId>` khi chạy song song) và Redis DB index dành cho test (ví dụ 15 sau khi xác minh chưa dùng). Nếu dùng chung Redis server, DB index phải khác app/demo. Không dùng default `bull_production`; không FLUSHALL hoặc xóa namespace app.
- Kiểm tra `REDIS_URI`, `REDIS_MATCH_URI`, BullModule.forRoot, từng registerQueue và client Redis trực tiếp. BullQueueModule hiện lấy host/port/password từ URL nhưng bỏ pathname/DB index: URL kết thúc `/15` chưa đủ. Bổ sung parse/validate index và truyền rõ `redis.db` cho Bull; ioredis trực tiếp cũng phải resolve về DB test. Không chỉ thêm biến REDIS_DB rồi giả định code tự đọc nó.
- Parser URL dùng `6379` khi URL không ghi port (không dùng parseInt('') ra NaN), validate port hợp lệ khi được cung cấp. Truyền `username` cho Redis ACL khi URL có user; hỗ trợ password-only và kết nối không credentials. Decode percent-encoded username/password đúng một lần theo API URL/client đang dùng, không log URI/credentials. Giữ redis/rediss và các connection options hiện có; không gộp thay đổi TLS policy vào task parser.
- Dùng cùng parser/config contract cho queue thường và queue match. Unit test với credentials giả: không port, port explicit, ACL user khác default, password-only/không auth, ký tự percent-encoded, DB index hợp lệ/sai và redis/rediss. Integration xác minh kết nối trong môi trường test; không đưa credentials thật từ .env vào test/report.
- Trước khi boot app/test workers, validate cấu hình cuối của từng queue/client sau merge options/overrides: endpoint, DB index, queue prefix đúng target test đã chốt. Fail fast nếu thiếu, sai hoặc quay về default app; `...options` ở registerQueue có thể ghi đè redis/prefix nên không chỉ kiểm tra env đầu vào. Nếu match dùng Redis riêng, validate target đó độc lập; fallback REDIS_MATCH_URI → REDIS_URI phải được kiểm tra.
- Thêm test cấu hình chứng minh URL có DB index đi tới `redis.db`, default/override không thoát isolation, và integration smoke ghi/đọc job/key chỉ trong DB/prefix test. Cô lập thêm theo run/worker nếu suite chạy song song; một prefix chung bull_test không cô lập các test run khỏi nhau. Cleanup chỉ tài nguyên của run hiện tại.
- Khi boot app test, kiểm soát startup hooks, seed, cron, queue processors, websocket emit và external providers; tránh app test vô tình chạy jobs vào môi trường demo.
- Mock/fake mail, payment, AI và upload có side effect; test tích hợp adapter dùng fixture/sandbox riêng khi cần. Không gọi thanh toán thật.
- Thiếu môi trường không phải lý do bỏ test: ghi đúng gate bị chặn, hoàn thành checks độc lập, chưa đánh dấu batch pass.

## 7. Lộ trình triển khai dài hạn

Thứ tự bắt buộc: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. Mỗi giai đoạn có batch nhỏ và điểm dừng ổn định. Không lấy deadline demo làm lý do bỏ các bước clean còn lại; cũng không trộn tất cả vào một diff lớn.

### Giai đoạn 0 — Inventory, baseline, format và test harness

1. Đọc hướng dẫn repo và git status cả BE/FE/MO; không ghi đè thay đổi của người dùng. Ghi versions thực từ lockfile.
2. Inventory nhanh đủ src: 81 modules, common/shared, integrations, i18n/config, cronjobs, websockets/workers. Chi tiết contract/consumer bổ sung trước từng batch, không cần phân tích mọi dòng code trước khi bắt đầu.
3. Ghi baseline build/typecheck/lint/format của cả ba repo, phân biệt lỗi có sẵn với regression. Chưa chạy e2e trước khi DB/Redis test được cô lập.
4. Commit tooling: thêm .gitattributes (`* text=auto eol=lf` và binary/ngoại lệ theo inventory), renormalize có kiểm soát và review staged diff; cấu hình check scripts/lint-staged đúng file staged, tách organize-imports khỏi formatter/hook. Theo quy trình mục Format, dùng config tạm không plugins để format toàn source BE trong commit riêng. Chạy build/typecheck trước/sau; xác minh i/lf + w/lf và format:check/lint trên checkout Windows sạch có core.autocrlf=true. Bổ sung hướng dẫn team refresh working copy an toàn; không format/renormalize FE/MO hàng loạt.
5. Sửa test tooling: import supertest, mapping alias unit/e2e, app close/cleanup; thay scaffold bằng smoke test có giá trị. Tạo test DB/Redis và fixtures như mục 6; sửa Bull URL parser hỗ trợ DB index, default port 6379 và ACL username/credentials. Test parser và kiểm tra QUEUE_PREFIX + DB index cuối cùng trước khi boot bất kỳ integration test nào.
6. Tách script check không mutation: typecheck, lint:check, format:check; giữ fix/format riêng. Thêm test harness nhẹ cho client parser/service nếu chưa có, không bắt đổi test stack toàn client.
7. Chụp response/OpenAPI mẫu, xác định nơi client parse dữ liệu, thiết lập tracker và danh sách hành vi cần bảo toàn.

Gate: commit format không đổi import behavior; .gitattributes bảo đảm i/lf + w/lf cho source text sau checkout Windows sạch, formatter/check/hook thống nhất; DB test riêng, Bull/Redis có prefix + DB index đã validate, parser pass default-port/ACL tests; test chạy độc lập với dữ liệu/job demo; baseline có report rõ, không giả vờ toàn repo xanh khi chỉ kiểm tra mẫu.

### Giai đoạn 1 — Sửa lỗi có tác động thật

1. Request context: chốt dùng `AsyncLocalStorage` từ `node:async_hooks` trong provider singleton được inject qua DI; không dùng Scope.REQUEST và không thêm nestjs-cls. Middleware mở store mới bằng `run(context, () => next())` cho mỗi request, pipe/filter/decorator đọc cùng typed context; không dùng singleton mutable hay enterWith để thay thế tùy tiện. Chỉ lưu dữ liệu context cần thiết (locale/requestId nếu dùng), quy định fallback khi không có HTTP context. Thay global.currentRequest, bỏ 4 console.log debug và globalI18nService khi DI thay thế đầy đủ. Test hai request xen kẽ, kết thúc/lỗi request, thiếu context; socket/job khởi tạo context riêng khi cần. Giữ 422/error shape ngoài thay đổi chủ đích đã nêu.
2. Reward delete: truyền cùng tx vào reward và translation deletion, lựa chọn thứ tự theo FK thực, bảo toàn soft/hard delete. Repo hard-delete dùng client đã chọn; translationRepo.deleteByKey cần hỗ trợ tx. Test lỗi từng bước đều rollback.
3. Reward create: xác minh writes đang trong transaction; bỏ hard-delete compensation/catch rỗng sau khi có test rollback. Read/validation ngoài tx cần được xem xét theo invariant, không mặc định mọi read đều phải nằm trong tx.
4. Sửa Swagger WordType tag/nameKey và catch dựa vào text; mỗi bugfix có before/after và regression test.
5. Bỏ token log ở axios web/mobile trong commit riêng, giữ auth behavior.

Gate: rollback create/delete thực sự pass trên DB test; validation đúng locale cho request xen kẽ; client parse/status/error tests tương ứng pass. Không tuyên bố đã sửa một sự cố production chưa từng quan sát.

### Giai đoạn 2 — Convention và hai feature mẫu

1. WordType + Level đại diện hai kiểu code. Tạo helpers pagination/ID/errors/language/transaction có consumer thực; giữ response envelope trong service ở giai đoạn này.
2. Áp naming XRepo/DTO, schema/DTO một nguồn, typed Prisma input/output và private readonly; rename tách khỏi logic.
3. WordType giữ adapter page/limit; Level giữ audit fields/soft-delete/translation. Đối chiếu FE/MO consumer trước khi chỉnh validation/default.
4. Không bỏ startup default WordType khi chưa có bootstrap thay thế; test hook và ghi task tách seed ở giai đoạn ownership nếu cần.
5. Viết convention và checklist từ code chạy được. Không tạo template/generator trước khi hai mẫu ổn định.

Gate: hai kiểu code dùng chung primitives thật, HTTP/Swagger/client contract tests pass, không thêm any không có lý do, không đổi cấu trúc response.

### Giai đoạn 3 — Chuẩn hóa theo chiều rộng toàn bộ module

Mỗi batch 3–5 feature theo dependency và mức ảnh hưởng. Inventory phải bao phủ tất cả module, không chỉ ví dụ dưới đây:

1. Danh mục: languages, meaning, lesson-category/content, grammar/usage, elemental-type, type-effectiveness...
2. Nội dung học: vocabulary, kanji, lesson, exercises, answer, question-bank, testset/testset-questionbank...
3. User/progress: user, history, progress, flashcard, SRS, exercise/test attempts và answer logs...
4. Kinh tế: reward, wallet, shop, gacha, invoice, payment, subscription/plan/feature...
5. Battle/AI: match/round/participant, leaderboard/season, conversation và các feature liên quan...

Trong mỗi batch: mapping consumer → contract tests phù hợp → naming/format còn lại → tái sử dụng helper → migration constants/message sang I18nService → type/error cleanup → kiểm tra BE/web/mobile → cập nhật tracker.

Migration message là commit behavior change riêng: ghi before (luôn tiếng Việt) / after (theo vi/en/ja), bổ sung hoặc xác minh bản dịch đầy đủ trong cả ba message dictionaries, giữ baseline vi, kiểm tra consumer có phụ thuộc câu chữ và cập nhật phối hợp khi cần. Test response của locale en/ja cùng toast/field errors trên các client có dùng. Không gom thay đổi này vào commit “chỉ refactor”; không hoàn tất batch nếu key mới chỉ chạy nhờ fallback tiếng Việt.

Không tự đổi route name, ID/date type, filter hoặc soft-delete. Feature chỉ cần rename không phải viết unit test mirror implementation; compiler/import checks và contract smoke phù hợp là đủ. Feature đổi behavior hoặc helper dùng chung phải có regression tests.

Gate từng batch: các consumer liên quan hoạt động; migration message có vi/en/ja và before/after tests rõ; không còn hai cách giải quyết cùng concern trong feature đã migrate nếu không có lý do nghiệp vụ ghi rõ. Lỗi có sẵn chưa sửa được ghi riêng, không che bằng cast hay đổi test.

### Giai đoạn 4 — Làm rõ ownership, thu nhỏ shared và integrations

1. Dựa vào dependency graph thực, tách PrismaModule, config và integration modules có owner duy nhất. Tạo `infrastructure/database`, `infrastructure/config`, `infrastructure/integrations`, `infrastructure/queue` khi chuyển capability tương ứng; không tạo một cây thư mục rỗng trước.
2. Thu nhỏ SharedModule theo nhóm provider; import/export module sở hữu thay vì khai báo lại class. Nghiệp vụ wallet/invoice/subscription/notification/gateway trở về module sở hữu.
3. Tách helpers theo responsibility; domain ELO ở domain. Chuyển từng cron/processor về owner rõ, giữ job names/schedules/registration.
4. Hợp nhất auth aliases/guard trùng sau ma trận auth test. Không thay permission semantics theo cảm tính.
5. `3rdService/payos` có code commented trong khi shared PayOSService đang hoạt động: kiểm tra import graph trước khi xóa. Dead code/dependency phải xét cả scripts/build/test.
6. Re-export từ path cũ chỉ dùng trong thời gian migration, có danh sách consumer và điều kiện xóa.

Gate: boot/shutdown/DI tests pass; không cycle mới, không provider/cron/queue/socket đăng ký hai lần; BE và consumer hoạt động sau chuyển ownership. Giai đoạn này thuộc mục tiêu dài hạn, không làm đồng thời với response rewrite.

### Giai đoạn 5 — Chuẩn hóa ownership response

1. Khóa fixture mọi response variant của các endpoint bị tác động: success, lỗi, list/detail, message-only, null, 201/204, file/stream, webhook.
2. Thử trên hai module mẫu: service trả kết quả nghiệp vụ có type; presenter/controller ánh xạ message/data; HTTP boundary sở hữu status và envelope. Chỉ thêm abstraction đủ dùng, không dựng framework response riêng.
3. Giữ nguyên response công khai `{ statusCode, message?, data }` và pagination shape từng route. Chuyển ownership nội bộ không đồng nghĩa xóa statusCode khỏi wire format.
4. Test thứ tự TransformInterceptor/ZodSerializerInterceptor bằng HTTP thật. Hỗ trợ trạng thái chuyển tiếp có giới hạn, không double-wrap hay bỏ field do serializer.
5. Rollout từng nhóm; đối chiếu parser/mapper web/mobile với fixture trả từ BE. Xóa logic envelope cũ sau khi consumer nội bộ đã chuyển xong.

Gate: contract không đổi ngoài bảng thay đổi chủ đích; không còn service tự dựng HTTP envelope trong phần hoàn tất. Nếu xuất hiện breaking change không cần thiết, giữ adapter và sửa thiết kế trước khi tiếp tục.

### Giai đoạn 6 — Tách service/gateway/worker nhiều trách nhiệm

- test/user-test-attempt: tách load question, grading, finalization/reward theo invariant và test hiện có.
- vocabulary/kanji: tách import/export, lookup, translation mapping khi đang trộn trách nhiệm.
- kaiwa.gateway: giữ transport/session/event tại gateway; orchestration và AI/speech adapters ở service riêng, bảo toàn streaming/cancel/error/reconnect.
- timeout processors: dùng chung domain use case nếu cùng invariant; giữ khác biệt nghiệp vụ. Test timeout đối đầu submit, retry/duplicate delivery, thứ tự ghi DB và emit.
- reward/wallet/payment: giữ transaction boundary rõ, external call không bị đưa vào DB transaction; không thêm retry/idempotency mới trong extraction nếu chưa xác định semantics cần thay.

Không tách theo số dòng máy móc; mỗi class mới có một trách nhiệm mô tả được. Test các invariant thay vì mock lại từng lời gọi nội bộ.

Gate: REST/socket/job và consumer regression tests pass; không phát thưởng/ghi lịch sử hai lần do extraction; replay fixture/event flow cũ giữ kết quả nghiệp vụ.

### Giai đoạn 7 — Dọn migration và hoàn tất toàn src

1. Xóa alias/re-export/DTO/helper cũ không còn consumer, cập nhật import, docs và OpenAPI. Không để hai implementation “tạm” tồn tại vô thời hạn.
2. Hoàn thành inventory tất cả 81 module và các bucket ngoài modules; recount theo source hiện tại. Trạng thái riêng: inventoried, contract-covered, standardized, extracted-if-needed, verified; không đánh đồng format với clean hoàn tất.
3. Siết lint/type rules dựa trên debt đã giải quyết, audit any/disable còn lại. Ngoại lệ phải có lý do cụ thể; không đòi 0 any bằng mọi giá ở thư viện dynamic.
4. CI check không mutation cho BE, consumer checks FE/MO và integration DB/Redis test riêng. Ghi rõ kiểm thử thiết bị nào đã chạy.
5. Tài liệu kiến trúc, convention, cách chạy test/demo và migration notes phản ánh code cuối. Có thể dùng làm tài liệu phỏng vấn nhưng không thay thế công việc còn dở.

Gate cuối: mọi bucket src được rà soát và đạt convention hoặc có ngoại lệ được chốt rõ; không bỏ phần khó vào “optional” rồi báo clean toàn bộ hoàn tất.

## 8. Ma trận kiểm thử theo tác động

| Thay đổi | Kiểm tra bắt buộc |
| --- | --- |
| Format/rename | Build/typecheck/import/DI check phù hợp, không phát sinh lỗi mới; diff không chứa logic ngoài phạm vi; checkout Windows sạch với autocrlf=true giữ i/lf + w/lf và formatter/check/hook pass cho phạm vi đã chuẩn hóa |
| Redis/Bull test config | DB index truyền thực vào Bull, prefix/DB không bị override về app, match/fallback đúng; port thiếu → 6379, ACL username/credentials được truyền đúng; fail trước boot khi config test sai, cleanup đúng run |
| Pagination/qs | Default, empty/last/out-of-range page, số không hợp lệ, sort/filter/enum/date/relation/JSON; giữ userId/deletedAt và grammar cũ |
| DTO/response | Status HTTP/body, data nesting, nullable/date/enums, hidden fields, raw response; fixture qua parser/mapper thực của web/mobile |
| Message/i18n | vi giữ baseline; en/ja có bản dịch thật cho key migrate; before/after behavior fixtures, fallback, request xen kẽ, string/array error shape, client toast/field errors và logic so sánh câu chữ |
| Auth/refresh | Bearer/API key/public/permission/ownership; mobile nhiều 401 đồng thời, refresh success/fail/logout; web flow riêng theo implementation |
| Transaction | Create/update/soft-delete/hard-delete thành công và lỗi từng bước; DB state rollback với transaction thật |
| Translation/time | Missing locale/key, format/fallback khác nhau; ranh giới UTC/UTC+7 và ngày thưởng khi phần đó bị sửa |
| Socket/jobs | Handshake auth vs headers, namespace/event/ack, reconnect token, stream/cancel, duplicate/timeout/retry và thứ tự state/emit |
| Upload/payment/AI | Multipart names/content-type, file/audio payload, webhook acknowledgment và signature path; provider giả, không tạo side effect thật |

Checks theo repo:

- BE: typecheck, build, lint:check, format:check, unit/contract/integration/e2e phù hợp. Script mới được bổ sung ở giai đoạn 0; không dùng --passWithNoTests để báo coverage.
- Web: build Vite, TypeScript check theo tsconfig project thực, lint phần đổi, parser/service tests và smoke các màn hình bị tác động. Không coi Vite build thay thế toàn bộ typecheck.
- Mobile: TypeScript/lint/tests phù hợp scripts hiện có; chạy Expo/dev build trên Android emulator hoặc thiết bị cho flow bị tác động. Expo web không thay thế native runtime test. iOS nếu có môi trường; nếu chưa chạy phải ghi rõ.
- Thay đổi shared auth/response/i18n yêu cầu regression rộng hơn thay đổi một feature. Không chạy lại toàn bộ suite lớn sau mỗi rename nếu không có rủi ro mới.

Luồng end-to-end ưu tiên bổ sung qua các batch: login/refresh; web CRUD nội dung → mobile đọc nội dung tương ứng; làm bài → tiến độ → thưởng/lịch sử; shop/gacha/subscription nếu bị tác động; matching/battle/kaiwa sau batch realtime. Xác minh route thực trước khi chốt kịch bản.

## 9. Quản lý tiến độ, commit và definition of done

### Quy trình Git bắt buộc: nhánh công việc → dev

Người dùng đã chốt: mỗi thay đổi độc lập đi qua nhánh riêng rồi merge vào `dev`. Áp dụng trong từng repo có sửa đổi; `dev` là nhánh tích hợp, không làm trực tiếp trên dev hoặc main. Khi được giao triển khai, commit/push nhánh công việc và merge vào dev là một phần của workflow; không cần hỏi lại cho mỗi thay đổi đã đạt gate. Việc cập nhật plan hiện tại không tự khởi chạy các thao tác này.

1. **Chuẩn bị nền:** kiểm tra git status, remote, nhánh hiện tại và quy định branch protection/CI của repo. Fetch và cập nhật dev từ remote bằng fast-forward khi có thể; không reset/force-push để làm mất commit. Nếu repo chưa có dev, xác minh nhánh nền hiện hành rồi khởi tạo dev từ đó, không mặc định lấy toàn bộ thay đổi dở dang trên nhánh công việc.
2. **Tạo nhánh trước khi sửa:** từ dev đã cập nhật, tạo `chore/<task>`, `fix/<task>` hoặc `refactor/<task>`. Một task là một thay đổi hoàn chỉnh có thể review/revert độc lập, không phải từng dòng code. Ví dụ: `chore/git-line-endings`, `fix/bull-redis-url`, `refactor/wordtype-conventions`.
3. **Làm và kiểm tra:** hoàn thành phạm vi task cùng tests/checks phù hợp; review diff, chỉ stage file/hunk thuộc task. Tách format, rename và bugfix; không gom thay đổi của người khác hoặc credentials vào commit. Baseline lỗi có sẵn phải ghi rõ, không coi đó là lý do bỏ kiểm tra regression.
4. **Commit và push nhánh:** dùng Conventional Commits phù hợp commitlint hiện có, ví dụ `fix(bull): preserve Redis database and ACL credentials`. Một nhánh có thể có vài commit nhỏ cùng mục tiêu; không đợi xong cả giai đoạn mới commit/push. Push lên đúng remote đã xác minh, không force-push.
5. **Tích hợp vào dev:** sau review diff và các gate/CI bắt buộc pass, merge nhánh công việc vào dev. Nếu repo yêu cầu PR/review, mở PR đích dev và tuân thủ protection, không bypass hoặc tự coi review bắt buộc là đã có. Mặc định giữ lịch sử bằng merge commit (`--no-ff`) nếu repo cho phép; nếu có chính sách merge khác thì tuân theo repo và ghi lại. Trước merge cập nhật với dev mới nhất, giải quyết conflict và chạy lại checks bị ảnh hưởng.
6. **Xác nhận tích hợp:** chạy smoke/checks phù hợp trên trạng thái đã merge; nếu merge local thì push dev khi kết quả đạt gate, nếu merge qua PR thì theo dõi CI của dev. Ghi branch, task commit, merge commit/PR và kết quả vào tracker. Không báo task hoàn tất khi mới push branch nhưng chưa merge dev hoặc checks sau merge đang lỗi.
7. **Task tiếp theo:** bắt đầu từ dev đã tích hợp thành công, tạo nhánh mới. Không tái sử dụng nhánh đã merge để làm task khác. Chỉ xóa nhánh công việc sau khi xác minh đã merge và không còn công việc chưa bảo toàn; việc xóa nhánh không phải điều kiện bắt buộc để hoàn thành task.

Trước push/merge phải đọc CI trigger: nếu push nhánh hoặc dev sẽ tự deploy tới môi trường thật, tách/điều chỉnh workflow tích hợp để không deploy ngoài phạm vi, hoặc báo rõ cần xử lý điều kiện đó trước khi tiếp tục. Không bypass required checks, không merge main/production và không rewrite lịch sử dùng chung.

BE/FE/MO là ba repo độc lập: task chỉ sửa BE thì chỉ tạo nhánh BE; task tác động cả ba có các nhánh cùng task ID, commits/PR liên kết và kết quả contract tests chung trước khi merge. Merge theo thứ tự tương thích (thường BE hỗ trợ cũ+mới trước, rồi clients); không giả định ba repo merge nguyên tử hoặc mobile đã cập nhật ngay.

### Tiêu chí hoàn thành và báo cáo

- Lập tracker theo feature/concern và mapping BE/FE/MO. Mỗi batch có mục tiêu, file liên quan, contract, tests, kết quả thực chạy và bước tiếp theo.
- Tách commit format, rename, extraction giữ behavior và bugfix. Repo là ba git root độc lập: ghi commit tương ứng cho batch phối hợp, không giả định commit nguyên tử cả ba.
- Logic chung mới phải có consumer thật và trách nhiệm rõ; helper chưa dùng không tính là đã tái sử dụng. Không gom các đoạn chỉ giống cú pháp nhưng khác nghiệp vụ.
- Bugfix đổi behavior có before/after và test. Không lấy “giữ contract” làm lý do giữ lỗi; thay vào đó lập migration thích hợp khi client bị ảnh hưởng.
- Không thay dữ liệu demo, reset DB app, gọi payment thật, deploy hoặc merge main/production. Commit/push nhánh công việc và tích hợp dev theo workflow ở trên.
- Ghi rõ checks chưa chạy, môi trường thiếu và baseline lỗi. Không tuyên bố toàn bộ pass chỉ từ compiler hoặc snapshot OpenAPI.
- Hoàn tất batch không có nghĩa hoàn tất toàn src. Giữ tracker để tiếp tục nhiều phiên, không phải lập kế hoạch lại sau mỗi phiên.

## 10. Prompt đưa Claude review trước

> Review BACKEND_STANDARDIZATION_PLAN.md phiên bản 4 với code thực của PokeNihongo_BE, PokeNihongo_FE và PokeNihogo_MO. Chưa triển khai refactor. Mục tiêu đã chốt là clean toàn src lâu dài, không giới hạn ở demo và không ưu tiên tối ưu hiệu năng. Kiểm tra bằng chứng/mức độ ảnh hưởng, convention XRepo/DTO, khả năng tái sử dụng, thứ tự dependency, test isolation pokenihongo_test, transaction Reward, và tương thích API/auth/response/i18n/socket với cả web/mobile. Bản này chốt migration en/ja là behavior change, AsyncLocalStorage native singleton, format không organize-imports với .gitattributes bảo đảm LF sau checkout Windows, và Bull parser hỗ trợ DB index/default port/ACL user với isolation kiểm tra sau merge options. Đặc biệt kiểm tra giai đoạn response ownership và tách shared/gateway/worker có gate đủ để thực hiện dần hay chưa. Phân biệt bugfix/refactor/breaking change, dẫn file cụ thể cho nhận xét. Đề xuất sửa plan khi có mâu thuẫn hoặc thiếu consumer; không đề nghị bỏ mục tiêu clean dài hạn chỉ vì phạm vi lớn. Không chạy thao tác ghi dữ liệu trên database pokenihongo.

Sau khi review được giải quyết và người dùng yêu cầu triển khai, dùng prompt sau:

> Triển khai kế hoạch đã review theo từng giai đoạn và gate. Bắt đầu từ git status ba repo, baseline, format riêng và môi trường test cô lập. Tuân thủ mục 9: tạo nhánh công việc từ dev trước khi sửa, hoàn thành từng task độc lập thì kiểm tra, commit/push, review và merge vào dev; xác nhận checks sau tích hợp rồi tạo nhánh mới từ dev. Không làm trực tiếp trên dev/main, không bypass protection/CI hoặc tự deploy. Làm WordType + Level thành mẫu rồi rollout đủ toàn src. Bảo vệ contract web/mobile bằng consumer tests; có migration phối hợp nếu thật sự cần đổi contract. Không nâng major dependency, không tạo generic BaseService/BaseRepository, không tối ưu không có bằng chứng. Cập nhật tracker với branch/commit/merge và checks thực chạy sau mỗi task; tiếp tục qua các phiên tới khi hoàn tất phạm vi dài hạn. Không merge main/production hoặc thay dữ liệu demo.

## 11. Tài liệu đối chiếu

- [NestJS Async Local Storage](https://docs.nestjs.com/recipes/async-local-storage): context theo luồng async; kiểm tra Node/runtime hiện tại khi áp dụng.
- [NestJS Modules](https://docs.nestjs.com/modules): provider ownership và import/export.
- Với Prisma/nestjs-zod/Zod, đối chiếu typings/source và lockfile đang dùng; tài liệu mới có thể mô tả API khác major. Web Zod 4 và mobile/BE Zod 3 không phải lý do nâng phiên bản trong task này.

## 12. Tiến độ triển khai

Nhánh BE: `chore/standardization-phase-0` (tạo từ `main` @ `c484a5e`). FE/MO chỉ đo baseline, không sửa file.

Ghi chú chuyển workflow: dòng trên ghi nhận nhánh đã bắt đầu trước khi người dùng chốt quy trình dev. Trước task tiếp theo, xác minh dev/remote và các commit/thay đổi đang làm; bảo toàn công việc, chia task độc lập và tích hợp qua nhánh đích dev theo mục 9. Có thể giữ nhánh hiện tại cho task đang dở nếu nền/commit tương thích với dev; không reset, checkout đè, amend hoặc di chuyển thay đổi của người khác chỉ để đổi tên/nền nhánh. Từ task mới trở đi bắt buộc tạo nhánh từ dev đã cập nhật.

### Giai đoạn 0

- [x] 1. Git status + versions — BE/FE/MO đều ở `main`, working tree sạch (BE chỉ có file plan chưa track). BE: NestJS 11.0.x, Prisma 6.8.2, Zod 3.25, nestjs-zod 4.3, TypeScript 5.7, Jest 29, supertest 7, Prettier 3.4, ESLint 9, Bull 4.16, ioredis 5.7. FE/MO dùng npm (`package-lock.json`).
- [ ] 2. Inventory nhanh toàn src
- [x] 3. Baseline build/typecheck/lint/format (xem bảng dưới)
- [x] 4. Commit tooling + commit format-only
  - [x] `7c62263` chore: `.gitattributes` (`* text=auto eol=lf`), `.prettierrc` endOfLine lf + bỏ plugin organize-imports (chuyển sang script `format:imports`), `.editorconfig` lf, lint-staged chỉ chạy file staged. Renormalize không tạo diff nội dung (index vốn LF).
  - [x] `6387573` style: format src+test (307 file). Script so import trước/sau: 0 file đổi import/thứ tự import. Typecheck giữ đúng 1 lỗi baseline, build pass, prettier/prettier 43.942 → 0.
  - [x] Worktree sạch với `core.autocrlf=true`: 1027 file `w/lf` (+2 `w/none` là 2 file rỗng), `format:check` pass.
  - [ ] Kiểm tra checksum Prisma migration sau khi chuyển LF — **bị chặn**: Docker Desktop chưa chạy.
- [ ] 5. Test tooling + test DB/Redis + Bull URL parser
  - [x] `0c7f276` fix(bull): `parseRedisUrl` (port mặc định 6379, DB index, ACL username, decode credentials một lần, rediss→TLS) + `assertTestQueueIsolation` kiểm tra options cuối sau merge. 14 unit test pass.
  - [x] `18357c5` test: Jest map alias `@/` và `src/`; e2e smoke (404 route lạ, 401 `/languages` không token, đóng app); `test/setup-e2e.ts` fail-fast nếu DB không `_test`, Redis DB 0 hoặc prefix không `bull_test` (đã thử cả 3 trường hợp sai: đều dừng trước khi kết nối); `.env.test.example`, `.env.test` vào `.gitignore`. Typecheck: 1 → **0 lỗi**.
  - [ ] Tạo DB `pokenihongo_test` + Redis DB 15, chạy `pnpm test:e2e` — **bị chặn**: Docker Desktop chưa chạy.
- [x] 6. Script check không mutation: `typecheck`, `lint:check`, `format:check` (trong `7c62263`).
- [ ] 7. Response/OpenAPI mẫu, nơi client parse dữ liệu, tracker hành vi cần bảo toàn
- [ ] Tích hợp vào `dev` theo mục 9 — **chờ quyết định**: xem ghi chú Git bên dưới.
- [ ] Gate giai đoạn 0

### Baseline (2026-11-02, trước mọi thay đổi)

| Repo | Typecheck | Build | Lint | Format |
| --- | --- | --- | --- | --- |
| BE | 1 lỗi: TS2349 `test/app.e2e-spec.ts:20` | `nest build` exit 0 | 54 errors (44 prefer-const, 7 no-require-imports, 3 ban-ts-comment); 44.460 warnings (43.942 prettier/prettier, 517 no-unused-vars) trên 393 file | `prettier --check` src+test: 309 file chưa đúng format (endOfLine đang `auto`) |
| FE | `tsc -b`: 52 lỗi | `vite build` exit 0 | 317 errors, 9 warnings | chưa có script format |
| MO | `tsc --noEmit`: 19 lỗi | không chạy (Expo, cần thiết bị/emulator) | 41 errors, 157 warnings | chưa có script format |

### Ghi chú phát hiện trong lúc triển khai

- FE: `src/components/ui/Carousel/index.tsx` import `embla-carousel-react` và `@/components/Atoms/ui/button` không tồn tại → typecheck lỗi nhưng `vite build` vẫn pass, nhiều khả năng là file không được dùng. Đây là ví dụ Vite build không thay thế typecheck (đúng như mục 8).
- FE/MO: `npm ci` bỏ qua postinstall của `esbuild` (FE) và `unrs-resolver` (MO) do policy install-scripts của npm; build/lint vẫn chạy được. Nếu sau này gặp lỗi native binary thì kiểm tra lại mục này.
- BE: 2 file rỗng 0 byte `src/modules/attendance/dto/create-attendence.swagger.ts`, `src/modules/dashboard/entities/dashboard.entity.ts` → ghi vào inventory là dead file, kiểm tra import trước khi xóa.
- BE: `docker-entrypoint.sh` và 197 `prisma/migrations/*/migration.sql` đang CRLF ở working copy Windows; sau khi áp `.gitattributes` cần chạy `prisma migrate status` (chỉ đọc) để chắc checksum migration không bị coi là đã sửa.
- BE: Husky đang bật (`core.hooksPath=.husky/_`) nhưng repo không có `.husky/pre-commit` hay `.husky/commit-msg` → lint-staged và commitlint chưa từng chạy khi commit. Đã sửa cấu hình lint-staged nhưng **chưa bật hook** vì ảnh hưởng cách commit của cả team; cần người dùng quyết.
- BE: Plan mục Format mô tả dùng config tạm không plugin. Thực tế đã bỏ plugin khỏi `.prettierrc` ngay trong commit tooling nên format bằng config chính, không cần file tạm; kết quả tương đương (đã kiểm import).
- BE: `.eslintrc.js` (cấu hình ESLint cũ) vẫn còn nhưng ESLint 9 chỉ đọc `eslint.config.js` → file thừa, xóa trong một task dọn dẹp riêng.
- BE: queue `kaiwa-processor` (`websockets.module.ts`) truyền `settings` riêng nên ghi đè toàn bộ `settings` mặc định (mất `lockDuration`, `drainDelay`). Hành vi sẵn có, giữ nguyên; ghi lại để xem xét ở giai đoạn ownership.
- Git (mục 9): `origin/dev` đang **chậm hơn `origin/main` 192 commit** và không có commit nào main thiếu (dev là tổ tiên của main). Nhánh phase-0 tạo từ đỉnh `main` (`c484a5e`). Nếu tạo nhánh từ `dev` hiện tại sẽ quay về code cũ hơn 192 commit → cần chốt: fast-forward `dev` lên `main` trước rồi mới tích hợp.
- Git (mục 9): CI `run-ci-cd.yml` chỉ chạy khi push `main` (deploy VPS + `prisma migrate deploy`); push nhánh công việc/`dev` không deploy. `dev` không bị protect (GitHub API). commitlint dùng `config-conventional`, các commit trên đều theo đúng định dạng.
- Git: máy chưa có credential GitHub cho HTTPS (`git push` không thể hỏi đăng nhập) → chưa push nhánh nào. Repo BE đặt danh tính commit cục bộ `Kumo <145751369+thuanhd2102@users.noreply.github.com>` (lấy từ lịch sử repo, chỉ áp cho repo này).
