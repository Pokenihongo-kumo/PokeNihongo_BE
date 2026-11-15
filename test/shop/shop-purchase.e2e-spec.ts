import { AppModule } from '@/app.module'
import { walletType } from '@/common/constants/wallet.constant'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// POST /shop-purchase (mobile shop, src/services/shop-purchase), batch 6b.
// A user owns a Pokemon once, and pays for it once. "Already owned" is also
// checked before the purchase transaction, but inside it the conditional
// wallet debit (A1 T7) locks the wallet row, so one user's purchases run one
// after another and the later one finds the Pokemon owned and rolls back,
// wallet included. Regression test for that. A Pokemon, banner and item are
// made here and removed after.
describe('Shop purchase (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let walletId: number
  let originalSparkles: number | null = null
  const stamp = Date.now()
  const created = { pokemons: [] as number[], banner: 0, items: [] as number[] }
  const PRICE = 100

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  const buy = (shopItemId: number) =>
    http().post('/shop-purchase').send({ shopItemId, quantity: 1 })
  const sparkles = async () =>
    (await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } })).balance
  const setSparkles = (balance: number) =>
    prisma.wallet.update({ where: { id: walletId }, data: { balance } })
  const owned = (pokemonId: number) =>
    prisma.userPokemon.count({ where: { userId, pokemonId, deletedAt: null } })
  // A Pokemon on sale in the active banner
  const itemOnSale = async (n: number) => {
    const pokemon = await prisma.pokemon.create({
      data: {
        pokedex_number: 90000 + n,
        nameJp: `テスト${stamp}${n}`,
        nameTranslations: { vi: `Test ${n}`, en: `Test ${n}`, ja: `テスト${n}` }
      }
    })
    created.pokemons.push(pokemon.id)
    const item = await prisma.shopItem.create({
      data: { shopBannerId: created.banner, pokemonId: pokemon.id, price: PRICE }
    })
    created.items.push(item.id)
    return { pokemonId: pokemon.id, shopItemId: item.id }
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    token = await loginAsTestAdmin(app, [{ method: 'POST', path: '/shop-purchase' }])
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
    created.banner = (
      await prisma.shopBanner.create({
        data: { nameKey: `shop_banner.test${stamp}.name`, status: 'ACTIVE' }
      })
    ).id
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.walletTransaction.deleteMany({
        where: {
          userId,
          source: 'SHOP_PURCHASE',
          amount: PRICE,
          createdAt: { gte: new Date(stamp) }
        }
      })
      await prisma.shopPurchase.deleteMany({
        where: { shopItemId: { in: created.items } }
      })
      await prisma.userPokemon.deleteMany({
        where: { pokemonId: { in: created.pokemons } }
      })
      await prisma.shopItem.deleteMany({ where: { id: { in: created.items } } })
      await prisma.shopBanner.deleteMany({ where: { id: created.banner } })
      await prisma.pokemon.deleteMany({ where: { id: { in: created.pokemons } } })
      if (originalSparkles === null)
        await prisma.wallet.delete({ where: { id: walletId } })
      else await setSparkles(originalSparkles)
    }
    await app?.close()
  })

  it('buys a Pokemon once; buying it again is refused', async () => {
    const { pokemonId, shopItemId } = await itemOnSale(1)
    await setSparkles(PRICE * 3)
    const first = await buy(shopItemId)
    const again = await buy(shopItemId)
    expect({
      first: { httpStatus: first.status, body: responseShape(first.body) },
      again: { httpStatus: again.status, message: again.body.message }
    }).toMatchSnapshot()
    expect(await owned(pokemonId)).toBe(1)
    expect(await sparkles()).toBe(PRICE * 2)
  })

  it('five purchases of one Pokemon at once: one copy, charged once', async () => {
    const { pokemonId, shopItemId } = await itemOnSale(2)
    await setSparkles(PRICE * 5)
    const statuses = (
      await Promise.all(Array.from({ length: 5 }, () => buy(shopItemId)))
    ).map((res) => res.status)
    expect(statuses.filter((s) => s === 201)).toHaveLength(1)
    expect(await owned(pokemonId)).toBe(1)
    expect(await sparkles()).toBe(PRICE * 4)
  })
})
