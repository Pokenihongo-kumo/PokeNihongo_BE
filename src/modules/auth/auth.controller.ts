import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { RateLimit } from '@/common/decorators/rate-limit.decorator'
import { otpSendLimits, otpVerifyLimits } from '@/common/constants/otp-rate-limit'
import { UserAgent } from '@/common/decorators/user-agent.decorator'
import { RateLimitGuard } from '@/common/guards/rate-limit.guard'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  AccountResDTO,
  ChangePasswordBodyDTO,
  CheckEmailParamsDTO,
  ForgotPasswordBodyDTO,
  GetAccountProfileResDTO,
  GetAuthorizationUrlResDTO,
  GoogleExchangeBodyDTO,
  GoogleExchangeResDTO,
  GoogleLinkQueryDTO,
  LoginBodyDTO,
  LoginResDTO,
  LogoutBodyDTO,
  RefreshTokenBodyDTO,
  RefreshTokenResDTO,
  RegisterBodyDTO,
  RegisterResDTO,
  ResetPasswordBodyDTO,
  UpdateFcmTokenDeviceBodyDTO,
  UpdateMeBodyDTO,
  VerifyOTPBodyDTO
} from '@/modules/auth/dto/auth.zod-dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger'
import { Response } from 'express'
import { ZodSerializerDto } from 'nestjs-zod'
import { AuthService } from './auth.service'
import { LoginBodySwaggerDTO, RegisterMultipartSwaggerDTO } from './dto/auth.dto'
import { GoogleService } from './google.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleService: GoogleService
  ) {}

  @Post('verify-otp')
  @IsPublic()
  // A forgot-password OTP gives an access token: guesses are counted per email
  // (and per IP) with /mail/verify-otp
  @UseGuards(RateLimitGuard)
  @RateLimit(otpVerifyLimits((req) => req.body?.email))
  @ZodSerializerDto(MessageResDTO)
  sendOTP(
    @Body() body: VerifyOTPBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return this.authService.verifyOTP(body, userAgent, ip, lang)
  }

  @Post('login')
  @ApiBody({ type: LoginBodySwaggerDTO })
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  @ZodSerializerDto(LoginResDTO)
  login(
    @Body() body: LoginBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return this.authService.login(
      {
        ...body,
        userAgent,
        ip
      },
      lang
    )
  }

  @Post('register')
  @IsPublic()
  @ZodSerializerDto(RegisterResDTO)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: RegisterMultipartSwaggerDTO }) // dùng class để render form đẹp
  register(
    @Body() body: RegisterBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return this.authService.register(body, userAgent, ip, lang)
  }

  @Post('refresh-token')
  @ApiBearerAuth()
  @IsPublic()
  @ZodSerializerDto(RefreshTokenResDTO)
  refreshToken(
    @Body() body: RefreshTokenBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return this.authService.refreshToken(
      { refreshToken: body.refreshToken, userAgent, ip },
      lang
    )
  }

  @Post('logout')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ZodSerializerDto(MessageResDTO)
  logout(@Body() body: LogoutBodyDTO, @I18nLang() lang: string) {
    return this.authService.logout(body.refreshToken, lang)
  }

  // gui otp qua email

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  @UseGuards(RateLimitGuard)
  @RateLimit(otpSendLimits((req) => req.body?.email))
  @ZodSerializerDto(MessageResDTO)
  forgotPassword(@Body() body: ForgotPasswordBodyDTO, @I18nLang() lang: string) {
    return this.authService.forgotPassword(body, lang)
  }

  @Post('reset-password')
  @ApiBearerAuth()
  @ZodSerializerDto(MessageResDTO)
  resetPassword(
    @Body() body: ResetPasswordBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.authService.resetPassword(body, userId, lang)
  }

  // change-password
  @Post('change-password')
  @ZodSerializerDto(MessageResDTO)
  changePassword(
    @Body() body: ChangePasswordBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.authService.changePassword(body, userId, lang)
  }

  // neu mail ton tai la login, khong thi la register
  @Get('check-email/:email')
  @IsPublic()
  @UseGuards(RateLimitGuard)
  @RateLimit(otpSendLimits((req) => req.params?.email))
  checkEmailExist(
    @Param() { email }: CheckEmailParamsDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return this.authService.checkMailToAction(email, userAgent, ip, lang)
  }

  @Get('me')
  @ApiBearerAuth()
  @ZodSerializerDto(GetAccountProfileResDTO)
  me(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.authService.getMe(userId, lang)
  }

  @Put('me')
  @ZodSerializerDto(AccountResDTO)
  @ApiBearerAuth()
  @ApiBody({ type: UpdateMeBodyDTO })
  updateMe(
    @Body() body: UpdateMeBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.authService.updateMe(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put('fcm-token')
  @ZodSerializerDto(MessageResDTO)
  @ApiBearerAuth()
  @ApiBody({ type: UpdateFcmTokenDeviceBodyDTO })
  updateFcmTokenDeviceWithDeviceId(
    @Body() body: UpdateFcmTokenDeviceBodyDTO,
    @ActiveUser('deviceId') deviceId: number,
    @I18nLang() lang: string
  ) {
    return this.authService.updateFcmTokenDeviceWithDeviceId(
      {
        deviceId,
        fcmToken: body.fcmToken
      },
      lang
    )
  }

  // Google sign-in (ADR D-auth §3): PKCE challenge in, one-time code out,
  // tokens only from POST google/exchange (never in a URL)
  @Get('google-link')
  @IsPublic()
  @ZodSerializerDto(GetAuthorizationUrlResDTO)
  getAuthorizationUrl(@Query() query: GoogleLinkQueryDTO) {
    return this.googleService.getAuthorizationUrl(query)
  }

  @Get('google/callback')
  @IsPublic()
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    return res.redirect(await this.googleService.callbackRedirect({ code, state }))
  }

  @Post('google/exchange')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(GoogleExchangeResDTO)
  googleExchange(
    @Body() body: GoogleExchangeBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return this.googleService.exchange(body, userAgent, ip, lang)
  }
}
