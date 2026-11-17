import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batches 6c/6d baseline (needed before module-boundary B4):
// - web admin gacha screens (src/services/gacha): banner list, create,
//   detail, update, Pokemon to choose from, items (create list, update list,
//   delete);
// - mobile subscription screen (src/services/subscription): marketplace,
//   my subscriptions, my features.
// A banner, two Pokemon and missing gacha rates are made here and removed
// after. Errors in vi and en.
describe('Economy batches 6c/6d admin contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  const stamp = Date.now()
  const languages: number[] = []
  const created = {
    pokemons: [] as number[],
    banners: [] as number[],
    rates: [] as number[]
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
  const bannerBody = (vi: string, en: string) => ({
    startDate: '2031-03-01T00:00:00.000Z',
    endDate: '2031-03-08T00:00:00.000Z',
    status: 'PREVIEW',
    hardPity5Star: 90,
    enablePrecreate: false,
    precreateBeforeEndDays: 2,
    isRandomItemAgain: false,
    costRoll: 100,
    amount5Star: 1,
    amount4Star: 3,
    amount3Star: 6,
    amount2Star: 8,
    amount1Star: 10,
    nameTranslations: [
      { key: 'vi', value: vi },
      { key: 'en', value: en }
    ]
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
      { method: 'GET', path: '/gacha-banner' },
      { method: 'GET', path: '/gacha-banner/:gachaBannerId' },
      { method: 'POST', path: '/gacha-banner' },
      { method: 'PUT', path: '/gacha-banner/:gachaBannerId' },
      { method: 'GET', path: '/gacha-item/prepare-pokemons/:gachaBannerId' },
      { method: 'POST', path: '/gacha-item/list' },
      { method: 'PUT', path: '/gacha-item/list' },
      { method: 'DELETE', path: '/gacha-item/:gachaItemId' },
      { method: 'GET', path: '/subscription/marketplace/list' },
      { method: 'GET', path: '/user-subscription/user' },
      { method: 'GET', path: '/user-subscription/user/features' }
    ])
    for (const n of [1, 2]) {
      created.pokemons.push(
        (
          await prisma.pokemon.create({
            data: {
              pokedex_number: 97000 + n,
              nameJp: `ガチャ管理${stamp}${n}`,
              nameTranslations: { vi: `Gacha ${n}`, en: `Gacha ${n}`, ja: `ガチャ${n}` }
            }
          })
        ).id
      )
    }
    for (const [starType, rate] of [
      ['ONE', 50],
      ['TWO', 30],
      ['THREE', 14],
      ['FOUR', 5.7],
      ['FIVE', 0.3]
    ] as const) {
      if (
        await prisma.gachaItemRate.findFirst({ where: { starType, deletedAt: null } })
      ) {
        continue
      }
      created.rates.push(
        (await prisma.gachaItemRate.create({ data: { starType, rate } })).id
      )
    }
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.gachaItem.deleteMany({ where: { bannerId: { in: created.banners } } })
      const banners = await prisma.gachaBanner.findMany({
        where: { id: { in: created.banners } },
        select: { nameKey: true }
      })
      await prisma.translation.deleteMany({
        where: { key: { in: banners.map((b) => b.nameKey) } }
      })
      await prisma.gachaBanner.deleteMany({ where: { id: { in: created.banners } } })
      await prisma.gachaItemRate.deleteMany({ where: { id: { in: created.rates } } })
      await prisma.pokemon.deleteMany({ where: { id: { in: created.pokemons } } })
      await prisma.languages.deleteMany({ where: { id: { in: languages } } })
    }
    await app?.close()
  })

  it('web: gacha banner create, list, detail, update, Pokemon to choose, items', async () => {
    const createdBanner = await http()
      .post('/gacha-banner')
      .send(bannerBody(`Gacha quản lý ${stamp}`, `Gacha admin ${stamp}`))
    const bannerId: number = createdBanner.body.data?.id ?? 0
    if (bannerId) created.banners.push(bannerId)
    const [first, second] = created.pokemons

    const items = await http()
      .post('/gacha-item/list')
      .send({ bannerId, items: [{ starType: 'ONE', pokemons: [first] }] })
    const itemsUpdated = await http()
      .put('/gacha-item/list')
      .send({ bannerId, items: [{ starType: 'ONE', pokemons: [first, second] }] })
    const itemId =
      (await prisma.gachaItem.findFirst({ where: { bannerId }, orderBy: { id: 'asc' } }))
        ?.id ?? 0

    expect({
      createdBanner: capture(createdBanner),
      list: capture(
        await http().get('/gacha-banner').query({ currentPage: 1, pageSize: 5 })
      ),
      detail: capture(await http().get(`/gacha-banner/${bannerId}`)),
      updated: capture(
        await http().put(`/gacha-banner/${bannerId}`).send({ costRoll: 120 })
      ),
      preparePokemons: capture(
        await http()
          .get(`/gacha-item/prepare-pokemons/${bannerId}`)
          .query({ currentPage: 1, pageSize: 5 })
      ),
      items: capture(items),
      itemsUpdated: capture(itemsUpdated),
      itemDeleted: capture(await http().delete(`/gacha-item/${itemId}`))
    }).toMatchSnapshot()
  })

  it('mobile: subscription marketplace, my subscriptions, my features', async () => {
    expect({
      marketplace: capture(await http().get('/subscription/marketplace/list')),
      mine: capture(
        await http().get('/user-subscription/user').query({ currentPage: 1, pageSize: 5 })
      ),
      myFeatures: capture(await http().get('/user-subscription/user/features'))
    }).toMatchSnapshot()
  })

  it('errors', async () => {
    expect({
      bannerBadId: await both((l) => http(l).get('/gacha-banner/abc')),
      bannerMissing: await both((l) => http(l).get('/gacha-banner/99999999')),
      bannerCreateEmpty: await both((l) => http(l).post('/gacha-banner').send({})),
      prepareBadId: await both((l) => http(l).get('/gacha-item/prepare-pokemons/abc')),
      itemsMissingBanner: await both((l) =>
        http(l)
          .post('/gacha-item/list')
          .send({ bannerId: 99999999, items: [{ starType: 'ONE', pokemons: [1] }] })
      ),
      itemMissing: await both((l) => http(l).delete('/gacha-item/99999999')),
      mineBadPage: await both((l) =>
        http(l).get('/user-subscription/user').query({ currentPage: 'abc' })
      )
    }).toMatchSnapshot()
  })
})
