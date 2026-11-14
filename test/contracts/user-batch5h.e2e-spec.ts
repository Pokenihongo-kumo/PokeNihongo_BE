import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 5h baseline: ai-conversation-room, user-ai-conversation. The
// mobile app lists its kaiwa rooms and deletes one (src/services/conversation);
// the websocket gateway writes rooms and messages through the services. The
// REST routes are called here as they stand: create, list, detail, update,
// delete, and the same on a room and a message of another user (made here
// with a throwaway user, which is removed after). No AI call. Errors in vi/en.
describe('User batch 5h contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let otherUserId = 0
  const stamp = Date.now()
  const mine = `contract-5h-mine-${stamp}`
  const theirs = `contract-5h-theirs-${stamp}`
  let theirRoomId = ''
  let theirMessageId = 0
  const languages: number[] = []

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
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
      { method: 'POST', path: '/ai-conversation-room' },
      { method: 'GET', path: '/ai-conversation-room' },
      { method: 'GET', path: '/ai-conversation-room/conversation/:conversationId' },
      { method: 'GET', path: '/ai-conversation-room/:id' },
      { method: 'PATCH', path: '/ai-conversation-room/:id' },
      { method: 'DELETE', path: '/ai-conversation-room/:id' },
      { method: 'POST', path: '/user-ai-conversation' },
      { method: 'GET', path: '/user-ai-conversation' },
      { method: 'GET', path: '/user-ai-conversation/conversation/:conversationId' },
      { method: 'GET', path: '/user-ai-conversation/:id' },
      { method: 'PATCH', path: '/user-ai-conversation/:id' },
      { method: 'DELETE', path: '/user-ai-conversation/:id' },
      { method: 'DELETE', path: '/user-ai-conversation/conversation/:conversationId' }
    ])
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email }
    })
    userId = admin.id
    otherUserId = (
      await prisma.user.create({
        data: {
          email: `contract-5h-${stamp}@example.test`,
          name: 'Contract 5h other',
          password: 'not-a-login',
          roleId: admin.roleId
        }
      })
    ).id
    theirRoomId = (
      await prisma.aIConversationRoom.create({
        data: { userId: otherUserId, conversationId: theirs }
      })
    ).id
    theirMessageId = (
      await prisma.userAIConversation.create({
        data: { userId: otherUserId, conversationId: theirs, role: 'USER', message: 'x' }
      })
    ).id
  })

  // Rooms and messages of the other user cascade from it
  afterAll(async () => {
    if (prisma) {
      await prisma.aIConversationRoom.deleteMany({ where: { conversationId: mine } })
      await prisma.userAIConversation.deleteMany({ where: { conversationId: mine } })
      if (otherUserId) await prisma.user.deleteMany({ where: { id: otherUserId } })
      await prisma.languages.deleteMany({ where: { id: { in: languages } } })
    }
    await app?.close()
  })

  it('rooms: create, list (as the app asks), by conversation, detail, update, delete', async () => {
    const create = await http()
      .post('/ai-conversation-room')
      .send({ conversationId: mine, title: 'contract 5h' })
    const roomId: string =
      create.body.data?.id ??
      (
        await prisma.aIConversationRoom.findUniqueOrThrow({
          where: { conversationId: mine }
        })
      ).id
    expect({
      create: capture(create),
      list: capture(
        await http()
          .get('/ai-conversation-room')
          .query({ currentPage: '1', pageSize: '10' })
      ),
      byConversation: capture(
        await http().get(`/ai-conversation-room/conversation/${mine}`)
      ),
      detail: capture(await http().get(`/ai-conversation-room/${roomId}`)),
      update: capture(
        await http().patch(`/ai-conversation-room/${roomId}`).send({ title: 'renamed' })
      ),
      remove: capture(await http().delete(`/ai-conversation-room/${roomId}`))
    }).toMatchSnapshot()
  })

  it('messages: create, list, by conversation, detail, update, delete, delete all', async () => {
    const create = await http()
      .post('/user-ai-conversation')
      .send({ userId, conversationId: mine, role: 'USER', message: 'こんにちは' })
    const id: number =
      create.body.data?.id ??
      (
        await prisma.userAIConversation.findFirstOrThrow({
          where: { conversationId: mine },
          orderBy: { id: 'desc' }
        })
      ).id
    expect({
      create: capture(create),
      list: capture(
        await http()
          .get('/user-ai-conversation')
          .query({ currentPage: '1', pageSize: '10', conversationId: mine })
      ),
      byConversation: capture(
        await http().get(`/user-ai-conversation/conversation/${mine}`)
      ),
      detail: capture(await http().get(`/user-ai-conversation/${id}`)),
      update: capture(
        await http().patch(`/user-ai-conversation/${id}`).send({ message: 'こんばんは' })
      ),
      remove: capture(await http().delete(`/user-ai-conversation/${id}`)),
      removeAll: capture(
        await http().delete(`/user-ai-conversation/conversation/${mine}`)
      )
    }).toMatchSnapshot()
  })

  it("another user's room and message", async () => {
    expect({
      roomDetail: capture(await http().get(`/ai-conversation-room/${theirRoomId}`)),
      roomUpdate: capture(
        await http()
          .patch(`/ai-conversation-room/${theirRoomId}`)
          .send({ title: 'mine now' })
      ),
      messageDetail: capture(await http().get(`/user-ai-conversation/${theirMessageId}`)),
      messageUpdate: capture(
        await http()
          .patch(`/user-ai-conversation/${theirMessageId}`)
          .send({ message: 'y' })
      )
    }).toMatchSnapshot()
    // Put back what the calls above may have changed
    await prisma.aIConversationRoom.update({
      where: { id: theirRoomId },
      data: { title: null }
    })
    await prisma.userAIConversation.update({
      where: { id: theirMessageId },
      data: { message: 'x' }
    })
  })

  it('errors', async () => {
    expect({
      roomMissing: await both((l) => http(l).get('/ai-conversation-room/missing-room')),
      roomCreateInvalid: await both((l) =>
        http(l).post('/ai-conversation-room').send({})
      ),
      roomListBadPage: await both((l) =>
        http(l).get('/ai-conversation-room').query({ currentPage: 'abc' })
      ),
      roomDeleteMissing: await both((l) =>
        http(l).delete('/ai-conversation-room/missing-room')
      ),
      messageMissing: await both((l) => http(l).get('/user-ai-conversation/999999')),
      messageInvalidId: await both((l) => http(l).get('/user-ai-conversation/abc')),
      messageCreateNoUserId: await both((l) =>
        http(l)
          .post('/user-ai-conversation')
          .send({ conversationId: mine, role: 'USER', message: 'x' })
      ),
      messageCreateBadRole: await both((l) =>
        http(l)
          .post('/user-ai-conversation')
          .send({ userId, conversationId: mine, role: 'BOT', message: 'x' })
      ),
      messageDeleteMissing: await both((l) =>
        http(l).delete('/user-ai-conversation/999999')
      )
    }).toMatchSnapshot()
  })
})
