import { AppModule } from '@/app.module'
import { walletType } from '@/common/constants/wallet.constant'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// POST /gacha-purchase (mobile gacha screen, rollCount 1 or 10), batch 6c.
// - A Pokemon is owned once: rolling the same new Pokemon twice in one
//   purchase gave several copies (ownership was read once, before adding).
// - Pity counts every roll: two purchases at once read the same pity before
//   their transaction and the later one overwrote the count.
// - rollCount is a whole number from 1 to 10 (1.5 or 1000000 were taken).
// A banner whose only item is one Pokemon (every roll gives it) is made here.
describe('Gacha purchase (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let walletId: number
  let originalSparkles: number | null = null
  const stamp = Date.now()
  const created = {
    pokemons: [] as number[],
    banners: [] as number[],
    rates: [] as number[]
  }
  const COST = 10

  const http = () =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .auth(token, { type: 'bearer' })
  const roll = (bannerId: number, rollCount: number) =>
    http().post('/gacha-purchase').send({ bannerId, rollCount })
  const setSparkles = (balance: number) =>
    prisma.wallet.update({ where: { id: walletId }, data: { balance } })
  const copies = (pokemonId: number) =>
    prisma.userPokemon.count({ where: { userId, pokemonId, deletedAt: null } })
  const pendingPity = async () => {
    const rows = await prisma.userGachaPity.findMany({
      where: { userId, status: 'PENDING', deletedAt: null }
    })
    return { rows: rows.length, count: rows[0]?.pityCount }
  }
  // An active banner with a single 1★ Pokemon: every roll gives it
  const singlePokemonBanner = async (n: number) => {
    const pokemon = await prisma.pokemon.create({
      data: {
        pokedex_number: 95000 + n,
        nameJp: `ガチャ${stamp}${n}`,
        nameTranslations: { vi: `Gacha ${n}`, en: `Gacha ${n}`, ja: `ガチャ${n}` }
      }
    })
    created.pokemons.push(pokemon.id)
    const rate = await prisma.gachaItemRate.create({
      data: { starType: 'ONE', rate: 100 }
    })
    created.rates.push(rate.id)
    const banner = await prisma.gachaBanner.create({
      data: {
        nameKey: `gacha_banner.test${stamp}${n}.name`,
        status: 'ACTIVE',
        costRoll: COST,
        items: { create: { pokemonId: pokemon.id, gachaItemRateId: rate.id } }
      }
    })
    created.banners.push(banner.id)
    return { bannerId: banner.id, pokemonId: pokemon.id }
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    token = await loginAsTestAdmin(app, [{ method: 'POST', path: '/gacha-purchase' }])
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    const wallet = await prisma.wallet.findUnique({
      where: { userId_type: { userId, type: walletType.SPARKLES } }
    })
    originalSparkles = wallet?.balance ?? null
    walletId = (
      wallet ??
      (await prisma.wallet.create({ data: { userId, type: walletType.SPARKLES } }))
    ).id
  })

  beforeEach(async () => {
    // each case starts with no pity of the test user
    await prisma.userGachaPity.deleteMany({ where: { userId } })
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.gachaRollHistory.deleteMany({
        where: { bannerId: { in: created.banners } }
      })
      await prisma.gachaPurchase.deleteMany({
        where: { bannerId: { in: created.banners } }
      })
      await prisma.walletTransaction.deleteMany({
        where: { userId, purpose: 'GACHA', createdAt: { gte: new Date(stamp) } }
      })
      await prisma.userGachaPity.deleteMany({ where: { userId } })
      await prisma.userPokemon.deleteMany({
        where: { pokemonId: { in: created.pokemons } }
      })
      await prisma.gachaItem.deleteMany({ where: { bannerId: { in: created.banners } } })
      await prisma.gachaBanner.deleteMany({ where: { id: { in: created.banners } } })
      await prisma.gachaItemRate.deleteMany({ where: { id: { in: created.rates } } })
      await prisma.pokemon.deleteMany({ where: { id: { in: created.pokemons } } })
      if (originalSparkles === null)
        await prisma.wallet.delete({ where: { id: walletId } })
      else await setSparkles(originalSparkles)
    }
    await app?.close()
  })

  it('ten rolls of one new Pokemon: one copy, nine duplicates turned into sparkles', async () => {
    const { bannerId, pokemonId } = await singlePokemonBanner(1)
    await setSparkles(COST * 10)
    const res = await roll(bannerId, 10)
    expect(res.status).toBe(201)
    expect(await copies(pokemonId)).toBe(1)
    const duplicates = (res.body.data as { isDuplicate: boolean }[]).filter(
      (item) => item.isDuplicate
    )
    expect(duplicates).toHaveLength(9)
  })

  it('two purchases at once: pity counts both rolls, one pity row', async () => {
    const { bannerId } = await singlePokemonBanner(2)
    await setSparkles(COST * 2)
    const statuses = (await Promise.all([roll(bannerId, 1), roll(bannerId, 1)])).map(
      (r) => r.status
    )
    expect(statuses).toEqual([201, 201])
    expect(await pendingPity()).toEqual({ rows: 1, count: 2 })
  })

  it('rollCount must be a whole number from 1 to 10', async () => {
    const { bannerId } = await singlePokemonBanner(3)
    await setSparkles(COST * 1000)
    const statuses = await Promise.all(
      [1.5, 0, 11, 1000].map(
        async (rollCount) => (await roll(bannerId, rollCount)).status
      )
    )
    expect(statuses).toEqual([422, 422, 422, 422])
  })
})
