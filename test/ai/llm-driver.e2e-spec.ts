import { AppModule } from '@/app.module'
import { FakeLlmAdapter } from '@/infrastructure/integrations/ai/fake-llm.adapter'
import { LlmClient } from '@/infrastructure/integrations/ai/llm-client.port'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { App } from 'supertest/types'

// Integration-ports plan I5: with LLM_DRIVER=fake (.env.test) the app boots
// without a Gemini key, and every module (gemini, kaiwa gateway/processor)
// gets the same fake model
describe('LLM driver (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('LLM_DRIVER=fake: the model is the fake adapter', () => {
    expect(app.get(LlmClient, { strict: false })).toBeInstanceOf(FakeLlmAdapter)
  })
})
