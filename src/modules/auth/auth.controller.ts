import { TypeOfVerificationCode } from '@/common/constants/auth.constant'
import { I18nService } from '@/i18n/i18n.service'
import { AuthMessage } from '@/i18n/message-keys'
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
    private readonly googleService: GoogleService,
    private readonly i18nService: I18nService
  ) {}

  @Post('verify-otp')
  @IsPublic()
  // A forgot-password OTP gives an access token: guesses are counted per email
  // (and per IP) with /mail/verify-otp
  @UseGuards(RateLimitGuard)
  @RateLimit(otpVerifyLimits((req) => req.body?.email))
  @ZodSerializerDto(MessageResDTO)
  async sendOTP(
    @Body() body: VerifyOTPBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    const { outcome, data } = await this.authService.verifyOTP(body, userAgent, ip)
    return {
      data,
      // the forgot-password message was always Vietnamese
      message:
        outcome === 'forgot-password'
          ? this.i18nService.translate(AuthMessage.VERIFY_OTP_FORGOT_PASSWORD_SUCCESS)
          : this.i18nService.translate(AuthMessage.OTP_AUTHENTICATION_SUCCESS, lang)
    }
  }

  @Post('login')
  @ApiBody({ type: LoginBodySwaggerDTO })
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  @ZodSerializerDto(LoginResDTO)
  async login(
    @Body() body: LoginBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AuthMessage.LOGIN_SUCCESS, lang),
      data: await this.authService.login({
        ...body,
        userAgent,
        ip
      })
    }
  }

  @Post('register')
  @IsPublic()
  @ZodSerializerDto(RegisterResDTO)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: RegisterMultipartSwaggerDTO }) // dùng class để render form đẹp
  async register(
    @Body() body: RegisterBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AuthMessage.REGISTER_SUCCESS, lang),
      data: await this.authService.register(body, userAgent, ip)
    }
  }

  @Post('refresh-token')
  @ApiBearerAuth()
  @IsPublic()
  @ZodSerializerDto(RefreshTokenResDTO)
  async refreshToken(
    @Body() body: RefreshTokenBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AuthMessage.REFRESH_TOKEN_SUCCESS, lang),
      data: await this.authService.refreshToken({
        refreshToken: body.refreshToken,
        userAgent,
        ip
      })
    }
  }

  @Post('logout')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ZodSerializerDto(MessageResDTO)
  async logout(@Body() body: LogoutBodyDTO, @I18nLang() lang: string) {
    await this.authService.logout(body.refreshToken)
    return {
      message: this.i18nService.translate(AuthMessage.LOGOUT_SUCCESS, lang),
      data: null
    }
  }

  // gui otp qua email

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  @UseGuards(RateLimitGuard)
  @RateLimit(otpSendLimits((req) => req.body?.email))
  @ZodSerializerDto(MessageResDTO)
  async forgotPassword(@Body() body: ForgotPasswordBodyDTO, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(AuthMessage.SEND_OTP_SUCCESS, lang),
      data: await this.authService.forgotPassword(body)
    }
  }

  @Post('reset-password')
  @ApiBearerAuth()
  @ZodSerializerDto(MessageResDTO)
  async resetPassword(
    @Body() body: ResetPasswordBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.authService.resetPassword(body, userId)
    return {
      message: this.i18nService.translate(AuthMessage.RESET_PASSWORD_SUCCESS, lang),
      data: null
    }
  }

  // change-password
  @Post('change-password')
  @ZodSerializerDto(MessageResDTO)
  async changePassword(
    @Body() body: ChangePasswordBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    await this.authService.changePassword(body, userId)
    return {
      message: this.i18nService.translate(AuthMessage.CHANGE_PASSWORD_SUCCESS, lang),
      data: null
    }
  }

  // neu mail ton tai la login, khong thi la register
  @Get('check-email/:email')
  @IsPublic()
  @UseGuards(RateLimitGuard)
  @RateLimit(otpSendLimits((req) => req.params?.email))
  async checkEmailExist(
    @Param() { email }: CheckEmailParamsDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    const data = await this.authService.checkMailToAction(email, userAgent, ip)
    // new email: OTP to register; known user: OTP only on a new device
    const key =
      data.type === TypeOfVerificationCode.REGISTER
        ? AuthMessage.SEND_OTP_SUCCESS
        : data.requiresOtp
          ? AuthMessage.FIRST_LOGIN
          : AuthMessage.NOT_FIRST_LOGIN
    return { data, message: this.i18nService.translate(key, lang) }
  }

  @Get('me')
  @ApiBearerAuth()
  @ZodSerializerDto(GetAccountProfileResDTO)
  async me(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return {
      message: this.i18nService.translate(AuthMessage.GET_PROFILE_SUCCESS, lang),
      data: await this.authService.getMe(userId)
    }
  }

  @Put('me')
  @ZodSerializerDto(AccountResDTO)
  @ApiBearerAuth()
  @ApiBody({ type: UpdateMeBodyDTO })
  async updateMe(
    @Body() body: UpdateMeBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AuthMessage.UPDATE_PROFILE_SUCCESS, lang),
      data: await this.authService.updateMe({
        userId,
        data: body
      })
    }
  }

  @Put('fcm-token')
  @ZodSerializerDto(MessageResDTO)
  @ApiBearerAuth()
  @ApiBody({ type: UpdateFcmTokenDeviceBodyDTO })
  async updateFcmTokenDeviceWithDeviceId(
    @Body() body: UpdateFcmTokenDeviceBodyDTO,
    @ActiveUser('deviceId') deviceId: number
  ) {
    await this.authService.updateFcmTokenDeviceWithDeviceId({
      deviceId,
      fcmToken: body.fcmToken
    })
    // always Vietnamese, as before
    return { data: null, message: this.i18nService.translate(AuthMessage.UPDATE_SUCCESS) }
  }

  // Google sign-in (ADR D-auth §3): PKCE challenge in, one-time code out,
  // tokens only from POST google/exchange (never in a URL)
  @Get('google-link')
  @IsPublic()
  @ZodSerializerDto(GetAuthorizationUrlResDTO)
  async getAuthorizationUrl(@Query() query: GoogleLinkQueryDTO) {
    return {
      data: await this.googleService.getAuthorizationUrl(query),
      message: 'Lấy URL đăng nhập Google thành công'
    }
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
  async googleExchange(
    @Body() body: GoogleExchangeBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return {
      message: this.i18nService.translate(AuthMessage.GOOGLE_EXCHANGE_SUCCESS, lang),
      data: await this.googleService.exchange(body, userAgent, ip)
    }
  }
}
