import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Services that return only { message } (deletes): TransformInterceptor used to
// wrap that as `data`, so routes serialized with MessageResDTO answered 500
// although the row was deleted (web: answers, grammars). All five such routes
// declare 204; one of them here.
describe('Message-only responses (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let id: number | undefined

  const http = () =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .auth(token, { type: 'bearer' })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    token = await loginAsTestAdmin(app, [
      { method: 'DELETE', path: '/lesson-categories/:id' }
    ])
  })

  afterAll(async () => {
    if (prisma && id) await prisma.lessonCategory.deleteMany({ where: { id } })
    await app?.close()
  })

  it('DELETE /lesson-categories/:id answers its declared 204 (was 500)', async () => {
    // Created directly: POST /lesson-categories has its own bug (500), outside this test
    const stamp = Date.now()
    id = (
      await prisma.lessonCategory.create({
        data: { nameKey: `lesson_category.contract${stamp}`, slug: `contract-${stamp}` }
      })
    ).id

    const res = await http().delete(`/lesson-categories/${id}`)

    // The route declares @HttpCode(204): no body reaches the client
    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    expect(await prisma.lessonCategory.findUnique({ where: { id } })).toBeNull()
  })
})
