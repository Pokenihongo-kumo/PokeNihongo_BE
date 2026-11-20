import { TransformInterceptor } from '@/common/interceptor/transform.interceptor'
import { I18nService } from '@/i18n/i18n.service'
import { AuthMessage } from '@/i18n/message-keys'
import { Reflector } from '@nestjs/core'
import { lastValueFrom, of } from 'rxjs'
import { AuthController } from './auth.controller'

// check-email and verify-otp answer with one of several messages: the
// service returns the data (and for verify-otp what was verified), the
// controller picks the key with msg(), TransformInterceptor translates it in
// the request language (P5d). The forgot-password OTP and the FCM token
// messages were always Vietnamese before; now they follow Accept-Language.
const through = (result: unknown, lang: string) =>
  lastValueFrom(
    new TransformInterceptor(new Reflector(), new I18nService()).intercept(
      {
        getHandler: () => () => undefined,
        switchToHttp: () => ({
          getResponse: () => ({ statusCode: 200 }),
          getRequest: () => ({ headers: { 'accept-language': lang } })
        })
      } as never,
      { handle: () => of(result) }
    )
  ) as Promise<{ message: string; data: unknown }>
const i18n = new I18nService()
const authService = {
  checkMailToAction: jest.fn(),
  verifyOTP: jest.fn(),
  updateFcmTokenDeviceWithDeviceId: jest.fn()
}
const controller = new AuthController(authService as never, {} as never)

describe('AuthController messages', () => {
  it('check-email: register OTP, new device OTP, known device', async () => {
    const cases: [object, string][] = [
      [{ type: 'REGISTER', requiresOtp: true }, AuthMessage.SEND_OTP_SUCCESS],
      [{ type: 'LOGIN', requiresOtp: true }, AuthMessage.FIRST_LOGIN],
      [{ type: 'LOGIN', requiresOtp: false }, AuthMessage.NOT_FIRST_LOGIN]
    ]
    for (const [data, key] of cases) {
      authService.checkMailToAction.mockResolvedValue(data)
      const result = await controller.checkEmailExist(
        { email: 'a@b.test' },
        'agent',
        '1.2.3.4'
      )
      expect(await through(result, 'en')).toEqual({
        statusCode: 200,
        data,
        message: i18n.translate(key, 'en')
      })
    }
    expect(authService.checkMailToAction).toHaveBeenCalledWith(
      'a@b.test',
      'agent',
      '1.2.3.4'
    )
  })

  it('verify-otp: the forgot-password message now follows the request language', async () => {
    authService.verifyOTP.mockResolvedValue({ outcome: 'verified', data: null })
    const verified = await controller.sendOTP({} as never, 'agent', 'ip')
    expect((await through(verified, 'en')).message).toBe(
      i18n.translate(AuthMessage.OTP_AUTHENTICATION_SUCCESS, 'en')
    )

    const data = { accessToken: 't' }
    authService.verifyOTP.mockResolvedValue({ outcome: 'forgot-password', data })
    const forgot = await controller.sendOTP({} as never, 'agent', 'ip')
    expect(await through(forgot, 'vi')).toMatchObject({
      data,
      message: 'Xác thực OTP thành công'
    })
    expect((await through(forgot, 'en')).message).toBe('OTP verification successful')
  })

  it('FCM token: message in the request language, data null', async () => {
    const result = await controller.updateFcmTokenDeviceWithDeviceId(
      { fcmToken: 'x' } as never,
      9
    )
    expect(await through(result, 'vi')).toEqual({
      statusCode: 200,
      data: null,
      message: 'Cập nhật thành công'
    })
    expect((await through(result, 'en')).message).toBe('Update successful')
  })
})
