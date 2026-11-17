import { AppModule } from '@/app.module'
import { codeOfStoredOtp, otpKey } from '@/modules/auth/otp-value'
import { PrismaService } from '@/shared/services/prisma.service'
import { MailSender } from '@/infrastructure/integrations/mail/mail-sender.port'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import Redis from 'ioredis'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// ADR D-auth §1–2. OTPs are kept per purpose; POST /auth/register needs the
// one-time token that a verified REGISTER OTP of the same email gave. It used
// to create an account for any email, with no OTP at all. The real
// OtpService runs; only the MailSender port is replaced (no mail leaves).
describe('Registration token and OTP purposes (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let redis: Redis
  const stamp = Date.now()
  const emailOf = (name: string) => `reg-token-${name}-${stamp}@example.test`
  const languages: number[] = []

  const http = () => request.agent(app.getHttpServer()).set('User-Agent', TEST_USER_AGENT)
  const register = (email: string, registrationToken?: string) =>
    http()
      .post('/auth/register')
      .send({
        email,
        name: 'Reg token',
        password: 'secret123',
        confirmPassword: 'secret123',
        ...(registrationToken === undefined ? {} : { registrationToken })
      })
  // check-email of a new email sends a REGISTER code; verify it, get the token
  const verifiedToken = async (email: string) => {
    expect((await http().get(`/auth/check-email/${email}`)).status).toBe(200)
    const code = codeOfStoredOtp(await redis.get(otpKey('REGISTER', email)))
    const verify = await http()
      .post('/auth/verify-otp')
      .send({ email, code, type: 'REGISTER' })
    expect(verify.status).toBe(201)
    return verify.body.data.registrationToken as string
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailSender)
      .useValue({ send: async () => undefined })
      .compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    redis = app.get<Redis>('REDIS_CLIENT')
    for (const key of [
      ...(await redis.keys(`*${TEST_ADMIN.email}*`)),
      ...(await redis.keys('*reg-token-*')),
      ...(await redis.keys('otp_*_ip:*'))
    ]) {
      await redis.del(key)
    }
    for (const [code, name] of [
      ['vi', 'Tiếng Việt'],
      ['en', 'English']
    ]) {
      if (await prisma.languages.findUnique({ where: { code } })) continue
      languages.push((await prisma.languages.create({ data: { code, name } })).id)
    }
    // the learner role register gives
    await loginAsTestAdmin(app, [])
    if (!(await prisma.role.findFirst({ where: { name: 'LEARNER', deletedAt: null } }))) {
      await prisma.role.create({ data: { name: 'LEARNER' } })
    }
  })

  afterAll(async () => {
    for (const key of await redis.keys('*reg-token-*')) await redis.del(key)
    const users = await prisma.user.findMany({
      where: { email: { startsWith: 'reg-token-' } },
      select: { id: true }
    })
    const ids = users.map((u) => u.id)
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } })
    await prisma.device.deleteMany({ where: { userId: { in: ids } } })
    await prisma.userProgress.deleteMany({ where: { userId: { in: ids } } })
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
    await prisma.languages.deleteMany({ where: { id: { in: languages } } })
    await app?.close()
  })

  it('register without a token is refused, and no account is made', async () => {
    const email = emailOf('none')
    expect((await register(email)).status).toBe(422)
    expect((await register(email, 'made-up')).status).toBe(401)
    expect(await prisma.user.count({ where: { email } })).toBe(0)
  })

  it('a verified email registers once with its token', async () => {
    const email = emailOf('ok')
    const token = await verifiedToken(email)
    const first = await register(email, token)
    expect(first.status).toBe(201)
    expect(first.body.data.accessToken).toEqual(expect.any(String))
    // the token is used up
    expect((await register(emailOf('ok-again'), token)).status).toBe(401)
  })

  it("one email's token does not register another email", async () => {
    const token = await verifiedToken(emailOf('mine'))
    const other = emailOf('theirs')
    expect((await register(other, token)).status).toBe(401)
    expect(await prisma.user.count({ where: { email: other } })).toBe(0)
  })

  it('a code sent to register does not reset a password, and the reverse', async () => {
    const email = emailOf('purpose')
    expect((await http().get(`/auth/check-email/${email}`)).status).toBe(200)
    const code = codeOfStoredOtp(await redis.get(otpKey('REGISTER', email)))
    const asForgot = await http()
      .post('/auth/verify-otp')
      .send({ email, code, type: 'FORGOT_PASSWORD' })
    expect(asForgot.status).toBe(401)

    // the admin's forgot-password code is not a REGISTER code
    expect(
      (await http().post('/auth/forgot-password').send({ email: TEST_ADMIN.email }))
        .status
    ).toBe(200)
    const forgotCode = codeOfStoredOtp(
      await redis.get(otpKey('FORGOT_PASSWORD', TEST_ADMIN.email))
    )
    const asRegister = await http()
      .post('/auth/verify-otp')
      .send({ email: TEST_ADMIN.email, code: forgotCode, type: 'REGISTER' })
    expect(asRegister.status).toBe(401)
    await redis.del(otpKey('FORGOT_PASSWORD', TEST_ADMIN.email))
  })

  it('the right code works once, even when checked twice at the same time', async () => {
    const email = emailOf('twice')
    expect((await http().get(`/auth/check-email/${email}`)).status).toBe(200)
    const code = codeOfStoredOtp(await redis.get(otpKey('REGISTER', email)))
    const statuses = (
      await Promise.all(
        [1, 2].map(() =>
          http().post('/auth/verify-otp').send({ email, code, type: 'REGISTER' })
        )
      )
    ).map((res) => res.status)
    expect(statuses.sort()).toEqual([201, 401])
  })
})
