import {
  normalizeEmail,
  otpSendLimits,
  otpVerifyLimits
} from '@/common/constants/otp-rate-limit'
import { ResponseMessage } from '@/common/decorators/custom'
import { RateLimit } from '@/common/decorators/rate-limit.decorator'
import { RateLimitGuard } from '@/common/guards/rate-limit.guard'
import { BadRequestException, Controller, Post, Query, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { OtpService } from './otp.service'
import { OtpPurpose } from './otp-value'

const PURPOSES: OtpPurpose[] = ['REGISTER', 'FORGOT_PASSWORD', 'LOGIN', 'CHANGE_PASSWORD']
// OTPs are kept per purpose (ADR D-auth §1); REGISTER when none is given
const purposeOf = (type?: string): OtpPurpose => {
  const purpose = (type ?? 'REGISTER') as OtpPurpose
  if (!PURPOSES.includes(purpose)) {
    throw new BadRequestException(`type must be one of ${PURPOSES.join(', ')}`)
  }
  return purpose
}
const typeQuery = {
  name: 'type',
  required: false,
  enum: PURPOSES,
  description: 'Mục đích của mã OTP (mặc định REGISTER)'
}

// Mail tools for staff: no web or mobile screen calls them. They need a login
// and the route permission (they were public), and share the OTP counters of
// /auth, so they cannot be used to get around those limits
@Controller('mail')
@ApiTags('Mail')
@ApiBearerAuth('access-token')
export class MailToolsController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send-otp')
  @UseGuards(RateLimitGuard)
  @RateLimit(otpSendLimits((req) => req.query?.email))
  @ApiOperation({ summary: 'Gửi mã OTP qua email' })
  @ApiResponse({ status: 200, description: 'Đã gửi mã OTP thành công' })
  @ResponseMessage('Đã gửi mã OTP thành công')
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Email nhận mã OTP'
  })
  @ApiQuery(typeQuery)
  async sendOtp(@Query('email') email: string, @Query('type') type?: string) {
    const template = 'otp'
    const content = 'Mã OTP của bạn là: '
    const body = 'Vui lòng nhập mã OTP để xác thực tài khoản của bạn.'
    return await this.otpService.generateAndSendOtp(
      normalizeEmail(email),
      purposeOf(type),
      template,
      content,
      body
    )
  }

  @Post('verify-otp')
  @UseGuards(RateLimitGuard)
  @RateLimit(otpVerifyLimits((req) => req.query?.email))
  @ApiOperation({ summary: 'Xác thực mã OTP' })
  @ApiResponse({ status: 200, description: 'Xác thực mã OTP thành công' })
  @ResponseMessage('Xác thực mã OTP thành công')
  @ApiQuery({
    name: 'otp',
    required: true,
    type: String,
    description: 'Mã OTP cần xác thực'
  })
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Email đã nhận mã OTP'
  })
  @ApiQuery(typeQuery)
  async verifyOtpController(
    @Query('email') email: string,
    @Query('otp') otp: string,
    @Query('type') type?: string
  ) {
    return await this.otpService.verifyOtpStrict(
      normalizeEmail(email),
      otp,
      purposeOf(type)
    )
  }
}
