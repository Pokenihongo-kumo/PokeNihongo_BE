# Kế hoạch kiến trúc, dữ liệu và vận hành PokeNihongo

Phiên bản 1.1 — 2026-11-15. Bổ sung ràng buộc dịch vụ trả phí theo người dùng. Trạng thái: bản đề xuất để Claude đối chiếu code và người dùng chốt; chưa phải phê duyệt triển khai mọi thay đổi bên dưới.

## 1. Mục tiêu và quan hệ với kế hoạch clean

Phát triển PokeNihongo thành sản phẩm có người dùng thật, giữ khả năng mở rộng nghiệp vụ và vận hành lâu dài. Tiếp tục clean toàn src BE/web/mobile; không chờ clean toàn bộ mới cải thiện data, cũng không viết lại toàn hệ thống một lượt.

Đọc cùng [master clean plan](../../BACKEND_STANDARDIZATION_PLAN.md), [client plan](client-standardization-plan.md), [response contract](response-contract.md) và inventory mới nhất. Tiến độ đã ghi trong các tài liệu đó vẫn có giá trị; không reset checklist hoặc làm lại task đã hoàn tất.

- Hoàn thành batch đang dở và tích hợp theo workflow trước khi mở batch kiến trúc. Lúc lập tài liệu, checkout chính đang ở `refactor/phase-3-lesson-category` có sửa đổi chưa commit; tài liệu này được soạn trong worktree riêng từ `dev` @ `1d1bbb5`.
- Clean giữ behavior tiếp tục với phần không phụ thuộc quyết định data mới. Trước khi clean sâu payment/wallet, attempt/history, content publishing hoặc realtime, chốt thiết kế liên quan ở kế hoạch này để giảm sửa lại.
- Tách ba loại task: refactor giữ behavior; bugfix có regression test; thay đổi kiến trúc/schema/contract có quyết định thiết kế và migration.
- Quy tắc master “không đổi schema trong đợt clean” vẫn áp dụng commit clean. Schema chỉ đổi trong task riêng đã review theo kế hoạch này. Không coi tài liệu này là quyền tự đổi nghiệp vụ, thu phí hoặc deploy.
- Giữ stack/major và ba repo độc lập. Không mặc định thêm microservices, Kubernetes, Kafka, event sourcing, CQRS hoặc shared package frontend.

## 2. Bằng chứng và giới hạn đánh giá

Các phát hiện dưới đây từ đọc code ngày 2026-11-10, chưa phải exploit test, kiểm thử đồng thời hoặc đo tải. Claude phải đối chiếu lại HEAD khi nhận task vì source đang được sửa song song. Đường dẫn thuộc BE trừ khi ghi khác.

| ID | Bằng chứng | Tác động cần kiểm chứng | Task đích |
| --- | --- | --- | --- |
| F01 | `shared/shared.module.ts`: global export repo nghiệp vụ, PayOS, subscription, gateway; forwardRef WebsocketsModule | Ownership mờ, phụ thuộc vòng, khó boot/test riêng | A3 |
| F02 | `payment.controller.ts`: public GET return/cancel; `payment.service.ts#handlePayOSReturn` nhận query code/status và gọi markInvoicePaid | Nhánh đã đọc không xác minh nhà cung cấp trước ghi PAID; phải xử lý trước mở thanh toán thật. Rà cả cancel và mọi nguồn cập nhật trạng thái | A1 |
| F03 | `shop-purchase.service.ts#create`: checkEnoughBalance trước tx; `wallet.repo.ts#minusBalanceToWalletWithTypeUserId` decrement theo id không điều kiện balance | Hai request đồng thời có thể vượt số dư/giới hạn; có transaction chưa chứng minh đúng đồng thời | A1 |
| F04 | Prisma: Payment.amount/receivedAmount/changeAmount Float, Invoice tiền Int; User.freeCoins/premiumCoins cùng Wallet.balance | Chốt đơn vị tiền, nguồn số dư; chưa kết luận các field đều còn consumer | A1 |
| F05 | Prisma: Lesson.version là string; attempt/log tham chiếu nội dung hiện hành; question/answer có Cascade tới answer logs | Sửa/xóa nội dung ảnh hưởng lịch sử và chấm bài đang diễn ra | A2 |
| F06 | Prisma: LessonContents và UserSrsReview dùng contentType/contentId; Lesson/Exercises có rewardId Int[] | Không có FK tới từng đối tượng đích; cần mô hình quan hệ rõ và kiểm tra orphan | A2 |
| F07 | `websockets/socket-server.service.ts`: Map userId → một socketId trong RAM; `websocket.adapter.ts` log authorization/handshake | Nhiều thiết bị, nhiều instance, restart và lộ token trong log | A1/A4 |
| F08 | AppModule boot cron, queues, HTTP và gateways; matchmaking cron catch bỏ qua lỗi | Cần tách lifecycle và xác minh chống xử lý lặp trước nhiều instance | A4 |

Không suy nguyên nhân từ số module/file hay mọi cột nullable. Không kết luận DB live thiếu constraint chỉ từ Prisma: kiểm tra migrations và catalog trong môi trường test/staging được cho phép. Không dùng dump có thông tin người dùng làm fixture công khai.

Thông tin cũ phải được xác minh lại: mobile conversation hiện gọi service chuyển qua BE trong phần code đã đọc; không tiếp tục coi key Gemini nằm trong bundle là lỗi còn tồn tại chỉ vì inventory cũ ghi vậy. Rà secret/config cả ba repo trước khi kết luận đã xử lý đủ.

## 3. Kiến trúc đích đề xuất

Giữ modular monolith: một codebase BE, PostgreSQL là nơi lưu dữ liệu nghiệp vụ bền vững. Redis phục vụ cache, queue và trạng thái tạm có vòng đời rõ. Web/mobile dùng API và sự kiện có contract; không truy cập DB trực tiếp.

| Khối nghiệp vụ | Sở hữu và API nội bộ |
| --- | --- |
| Identity | User, role/permission, device/session; xác thực và kiểm tra quyền |
| Learning Content | Vocabulary/Kanji/Grammar, lesson, question, bản dịch nội dung, revision/publishing |
| Learning Progress | Attempt/answer history, progress, SRS state; submit/chấm điểm và lịch ôn |
| Economy | Wallet/ledger, reward claims, shop/gacha và quyền sở hữu vật phẩm |
| Billing | Invoice/payment, subscription và entitlement; tích hợp nhà cung cấp |
| Realtime | Matchmaking/match/round, kết nối, lệnh và đồng bộ trận đấu |
| AI | Conversation, pronunciation, provider adapter, usage/quota và timeout |
| Platform | DB connection, queue transport, media storage, mail, telemetry; không sở hữu nghiệp vụ ví/học |

Đây là ranh giới trách nhiệm, chưa phải yêu cầu di chuyển mọi thư mục ngay. Mỗi bảng có một khối được ghi chính; khối khác gọi use case/API nội bộ có type. Query đọc liên khối có thể dùng read service được chỉ định, không thêm service mạng để giả lập microservices.

Ví dụ: Learning hoàn tất bài → Economy cấp thưởng với khóa nguồn duy nhất. Learning không trực tiếp update Wallet. Billing xác nhận thanh toán → cấp entitlement qua giao dịch/use case xác định; controller không tự nối các bước rời rạc.

Đồng bộ trong cùng DB dùng transaction khi cần invariant nguyên tử. Chỉ thêm transactional outbox cho luồng đã xác định cần giao việc bền vững sau commit (ví dụ gửi thông báo); ghi outbox cùng tx, worker retry có dedup, theo dõi lỗi. Không tuyên bố exactly-once delivery; bảo đảm tác động nghiệp vụ không lặp. Không triển khai event bus tổng quát cho mọi CRUD.

## 4. Quyết định dữ liệu cần chốt trước implementation

### D1 — Payment, wallet và entitlement

- Return/cancel URL chỉ phục vụ UX; không tin query từ trình duyệt để ghi trạng thái tài chính. Xác nhận từ webhook có chữ ký hợp lệ hoặc truy vấn server-to-server; đối chiếu merchant/order/amount/currency và trạng thái.
- Viết bảng chuyển trạng thái payment/invoice/subscription, gồm hết hạn, callback trễ, retry, cancel xen kẽ success và refund nếu sản phẩm hỗ trợ. Paid không bị callback cancel cũ hạ trạng thái.
- Inbox/provider event có khóa dedup phù hợp sự kiện thực. Command người dùng có idempotency key gắn user + operation + request hash; cùng key khác payload phải bị từ chối. Định nghĩa retention và response replay; không dùng key client làm quyền truy cập.
- Cập nhật payment/invoice và entitlement trong transaction hoặc cơ chế phục hồi bền vững được chứng minh. Test crash giữa các bước và đối soát lại với provider. Không giữ DB transaction mở trong lúc gọi API ngoài.
- Chốt currency và đơn vị nhỏ nhất; ưu tiên integer có kiểm tra miền giá trị cho đơn vị nguyên hoặc Decimal cho nghiệp vụ cần phần lẻ. Quyết định Int/BigInt/Decimal dựa trên giới hạn thực; serialize API có chủ đích, tránh BigInt làm vỡ JSON. Không tự đổi mọi cột thành Float hoặc BigInt.
- Trừ ví bằng conditional update có balance đủ, kiểm tra số dòng bị tác động; ledger, purchase và grant cùng tx. Giới hạn mua/stock cần cơ chế chống race riêng, không chỉ bảo vệ số dư.
- Ledger bất biến: điều chỉnh/hoàn bằng entry bù, có source operation duy nhất, amount hợp lệ và đối soát balance. Không yêu cầu double-entry cho coin nội bộ nếu chưa có nhu cầu kế toán tương ứng.
- Inventory mọi read/write freeCoins/premiumCoins/Wallet; chọn nguồn chuẩn, quy tắc chuyển đổi và backfill đối chiếu trước khi xóa field cũ. Audit endpoint sửa/xóa ledger hoặc balance trực tiếp.

Gate: callback giả không cấp quyền; callback trùng không cấp hai lần; retry/crash phục hồi được; nhiều request mua đồng thời không âm ví/nhân đôi grant/vượt limit; ledger và balance đối soát khớp. Test provider bằng fixture/test double hoặc môi trường được phép, không giao dịch tiền thật.

### D2 — Nội dung xuất bản và lịch sử học

- Tách danh tính nội dung ổn định khỏi revision đã xuất bản. Đề xuất LessonRevision/QuestionRevision và cấu trúc answer tương ứng; tên/schema cụ thể chốt qua ADR và feature mẫu.
- Workflow draft → published → archived. Sửa bản đã published tạo revision mới; attempt đang chạy giữ đề, đáp án, thứ tự và scoring version lúc bắt đầu. Snapshot cho giá trị cần tái hiện; không sao chép vô hạn mọi media blob.
- Attempt/log không bị mất khi biên tập viên archive/xóa nội dung. Chọn Restrict/archive/retention phù hợp; không thay Cascade toàn schema một cách máy móc.
- Chốt progress theo danh tính lesson hay revision; bài học đổi thì người đã hoàn thành có phải học lại không? SRS đổi nghĩa/đáp án thì giữ lịch hay reset? Đây là quyết định sản phẩm còn mở, không tự chọn trong refactor.
- Submit có khóa/constraint và chuyển trạng thái có điều kiện, ngăn submit chấm/cấp thưởng lặp. Mobile có command ID để retry khi mất mạng; server vẫn quyết định điểm và quyền nhận thưởng.
- Lịch sử cũ không có snapshot không thể khôi phục chính xác quá khứ: đánh dấu legacy/best-effort khi backfill, không bịa revision lịch sử.

Gate: sửa/xóa bản nháp không đổi kết quả cũ; publish trong khi user làm bài không đổi đề/chấm điểm của attempt; submit lặp/đồng thời không cấp thưởng lặp; web quản trị xuất bản → mobile học → xem lịch sử sau lần xuất bản tiếp theo vẫn đúng.

### D3 — Quan hệ nội dung, reward và bản dịch

- Reward arrays → bảng nối có FK, số lượng/thứ tự/điều kiện nếu nghiệp vụ thực cần. Xác minh dữ liệu orphan/trùng trước migration; giá trị reward cần đóng băng theo chính sách lúc bắt đầu hoặc lúc hoàn thành, chốt rõ.
- Với đa loại nội dung, so sánh hai phương án: (a) ContentItem làm identity chung với subtype có quan hệ được ràng buộc; (b) quan hệ/bảng nối riêng Vocabulary/Kanji/Grammar. Đề xuất (a) nếu identity chung thực sự được dùng bởi lesson/flashcard/SRS; chọn (b) nếu phạm vi ổn định và đơn giản hơn. Không dùng JSON hoặc contentType/id không kiểm chứng chỉ để dễ thêm loại.
- Thiết kế invariant subtype, FK, uniqueness và chính sách xóa; nếu Prisma không biểu đạt được thì migration SQL có test và tài liệu riêng.
- Phân biệt bản dịch thông báo UI/API với bản dịch nội dung học. Chốt ownership theo domain/revision; không gom mọi bản dịch vào một service có quyền sửa tất cả bảng. Bảo toàn fallback vi/en/ja và contract hiện hành.

### D4 — Index, thời gian và dữ liệu tăng trưởng

- Chốt UTC cho instant; ngày điểm danh/lịch ôn theo timezone sản phẩm/user được xác định. Test chuyển ngày và retry; không đổi timestamp hàng loạt khi chưa biết semantics dữ liệu cũ.
- Lập query inventory cho lịch sử, due reviews, trận đấu, ledger. EXPLAIN trên dữ liệu đại diện trước khi thêm/bỏ index. Cursor pagination cho danh sách tăng liên tục khi cần; giữ adapter với page-based API cũ.
- Retention cho audio/AI payload/session/log; phân biệt dữ liệu học cần giữ với dữ liệu tạm. Có quy trình export/xóa tài khoản và chính sách xử lý lịch sử tài chính được chốt riêng trước vận hành liên quan.
- Chưa partition/shard/read replica nếu chưa có số liệu và nhu cầu cụ thể.

## 5. Lộ trình phối hợp với clean plan

| Chặng | Công việc | Điều kiện hoàn tất |
| --- | --- | --- |
| A0 — Thiết kế và baseline | Review tài liệu; cập nhật bằng chứng; domain map, ERD hiện tại/đích theo phạm vi; ADR D1–D3; chốt phạm vi bản phát hành đầu | Quyết định mở có owner; task có dependency, consumer và acceptance; không còn mâu thuẫn với master |
| A1 — Tính đúng đắn trước vận hành | Payment/wallet/reward, idempotency, auth/ownership, bỏ log bí mật; regression và concurrency tests | Gate D1 đạt; tính năng chưa đạt phải chưa mở cho người dùng thật |
| A2 — Một luồng học bền vững | Feature mẫu lesson → exercise/attempt → progress/reward → lịch sử; revision/quan hệ cần thiết; clean BE/web/mobile cùng luồng | Gate D2 đạt và dữ liệu migration đối soát; không coi Vocabulary CRUD một mình đã chứng minh lifecycle học |
| A3 — Rollout theo domain | Áp mẫu sang các nhóm master giai đoạn 3/C3; thu nhỏ SharedModule theo ownership, tách use case lớn khi có trách nhiệm rõ | Mỗi batch có owner bảng, contract/tests và integrated dev; không cần chờ clean hết BE mới làm client |
| A4 — Runtime và mở rộng có điều kiện | Worker entry point/lifecycle, realtime reconnect/multi-device, job retry/dedup; AI quota/timeout | Restart/crash không mất trạng thái bền vững; scale nhiều instance chỉ khi đã chứng minh phối hợp đúng |
| A5 — Pilot có người dùng thật | Staging, CI, backup/restore drill, observability, kiểm thử web/Android, ngân sách/SLO và release checklist | Các tính năng bật đã đạt gate; người dùng cho phép phát hành riêng; theo dõi và rollback được |

Bugfix nghiêm trọng đã xác minh có thể làm trước khi hoàn tất mọi ADR A0, nhưng phải có scope nhỏ, test và review. A1/A2 chỉ triển khai thiết kế liên quan đã chốt. A3 diễn ra theo feature, không đợi mọi module hoàn thành A2 đồng loạt.

Gợi ý phạm vi pilot để người dùng quyết: học → làm bài → lưu tiến độ → SRS trước; battle, gacha trả phí hoặc AI rộng mở mở dần khi đủ gate. Không tự xóa/tắt tính năng hiện có vì đề xuất này. Chưa ấn định user count, thời gian hay chi phí khi chưa biết tải và ngân sách.

## 6. Vận hành và realtime

### Dịch vụ Google đang tạm ngưng do chi phí — ràng buộc đã chốt

Người dùng xác nhận ngày 2026-11-15: một số dịch vụ Google đã ngưng do không tiếp tục trả phí. Mục tiêu hiện tại là giữ tích hợp sẵn sàng để vận hành khi billing/quota/cấu hình được cấp lại, không cố làm API thật chạy ngay hoặc coi việc chưa thanh toán là bug của source.

- Inventory từng capability thực dùng (ví dụ Gemini/Vertex AI, Speech-to-Text, Text-to-Speech nếu có): adapter, consumer BE/web/mobile, cấu hình bắt buộc, API/model/region, trạng thái và bằng chứng. Không mặc định mọi dịch vụ Google đều bị ngưng.
- Phân biệt lỗi code đã chứng minh với billing bị tắt, quota hết, credential/IAM hoặc API chưa bật. Không suy từ HTTP 403/429 đơn lẻ; đọc mã lỗi có cấu trúc đã che bí mật hoặc ghi chưa xác định. Khi đã xác nhận blocker môi trường thì dừng thử gọi lại để chữa source.
- Giữ provider và tính năng hiện có; không tự đổi nhà cung cấp/model, nâng SDK, tìm free-tier, tạo tài khoản/key khác, bật billing hoặc gọi API tính phí để vượt blocker. Thay đổi thật sự cần do API cũ không còn được hỗ trợ phải có bằng chứng và task riêng, không hứa chỉ nạp tiền là chắc chắn chạy.
- Vẫn kiểm tra code/contract/config, timeout, cleanup, xử lý unavailable và cô lập dependency. Dịch vụ tùy chọn bị tắt không nên làm hỏng các luồng không liên quan; thiết kế cơ chế cấu hình rõ nếu hiện thiếu, không nuốt lỗi hoặc giả thành công. Web/mobile hiển thị trạng thái tạm không khả dụng, không lưu điểm/kết quả AI giả vào dữ liệu thật.
- Unit/integration nội bộ dùng fixture và test double ở boundary provider, không thay logic nghiệp vụ bằng mock. Kiểm cả success, lỗi provider, timeout và cancel. Các test gọi Google thật tách riêng, opt-in và mặc định không chạy trong local/CI; không dùng credential giả để vô tình gọi mạng thật.
- Tracker tách hai trạng thái: `code/contract verified` và `live-provider pending: billing/quota/config`. Có thể hoàn tất batch clean với pending được ghi rõ; không tuyên bố E2E tính năng Google hoặc production-ready đã pass. Không để blocker này chặn các batch học/DB/client không phụ thuộc nó.
- Runbook kích hoạt lại: người dùng cấp lại billing/quota và cho phép kiểm thử có phí; xác minh credential/IAM/API/model/region còn hợp lệ, đặt giới hạn chi phí, chạy smoke tối thiểu từng capability rồi kiểm consumer web/mobile. Chỉ mở tính năng cho người dùng thật sau khi live smoke đạt; lỗi code còn lại được tạo task từ bằng chứng thực.

Gate A4/A5: dịch vụ chưa được cấp phí giữ live-provider pending; chỉ phần tính năng được bật trong pilot phải đạt live gate tương ứng. Không xóa tiêu chí kiểm thử, không báo toàn bộ sản phẩm đã xác minh trong khi capability còn pending.

### Các yêu cầu runtime khác

- API/worker/scheduler có entry point hoặc cấu hình vai trò rõ. Không nhân bản cron vô điều kiện khi tăng API replicas; audit lock/lease và claim job hiện có trước thêm cơ chế mới.
- Socket room theo user hỗ trợ nhiều thiết bị; không dựa vào một socket ID làm danh tính nghiệp vụ. Auth/permission lại cho command, token expiry/revocation có chính sách.
- Match có state machine và version; command/event có ID, sequence khi cần; reconnect lấy snapshot authoritative rồi đồng bộ. Redis adapter chỉ chuyển sự kiện giữa server, không tự lưu lịch sử hay xử lý ordering/recovery của ứng dụng.
- Match deadline được lưu, job có thể chạy lại; restart khôi phục việc cần làm. Test timer cleanup và graceful shutdown, bỏ forceExit trong e2e khi lifecycle được xử lý.
- AI qua BE với quota/user, hạn mức concurrency, timeout/cancel và thống kê usage; không mặc định provider đều hỗ trợ cùng feature. Không log token, âm thanh hoặc hội thoại thô vào log chung.
- Structured logs có request/job correlation và redaction; theo dõi error rate, latency, DB pool, queue backlog/failure, AI usage và sai lệch đối soát. Chốt ngưỡng và người nhận cảnh báo trước pilot.
- Backup phải có restore drill, RPO/RTO do người dùng chọn; migration staging, secret separation và rollback app được thử. Không khẳng định backup có tác dụng chỉ vì cron backup chạy.

## 7. Migration và tương thích ba repo

1. Inventory schema/query/consumer và dữ liệu lỗi trên môi trường được phép. Tách model nội bộ khỏi DTO public; không để migration tự đổi API.
2. Expand: thêm cấu trúc tương thích ngược và constraint khả thi. Đánh giá lock/index với phiên bản PostgreSQL thực; không copy API Prisma/SQL theo major khác.
3. Backfill theo batch, có checkpoint/retry và đối soát count/invariant. Không sửa dữ liệu mơ hồ âm thầm; đưa vào báo cáo xử lý.
4. Nếu có dual-write thì phải có một owner và consistency/reconciliation rõ; không duy trì hai nguồn chân lý vô thời hạn. Feature flag/canary chỉ thêm khi rollout thực cần.
5. Chuyển đọc/ghi và consumer theo thứ tự tương thích. API cũ có thời hạn hỗ trợ; chốt phiên bản mobile tối thiểu và policy cập nhật trước khi bỏ field/endpoint cũ.
6. Contract: xóa cấu trúc cũ sau khi không còn consumer, đối soát và qua thời gian quan sát đã chốt. Tách destructive migration khỏi rollout đầu. Không giả định rollback schema luôn an toàn sau dữ liệu mới; có forward-fix/restore plan và tác động mất dữ liệu rõ.

Giữ response contract đã chốt và vi/en/ja. Client schema runtime theo Zod major riêng; fixtures/OpenAPI làm bằng chứng liên repo. Android Genymotion development build để smoke, thiết bị thật cho khả năng emulator không đại diện; iOS chưa test phải ghi pending, không tuyên bố hỗ trợ đã xác minh.

DB test `pokenihongo_test`, Redis test endpoint/DB/prefix riêng; fail-fast kiểm tra cấu hình cuối. Không chạy migrations/backfill thử trên DB demo hoặc gọi payment/AI có phí thật. Concurrency/integration tests dùng DB thật cô lập, không chỉ mock repo.

## 8. Git, tracker và quy trình review

Giữ task branch từ dev → checks → commit/push → PR/merge dev, chỉ origin `Pokenihongo-kumo`, không main/deploy/upstream. Một task review/revert độc lập; format, refactor, behavior và schema migration tách rõ. Không ghi đè công việc Claude/người dùng.

**BE, kể cả tài liệu: trình diff, checks, ảnh hưởng và commit message rồi chờ người dùng duyệt trước mỗi commit. FE/mobile tự review/checks và tiếp tục theo policy repo, không hỏi từng commit.** Merge liên repo theo compatibility, không giả định atomic release hoặc tất cả mobile cập nhật ngay.

Mỗi task ghi: ID; bằng chứng/path; vấn đề đã xác minh hay giả thuyết; lựa chọn thiết kế; owner/domain; bảng/API/client bị ảnh hưởng; acceptance/tests; migration/rollback; branch/commit/PR; kết quả thực; việc còn lại. Trạng thái: proposed → verified → design-approved → implementing → merged-dev → runtime-verified. Không coi merged là đã chạy tốt trên thiết bị/production.

Checklist khởi đầu:

- [ ] A0.1 Claude review bằng chứng và thứ tự; đồng bộ master/client plan, không triển khai trong lượt review.
- [ ] A0.2 Chốt phạm vi pilot, ngân sách AI/hạ tầng, platform đầu tiên, dữ liệu cần giữ và RPO/RTO.
- [ ] A0.3 ADR payment/economy + ERD và state transitions; task A1 có regression/concurrency tests cụ thể.
- [ ] A0.4 ADR content revision/history + quan hệ content; chốt semantics progress/SRS khi publish bản mới.
- [ ] A0.5 Mapping task kiến trúc với batch clean đang có, ngăn hai agent sửa cùng feature.
- [ ] A1–A5 triển khai sau review và quyết định tương ứng; chưa đánh dấu hoàn tất trong tài liệu này.

## 9. Prompt để Claude review

> Ràng buộc bổ sung 2026-11-15: một số dịch vụ Google tạm ngưng do không trả phí. Áp dụng mục 6: chuẩn bị code/config/test double/runbook để kích hoạt lại; đánh dấu live-provider pending, không cố sửa code để vượt lỗi billing/quota, không tự đổi provider hoặc gọi API tính phí. Chỉ sửa lỗi code có bằng chứng; vẫn tiếp tục các batch độc lập. Đối chiếu tracker mới nhất trong checkout chính, không coi tiến độ lịch sử của worktree này là HEAD hiện tại.

> Đọc product-architecture-plan.md cùng master clean plan, client plan, response contract và tracker mới nhất. Đây là mở rộng mục tiêu từ clean code sang sản phẩm có người dùng thật. Chỉ review, chưa triển khai. Đối chiếu F01–F08 và các thay đổi mới của code; phân biệt lỗi xác minh được, giả thuyết cần concurrency/runtime test và đề xuất thiết kế. Rà payment return/cancel/webhook, atomic debit/ledger/reward dedup, revision/history/cascade, polymorphic content, ownership, lifecycle và compatibility mobile. Đề xuất phương án đơn giản nhất đủ yêu cầu; không thêm microservices hay mô hình tổng quát không có consumer. Nêu P1/P2 theo tác động có điều kiện, migration/data loss risk, gate còn thiếu, ADR cần người dùng quyết và batch nào nên tiếp tục/tạm hoãn để tránh làm lại. Giữ tiến độ clean hiện có, không sửa dữ liệu demo. BE phải chờ duyệt trước commit; FE/MO tự review/checks theo workflow. Trả nhận xét có file/symbol, hướng sửa tài liệu và thứ tự task đầu tiên; không khẳng định đã test khi chỉ đọc code.

## 10. Tài liệu tham chiếu

- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html): FK/unique/check cho invariant phù hợp; triển khai đối chiếu phiên bản DB thực.
- [payOS webhook signature](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/): xác thực dữ liệu provider; không dùng return query thay xác nhận thanh toán.
- [Socket.IO adapters](https://socket.io/docs/v4/adapter/): phối hợp nhiều server; không thay persistence/recovery nghiệp vụ.

Tài liệu ngoài là tham chiếu nguyên tắc. API implementation phải khớp package/lockfile đang dùng; không gộp nâng major vào task kiến trúc.
