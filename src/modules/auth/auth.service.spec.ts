import { AuthService } from './auth.service'

// Only the dependencies touched by checkMailToAction are faked.
function createService() {
  const authRepository = { existEmail: jest.fn(), findDeviceByUserAndAgent: jest.fn() }
  const mailService = { generateAndSendOtp: jest.fn() }
  const i18nService = { translate: jest.fn((key: string) => key) }
  const service = new AuthService(
    {} as any,
    {} as any,
    authRepository as any,
    {} as any,
    mailService as any,
    {} as any,
    {} as any,
    {} as any,
    i18nService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  )
  return { service, authRepository, mailService }
}

describe('AuthService.checkMailToAction', () => {
  it('new email: OTP sent, requiresOtp true', async () => {
    const { service, authRepository, mailService } = createService()
    authRepository.existEmail.mockResolvedValue(null)

    const res = await service.checkMailToAction('new@example.test', 'agent', '1.2.3.4')

    expect(res.data).toEqual({ type: 'REGISTER', requiresOtp: true })
    expect(mailService.generateAndSendOtp).toHaveBeenCalled()
  })

  it('known user on a new device: OTP sent, requiresOtp true', async () => {
    const { service, authRepository, mailService } = createService()
    authRepository.existEmail.mockResolvedValue({ id: 1 })
    authRepository.findDeviceByUserAndAgent.mockResolvedValue(null)

    const res = await service.checkMailToAction('user@example.test', 'agent', '1.2.3.4')

    expect(res.data).toEqual({ type: 'LOGIN', requiresOtp: true })
    expect(mailService.generateAndSendOtp).toHaveBeenCalled()
  })

  it('known user on a known device: no OTP, requiresOtp false', async () => {
    const { service, authRepository, mailService } = createService()
    authRepository.existEmail.mockResolvedValue({ id: 1 })
    authRepository.findDeviceByUserAndAgent.mockResolvedValue({ id: 9 })

    const res = await service.checkMailToAction('user@example.test', 'agent', '1.2.3.4')

    expect(res.data).toEqual({ type: 'LOGIN', requiresOtp: false })
    expect(mailService.generateAndSendOtp).not.toHaveBeenCalled()
  })
})
