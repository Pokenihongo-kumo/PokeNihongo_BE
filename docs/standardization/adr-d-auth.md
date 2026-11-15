# ADR D-auth — Bằng chứng OTP khi đăng ký, mã trao đổi Google

- Trạng thái: **proposed** (chờ duyệt thiết kế; chưa triển khai)
- Task: A1 T10 trong `BACKEND_STANDARDIZATION_PLAN.md`
- Đối chiếu code `dev` @ `481ab94` (sau T2–T4, T6, T11)
- Google đang `live-provider pending` (dịch vụ ngưng): kiểm chứng bằng test
  double, không coi là live pass.

## Bối cảnh (đã kiểm trên code)

1. **Đăng ký không cần OTP đã xác minh.** `AuthService.register` chỉ kiểm
   `password === confirmPassword` rồi tạo user + device + token. Luồng client
   (check-email → OTP → create-account) chỉ là thứ tự màn hình: gọi thẳng
   `POST /auth/register` với email bất kỳ là tạo được tài khoản cho email không
   phải của mình (chiếm trước email người khác).
2. **OTP không gắn mục đích.** OTP lưu ở Redis key = email (`code.sendId`); OTP
   đăng ký, đăng nhập thiết bị mới và quên mật khẩu dùng chung một key. Mã gửi
   cho mục đích này dùng được cho mục đích khác.
3. **Google callback đưa token lên URL.**
   `GET /auth/google/callback` redirect về
   `GOOGLE_CLIENT_REDIRECT_URI?accessToken=...&refreshToken=...`: token nằm trong
   lịch sử trình duyệt, log proxy, header Referer.
4. **OAuth `state` không chống CSRF.** `state` là base64 của `{userAgent, ip}`,
   không ký, không gắn phiên khởi tạo, không kiểm khi callback (parse lỗi thì
   bỏ qua). Kẻ tấn công có thể đưa nạn nhân vào luồng đăng nhập bằng tài khoản
   Google của kẻ tấn công (login CSRF).
5. Hiện không client nào (web, mobile) dùng luồng Google; đổi contract không làm
   hỏng client đang chạy.

## Quyết định đề xuất

### 1. OTP gắn mục đích
- Key Redis `otp:{purpose}:{email}` với `purpose ∈ {REGISTER, LOGIN, FORGOT_PASSWORD}`;
  bộ đếm T2 (`otp_verify:{email}`, `otp_send:{email}`) giữ nguyên theo email
  để không tạo thêm đường vượt giới hạn.
- `verify-otp` đã nhận `type`; nó chỉ đọc key đúng mục đích. Giai đoạn chuyển
  tiếp: đọc cả key cũ (email) trong 5 phút (TTL OTP) sau deploy rồi bỏ.

### 2. `registrationToken` cho đăng ký
- `POST /auth/verify-otp` với `type = REGISTER` thành công trả thêm
  `data.registrationToken`: chuỗi ngẫu nhiên 32 byte (không phải JWT), lưu Redis
  `reg:{sha256(token)} → email`, TTL 15 phút.
- `POST /auth/register` bắt buộc `registrationToken`; server `GETDEL` key (dùng
  một lần, nguyên tử), so email đã chuẩn hóa với email trong body; sai/thiếu/
  hết hạn ⇒ 401 `REGISTRATION_TOKEN_INVALID`. Email đã tồn tại vẫn 409 như cũ.
- Mobile (`create-account.tsx`) giữ token từ bước OTP và gửi kèm; đây là thay
  đổi contract cần làm đồng thời BE + MO.

### 3. Google: mã trao đổi thay token trên URL
- `GET /auth/google-link?codeChallenge=...&redirectUri=...`: client tạo
  `codeVerifier` (PKCE, S256) và gửi `codeChallenge`. `redirectUri` phải thuộc
  allowlist cấu hình (`GOOGLE_CLIENT_REDIRECT_URIS`), không thì 422.
- `state` = chuỗi ngẫu nhiên lưu Redis `oauth_state:{state} → {codeChallenge,
  redirectUri, userAgent}` TTL 10 phút. Callback `GETDEL` state; thiếu/sai ⇒
  redirect lỗi, không gọi Google.
- Callback thành công không phát token mà tạo `exchangeCode` ngẫu nhiên, lưu
  `oauth_exchange:{sha256(code)} → {userId, deviceId, codeChallenge}` TTL 60
  giây, redirect `redirectUri?code=...`.
- `POST /auth/google/exchange { code, codeVerifier }`: `GETDEL` code; kiểm
  `S256(codeVerifier) === codeChallenge`; đúng ⇒ trả cặp token như login. Sai,
  hết hạn hoặc dùng lại ⇒ 401. Mã bị lộ (log, Referer) vô dụng nếu không có
  `codeVerifier` chỉ client khởi tạo biết — áp dụng được cho cả web và native.

## Ảnh hưởng contract
- `POST /auth/verify-otp` (REGISTER): thêm trường `registrationToken` trong
  `data` (thêm trường, client cũ không vỡ).
- `POST /auth/register`: thêm trường bắt buộc `registrationToken` ⇒ **breaking**
  cho client cũ; triển khai BE + MO cùng đợt.
- `GET /auth/google-link`: thêm query bắt buộc; `GET /auth/google/callback`:
  redirect `?code=` thay vì token; route mới `POST /auth/google/exchange`.
  Không client nào dùng ⇒ không vỡ gì đang chạy.
- i18n: key mới `REGISTRATION_TOKEN_INVALID`, `OAUTH_STATE_INVALID`,
  `EXCHANGE_CODE_INVALID` (vi/en/ja).

## Thứ tự triển khai đề xuất (sau khi duyệt)
1. OTP gắn mục đích (BE, tương thích ngược trong thời gian chuyển tiếp). Test:
   OTP REGISTER không dùng được cho FORGOT_PASSWORD và ngược lại.
2. `registrationToken` (BE + MO cùng đợt). Test: register thiếu/sai/hết hạn/
   dùng lại token ⇒ 401; token của email A không đăng ký được email B.
3. Google exchange (BE). Test bằng double cho Google: state sai/dùng lại,
   redirectUri ngoài allowlist, code dùng lại, code hết hạn, verifier sai.

## Phương án đã cân nhắc
- **JWT ký làm registrationToken:** không thu hồi/dùng-một-lần được nếu không có
  thêm danh sách đã dùng ⇒ vẫn cần Redis, nên dùng chuỗi ngẫu nhiên cho gọn.
- **Đánh dấu "email đã xác minh" theo email trong Redis** thay vì token: ai biết
  email đã xác minh (vừa có người làm xong OTP) cũng đăng ký được trong cửa sổ
  đó; token gắn với người làm OTP chặt hơn.
- **Google: token trong fragment (`#`) thay vì query:** tránh log server nhưng
  vẫn lộ qua lịch sử/JS bên thứ ba; không giải quyết login CSRF.
