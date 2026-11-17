import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 6b admin baseline (needed before module-boundary B4): the web
// admin's shop screens (src/services/shop, shopRarityPrice): banner list,
// create, detail, update, the banner's Pokemon list, items (create list,
// random, update, delete) and rarity prices. Two Pokemon, a banner and its
// items are made here and removed after. Errors in vi and en.
describe('Economy batch 6b admin contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  const stamp = Date.now()
  const languages: number[] = []
  const created = {
    pokemons: [] as number[],
    banners: [] as number[],
    rarityPrice: 0,
    rarityPriceBefore: null as number | null
  }

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
      { method: 'GET', path: '/shop-banner' },
      { method: 'GET', path: '/shop-banner/:shopBannerId' },
      { method: 'GET', path: '/shop-banner/all-pokemon/:shopBannerId' },
      { method: 'POST', path: '/shop-banner' },
      { method: 'PUT', path: '/shop-banner/:shopBannerId' },
      { method: 'GET', path: '/shop-item/random' },
      { method: 'POST', path: '/shop-item/list' },
      { method: 'PUT', path: '/shop-item/:shopItemId' },
      { method: 'DELETE', path: '/shop-item/:shopItemId' },
      { method: 'GET', path: '/shop-rarity-price' },
      { method: 'PUT', path: '/shop-rarity-price/:shopRarityPriceId' }
    ])
    for (const n of [1, 2]) {
      created.pokemons.push(
        (
          await prisma.pokemon.create({
            data: {
              pokedex_number: 96000 + n,
              nameJp: `ショップ${stamp}${n}`,
              nameTranslations: { vi: `Shop ${n}`, en: `Shop ${n}`, ja: `ショップ${n}` }
            }
          })
        ).id
      )
    }
    const rarity =
      (await prisma.shopRarityPrice.findFirst({
        where: { rarity: 'COMMON', deletedAt: null }
      })) ??
      (await prisma.shopRarityPrice.create({ data: { rarity: 'COMMON', price: 100 } }))
    created.rarityPrice = rarity.id
    created.rarityPriceBefore = rarity.price
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.shopItem.deleteMany({
        where: { shopBannerId: { in: created.banners } }
      })
      await prisma.shopItem.deleteMany({ where: { pokemonId: { in: created.pokemons } } })
      const banners = await prisma.shopBanner.findMany({
        where: { id: { in: created.banners } },
        select: { nameKey: true }
      })
      await prisma.translation.deleteMany({
        where: { key: { in: banners.map((b) => b.nameKey) } }
      })
      await prisma.shopBanner.deleteMany({ where: { id: { in: created.banners } } })
      await prisma.pokemon.deleteMany({ where: { id: { in: created.pokemons } } })
      if (created.rarityPriceBefore !== null) {
        await prisma.shopRarityPrice.update({
          where: { id: created.rarityPrice },
          data: { price: created.rarityPriceBefore }
        })
      }
      await prisma.languages.deleteMany({ where: { id: { in: languages } } })
    }
    await app?.close()
  })

  it('web: banner create, list, detail, update, its Pokemon; items; rarity prices', async () => {
    const createdBanner = await http()
      .post('/shop-banner')
      .send({
        startDate: '2031-01-01T00:00:00.000Z',
        endDate: '2031-01-08T00:00:00.000Z',
        min: 4,
        max: 8,
        status: 'PREVIEW',
        enablePrecreate: false,
        precreateBeforeEndDays: 2,
        isRandomItemAgain: false,
        nameTranslations: [
          { key: 'vi', value: `Cửa hàng 6b ${stamp}` },
          { key: 'en', value: `Contract 6b shop ${stamp}` }
        ]
      })
    const bannerId: number = createdBanner.body.data?.id ?? 0
    if (bannerId) created.banners.push(bannerId)

    const items = await http()
      .post('/shop-item/list')
      .send({
        items: created.pokemons.map((pokemonId) => ({
          shopBannerId: bannerId,
          pokemonId,
          price: 100,
          purchaseLimit: 1,
          isActive: true
        }))
      })
    const itemId: number =
      (
        await prisma.shopItem.findFirst({
          where: { shopBannerId: bannerId, pokemonId: created.pokemons[0] }
        })
      )?.id ?? 0

    expect({
      createdBanner: capture(createdBanner),
      list: capture(
        await http()
          .get('/shop-banner')
          .query({ currentPage: 1, pageSize: 5, qs: 'status:in=PREVIEW|ACTIVE' })
      ),
      detail: capture(await http().get(`/shop-banner/${bannerId}`)),
      updated: capture(
        await http()
          .put(`/shop-banner/${bannerId}`)
          .send({
            max: 7,
            nameTranslations: [
              { key: 'vi', value: `Cửa hàng 6b ${stamp} 2` },
              { key: 'en', value: `Contract 6b shop ${stamp} 2` }
            ]
          })
      ),
      bannerPokemon: capture(
        await http()
          .get(`/shop-banner/all-pokemon/${bannerId}`)
          .query({ currentPage: 1, pageSize: 5 })
      ),
      items: capture(items),
      random: capture(
        await http().get('/shop-item/random').query({ shopBannerId: bannerId, amount: 1 })
      ),
      itemUpdated: capture(await http().put(`/shop-item/${itemId}`).send({ price: 150 })),
      itemDeleted: capture(await http().delete(`/shop-item/${itemId}`)),
      rarityPrices: capture(await http().get('/shop-rarity-price')),
      rarityPriceUpdated: capture(
        await http()
          .put(`/shop-rarity-price/${created.rarityPrice}`)
          .send({ rarity: 'COMMON', price: 120, isChangeAllShopPreview: false })
      )
    }).toMatchSnapshot()
  })

  it('errors', async () => {
    expect({
      bannerBadId: await both((l) => http(l).get('/shop-banner/abc')),
      bannerMissing: await both((l) => http(l).get('/shop-banner/99999999')),
      bannerCreateEmpty: await both((l) => http(l).post('/shop-banner').send({})),
      bannerCreateMinOverMax: await both((l) =>
        http(l)
          .post('/shop-banner')
          .send({
            startDate: '2031-02-01T00:00:00.000Z',
            endDate: '2031-02-08T00:00:00.000Z',
            min: 8,
            max: 4,
            status: 'PREVIEW',
            enablePrecreate: false,
            precreateBeforeEndDays: 2,
            isRandomItemAgain: false,
            nameTranslations: [
              { key: 'vi', value: `Sai 6b ${stamp}` },
              { key: 'en', value: `Contract 6b bad ${stamp}` }
            ]
          })
      ),
      itemMissing: await both((l) =>
        http(l).put('/shop-item/99999999').send({ price: 1 })
      ),
      itemBadId: await both((l) => http(l).delete('/shop-item/abc')),
      randomNoParams: await both((l) => http(l).get('/shop-item/random')),
      rarityPriceMissing: await both((l) =>
        http(l)
          .put('/shop-rarity-price/99999999')
          .send({ rarity: 'COMMON', price: 1, isChangeAllShopPreview: false })
      )
    }).toMatchSnapshot()
  })
})
