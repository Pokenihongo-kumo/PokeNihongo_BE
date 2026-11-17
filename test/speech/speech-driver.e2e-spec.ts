import { AppModule } from '@/app.module'
import { SpeechToTextService } from '@/3rdService/speech/speech-to-text.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { FAKE_TRANSCRIPT } from '@/infrastructure/integrations/speech/fake-speech.adapters'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { App } from 'supertest/types'

// Integration-ports plan I4: with SPEECH_DRIVER=fake (.env.test) the app boots
// without Google credentials and speech features answer deterministically
describe('Speech driver (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('SPEECH_DRIVER=fake: recognition, synthesis and voices without Google', async () => {
    const stt = app.get(SpeechToTextService, { strict: false })
    await expect(stt.convertAudioToText(Buffer.from('audio'))).resolves.toMatchObject({
      transcript: FAKE_TRANSCRIPT,
      languageCode: 'ja-JP'
    })
    const tts = app.get(TextToSpeechService, { strict: false })
    const speech = await tts.convertTextToSpeech('ねこ')
    expect(speech.audioContent.subarray(0, 4).toString()).toBe('RIFF')
    await expect(tts.getJapaneseVoices()).resolves.toHaveLength(2)
    // generated audio goes through the (local) file storage
    await expect(tts.generateAudioFromText('ねこ', 'e2e-speech')).resolves.toContain(
      '/local-files/e2e-speech/audio/'
    )
  })
})
