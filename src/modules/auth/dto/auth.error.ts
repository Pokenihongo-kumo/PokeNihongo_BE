import { AuthMessage } from '@/i18n/message-keys'
import {
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from '@nestjs/common'

// Email related errors
export class EmailAlreadyExistsException extends UnprocessableEntityException {
  constructor() {
    super({
      message: AuthMessage.EMAIL_ALREADY_EXISTS,
      errorKey: AuthMessage.EMAIL_ALREADY_EXISTS
    })
  }
}

export class EmailNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: AuthMessage.NOT_FOUND_EMAIL,
      errorKey: AuthMessage.NOT_FOUND_EMAIL
    })
  }
}

// 401: sai email hoặc mật khẩu (trước đây trả 404)
export class FailToLoginException extends UnauthorizedException {
  constructor() {
    super({
      message: 'Sai email hoặc mật khẩu',
      errorKey: AuthMessage.FAIL_TO_LOGIN
    })
  }
}

export class InvalidOTPExceptionForEmail extends UnauthorizedException {
  constructor() {
    super({
      message: AuthMessage.INVALID_OTP,
      errorKey: AuthMessage.INVALID_OTP
    })
  }
}

// Auth token related errors
export class RefreshTokenAlreadyUsedException extends UnauthorizedException {
  constructor() {
    super({
      message: AuthMessage.REFRESH_TOKEN_ALREADY_USED,
      errorKey: AuthMessage.REFRESH_TOKEN_ALREADY_USED
    })
  }
}

export class UnauthorizedAccessException extends UnauthorizedException {
  constructor() {
    super({
      message: AuthMessage.UNAUTHORIZED_ACCESS,
      errorKey: AuthMessage.UNAUTHORIZED_ACCESS
    })
  }
}

// Google auth related errors
export class GoogleUserInfoException extends Error {
  constructor() {
    super(AuthMessage.FAILD_TO_GET_GOOGLE_USER_INFO)
    this.name = 'GoogleUserInfoException'
  }
}

export class NeedDeviceVerificationException extends UnauthorizedException {
  constructor() {
    super({
      message:
        'Đây là lần đăng nhập đầu tiên từ thiết bị này. Vui lòng kiểm tra email để xác thực.',
      errorKey: AuthMessage.NEED_DEVICE_VERIFICATION
    })
  }
}

// POST /auth/register without a valid one-time token from a verified REGISTER
// OTP for that email (missing, wrong, expired, already used or another email)
export class RegistrationTokenInvalidException extends UnauthorizedException {
  constructor() {
    super({
      message: AuthMessage.REGISTRATION_TOKEN_INVALID,
      errorKey: AuthMessage.REGISTRATION_TOKEN_INVALID
    })
  }
}

// POST /auth/google/exchange: unknown, used or expired code, or a code
// verifier that does not match the challenge sign-in started with
export class ExchangeCodeInvalidException extends UnauthorizedException {
  constructor() {
    super({
      message: AuthMessage.EXCHANGE_CODE_INVALID,
      errorKey: AuthMessage.EXCHANGE_CODE_INVALID
    })
  }
}

// GET /auth/google-link with a redirectUri outside the allowlist
export class GoogleRedirectNotAllowedException extends UnprocessableEntityException {
  constructor() {
    super({
      message: AuthMessage.GOOGLE_REDIRECT_NOT_ALLOWED,
      errorKey: AuthMessage.GOOGLE_REDIRECT_NOT_ALLOWED
    })
  }
}
