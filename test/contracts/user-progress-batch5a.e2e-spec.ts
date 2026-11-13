import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 5a baseline: attendance, attendence-config, user-srs-review.
// Only the mobile app calls them (src/services/attendance, user-srs-review):
// the weekly check-in screen, the daily check-in, the check-in rewards and the
// SRS reminders. Success and errors, errors in vi and en. The refactor must
// keep these snapshots; intended changes update them in the same commit.
describe('User progress batch 5a contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let startedAt: Date
  const created = { languages: [] as number[], configs: [] as number[], srs: 0 }
  // Check-in pays into the wallet and moves the daily requests: put them back
  let wallets: { id: number; balance: number }[] = []
  let dailyRequests: Record<string, unknown>[] = []

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  // Some messages carry a record id or a date, which change every run: digits become N
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
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    for (const [code, name] of [
      ['vi', 'Tiếng Việt'],
      ['en', 'English']
    ]) {
      if (await prisma.languages.findUnique({ where: { code } })) continue
      created.languages.push((await prisma.languages.create({ data: { code, name } })).id)
    }
    token = await loginAsTestAdmin(app, [
      { method: 'GET', path: '/attendance/user' },
      { method: 'POST', path: '/attendance' },
      { method: 'GET', path: '/attendance/:attendanceId' },
      { method: 'GET', path: '/attendence-config' },
      { method: 'GET', path: '/attendence-config/:attendenceConfigId' },
      { method: 'GET', path: '/user-srs-review/my' },
      { method: 'PATCH', path: '/user-srs-review/:id/read' }
    ])
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    startedAt = new Date()

    // A check-in config for every week day (the day of the run must have one)
    for (const dayOfWeek of [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY'
    ] as const) {
      if (await prisma.attendanceConfig.findUnique({ where: { dayOfWeek } })) continue
      created.configs.push(
        (
          await prisma.attendanceConfig.create({
            data: { dayOfWeek, baseCoin: 10, bonusCoin: 5 }
          })
        ).id
      )
    }
    wallets = await prisma.wallet.findMany({
      where: { userId },
      select: { id: true, balance: true }
    })
    dailyRequests = await prisma.userDailyRequest.findMany({ where: { userId } })
    created.srs = (
      await prisma.userSrsReview.create({
        data: {
          userId,
          contentType: 'VOCABULARY',
          contentId: 1,
          nextReviewDate: new Date(),
          message: 'contract-5a'
        }
      })
    ).id
  })

  afterAll(async () => {
    if (prisma && startedAt) {
      const since = { createdAt: { gte: startedAt } }
      await prisma.attendance.deleteMany({ where: { userId, ...since } })
      await prisma.walletTransaction.deleteMany({ where: { userId, ...since } })
      await prisma.wallet.deleteMany({ where: { userId, ...since } })
      for (const { id, balance } of wallets) {
        await prisma.wallet.update({ where: { id }, data: { balance } })
      }
      await prisma.userDailyRequest.deleteMany({ where: { userId, ...since } })
      for (const row of dailyRequests) {
        const { id, userId: _user, createdAt: _c, updatedAt: _u, ...fields } = row
        await prisma.userDailyRequest.update({
          where: { id: id as number },
          data: fields
        })
      }
      await prisma.userSrsReview.deleteMany({ where: { userId, ...since } })
      await prisma.attendanceConfig.deleteMany({ where: { id: { in: created.configs } } })
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  describe('attendance', () => {
    it('week before, check in, check in again, week after', async () => {
      expect({
        weekBefore: capture(await http().get('/attendance/user')),
        checkIn: capture(await http().post('/attendance')),
        checkInAgain: await both((l) => http(l).post('/attendance')),
        weekAfter: capture(await http().get('/attendance/user'))
      }).toMatchSnapshot()
    })

    it('errors', async () => {
      expect({
        notFound: await both((l) => http(l).get('/attendance/999999')),
        invalidId: await both((l) => http(l).get('/attendance/abc')),
        weekUnknownLanguage: capture(await http('fr').get('/attendance/user')),
        // ja is a supported language without a Languages row in the test DB
        weekJapanese: capture(await http('ja').get('/attendance/user')),
        checkInJapanese: capture(await http('ja').post('/attendance'))
      }).toMatchSnapshot()
    })
  })

  describe('attendence-config', () => {
    it('list (the rewards the check-in screen shows) and errors', async () => {
      const list = await http().get('/attendence-config')
      expect({
        list: capture(list),
        notFound: await both((l) => http(l).get('/attendence-config/999999')),
        invalidId: await both((l) => http(l).get('/attendence-config/abc'))
      }).toMatchSnapshot()
    })
  })

  describe('user-srs-review', () => {
    it('my reviews, mark as read, errors', async () => {
      expect({
        my: capture(
          await http()
            .get('/user-srs-review/my')
            .query({ currentPage: '1', pageSize: '50' })
        ),
        read: capture(await http().patch(`/user-srs-review/${created.srs}/read`)),
        readNotFound: await both((l) => http(l).patch('/user-srs-review/999999/read')),
        readInvalidId: await both((l) => http(l).patch('/user-srs-review/abc/read'))
      }).toMatchSnapshot()
    })
  })
})
