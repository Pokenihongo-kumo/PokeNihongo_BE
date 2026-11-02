import { AUTH_MESSAGE } from '@/common/constants/message'
import { AuthMessage } from '@/i18n/message-keys'
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from '@nestjs/common'

// OTP related errors
export class InvalidOTPException extends UnauthorizedException {
  constructor() {
    super({
      message: AUTH_MESSAGE.INVALID_OTP,
      errorKey: AuthMessage.INVALID_OTP
    })
  }
}

export class OTPExpiredException extends UnauthorizedException {
  constructor() {
    super({
      message: AUTH_MESSAGE.OTP_EXPIRED,
      errorKey: AuthMessage.OTP_EXPIRED
    })
  }
}

export class FailedToSendOTPException extends BadRequestException {
  constructor() {
    super({
      message: AUTH_MESSAGE.FAILED_TO_SEND_OTP,
      errorKey: AuthMessage.FAILED_TO_SEND_OTP
    })
  }
}

// Email related errors
export class EmailAlreadyExistsException extends UnprocessableEntityException {
  constructor() {
    super({
      message: AUTH_MESSAGE.EMAIL_ALREADY_EXISTS,
      errorKey: AuthMessage.EMAIL_ALREADY_EXISTS
    })
  }
}

export class EmailNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: AUTH_MESSAGE.NOT_FOUND_EMAIL,
      errorKey: AuthMessage.NOT_FOUND_EMAIL
    })
  }
}

export class EmailAlreadyActiveException extends NotFoundException {
  constructor() {
    super({
      message: AUTH_MESSAGE.EMAIL_ACTIVE,
      errorKey: AuthMessage.EMAIL_ACTIVE
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
      message: AUTH_MESSAGE.INVALID_OTP,
      errorKey: AuthMessage.INVALID_OTP
    })
  }
}

// Auth token related errors
export class RefreshTokenAlreadyUsedException extends UnauthorizedException {
  constructor() {
    super({
      message: AUTH_MESSAGE.REFRESH_TOKEN_ALREADY_USED,
      errorKey: AuthMessage.REFRESH_TOKEN_ALREADY_USED
    })
  }
}

export class UnauthorizedAccessException extends UnauthorizedException {
  constructor() {
    super({
      message: AUTH_MESSAGE.UNAUTHORIZED_ACCESS,
      errorKey: AuthMessage.UNAUTHORIZED_ACCESS
    })
  }
}

export class AccountIsBannedException extends UnauthorizedException {
  constructor() {
    super({
      message: AUTH_MESSAGE.ACCOUNT_IS_BANNED,
      errorKey: AuthMessage.ACCOUNT_IS_BANNED
    })
  }
}

export class UnverifiedAccountException extends UnauthorizedException {
  constructor() {
    super({
      message:
        'Tài khoản chưa được xác thực, vui lòng kiểm tra email để xác thực tài khoản',
      errorKey: AuthMessage.UNVERIFIED_ACCOUNT
    })
  }
}

// Google auth related errors
export class GoogleUserInfoException extends Error {
  constructor() {
    super(AUTH_MESSAGE.FAILD_TO_GET_GOOGLE_USER_INFO)
    this.name = 'GoogleUserInfoException'
  }
}

export class InvalidTOTPException extends UnprocessableEntityException {
  constructor() {
    super([
      {
        message: 'Error.InvalidTOTP',
        errorKey: AuthMessage.INVALID_TOTP,
        path: 'totpCode'
      }
    ])
  }
}

export class TOTPAlreadyEnabledException extends UnprocessableEntityException {
  constructor() {
    super([
      {
        message: 'Error.TOTPAlreadyEnabled',
        errorKey: AuthMessage.TOTP_ALREADY_ENABLED,
        path: 'totpCode'
      }
    ])
  }
}

export class TOTPNotEnabledException extends UnprocessableEntityException {
  constructor() {
    super([
      {
        message: 'Error.TOTPNotEnabled',
        errorKey: AuthMessage.TOTP_NOT_ENABLED,
        path: 'totpCode'
      }
    ])
  }
}

export class InvalidTOTPAndCodeException extends UnprocessableEntityException {
  constructor() {
    super([
      {
        message: 'Error.InvalidTOTPAndCode',
        errorKey: AuthMessage.INVALID_TOTP_AND_CODE,
        path: 'totpCode'
      },
      {
        message: 'Error.InvalidTOTPAndCode',
        errorKey: AuthMessage.INVALID_TOTP_AND_CODE,
        path: 'code'
      }
    ])
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
