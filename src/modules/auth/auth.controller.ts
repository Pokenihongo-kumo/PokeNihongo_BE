import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { RateLimit } from '@/common/decorators/rate-limit.decorator'
import { UserAgent } from '@/common/decorators/user-agent.decorator'
import { RateLimitGuard } from '@/common/guards/rate-limit.guard'
import envConfig from '@/config/env.config'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import {
  AccountResDTO,
  ChangePasswordBodyDTO,
  ForgotPasswordBodyDTO,
  GetAccountProfileResDTO,
  GetAuthorizationUrlResDTO,
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
    @Ip() ip: string
  ) {
    return this.authService.refreshToken({
      refreshToken: body.refreshToken,
      userAgent,
      ip
    })
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
  @RateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 3, // tối đa 3 lần
    keyGenerator: (req) => `forgot_password:${req.ip}:${req.body.email}` // rate limit theo IP + email
  })
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

  // @Get('verified-email/:email')
  // @IsPublic()
  // async verifiedEmail(@Param('email') email: string, @Res() res: Response) {
  //   const data = await this.authService.verifiedEmail(email)
  //   return res.redirect(`${envConfig.FE_URL}/auth/login?message=${data.message}`)
  // }

  // neu mail ton tai la login, khong thi la register
  @Get('check-email/:email')
  @IsPublic()
  @UseGuards(RateLimitGuard)
  @RateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 3, // tối đa 3 lần
    keyGenerator: (req) => `check_email:${req.ip}:${req.params.email}` // rate limit theo IP + email
  })
  checkEmailExist(
    @Param('email') email: string,
    @UserAgent() userAgent: string,
    @Ip() ip: string,
    @I18nLang() lang: string
  ) {
    return this.authService.checkMailToAction(email, userAgent, ip, lang)
  }

  // @Post('resend-verified-email/:email')
  // @IsPublic()
  // @UseGuards(RateLimitGuard)
  // @RateLimit({
  //   windowMs: 60 * 1000, // 1 phút
  //   max: 3, // tối đa 3 lần
  //   keyGenerator: (req) => `resend_email:${req.ip}:${req.params.email}` // rate limit theo IP + email
  // })
  // @ZodSerializerDto(MessageResDTO)
  // resendVerifiedEmail(@Param('email') email: string, @I18nLang() lang: string) {
  //   return this.authService.resendVerifiedEmail(email)
  // }

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

  //oauth
  @Get('google-link')
  @IsPublic()
  @ZodSerializerDto(GetAuthorizationUrlResDTO)
  getAuthorizationUrl(@UserAgent() userAgent: string, @Ip() ip: string) {
    return this.googleService.getAuthorizationUrl({ userAgent, ip })
  }

  @Get('google/callback')
  @IsPublic()
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.googleService.googleCallback({ code, state })
      return res.redirect(
        `${envConfig.GOOGLE_CLIENT_REDIRECT_URI}?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}`
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi đăng nhập bằng Google, vui lòng thử lại bằng cách khác'
      return res.redirect(
        `${envConfig.GOOGLE_CLIENT_REDIRECT_URI}?errorMessage=${message}`
      )
    }
  }
}
