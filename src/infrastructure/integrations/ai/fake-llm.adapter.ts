import { Injectable, Logger } from '@nestjs/common'
import { LlmClient, LlmGenerateInput, LlmResult } from './llm-client.port'

// LLM_DRIVER=fake: no model, no key, deterministic. JSON is asked for → "{}";
// otherwise a fixed Japanese sentence. Tests and local demo only; the config
// refuses it in production.
export const FAKE_LLM_TEXT = 'これはテスト用の回答です。'

@Injectable()
export class FakeLlmAdapter extends LlmClient {
  private readonly logger = new Logger(FakeLlmAdapter.name)

  isAvailable(): boolean {
    return true
  }

  async generate(input: LlmGenerateInput): Promise<LlmResult> {
    this.logger.log(`Model not called (LLM_DRIVER=fake): ${input.model}`)
    const json = input.generationConfig?.responseMimeType === 'application/json'
    return { text: json ? '{}' : FAKE_LLM_TEXT, finishReason: 'STOP' }
  }
}
