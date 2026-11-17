# Plan port cho dịch vụ ngoài (3rdService)

Trạng thái: **design-approved** (D-IP1–D-IP4 chốt 2026-11-17). Viết từ code `dev` @ `5ec0e64` (2026-11-17), chỉ đọc code. Chi tiết hóa giai đoạn 4.1 và 4.5 trong [BACKEND_STANDARDIZATION_PLAN.md](../../BACKEND_STANDARDIZATION_PLAN.md) cho phần dịch vụ ngoài, chạy cùng [module-boundary-plan.md](module-boundary-plan.md). Không đổi route, response contract, job hay socket event, trừ những route được duyệt xóa ở D-IP3.

## 1. Mục tiêu

1. **Mỗi dịch vụ ngoài nằm sau một port** (`abstract class`, đặt tên theo năng lực, không theo nhà cung cấp): `PaymentGateway`, `MailSender`, `FileStorage`, `SpeechToText`, `TextToSpeech`, `LlmClient`. Module nghiệp vụ chỉ inject port.
2. **Mỗi port có hai adapter**: bản thật (PayOS, SMTP, Cloudinary, Google) và bản giả chạy không cần mạng hay key. Chọn adapter bằng biến môi trường.
3. **Chạy được demo và test khi dịch vụ trả phí đang tắt.** VPS, mail và Google hiện đang ngưng, nên đây là lợi ích dùng được ngay, không chỉ để "đẹp kiến trúc".
4. **Adapter chỉ gọi nhà cung cấp và đổi lỗi của họ thành lỗi của mình.** Nghiệp vụ (OTP, mã đơn hàng, prompt, lưu gợi ý) trả về module sở hữu.
5. **Xóa code chết và code trùng** trong lúc làm (mục 4).

## 2. Hiện trạng

| Dịch vụ  | File (dòng)                                                          | Ai dùng                                                                                                          | Test đang giả lập thế nào                                                                                                                    | Vấn đề                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PayOS    | `shared/services/payos.service.ts` (254)                             | `payment.service`                                                                                                | 4 spec `jest.spyOn(PayOSService.prototype, ...)`                                                                                             | Tạo SDK bằng key thật trong constructor; trộn lời gọi PayOS với nghiệp vụ (`generateOrderCode`, `generatePaymentUrls` đọc `process.env.APP_URL`, `createPayOSItems`); export global qua `SharedModule`. `3rdService/payos/*` comment toàn bộ (code chết, giai đoạn 4.5)                                                                                                                                     |
| Mail     | `3rdService/mail/mail.service.ts` (295)                              | auth, user, payment, cron subscription, `mail.controller`                                                        | 3 spec override `MailerService`, 2 spec override `MailService`; stub `test/support/stubs/css-inline.ts` vì addon native bị chặn trên máy dev | Trộn gửi mail với OTP (sinh, lưu Redis, consume, verify) vốn là nghiệp vụ auth. 3 method không ai gọi: `sendBookingCancellationEmail`, `sendRefundNotificationEmail`, `sendSubscriptionSuccessEmail`. Template không ai dùng: `booking-code`, `invite-vendor-campaign`, `last-login`; `booking-cancellation`, `refund-notification`, `subscription-success` chỉ được 3 method chết dùng (sót từ dự án khác) |
| AI       | `gemini.service.ts` (2233), `vertex-ai.service.ts` (1084)            | controller `gemini`, `gemini/vertex-ai`; kaiwa qua socket                                                        | Không có double; `test/gemini` chỉ test pronunciation                                                                                        | **Hai SDK** cho cùng việc: `@google/generative-ai` và `@google/genai`. `getPersonalizedRecommendations` viết hai lần, route `gemini/recommendations*` và `gemini/vertex-ai/recommendations*` trùng nhau. `GeminiService` inject `PrismaService`, `GeminiConfigRepo` (chéo module), `SpeakingService`, Upload, TTS, STT, Redis, tức là service nghiệp vụ đội lốt integration                                 |
| Speech   | `speech-to-text.service.ts` (234), `text-to-speech.service.ts` (213) | TTS: question-bank, testset, vocabulary, speaking, kaiwa gateway/processor, gemini; STT: speaking, kaiwa, gemini | Không có                                                                                                                                     | Tạo client Google trong constructor; `speech/config/speech.config.ts` có 4 cách tạo `SpeechClient`                                                                                                                                                                                                                                                                                                          |
| Upload   | `upload.service.ts` (627)                                            | auth, kanji, pokemon, speaking, vocabulary, gemini, TTS, kaiwa, `upload.controller`                              | Không có                                                                                                                                     | 6 method public không ai gọi: `uploadImageFile`, `uploadAudioFile`, `uploadVideoFile`, `uploadDocumentFile`, `uploadMultipleFilesByType`, `getFileTypeInfo`. Các biến thể `uploadVocabulary*`/`uploadFileByType` lặp cùng logic chọn folder và kiểm tra loại file                                                                                                                                           |
| RabbitMQ | `3rdService/microservices/*`                                         | Không module nào import, `main.ts` không `connectMicroservice`                                                   |                                                                                                                                              | Code chết; dependency `@nestjs/microservices` có thể bỏ nếu không còn chỗ nào dùng                                                                                                                                                                                                                                                                                                                          |

Client đang gọi (đọc source MO/FE): `/gemini/recommendations/srs`, `/gemini/pronunciation-assessment`, `/speech/voices/ja-JP`, `/speech/preview-voice`, `/upload/file`, `/upload/image`. Không client nào gọi `gemini/vertex-ai/*`, `gemini/kaiwa`, `gemini/chat`, `gemini/speaking/evaluate`, `gemini/test-native-audio-dialog`. Kaiwa realtime đi qua `kaiwa.gateway`, không qua route HTTP. Swagger hoặc admin thủ công có thể vẫn dùng, nên xóa route phải duyệt (D-IP3).

Bull và Redis là hạ tầng, không phải nhà cung cấp cần thay, nên không làm port. Đã có trong giai đoạn 4.1 (`infrastructure/queue`).

## 3. Thiết kế đích

```text
src/infrastructure/integrations/
  payment/
    payment-gateway.port.ts        # abstract class PaymentGateway
    payos.adapter.ts               # bản thật, @payos/node
    fake-payment.adapter.ts        # link giả xác định, webhook ký bằng secret cục bộ
    payment-gateway.module.ts      # chọn adapter theo PAYMENT_DRIVER
  mail/      mail-sender.port.ts, smtp.adapter.ts, log-mail.adapter.ts
  storage/   file-storage.port.ts, cloudinary.adapter.ts, local-file.adapter.ts
  speech/    speech-to-text.port.ts, text-to-speech.port.ts, google-*.adapter.ts, fake-speech.adapter.ts
  ai/        llm-client.port.ts, gemini.adapter.ts, fake-llm.adapter.ts
```

Ví dụ port:

```ts
export abstract class PaymentGateway {
  abstract createLink(input: CreatePaymentLinkInput): Promise<PaymentLink>
  abstract getLink(orderCode: number): Promise<PaymentLinkInfo>
  abstract cancelLink(orderCode: number, reason?: string): Promise<void>
  abstract verifyWebhook(body: unknown): Promise<PaymentWebhookData>
}

// payment-gateway.module.ts
{ provide: PaymentGateway, useClass: env.PAYMENT_DRIVER === 'payos' ? PayOSAdapter : FakePaymentAdapter }

// payment.service.ts
constructor(private readonly paymentGateway: PaymentGateway) {}
```

Quy tắc:

- **Port mỏng.** Chỉ những thao tác nhà cung cấp làm, dùng kiểu dữ liệu của mình, không lộ kiểu SDK ra ngoài.
- **Lỗi thống nhất.** Lỗi mạng, timeout, 5xx của nhà cung cấp → `IntegrationUnavailableError` → 503 có message key (theo mẫu `mail.UNAVAILABLE` của T1). Lỗi dữ liệu (chữ ký webhook sai) giữ nguyên ngữ nghĩa hiện tại.
- **Nghiệp vụ trả về owner:**
  - OTP (sinh, lưu, consume, verify; key `otp:{purpose}:{email}`, compare-and-delete theo T1) → `OtpService` trong auth.
  - Mã đơn, URL return/cancel, map item → payment.
  - Prompt, lưu gợi ý, chấm speaking, pronunciation → module nghiệp vụ tương ứng, gọi `LlmClient`.
  - Chọn template và dữ liệu cho từng email → module gửi; `MailSender.send(template, to, context)` chung.
- **Chọn adapter theo env**, validate bằng Zod trong config: `PAYMENT_DRIVER=payos|fake`, `MAIL_DRIVER=smtp|log`, `STORAGE_DRIVER=cloudinary|local`, `SPEECH_DRIVER=google|fake`, `LLM_DRIVER=gemini|fake`. `.env.test` mặc định toàn bộ là fake.
- **Chặn fake ở production.** Config validate từ chối boot khi `NODE_ENV=production` mà driver là fake. Đặc biệt `FakePaymentAdapter` cho phép "thanh toán" không tốn tiền, nên chỉ được chạy ở test hoặc demo cục bộ.
- **Test override port**, không spy prototype của SDK: `overrideProvider(PaymentGateway).useValue(fake)` hoặc dùng luôn adapter fake có hook để chỉnh kết quả.

## 4. Tối ưu code

| Việc                                                                                                                                                                          | Ước lượng                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Xóa `3rdService/payos/*` (đã comment toàn bộ)                                                                                                                                 | 3 file                                                           |
| Xóa `3rdService/microservices/*`, bỏ `@nestjs/microservices` nếu không còn chỗ dùng                                                                                           | 5 file, 1 dependency                                             |
| Xóa 3 method mail chết và 6 template không dùng                                                                                                                               | ~70 dòng + 6 file `.hbs`                                         |
| Xóa 6 method upload chết; gộp các biến thể upload thành `upload(file, kind)` với bảng quy tắc (mimetype, dung lượng, folder)                                                  | `upload.service.ts` 627 → khoảng 250 dòng                        |
| Một SDK AI duy nhất (`@google/genai`, D-IP4); gộp hai bản `getPersonalizedRecommendations`                                                                                    | Bỏ 1 dependency; `vertex-ai.service.ts` (1084) gần như hết trùng |
| Gộp 4 cách tạo `SpeechClient` thành một factory                                                                                                                               |                                                                  |
| Test: bỏ 4 chỗ spy `PayOSService.prototype` và override `MailerService`; stub `css-inline` có thể không cần nữa khi test dùng `LogMailAdapter` (mailer module không được nạp) | Test ngắn và ít phụ thuộc chi tiết SDK hơn                       |

Số dòng là ước lượng từ đọc code, đo lại sau từng batch.

## 5. Thứ tự batch

Mỗi batch: nhánh từ `dev`, merge `dev`, cập nhật tracker mục 12. Contract snapshot e2e giữ nguyên.

| Batch | Phạm vi                                                                                                                                                                                             | Phụ thuộc                                                                                                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| I0    | Dọn code chết: `3rdService/payos`, `microservices/rabbitmq`, method/template mail chết, method upload chết. Kiểm bằng grep + typecheck + e2e                                                        | Ngay; không cần chờ batch nào                                                                              |
| I1    | Mail: `MailSender` + `SmtpAdapter` + `LogMailAdapter`; tách `OtpService` về auth, giữ nguyên key Redis và hành vi T1–T4; test chuyển sang override port                                             | Sau B2 của module-boundary (auth/user core)                                                                |
| I2    | Payment: `PaymentGateway` + `PayOSAdapter` + `FakePaymentAdapter`; mã đơn và URL về payment; bỏ `PayOSService` khỏi `SharedModule`; 4 spec payment/invoice dùng port                                | Cùng hoặc ngay sau B4 (kinh tế lõi); chạm luồng ADR D1 nên `test/payment`, `test/invoice` phải pass nguyên |
| I3    | Storage: `FileStorage` + `CloudinaryAdapter` + `LocalFileAdapter`; gộp các biến thể upload                                                                                                          | Độc lập, sau I0                                                                                            |
| I4    | Speech: `SpeechToText`, `TextToSpeech` + adapter Google + fake; một factory client                                                                                                                  | Độc lập, sau I0                                                                                            |
| I5    | AI: `LlmClient` một SDK; tách `GeminiService` thành adapter và các use case nghiệp vụ (gợi ý, chấm speaking, pronunciation, kaiwa) ở module sở hữu; gộp recommendations; xóa route đã duyệt ở D-IP3 | Sau I3–I4; làm cùng giai đoạn 6 (Gemini, kaiwa.gateway đã có trong danh sách)                              |
| I6    | Đóng: không còn `3rdService/`; README ghi các biến `*_DRIVER` và cách chạy demo không cần key; cập nhật [backend-convention.md](backend-convention.md)                                              | Sau I1–I5                                                                                                  |

## 6. Gate

- Typecheck 0, unit và e2e pass, snapshot không đổi (ngoài route xóa có duyệt).
- **Boot app với toàn bộ driver fake mà không có key nhà cung cấp nào** trong env. Đây là tiêu chí chính của plan này.
- Unit test config: `NODE_ENV=production` + driver fake → boot thất bại.
- Không còn `jest.spyOn(<SDK service>.prototype, ...)` trong test, không còn import SDK nhà cung cấp ngoài thư mục adapter (kiểm bằng script `arch:deps` của B0 hoặc grep).
- Dịch vụ thật vẫn ghi `live-provider pending` cho đến khi được bật lại. Fake pass không được coi là live pass.

## 7. Quyết định (chốt 2026-11-17)

- **D-IP1 — duyệt**: adapter đặt ở `src/infrastructure/integrations/` (đúng giai đoạn 4.1 của plan chính), bỏ `3rdService/` ở I6.
- **D-IP2 — duyệt**: driver fake được dùng ở test và demo cục bộ; với payment, demo mua gói không qua PayOS thật. Production vẫn bị chặn (mục 6).
- **D-IP3 — duyệt**: xóa ở I5 các route không client nào gọi: `gemini/vertex-ai/*` (3 route trùng), `gemini/kaiwa`, `gemini/chat`, `gemini/speaking/evaluate`, `gemini/test-native-audio-dialog`. Ghi before/after vào tracker; route client đang gọi giữ nguyên.
- **D-IP4 — duyệt**: `@google/genai` là SDK AI duy nhất, bỏ `@google/generative-ai` ở I5.
