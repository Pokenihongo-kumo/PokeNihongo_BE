import {
  normalizeEmail,
  otpSendLimits,
  otpVerifyLimits
} from '@/common/constants/otp-rate-limit'
import { ResponseMessage } from '@/common/decorators/custom'
import { RateLimit } from '@/common/decorators/rate-limit.decorator'
import { RateLimitGuard } from '@/common/guards/rate-limit.guard'
import { Controller, Post, Query, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { MailService } from './mail.service'

// Mail tools for staff: no web or mobile screen calls them. They need a login
// and the route permission (they were public), and share the OTP counters of
// /auth, so they cannot be used to get around those limits
@Controller('mail')
@ApiTags('Mail')
@ApiBearerAuth('access-token')
export class MailController {
  constructor(private readonly mailService: MailService) {}

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
  async sendOtp(@Query('email') email: string) {
    const template = 'otp'
    const content = 'Mã OTP của bạn là: '
    const body = 'Vui lòng nhập mã OTP để xác thực tài khoản của bạn.'
    return await this.mailService.generateAndSendOtp(
      normalizeEmail(email),
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
  async verifyOtpController(@Query('email') email: string, @Query('otp') otp: string) {
    return await this.mailService.verifyOtpStrict(normalizeEmail(email), otp)
  }
}
