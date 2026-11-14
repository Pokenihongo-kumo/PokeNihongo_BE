import { AppModule } from '@/app.module'
import { MailService } from '@/3rdService/mail/mail.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import Redis from 'ioredis'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 5i baseline: auth. The routes the mobile app and the web call
// (src/services/auth, configs/axios refresh): check email, verify OTP,
// register, login, refresh, logout, forgot password, me, update me, FCM token,
// Google link. No mail leaves: MailService is replaced and puts a known OTP
// in the test Redis (DB 15). Rate-limit keys of the test emails are cleared
// first, so runs back to back do not hit 429. The registered user is removed
// after; the test admin's name is put back. Errors in vi and en.
const OTP = '246810'

describe('Auth batch 5i contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let redis: Redis
  let token: string
  let refreshToken: string
  const stamp = Date.now()
  const newEmail = `contract-5i-${stamp}@example.test`
  const languages: number[] = []
  // PUT /auth/me writes the name and updatedById; put back after
  let before: { name: string; updatedById: number | null } = {
    name: '',
    updatedById: null
  }
  // Register gives the LEARNER role, which a fresh test DB may not have
  let createdLearnerRole = 0

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
  const authed = (lang = 'vi') => http(lang).auth(token, { type: 'bearer' })
  const capture = (res: request.Response) => {
    const body = responseShape(res.body) as Record<string, unknown>
    if (typeof body?.message === 'string') {
      body.message = body.message.replace(/[0-9]+/g, 'N')
    }
    return { httpStatus: res.status, body }
  }
  const both = async (send: (lang: string) => request.Test) => ({
    vi: capture(await send('vi')),
    en: capture(await send('en'))
  })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({
        generateAndSendOtp: async (email: string) => {
          await redis.set(email, OTP, 'EX', 300)
        },
        verifyOtpStrict: async () => true,
        sendMail: async () => undefined,
        sendOtpMail: async () => undefined,
        sendEmailPasswordAccount: async () => undefined
      })
      .compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    redis = app.get<Redis>('REDIS_CLIENT')
    for (const key of [
      ...(await redis.keys(`*${TEST_ADMIN.email}*`)),
      ...(await redis.keys('*contract-5i-*')),
      ...(await redis.keys('*not-an-email*'))
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
    if (!(await prisma.role.findFirst({ where: { name: 'LEARNER', deletedAt: null } }))) {
      createdLearnerRole = (await prisma.role.create({ data: { name: 'LEARNER' } })).id
    }
    token = await loginAsTestAdmin(app, [
      { method: 'GET', path: '/auth/me' },
      { method: 'PUT', path: '/auth/me' },
      { method: 'PUT', path: '/auth/fcm-token' },
      { method: 'POST', path: '/auth/reset-password' },
      { method: 'POST', path: '/auth/change-password' }
    ])
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email }
    })
    before = { name: admin.name, updatedById: admin.updatedById }
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { email: newEmail } })
      if (createdLearnerRole) {
        await prisma.role.deleteMany({ where: { id: createdLearnerRole } })
      }
      await prisma.user.update({
        where: { email: TEST_ADMIN.email },
        data: before
      })
      await prisma.languages.deleteMany({ where: { id: { in: languages } } })
    }
    await redis?.del(newEmail)
    await app?.close()
  })

  it('a new email: check, verify OTP, register', async () => {
    expect({
      check: capture(await http().get(`/auth/check-email/${newEmail}`)),
      verify: capture(
        await http()
          .post('/auth/verify-otp')
          .send({ email: newEmail, code: OTP, type: 'REGISTER' })
      ),
      register: capture(
        await http().post('/auth/register').send({
          email: newEmail,
          name: 'Contract 5i',
          password: 'secret123',
          confirmPassword: 'secret123'
        })
      )
    }).toMatchSnapshot()
  })

  it('the admin: check, login, refresh, refresh again, logout', async () => {
    const check = await http().get(`/auth/check-email/${TEST_ADMIN.email}`)
    const login = await http()
      .post('/auth/login')
      .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password })
    refreshToken = login.body.data.refreshToken
    const refresh = await http().post('/auth/refresh-token').send({ refreshToken })
    const refreshAgain = await http().post('/auth/refresh-token').send({ refreshToken })
    const logout = await http()
      .post('/auth/logout')
      .send({ refreshToken: refresh.body.data?.refreshToken })
    expect({
      check: capture(check),
      login: capture(login),
      refresh: capture(refresh),
      refreshAgain: capture(refreshAgain),
      logout: capture(logout)
    }).toMatchSnapshot()
  })

  it('me, update me, FCM token, forgot password, Google link', async () => {
    expect({
      me: capture(await authed().get('/auth/me')),
      updateMe: capture(
        await authed().put('/auth/me').send({ name: 'Contract Admin 5i' })
      ),
      fcmToken: capture(
        await authed().put('/auth/fcm-token').send({ fcmToken: 'contract' })
      ),
      forgotPassword: capture(
        await http().post('/auth/forgot-password').send({ email: TEST_ADMIN.email })
      ),
      googleLink: capture(await http().get('/auth/google-link'))
    }).toMatchSnapshot()
  })

  it('errors', async () => {
    expect({
      loginWrongPassword: await both((l) =>
        http(l)
          .post('/auth/login')
          .send({ email: TEST_ADMIN.email, password: 'wrong-pass' })
      ),
      loginUnknownEmail: await both((l) =>
        http(l)
          .post('/auth/login')
          .send({ email: 'nobody-5i@example.test', password: 'x12345' })
      ),
      loginInvalidBody: await both((l) =>
        http(l).post('/auth/login').send({ email: 'x' })
      ),
      registerTaken: await both((l) =>
        http(l).post('/auth/register').send({
          email: TEST_ADMIN.email,
          name: 'Dup',
          password: 'secret123',
          confirmPassword: 'secret123'
        })
      ),
      registerMismatch: await both((l) =>
        http(l)
          .post('/auth/register')
          .send({
            email: `contract-5i-mismatch-${stamp}@example.test`,
            name: 'Mismatch',
            password: 'secret123',
            confirmPassword: 'secret999'
          })
      ),
      verifyWrongOtp: await both((l) =>
        http(l)
          .post('/auth/verify-otp')
          .send({
            email: `contract-5i-none-${stamp}@example.test`,
            code: '000000',
            type: 'REGISTER'
          })
      ),
      refreshGarbage: await both((l) =>
        http(l).post('/auth/refresh-token').send({ refreshToken: 'not-a-token' })
      ),
      logoutGarbage: await both((l) =>
        http(l).post('/auth/logout').send({ refreshToken: 'not-a-token' })
      ),
      forgotUnknown: await both((l) =>
        http(l)
          .post('/auth/forgot-password')
          .send({ email: `contract-5i-x${l}@example.test` })
      ),
      checkEmailInvalid: await both((l) => http(l).get('/auth/check-email/not-an-email')),
      changePasswordWrongOld: await both((l) =>
        authed(l).post('/auth/change-password').send({
          password: 'wrong-old',
          newPassword: 'secret123',
          confirmNewPassword: 'secret123'
        })
      ),
      resetPasswordOtherEmail: await both((l) =>
        authed(l).post('/auth/reset-password').send({
          email: 'someone-else-5i@example.test',
          newPassword: 'secret123',
          confirmNewPassword: 'secret123'
        })
      ),
      meNoToken: await both((l) => http(l).get('/auth/me'))
    }).toMatchSnapshot()
  })
})
