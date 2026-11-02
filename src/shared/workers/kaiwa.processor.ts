import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SpeechToTextService } from '@/3rdService/speech/speech-to-text.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'

export interface KaiwaJobData {
  conversationId: string
  userId: number
  audioBuffer: Buffer
  conversationHistory: any[]
}

export interface KaiwaJobResult {
  conversationId: string
  transcription?: string
  geminiResponse?: string
  translation?: string
  audioBase64?: string
  error?: string
}

@Processor(BullQueue.KAIWA_PROCESSOR)
export class KaiwaProcessor {
  private readonly logger = new Logger(KaiwaProcessor.name)
  private genAI: GoogleGenerativeAI | null = null

  constructor(
    private readonly speechToTextService: SpeechToTextService,
    private readonly textToSpeechService: TextToSpeechService
  ) {
    this.initializeGeminiAPI()
  }

  private initializeGeminiAPI() {
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey && apiKey.trim() !== '') {
      this.genAI = new GoogleGenerativeAI(apiKey)
      this.logger.log('[KaiwaProcessor] Gemini API initialized')
    }
  }

  @Process(BullQueue.PROCESS_AUDIO)
  async processAudio(job: Job<KaiwaJobData>): Promise<KaiwaJobResult> {
    const { conversationId, userId, audioBuffer, conversationHistory } = job.data
    this.logger.log(
      `[KaiwaProcessor] Processing audio for conversation ${conversationId}`
    )

    try {
      // Step 1: Speech-to-Text (chạy song song với các task khác nếu có thể)
      const transcription = await this.speechToTextService.convertAudioToText(
        audioBuffer,
        {
          languageCode: 'ja-JP',
          enableAutomaticPunctuation: true,
          sampleRateHertz: 16000,
          encoding: 'LINEAR16'
        }
      )

      if (!transcription.transcript || transcription.transcript.trim() === '') {
        return {
          conversationId,
          error: 'Không thể nhận diện giọng nói'
        }
      }

      // Emit transcription progress
      job.progress(25)

      // Step 2: Gemini Flash (chạy song song với translation prep)
      const geminiResponse = await this.generateGeminiResponse(
        transcription.transcript,
        conversationHistory
      )
      job.progress(50)

      // Step 3 & 4: Translation và TTS chạy song song
      const [translation, ttsResult] = await Promise.all([
        this.translateToVietnamese(geminiResponse),
        this.generateAudio(geminiResponse)
      ])

      job.progress(100)

      return {
        conversationId,
        transcription: transcription.transcript,
        geminiResponse,
        translation: translation || '',
        audioBase64: ttsResult ? ttsResult.toString('base64') : undefined
      }
    } catch (error) {
      this.logger.error(`[KaiwaProcessor] Error processing audio: ${error.message}`)
      return {
        conversationId,
        error: error.message
      }
    }
  }

  private async generateGeminiResponse(
    transcription: string,
    conversationHistory: any[]
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized')
    }

    const systemPrompt = `Bạn là một giáo viên tiếng Nhật thân thiện. QUAN TRỌNG: Bạn CHỈ được trả lời bằng tiếng Nhật, KHÔNG được dùng tiếng Việt hay bất kỳ ngôn ngữ nào khác. Hãy trả lời bằng tiếng Nhật một cách tự nhiên và dễ hiểu. Hãy giúp người học luyện tập hội thoại tiếng Nhật.`

    let fullPrompt = systemPrompt + '\n\n'
    conversationHistory.forEach((msg: any) => {
      if (msg.role === 'user') {
        fullPrompt += `Người học: ${msg.text}\n`
      } else if (msg.role === 'model') {
        fullPrompt += `Bạn: ${msg.text}\n`
      }
    })
    fullPrompt += `Người học: ${transcription}\nBạn:`

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024
      }
    })

    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    return response.text()
  }

  private async translateToVietnamese(japaneseText: string): Promise<string> {
    if (!this.genAI || !japaneseText) return ''

    try {
      const translatePrompt = `Hãy dịch câu tiếng Nhật sau sang tiếng Việt một cách tự nhiên và chính xác:\n\n${japaneseText}\n\nChỉ trả lời bằng bản dịch tiếng Việt, không thêm gì khác.`
      const translateModel = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.3,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 512
        }
      })
      const translateResult = await translateModel.generateContent(translatePrompt)
      const translateResponse = await translateResult.response
      return translateResponse.text().trim()
    } catch (error) {
      this.logger.warn(`[KaiwaProcessor] Translation error: ${error.message}`)
      return ''
    }
  }

  private async generateAudio(text: string): Promise<Buffer | null> {
    try {
      const result = await this.textToSpeechService.convertTextToSpeech(text, {
        languageCode: 'ja-JP',
        voiceName: 'ja-JP-Wavenet-A',
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0
      })
      return result.audioContent
    } catch (error) {
      this.logger.error(`[KaiwaProcessor] TTS error: ${error.message}`)
      return null
    }
  }
}
