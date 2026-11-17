// Generating text with a language model (integration-ports plan I5). Business
// code injects this port; LLM_DRIVER picks the adapter. One SDK only
// (@google/genai, D-IP4) lives in the Gemini adapter.
export type LlmPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }

export interface LlmMessage {
  role: 'user' | 'model'
  parts: LlmPart[]
}

export interface LlmGenerationConfig {
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
  responseMimeType?: string
}

export interface LlmSafetySetting {
  category: string
  threshold: string
}

export interface LlmGenerateInput {
  model: string
  // a single prompt, or a conversation ending with the user's turn
  contents: string | LlmMessage[]
  systemInstruction?: string
  generationConfig?: LlmGenerationConfig
  safetySettings?: LlmSafetySetting[]
}

export interface LlmResult {
  // all text parts of the first candidate ('' when there are none)
  text: string
  // e.g. STOP, MAX_TOKENS, SAFETY
  finishReason?: string
}

export abstract class LlmClient {
  // false when no API key is configured for this model
  abstract isAvailable(model: string): boolean
  // Rejects with the provider's error (its numeric status kept, e.g. 404, 403)
  abstract generate(input: LlmGenerateInput): Promise<LlmResult>
}
