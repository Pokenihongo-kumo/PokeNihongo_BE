import { AppModule } from '@/app.module'
import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { MatchQueueService } from '@/modules/match-queue/match-queue.service'
import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { MatchRoundParticipantTimeoutProcessor } from '@/shared/workers/match-round-participant-timeout.processor'
import { RoundQuestionTimeoutProcessor } from '@/shared/workers/round-question-timeout.processor'
import { MatchingGateway } from '@/websockets/matching.gateway'
import { getQueueToken } from '@nestjs/bull'
import { INestApplication, VersioningType } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { Test } from '@nestjs/testing'
import { Job, Queue } from 'bull'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 7c baseline (group 5, battle): the rounds of a match, after
// batch 7b's queue/accept/pick. All six picks make each round's questions and
// queue round one's start; a round starts (first question sent), both players
// answer (src/services/battle submitAnswer, (battle)/arena), the round
// completes and the next one is queued, and after round three the match
// completes (elo moves). Also a question timing out, and errors.
//
// Kept deterministic as in 7b: no cron, battle Bull queues paused (queued
// jobs are read and their processor called directly), the socket server is a
// recorder. The round start also arms a plain setTimeout for each first
// question: the question-timeout handler is replaced by a no-op for the whole
// spec and the real one is called by hand. Five N5 questions, pokemon, a
// second player and a season are made here and removed after; the test
// admin's elo is put back.
describe('Battle batch 7c contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let tokens: { a: string; b: string }
  let users: { a: number; b: number }
  let seasonId = 0
  let eloBefore = 0
  const stamp = Date.now()
  const pokemons: number[] = []
  const questions: number[] = []
  const languages: number[] = []
  const queues: Queue[] = []
  const events: { event: string; room: string; payload: unknown }[] = []
  const PLAYER_B = { email: `battle-c-${stamp}@example.test`, password: 'Contract#1234' }
  const realQuestionTimeout =
    RoundQuestionTimeoutProcessor.prototype.handleQuestionTimeout

  const anon = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
  const as = (who: 'a' | 'b', lang = 'vi') =>
    anon(lang).auth(tokens[who], { type: 'bearer' })
  // Deadlines exist only for whoever's turn/question it is and lists put
  // either player first: those keys read "date|null"
  const TURN_KEYS = new Set(['endTimeSelected', 'selectionEndTime', 'endTimeQuestion'])
  const turnNeutral = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(turnNeutral)
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [
          k,
          TURN_KEYS.has(k) && (v === null || typeof v === 'string' || v instanceof Date)
            ? 'date|null'
            : turnNeutral(v)
        ])
      )
    }
    return value
  }
  const shapeOf = (value: unknown) => responseShape(turnNeutral(value))
  const capture = (res: request.Response) => {
    const body = shapeOf(res.body) as Record<string, unknown>
    if (typeof body?.message === 'string') {
      body.message = body.message.replace(/[0-9]+/g, 'N')
    }
    return { httpStatus: res.status, body }
  }
  const both = async (send: (lang: string) => request.Test) => ({
    vi: capture(await send('vi')),
    en: capture(await send('en'))
  })
  // Socket events since the last call: event names in order, and one payload
  // shape per event name (both players get the same events in either order)
  const takeEvents = () => {
    const taken = events.splice(0, events.length)
    const shapes: Record<string, unknown> = {}
    for (const e of taken) shapes[e.event] ??= { room: e.room, payload: e.payload }
    return { order: taken.map((e) => e.event), shapes }
  }
  const takeJobs = async () => {
    const out: { queue: string; name: string; data: unknown; delay: unknown }[] = []
    for (const q of queues) {
      const jobs = await q.getJobs(['delayed', 'waiting', 'paused', 'active'])
      for (const job of jobs
        .filter(Boolean)
        .sort((x, y) => x.name.localeCompare(y.name))) {
        out.push({
          queue: q.name,
          name: job.name,
          data: responseShape(job.data),
          delay: job.opts.delay ?? 0
        })
        await job.remove()
      }
    }
    return out
  }
  const jobsNamed = async (name: string) => {
    const found: Job[] = []
    for (const q of queues) {
      const jobs = await q.getJobs(['delayed', 'waiting', 'paused'])
      found.push(...jobs.filter((j) => j && j.name === name))
    }
    return found
  }
  const fakeJob = <T>(data: T) =>
    ({ id: 'contract', data, opts: {} }) as unknown as Job<T>
  const latestMatch = async () =>
    (
      await prisma.match.findFirstOrThrow({
        where: { leaderboardSeasonId: seasonId },
        orderBy: { id: 'desc' }
      })
    ).id
  const who = (userId: number) => (userId === users.a ? ('a' as const) : ('b' as const))
  // Per player (a, b): round statuses, answered/total questions, points
  const matchState = async (matchId: number) => {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            participants: {
              include: {
                matchParticipant: true,
                roundQuestions: { include: { roundQuestionsAnswerLogs: true } }
              }
            }
          }
        }
      }
    })
    return {
      status: match.status,
      hasWinner: match.winnerId !== null,
      rounds: match.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        status: r.status,
        hasWinner: r.roundWinnerId !== null,
        players: Object.fromEntries(
          r.participants
            .map((p) => [
              who(p.matchParticipant.userId),
              {
                status: p.status,
                questions: p.roundQuestions.length,
                answered: p.roundQuestions.filter(
                  (q) => q.roundQuestionsAnswerLogs.length
                ).length,
                points: p.points
              }
            ])
            .sort(([x], [y]) => String(x).localeCompare(String(y)))
        )
      }))
    }
  }
  // Both players queue, are paired and accept
  const startMatch = async () => {
    await as('a').post('/match-queue')
    await as('b').post('/match-queue')
    await app.get(MatchQueueService).handleMatchmakingRun()
    const matchId = await latestMatch()
    for (const w of ['a', 'b'] as const) {
      const p = await prisma.matchParticipant.findFirstOrThrow({
        where: { matchId, userId: users[w] }
      })
      await as(w).put(`/match-participant/${p.id}`).send({ hasAccepted: true })
    }
    return matchId
  }
  // The six picks in turn: each player a different pokemon per round
  const pickAll = async (matchId: number) => {
    const responses: unknown[] = []
    const rounds = ['ONE', 'TWO', 'THREE'] as const
    for (let i = 0; i < 6; i++) {
      const turn = await prisma.matchRoundParticipant.findFirstOrThrow({
        where: {
          matchRound: { matchId },
          selectedUserPokemonId: null,
          endTimeSelected: { not: null }
        },
        include: { matchParticipant: true, matchRound: true }
      })
      const pokemonId = pokemons[rounds.indexOf(turn.matchRound.roundNumber as never)]
      responses.push(
        capture(
          await as(who(turn.matchParticipant.userId))
            .put(`/match-round-participant/choose-pokemon/round/${turn.matchRoundId}`)
            .send({ pokemonId })
        )
      )
    }
    return responses
  }
  const startRound = async (job: Job | undefined) =>
    app.get(MatchRoundParticipantTimeoutProcessor).handleStartRound(fakeJob(job?.data))
  // The questions of a player's round, in order, with the right/wrong answer
  const questionsOf = async (matchId: number, roundNumber: string, w: 'a' | 'b') => {
    const participant = await prisma.matchRoundParticipant.findFirstOrThrow({
      where: {
        matchRound: { matchId, roundNumber: roundNumber as never },
        matchParticipant: { userId: users[w] }
      },
      include: {
        roundQuestions: {
          orderBy: { orderNumber: 'asc' },
          include: { questionBank: { include: { answers: true } } }
        }
      }
    })
    return participant.roundQuestions.map((q) => ({
      id: q.id,
      matchRoundParticipantId: participant.id,
      right: q.questionBank.answers.find((x) => x.isCorrect)!.id,
      wrong: q.questionBank.answers.find((x) => !x.isCorrect)!.id
    }))
  }
  const answerAll = async (
    matchId: number,
    roundNumber: string,
    w: 'a' | 'b',
    correct: boolean
  ) => {
    const responses: unknown[] = []
    for (const q of await questionsOf(matchId, roundNumber, w)) {
      responses.push(
        capture(
          await as(w)
            .put(`/round-question/answer/${q.id}`)
            .send({ answerId: correct ? q.right : q.wrong, timeAnswerMs: 1000 })
        )
      )
    }
    return responses
  }
  // Responses of a series: one per distinct shape, with how many there were
  const distinct = (responses: unknown[]) => {
    const seen = new Map<string, { response: unknown; count: number }>()
    for (const r of responses) {
      const key = JSON.stringify(r)
      const entry = seen.get(key) ?? { response: r, count: 0 }
      entry.count++
      seen.set(key, entry)
    }
    return [...seen.values()]
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)

    for (const job of app.get(SchedulerRegistry).getCronJobs().values()) job.stop()
    for (const name of [
      BullQueue.MATCH_PARTICIPANT_TIMEOUT,
      BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT,
      BullQueue.ROUND_QUESTION_TIMEOUT
    ]) {
      const q = app.get<Queue>(getQueueToken(name))
      await q.pause()
      queues.push(q)
    }
    jest
      .spyOn(app.get(RoundQuestionTimeoutProcessor), 'handleQuestionTimeout')
      .mockResolvedValue(undefined)
    app.get(MatchingGateway).server = {
      to: (room: string) => ({
        emit: (event: string, payload: unknown) =>
          events.push({
            event,
            room: room.replace(/[0-9]+/g, 'N'),
            payload: shapeOf(payload)
          })
      })
    } as never

    for (const [code, name] of [
      ['vi', 'Tiếng Việt'],
      ['en', 'English']
    ]) {
      if (await prisma.languages.findUnique({ where: { code } })) continue
      languages.push((await prisma.languages.create({ data: { code, name } })).id)
    }
    const a = await loginAsTestAdmin(app, [
      { method: 'POST', path: '/match-queue' },
      { method: 'PUT', path: '/match-participant/:matchParticipantId' },
      {
        method: 'PUT',
        path: '/match-round-participant/choose-pokemon/round/:matchRoundId'
      },
      { method: 'PUT', path: '/round-question/answer/:roundQuestionId' },
      { method: 'GET', path: '/match-round/now/user' },
      { method: 'GET', path: '/match/tracking' }
    ])
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email }
    })
    eloBefore = admin.eloscore
    const b = await prisma.user.create({
      data: {
        email: PLAYER_B.email,
        name: 'Contract Player C',
        password: await app.get(HashingService).hash(PLAYER_B.password),
        roleId: admin.roleId,
        levelId: admin.levelId,
        status: 'ACTIVE'
      }
    })
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', TEST_USER_AGENT)
      .send(PLAYER_B)
    tokens = { a, b: login.body.data.accessToken }
    users = { a: admin.id, b: b.id }

    seasonId = (
      await prisma.leaderboardSeason.create({
        data: {
          nameKey: `leaderboardSeason.contract7c.${stamp}`,
          status: 'ACTIVE',
          hasOpened: true,
          startDate: new Date(Date.now() - 24 * 3600 * 1000),
          endDate: new Date(Date.now() + 10 * 24 * 3600 * 1000)
        }
      })
    ).id
    for (let n = 1; n <= 5; n++) {
      pokemons.push(
        (
          await prisma.pokemon.create({
            data: {
              pokedex_number: 98000 + n,
              nameJp: `ラウンド${stamp}${n}`,
              nameTranslations: { vi: `Round ${n}`, en: `Round ${n}`, ja: `ラウンド${n}` }
            }
          })
        ).id
      )
      questions.push(
        (
          await prisma.questionBank.create({
            data: {
              questionJp: `しつもん${stamp}${n}`,
              questionKey: `question.contract7c.${stamp}.${n}`,
              questionType: 'VOCABULARY',
              levelN: 5,
              answers: {
                create: [
                  { answerJp: `ただしい${n}`, isCorrect: true },
                  { answerJp: `まちがい${n}`, isCorrect: false }
                ]
              }
            }
          })
        ).id
      )
    }
    for (const userId of [users.a, users.b]) {
      await prisma.userSeasonHistory.create({ data: { userId, seasonId, finalRank: '' } })
      await prisma.userPokemon.createMany({
        data: pokemons.map((pokemonId) => ({ userId, pokemonId }))
      })
    }
    await prisma.user.update({ where: { id: users.a }, data: { eloscore: 0 } })
  })

  afterAll(async () => {
    if (prisma) {
      const matches = (
        await prisma.match.findMany({ where: { leaderboardSeasonId: seasonId } })
      ).map((m) => m.id)
      const roundParticipants = (
        await prisma.matchRoundParticipant.findMany({
          where: { matchRound: { matchId: { in: matches } } }
        })
      ).map((p) => p.id)
      const roundQuestions = (
        await prisma.roundQuestion.findMany({
          where: { matchRoundParticipantId: { in: roundParticipants } }
        })
      ).map((q) => q.id)
      await prisma.roundQuestionsAnswerLog.deleteMany({
        where: { roundQuestionId: { in: roundQuestions } }
      })
      await prisma.roundQuestion.deleteMany({ where: { id: { in: roundQuestions } } })
      await prisma.match.updateMany({
        where: { id: { in: matches } },
        data: { winnerId: null }
      })
      await prisma.matchRound.updateMany({
        where: { matchId: { in: matches } },
        data: { roundWinnerId: null }
      })
      await prisma.matchRoundParticipant.deleteMany({
        where: { id: { in: roundParticipants } }
      })
      await prisma.matchRound.deleteMany({ where: { matchId: { in: matches } } })
      await prisma.matchParticipant.deleteMany({ where: { matchId: { in: matches } } })
      await prisma.match.deleteMany({ where: { id: { in: matches } } })
      if (users) {
        const ids = [users.a, users.b]
        await prisma.matchQueue.deleteMany({ where: { userId: { in: ids } } })
        await prisma.userSeasonHistory.deleteMany({ where: { userId: { in: ids } } })
        await prisma.userPokemon.deleteMany({ where: { userId: { in: ids } } })
        await prisma.refreshToken.deleteMany({ where: { userId: users.b } })
        await prisma.device.deleteMany({ where: { userId: users.b } })
        await prisma.user.deleteMany({ where: { id: users.b } })
        await prisma.user.update({
          where: { id: users.a },
          data: { eloscore: eloBefore }
        })
      }
      await prisma.answer.deleteMany({ where: { questionBankId: { in: questions } } })
      await prisma.questionBank.deleteMany({ where: { id: { in: questions } } })
      await prisma.leaderboardSeason.deleteMany({ where: { id: seasonId } })
      await prisma.pokemon.deleteMany({ where: { id: { in: pokemons } } })
      await prisma.languages.deleteMany({ where: { id: { in: languages } } })
    }
    for (const q of queues) {
      for (const job of await q.getJobs(['delayed', 'waiting', 'paused']))
        await job?.remove()
      await q.resume()
    }
    if (app) {
      const processor = app.get(RoundQuestionTimeoutProcessor) as unknown as {
        timeoutRefs: Map<string, NodeJS.Timeout>
      }
      for (const ref of processor.timeoutRefs?.values() ?? []) clearTimeout(ref)
      for (const job of app.get(SchedulerRegistry).getCronJobs().values()) job.start()
    }
    await app?.close()
  })

  it('all six picks: each round gets its questions, round one start is queued', async () => {
    const matchId = await startMatch()
    takeEvents()
    await takeJobs()
    const picks = await pickAll(matchId)
    expect({
      picks: distinct(picks),
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: (await jobsNamed(BullAction.START_ROUND)).map((j) => responseShape(j.data))
    }).toMatchSnapshot()
  })

  it('round one starts: both players get the round and their first question', async () => {
    const matchId = await latestMatch()
    const [start] = await jobsNamed(BullAction.START_ROUND)
    await takeJobs()
    await startRound(start)
    expect({
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: await takeJobs(),
      roundsNow: capture(await as('a').get('/match-round/now/user')),
      tracking: capture(await as('a').get('/match/tracking'))
    }).toMatchSnapshot()
  })

  it("round one: someone else's question, then A all right and B all wrong; round two is queued", async () => {
    const matchId = await latestMatch()
    const [bFirst] = await questionsOf(matchId, 'ONE', 'b')
    const othersQuestion = capture(
      await as('a')
        .put(`/round-question/answer/${bFirst.id}`)
        .send({ answerId: bFirst.wrong, timeAnswerMs: 1000 })
    )
    const othersQuestionEffect = await matchState(matchId)
    takeEvents()
    await takeJobs()
    const aAnswers = await answerAll(matchId, 'ONE', 'a', true)
    const afterA = { match: await matchState(matchId), events: takeEvents() }
    const bAnswers = await answerAll(matchId, 'ONE', 'b', false)
    // B again on its own first question, after the round: one answer per question
    const answerAgain = await both((l) =>
      as('b', l)
        .put(`/round-question/answer/${bFirst.id}`)
        .send({ answerId: bFirst.right, timeAnswerMs: 1000 })
    )
    expect({
      othersQuestion,
      othersQuestionEffect,
      aAnswers: distinct(aAnswers),
      afterA,
      bAnswers: distinct(bAnswers),
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: (await jobsNamed(BullAction.START_ROUND)).map((j) => responseShape(j.data)),
      answerAgain
    }).toMatchSnapshot()
  })

  it('rounds two and three: the match completes, the winner gains elo', async () => {
    const matchId = await latestMatch()
    for (const roundNumber of ['TWO', 'THREE']) {
      const [start] = await jobsNamed(BullAction.START_ROUND)
      await takeJobs()
      await startRound(start)
      await answerAll(matchId, roundNumber, 'a', true)
      await answerAll(matchId, roundNumber, 'b', false)
    }
    const [a, b] = await Promise.all(
      [users.a, users.b].map((id) => prisma.user.findUniqueOrThrow({ where: { id } }))
    )
    expect({
      match: await matchState(matchId),
      elo: { aGained: a.eloscore > 0, bAtZero: b.eloscore === 0 },
      events: takeEvents(),
      jobs: await takeJobs(),
      tracking: capture(await as('a').get('/match/tracking'))
    }).toMatchSnapshot()
  })

  it('a question times out: nothing is logged for it, the next question is sent', async () => {
    // the last match moved A's elo: back to even so the first matchmaking run pairs them
    await prisma.user.updateMany({
      where: { id: { in: [users.a, users.b] } },
      data: { eloscore: 0 }
    })
    const matchId = await startMatch()
    await pickAll(matchId)
    const [start] = await jobsNamed(BullAction.START_ROUND)
    await takeJobs()
    await startRound(start)
    takeEvents()
    const [first] = await questionsOf(matchId, 'ONE', 'a')
    await realQuestionTimeout.call(
      app.get(RoundQuestionTimeoutProcessor),
      fakeJob({
        roundQuestionId: first.id,
        matchRoundParticipantId: first.matchRoundParticipantId
      })
    )
    const log = await prisma.roundQuestionsAnswerLog.findFirst({
      where: { roundQuestionId: first.id }
    })
    expect({
      answerLog: log
        ? {
            answerId: log.answerId,
            isCorrect: log.isCorrect,
            pointsEarned: log.pointsEarned
          }
        : null,
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: await takeJobs()
    }).toMatchSnapshot()
    await prisma.match.update({ where: { id: matchId }, data: { status: 'COMPLETED' } })
  })

  it('errors', async () => {
    expect({
      answerBadId: await both((l) =>
        as('a', l)
          .put('/round-question/answer/abc')
          .send({ answerId: 1, timeAnswerMs: 1 })
      ),
      answerMissing: await both((l) =>
        as('a', l)
          .put('/round-question/answer/99999999')
          .send({ answerId: 1, timeAnswerMs: 1 })
      ),
      answerNoBody: await both((l) =>
        as('a', l).put('/round-question/answer/1').send({})
      ),
      answerWithoutLogin: {
        httpStatus: (await anon().put('/round-question/answer/1').send({})).status
      },
      events: takeEvents()
    }).toMatchSnapshot()
  })
})
