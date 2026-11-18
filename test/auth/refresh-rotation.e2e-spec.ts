import { AppModule } from '@/app.module'
import { MailService } from '@/modules/mail/mail.service'
import { AuthRepository } from '@/modules/auth/auth.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Prisma } from '@prisma/client'
import Redis from 'ioredis'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Refresh token rotation (A1 T6). Consuming the old token and storing the new
// one happen in one transaction: of two refreshes with the same token only one
// wins, no stored token is left that nobody holds, and a failure while storing
// the new token keeps the old one (the client can retry; a DB error is not a
// "session over" 401).
describe('Refresh token rotation (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let userId: number

  const http = () => request.agent(app.getHttpServer()).set('User-Agent', TEST_USER_AGENT)
  const refresh = (refreshToken: string) =>
    http().post('/auth/refresh-token').send({ refreshToken })
  const storedTokens = async () =>
    (
      await prisma.refreshToken.findMany({ where: { userId }, select: { token: true } })
    ).map((row) => row.token)
  const login = async () => {
    const res = await http()
      .post('/auth/login')
      .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password })
    expect(res.status).toBe(200)
    return res.body.data.refreshToken as string
  }
  // let any write still running after the responses land
  const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({})
      .compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    const redis = app.get<Redis>('REDIS_CLIENT')
    for (const key of await redis.keys(`*${TEST_ADMIN.email}*`)) await redis.del(key)
    await loginAsTestAdmin(app, [])
    userId = (await prisma.user.findFirstOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
  })

  afterEach(() => jest.restoreAllMocks())

  afterAll(async () => {
    await prisma?.refreshToken.deleteMany({ where: { userId } })
    await app?.close()
  })

  it('ten refreshes with one token: one wins, the others get 401, one new token is stored', async () => {
    const token = await login()
    const before = await storedTokens()
    const responses = await Promise.all(Array.from({ length: 10 }, () => refresh(token)))
    await settle()

    const winners = responses.filter((res) => res.status === 201)
    expect(responses.map((res) => res.status).sort()).toEqual([
      201,
      ...Array(9).fill(401)
    ])
    const after = await storedTokens()
    expect(after).not.toContain(token)
    expect(after.filter((t) => !before.includes(t))).toEqual([
      winners[0].body.data.refreshToken
    ])
  })

  it('storing the new token fails: the old token stays usable and the answer is not 401', async () => {
    const token = await login()
    // the instance the auth module writes through (modules have their own)
    const db = (app.get(AuthRepository) as unknown as { prismaService: PrismaService })
      .prismaService
    const failure = new Error('DB unavailable (test double)')
    // The rotation may write through the client or through a transaction
    jest.spyOn(db.refreshToken, 'create').mockRejectedValueOnce(failure)
    const transaction = db.$transaction.bind(db) as (fn: unknown) => Promise<unknown>
    jest.spyOn(db, '$transaction').mockImplementationOnce(((fn: unknown) =>
      transaction(async (tx: Prisma.TransactionClient) =>
        (fn as (tx: Prisma.TransactionClient) => Promise<unknown>)(
          new Proxy(tx, {
            get: (target, key) =>
              key === 'refreshToken'
                ? new Proxy(target.refreshToken, {
                    get: (rt, k) =>
                      k === 'create' ? () => Promise.reject(failure) : Reflect.get(rt, k)
                  })
                : Reflect.get(target, key)
          })
        )
      )) as never)

    const failed = await refresh(token)
    await settle()
    expect(failed.status).toBe(500)
    expect(await storedTokens()).toContain(token)

    jest.restoreAllMocks()
    const retried = await refresh(token)
    expect(retried.status).toBe(201)
  })
})
