import { GoogleGenAI } from '@google/genai'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LlmClient, LlmGenerateInput, LlmResult } from './llm-client.port'

// LLM_DRIVER=gemini: Google Gemini through @google/genai. Flash models use
// GEMINI_FLASH_API_KEY when set, otherwise GEMINI_API_KEY; other models
// GEMINI_API_KEY (the rule GeminiService had). One client per key, created
// on first use.
@Injectable()
export class GeminiLlmAdapter extends LlmClient {
  private readonly logger = new Logger(GeminiLlmAdapter.name)
  private readonly clients = new Map<string, GoogleGenAI>()

  constructor(private readonly config: ConfigService) {
    super()
  }

  private keyFor(model: string): string {
    const gemini = this.config.get<{ apiKey?: string; flashApiKey?: string }>('gemini')
    const apiKey = (gemini?.apiKey || process.env.GEMINI_API_KEY || '').trim()
    const flashKey = (
      gemini?.flashApiKey ||
      process.env.GEMINI_FLASH_API_KEY ||
      ''
    ).trim()
    return model.toLowerCase().includes('flash') ? flashKey || apiKey : apiKey
  }

  isAvailable(model: string): boolean {
    return this.keyFor(model) !== ''
  }

  private clientFor(model: string): GoogleGenAI {
    const key = this.keyFor(model)
    if (!key) {
      throw new Error(
        model.toLowerCase().includes('flash')
          ? 'No API key configured for Flash models. Please set GEMINI_FLASH_API_KEY or GEMINI_API_KEY in .env'
          : 'GEMINI_API_KEY is required but not configured. Please set GEMINI_API_KEY in your .env file'
      )
    }
    let client = this.clients.get(key)
    if (!client) {
      client = new GoogleGenAI({ apiKey: key })
      this.clients.set(key, client)
      this.logger.log('Gemini client initialized')
    }
    return client
  }

  async generate(input: LlmGenerateInput): Promise<LlmResult> {
    const response = await this.clientFor(input.model).models.generateContent({
      model: input.model,
      contents:
        typeof input.contents === 'string'
          ? input.contents
          : input.contents.map((m) => ({ role: m.role, parts: m.parts })),
      config: {
        ...(input.generationConfig ?? {}),
        ...(input.systemInstruction
          ? { systemInstruction: input.systemInstruction }
          : {}),
        ...(input.safetySettings ? { safetySettings: input.safetySettings as never } : {})
      }
    })
    const candidate = response.candidates?.[0]
    const fromParts = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
    return {
      text: response.text ?? fromParts,
      finishReason: candidate?.finishReason ? String(candidate.finishReason) : undefined
    }
  }
}
