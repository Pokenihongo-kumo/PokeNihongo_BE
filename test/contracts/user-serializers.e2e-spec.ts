import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 7 Z2c-3 baseline: the user routes that return data without a response
// serializer and had no snapshot of their body shape: SRS reviews (with a
// vocabulary, grammar and kanji behind them), user tests, the user's pokemon
// with their weaknesses, the admin progress init. Recorded before the
// serializers were added; they must keep these snapshots.
describe('User serializers contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let startedAt: Date
  let adminId: number
  const stamp = Date.now() % 1_000_000
  const created = {
    languages: [] as number[],
    lessonCategory: 0,
    vocabulary: 0,
    grammar: 0,
    kanji: 0,
    pokemon: 0,
    types: [] as number[]
  }

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  // Messages may carry counts: digits become N
  const capture = (res: request.Response) => {
    const body = responseShape(res.body) as Record<string, unknown>
    if (typeof body?.message === 'string') {
      body.message = body.message.replace(/[0-9]+/g, 'N')
    }
    return { httpStatus: res.status, body }
  }

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
      { method: 'POST', path: '/lessons' },
      { method: 'GET', path: '/user-srs-review' },
      { method: 'GET', path: '/user-srs-review/my' },
      { method: 'GET', path: '/user-srs-review/:id' },
      { method: 'POST', path: '/user-srs-review/upsert' },
      { method: 'POST', path: '/user-test' },
      { method: 'GET', path: '/user-test/:id' },
      { method: 'PUT', path: '/user-test/:id' },
      { method: 'POST', path: '/user-test/init-all' },
      { method: 'POST', path: '/user-test/auto-update-limit' },
      { method: 'GET', path: '/user-pokemon/pokemons' },
      { method: 'POST', path: '/user-progress/admin/init-user-progress/:userId' },
      { method: 'POST', path: '/user-progress/admin/init-all-users-progress' }
    ])
    adminId = (
      await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } })
    ).id
    startedAt = new Date()
    created.lessonCategory = (
      await prisma.lessonCategory.create({
        data: { nameKey: `contract.z2c3.${stamp}`, slug: `contract-z2c3-${stamp}` }
      })
    ).id
  })

  // Leave the test DB as it was
  afterAll(async () => {
    if (prisma && startedAt) {
      const since = { createdAt: { gte: startedAt } }
      await prisma.userSrsReview.deleteMany({ where: { userId: adminId, ...since } })
      await prisma.userTest.deleteMany({ where: since })
      await prisma.userProgress.deleteMany({ where: since })
      await prisma.lesson.deleteMany({ where: since })
      await prisma.test.deleteMany({ where: since })
      if (created.pokemon) {
        await prisma.userPokemon.deleteMany({ where: { pokemonId: created.pokemon } })
        await prisma.pokemon.delete({ where: { id: created.pokemon } })
      }
      await prisma.typeEffectiveness.deleteMany({
        where: { attackerId: { in: created.types } }
      })
      await prisma.elementalType.deleteMany({ where: { id: { in: created.types } } })
      if (created.vocabulary) {
        await prisma.vocabulary.delete({ where: { id: created.vocabulary } })
      }
      if (created.grammar) await prisma.grammar.delete({ where: { id: created.grammar } })
      if (created.kanji) await prisma.kanji.delete({ where: { id: created.kanji } })
      await prisma.translation.deleteMany({ where: since })
      if (created.lessonCategory) {
        await prisma.lessonCategory.deleteMany({ where: { id: created.lessonCategory } })
      }
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  it('SRS reviews of a vocabulary, a grammar and a kanji', async () => {
    created.vocabulary = (
      await prisma.vocabulary.create({
        data: { wordJp: `復習${stamp}`, reading: 'ふくしゅう' }
      })
    ).id
    created.grammar = (
      await prisma.grammar.create({
        data: { structure: `〜てみる${stamp}`, level: 'N5' }
      })
    ).id
    await prisma.grammarUsage.create({
      data: {
        grammarId: created.grammar,
        explanationKey: `contract.z2c3.${stamp}.explanation`,
        exampleSentenceJp: '食べてみる。',
        exampleSentenceKey: `contract.z2c3.${stamp}.example`
      }
    })
    created.kanji = (
      await prisma.kanji.create({
        data: {
          character: '鬱',
          meaningKey: `contract.z2c3.${stamp}.kanji`,
          readings: { create: [{ readingType: 'onyomi', reading: 'ウツ' }] }
        }
      })
    ).id
    const upsert = async (contentType: string, contentId: number) =>
      http()
        .post('/user-srs-review/upsert')
        .send({ contentType, contentId, message: 'contract-z2c3' })
    const vocabulary = await upsert('VOCABULARY', created.vocabulary)
    const grammar = await upsert('GRAMMAR', created.grammar)
    const kanji = await upsert('KANJI', created.kanji)
    expect({
      upsert: capture(vocabulary),
      list: capture(await http().get('/user-srs-review')),
      myToday: capture(await http().get('/user-srs-review/my')),
      vocabularyDetail: capture(
        await http().get(`/user-srs-review/${vocabulary.body.data.id}`)
      ),
      grammarDetail: capture(
        await http().get(`/user-srs-review/${grammar.body.data.id}`)
      ),
      kanjiDetail: capture(await http().get(`/user-srs-review/${kanji.body.data.id}`))
    }).toMatchSnapshot()
  })

  it('user tests: create, detail, update, init for all users, limit job', async () => {
    const testId = (
      await prisma.test.create({
        data: { name: 'contract-z2c3', testType: 'QUIZ_TEST', status: 'ACTIVE', limit: 3 }
      })
    ).id
    const create = await http().post('/user-test').send({ userId: adminId, testId })
    const id = create.body.data.id
    expect({
      create: capture(create),
      detail: capture(await http().get(`/user-test/${id}`)),
      update: capture(await http().put(`/user-test/${id}`).send({ limit: 2 })),
      initAll: capture(await http().post('/user-test/init-all')),
      autoUpdateLimit: capture(await http().post('/user-test/auto-update-limit'))
    }).toMatchSnapshot()
  })

  it('my pokemon with their weaknesses', async () => {
    const [attacker, defender] = await Promise.all(
      ['A', 'B'].map((x) =>
        prisma.elementalType.create({
          data: {
            type_name: `ctz3${x}${stamp}`,
            display_name: { vi: x, en: x, ja: x },
            color_hex: '#123456'
          }
        })
      )
    )
    created.types.push(attacker.id, defender.id)
    await prisma.typeEffectiveness.create({
      data: { attackerId: attacker.id, defenderId: defender.id, multiplier: 2 }
    })
    created.pokemon = (
      await prisma.pokemon.create({
        data: {
          pokedex_number: 900000 + stamp,
          nameJp: 'テストモン',
          nameTranslations: { vi: 'Thử', en: 'Testmon' },
          types: { connect: [{ id: defender.id }] }
        }
      })
    ).id
    await prisma.userPokemon.create({
      data: { userId: adminId, pokemonId: created.pokemon }
    })
    expect({
      pokemons: capture(await http().get('/user-pokemon/pokemons'))
    }).toMatchSnapshot()
  })

  it('admin progress init: one user, all users', async () => {
    await http()
      .post('/lessons')
      .send({
        titleJp: '初期化の課',
        levelJlpt: 5,
        estimatedTimeMinutes: 10,
        lessonCategoryId: created.lessonCategory,
        translations: {
          meaning: [
            { language_code: 'vi', value: 'Bài init' },
            { language_code: 'en', value: 'Init lesson' }
          ]
        }
      })
    expect({
      initUser: capture(
        await http().post(`/user-progress/admin/init-user-progress/${adminId}`)
      ),
      initAll: capture(await http().post('/user-progress/admin/init-all-users-progress'))
    }).toMatchSnapshot()
  })
})
