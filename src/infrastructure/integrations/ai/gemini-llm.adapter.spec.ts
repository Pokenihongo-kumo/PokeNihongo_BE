import { ConfigService } from '@nestjs/config'
import { FakeLlmAdapter, FAKE_LLM_TEXT } from './fake-llm.adapter'
import { GeminiLlmAdapter } from './gemini-llm.adapter'

// The real Gemini cannot be called (service unpaid): these pin how the adapter
// builds the @google/genai request and reads its answer
const generateContent = jest.fn()
const created: string[] = []
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(({ apiKey }: { apiKey: string }) => {
    created.push(apiKey)
    return { models: { generateContent } }
  })
}))

describe('GeminiLlmAdapter', () => {
  const adapter = (keys: { apiKey?: string; flashApiKey?: string }) =>
    new GeminiLlmAdapter({ get: () => keys } as unknown as ConfigService)

  beforeEach(() => {
    generateContent.mockReset()
    created.length = 0
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_FLASH_API_KEY
  })

  it('Flash models use the Flash key, else the main key; others the main key', async () => {
    generateContent.mockResolvedValue({ text: 'ok', candidates: [] })
    await adapter({ apiKey: 'main', flashApiKey: 'flash' }).generate({
      model: 'gemini-2.5-flash',
      contents: 'hi'
    })
    await adapter({ apiKey: 'main' }).generate({
      model: 'gemini-2.5-flash',
      contents: 'hi'
    })
    await adapter({ apiKey: 'main', flashApiKey: 'flash' }).generate({
      model: 'gemini-2.5-pro',
      contents: 'hi'
    })
    expect(created).toEqual(['flash', 'main', 'main'])
  })

  it('no key: unavailable, and generate says which key is missing', async () => {
    const none = adapter({})
    expect(none.isAvailable('gemini-2.5-flash')).toBe(false)
    await expect(
      none.generate({ model: 'gemini-2.5-flash', contents: 'x' })
    ).rejects.toThrow('No API key configured for Flash models')
    await expect(
      none.generate({ model: 'gemini-2.5-pro', contents: 'x' })
    ).rejects.toThrow('GEMINI_API_KEY is required')
  })

  it('sends a conversation with system instruction, config and safety settings', async () => {
    generateContent.mockResolvedValue({
      text: 'こんにちは',
      candidates: [{ finishReason: 'STOP' }]
    })
    const result = await adapter({ apiKey: 'k' }).generate({
      model: 'gemini-2.5-pro',
      contents: [
        { role: 'user', parts: [{ text: 'a' }] },
        { role: 'model', parts: [{ text: 'b' }] },
        { role: 'user', parts: [{ inlineData: { mimeType: 'audio/mp4', data: 'AAA' } }] }
      ],
      systemInstruction: 'be kind',
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }]
    })
    expect(generateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-pro',
      contents: [
        { role: 'user', parts: [{ text: 'a' }] },
        { role: 'model', parts: [{ text: 'b' }] },
        { role: 'user', parts: [{ inlineData: { mimeType: 'audio/mp4', data: 'AAA' } }] }
      ],
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        systemInstruction: 'be kind',
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }
        ]
      }
    })
    expect(result).toEqual({ text: 'こんにちは', finishReason: 'STOP' })
  })

  it('no text getter (MAX_TOKENS): text from the parts of the first candidate', async () => {
    generateContent.mockResolvedValue({
      text: undefined,
      candidates: [
        {
          finishReason: 'MAX_TOKENS',
          content: { parts: [{ text: 'すみ' }, { text: 'ません' }] }
        }
      ]
    })
    await expect(
      adapter({ apiKey: 'k' }).generate({ model: 'gemini-2.5-pro', contents: 'x' })
    ).resolves.toEqual({ text: 'すみません', finishReason: 'MAX_TOKENS' })
  })

  it('the provider error reaches the caller with its status', async () => {
    generateContent.mockRejectedValue(
      Object.assign(new Error('not found'), { status: 404 })
    )
    await expect(
      adapter({ apiKey: 'k' }).generate({ model: 'gemini-x', contents: 'x' })
    ).rejects.toMatchObject({ status: 404 })
  })
})

describe('FakeLlmAdapter', () => {
  it('answers "{}" when JSON is asked for, a fixed sentence otherwise', async () => {
    const fake = new FakeLlmAdapter()
    await expect(
      fake.generate({
        model: 'm',
        contents: 'x',
        generationConfig: { responseMimeType: 'application/json' }
      })
    ).resolves.toEqual({ text: '{}', finishReason: 'STOP' })
    await expect(fake.generate({ model: 'm', contents: 'x' })).resolves.toEqual({
      text: FAKE_LLM_TEXT,
      finishReason: 'STOP'
    })
  })
})
