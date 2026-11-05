import { WordTypeService } from '@/modules/wordtype/wordtype.service'
import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// The default word types are inserted with explicit ids. That used to leave
// the id sequence behind, so POST /wordtype collided on the primary key
// (409 "already exists" for a new nameKey).
describe('WordType id sequence (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  const createdIds: number[] = []

  const rewindSequence = () =>
    prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"WordType"', 'id'), 1)`
  const create = (nameKey: string, id?: number) =>
    request(app.getHttpServer())
      .post('/wordtype')
      .set('User-Agent', TEST_USER_AGENT)
      .auth(token, { type: 'bearer' })
      .send(id ? { id, nameKey } : { nameKey })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    token = await loginAsTestAdmin(app, [{ method: 'POST', path: '/wordtype' }])
  })

  afterAll(async () => {
    if (prisma) await prisma.wordType.deleteMany({ where: { id: { in: createdIds } } })
    await app?.close()
  })

  it('the startup seed repairs a sequence left behind by earlier seeds', async () => {
    await rewindSequence()
    await app.get(WordTypeService).createDefaultWordTypes()

    const res = await create(`wordtype.seq${Date.now()}.name`)

    expect(res.status).toBe(201)
    createdIds.push(res.body.data.id)
  })

  it('a create with an explicit id keeps the next create without id working', async () => {
    const max = (await prisma.wordType.aggregate({ _max: { id: true } }))._max.id ?? 0
    const explicit = await create(`wordtype.seqa${Date.now()}.name`, max + 50)
    expect(explicit.status).toBe(201)
    createdIds.push(explicit.body.data.id)

    const next = await create(`wordtype.seqb${Date.now()}.name`)

    expect(next.status).toBe(201)
    expect(next.body.data.id).toBeGreaterThan(max + 50)
    createdIds.push(next.body.data.id)
  })
})
