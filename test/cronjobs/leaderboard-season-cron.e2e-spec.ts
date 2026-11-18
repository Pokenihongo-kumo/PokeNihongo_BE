import { AppModule } from '@/app.module'
import { HandleLeaderboardSeasonCronjob } from '@/cronjobs/handle-leaderboard-season.cronjob'
import { UserSeasonHistoryService } from '@/modules/user-season-history/user-season-history.service'
import { UserService } from '@/modules/user/user.service'
import { addDaysUTC0000, todayUTCWith0000 } from '@/shared/helpers'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN } from '../support/test-admin'

// Baseline for the season cronjob (src/cronjobs/handle-leaderboard-season.cronjob.ts)
// before its queries move into repos (tracker, B7). It calls the two cron
// methods directly and reads what they wrote:
//   handleLeaderboardSeasonStatus (01:00 UTC): finalize ended ACTIVE seasons
//     (final elo/rank, rank reward per position, CLAIMED, elo -1000 for every
//     user), precreate the next season from it, mark it EXPIRED, then activate
//     the first eligible PREVIEW season when none is ACTIVE.
//   handlePrecreateNextSeason (02:00 UTC): create the next PREVIEW season of an
//     ACTIVE season close to its end, once.
// Behaviour is recorded as it is, including the odd parts (the next season is
// activated in the same run).
// isRandomItemAgain=true picks rewards at random and is not covered.
//
// Finalizing changes the elo of every user in the test database: each test
// keeps everyone's elo and puts it back. Seasons, users and rewards made here
// are removed after. Needs no other ACTIVE/PREVIEW season in the database.
describe('Leaderboard season cronjob (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let cron: HandleLeaderboardSeasonCronjob
  let histories: UserSeasonHistoryService
  let userService: UserService
  let roleId: number
  let levelId: number
  let seasonIdBefore = 0
  let elosBefore: { id: number; eloscore: number }[] = []
  const languages: number[] = []
  const users: number[] = []
  const rewards: number[] = []
  const tag = `cron-season-${Date.now()}`
  const lang: Record<string, number> = {}

  const today = () => todayUTCWith0000()
  const user = async (name: string, eloscore: number) => {
    const u = await prisma.user.create({
      data: {
        email: `${tag}-${name}@example.test`,
        password: 'x',
        name,
        roleId,
        levelId,
        status: 'ACTIVE',
        eloscore
      }
    })
    users.push(u.id)
    return u
  }
  const reward = async (name: string, rewardItem = 5) => {
    const r = await prisma.reward.create({
      data: {
        nameKey: `reward.${tag}.${name}`,
        rewardType: 'EVENT',
        rewardItem,
        rewardTarget: 'SPARKLES'
      }
    })
    rewards.push(r.id)
    return r
  }
  const season = (
    name: string,
    data: {
      status: 'ACTIVE' | 'PREVIEW'
      startDate: Date
      endDate: Date
      enablePrecreate?: boolean
      precreateBeforeEndDays?: number
    }
  ) => {
    const nameKey = `leaderboardSeason.${tag}.${name}`
    return prisma.leaderboardSeason.create({
      data: {
        nameKey,
        hasOpened: data.status === 'ACTIVE',
        ...data,
        nameTranslations: {
          create: [
            { languageId: lang.vi, key: nameKey, value: `Mùa ${name}` },
            { languageId: lang.en, key: nameKey, value: `Season ${name}` }
          ]
        }
      }
    })
  }
  const seasonsMadeByCron = () =>
    prisma.leaderboardSeason.findMany({
      where: { id: { gt: seasonIdBefore }, nameKey: { not: { contains: tag } } },
      include: {
        nameTranslations: { select: { languageId: true, key: true, value: true } },
        seasonRankRewards: {
          include: { rewards: { select: { id: true } } }
        }
      }
    })
  const rankRewardsOf = (
    rows: { rankName: string; order: number | null; rewards: { id: number }[] }[]
  ) =>
    // by rank name, then order (null last); Postgres sorts the enum as declared
    rows
      .map((r) => ({
        rankName: r.rankName,
        order: r.order,
        rewards: r.rewards.map((x) => x.id)
      }))
      .sort(
        (a, b) =>
          a.rankName.localeCompare(b.rankName) ||
          (a.order ?? Infinity) - (b.order ?? Infinity)
      )
  const eloOf = async (ids: number[]) =>
    Object.fromEntries(
      (
        await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, eloscore: true }
        })
      ).map((u) => [u.id, u.eloscore])
    )

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    cron = app.get(HandleLeaderboardSeasonCronjob)
    histories = app.get(UserSeasonHistoryService)
    userService = app.get(UserService)
    for (const [code, name] of [
      ['vi', 'Tiếng Việt'],
      ['en', 'English']
    ]) {
      const found = await prisma.languages.findUnique({ where: { code } })
      const l = found ?? (await prisma.languages.create({ data: { code, name } }))
      if (!found) languages.push(l.id)
      lang[code] = l.id
    }
    // role and level 1 for the users made here
    await loginAsTestAdmin(app, [])
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email }
    })
    roleId = admin.roleId
    levelId = admin.levelId!
    const others = await prisma.leaderboardSeason.count({
      where: { status: { in: ['ACTIVE', 'PREVIEW'] }, deletedAt: null }
    })
    if (others > 0)
      throw new Error(`Test database has ${others} ACTIVE/PREVIEW season(s)`)
    seasonIdBefore =
      (await prisma.leaderboardSeason.aggregate({ _max: { id: true } }))._max.id ?? 0
  })

  beforeEach(async () => {
    elosBefore = await prisma.user.findMany({ select: { id: true, eloscore: true } })
  })

  afterEach(async () => {
    // histories, rank rewards and name translations go with the season (cascade)
    await prisma.leaderboardSeason.deleteMany({ where: { id: { gt: seasonIdBefore } } })
    for (const u of elosBefore) {
      await prisma.user.updateMany({
        where: { id: u.id, eloscore: { not: u.eloscore } },
        data: { eloscore: u.eloscore }
      })
    }
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.leaderboardSeason.deleteMany({ where: { id: { gt: seasonIdBefore } } })
      await prisma.user.deleteMany({ where: { id: { in: users } } })
      await prisma.reward.deleteMany({ where: { id: { in: rewards } } })
      await prisma.languages.deleteMany({ where: { id: { in: languages } } })
    }
    await app?.close()
  })

  it('finalizes an ended season, precreates and activates the next one', async () => {
    const [gold, silver] = [await reward('gold'), await reward('silver')]
    const n3 = await user('n3', 2500)
    const n4a = await user('n4a', 1500)
    const n4b = await user('n4b', 1200)
    const n5 = await user('n5', 300)
    const outsider = await user('outsider', 1700) // not in the season
    const ended = await season('ended', {
      status: 'ACTIVE',
      startDate: addDaysUTC0000(today(), -30),
      endDate: today(),
      enablePrecreate: true
    })
    const rr = async (
      rankName: 'N3' | 'N4' | 'N5',
      order: number | null,
      ids: number[]
    ) =>
      prisma.seasonRankReward.create({
        data: {
          seasonId: ended.id,
          rankName,
          order,
          ...(ids.length ? { rewards: { connect: ids.map((id) => ({ id })) } } : {})
        }
      })
    const n3First = await rr('N3', 1, [gold.id])
    const n4First = await rr('N4', 1, [gold.id])
    const n4Second = await rr('N4', 2, [])
    await rr('N5', null, [silver.id]) // reward for everyone (order null)
    for (const u of [n3, n4a, n4b, n5]) {
      await prisma.userSeasonHistory.create({
        data: { userId: u.id, seasonId: ended.id }
      })
    }

    await cron.handleLeaderboardSeasonStatus()

    const histories = await prisma.userSeasonHistory.findMany({
      where: { seasonId: ended.id },
      orderBy: { finalElo: 'desc' }
    })
    expect(
      histories.map((h) => ({
        userId: h.userId,
        finalElo: h.finalElo,
        finalRank: h.finalRank,
        seasonRankRewardId: h.seasonRankRewardId,
        rewardsClaimed: h.rewardsClaimed
      }))
    ).toEqual([
      {
        userId: n3.id,
        finalElo: 2500,
        finalRank: 'N3',
        seasonRankRewardId: n3First.id,
        rewardsClaimed: 'CLAIMED'
      },
      {
        userId: n4a.id,
        finalElo: 1500,
        finalRank: 'N4',
        seasonRankRewardId: n4First.id,
        rewardsClaimed: 'CLAIMED'
      },
      {
        userId: n4b.id,
        finalElo: 1200,
        finalRank: 'N4',
        seasonRankRewardId: n4Second.id,
        rewardsClaimed: 'CLAIMED'
      },
      // the order-null reward is not linked to anyone
      {
        userId: n5.id,
        finalElo: 300,
        finalRank: 'N5',
        seasonRankRewardId: null,
        rewardsClaimed: 'CLAIMED'
      }
    ])
    // every user loses 1000 elo (not below 0), participant or not
    expect(await eloOf([n3.id, n4a.id, n4b.id, n5.id, outsider.id])).toEqual({
      [n3.id]: 1500,
      [n4a.id]: 500,
      [n4b.id]: 200,
      [n5.id]: 0,
      [outsider.id]: 700
    })
    const others = elosBefore.filter((u) => !users.includes(u.id))
    const othersNow = await eloOf(others.map((u) => u.id))
    for (const u of others) expect(othersNow[u.id]).toBe(Math.max(0, u.eloscore - 1000))

    expect(
      await prisma.leaderboardSeason.findUniqueOrThrow({ where: { id: ended.id } })
    ).toMatchObject({ status: 'EXPIRED', enablePrecreate: true })

    // the next season starts the day the ended one ends, same length, and is
    // activated in the same run (its start is today)
    const made = await seasonsMadeByCron()
    expect(made).toHaveLength(1)
    const next = made[0]
    expect({
      nameKey: next.nameKey,
      status: next.status,
      hasOpened: next.hasOpened,
      startDate: next.startDate,
      endDate: next.endDate,
      enablePrecreate: next.enablePrecreate,
      precreateBeforeEndDays: next.precreateBeforeEndDays,
      isRandomItemAgain: next.isRandomItemAgain,
      translations: next.nameTranslations.sort((a, b) => a.languageId - b.languageId)
    }).toEqual({
      nameKey: `leaderboardSeason.name.${next.id}`,
      status: 'ACTIVE',
      hasOpened: true,
      startDate: today(),
      endDate: addDaysUTC0000(today(), 30),
      enablePrecreate: true,
      precreateBeforeEndDays: 2,
      isRandomItemAgain: false,
      translations: [
        { languageId: lang.vi, key: next.nameKey, value: 'Mùa ended' },
        { languageId: lang.en, key: next.nameKey, value: 'Season ended' }
      ].sort((a, b) => a.languageId - b.languageId)
    })
    expect(rankRewardsOf(next.seasonRankRewards)).toEqual([
      { rankName: 'N3', order: 1, rewards: [gold.id] },
      { rankName: 'N4', order: 1, rewards: [gold.id] },
      { rankName: 'N4', order: 2, rewards: [] },
      { rankName: 'N5', order: null, rewards: [silver.id] }
    ])

    // a second run the same day changes nothing
    const eloAfterFirst = await eloOf([n3.id, outsider.id])
    await cron.handleLeaderboardSeasonStatus()
    expect(await seasonsMadeByCron()).toHaveLength(1)
    expect(await eloOf([n3.id, outsider.id])).toEqual(eloAfterFirst)
  })

  it('an ended season without participants: expired, elo reset all the same, no next season', async () => {
    const someone = await user('idle', 1700)
    const ended = await season('empty', {
      status: 'ACTIVE',
      startDate: addDaysUTC0000(today(), -10),
      endDate: addDaysUTC0000(today(), -1),
      enablePrecreate: false
    })
    const waiting = await season('waiting', {
      status: 'PREVIEW',
      startDate: addDaysUTC0000(today(), -1),
      endDate: addDaysUTC0000(today(), 10)
    })
    const later = await season('later', {
      status: 'PREVIEW',
      startDate: addDaysUTC0000(today(), 5),
      endDate: addDaysUTC0000(today(), 20)
    })

    await cron.handleLeaderboardSeasonStatus()

    const status = Object.fromEntries(
      (
        await prisma.leaderboardSeason.findMany({
          where: { id: { in: [ended.id, waiting.id, later.id] } },
          select: { id: true, status: true, hasOpened: true }
        })
      ).map((s) => [s.id, { status: s.status, hasOpened: s.hasOpened }])
    )
    expect(status).toEqual({
      [ended.id]: { status: 'EXPIRED', hasOpened: true },
      [waiting.id]: { status: 'ACTIVE', hasOpened: true },
      [later.id]: { status: 'PREVIEW', hasOpened: false }
    })
    // fix: elo is reset at every season end, with or without participants
    expect(await eloOf([someone.id])).toEqual({ [someone.id]: 700 })
    expect(await seasonsMadeByCron()).toHaveLength(0)
  })

  it('does not activate a PREVIEW season while one is ACTIVE', async () => {
    const running = await season('running', {
      status: 'ACTIVE',
      startDate: addDaysUTC0000(today(), -3),
      endDate: addDaysUTC0000(today(), 20)
    })
    const waiting = await season('queued', {
      status: 'PREVIEW',
      startDate: addDaysUTC0000(today(), -1),
      endDate: addDaysUTC0000(today(), 10)
    })

    await cron.handleLeaderboardSeasonStatus()

    const rows = await prisma.leaderboardSeason.findMany({
      where: { id: { in: [running.id, waiting.id] } },
      orderBy: { id: 'asc' },
      select: { status: true }
    })
    expect(rows.map((r) => r.status)).toEqual(['ACTIVE', 'PREVIEW'])
  })

  it('precreates the next season once, close to the end of the active one', async () => {
    const prize = await reward('prize')
    const running = await season('closing', {
      status: 'ACTIVE',
      startDate: addDaysUTC0000(today(), -13),
      endDate: addDaysUTC0000(today(), 1),
      enablePrecreate: true,
      precreateBeforeEndDays: 2
    })
    await prisma.seasonRankReward.create({
      data: {
        seasonId: running.id,
        rankName: 'N5',
        order: 1,
        rewards: { connect: [{ id: prize.id }] }
      }
    })
    // not yet in its precreate window: skipped
    const early = await season('early', {
      status: 'ACTIVE',
      startDate: addDaysUTC0000(today(), -1),
      endDate: addDaysUTC0000(today(), 10),
      enablePrecreate: true,
      precreateBeforeEndDays: 2
    })

    await cron.handlePrecreateNextSeason()

    const made = await seasonsMadeByCron()
    expect(made).toHaveLength(1)
    const next = made[0]
    expect({
      nameKey: next.nameKey,
      status: next.status,
      hasOpened: next.hasOpened,
      startDate: next.startDate,
      endDate: next.endDate,
      enablePrecreate: next.enablePrecreate,
      precreateBeforeEndDays: next.precreateBeforeEndDays,
      translations: next.nameTranslations.map((t) => t.value).sort(),
      rankRewards: rankRewardsOf(next.seasonRankRewards)
    }).toEqual({
      nameKey: `leaderboardSeason.name.${next.id}`,
      status: 'PREVIEW',
      hasOpened: false,
      startDate: running.endDate,
      endDate: addDaysUTC0000(running.endDate, 14),
      enablePrecreate: true,
      precreateBeforeEndDays: 2,
      translations: ['Mùa closing', 'Season closing'],
      rankRewards: [{ rankName: 'N5', order: 1, rewards: [prize.id] }]
    })
    // the source season stops precreating; the early one is untouched
    const sources = await prisma.leaderboardSeason.findMany({
      where: { id: { in: [running.id, early.id] } },
      orderBy: { id: 'asc' },
      select: { enablePrecreate: true, precreateBeforeEndDays: true }
    })
    expect(sources).toEqual([
      { enablePrecreate: false, precreateBeforeEndDays: 999 },
      { enablePrecreate: true, precreateBeforeEndDays: 2 }
    ])

    await cron.handlePrecreateNextSeason()
    expect(await seasonsMadeByCron()).toHaveLength(1)
  })

  it('claim after finalize: rank reward plus the season reward for everyone', async () => {
    const [rank, common] = [await reward('rank', 7), await reward('common', 3)]
    const first = await user('first', 500)
    const second = await user('second', 400) // N5 #2: no rank reward
    for (const u of [first, second]) {
      await prisma.wallet.create({ data: { userId: u.id, type: 'SPARKLES' } })
    }
    const ended = await season('claim', {
      status: 'ACTIVE',
      startDate: addDaysUTC0000(today(), -7),
      endDate: today()
    })
    await prisma.seasonRankReward.create({
      data: {
        seasonId: ended.id,
        rankName: 'N5',
        order: 1,
        rewards: { connect: [{ id: rank.id }] }
      }
    })
    // order null: for everyone in the season, whatever the rank
    await prisma.seasonRankReward.create({
      data: {
        seasonId: ended.id,
        rankName: 'N4',
        order: null,
        rewards: { connect: [{ id: common.id }] }
      }
    })
    for (const u of [first, second]) {
      await prisma.userSeasonHistory.create({
        data: { userId: u.id, seasonId: ended.id }
      })
    }

    // the season that follows (the season-ended screen needs one running)
    await season('after-claim', {
      status: 'PREVIEW',
      startDate: today(),
      endDate: addDaysUTC0000(today(), 7)
    })

    await cron.handleLeaderboardSeasonStatus()

    // GET /user/stats/season (mobile season-ended screen): it claims only when
    // the list is not empty, so it shows what claiming gives
    const shown = async (userId: number) => {
      const res = await userService.getInfoBattleWithUser(userId, 'vi')
      const data = res.data as {
        hasUnclaimedReward?: boolean
        rewards?: { id: number }[]
      }
      return {
        hasUnclaimedReward: data?.hasUnclaimedReward,
        rewards: data?.rewards?.map((r) => r.id)
      }
    }
    expect({ first: await shown(first.id), second: await shown(second.id) }).toEqual({
      first: { hasUnclaimedReward: true, rewards: [rank.id, common.id] },
      // fix: a player with only the season reward for everyone used to get no data
      second: { hasUnclaimedReward: true, rewards: [common.id] }
    })

    const historyOf = (userId: number) =>
      prisma.userSeasonHistory.findUniqueOrThrow({
        where: { userId_seasonId: { userId, seasonId: ended.id } }
      })
    const sparkles = async (userId: number) =>
      (
        await prisma.wallet.findUniqueOrThrow({
          where: { userId_type: { userId, type: 'SPARKLES' } }
        })
      ).balance
    for (const u of [first, second]) {
      const h = await historyOf(u.id)
      await histories.getReward({ id: h.id, userId: u.id })
      expect((await historyOf(u.id)).rewardsClaimed).toBe('COMPLETED')
    }
    // fix: the season reward for everyone used to be lost (second could not claim at all)
    expect({
      first: await sparkles(first.id),
      second: await sparkles(second.id)
    }).toEqual({
      first: 10,
      second: 3
    })
    const rewarded = await prisma.userRewardHistory.findMany({
      where: { userId: { in: [first.id, second.id] } },
      select: { userId: true, rewardId: true },
      orderBy: [{ userId: 'asc' }, { rewardId: 'asc' }]
    })
    expect(rewarded).toEqual([
      { userId: first.id, rewardId: rank.id },
      { userId: first.id, rewardId: common.id },
      { userId: second.id, rewardId: common.id }
    ])
  })
})
