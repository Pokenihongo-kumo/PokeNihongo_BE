import { CheckEmailResDTO } from './dto/auth.zod-dto'
import { ResponseMessage, msg } from '@/i18n/response-message'
import { TypeOfVerificationCode } from '@/common/constants/auth.constant'
import { AuthMessage } from '@/i18n/message-keys'
import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { RateLimit } from '@/common/decorators/rate-limit.decorator'
import { otpSendLimits, otpVerifyLimits } from '@/common/constants/otp-rate-limit'
import { UserAgent } from '@/common/decorators/user-agent.decorator'
import { RateLimitGuard } from '@/common/guards/rate-limit.guard'
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
  async sendOTP(
    @Body() body: VerifyOTPBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string
  ) {
    const { outcome, data } = await this.authService.verifyOTP(body, userAgent, ip)
    return {
      data,
      // in the request language (the forgot-password one was always Vietnamese)
      message: msg(
        outcome === 'forgot-password'
          ? AuthMessage.VERIFY_OTP_FORGOT_PASSWORD_SUCCESS
          : AuthMessage.OTP_AUTHENTICATION_SUCCESS
      )
    }
  }

  @Post('login')
  @ApiBody({ type: LoginBodySwaggerDTO })
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  @ZodSerializerDto(LoginResDTO)
  @ResponseMessage(AuthMessage.LOGIN_SUCCESS)
  async login(
    @Body() body: LoginBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string
  ) {
    return this.authService.login({
      ...body,
      userAgent,
      ip
    })
  }

  @Post('register')
  @IsPublic()
  @ZodSerializerDto(RegisterResDTO)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: RegisterMultipartSwaggerDTO }) // dùng class để render form đẹp
  @ResponseMessage(AuthMessage.REGISTER_SUCCESS)
  async register(
    @Body() body: RegisterBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string
  ) {
    return this.authService.register(body, userAgent, ip)
  }

  @Post('refresh-token')
  @ApiBearerAuth()
  @IsPublic()
  @ZodSerializerDto(RefreshTokenResDTO)
  @ResponseMessage(AuthMessage.REFRESH_TOKEN_SUCCESS)
  async refreshToken(
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
  @ResponseMessage(AuthMessage.LOGOUT_SUCCESS)
  async logout(@Body() body: LogoutBodyDTO) {
    await this.authService.logout(body.refreshToken)
  }

  // gui otp qua email

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @IsPublic()
  @UseGuards(RateLimitGuard)
  @RateLimit(otpSendLimits((req) => req.body?.email))
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(AuthMessage.SEND_OTP_SUCCESS)
  async forgotPassword(@Body() body: ForgotPasswordBodyDTO) {
    return this.authService.forgotPassword(body)
  }

  @Post('reset-password')
  @ApiBearerAuth()
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(AuthMessage.RESET_PASSWORD_SUCCESS)
  async resetPassword(
    @Body() body: ResetPasswordBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.authService.resetPassword(body, userId)
  }

  // change-password
  @Post('change-password')
  @ZodSerializerDto(MessageResDTO)
  @ResponseMessage(AuthMessage.CHANGE_PASSWORD_SUCCESS)
  async changePassword(
    @Body() body: ChangePasswordBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    await this.authService.changePassword(body, userId)
  }

  // neu mail ton tai la login, khong thi la register
  @Get('check-email/:email')
  @IsPublic()
  @UseGuards(RateLimitGuard)
  @RateLimit(otpSendLimits((req) => req.params?.email))
  @ZodSerializerDto(CheckEmailResDTO)
  async checkEmailExist(
    @Param() { email }: CheckEmailParamsDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string
  ) {
    const data = await this.authService.checkMailToAction(email, userAgent, ip)
    // new email: OTP to register; known user: OTP only on a new device
    const key =
      data.type === TypeOfVerificationCode.REGISTER
        ? AuthMessage.SEND_OTP_SUCCESS
        : data.requiresOtp
          ? AuthMessage.FIRST_LOGIN
          : AuthMessage.NOT_FIRST_LOGIN
    return { data, message: msg(key) }
  }

  @Get('me')
  @ApiBearerAuth()
  @ZodSerializerDto(GetAccountProfileResDTO)
  @ResponseMessage(AuthMessage.GET_PROFILE_SUCCESS)
  async me(@ActiveUser('userId') userId: number) {
    return this.authService.getMe(userId)
  }

  @Put('me')
  @ZodSerializerDto(AccountResDTO)
  @ApiBearerAuth()
  @ApiBody({ type: UpdateMeBodyDTO })
  @ResponseMessage(AuthMessage.UPDATE_PROFILE_SUCCESS)
  async updateMe(@Body() body: UpdateMeBodyDTO, @ActiveUser('userId') userId: number) {
    return this.authService.updateMe({
      userId,
      data: body
    })
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
    // in the request language (was always Vietnamese)
    return { data: null, message: msg(AuthMessage.UPDATE_SUCCESS) }
  }

  // Google sign-in (ADR D-auth §3): PKCE challenge in, one-time code out,
  // tokens only from POST google/exchange (never in a URL)
  @Get('google-link')
  @IsPublic()
  @ZodSerializerDto(GetAuthorizationUrlResDTO)
  @ResponseMessage(AuthMessage.GOOGLE_LINK_SUCCESS)
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
  @ResponseMessage(AuthMessage.GOOGLE_EXCHANGE_SUCCESS)
  async googleExchange(
    @Body() body: GoogleExchangeBodyDTO,
    @UserAgent() userAgent: string,
    @Ip() ip: string
  ) {
    return this.googleService.exchange(body, userAgent, ip)
  }
}
