import { AppModule } from '@/app.module'
import { KAIWA_EVENTS } from '@/common/constants/socket.constant'
import { FileStorage } from '@/infrastructure/integrations/storage/file-storage.port'
import { UserSubscriptionService } from '@/modules/user-subscription/user-subscription.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { KaiwaGateway } from '@/websockets/kaiwa.gateway'
import { INestApplication } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { Test } from '@nestjs/testing'
import { TEST_ADMIN } from '../support/test-admin'

// Phase 6 X0 baseline: the /kaiwa socket (join, one spoken turn, empty audio,
// leave) before KaiwaGateway is split. Every provider is a fake driver
// (SPEECH_DRIVER, LLM_DRIVER, STORAGE_DRIVER): no network, no key. The gateway
// is driven through its handlers with a recording client and server; the turn
// finishes in background promises, so the spec waits until no event has come
// for a while. Event order inside a turn depends on those promises, so the
// snapshot keeps each event's payload shape and count, and the order is
// checked only where the code awaits (transcription, text, audio).
describe('Kaiwa socket (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let gateway: KaiwaGateway
  let userId: number
  const conversations: string[] = []
  const events: { to: string; event: string; payload: unknown }[] = []

  // keys and value types, numbers and ids made stable
  const shapeOf = (value: unknown): unknown => {
    if (value === null || value === undefined) return value
    if (value instanceof Date) return 'date'
    if (Array.isArray(value)) return value.length ? [shapeOf(value[0])] : []
    if (typeof value === 'object')
      return Object.fromEntries(
        Object.keys(value as object)
          .sort()
          .map((k) => [k, shapeOf((value as Record<string, unknown>)[k])])
      )
    return typeof value
  }
  const clientOf = (id: number | undefined) => {
    const client = {
      id: 'kaiwa-contract',
      data: { userId: id } as Record<string, unknown>,
      handshake: { headers: { 'accept-language': 'vi' }, query: {} },
      emit: (event: string, payload: unknown) => {
        events.push({ to: 'client', event, payload })
        return true
      },
      join: () => undefined,
      leave: () => undefined,
      disconnect: () => {
        events.push({ to: 'client', event: 'disconnect', payload: null })
      }
    }
    return client
  }
  // the turn ends in fire-and-forget promises: wait until events stop
  const settle = async (quietMs = 700, maxMs = 15000) => {
    const start = Date.now()
    let seen = -1
    let since = Date.now()
    while (Date.now() - start < maxMs) {
      if (events.length !== seen) {
        seen = events.length
        since = Date.now()
      } else if (Date.now() - since >= quietMs) return
      await new Promise((r) => setTimeout(r, 50))
    }
  }
  const take = () => events.splice(0, events.length)
  const summary = (list: typeof events) => {
    const byEvent = new Map<string, { to: string; count: number; payload: unknown }>()
    for (const e of list) {
      const key = `${e.to} ${e.event}`
      const prev = byEvent.get(key)
      if (prev) prev.count++
      else byEvent.set(key, { to: e.to, count: 1, payload: shapeOf(e.payload) })
    }
    return Object.fromEntries(
      [...byEvent.entries()].sort(([a], [b]) => a.localeCompare(b))
    )
  }
  // a short mono 16 kHz WAV of silence (LINEAR16)
  const wav = () => {
    const samples = 1600
    const buf = Buffer.alloc(44 + samples * 2)
    buf.write('RIFF', 0)
    buf.writeUInt32LE(36 + samples * 2, 4)
    buf.write('WAVE', 8)
    buf.write('fmt ', 12)
    buf.writeUInt32LE(16, 16)
    buf.writeUInt16LE(1, 20)
    buf.writeUInt16LE(1, 22)
    buf.writeUInt32LE(16000, 24)
    buf.writeUInt32LE(32000, 28)
    buf.writeUInt16LE(2, 32)
    buf.writeUInt16LE(16, 34)
    buf.write('data', 36)
    buf.writeUInt32LE(samples * 2, 40)
    return buf
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    for (const job of app.get(SchedulerRegistry).getCronJobs().values()) job.stop()
    prisma = app.get(PrismaService)
    gateway = app.get(KaiwaGateway)
    gateway.server = {
      to: (room: string) => ({
        emit: (event: string, payload: unknown) => {
          events.push({ to: room.replace(/[0-9]+/g, 'N'), event, payload })
          return true
        }
      })
    } as never
    const admin = await prisma.user.findUnique({ where: { email: TEST_ADMIN.email } })
    if (!admin) throw new Error('test admin missing: run the contract specs setup')
    userId = admin.id
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(async () => {
    if (conversations.length) {
      const rows = await prisma.userAIConversation.findMany({
        where: { conversationId: { in: conversations } },
        select: { audioUrl: true }
      })
      const storage = app.get(FileStorage)
      for (const { audioUrl } of rows) {
        if (audioUrl) await storage.delete(audioUrl).catch(() => undefined)
      }
      await prisma.userAIConversation.deleteMany({
        where: { conversationId: { in: conversations } }
      })
      await prisma.aIConversationRoom.deleteMany({
        where: { conversationId: { in: conversations } }
      })
    }
    await app.close()
  })

  it('join without the AI_KAIWA feature: error and disconnect', async () => {
    jest
      .spyOn(app.get(UserSubscriptionService), 'getHasByfeatureKeyAndUserId')
      .mockResolvedValue(false)
    const client = clientOf(userId)
    await gateway.handleJoinSearchingRoom(client as never, {})
    await settle(200)
    expect(take().map((e) => [e.event, e.payload])).toEqual([
      [KAIWA_EVENTS.ERROR, { message: expect.any(String) }],
      ['disconnect', null]
    ])
  })

  it('missing user: error on join and on audio', async () => {
    const client = clientOf(undefined)
    await gateway.handleJoinSearchingRoom(client as never, {})
    await gateway.handleUserAudioChunk(client as never, wav())
    expect(take().map((e) => e.event)).toEqual([KAIWA_EVENTS.ERROR, KAIWA_EVENTS.ERROR])
  })

  it('join, one spoken turn, empty audio, leave', async () => {
    jest
      .spyOn(app.get(UserSubscriptionService), 'getHasByfeatureKeyAndUserId')
      .mockResolvedValue(true)
    const client = clientOf(userId)

    await gateway.handleJoinSearchingRoom(client as never, {
      voiceName: 'ja-JP-Wavenet-A'
    })
    const conversationId = client.data.conversationId as string
    conversations.push(conversationId)
    await settle()
    const joined = take()
    expect(summary(joined)).toMatchSnapshot('join')

    await gateway.handleUserAudioChunk(client as never, wav())
    await settle()
    const turn = take()
    // Known bug (fixed separately): the AI audio is uploaded with the AI
    // message id read before its insert resolves, so when TTS is faster than
    // the insert the upload is skipped (no audioUrl, one message-audio-updated
    // instead of two). With the fake TTS both happen.
    const turnSummary = summary(turn) as Record<string, { count: number | string }>
    const audioUpdates = turnSummary['client message-audio-updated'].count as number
    expect([1, 2]).toContain(audioUpdates)
    turnSummary['client message-audio-updated'].count = '1 (user) + AI if not raced'
    expect(turnSummary).toMatchSnapshot('turn')
    // the awaited steps keep their order
    const order = turn.map((e) => e.event)
    const at = (event: string) => order.indexOf(event)
    expect(at(KAIWA_EVENTS.TRANSCRIPTION)).toBeGreaterThan(-1)
    expect(at(KAIWA_EVENTS.TEXT_RESPONSE)).toBeGreaterThan(at(KAIWA_EVENTS.TRANSCRIPTION))
    expect(at(KAIWA_EVENTS.AUDIO_RESPONSE)).toBeGreaterThan(
      at(KAIWA_EVENTS.TEXT_RESPONSE)
    )
    expect(client.data.processingAudio).toBe(false)

    // what the turn stored: the user's line, the answer, the room
    const rows = await prisma.userAIConversation.findMany({
      where: { conversationId },
      orderBy: { id: 'asc' }
    })
    expect(
      rows.map((r) => ({
        role: r.role,
        message: r.message,
        // the AI row's audio depends on the race above
        hasAudio: r.role === 'AI' ? 'raced' : !!r.audioUrl
      }))
    ).toMatchSnapshot('stored messages')
    expect(!!rows.find((r) => r.role === 'AI')?.audioUrl).toBe(audioUpdates === 2)
    const room = await prisma.aIConversationRoom.findUnique({ where: { conversationId } })
    expect({
      title: room?.title ?? null,
      lastMessage: room?.lastMessage ?? null,
      voiceName: room?.voiceName ?? null
    }).toMatchSnapshot('room')

    await gateway.handleUserAudioChunk(client as never, Buffer.alloc(0))
    await settle(300)
    expect(summary(take())).toMatchSnapshot('empty audio')

    gateway.handleLeaveSearchingRoom(client as never)
    expect(summary(take())).toMatchSnapshot('leave')
    expect(client.data.conversationId).toBeUndefined()
  })
})
