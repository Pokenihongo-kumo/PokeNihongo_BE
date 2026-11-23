import { AppModule } from '@/app.module'
import { TextToSpeechService } from '@/modules/speech/text-to-speech.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 7 Z2c-2 baseline: the content routes that return data without a
// response serializer and had no snapshot of their body shape (or only one
// with empty arrays). Recorded with real rows behind them (a test set with two
// question banks that have answers, a test and a lesson review test using it,
// an exercise, a vocabulary word) before the serializers were added; they
// must keep these snapshots.
describe('Content serializers contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let startedAt: Date
  const created = { languages: [] as number[], lessonCategory: 0 }
  const KATAKANA = 'アイウエオカキクケコサシスセソタチツテト'
  const wordJp =
    'セリアル' +
    Array.from(
      { length: 6 },
      () => KATAKANA[Math.floor(Math.random() * KATAKANA.length)]
    ).join('')

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  // Messages may carry an id or a count: digits become N
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
    // No real TTS (vocabulary create)
    jest
      .spyOn(TextToSpeechService.prototype, 'generateAudioFromText')
      .mockResolvedValue(null as never)
    token = await loginAsTestAdmin(app, [
      { method: 'POST', path: '/lessons' },
      { method: 'POST', path: '/question-bank/with-answers' },
      { method: 'GET', path: '/question-bank/by-ids' },
      { method: 'POST', path: '/testset/with-meanings' },
      { method: 'GET', path: '/testset/:id' },
      { method: 'PUT', path: '/testset/:id' },
      { method: 'POST', path: '/testset-questionbank' },
      { method: 'POST', path: '/testset-questionbank/multiple' },
      { method: 'GET', path: '/testset-questionbank/:id' },
      { method: 'GET', path: '/testset-questionbank/testset/:testSetId' },
      {
        method: 'GET',
        path: '/testset-questionbank/testset/:testSetId/full-with-answer'
      },
      { method: 'PUT', path: '/testset-questionbank/:id' },
      { method: 'PUT', path: '/testset-questionbank/:id/question-order' },
      { method: 'DELETE', path: '/testset-questionbank/testset/:testSetId' },
      { method: 'POST', path: '/test/with-meanings' },
      { method: 'POST', path: '/test/:id/testSets' },
      { method: 'POST', path: '/test/lesson/:lessonId/testSets' },
      { method: 'GET', path: '/test/:id' },
      { method: 'GET', path: '/test/:id/full' },
      { method: 'GET', path: '/test/:id/full-user' },
      { method: 'GET', path: '/test/:id/placement-questions' },
      { method: 'GET', path: '/test/:id/random-questions' },
      { method: 'GET', path: '/test/lesson-review/:testId/questions' },
      { method: 'DELETE', path: '/test/bulk' },
      { method: 'DELETE', path: '/test/:id' },
      { method: 'POST', path: '/exercises' },
      { method: 'GET', path: '/exercises' },
      { method: 'GET', path: '/exercises/:id' },
      { method: 'GET', path: '/exercises/:id/plain' },
      { method: 'POST', path: '/vocabulary/full' },
      { method: 'POST', path: '/vocabulary/add-meaning' },
      { method: 'GET', path: '/kanji/stats' }
    ])
    startedAt = new Date()
    created.lessonCategory = (
      await prisma.lessonCategory.create({
        data: {
          nameKey: `contract.z2c.${startedAt.getTime()}`,
          slug: `contract-z2c-${startedAt.getTime()}`
        }
      })
    ).id
  })

  // Leave the test DB as it was: everything created during the run (links,
  // answers, exercises and meanings cascade)
  afterAll(async () => {
    jest.restoreAllMocks()
    if (prisma && startedAt) {
      const since = { createdAt: { gte: startedAt } }
      await prisma.testTestSet.deleteMany({ where: since })
      // the lesson review read opens a user test and an attempt for the admin
      await prisma.userTestAttempt.deleteMany({ where: since })
      await prisma.userTest.deleteMany({ where: since })
      await prisma.lesson.deleteMany({ where: since })
      await prisma.test.deleteMany({ where: since })
      await prisma.testSet.deleteMany({ where: since })
      await prisma.questionBank.deleteMany({ where: since })
      const words = await prisma.vocabulary.findMany({ where: { wordJp } })
      for (const { id } of words) {
        const meanings = await prisma.meaning.findMany({ where: { vocabularyId: id } })
        const keys = meanings
          .flatMap((m) => [m.meaningKey, m.exampleSentenceKey, m.explanationKey])
          .filter((key): key is string => !!key)
        await prisma.translation.deleteMany({ where: { key: { in: keys } } })
      }
      await prisma.vocabulary.deleteMany({ where: { wordJp } })
      await prisma.translation.deleteMany({ where: since })
      if (created.lessonCategory) {
        await prisma.lessonCategory.deleteMany({ where: { id: created.lessonCategory } })
      }
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  const questionBank = async (questionJp: string, questionType = 'VOCABULARY') => {
    const res = await http()
      .post('/question-bank/with-answers')
      .send({
        questionJp,
        questionType,
        levelN: 5,
        meanings: [{ translations: { vi: `Câu ${questionJp}`, en: `Q ${questionJp}` } }],
        answers: [
          {
            answerJp: '正しい',
            isCorrect: true,
            translations: {
              meaning: [
                { language_code: 'vi', value: 'Đúng' },
                { language_code: 'en', value: 'Right' }
              ]
            }
          },
          { answerJp: '違う', isCorrect: false }
        ]
      })
    return res.body.data.questionBank.id as number
  }
  // An active test set of one type holding the given question banks
  const testSetOf = async (testType: string, questionBankIds: number[]) => {
    const id = (
      await http()
        .post('/testset/with-meanings')
        .send({
          testType,
          levelN: 5,
          status: 'ACTIVE',
          meanings: [
            { field: 'name', translations: { vi: `Bộ ${testType}`, en: testType } }
          ]
        })
    ).body.data.id as number
    await http()
      .post('/testset-questionbank/multiple')
      .send({ testSetId: id, questionBankIds })
    return id
  }
  const newTest = async (testType: string, testSetIds: number[]) => {
    const id = (
      await http()
        .post('/test/with-meanings')
        .send({
          testType,
          levelN: 5,
          meanings: [
            { field: 'name', translations: { vi: `Bài ${testType}`, en: testType } }
          ]
        })
    ).body.data.id as number
    await http().post(`/test/${id}/testSets`).send({ testSetIds })
    return id
  }

  let lessonId: number
  let testSetId: number
  let testId: number
  let linkId: number

  it('test set, its question banks and the links', async () => {
    const lesson = await http()
      .post('/lessons')
      .send({
        titleJp: 'シリアライザの課',
        levelJlpt: 5,
        estimatedTimeMinutes: 10,
        lessonCategoryId: created.lessonCategory,
        translations: {
          meaning: [
            { language_code: 'vi', value: 'Bài serializer' },
            { language_code: 'en', value: 'Serializer lesson' }
          ]
        }
      })
    lessonId = lesson.body.data.id
    const qb1 = await questionBank('シリアライザ一')
    const qb2 = await questionBank('シリアライザ二')
    testSetId = (
      await http()
        .post('/testset/with-meanings')
        .send({
          testType: 'VOCABULARY',
          levelN: 5,
          status: 'ACTIVE',
          meanings: [
            {
              field: 'name',
              translations: { vi: 'Bộ đề serializer', en: 'Serializer set' }
            },
            { field: 'description', translations: { vi: 'Mô tả', en: 'Description' } }
          ]
        })
    ).body.data.id
    const link = await http()
      .post('/testset-questionbank')
      .send({ testSetId, questionBankId: qb1 })
    linkId = (
      await prisma.testSetQuestionBank.findFirstOrThrow({
        where: { testSetId, questionBankId: qb1 }
      })
    ).id
    await http()
      .post('/testset-questionbank/multiple')
      .send({ testSetId, questionBankIds: [qb2] })
    expect({
      link: capture(link),
      linkById: capture(await http().get(`/testset-questionbank/${linkId}`)),
      linksByTestSet: capture(
        await http().get(`/testset-questionbank/testset/${testSetId}`)
      ),
      fullWithAnswer: capture(
        await http().get(`/testset-questionbank/testset/${testSetId}/full-with-answer`)
      ),
      updateLink: capture(
        await http().put(`/testset-questionbank/${linkId}`).send({ questionBankId: qb1 })
      ),
      questionOrder: capture(
        await http()
          .put(`/testset-questionbank/${linkId}/question-order`)
          .send({ questionOrder: 3 })
      ),
      questionBanksByIds: capture(
        await http()
          .get('/question-bank/by-ids')
          .query({ questionIds: `${qb1},${qb2}` })
      ),
      testSetDetail: capture(await http().get(`/testset/${testSetId}`)),
      testSetUpdate: capture(await http().put(`/testset/${testSetId}`).send({ price: 0 }))
    }).toMatchSnapshot()
  })

  it('test reads with questions behind them', async () => {
    testId = (
      await http()
        .post('/test/with-meanings')
        .send({
          testType: 'QUIZ_TEST',
          levelN: 5,
          meanings: [
            {
              field: 'name',
              translations: { vi: 'Bài test serializer', en: 'Serializer test' }
            },
            { field: 'description', translations: { vi: 'Mô tả', en: 'Description' } }
          ]
        })
    ).body.data.id
    await http()
      .post(`/test/${testId}/testSets`)
      .send({ testSetIds: [testSetId] })
    expect({
      detail: capture(await http().get(`/test/${testId}`)),
      full: capture(await http().get(`/test/${testId}/full`)),
      fullUser: capture(await http().get(`/test/${testId}/full-user`)),
      randomQuestions: capture(
        await http()
          .get(`/test/${testId}/random-questions`)
          .query({ levelN: '5', count: '1' })
      )
    }).toMatchSnapshot()
  })

  it('placement questions and a lesson review test', async () => {
    // Placement questions: a PLACEMENT_TEST_DONE test the admin holds a user test for
    const placementTestId = await newTest('PLACEMENT_TEST_DONE', [testSetId])
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email }
    })
    await prisma.userTest.create({
      data: { userId: admin.id, testId: placementTestId, status: 'ACTIVE', limit: 1 }
    })
    // A lesson review test reads one VOCABULARY, GRAMMAR and KANJI test set
    // (up to 5 questions each) and needs at least 10 questions in all
    const many = async (prefix: string, type: string) => {
      const ids: number[] = []
      for (let i = 1; i <= 4; i++) ids.push(await questionBank(`${prefix}${i}`, type))
      return ids
    }
    const vocabularySet = await testSetOf(
      'VOCABULARY',
      await many('シリアル語', 'VOCABULARY')
    )
    const grammarSet = await testSetOf('GRAMMAR', await many('シリアル文', 'GRAMMAR'))
    const kanjiSet = await testSetOf('KANJI', await many('シリアル字', 'KANJI'))
    const reviewTestId = await newTest('LESSON_REVIEW', [])
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { testId: reviewTestId }
    })
    const lessonLink = await http()
      .post(`/test/lesson/${lessonId}/testSets`)
      .send({ testSetIds: [vocabularySet, grammarSet, kanjiSet] })
    expect({
      lessonLink: capture(lessonLink),
      placementQuestions: capture(
        await http().get(`/test/${placementTestId}/placement-questions`)
      ),
      lessonReviewQuestions: capture(
        await http().get(`/test/lesson-review/${reviewTestId}/questions`)
      )
    }).toMatchSnapshot()
  })

  it('exercises: list, detail, plain detail', async () => {
    const exerciseId = (
      await http()
        .post('/exercises')
        .send({ exerciseType: 'VOCABULARY', lessonId, testSetId })
    ).body.data.id
    expect({
      list: capture(
        await http()
          .get('/exercises')
          .query({ currentPage: '1', pageSize: '5', lessonId: `${lessonId}` })
      ),
      detail: capture(await http().get(`/exercises/${exerciseId}`)),
      plain: capture(await http().get(`/exercises/${exerciseId}/plain`))
    }).toMatchSnapshot()
  })

  it('vocabulary create and add meaning, kanji stats', async () => {
    const full = await http()
      .post('/vocabulary/full')
      .field('word_jp', wordJp)
      .field('reading', 'せりある')
      .field('level_n', '5')
      .field(
        'translations',
        JSON.stringify({
          meaning: [
            { language_code: 'vi', value: 'từ serializer' },
            { language_code: 'en', value: 'serializer word' }
          ]
        })
      )
    const vocabularyId = full.body.data.vocabulary.id
    expect({
      full: capture(full),
      addMeaning: capture(
        await http()
          .post('/vocabulary/add-meaning')
          .send({ vocabularyId, exampleSentenceJp: 'これは例文です。' })
      ),
      kanjiStats: capture(await http().get('/kanji/stats'))
    }).toMatchSnapshot()
  })

  it('deletes: links of a test set, tests in bulk, one test', async () => {
    const other = (
      await http()
        .post('/test/with-meanings')
        .send({
          testType: 'QUIZ_TEST',
          levelN: 5,
          meanings: [{ field: 'name', translations: { vi: 'Xóa', en: 'Delete' } }]
        })
    ).body.data.id
    expect({
      deleteLinks: capture(
        await http().delete(`/testset-questionbank/testset/${testSetId}`)
      ),
      deleteTestsBulk: capture(
        await http()
          .delete('/test/bulk')
          .send({ ids: [other] })
      ),
      deleteTest: capture(await http().delete(`/test/${testId}`))
    }).toMatchSnapshot()
  })
})
