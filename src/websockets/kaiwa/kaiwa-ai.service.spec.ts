import { KaiwaAiService } from './kaiwa-ai.service'

// The kaiwa AI calls moved out of KaiwaGateway in phase 6 X7. The socket
// flow is covered by test/kaiwa; this pins the reply and translation rules.
describe('KaiwaAiService', () => {
  const llm = {
    isAvailable: jest.fn(() => true),
    generate: jest.fn()
  }
  const geminiConfig = { getDefaultConfigForService: jest.fn() }
  const service = new KaiwaAiService(
    geminiConfig as never,
    { get: () => undefined } as never,
    llm as never
  )
  const reply = (history: { role: string; text: string }[] = []) =>
    service.generateReply({
      kaiwaModelName: 'gemini-2.5-flash',
      kaiwaDbConfigModel: null,
      systemPrompt: 'SYSTEM',
      conversationHistory: history,
      transcription: 'こんにちは'
    })

  beforeEach(() => jest.clearAllMocks())

  it('sends the history then the new sentence with the system prompt', async () => {
    llm.generate.mockResolvedValue({ text: ' はい、こんにちは！ ', finishReason: 'STOP' })
    await expect(reply([{ role: 'model', text: 'やあ' }])).resolves.toBe(
      'はい、こんにちは！'
    )
    expect(llm.generate.mock.calls[0][0]).toMatchObject({
      model: 'gemini-2.5-flash',
      systemInstruction: 'SYSTEM',
      contents: [
        { role: 'model', parts: [{ text: 'やあ' }] },
        { role: 'user', parts: [{ text: 'こんにちは' }] }
      ]
    })
  })

  it('an empty or "..." answer becomes the polite fallback', async () => {
    llm.generate.mockResolvedValueOnce({ text: '  ', finishReason: 'STOP' })
    await expect(reply()).resolves.toBe('すみません、もう一度お願いします。')
    llm.generate.mockResolvedValueOnce({ text: '...', finishReason: 'STOP' })
    await expect(reply()).resolves.toBe('すみません、もう一度お願いします。')
  })

  it('a safety stop or a missing model throws', async () => {
    llm.generate.mockResolvedValueOnce({ text: 'x', finishReason: 'SAFETY' })
    await expect(reply()).rejects.toThrow('safety')
    llm.isAvailable.mockReturnValueOnce(false)
    await expect(reply()).rejects.toThrow('not initialized')
  })

  it('translates with the DB prompt, {{text}} filled in', async () => {
    geminiConfig.getDefaultConfigForService.mockResolvedValue({
      geminiConfig: { prompt: 'Dịch: {{text}}', geminiConfigModel: null }
    })
    llm.generate.mockResolvedValue({ text: ' Xin chào ', finishReason: 'STOP' })
    await expect(service.translateReply('こんにちは', 'r1')).resolves.toBe('Xin chào')
    expect(llm.generate.mock.calls[0][0]).toMatchObject({
      model: 'gemini-2.5-flash',
      contents: 'Dịch: こんにちは'
    })
  })
})
