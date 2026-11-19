import { AuthMessage } from '@/i18n/message-keys'
import { AuthController } from './auth.controller'

// check-email and verify-otp answer with one of several messages. The service
// returns the data (and for verify-otp what was verified); the controller
// picks the message.
const translate = jest.fn((key: string, lang?: string) => `${key}:${lang ?? 'default'}`)
const authService = { checkMailToAction: jest.fn(), verifyOTP: jest.fn() }
const controller = new AuthController(
  authService as never,
  {} as never,
  {
    translate
  } as never
)

describe('AuthController messages', () => {
  it('check-email: register OTP, new device OTP, known device', async () => {
    const cases: [object, string][] = [
      [{ type: 'REGISTER', requiresOtp: true }, AuthMessage.SEND_OTP_SUCCESS],
      [{ type: 'LOGIN', requiresOtp: true }, AuthMessage.FIRST_LOGIN],
      [{ type: 'LOGIN', requiresOtp: false }, AuthMessage.NOT_FIRST_LOGIN]
    ]
    for (const [data, key] of cases) {
      authService.checkMailToAction.mockResolvedValue(data)
      await expect(
        controller.checkEmailExist({ email: 'a@b.test' }, 'agent', '1.2.3.4', 'en')
      ).resolves.toEqual({ data, message: `${key}:en` })
    }
    expect(authService.checkMailToAction).toHaveBeenCalledWith(
      'a@b.test',
      'agent',
      '1.2.3.4'
    )
  })

  it('verify-otp: forgot password keeps its default-language message', async () => {
    authService.verifyOTP.mockResolvedValue({ outcome: 'verified', data: null })
    await expect(controller.sendOTP({} as never, 'agent', 'ip', 'en')).resolves.toEqual({
      data: null,
      message: `${AuthMessage.OTP_AUTHENTICATION_SUCCESS}:en`
    })
    const data = { accessToken: 't' }
    authService.verifyOTP.mockResolvedValue({ outcome: 'forgot-password', data })
    await expect(controller.sendOTP({} as never, 'agent', 'ip', 'en')).resolves.toEqual({
      data,
      message: `${AuthMessage.VERIFY_OTP_FORGOT_PASSWORD_SUCCESS}:default`
    })
  })
})
