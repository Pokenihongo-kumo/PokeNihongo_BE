import { UploadService } from '@/modules/upload/upload.service'
import { SpeechToText } from '@/infrastructure/integrations/speech/speech-to-text.port'
import { TextToSpeech } from '@/infrastructure/integrations/speech/text-to-speech.port'
import { SpeechToTextService } from './speech-to-text.service'
import { TextToSpeechService } from './text-to-speech.service'

// Integration-ports plan I4: the speech services keep their defaults,
// validation and messages; only the provider call moved behind the ports
describe('Speech services on the ports', () => {
  describe('SpeechToTextService', () => {
    const make = (port: Partial<SpeechToText>) =>
      new SpeechToTextService({ isAvailable: () => true, ...port } as SpeechToText)

    it('no client: the same message as before, not wrapped', async () => {
      const service = make({ isAvailable: () => false })
      await expect(service.convertAudioToText(Buffer.from('a'))).rejects.toThrow(
        'Speech-to-Text client not initialized. Please check Google Cloud credentials in .env'
      )
    })

    it('sends the defaults and returns the best alternative', async () => {
      const recognize = jest.fn(async () => ({ transcript: 'ねこ', confidence: 0.9 }))
      const service = make({ recognize })
      await expect(service.convertAudioToText(Buffer.from('a'))).resolves.toEqual({
        transcript: 'ねこ',
        confidence: 0.9,
        languageCode: 'ja-JP'
      })
      expect(recognize).toHaveBeenCalledWith({
        audio: Buffer.from('a'),
        config: expect.objectContaining({ languageCode: 'ja-JP', model: 'latest_short' })
      })
    })

    it('nothing heard: "no results", wrapped as a recognition failure', async () => {
      const service = make({ recognize: async () => null })
      await expect(service.convertAudioToText(Buffer.from('a'))).rejects.toThrow(
        'Nhận dạng giọng nói thất bại: Không tìm thấy kết quả nhận dạng giọng nói'
      )
    })
  })

  describe('TextToSpeechService', () => {
    const make = (port: Partial<TextToSpeech>, upload: Partial<UploadService> = {}) =>
      new TextToSpeechService(
        { isAvailable: () => true, ...port } as TextToSpeech,
        upload as UploadService
      )

    it('no client: the same wrapped message as before', async () => {
      const service = make({ isAvailable: () => false })
      await expect(service.convertTextToSpeech('ねこ')).rejects.toThrow(
        'Text-to-Speech conversion failed: Text-to-Speech client not initialized. Please check Google Cloud credentials.'
      )
    })

    it('Japanese defaults, MP3 at 24 kHz', async () => {
      const synthesize = jest.fn(async () => Buffer.from('mp3'))
      const service = make({ synthesize })
      await expect(service.convertTextToSpeech('ねこ')).resolves.toEqual({
        audioContent: Buffer.from('mp3'),
        audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 }
      })
      expect(synthesize).toHaveBeenCalledWith({
        text: 'ねこ',
        languageCode: 'ja-JP',
        voiceName: 'ja-JP-Wavenet-A',
        audioEncoding: 'MP3',
        speakingRate: 1,
        pitch: 0,
        volumeGainDb: 0
      })
    })

    it('Japanese voices are listed in the short form', async () => {
      const service = make({
        listVoices: async () => [
          {
            name: 'ja-JP-A',
            ssmlGender: 'FEMALE',
            naturalSampleRateHertz: 24000,
            languageCodes: ['ja-JP']
          }
        ]
      })
      await expect(service.getJapaneseVoices()).resolves.toEqual([
        { name: 'ja-JP-A', ssmlGender: 'FEMALE', naturalSampleRateHertz: 24000 }
      ])
    })

    it('generated audio is uploaded to <folder>/audio; a failure gives null', async () => {
      const uploadFile = jest.fn(async () => ({
        message: 'ok',
        url: 'https://files/a.mp3'
      }))
      const service = make({ synthesize: async () => Buffer.from('mp3') }, { uploadFile })
      await expect(service.generateAudioFromText('ねこ', 'vocabulary')).resolves.toBe(
        'https://files/a.mp3'
      )
      expect(uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ mimetype: 'audio/mpeg' }),
        'vocabulary/audio'
      )
      const failing = make({ synthesize: async () => Promise.reject(new Error('down')) })
      await expect(failing.generateAudioFromText('ねこ', 'x')).resolves.toBeNull()
    })
  })
})
