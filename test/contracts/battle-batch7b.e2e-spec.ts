import { AppModule } from '@/app.module'
import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { MatchQueueService } from '@/modules/match-queue/match-queue.service'
import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { MatchParticipantTimeoutProcessor } from '@/modules/match-participant/match-participant-timeout.processor'
import { MatchRoundParticipantTimeoutProcessor } from '@/modules/match-round-participant/match-round-participant-timeout.processor'
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

// Phase 3, batch 7b baseline (group 5, battle): the match flow the mobile app
// drives (src/services/battle, app/(app)/(tabs)/battle, (battle)/pick-pokemon):
// join/leave the queue, matchmaking pairs two players and tells both over the
// /matching socket, both accept (or one declines, or the acceptance times out),
// three rounds are made and round one's pokemon are picked in turn (or the
// picker times out). Questions and answers (rounds proper) come in batch 7c.
//
// Kept deterministic: the 5 s matchmaking cron is stopped and run by hand, the
// battle Bull queues are paused (jobs are read, their processor called
// directly, then removed), and the gateway's socket server is replaced by a
// recorder (event, room, payload shape). The test database has no battle data:
// pokemon, a second player, a season and their season histories are made here
// and removed after.
describe('Battle batch 7b contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let tokens: { a: string; b: string }
  let users: { a: number; b: number }
  let seasonId = 0
  const stamp = Date.now()
  const pokemons: number[] = []
  const languages: number[] = []
  const queues: Queue[] = []
  const events: { event: string; room: string; payload: unknown }[] = []
  const PLAYER_B = { email: `battle-b-${stamp}@example.test`, password: 'Contract#1234' }

  const anon = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
  const as = (who: 'a' | 'b', lang = 'vi') =>
    anon(lang).auth(tokens[who], { type: 'bearer' })
  // A pick deadline is set only on the player whose turn it is, and lists
  // put either player first (pick order is random): those keys read
  // "date|null" so the snapshot does not depend on who picks first
  const TURN_KEYS = new Set(['endTimeSelected', 'selectionEndTime'])
  const turnNeutral = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(turnNeutral)
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [
          k,
          TURN_KEYS.has(k) && (v === null || typeof v === 'string')
            ? 'date|null'
            : turnNeutral(v)
        ])
      )
    }
    return value
  }
  const shapeOf = (value: unknown) => responseShape(turnNeutral(value))
  // Some messages carry a number (ids, the required level/pokemon): digits become N
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
  // Socket events since the last call, in order
  const takeEvents = () => events.splice(0, events.length)
  // Jobs the flow queued (queues are paused): name and data keys, then removed
  const takeJobs = async () => {
    const out: { queue: string; name: string; data: unknown; delay: unknown }[] = []
    for (const q of queues) {
      const jobs = await q.getJobs(['delayed', 'waiting', 'paused', 'active'])
      for (const job of jobs.filter(Boolean).sort((x, y) => +x.id - +y.id)) {
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
  // Read the queued jobs of one kind (keeps them until takeJobs)
  const jobsNamed = async (name: string) => {
    const found: Job[] = []
    for (const q of queues) {
      const jobs = await q.getJobs(['delayed', 'waiting', 'paused'])
      found.push(...jobs.filter((j) => j && j.name === name))
    }
    return found
  }
  const matchState = async (matchId: number) => {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: {
        participants: { orderBy: { userId: 'asc' } },
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: { participants: { orderBy: { orderSelected: 'asc' } } }
        }
      }
    })
    return {
      status: match.status,
      accepted: match.participants.map((p) => p.hasAccepted),
      rounds: match.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        status: r.status,
        participants: r.participants.map((p) => ({
          orderSelected: p.orderSelected,
          status: p.status,
          picked: p.selectedUserPokemonId !== null,
          hasEndTime: p.endTimeSelected !== null
        }))
      }))
    }
  }
  const latestMatch = async () =>
    (
      await prisma.match.findFirstOrThrow({
        where: { leaderboardSeasonId: seasonId },
        orderBy: { id: 'desc' }
      })
    ).id
  const participantOf = async (matchId: number, userId: number) =>
    (await prisma.matchParticipant.findFirstOrThrow({ where: { matchId, userId } })).id
  // Both players queue and the matchmaking run pairs them
  const pairUp = async () => {
    await as('a').post('/match-queue')
    await as('b').post('/match-queue')
    await app.get(MatchQueueService).handleMatchmakingRun()
    return latestMatch()
  }
  const endMatch = (matchId: number) =>
    prisma.match.update({ where: { id: matchId }, data: { status: 'COMPLETED' } })
  const fakeJob = <T>(data: T) =>
    ({ id: 'contract', data, opts: {} }) as unknown as Job<T>

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)

    // deterministic: no cron, no Bull worker, a recording socket server
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
      { method: 'DELETE', path: '/match-queue/user' },
      { method: 'PUT', path: '/match-participant/:matchParticipantId' },
      { method: 'GET', path: '/match-round/now/user' },
      {
        method: 'PUT',
        path: '/match-round-participant/choose-pokemon/round/:matchRoundId'
      },
      { method: 'GET', path: '/match/tracking' },
      { method: 'GET', path: '/user-pokemon/user/rounds/pokemons' }
    ])
    // player B: same role (same permissions), logs in the same way
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email }
    })
    const b = await prisma.user.create({
      data: {
        email: PLAYER_B.email,
        name: 'Contract Player B',
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

    for (let n = 1; n <= 6; n++) {
      pokemons.push(
        (
          await prisma.pokemon.create({
            data: {
              pokedex_number: 97000 + n,
              nameJp: `バトル${stamp}${n}`,
              nameTranslations: { vi: `Battle ${n}`, en: `Battle ${n}`, ja: `バトル${n}` }
            }
          })
        ).id
      )
    }
  })

  afterAll(async () => {
    if (prisma) {
      const matches = (
        await prisma.match.findMany({ where: { leaderboardSeasonId: seasonId } })
      ).map((m) => m.id)
      const rounds = (
        await prisma.matchRound.findMany({ where: { matchId: { in: matches } } })
      ).map((r) => r.id)
      await prisma.matchRoundParticipant.deleteMany({
        where: { matchRoundId: { in: rounds } }
      })
      await prisma.matchRound.deleteMany({ where: { id: { in: rounds } } })
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
      }
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
      for (const job of app.get(SchedulerRegistry).getCronJobs().values()) job.start()
    }
    await app?.close()
  })

  it('joining the queue is refused: no season, season not joined, not enough pokemon', async () => {
    const noSeason = await both((l) => as('a', l).post('/match-queue'))
    seasonId = (
      await prisma.leaderboardSeason.create({
        data: {
          nameKey: `leaderboardSeason.contract7b.${stamp}`,
          status: 'ACTIVE',
          hasOpened: true,
          startDate: new Date(Date.now() - 24 * 3600 * 1000),
          endDate: new Date(Date.now() + 10 * 24 * 3600 * 1000)
        }
      })
    ).id
    const notJoined = await both((l) => as('a', l).post('/match-queue'))
    for (const userId of [users.a, users.b]) {
      await prisma.userSeasonHistory.create({ data: { userId, seasonId, finalRank: '' } })
    }
    const fewPokemon = await both((l) => as('a', l).post('/match-queue'))
    expect({ noSeason, notJoined, fewPokemon, events: takeEvents() }).toMatchSnapshot()
  })

  it('queue, queue twice, leave, queue again; matchmaking pairs the two players', async () => {
    for (const userId of [users.a, users.b]) {
      await prisma.userPokemon.createMany({
        data: pokemons.slice(0, 5).map((pokemonId) => ({ userId, pokemonId }))
      })
    }
    const joined = capture(await as('a').post('/match-queue'))
    const twice = await both((l) => as('a', l).post('/match-queue'))
    const left = capture(await as('a').delete('/match-queue/user'))
    const again = capture(await as('a').post('/match-queue'))
    const second = capture(await as('b').post('/match-queue'))
    await app.get(MatchQueueService).handleMatchmakingRun()
    const matchId = await latestMatch()
    expect({
      joined,
      twice,
      left,
      again,
      second,
      stillQueued: await prisma.matchQueue.count({
        where: { userId: { in: [users.a, users.b] } }
      }),
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: await takeJobs()
    }).toMatchSnapshot()
  })

  it('both accept: the match starts, three rounds are made, the first picker is timed', async () => {
    const matchId = await latestMatch()
    const pa = await participantOf(matchId, users.a)
    const pb = await participantOf(matchId, users.b)
    const acceptA = capture(
      await as('a').put(`/match-participant/${pa}`).send({ hasAccepted: true })
    )
    const acceptAAgain = await both((l) =>
      as('a', l).put(`/match-participant/${pa}`).send({ hasAccepted: true })
    )
    const afterOne = { match: await matchState(matchId), events: takeEvents() }
    const acceptB = capture(
      await as('b').put(`/match-participant/${pb}`).send({ hasAccepted: true })
    )
    // who picks first is random: read the rounds as the first and the second picker
    const firstPicker = await prisma.matchRoundParticipant.findFirstOrThrow({
      where: { matchRound: { matchId, roundNumber: 'ONE' } },
      orderBy: { orderSelected: 'asc' },
      include: { matchParticipant: true }
    })
    const first = firstPicker.matchParticipant.userId === users.a ? 'a' : 'b'
    const second = first === 'a' ? 'b' : 'a'
    expect({
      acceptA,
      acceptAAgain,
      afterOne,
      acceptB,
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: await takeJobs(),
      roundsNowFirstPicker: capture(await as(first).get('/match-round/now/user')),
      roundsNowSecondPicker: capture(await as(second).get('/match-round/now/user')),
      trackingFirstPicker: capture(await as(first).get('/match/tracking')),
      trackingSecondPicker: capture(await as(second).get('/match/tracking')),
      roundPokemon: capture(
        await as('a').get('/user-pokemon/user/rounds/pokemons').query({ qs: 'types=1' })
      ),
      queueWhileInMatch: await both((l) => as('a', l).post('/match-queue'))
    }).toMatchSnapshot()
  })

  // Out of turn used to take the pick (no turn check): now NOT_YOUR_TURN
  it("round one picks in turn: out of turn, not owned, first, second (round two's first picker is timed next)", async () => {
    const matchId = await latestMatch()
    const roundOne = await prisma.matchRound.findFirstOrThrow({
      where: { matchId, roundNumber: 'ONE' },
      include: {
        participants: {
          orderBy: { orderSelected: 'asc' },
          include: { matchParticipant: true }
        }
      }
    })
    const order = roundOne.participants.map((p) =>
      p.matchParticipant.userId === users.a ? ('a' as const) : ('b' as const)
    )
    const pick = (who: 'a' | 'b', pokemonId: number, lang = 'vi') =>
      as(who, lang)
        .put(`/match-round-participant/choose-pokemon/round/${roundOne.id}`)
        .send({ pokemonId })
    const outOfTurn = await both((l) => pick(order[1], pokemons[1], l))
    const notOwned = await both((l) => pick(order[0], pokemons[5], l))
    const first = capture(await pick(order[0], pokemons[0]))
    const afterFirst = {
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: await takeJobs()
    }
    const second = capture(await pick(order[1], pokemons[1]))
    expect({
      outOfTurn,
      notOwned,
      first,
      afterFirst,
      second,
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: await takeJobs()
    }).toMatchSnapshot()
    await endMatch(matchId)
  })

  // PUT /match-participant/:id had no ownership check: another player's place
  // now answers like a missing one
  it("a player cannot answer for the other's place", async () => {
    const matchId = await pairUp()
    takeEvents()
    await takeJobs()
    const pa = await participantOf(matchId, users.a)
    const forOther = capture(
      await as('b').put(`/match-participant/${pa}`).send({ hasAccepted: false })
    )
    expect({ forOther, match: await matchState(matchId) }).toMatchSnapshot()
    await endMatch(matchId)
    takeEvents()
    await takeJobs()
  })

  it('one player declines: the match is cancelled and both are told', async () => {
    const matchId = await pairUp()
    takeEvents()
    await takeJobs()
    const pa = await participantOf(matchId, users.a)
    const pb = await participantOf(matchId, users.b)
    const accept = capture(
      await as('a').put(`/match-participant/${pa}`).send({ hasAccepted: true })
    )
    const decline = capture(
      await as('b').put(`/match-participant/${pb}`).send({ hasAccepted: false })
    )
    expect({
      accept,
      decline,
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: await takeJobs()
    }).toMatchSnapshot()
  })

  it('acceptance times out: the silent player counts as declining', async () => {
    const matchId = await pairUp()
    takeEvents()
    const timeouts = await jobsNamed(BullAction.CHECK_ACCEPTANCE_TIMEOUT)
    const pa = await participantOf(matchId, users.a)
    await as('a').put(`/match-participant/${pa}`).send({ hasAccepted: true })
    takeEvents()
    const pb = await participantOf(matchId, users.b)
    const job = timeouts.find((j) => j.data.matchParticipantId === pb)
    await app
      .get(MatchParticipantTimeoutProcessor)
      .handleAcceptanceTimeout(fakeJob(job?.data))
    expect({
      timeoutJobsQueued: timeouts.length,
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: await takeJobs()
    }).toMatchSnapshot()
  })

  it('the first picker times out: the turn passes on', async () => {
    const matchId = await pairUp()
    for (const who of ['a', 'b'] as const) {
      const p = await participantOf(matchId, users[who])
      await as(who).put(`/match-participant/${p}`).send({ hasAccepted: true })
    }
    takeEvents()
    const [selection] = await jobsNamed(BullAction.CHECK_POKEMON_SELECTION_TIMEOUT)
    await takeJobs()
    await app
      .get(MatchRoundParticipantTimeoutProcessor)
      .handlePokemonSelectionTimeout(fakeJob(selection?.data))
    expect({
      match: await matchState(matchId),
      events: takeEvents(),
      jobs: await takeJobs()
    }).toMatchSnapshot()
    await endMatch(matchId)
  })

  it('errors', async () => {
    expect({
      acceptBadId: await both((l) =>
        as('a', l).put('/match-participant/abc').send({ hasAccepted: true })
      ),
      acceptMissing: await both((l) =>
        as('a', l).put('/match-participant/99999999').send({ hasAccepted: true })
      ),
      pickBadRound: await both((l) =>
        as('a', l)
          .put('/match-round-participant/choose-pokemon/round/abc')
          .send({ pokemonId: 1 })
      ),
      pickMissingRound: await both((l) =>
        as('a', l)
          .put('/match-round-participant/choose-pokemon/round/99999999')
          .send({ pokemonId: 1 })
      ),
      pickNoBody: await both((l) =>
        as('a', l).put('/match-round-participant/choose-pokemon/round/1').send({})
      ),
      leaveNotQueued: await both((l) => as('a', l).delete('/match-queue/user')),
      queueWithoutLogin: { httpStatus: (await anon().post('/match-queue')).status },
      events: takeEvents()
    }).toMatchSnapshot()
  })
})
