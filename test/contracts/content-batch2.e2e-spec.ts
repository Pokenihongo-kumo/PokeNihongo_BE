import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 2 baseline: grammar, grammar-usage, lesson-category. Web uses
// the grammar CRUD (list with currentPage/pageSize/level/search), mobile reads
// GET /lesson-categories. Success and errors, errors in vi and en. The refactor
// must keep these snapshots; intended changes update them in the same commit.
// POST /lesson-categories/create-defaults is left out: it seeds fixed rows.
describe('Content batch 2 contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  const created = {
    languages: [] as number[],
    grammars: [] as number[],
    categories: [] as number[]
  }
  const translationKeys: string[] = []

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  const capture = (res: request.Response) => ({
    httpStatus: res.status,
    body: responseShape(res.body)
  })
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
      { method: 'POST', path: '/grammars' },
      { method: 'GET', path: '/grammars' },
      { method: 'GET', path: '/grammars/:id' },
      { method: 'PUT', path: '/grammars/:id' },
      { method: 'DELETE', path: '/grammars/:id' },
      { method: 'POST', path: '/grammar-usages' },
      { method: 'GET', path: '/grammar-usages' },
      { method: 'GET', path: '/grammar-usages/:id' },
      { method: 'PUT', path: '/grammar-usages/:id' },
      { method: 'DELETE', path: '/grammar-usages/:id' },
      { method: 'POST', path: '/lesson-categories' },
      { method: 'PUT', path: '/lesson-categories/:id' },
      { method: 'DELETE', path: '/lesson-categories/:id' },
      { method: 'GET', path: '/lesson-categories' },
      { method: 'GET', path: '/lesson-categories/by-id/:id' },
      { method: 'GET', path: '/lesson-categories/by-slug/:slug' }
    ])
  })

  // Leave the test DB as it was
  afterAll(async () => {
    if (prisma) {
      const usages = await prisma.grammarUsage.findMany({
        where: { grammarId: { in: created.grammars } }
      })
      const keys = [
        ...translationKeys,
        ...usages.flatMap((u) => [u.explanationKey, u.exampleSentenceKey])
      ]
      await prisma.translation.deleteMany({ where: { key: { in: keys } } })
      // usages cascade
      await prisma.grammar.deleteMany({ where: { id: { in: created.grammars } } })
      await prisma.lessonCategory.deleteMany({
        where: { id: { in: created.categories } }
      })
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  describe('grammar', () => {
    let id: number

    it('create (as the web form sends it), list, detail', async () => {
      const create = await http()
        .post('/grammars')
        .send({
          structure: '〜てもいい',
          level: 'N5',
          usage: { exampleSentenceJp: '食べてもいいです。' },
          translations: {
            usage: [
              {
                language_code: 'vi',
                explanation: 'Được phép làm',
                example: 'Ăn cũng được.'
              },
              { language_code: 'en', explanation: 'May do', example: 'You may eat.' }
            ]
          }
        })
      id = create.body.data?.id
      if (id) created.grammars.push(id)
      expect({
        create: capture(create),
        list: capture(
          await http()
            .get('/grammars')
            .query({ currentPage: '1', pageSize: '5', level: 'N5', search: '〜てもいい' })
        ),
        detail: capture(await http().get(`/grammars/${id}`))
      }).toMatchSnapshot()
    })

    it('update, errors', async () => {
      expect({
        update: capture(await http().put(`/grammars/${id}`).send({ level: 'N4' })),
        notFound: await both((l) => http(l).get('/grammars/999999')),
        invalidBody: await both((l) =>
          http(l).post('/grammars').send({ structure: '', level: '' })
        ),
        invalidId: await both((l) => http(l).get('/grammars/abc')),
        updateNotFound: await both((l) =>
          http(l).put('/grammars/999999').send({ level: 'N3' })
        )
      }).toMatchSnapshot()
    })
  })

  describe('grammar-usage', () => {
    let grammarId: number
    let id: number

    it('create, list, detail, update', async () => {
      grammarId = (
        await prisma.grammar.create({ data: { structure: '〜たい', level: 'N5' } })
      ).id
      created.grammars.push(grammarId)
      const create = await http()
        .post('/grammar-usages')
        .send({
          grammarId,
          explanationKey: `grammar.usage.contract${grammarId}.explanation`,
          exampleSentenceJp: '行きたいです。',
          exampleSentenceKey: `grammar.usage.contract${grammarId}.example`
        })
      id = create.body.data?.id
      expect({
        create: capture(create),
        list: capture(
          await http()
            .get('/grammar-usages')
            .query({ page: '1', limit: '5', grammarId: `${grammarId}` })
        ),
        detail: capture(await http().get(`/grammar-usages/${id}`)),
        update: capture(
          await http()
            .put(`/grammar-usages/${id}`)
            .send({ exampleSentenceJp: '帰りたいです。' })
        )
      }).toMatchSnapshot()
    })

    it('errors, delete, delete again', async () => {
      expect({
        notFound: await both((l) => http(l).get('/grammar-usages/999999')),
        invalidBody: await both((l) =>
          http(l).post('/grammar-usages').send({ grammarId: 'x' })
        ),
        missingGrammar: await both((l) =>
          http(l).post('/grammar-usages').send({
            grammarId: 999999,
            explanationKey: 'grammar.none.explanation',
            exampleSentenceJp: 'なし',
            exampleSentenceKey: 'grammar.none.example'
          })
        ),
        invalidId: await both((l) => http(l).get('/grammar-usages/abc')),
        delete: capture(await http().delete(`/grammar-usages/${id}`)),
        deleteAgain: await both((l) => http(l).delete(`/grammar-usages/${id}`))
      }).toMatchSnapshot()
    })
  })

  describe('grammar delete', () => {
    it('delete, then again', async () => {
      const id = (
        await prisma.grammar.create({ data: { structure: '〜ない', level: 'N5' } })
      ).id
      created.grammars.push(id)
      expect({
        delete: capture(await http().delete(`/grammars/${id}`)),
        again: await both((l) => http(l).delete(`/grammars/${id}`))
      }).toMatchSnapshot()
    })
  })

  describe('lesson-category', () => {
    const nameKey = 'lesson_category.contract_batch2.name'
    let id: number

    it('create through the API', async () => {
      const res = await http().post('/lesson-categories').send({ nameKey })
      if (res.body.data?.id) created.categories.push(res.body.data.id)
      // Created row (if any) is found by nameKey for cleanup either way
      const row = await prisma.lessonCategory.findUnique({ where: { nameKey } })
      if (row && !created.categories.includes(row.id)) created.categories.push(row.id)
      expect(capture(res)).toMatchSnapshot()
    })

    it('list (as mobile), by id, by slug, update', async () => {
      const row =
        (await prisma.lessonCategory.findUnique({ where: { nameKey } })) ??
        (await prisma.lessonCategory.create({
          data: { nameKey, slug: 'contract-batch2' }
        }))
      if (!created.categories.includes(row.id)) created.categories.push(row.id)
      id = row.id
      expect({
        list: capture(await http().get('/lesson-categories')),
        byId: capture(await http().get(`/lesson-categories/by-id/${id}`)),
        bySlug: capture(await http().get(`/lesson-categories/by-slug/${row.slug}`)),
        update: capture(
          await http().put(`/lesson-categories/${id}`).send({ slug: 'contract-batch2-b' })
        )
      }).toMatchSnapshot()
    })

    it('errors, delete, delete again', async () => {
      expect({
        duplicate: await both((l) =>
          http(l).post('/lesson-categories').send({ nameKey })
        ),
        notFoundById: await both((l) => http(l).get('/lesson-categories/by-id/999999')),
        notFoundBySlug: await both((l) =>
          http(l).get('/lesson-categories/by-slug/none-such')
        ),
        invalidId: await both((l) => http(l).get('/lesson-categories/by-id/abc')),
        invalidBody: await both((l) =>
          http(l).post('/lesson-categories').send({ nameKey: '' })
        ),
        delete: capture(await http().delete(`/lesson-categories/${id}`)),
        deleteAgain: await both((l) => http(l).delete(`/lesson-categories/${id}`))
      }).toMatchSnapshot()
    })
  })
})
