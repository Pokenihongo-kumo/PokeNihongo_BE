import { AppModule } from '@/app.module'
import { codeOfStoredOtp } from '@/3rdService/mail/otp-value'
import { RateLimitGuard } from '@/common/guards/rate-limit.guard'
import { PrismaService } from '@/shared/services/prisma.service'
import { MailerService } from '@nestjs-modules/mailer'
import {
  ExecutionContext,
  HttpException,
  INestApplication,
  VersioningType
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import Redis from 'ioredis'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// OTP protection (A1 T2/T3/T4). Guesses are counted per email (and per IP)
// in one atomic Redis step, shared by /auth/verify-otp and /mail/verify-otp;
// sends are counted apart, shared by check-email, forgot-password and
// /mail/send-otp; an email is the same however it is typed. The real
// MailService runs; only the transport is replaced (no mail leaves).
describe('OTP protection (e2e)', () => {
  let app: INestApplication<App>
  let redis: Redis
  let token: string
  const stamp = Date.now()
  const emailOf = (name: string) => `otp-guard-${name}-${stamp}@example.test`
  const languages: number[] = []

  const http = () => request.agent(app.getHttpServer()).set('User-Agent', TEST_USER_AGENT)
  const authed = () => http().auth(token, { type: 'bearer' })
  const guess = (email: string, code = '000000') =>
    http().post('/auth/verify-otp').send({ email, code, type: 'REGISTER' })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue({ sendMail: async () => undefined })
      .compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    const prisma = app.get(PrismaService)
    redis = app.get<Redis>('REDIS_CLIENT')
    for (const key of [
      ...(await redis.keys(`*${TEST_ADMIN.email}*`)),
      ...(await redis.keys('*otp-guard-*')),
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
    token = await loginAsTestAdmin(app, [
      { method: 'POST', path: '/mail/send-otp' },
      { method: 'POST', path: '/mail/verify-otp' }
    ])
  })

  afterAll(async () => {
    for (const key of await redis.keys('*otp-guard-*')) await redis.del(key)
    await app
      ?.get(PrismaService)
      .languages.deleteMany({ where: { id: { in: languages } } })
    await app?.close()
  })

  it('ten guesses at once: five are checked, five refused, the counter expires', async () => {
    const email = emailOf('burst')
    const statuses = (
      await Promise.all(Array.from({ length: 10 }, () => guess(email)))
    ).map((res) => res.status)
    expect({
      checked: statuses.filter((s) => s === 401).length,
      refused: statuses.filter((s) => s === 429).length
    }).toEqual({ checked: 5, refused: 5 })
    const ttl = await redis.pttl(`otp_verify:${email}`)
    expect(ttl > 0 && ttl <= 5 * 60 * 1000).toBe(true)
  })

  it('a window ends, and a counter left without expiry gets one', async () => {
    const key = `otp-guard-window-${stamp}`
    const rules = [{ windowMs: 300, max: 2, keyGenerator: () => key }]
    const guard = new RateLimitGuard({ get: () => rules } as unknown as Reflector, redis)
    const context = {
      getHandler: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({}) })
    } as unknown as ExecutionContext
    const hit = () =>
      guard.canActivate(context).then(
        () => 'ok',
        (error: HttpException) => error.getStatus()
      )
    expect([await hit(), await hit(), await hit()]).toEqual(['ok', 'ok', 429])
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(await hit()).toBe('ok')

    await redis.set(key, '1') // as if a crash left it without expiry
    expect(await hit()).toBe('ok')
    expect(await redis.pttl(key)).toBeGreaterThan(0)
  })

  it('a new code does not give new guesses', async () => {
    const email = emailOf('resend')
    for (let i = 0; i < 5; i++) expect((await guess(email)).status).toBe(401)
    expect((await http().get(`/auth/check-email/${email}`)).status).toBe(200)
    const code = codeOfStoredOtp(await redis.get(email))
    expect(code).toMatch(/^[0-9]{6}$/)
    expect((await guess(email, code as string)).status).toBe(429)
  })

  it('the /mail routes need a login and share the /auth counters', async () => {
    expect(
      (
        await http()
          .post('/mail/send-otp')
          .query({ email: emailOf('anon') })
      ).status
    ).toBe(401)
    expect(
      (
        await http()
          .post('/mail/verify-otp')
          .query({ email: emailOf('anon'), otp: '000000' })
      ).status
    ).toBe(401)

    const guessed = emailOf('bypass')
    for (let i = 0; i < 5; i++) expect((await guess(guessed)).status).toBe(401)
    const viaMail = await authed()
      .post('/mail/verify-otp')
      .query({ email: guessed.toUpperCase(), otp: '000000' })
    expect(viaMail.status).toBe(429)

    const mailed = emailOf('sends')
    for (let i = 0; i < 3; i++) {
      expect((await http().get(`/auth/check-email/${mailed}`)).status).toBe(200)
    }
    expect((await authed().post('/mail/send-otp').query({ email: mailed })).status).toBe(
      429
    )
  })

  it('an email is the same however it is typed', async () => {
    // forgot-password with spaces and capitals finds the account (was 404)
    const forgot = await http()
      .post('/auth/forgot-password')
      .send({ email: `  ${TEST_ADMIN.email.toUpperCase()}  ` })
    expect(forgot.status).toBe(200)

    // a code sent to "Mixed@..." is checked as "MIXED@..."
    const email = emailOf('case')
    const mixed = email.replace('otp-guard', 'OTP-Guard')
    expect((await http().get(`/auth/check-email/${mixed}`)).status).toBe(200)
    const code = codeOfStoredOtp(await redis.get(email))
    const verify = await guess(email.toUpperCase(), code as string)
    expect(verify.status).toBe(201)
  })
})
