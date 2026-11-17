import envConfig from '@/config/env.config'
import { Module } from '@nestjs/common'
import { FakeLlmAdapter } from './fake-llm.adapter'
import { GeminiLlmAdapter } from './gemini-llm.adapter'
import { LlmClient } from './llm-client.port'

// Provides the LlmClient port; with LLM_DRIVER=fake no Gemini client is made
@Module({
  providers: [
    {
      provide: LlmClient,
      useClass: envConfig.LLM_DRIVER === 'gemini' ? GeminiLlmAdapter : FakeLlmAdapter
    }
  ],
  exports: [LlmClient]
})
export class LlmModule {}
