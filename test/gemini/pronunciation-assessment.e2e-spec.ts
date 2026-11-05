import { GeminiService } from '@/3rdService/gemini/gemini.service'
import { PRONUNCIATION_SYSTEM_INSTRUCTION } from '@/3rdService/gemini/dto/pronunciation-assessment.dto'
import { AppModule } from '@/app.module'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// POST /gemini/pronunciation-assessment: the mobile conversation screen sends
// its recording here instead of calling Gemini with a key from its bundle.
// Gemini itself is faked; the test env has no Gemini key.
describe('Pronunciation assessment proxy (e2e)', () => {
  let app: INestApplication<App>
  let token: string
  const audio = Buffer.from('fake m4a bytes')
  const assessment = {
    Overall: { AccuracyScore: 90, FluencyScore: 85, PronScore: 88 },
    TranscribedText: 'こんにちは',
    MatchScore: 0.95,
    Syllables: [
      {
        Syllable: 'こ',
        Romaji: 'ko',
        AccuracyScore: 90,
        ErrorType: 'None',
        ErrorDetail: ''
      }
    ]
  }

  const post = () =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .auth(token, { type: 'bearer' })
      .post('/gemini/pronunciation-assessment')

  // Replaces the SDK client the service picks per model
  const fakeGemini = (generateContent: jest.Mock) => {
    const getGenerativeModel = jest.fn().mockReturnValue({ generateContent })
    jest
      .spyOn(GeminiService.prototype as never, 'getGenAIForModel')
      .mockReturnValue({ getGenerativeModel } as never)
    return getGenerativeModel
  }
  const answer = (text: string) => ({ response: { text: () => text } })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    token = await loginAsTestAdmin(app, [
      { method: 'POST', path: '/gemini/pronunciation-assessment' }
    ])
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('sends the recording and reference text to Gemini and returns its JSON', async () => {
    const generateContent = jest
      .fn()
      .mockResolvedValue(answer(JSON.stringify(assessment)))
    const getGenerativeModel = fakeGemini(generateContent)

    const res = await post()
      .field('referenceText', 'こんにちは')
      .attach('audio', audio, { filename: 'rec.m4a', contentType: 'audio/mp4' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ statusCode: 200, data: assessment })
    expect(getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        systemInstruction: PRONUNCIATION_SYSTEM_INSTRUCTION,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
      })
    )
    const [{ contents }] = generateContent.mock.calls[0]
    expect(contents[0].parts).toEqual([
      { text: 'Reference Text (Japanese): こんにちは' },
      { inlineData: { mimeType: 'audio/mp4', data: audio.toString('base64') } }
    ])
  })

  it('skips a model that is not available (404) and uses the next one', async () => {
    const generateContent = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('model not found'), { status: 404 }))
      .mockResolvedValueOnce(answer(JSON.stringify(assessment)))
    const getGenerativeModel = fakeGemini(generateContent)

    const res = await post()
      .field('referenceText', 'こんにちは')
      .attach('audio', audio, { filename: 'rec.3gp', contentType: 'audio/3gpp' })

    expect(res.status).toBe(200)
    expect(getGenerativeModel.mock.calls.map(([options]) => options.model)).toEqual([
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ])
  })

  it('returns {} when the model does not answer valid JSON', async () => {
    fakeGemini(jest.fn().mockResolvedValue(answer('not json')))

    const res = await post()
      .field('referenceText', 'こんにちは')
      .attach('audio', audio, { filename: 'rec.m4a', contentType: 'audio/mp4' })

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({})
  })

  it('answers 502 when Gemini fails or no key is configured', async () => {
    // No fake: the test env has no GEMINI_API_KEY
    const res = await post()
      .field('referenceText', 'こんにちは')
      .attach('audio', audio, { filename: 'rec.m4a', contentType: 'audio/mp4' })

    expect(res.status).toBe(502)
    expect(res.body.statusCode).toBe(502)
    expect(JSON.stringify(res.body)).not.toMatch(/key/i)
  })

  it('rejects a request without audio, with a non-audio file, or without referenceText', async () => {
    const noAudio = await post().field('referenceText', 'こんにちは')
    const notAudio = await post()
      .field('referenceText', 'こんにちは')
      .attach('audio', Buffer.from('x'), { filename: 'a.txt', contentType: 'text/plain' })
    const noText = await post().attach('audio', audio, {
      filename: 'rec.m4a',
      contentType: 'audio/mp4'
    })

    expect(noAudio.status).toBe(400)
    expect(notAudio.status).toBe(400)
    expect(noText.status).toBe(422)
    expect(noText.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'referenceText' })])
    )
  })
})
