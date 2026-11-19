import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 5e baseline: flashcard, user. Flashcards are the mobile app's
// (src/services/flashcard): a deck, a custom card, list, update, read, review,
// export, delete cards, delete the deck. User: the web admin list (qs) and
// detail, the app's season stats, match history and JLPT level (restored
// after). POST /user mails a password, so only its errors are called.
// Errors in vi and en.
describe('User batch 5e contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  // PUT /user/levelJLPT writes both; put back after
  let before: { levelJLPT: number | null; updatedById: number | null } = {
    levelJLPT: null,
    updatedById: null
  }
  let deckId = 0
  let cardId = 0
  const languages: number[] = []

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  // Some messages carry a record id, which changes every run: digits become N
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
      languages.push((await prisma.languages.create({ data: { code, name } })).id)
    }
    token = await loginAsTestAdmin(app, [
      { method: 'POST', path: '/flashcards/decks' },
      { method: 'GET', path: '/flashcards/decks' },
      { method: 'GET', path: '/flashcards/decks/:deckId' },
      { method: 'PUT', path: '/flashcards/decks/:deckId' },
      { method: 'DELETE', path: '/flashcards/decks/:deckId' },
      { method: 'GET', path: '/flashcards/decks/:deckId/export' },
      { method: 'GET', path: '/flashcards/decks/:deckId/cards' },
      { method: 'POST', path: '/flashcards/decks/:deckId/cards' },
      { method: 'PUT', path: '/flashcards/decks/cards' },
      { method: 'DELETE', path: '/flashcards/decks/cards' },
      { method: 'PUT', path: '/flashcards/read' },
      { method: 'GET', path: '/flashcards/decks/:deckId/review' },
      { method: 'POST', path: '/flashcards/review' },
      { method: 'GET', path: '/user' },
      { method: 'GET', path: '/user/:userId' },
      { method: 'POST', path: '/user' },
      { method: 'GET', path: '/user/stats/season' },
      { method: 'GET', path: '/user/matching/history' },
      { method: 'PUT', path: '/user/levelJLPT' },
      { method: 'POST', path: '/user/me/set-main-pokemon' }
    ])
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email }
    })
    userId = user.id
    before = { levelJLPT: user.levelJLPT, updatedById: user.updatedById }
  })

  afterAll(async () => {
    if (prisma && userId) {
      await prisma.flashcardDeck.deleteMany({ where: { id: deckId } })
      await prisma.user.update({
        where: { id: userId },
        data: before
      })
      await prisma.languages.deleteMany({ where: { id: { in: languages } } })
    }
    await app?.close()
  })

  it('flashcards: deck, card, list, update, read, review, export', async () => {
    const createDeck = await http()
      .post('/flashcards/decks')
      .send({ name: `contract.5e.${Date.now()}` })
    deckId =
      createDeck.body.data?.id ??
      (
        await prisma.flashcardDeck.findFirstOrThrow({
          where: { userId },
          orderBy: { id: 'desc' }
        })
      ).id
    const createCard = await http()
      .post(`/flashcards/decks/${deckId}/cards`)
      .send({ contentType: 'VOCABULARY', metadata: { front: '猫', back: 'cat' } })
    cardId =
      createCard.body.data?.id ??
      (
        await prisma.flashcardCard.findFirstOrThrow({
          where: { deckId },
          orderBy: { id: 'desc' }
        })
      ).id
    expect({
      createDeck: capture(createDeck),
      createCard: capture(createCard),
      decks: capture(
        await http().get('/flashcards/decks').query({ currentPage: '1', pageSize: '10' })
      ),
      deck: capture(await http().get(`/flashcards/decks/${deckId}`)),
      updateDeck: capture(
        await http()
          .put(`/flashcards/decks/${deckId}`)
          .send({ name: 'contract.5e.renamed' })
      ),
      cards: capture(
        await http()
          .get(`/flashcards/decks/${deckId}/cards`)
          .query({ currentPage: '1', pageSize: '10' })
      ),
      updateCard: capture(
        await http()
          .put('/flashcards/decks/cards')
          .send({ deckId, cardId, notes: 'note' })
      ),
      read: capture(
        await http().put('/flashcards/read').send({ deckId, cardId, read: true })
      ),
      reviewList: capture(await http().get(`/flashcards/decks/${deckId}/review`)),
      review: capture(
        await http()
          .post('/flashcards/review')
          .send({ deckId, cardId, result: 'correct' })
      ),
      export: capture(await http().get(`/flashcards/decks/${deckId}/export`))
    }).toMatchSnapshot()
  })

  it('flashcards: delete the cards, then the deck (as the app does)', async () => {
    expect({
      deleteCards: capture(
        await http()
          .delete('/flashcards/decks/cards')
          .send({ deckId, cardIds: [cardId] })
      ),
      // src/services/flashcard deleteDeck
      deleteDeck: capture(await http().delete(`/flashcards/decks/${deckId}`))
    }).toMatchSnapshot()
  })

  it('user: admin list and detail, season stats, match history, JLPT level', async () => {
    expect({
      list: capture(
        await http().get('/user').query({ qs: '', currentPage: '1', pageSize: '10' })
      ),
      detail: capture(await http().get(`/user/${userId}`)),
      statsSeason: capture(await http().get('/user/stats/season')),
      matchingHistory: capture(
        await http()
          .get('/user/matching/history')
          .query({ currentPage: '1', pageSize: '10' })
      ),
      levelJLPT: capture(await http().put('/user/levelJLPT').send({ levelJLPT: 4 }))
    }).toMatchSnapshot()
  })

  it('errors', async () => {
    expect({
      deckMissing: await both((l) => http(l).get('/flashcards/decks/999999')),
      deckInvalidId: await both((l) => http(l).get('/flashcards/decks/abc')),
      updateDeckInvalidId: await both((l) =>
        http(l).put('/flashcards/decks/abc').send({ name: 'x' })
      ),
      cardsInvalidId: await both((l) => http(l).get('/flashcards/decks/abc/cards')),
      createDeckInvalidBody: await both((l) =>
        http(l).post('/flashcards/decks').send({})
      ),
      createCardCustom: await both((l) =>
        http(l)
          .post('/flashcards/decks/999999/cards')
          .send({ contentType: 'CUSTOM', metadata: { a: 1 } })
      ),
      reviewInvalidBody: await both((l) =>
        http(l).post('/flashcards/review').send({ deckId: 1, cardId: 1, result: 'maybe' })
      ),
      deleteDeckMissing: await both((l) => http(l).delete('/flashcards/decks/999999')),
      userInvalidId: await both((l) => http(l).get('/user/abc')),
      userMissing: await both((l) => http(l).get('/user/999999')),
      createUserInvalidBody: await both((l) =>
        http(l).post('/user').send({ email: 'x' })
      ),
      createUserDuplicate: await both((l) =>
        http(l).post('/user').send({ email: TEST_ADMIN.email, name: 'Dup', roleId: 1 })
      ),
      levelInvalid: await both((l) =>
        http(l).put('/user/levelJLPT').send({ levelJLPT: 9 })
      ),
      mainPokemonInvalid: await both((l) =>
        http(l).post('/user/me/set-main-pokemon').send({ pokemonId: 0 })
      ),
      mainPokemonMissing: await both((l) =>
        http(l).post('/user/me/set-main-pokemon').send({ pokemonId: 999999 })
      )
    }).toMatchSnapshot()
  })
})
