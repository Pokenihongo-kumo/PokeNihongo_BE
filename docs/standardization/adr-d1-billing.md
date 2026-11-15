# ADR D1 — Cấp gói sau thanh toán, link thanh toán, chống cấp trùng

- Trạng thái: **merged-dev** cho §1–§4 (người dùng đồng ý triển khai 2026-11-15); §5 hoãn tới khi clean nhóm 4
- Triển khai:
  - §1 cấp gói cùng transaction PAID: merge `a33a971`
  - §3 hủy invoice có điều kiện, hoàn coin một lần, xóa processor trùng: merge `ba9a9e0`
  - §2 một link PENDING mỗi invoice (migration `20261115120000_one_pending_payment_per_invoice`): merge `7871ab8`. Khác bản đề xuất: chưa thêm cột `needsRefund` — tiền về cho link không còn PENDING khi invoice đã PAID vẫn chỉ được ghi PAID, không cấp gói lần hai; hoàn tiền thủ công vẫn cần quy trình riêng
  - §4 `Payment.amount` Int (migration `20261115130000_payment_amount_int`): merge `a83ee95`
- Deploy: chạy `prisma migrate deploy`; trước đó kiểm dữ liệu theo ghi chú trong hai migration
- Task: A1 T9 trong `BACKEND_STANDARDIZATION_PLAN.md`
- Đối chiếu code `dev` @ `354f449` (sau T7, T8, T9a)

## Bối cảnh (đã kiểm trên code)

1. **Khe crash giữa PAID và cấp gói.** `PaymentService.grantPaidPayment` gọi
   `paymentRepo.markInvoicePaidOnce` (transaction: payment → PAID, invoice → PAID),
   rồi mới gọi `invoiceService.updateInvoiceWhenPaymentSuccess` (xóa job hết hạn,
   tạo/kích hoạt `UserSubscription`) ngoài transaction đó. Process chết, DB lỗi
   hay Redis lỗi giữa hai bước thì payment đã PAID nhưng không có gói; các
   callback sau gặp `claimed = false` nên không bao giờ cấp lại.
2. **Nhiều link đang mở cho một invoice.** `createPayOSPayment` đọc
   `findLatestPendingByInvoice` rồi mới tạo link mới (check-then-act): hai lần
   bấm "Thanh toán" song song tạo hai payment PENDING và hai link PayOS; người
   dùng có thể trả cả hai. T8 đã chặn việc hủy link thứ hai làm hỏng invoice đã
   trả, nhưng tiền trả lần hai không có đường hoàn.
3. **Job hết hạn invoice** (`shared/workers/invoice-expiration.processor.ts`)
   kiểm `status === PENDING` rồi update không điều kiện, rồi hoàn PokeCoin giảm
   giá. Tiền về giữa hai bước: invoice đã trả bị hủy và coin vẫn được hoàn. Hủy
   qua callback (T8) không hoàn coin, và sau đó job thấy invoice không còn
   PENDING nên cũng không hoàn → mất coin.
4. **Tiền kiểu Float.** `Payment.amount Float`; invoice dùng Int. So sánh số
   tiền PayOS (`Number(info.amount) === Number(payment.amount)`) dựa vào việc
   Float giữ đúng số nguyên VND.
5. **Cấp thưởng không có khóa chống trùng** theo phạm vi nghiệp vụ (ghi nhận
   ở review; chi tiết từng nguồn thưởng sẽ rà khi clean nhóm 4).

## Quyết định đề xuất

### 1. Cấp gói cùng transaction với PAID
- `markInvoicePaidOnce` nhận thêm bước tạo/kích hoạt `UserSubscription` trong
  **cùng** transaction (logic hiện ở `updateInvoiceWhenPaymentSuccess`, tách
  phần DB ra một hàm repo nhận `tx`). Thành công ⇒ PAID + gói ACTIVE cùng commit;
  lỗi ⇒ rollback cả hai, callback/webhook sau sẽ thử lại được.
- Việc ngoài DB (xóa job Bull, gửi mail) chạy **sau commit**, lỗi chỉ log; job
  hết hạn chạy muộn sẽ thấy invoice PAID và không làm gì (xem mục 3).
- Không cần bảng outbox ở giai đoạn này; nếu sau này có việc ngoài DB bắt buộc
  (ví dụ cấp thưởng ở service khác) thì mới thêm outbox.

### 2. Tối đa một link đang hoạt động mỗi invoice
- Ràng buộc DB: partial unique index `payment(invoiceId) WHERE status = 'PENDING'`
  (Prisma chưa hỗ trợ partial index trong schema ⇒ migration SQL thủ công, ghi
  chú trong `schema.prisma`).
- `createPayOSPayment`: trong transaction, đánh dấu EXPIRED các link quá hạn,
  rồi tạo payment PENDING; vi phạm unique ⇒ đọc lại link đang mở và trả về nó
  (idempotent). Chỉ gọi PayOS `createPaymentLink` sau khi đã giữ được chỗ;
  PayOS lỗi ⇒ chuyển payment đó sang FAILED.
- Vẫn giữ lịch sử nhiều payment attempt (EXPIRED/FAILED/CANCELLED) và cho phép
  thử lại sau khi link cũ hết hạn hoặc lỗi.
- Tiền về cho một link không còn PENDING (đã EXPIRED/CANCELLED) khi invoice đã
  PAID: ghi nhận payment PAID + cờ cần hoàn tiền (`needsRefund`), không cấp
  gói lần hai; xử lý hoàn tiền thủ công qua admin (ngoài phạm vi ADR này).

### 3. Hết hạn / hủy invoice có điều kiện và hoàn coin một lần
- Một hàm repo duy nhất `cancelPendingInvoice(invoiceId, reason)` dùng chung cho
  job hết hạn và callback hủy (T8): trong transaction, `invoice.updateMany where
  status = PENDING`; chỉ khi đổi được 1 dòng mới đổi subscription
  PENDING_PAYMENT → PAYMENT_FAILED và **hoàn PokeCoin giảm giá** kèm wallet
  transaction INCREASE. Nhờ điều kiện PENDING, coin được hoàn đúng một lần dù
  job và callback cùng chạy.
- Xóa bản trùng không đăng ký `modules/invoice/invoice-expiration.processor.ts`.

### 4. Tiền là số nguyên
- Migration `Payment.amount` Float → Int (VND không có phần lẻ); dữ liệu hiện có
  được làm tròn và kiểm tra trước khi đổi (query đếm bản ghi có phần lẻ ≠ 0).

### 5. Khóa chống cấp thưởng trùng
- Khóa theo phạm vi nghiệp vụ, không unique `sourceId` đơn lẻ: ví dụ unique
  `(userId, sourceType, sourceId, rewardId)` cho bảng ghi nhận thưởng. Danh sách
  nguồn thưởng và khóa cụ thể chốt khi clean nhóm 4; mỗi nguồn một migration
  riêng, có bước dọn bản ghi trùng hiện có.

## Ảnh hưởng contract
- Không đổi route hay shape response. `POST /payments/payos` gọi lặp/song song
  trả cùng một link (hiện có thể trả link khác nhau).
- Schema: partial unique index (mục 2), cột `needsRefund` (mục 2), kiểu
  `Payment.amount` (mục 4), unique thưởng (mục 5). Mỗi thay đổi schema là một
  migration và một task riêng.

## Thứ tự triển khai đề xuất (sau khi duyệt)
1. Mục 1 (không đổi schema). Test: lỗi ở bước tạo subscription ⇒ payment vẫn
   PENDING, callback sau cấp đúng một lần.
2. Mục 3 (không đổi schema). Test: job + callback hủy song song hoàn coin đúng
   một lần; tiền về giữa chừng không bị hủy.
3. Mục 2 (migration). Test: 5 lần tạo link song song ⇒ một payment PENDING, một
   lời gọi PayOS; link quá hạn ⇒ tạo được link mới.
4. Mục 4, 5 (migration, cần đối soát dữ liệu).

## Phương án đã cân nhắc
- **Đối soát định kỳ** (job quét payment PAID chưa có gói) thay cho mục 1: vẫn
  để người dùng chờ tới lượt quét và thêm một nguồn sự thật; chỉ cân nhắc nếu
  sau này cấp gói phải gọi dịch vụ ngoài DB.
- **Advisory lock theo invoice** thay cho partial unique index: không có ràng
  buộc ở mức dữ liệu, dễ quên ở entry point mới.
