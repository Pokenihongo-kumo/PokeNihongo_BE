import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { MailerService } from '@nestjs-modules/mailer'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import Redis from 'ioredis'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// The mail provider is down (it is, for now). OTP mails used to be sent
// without await: the request answered "OTP sent" and the rejected promise was
// left unhandled, which ends a Node 26 process. Now the request waits for the
// mail and answers 503, and the code nobody received is dropped. The real
// MailService runs; only the transport (MailerService) is replaced.
describe('Mail provider unavailable (e2e)', () => {
  let app: INestApplication<App>
  let redis: Redis
  const stamp = Date.now()
  const newEmail = `mail-down-${stamp}@example.test`
  const languages: number[] = []
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => unhandled.push(reason)
  // What the next sendMail calls do; when empty, the provider is down
  const nextSends: Array<() => Promise<void>> = []

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
  const brief = (res: request.Response) => ({
    httpStatus: res.status,
    message: res.body?.message,
    statusCode: res.body?.statusCode
  })

  beforeAll(async () => {
    process.on('unhandledRejection', onUnhandled)
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue({
        sendMail: () =>
          nextSends.shift()?.() ??
          Promise.reject(new Error('SMTP unavailable (test double)'))
      })
      .compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    const prisma = app.get(PrismaService)
    redis = app.get<Redis>('REDIS_CLIENT')
    for (const key of [
      ...(await redis.keys(`*${TEST_ADMIN.email}*`)),
      ...(await redis.keys('*mail-down-*')),
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
    // The admin and its device for TEST_USER_AGENT exist after this
    await loginAsTestAdmin(app, [])
    await http()
      .post('/auth/login')
      .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password })
  })

  afterAll(async () => {
    process.off('unhandledRejection', onUnhandled)
    await app
      ?.get(PrismaService)
      .languages.deleteMany({ where: { id: { in: languages } } })
    await app?.close()
  })

  it('check-email of a new email: 503, no code kept', async () => {
    const vi = await http().get(`/auth/check-email/${newEmail}`)
    const en = await http('en').get(`/auth/check-email/${newEmail}`)
    expect({ vi: brief(vi), en: brief(en) }).toEqual({
      vi: {
        httpStatus: 503,
        statusCode: 503,
        message: 'Hiện không gửi được email, vui lòng thử lại sau'
      },
      en: {
        httpStatus: 503,
        statusCode: 503,
        message: 'Email cannot be sent right now, please try again later'
      }
    })
    expect(await redis.get(newEmail)).toBeNull()
  })

  it('forgot-password: 503', async () => {
    const res = await http()
      .post('/auth/forgot-password')
      .send({ email: TEST_ADMIN.email })
    expect(brief(res)).toEqual({
      httpStatus: 503,
      statusCode: 503,
      message: 'Hiện không gửi được email, vui lòng thử lại sau'
    })
  })

  it('a send that fails late does not drop the code of a newer send', async () => {
    const email = `mail-down-race-${stamp}@example.test`
    let failFirst: (error: Error) => void = () => undefined
    // 1st send: held, fails after the 2nd; 2nd send: delivered
    nextSends.push(
      () => new Promise<void>((_, reject) => (failFirst = reject)),
      () => Promise.resolve()
    )
    const first = http()
      .get(`/auth/check-email/${email}`)
      .then((res) => res)
    // wait for the 1st code to be stored (its send is now pending)
    for (let i = 0; i < 100 && !(await redis.get(email)); i++) {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    const firstStored = await redis.get(email)
    const second = await http().get(`/auth/check-email/${email}`)
    const secondStored = await redis.get(email)
    failFirst(new Error('late SMTP failure (test double)'))
    const firstRes = await first

    expect({
      first: firstRes.status,
      second: second.status,
      replaced: firstStored !== null && secondStored !== firstStored
    }).toEqual({ first: 503, second: 200, replaced: true })
    expect(await redis.get(email)).toBe(secondStored)
    await redis.del(email)
  })

  it('the app keeps serving, and no rejection was left unhandled', async () => {
    // A known device needs no mail
    const res = await http().get(`/auth/check-email/${TEST_ADMIN.email}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ type: 'LOGIN', requiresOtp: false })
    await new Promise((resolve) => setImmediate(resolve))
    expect(unhandled).toEqual([])
  })
})
